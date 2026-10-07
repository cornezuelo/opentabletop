import type { Diagnostic, LoadedPack } from '../loader/load'

/**
 * Translations of the definitions that aren't tables (travel rules, bindings, calendars,
 * weather models, roll modes…), from `locales/<language>/` files like tables' ones. In
 * an overlay they're keyed by `<kind>/<id>` (`travel-rules/default`, `calendar/marcher-reckoning`)
 * and mirror the definition: maps by their keys, lists by their items' `id` (or a
 * check's `event`), and only texts (`name`, `description`, `nothing`). A text can be
 * written alone for an item's name: `months: { thaw: Deshielo }`.
 *
 * They're folded into the definition as texts in several languages
 * (`name: { en: Thaw, es: Deshielo }`), the form every reader already understands.
 */

/** The keys that hold texts a player reads. */
const TEXT_KEYS = new Set(['name', 'description', 'nothing'])

type Text = string | Record<string, string>
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
/** What identifies an item of a list: its id, or a check's event. */
const itemKey = (item: unknown): string | undefined =>
  isRecord(item)
    ? typeof item.id === 'string'
      ? item.id
      : typeof item.event === 'string'
        ? item.event
        : undefined
    : undefined

/** One text with another language added: `Thaw` + es `Deshielo` → `{ en: Thaw, es: Deshielo }`. */
function addLanguage(base: unknown, locale: string, text: string, baseLocale: string): Text {
  if (isRecord(base)) return { ...(base as Record<string, string>), [locale]: text }
  if (typeof base === 'string') return { [baseLocale]: base, [locale]: text }
  return { [locale]: text }
}

/**
 * Adds an overlay's texts in `locale` to a definition (returns a copy); `problems` gets
 * the paths that match nothing in it.
 */
export function foldTexts(
  base: unknown,
  overlay: unknown,
  locale: string,
  baseLocale: string,
  problems: string[],
  path = '',
): unknown {
  // A text alone for something that has a name: the name.
  if (typeof overlay === 'string' && isRecord(base))
    return foldTexts(base, { name: overlay }, locale, baseLocale, problems, path)
  if (!isRecord(overlay)) {
    problems.push(path || '(root)')
    return base
  }
  if (Array.isArray(base)) {
    const seen = new Set<string>()
    const items = base.map((item) => {
      const key = itemKey(item)
      if (key === undefined || !(key in overlay)) return item
      seen.add(key)
      return foldTexts(item, overlay[key], locale, baseLocale, problems, `${path}.${key}`)
    })
    for (const key of Object.keys(overlay)) if (!seen.has(key)) problems.push(`${path}.${key}`)
    return items
  }
  if (!isRecord(base)) {
    problems.push(path || '(root)')
    return base
  }
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    const at = path ? `${path}.${key}` : key
    if (TEXT_KEYS.has(key) && typeof value === 'string')
      out[key] = addLanguage(base[key], locale, value, baseLocale)
    else if (key in base) out[key] = foldTexts(base[key], value, locale, baseLocale, problems, at)
    else problems.push(at)
  }
  return out
}

/** Folds every pack's system-text overlays into its definitions for other engines. */
export function foldSystemTexts(loaded: LoadedPack[], diagnostics: Diagnostic[]): void {
  for (const pack of loaded) {
    const baseLocale = pack.manifest.locale
    for (const [locale, overlays] of Object.entries(pack.systemTexts)) {
      if (locale === baseLocale) continue
      for (const { key, texts, file } of overlays) {
        const extra = pack.extras.find((e) => `${e.kind}/${e.id ?? 'default'}` === key)
        if (!extra) {
          diagnostics.push({
            severity: 'warning',
            message: `Translation for unknown definition "${key}"`,
            pack: pack.manifest.id,
            file,
          })
          continue
        }
        const problems: string[] = []
        extra.data = foldTexts(extra.data, texts, locale, baseLocale, problems) as Record<
          string,
          unknown
        >
        for (const at of problems)
          diagnostics.push({
            severity: 'warning',
            message: `Translation of "${key}" for something it doesn't have: ${at}`,
            pack: pack.manifest.id,
            file,
          })
      }
    }
  }
}

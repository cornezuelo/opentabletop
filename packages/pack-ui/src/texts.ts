import { getOverlayText, setOverlayText, type Path } from './yaml'

/** The files of the packs a form writes in (a `PackLibrary`). */
export interface PackFiles {
  readFile(root: string, path: string): string | undefined
  writeFile(root: string, path: string, content: string): void
}

/**
 * Texts players read (a check's name, a month's name, a template's description…) are edited
 * in the UI's language: in the definition when it's the pack's base language, otherwise in
 * its translation file (`locales/<language>/<file>`, keyed `<kind>/<id>`), like tables'.
 */
export function overlayTexts<K extends string>(o: {
  library: PackFiles
  /** The UI's language. */
  locale: () => string
  root: () => string
  /** The pack's base language. */
  base: () => string
  /** The file a kind of definition is written in, and its key in translations. */
  file: (kind: K) => string
  key: (kind: K) => string
  edit: (kind: K, at: Path, value: unknown) => void
}) {
  const overlayFile = (kind: K) => `locales/${o.locale()}/${o.file(kind)}`
  /** One language of a text written as one string (the base language) or several. */
  const inLanguage = (value: unknown, locale: string): string =>
    typeof value === 'string'
      ? locale === o.base()
        ? value
        : ''
      : typeof value === 'object' && value !== null
        ? String((value as Record<string, unknown>)[locale] ?? '')
        : ''
  return {
    /** Whether texts are being written in a translation (the UI isn't in the base language). */
    get translating() {
      return o.locale() !== o.base()
    },
    /**
     * A text in the UI's language. `value` is the text in the definition, `key` its place
     * in the translation file (lists by id or event: ['checks', 'FORAGE', 'name']).
     */
    text(kind: K, value: unknown, key: string[]): string {
      const locale = o.locale()
      if (locale === o.base()) return inLanguage(value, locale)
      const translated = getOverlayText(o.library.readFile(o.root(), overlayFile(kind)), [
        o.key(kind),
        ...key,
      ])
      return translated || inLanguage(value, locale)
    },
    /** The base language's text, shown as a hint while translating. */
    baseText(value: unknown): string {
      return inLanguage(value, o.base()) || (typeof value === 'string' ? value : '')
    },
    /** Writes a text at `at` in the definition (base language) or `key` in the translation. */
    setText(kind: K, at: Path, value: unknown, key: string[], text: string) {
      const locale = o.locale()
      const clean = text.trim()
      // Texts already written in several languages keep the others.
      const several = typeof value === 'object' && value !== null
      if (locale === o.base()) {
        if (several) o.edit(kind, [...at, locale], clean || undefined)
        else o.edit(kind, at, clean || undefined)
        return
      }
      if (several && locale in (value as Record<string, unknown>))
        o.edit(kind, [...at, locale], undefined)
      const file = overlayFile(kind)
      o.library.writeFile(
        o.root(),
        file,
        setOverlayText(o.library.readFile(o.root(), file) ?? '', [o.key(kind), ...key], clean),
      )
    },
  }
}

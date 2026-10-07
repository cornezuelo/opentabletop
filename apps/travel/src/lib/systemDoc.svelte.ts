import {
  appendDefinition,
  getOverlayText,
  insertIn,
  renameOverlayKey,
  readDefinition,
  removeIn,
  renameKey,
  setIn,
  setOverlayText,
  type Path,
} from '@open-tabletop/pack-ui/yaml'
import { packTexts } from '@open-tabletop/oracle-ui'
import { manifestOf } from '@open-tabletop/pack-ui/packs'
import { getLocale } from './i18n'
import { library } from './packs.svelte'

export type Kind = 'travel-rules' | 'bindings'

/**
 * A travel system being edited in forms: its raw rules and bindings, and edits to either
 * that keep the rest of their file (comments, order) as it was. The bindings are usually
 * in the rules' file; when the pack keeps them in another one, that's where they're edited.
 */
/** The kinds of definition that can be rolled, in the order the pickers list them. */
export const ROLLABLE = ['table', 'oracle', 'generator', 'deck'] as const

export function systemDoc(source: () => { root: string; path: string }) {
  const root = $derived(source().root)
  const path = $derived(source().path)
  const pack = $derived(library.pack(root))
  const packId = $derived((pack && manifestOf(pack).id) ?? root)
  const bindingsPath = $derived.by(() => {
    const file = library.registry.extras.get(packId)?.find((e) => e.kind === 'bindings')?.file
    return file?.startsWith(`${root}/`) ? file.slice(root.length + 1) : path
  })
  const fileOf = (kind: Kind) => (kind === 'bindings' ? bindingsPath : path)
  const read = (kind: Kind) => library.readFile(root, fileOf(kind)) ?? ''
  const content = $derived(read('travel-rules'))
  const rules = $derived(readDefinition(content, '@travel-rules') ?? {})
  const bindings = $derived(readDefinition(read('bindings'), '@bindings'))
  const editable = $derived(library.isEditable(root))
  /** Whatever can be rolled (tables, oracles, generators, decks) can resolve a check: this pack's first, by local id. */
  const targets = $derived(
    [...library.registry.definitions.values()]
      .filter((d) => (ROLLABLE as readonly string[]).includes(d.kind))
      .sort(
        (a, b) => Number(a.pack !== packId) - Number(b.pack !== packId) || a.id.localeCompare(b.id),
      )
      .map((d) => ({
        ref: d.pack === packId ? d.localId : d.id,
        name: texts.displayName(d),
        kind: d.kind as (typeof ROLLABLE)[number],
      })),
  )

  /** Weather models a check can be resolved by (`kind: weather`): this pack's by local id. */
  const weatherModels = $derived(
    [...library.registry.packs.keys()].flatMap((id) =>
      (library.registry.extras.get(id) ?? [])
        .filter((e) => e.kind === 'weather' && e.id)
        .map((e) => (id === packId ? e.id! : `${id}/${e.id}`)),
    ),
  )

  const texts = packTexts(() => library.registry, getLocale)
  const save = (kind: Kind, text: string) => library.writeFile(root, fileOf(kind), text)

  /**
   * Texts players read (a check's name, a stat's description…) are edited in the UI's
   * language: in the definition when it's the pack's base language, otherwise in its
   * translation file (`locales/<language>/<file>`, keyed `<kind>/<id>`), like tables'.
   */
  const baseLocale = $derived((pack && manifestOf(pack).locale) ?? 'en')
  const overlayFile = (kind: Kind) => `locales/${getLocale()}/${fileOf(kind)}`
  const overlayKey = (kind: Kind) => {
    const raw = kind === 'bindings' ? bindings : rules
    return `${kind}/${typeof raw?.id === 'string' ? raw.id : 'default'}`
  }
  /** One language of a text written as one string (the base language) or several. */
  const inLanguage = (value: unknown, locale: string): string =>
    typeof value === 'string'
      ? locale === baseLocale
        ? value
        : ''
      : typeof value === 'object' && value !== null
        ? String((value as Record<string, unknown>)[locale] ?? '')
        : ''

  return {
    get root() {
      return root
    },
    get path() {
      return path
    },
    get content() {
      return content
    },
    get rules(): Record<string, unknown> {
      return rules
    },
    /** The bindings in this file (undefined when it has none yet). */
    get bindings(): Record<string, unknown> | undefined {
      return bindings
    },
    get editable() {
      return editable
    },
    get targets() {
      return targets
    },
    get weatherModels() {
      return weatherModels
    },
    /** Whether texts are being written in a translation (the UI isn't in the base language). */
    get translating() {
      return getLocale() !== baseLocale
    },
    /**
     * A text in the UI's language. `at` is its place in the definition, `key` in the
     * translation file (lists by id or event: ['checks', 'FORAGE', 'name']).
     */
    text(kind: Kind, value: unknown, key: string[]): string {
      const locale = getLocale()
      if (locale === baseLocale) return inLanguage(value, locale)
      const translated = getOverlayText(library.readFile(root, overlayFile(kind)), [
        overlayKey(kind),
        ...key,
      ])
      return translated || inLanguage(value, locale)
    },
    /** The base language's text, shown as a hint while translating. */
    baseText(value: unknown): string {
      return inLanguage(value, baseLocale) || (typeof value === 'string' ? value : '')
    },
    setText(kind: Kind, at: Path, value: unknown, key: string[], text: string) {
      const locale = getLocale()
      const clean = text.trim()
      // Texts already written in several languages keep the others.
      const several = typeof value === 'object' && value !== null
      if (locale === baseLocale) {
        if (several) this.edit(kind, [...at, locale], clean || undefined)
        else this.edit(kind, at, clean || undefined)
        return
      }
      if (several && locale in (value as Record<string, unknown>))
        this.edit(kind, [...at, locale], undefined)
      const file = overlayFile(kind)
      library.writeFile(
        root,
        file,
        setOverlayText(library.readFile(root, file) ?? '', [overlayKey(kind), ...key], clean),
      )
    },
    /** Sets (or, with undefined/'', deletes) a value. Bindings are created on first use. */
    edit(kind: Kind, at: Path, value: unknown) {
      let text = read(kind)
      if (kind === 'bindings' && !bindings) {
        if (value === undefined || value === '') return
        text = appendDefinition(text, { kind: 'bindings', id: 'default', on: {} })
      }
      save(kind, setIn(text, `@${kind}`, at, value))
    },
    rename(kind: Kind, at: Path, from: string, to: string) {
      save(kind, renameKey(read(kind), `@${kind}`, at, from, to))
      this.renameTranslations(kind, at.map(String), from, to)
    },
    /** A check or stat renamed: its translations (every language) follow it. */
    renameTranslations(kind: Kind, key: string[], from: string, to: string) {
      const file = fileOf(kind)
      for (const f of pack?.files ?? []) {
        if (!/^locales\/[^/]+\//.test(f.path) || !f.path.endsWith(`/${file}`)) continue
        const next = renameOverlayKey(f.content, [overlayKey(kind), ...key], from, to)
        if (next !== f.content) library.writeFile(root, f.path, next)
      }
    },
    /** Inserts into a list, creating it when missing. */
    insert(kind: Kind, at: Path, index: number, value: unknown) {
      const list = readDefinition(read(kind), `@${kind}`)
      let node: unknown = list
      for (const part of at) node = (node as Record<string | number, unknown> | undefined)?.[part]
      if (Array.isArray(node)) save(kind, insertIn(read(kind), `@${kind}`, at, index, value))
      else this.edit(kind, at, [value])
    },
    remove(kind: Kind, at: Path, index: number) {
      save(kind, removeIn(read(kind), `@${kind}`, at, index))
    },
  }
}

export type SystemDoc = ReturnType<typeof systemDoc>

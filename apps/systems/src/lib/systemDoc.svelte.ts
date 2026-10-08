import { BUILT_IN_ACTIONS } from '@open-tabletop/travel-engine'
import {
  appendDefinition,
  insertIn,
  renameOverlayKey,
  readDefinition,
  removeIn,
  renameKey,
  setIn,
  type Path,
} from '@open-tabletop/pack-ui/yaml'
import { packTexts } from '@open-tabletop/oracle-ui'
import { manifestOf } from '@open-tabletop/pack-ui/packs'
import { getLocale } from './i18n'
import { overlayTexts } from './texts'
import { library } from './packs.svelte'

export type Kind = 'travel-rules' | 'bindings' | 'system'

/** A check's `at:` or an action's `on:` as typed in a box: `day-start, hex-enter`. */
export const momentsText = (value: unknown): string =>
  Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : ''

/** What a box of moments writes: nothing, one moment, or a list of them. */
export function parseMoments(text: string): string | string[] | undefined {
  const list = text
    .split(',')
    .map((m) => m.trim())
    .filter((m, i, all) => m && all.indexOf(m) === i)
  return list.length === 0 ? undefined : list.length === 1 ? list[0] : list
}

/**
 * The ids of a system's actions, from its raw rules: camp and rest unless it turns them
 * off (older systems had them without declaring them), then the ones it declares.
 */
export function actionIds(rules: Record<string, unknown>): string[] {
  const actions = (rules.actions ?? {}) as Record<string, unknown>
  return [
    ...BUILT_IN_ACTIONS.filter((id) => actions[id] === undefined),
    ...Object.keys(actions).filter((id) => actions[id] !== false),
  ]
}

/**
 * A travel system being edited in forms: its raw rules and bindings, and edits to either
 * that keep the rest of their file (comments, order) as it was. The bindings are usually
 * in the rules' file; when the pack keeps them in another one, that's where they're edited.
 */
/** The kinds of definition that can be rolled, in the order the pickers list them. */
export const ROLLABLE = ['table', 'oracle', 'generator', 'deck'] as const

/**
 * Where a system's parts are written, relative to the root of the pack holding its travel
 * rules: their file and id, its bindings' (absent: none yet, or not in that pack) and the
 * `kind: system` that names them (absent for an older pack's implicit system).
 */
export interface DocSource {
  root: string
  path: string
  rulesId?: string
  bindings?: { path: string; id: string }
  system?: { path: string; id: string }
}

export function systemDoc(source: () => DocSource) {
  const root = $derived(source().root)
  const path = $derived(source().path)
  const pack = $derived(library.pack(root))
  const packId = $derived((pack && manifestOf(pack).id) ?? root)
  const declared = $derived(source().system)
  const bindingsSource = $derived.by(() => {
    const own = source().bindings
    if (own || declared) return own
    // An older pack: its first bindings, wherever they are in it.
    const extra = library.registry.extras.get(packId)?.find((e) => e.kind === 'bindings')
    return extra?.file.startsWith(`${root}/`)
      ? { path: extra.file.slice(root.length + 1), id: extra.id ?? 'default' }
      : undefined
  })
  const bindingsPath = $derived(bindingsSource?.path ?? path)
  const fileOf = (kind: Kind) =>
    kind === 'bindings' ? bindingsPath : kind === 'system' ? (declared?.path ?? path) : path
  /** The definition of that kind edited here: `@travel-rules/default`, `@bindings/fast`… */
  const selector = (kind: Kind) =>
    kind === 'bindings'
      ? `@bindings/${bindingsSource?.id ?? 'default'}`
      : kind === 'system'
        ? `@system/${declared?.id ?? 'default'}`
        : `@travel-rules/${source().rulesId ?? 'default'}`
  const read = (kind: Kind) => library.readFile(root, fileOf(kind)) ?? ''
  const content = $derived(read('travel-rules'))
  const rules = $derived(readDefinition(content, selector('travel-rules')) ?? {})
  const bindings = $derived(
    bindingsSource ? readDefinition(read('bindings'), selector('bindings')) : undefined,
  )
  /** The `kind: system` naming the parts (undefined for an older pack's implicit system). */
  const system = $derived(declared ? readDefinition(read('system'), selector('system')) : undefined)
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

  const lang = overlayTexts<Kind>({
    root: () => root,
    base: () => (pack && manifestOf(pack).locale) ?? 'en',
    file: fileOf,
    key: (kind) => selector(kind).slice(1),
    edit: (kind, at, value) => doc.edit(kind, at, value),
  })

  const doc = {
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
    /** The system's own definition (undefined for an older pack's implicit system). */
    get system(): Record<string, unknown> | undefined {
      return system
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
    get translating() {
      return lang.translating
    },
    /** The definition of a kind (rules, bindings, the system), for rows that edit any. */
    data(kind: Kind): Record<string, unknown> {
      return (kind === 'bindings' ? bindings : kind === 'system' ? system : rules) ?? {}
    },
    text: lang.text,
    baseText: lang.baseText,
    setText: lang.setText,
    /** Sets (or, with undefined/'', deletes) a value. Bindings are created on first use. */
    edit(kind: Kind, at: Path, value: unknown) {
      let text = read(kind)
      if (kind === 'bindings' && !bindings) {
        if (value === undefined || value === '') return
        text = appendDefinition(text, { kind: 'bindings', id: 'default', on: {} })
        // A declared system names its new bindings.
        if (declared) {
          const file = library.readFile(root, declared.path) ?? ''
          library.writeFile(
            root,
            declared.path,
            setIn(file, `@system/${declared.id}`, ['bindings'], 'default'),
          )
        }
      }
      save(kind, setIn(text, selector(kind), at, value))
    },
    rename(kind: Kind, at: Path, from: string, to: string) {
      save(kind, renameKey(read(kind), selector(kind), at, from, to))
      this.renameTranslations(kind, at.map(String), from, to)
    },
    /** A check or stat renamed: its translations (every language) follow it. */
    renameTranslations(kind: Kind, key: string[], from: string, to: string) {
      const file = fileOf(kind)
      for (const f of pack?.files ?? []) {
        if (!/^locales\/[^/]+\//.test(f.path) || !f.path.endsWith(`/${file}`)) continue
        const next = renameOverlayKey(f.content, [selector(kind).slice(1), ...key], from, to)
        if (next !== f.content) library.writeFile(root, f.path, next)
      }
    },
    /** Inserts into a list, creating it when missing. */
    insert(kind: Kind, at: Path, index: number, value: unknown) {
      const list = readDefinition(read(kind), selector(kind))
      let node: unknown = list
      for (const part of at) node = (node as Record<string | number, unknown> | undefined)?.[part]
      if (Array.isArray(node)) save(kind, insertIn(read(kind), selector(kind), at, index, value))
      else this.edit(kind, at, [value])
    },
    remove(kind: Kind, at: Path, index: number) {
      save(kind, removeIn(read(kind), selector(kind), at, index))
    },
  }
  return doc
}

export type SystemDoc = ReturnType<typeof systemDoc>

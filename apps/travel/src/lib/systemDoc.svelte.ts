import {
  appendDefinition,
  insertIn,
  readDefinition,
  removeIn,
  renameKey,
  setIn,
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
  /** Tables and generators a check can be resolved by: this pack's first, by local id. */
  const targets = $derived(
    [...library.registry.definitions.values()]
      .filter((d) => d.kind === 'table' || d.kind === 'generator')
      .sort(
        (a, b) => Number(a.pack !== packId) - Number(b.pack !== packId) || a.id.localeCompare(b.id),
      )
      .map((d) => ({ ref: d.pack === packId ? d.localId : d.id, name: texts.displayName(d) })),
  )

  const texts = packTexts(() => library.registry, getLocale)
  const save = (kind: Kind, text: string) => library.writeFile(root, fileOf(kind), text)

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

import type { PackLibrary } from './library.svelte'
import { manifestOf } from './packs'
import { overlayTexts } from './texts'
import {
  insertIn,
  moveIn,
  moveKey,
  readDefinition,
  removeIn,
  renameKey,
  renameOverlayKey,
  setIn,
  type Path,
} from './yaml'

/** Where one definition of a pack is written: its pack's root, file, kind and id. */
export interface DefinitionSource {
  root: string
  path: string
  kind: string
  id: string
}

/**
 * One definition of a pack edited in forms (a calendar, a weather model, a map style): its
 * raw data, and edits that keep the rest of its file (comments, order) as it was. Texts are
 * written in the UI's language (the definition, or its translation). Its methods take a
 * kind like a system's documents do, so the same rows edit both; it's ignored here.
 */
export function definitionDoc(
  library: PackLibrary,
  locale: () => string,
  source: () => DefinitionSource | null,
) {
  const root = $derived(source()?.root ?? '')
  const path = $derived(source()?.path ?? '')
  const selector = $derived(`@${source()?.kind}/${source()?.id}`)
  const pack = $derived(library.pack(root))
  const read = () => library.readFile(root, path) ?? ''
  const data = $derived(
    source() ? ((readDefinition(read(), selector) ?? {}) as Record<string, unknown>) : {},
  )
  const save = (text: string) => library.writeFile(root, path, text)
  const edit = (_kind: string, at: Path, value: unknown) => save(setIn(read(), selector, at, value))
  const texts = overlayTexts<string>({
    library,
    locale,
    root: () => root,
    base: () => (pack && manifestOf(pack).locale) ?? 'en',
    file: () => path,
    key: () => selector.slice(1),
    edit,
  })

  return {
    get root() {
      return root
    },
    get path() {
      return path
    },
    get editable() {
      return !!source() && library.isEditable(root)
    },
    get translating() {
      return texts.translating
    },
    /** The definition's data (every kind is the same one here). */
    data(): Record<string, unknown> {
      return data
    },
    text: texts.text,
    baseText: texts.baseText,
    setText: texts.setText,
    edit,
    rename(_kind: string, at: Path, from: string, to: string) {
      save(renameKey(read(), selector, at, from, to))
      this.renameTranslations('', at.map(String), from, to)
    },
    /** An item renamed (a key, or a list item's id): its translations in every language follow it. */
    renameTranslations(_kind: string, key: string[], from: string, to: string) {
      for (const f of pack?.files ?? []) {
        if (!/^locales\/[^/]+\//.test(f.path) || !f.path.endsWith(`/${path}`)) continue
        const next = renameOverlayKey(f.content, [selector.slice(1), ...key], from, to)
        if (next !== f.content) library.writeFile(root, f.path, next)
      }
    },
    /** Inserts into a list, creating it when missing. */
    insert(_kind: string, at: Path, index: number, value: unknown) {
      let node: unknown = data
      for (const part of at) node = (node as Record<string | number, unknown> | undefined)?.[part]
      if (Array.isArray(node)) save(insertIn(read(), selector, at, index, value))
      else edit('', at, [value])
    },
    remove(_kind: string, at: Path, index: number) {
      save(removeIn(read(), selector, at, index))
    },
    move(_kind: string, at: Path, from: number, to: number) {
      save(moveIn(read(), selector, at, from, to))
    },
    moveKey(_kind: string, at: Path, key: string, to: number) {
      save(moveKey(read(), selector, at, key, to))
    },
  }
}

export type DefinitionDoc = ReturnType<typeof definitionDoc>

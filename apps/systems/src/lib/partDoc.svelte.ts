import { manifestOf } from '@open-tabletop/pack-ui/packs'
import {
  insertIn,
  moveIn,
  readDefinition,
  removeIn,
  renameKey,
  renameOverlayKey,
  setIn,
  type Path,
} from '@open-tabletop/pack-ui/yaml'
import { library } from './packs.svelte'
import { overlayTexts } from './texts'

/** Where one definition of a pack is written: its pack's root, file, kind and id. */
export interface PartSource {
  root: string
  path: string
  kind: string
  id: string
}

/**
 * One definition of a system edited in forms (a calendar, a weather model, roll modes):
 * its raw data, and edits that keep the rest of its file (comments, order) as it was. Its
 * methods take a kind like the system's documents do, so the same rows edit both; it's
 * ignored here.
 */
export function partDoc(source: () => PartSource | null) {
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
  }
}

export type PartDoc = ReturnType<typeof partDoc>

/**
 * What rows of a form need from the document they edit: a system's (rules, bindings, the
 * system) or one definition's. Methods, so either kind of document fits.
 */
export interface RowsDoc {
  readonly editable: boolean
  readonly translating: boolean
  data(kind: string): Record<string, unknown>
  text(kind: string, value: unknown, key: string[]): string
  baseText(value: unknown): string
  setText(kind: string, at: Path, value: unknown, key: string[], text: string): void
  edit(kind: string, at: Path, value: unknown): void
  rename(kind: string, at: Path, from: string, to: string): void
}

/** A list's rows: inserting, removing and moving items too. */
export interface ListDoc extends RowsDoc {
  renameTranslations(kind: string, key: string[], from: string, to: string): void
  insert(kind: string, at: Path, index: number, value: unknown): void
  remove(kind: string, at: Path, index: number): void
  move(kind: string, at: Path, from: number, to: number): void
}

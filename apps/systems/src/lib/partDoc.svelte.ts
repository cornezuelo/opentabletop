import {
  definitionDoc,
  type DefinitionDoc,
  type DefinitionSource,
} from '@open-tabletop/pack-ui/definitionDoc'
import type { Path } from '@open-tabletop/pack-ui/yaml'
import { getLocale } from './i18n'
import { library } from './packs.svelte'

/** Where one definition of a pack is written: its pack's root, file, kind and id. */
export type PartSource = DefinitionSource

/** One definition of a system edited in forms: pack-ui's `definitionDoc` on this app's library. */
export const partDoc = (source: () => PartSource | null) =>
  definitionDoc(library, getLocale, source)

export type PartDoc = DefinitionDoc

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
  /** Moves a key of a map to another place (where order decides something). */
  moveKey(kind: string, at: Path, key: string, to: number): void
}

/** A list's rows: inserting, removing and moving items too. */
export interface ListDoc extends RowsDoc {
  renameTranslations(kind: string, key: string[], from: string, to: string): void
  insert(kind: string, at: Path, index: number, value: unknown): void
  remove(kind: string, at: Path, index: number): void
  move(kind: string, at: Path, from: number, to: number): void
}

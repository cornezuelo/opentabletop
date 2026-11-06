import type { Compiled } from '@open-tabletop/oracle-engine'
import { isImageFile } from '@open-tabletop/oracle-engine'
import { manifestOf, MANIFEST_FILE, type PackLibrary } from '@open-tabletop/pack-ui'
import { localize, type TravelSystem } from '@open-tabletop/session'
import type { View } from './nav.svelte'

/** The kinds a pack can hold, in the order they're listed; any other comes after them. */
export const KINDS = [
  'table',
  'oracle',
  'generator',
  'deck',
  'travel-rules',
  'bindings',
  'roll-modes',
  'sheet',
  'items',
  'bestiary',
  'places',
  'factions',
  'clocks',
  'world',
  'calendar',
  'weather',
  'land',
  'style',
]

export interface TreeItem {
  /** Unique within its pack. */
  key: string
  name: string
  /** Its id as a pack writes it, for the search. */
  id: string
  /** Its tags, for the search. */
  tags: string[]
  view: View
}

/** A group of a pack's tree: a kind of definition (`table`…), or `files`. */
export interface TreeGroup {
  kind: string
  items: TreeItem[]
}

export interface PackTree {
  systems: TravelSystem[]
  groups: TreeGroup[]
  images: number
}

const rank = (kind: string) => {
  const at = KINDS.indexOf(kind)
  return at < 0 ? KINDS.length : at
}

const byName = (a: TreeItem, b: TreeItem) => a.name.localeCompare(b.name)

/** What a pack holds, as its branch of the tree: its systems, each kind's definitions, its files. */
export function packTree(
  library: PackLibrary,
  root: string,
  options: {
    locale: string
    systems: TravelSystem[]
    displayName: (def: Compiled) => string
  },
): PackTree {
  const pack = library.pack(root)
  const id = pack && manifestOf(pack).id
  if (!pack || !id) return { systems: [], groups: [], images: 0 }
  const items = new Map<string, TreeItem[]>()
  const add = (kind: string, item: TreeItem) => items.set(kind, [...(items.get(kind) ?? []), item])
  const inFile = (file: string) => file.slice(root.length + 1)

  for (const def of library.engine.list({ pack: id }))
    add(def.kind, {
      key: def.id,
      name: options.displayName(def),
      id: def.localId,
      tags: def.tags,
      view: { name: 'file', root, path: inFile(def.file) },
    })
  for (const extra of library.registry.extras.get(id) ?? []) {
    if (extra.kind === 'system') continue
    const local = extra.id ?? 'default'
    add(extra.kind, {
      key: `${extra.kind}/${local}`,
      name:
        localize(extra.data.name as Parameters<typeof localize>[0], options.locale, 'en') || local,
      id: local,
      tags: [],
      view:
        extra.kind === 'style'
          ? { name: 'style', ref: `${id}/${local}` }
          : { name: 'file', root, path: inFile(extra.file) },
    })
  }
  const groups = [...items]
    .map(([kind, list]) => ({ kind, items: list.sort(byName) }))
    .sort((a, b) => rank(a.kind) - rank(b.kind) || a.kind.localeCompare(b.kind))
  const files = pack.files.filter((f) => !isImageFile(f.path))
  return {
    systems: options.systems.filter((s) => s.pack === id),
    groups: [
      ...groups,
      {
        kind: 'files',
        items: files
          .map((f) => ({
            key: `file:${f.path}`,
            name: f.path,
            id: f.path,
            tags: [],
            view: { name: 'file' as const, root, path: f.path },
          }))
          .sort(
            (a, b) =>
              Number(b.id === MANIFEST_FILE) - Number(a.id === MANIFEST_FILE) || byName(a, b),
          ),
      },
    ],
    images: pack.files.length - files.length,
  }
}

/** What of a branch a search finds: an item by its name, id or tags. */
export function findInTree(tree: PackTree, query: string): PackTree {
  const q = query.trim().toLowerCase()
  if (!q) return tree
  const found = (text: string) => text.toLowerCase().includes(q)
  return {
    ...tree,
    groups: tree.groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => found(i.name) || found(i.id) || i.tags.some(found)),
      }))
      .filter((g) => g.items.length),
  }
}

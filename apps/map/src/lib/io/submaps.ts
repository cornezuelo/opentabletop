import { formatCoord, parseKey } from '@open-tabletop/hex'
import {
  createMap,
  deserializeMap,
  newId,
  parseAreaPlace,
  parsePlaceOn,
  placeOfCell,
  placeOn,
  treeAround,
  type HexKey,
  type HexMap,
  type MapParent,
} from '@open-tabletop/map'
import { getLibraryMap, listLibrary, putLibraryMap } from '@open-tabletop/storage'
import { serializeMap } from '@open-tabletop/map'
import { editor } from '../store/editor.svelte'
import { view } from '../store/view'
import { keepOpenMap, library, openLibraryMap } from './actions.svelte'

/** A map kept in the library, read, or undefined if it isn't (or can't be read). */
async function kept(id: string): Promise<HexMap | undefined> {
  const entry = await getLibraryMap(id).catch(() => null)
  if (!entry) return undefined
  try {
    return deserializeMap(entry.json)
  } catch {
    return undefined
  }
}

/**
 * Reads the maps the open one reaches (its parent, its sub-maps) and the names of those
 * above it from the library, for its ways in and out, the breadcrumb and the hex panel.
 */
export async function loadLinks(): Promise<void> {
  const map = editor.map
  const id = map.meta.id
  const entries = await listLibrary().catch(() => [])
  const parentId = map.meta.parent?.map
  const parent = parentId ? await kept(parentId) : undefined
  const children = (
    await Promise.all(entries.filter((e) => e.parent === id).map((e) => kept(e.id)))
  ).filter((c): c is HexMap => c?.meta.parent?.map === id)
  // The maps above it, by the library's entries (each names its parent).
  const byId = new Map(entries.map((e) => [e.id, e]))
  const ancestors: { id: string; name: string }[] = []
  const seen = new Set([id])
  for (let at = parentId; at && !seen.has(at); at = byId.get(at)?.parent) {
    seen.add(at)
    const entry = byId.get(at)
    if (!entry) break
    ancestors.unshift({ id: at, name: entry.name })
  }
  if (editor.map.meta.id !== id) return
  editor.linked = { ...(parent && { parent }), children, ancestors }
  editor.notify({ kind: 'links' })
}

/** A place of a map by its name and coordinates, a room by its name. */
function placeName(map: HexMap, key: string): string {
  const room = parseAreaPlace(key)
  if (room) return map.regions.find((r) => r.id === room)?.name || room
  const at = formatCoord(parseKey(key as HexKey), map.grid.coordFormat, map.grid)
  const name = map.hexes[key as HexKey]?.name
  return name ? `${name} (${at})` : at
}

/**
 * A place as the journal and panels name it: a cell of the open map by its name and its
 * coordinates (`The clan watch-cairn (0507)`), a room by its name, one of another map of its
 * tree (`@<map>/<hex>`) by that map's name too.
 */
export function placeLabel(key: string): string {
  const there = parsePlaceOn(key)
  if (!there) return placeName(editor.map, key)
  const other = [editor.linked.parent, ...(editor.linked.children ?? [])].find(
    (m) => m?.meta.id === there.map,
  )
  const name =
    other?.meta.name || editor.linked.ancestors.find((a) => a.id === there.map)?.name || there.map
  return `${name} · ${other ? placeName(other, there.place) : there.place}`
}

/** The sub-maps of the open map that a place leads into. */
export const subMapsAt = (hex: string): HexMap[] =>
  (editor.linked.children ?? []).filter((c) => c.meta.parent?.ways.some((w) => w.place === hex))

/** A way at a cell of the open map: into one of its sub-maps, or out of this one. */
export interface WayHere {
  /** Into a sub-map, or out to the parent. */
  dir: 'in' | 'out'
  /** The map at the other end. */
  map: string
  /** Its name. */
  name: string
  /** Where the way arrives there, as this map's world names it (`@<map>/<place>`). */
  there: string
  /** The cell it arrives at there, as that map writes its coordinates (`0104`), if it's here. */
  cell?: string
  /** …and as its key (`1,4`). */
  at: HexKey
  /** The kind of connection it is, as the system names it (`way-in`), if any. */
  kind?: string
}

/** The ways at a cell of the open map, into its sub-maps and out of it. */
export function waysAt(hex: string): WayHere[] {
  const end = (map: HexMap | undefined, id: string, cell: HexKey) =>
    placeOn(id, map ? placeOfCell(map, cell) : cell)
  const coord = (map: HexMap | undefined, cell: HexKey) =>
    map && formatCoord(parseKey(cell), map.grid.coordFormat, map.grid)
  /** Whether a way's cell is at the same place: a way in a room is taken from all of it. */
  const here = placeOfCell(editor.map, hex)
  const at = (cell: HexKey) => placeOfCell(editor.map, cell) === here
  const into = (editor.linked.children ?? []).flatMap((child) =>
    (child.meta.parent?.ways ?? [])
      .filter((w) => at(w.place))
      .map((w): WayHere => ({
        dir: 'in',
        map: child.meta.id,
        name: child.meta.name,
        there: end(child, child.meta.id, w.entrance),
        cell: coord(child, w.entrance),
        at: w.entrance,
        ...(w.kind && { kind: w.kind }),
      })),
  )
  const own = editor.map.meta.parent
  const parent = editor.linked.parent
  const name = editor.linked.ancestors.at(-1)?.name || parent?.meta.name || ''
  const out = (own?.ways ?? [])
    .filter((w) => at(w.entrance))
    .map((w): WayHere => ({
      dir: 'out',
      map: own!.map,
      name,
      there: end(parent, own!.map, w.place),
      cell: coord(parent, w.place),
      at: w.place,
      ...(w.kind && { kind: w.kind }),
    }))
  return [...into, ...out]
}

/** Opens a map with a cell of it selected and in view. */
export async function openMapAt(id: string, cell: HexKey): Promise<void> {
  if (!(await openLibraryMap(id))) return
  if (editor.tool !== 'play') editor.tool = 'select'
  editor.panelView = 'tool'
  editor.selected = cell
  view.centerOn(parseKey(cell))
}

/** One end of a way in the tree of maps. */
export interface WayEnd {
  /** The map it's on. */
  map: string
  /** Its cell there. */
  cell: HexKey
  /** The cell by its name and coordinates. */
  label: string
}

/** A way between a map of the tree and the one above it. */
export interface TreeWay {
  /** Its end above; none if that map isn't kept here. */
  above?: WayEnd
  below: WayEnd
  /** The kind of connection it is, as the system names it (`way-in`), if any. */
  kind?: string
}

/** A map of the tree the open one is in. */
export interface TreeNode {
  id: string
  name: string
  depth: number
  /** Its ways to the map above. */
  ways: TreeWay[]
}

/**
 * The whole tree of maps the open one is in, from its top: each map under the one it hangs
 * from, with its ways to it. The open map as it is now, kept yet or not.
 */
export async function mapsTree(): Promise<TreeNode[]> {
  const open = editor.map
  const id = open.meta.id
  const entries = await listLibrary().catch(() => [])
  const here = { id, name: open.meta.name, parent: open.meta.parent?.map }
  // By name: the tree stays put as maps are opened and kept.
  const all = [...entries.filter((e) => e.id !== id), here].sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  const tree = treeAround(all, id)
  const read = await Promise.all(tree.map(({ item }) => (item.id === id ? open : kept(item.id))))
  const maps = new Map(read.flatMap((m) => (m ? [[m.meta.id, m] as const] : [])))
  const end = (map: HexMap, cell: HexKey): WayEnd => ({
    map: map.meta.id,
    cell,
    label: placeName(map, cell),
  })
  return tree.map(({ item, depth }) => {
    const map = maps.get(item.id)
    const parent = map?.meta.parent
    const above = parent && maps.get(parent.map)
    const ways = (parent?.ways ?? []).map((w): TreeWay => ({
      ...(above && { above: end(above, w.place) }),
      below: end(map!, w.entrance),
      ...(w.kind && { kind: w.kind }),
    }))
    return { id: item.id, name: item.name, depth, ways }
  })
}

/**
 * One more way into a sub-map of the open map, from a place of it (a tunnel's other mouth):
 * its entrance the sub-map's first way's, moved in its Map settings. The sub-map is kept.
 */
export async function addWayInto(id: string, place: HexKey): Promise<void> {
  const child = await kept(id)
  const parent = child?.meta.parent
  if (!child || !parent || parent.map !== editor.map.meta.id) return
  const [first] = parent.ways
  child.meta = {
    ...child.meta,
    parent: { ...parent, ways: [...parent.ways, { ...first, place }] },
    modified: new Date().toISOString(),
  }
  await putLibraryMap({
    id,
    name: child.meta.name,
    modified: child.meta.modified,
    json: serializeMap(child),
    parent: parent.map,
  })
  library.version++
  await loadLinks()
}

/**
 * Makes a new sub-map under a place of the open map, in its campaign, and keeps it in the
 * library (not opened). Its entrance is its middle hex; `kind`, the way in's.
 */
export async function newSubMap(place: HexKey, name: string, kind?: string): Promise<HexMap> {
  // It hangs from the open map, which has to be there to go back to.
  if (library.untouched) await keepOpenMap()
  // A site under a place is a dungeon at first (squares, floors and rock); Map settings and
  // Edit palette change it.
  const map = createMap('', 'dungeon')
  const { width, height } = map.grid
  const parent: MapParent = {
    map: editor.map.meta.id,
    ways: [
      {
        place,
        entrance: `${Math.floor(width / 2)},${Math.floor(height / 2)}` as HexKey,
        ...(kind && { kind }),
      },
    ],
  }
  const id = newId()
  map.meta = { ...map.meta, id, name, campaign: editor.map.meta.campaign, parent }
  await putLibraryMap({
    id,
    name,
    modified: map.meta.modified,
    json: serializeMap(map),
    parent: parent.map,
  })
  library.version++
  await loadLinks()
  return map
}

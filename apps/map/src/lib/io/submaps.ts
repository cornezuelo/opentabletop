import { formatCoord, parseKey } from '@open-tabletop/hex'
import {
  createMap,
  deserializeMap,
  newId,
  parseAreaPlace,
  parsePlaceOn,
  placeOfCell,
  placeOn,
  type HexKey,
  type HexMap,
  type MapParent,
} from '@open-tabletop/map'
import { getLibraryMap, listLibrary, putLibraryMap } from '@open-tabletop/storage'
import { serializeMap } from '@open-tabletop/map'
import { editor } from '../store/editor.svelte'
import { library } from './actions.svelte'

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
  editor.notify({ kind: 'connections' })
}

/**
 * A place as the journal and panels name it: a cell of the open map by its name and its
 * coordinates (`The clan watch-cairn (0507)`), a room by its name, one of another map of its
 * tree (`@<map>/<hex>`) by that map's name too.
 */
export function placeLabel(key: string): string {
  // A room by its name; a cell by its name and coordinates, or its coordinates alone.
  const coord = (map: HexMap, hex: string) => {
    const room = parseAreaPlace(hex)
    if (room) return map.regions.find((r) => r.id === room)?.name || room
    const at = formatCoord(parseKey(hex as HexKey), map.grid.coordFormat, map.grid)
    const name = map.hexes[hex as HexKey]?.name
    return name ? `${name} (${at})` : at
  }
  const there = parsePlaceOn(key)
  if (!there) return coord(editor.map, key)
  const other = [editor.linked.parent, ...(editor.linked.children ?? [])].find(
    (m) => m?.meta.id === there.map,
  )
  const name =
    other?.meta.name || editor.linked.ancestors.find((a) => a.id === there.map)?.name || there.map
  return `${name} · ${other ? coord(other, there.place) : there.place}`
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
}

/** The ways at a cell of the open map, into its sub-maps and out of it. */
export function waysAt(hex: string): WayHere[] {
  const end = (map: HexMap | undefined, id: string, cell: HexKey) =>
    placeOn(id, map ? placeOfCell(map, cell) : cell)
  const into = (editor.linked.children ?? []).flatMap((child) =>
    (child.meta.parent?.ways ?? [])
      .filter((w) => w.place === hex)
      .map((w): WayHere => ({
        dir: 'in',
        map: child.meta.id,
        name: child.meta.name,
        there: end(child, child.meta.id, w.entrance),
      })),
  )
  const own = editor.map.meta.parent
  const parent = editor.linked.parent
  const name = editor.linked.ancestors.at(-1)?.name || parent?.meta.name || (own?.map ?? '')
  const out = (own?.ways ?? [])
    .filter((w) => w.entrance === hex)
    .map((w): WayHere => ({
      dir: 'out',
      map: own!.map,
      name,
      there: end(parent, own!.map, w.place),
    }))
  return [...into, ...out]
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

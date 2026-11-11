import { formatCoord, parseKey } from '@open-tabletop/hex'
import {
  blankLike,
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
  type MapStart,
} from '@open-tabletop/map'
import { freeName, hasWorld, landIn, leaveTrip, serializeCampaign } from '@open-tabletop/campaign'
import type { LaidPiece } from '@open-tabletop/session'
import {
  deleteCampaign,
  getLibraryMap,
  listLibrary,
  putCampaign,
  putLibraryMap,
} from '@open-tabletop/storage'
import { serializeMap } from '@open-tabletop/map'
import { confirmAction, showToast } from '@open-tabletop/ui-kit'
import { t } from '../i18n/index.svelte'
import { mapSystem } from '../play/systems'
import { editor } from '../store/editor.svelte'
import { view } from '../store/view'
import {
  keepOpenMap,
  keptCampaign,
  library,
  openLibraryMap,
  othersInCampaign,
  startMap,
  subMapsBelow,
} from './actions.svelte'
import { askNewMap, type NewMapAnswer } from './newMapDialog.svelte'

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
 * library (not opened). Its entrance is its middle hex; `kind`, the way in's. It starts as
 * chosen, a site (a dungeon) if nothing says.
 */
export async function newSubMap(
  place: HexKey,
  name: string,
  kind?: string,
  start: MapStart | HexMap = { template: 'dungeon' },
): Promise<HexMap> {
  // It hangs from the open map, which has to be there to go back to.
  if (library.untouched) await keepOpenMap()
  const map = 'meta' in start ? start : startMap('', start, mapSystem())
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

/**
 * The ways into new maps a trip's pieces laid (exits with `newMap`): each a blank map drawn
 * like this one, hanging from the piece's cell, the way of the exit's kind. Named as the exit
 * says, else after this map, numbered if another map has the name.
 */
export async function makeLaidWays(laid: LaidPiece[]): Promise<void> {
  const ways = laid.flatMap((piece) => piece.ways ?? [])
  if (!ways.length) return
  const taken = (await listLibrary().catch(() => [])).map((e) => e.name)
  for (const way of ways) {
    const name = freeName(way.name ?? t('submap.below', { map: editor.map.meta.name }), taken)
    taken.push(name)
    await newSubMap(way.at as HexKey, name, way.kind, blankLike(editor.map))
  }
}

/** The kind of a new way in: the system's for one, if it has it. */
function wayInKind(): string | undefined {
  return mapSystem().rules.connections?.['way-in'] ? 'way-in' : undefined
}

/** The sub-map New map chose. */
export async function makeSubMap(answer: NewMapAnswer): Promise<void> {
  if (!answer.under) return
  const made = await newSubMap(
    answer.under,
    answer.name || t('submap.defaultName'),
    wayInKind(),
    answer.start,
  )
  showToast(t('submap.created', { name: made.meta.name }))
}

/** New sub-map on a cell: the dialog of New map, for that cell. */
export async function askSubMap(place: HexKey, name: string): Promise<void> {
  const answer = await askNewMap({ place, name, subMap: true })
  if (answer) await makeSubMap({ ...answer, under: place })
}

/** The maps kept here that could hang from the open map: on top of a tree that isn't this one. */
export async function mapsToHang(): Promise<{ id: string; name: string }[]> {
  const id = editor.map.meta.id
  const here = { id, name: editor.map.meta.name, parent: editor.map.meta.parent?.map }
  const entries = (await listLibrary().catch(() => [])).filter((e) => e.id !== id)
  const ours = new Set(treeAround([...entries, here], id).map(({ item }) => item.id))
  return entries
    .filter((e) => !e.parent && !ours.has(e.id))
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Hangs a map kept here from a place of the open map, with its own sub-maps, in the open
 * map's campaign, as a sub-map made here would be: its entrance its middle cell. A world of
 * its own stays behind, after asking; a campaign nothing else plays in goes.
 */
export async function hangMap(id: string, place: HexKey): Promise<boolean> {
  const entry = await getLibraryMap(id).catch(() => null)
  if (!entry) return false
  if (library.untouched) await keepOpenMap()
  const map = deserializeMap(entry.json)
  const to = editor.campaign
  const leaving = map.meta.campaign === to.id ? null : map.meta.campaign
  const from = leaving ? await keptCampaign(leaving) : null
  if (from && hasWorld(from)) {
    const name = from.name || t('map.untitled')
    if (!(await confirmAction(t('submap.hangLeaves', { name })))) return false
  }
  const below = await subMapsBelow(id)
  const inHere = (m: HexMap): HexMap => ({
    ...m,
    meta: { ...m.meta, campaign: to.id },
    territories: landIn(to, m.territories),
  })
  const { width, height } = map.grid
  const kind = wayInKind()
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
  const hung = inHere(map)
  hung.meta = { ...hung.meta, parent, modified: new Date().toISOString() }
  await putLibraryMap({
    ...entry,
    modified: hung.meta.modified,
    json: serializeMap(hung),
    parent: parent.map,
  })
  for (const sub of below) {
    const read = deserializeMap(sub.json)
    if (read.meta.campaign === leaving)
      await putLibraryMap({ ...sub, json: serializeMap(inHere(read)) })
  }
  if (from) {
    const left = leaveTrip(from, { app: 'map', id })
    const moved = new Set([id, ...below.map((e) => e.id)])
    const others = (await othersInCampaign(from.id)).filter(
      (p) => p.app !== 'map' || !moved.has(p.id),
    )
    if (others.length)
      await putCampaign({
        id: left.id,
        name: left.name,
        modified: new Date().toISOString(),
        json: serializeCampaign(left),
      })
    else await deleteCampaign(from.id)
  }
  library.version++
  await loadLinks()
  return true
}

import {
  cellDistance,
  inBounds,
  keyOf,
  neighborCells,
  parseKey,
  type HexKey,
} from '@open-tabletop/hex'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { DEFAULT_CELL_KM } from './defaults'
import { mapWalls } from './walls'
import { fieldValues } from './hex'
import { cellRegions, regionFields, roomOfCell } from './regions'
import { type HexMap, type MapConnection, TRAVEL_PATH_KINDS } from './types'

/** A place of another map of the tree, as the world of this one names it: `@<map>/<hex>`. */
export const placeOn = (map: string, hex: string): string => `@${map}/${hex}`

/**
 * The map and place of a place of another map (`@<map>/<place>`: a cell, or a room
 * `area:<id>`); undefined for this map's.
 */
export function parsePlaceOn(id: string): { map: string; place: HexKey } | undefined {
  const match = /^@([^/]+)\/(.+)$/.exec(id)
  return match ? { map: match[1], place: match[2] as HexKey } : undefined
}

/** The maps a map's world reaches by its ways in and out: its parent and its sub-maps. */
export interface MapLinks {
  parent?: HexMap
  children?: HexMap[]
}

/** A way between a place of this map and one of another: into a sub-map, or out of this one. */
interface Way {
  here: string
  there: string
  /** The map at the other end. */
  other: HexMap
  kind?: string
  /** The sub-map's, for the journal: the way into it, or out of this one. */
  id: string
  name: string
}

/** A sub-map's way, as the journal and checks name it: `way-<map>`, `way-<map>-2`… */
const wayId = (sub: string, index: number) => (index ? `way-${sub}-${index + 1}` : `way-${sub}`)

/**
 * This map's ways: into each of its sub-maps (from their parent places), and out of it (from
 * each of its entrances). A place of the other map is its room if the cell is in one.
 */
function waysOf(map: HexMap, links: MapLinks): Way[] {
  const ways: Way[] = []
  for (const child of links.children ?? []) {
    const p = child.meta.parent
    if (!p || p.map !== map.meta.id) continue
    p.ways.forEach((way, i) =>
      ways.push({
        here: way.place,
        there: placeOn(child.meta.id, placeOfCell(child, way.entrance)),
        other: child,
        ...(way.kind && { kind: way.kind }),
        id: wayId(child.meta.id, i),
        name: child.meta.name,
      }),
    )
  }
  const own = map.meta.parent
  const parent = links.parent
  if (own && parent?.meta.id === own.map)
    own.ways.forEach((way, i) =>
      ways.push({
        here: way.entrance,
        there: placeOn(own.map, placeOfCell(parent, way.place)),
        other: parent,
        ...(way.kind && { kind: way.kind }),
        id: wayId(map.meta.id, i),
        name: map.meta.name,
      }),
    )
  return ways
}

/**
 * The map as the Travel Engine sees it: each hex a place (its terrain, tags, region, values,
 * icon, faction and places in it), its neighbours, and the roads, rivers and drawn
 * connections between them (one drawn between far hexes makes them neighbours), a step a
 * hex at the map's scale, else the system's (`systemCellKm`), else the default. With its
 * `links`, the ways into its sub-maps and out of it are steps too: to a place of the other
 * map (`@<map>/<hex>`, what it knows of it), of the way's kind, no distance; and the other
 * maps' places are walked as theirs, so a route may go through a sub-map (in by one way,
 * out by another) or out and back in.
 */
export function mapWorld(map: HexMap, systemCellKm?: number, links: MapLinks = {}): TravelWorld {
  return withRooms(map, cellWorld(map, systemCellKm, links))
}

/** A region played as one place (a room), as the rules name it: `area:<id>`. */
export const areaPlace = (region: string): string => `area:${region}`

/** The region of a place that is a room (`area:<id>`); undefined for any other place. */
export function parseAreaPlace(place: string): string | undefined {
  return /^area:(.+)$/.exec(place)?.[1]
}

/** The rooms of a map (regions played as one place) and the cells of each. */
function roomsOf(map: Pick<HexMap, 'regions' | 'hexes' | 'grid'>): Map<string, HexKey[]> {
  const rooms = new Map<string, HexKey[]>(
    map.regions.filter((r) => r.onePlace).map((r) => [r.id, []]),
  )
  if (!rooms.size) return rooms
  for (const key of Object.keys(map.hexes) as HexKey[]) {
    const room = roomOfCell(map, key)
    if (room && inBounds(parseKey(key), map.grid)) rooms.get(room)?.push(key)
  }
  for (const [id, cells] of rooms) if (!cells.length) rooms.delete(id)
  return rooms
}

/**
 * The place a cell is to the rules: its room's (`area:<id>`, the nearest region up the tree
 * played as one place), or the cell itself.
 */
export function placeOfCell(map: Pick<HexMap, 'regions' | 'hexes'>, key: string): string {
  const room = roomOfCell(map, key)
  return room ? areaPlace(room) : key
}

/**
 * The cell a place is drawn on: the cell itself, or for a room the cell `near` if it's in it,
 * else where the party came in from `near` (a cell, or the room it's in): its cell across a
 * door drawn there, else beside it with no wall between, else its first.
 */
export function cellOfPlace(
  map: Pick<HexMap, 'regions' | 'hexes' | 'grid' | 'terrains' | 'connections'>,
  place: string,
  near?: string,
): HexKey | undefined {
  const region = parseAreaPlace(place)
  if (!region) return parsePlaceOn(place) ? undefined : (place as HexKey)
  const rooms = roomsOf(map)
  const cells = rooms.get(region)
  if (!cells) return undefined
  if (!near || parsePlaceOn(near) || parseAreaPlace(near)) return cells[0]
  if (cells.includes(near as HexKey)) return near as HexKey
  const before = parseAreaPlace(placeOfCell(map, near))
  const from = [near, ...(before ? (rooms.get(before) ?? []) : [])]
  const walls = mapWalls(map)
  const doors = new Set(
    (map.connections ?? []).flatMap(({ between: [a, b] }) => [`${a}|${b}`, `${b}|${a}`]),
  )
  const beside = (x: string, y: string) =>
    cellDistance(parseKey(x as HexKey), parseKey(y as HexKey), map.grid) === 1 &&
    !walls.between(x, y)
  for (const test of [(x: string, y: string) => doors.has(`${x}|${y}`), beside])
    for (const x of from) {
      const found = cells.find((y) => test(x, y))
      if (found) return found
    }
  return cells[0]
}

/**
 * The cells' world seen with its rooms as one place each: a room's facts are its region's
 * (its name, values) with its cells' (their most common terrain, every tag, place and
 * floor), its neighbours every place next to any of its cells, and a step into it one cell's.
 */
function withRooms(map: HexMap, cells: TravelWorld): TravelWorld {
  const rooms = roomsOf(map)
  if (!rooms.size) return cells
  const node = (id: string) => (parsePlaceOn(id) ? id : placeOfCell(map, id))
  const cellsOf = (id: string): string[] => {
    const region = parseAreaPlace(id)
    return region ? (rooms.get(region) ?? []) : [id]
  }
  /** Each cell of `a` with each cell of `b` it's next to. */
  const pairs = (a: string, b: string): [string, string][] => {
    const bs = new Set(cellsOf(b))
    return cellsOf(a).flatMap((x) =>
      cells
        .neighbors(x)
        .filter((y) => bs.has(y))
        .map((y): [string, string] => [x, y]),
    )
  }
  const unique = <T>(list: T[]) => [...new Set(list)]
  const firstPair = (a: string, b: string): [string, string] => pairs(a, b)[0] ?? [a, b]
  return {
    // A cell of a room (a way in arriving there) is the room.
    place(cellOrPlace) {
      const id = node(cellOrPlace)
      const region = parseAreaPlace(id)
      if (!region) return cells.place(id)
      // The room's own cells first (not those of a region inside it), whose values are its.
      const own = (c: string) => map.hexes[c as HexKey]?.region === region
      const inside = [...cellsOf(id).filter(own), ...cellsOf(id).filter((c) => !own(c))].flatMap(
        (c) => {
          const p = cells.place(c)
          return p ? [p] : []
        },
      )
      if (!inside.length) return null
      const count = new Map<string, number>()
      for (const p of inside) if (p.terrain) count.set(p.terrain, (count.get(p.terrain) ?? 0) + 1)
      const terrain = [...count].sort((x, y) => y[1] - x[1])[0]?.[0]
      const pois = unique(inside.flatMap((p) => (p.pois as string[] | undefined) ?? []))
      const first = { ...inside[0] }
      delete first.name
      delete first.water
      return {
        // The room's values are its region's, which every cell has.
        ...first,
        terrain,
        tags: unique(inside.flatMap((p) => p.tags ?? [])),
        name: map.regions.find((r) => r.id === region)?.name,
        ...(pois.length && { pois }),
        ...(inside.some((p) => p.floor) && { floor: true }),
        ...(inside.every((p) => p.water) && { water: true }),
      }
    },
    neighbors(cellOrPlace) {
      const id = node(cellOrPlace)
      return unique(cellsOf(id).flatMap((c) => cells.neighbors(c).map(node))).filter(
        (n) => n !== id,
      )
    },
    distance: () => 0,
    connections: (a, b) => unique(pairs(a, b).flatMap(([x, y]) => cells.connections(x, y))),
    connectionOf(a, b) {
      for (const [x, y] of pairs(a, b)) {
        const found = cells.connectionOf?.(x, y)
        if (found) return found
      }
      return undefined
    },
    km: (a, b) => cells.km(...firstPair(a, b)),
    far: (a, b) => !!cells.far?.(...firstPair(a, b)),
    // A step into or out of a room is a step between places, never across a corner.
    diagonal: (a, b) =>
      parseAreaPlace(a) || parseAreaPlace(b) ? undefined : cells.diagonal?.(a, b),
  }
}

function cellWorld(map: HexMap, systemCellKm: number | undefined, links: MapLinks): TravelWorld {
  const ways = waysOf(map, links)
  const wayOf = (a: string, b: string) =>
    ways.find((w) => (w.here === a && w.there === b) || (w.here === b && w.there === a))
  // The maps at the other end of its ways, walked as their own worlds (without their links:
  // one map away, no further).
  const linked = new Map(ways.map((w) => [w.other.meta.id, w.other]))
  const others = new Map<string, TravelWorld>()
  const otherWorld = (id: string): TravelWorld | undefined => {
    const other = linked.get(id)
    if (!other) return undefined
    if (!others.has(id)) others.set(id, mapWorld(other, systemCellKm))
    return others.get(id)!
  }
  /** Two places of the same other map (not a way): that map's world and their own names. */
  const within = (a: string, b: string) => {
    const [x, y] = [parsePlaceOn(a), parsePlaceOn(b)]
    if (!x || !y || x.map !== y.map) return undefined
    const world = otherWorld(x.map)
    return world && { world, map: x.map, a: x.place as string, b: y.place as string }
  }
  const { grid } = map
  const connections = new Map<string, Set<string>>()
  const join = (a: string, b: string, kind: string) => {
    for (const pair of [`${a}|${b}`, `${b}|${a}`]) {
      if (!connections.has(pair)) connections.set(pair, new Set())
      connections.get(pair)!.add(kind)
    }
  }
  for (const path of map.paths.filter((p) => TRAVEL_PATH_KINDS.includes(p.kind)))
    for (let i = 0; i < path.hexes.length - 1; i++)
      join(path.hexes[i], path.hexes[i + 1], path.kind)
  const cell = (hex: string) => parseKey(hex as HexKey)
  const hexDistance = (a: string, b: string) => cellDistance(cell(a), cell(b), grid)
  // On squares, the ones touching at a corner are neighbours too: the system's rules say
  // whether a trip may step there (`travel.diagonals`).
  const square = grid.kind === 'square'
  const around = square ? { ...grid, diagonals: true } : grid
  // Where floor meets what isn't floor a wall stands: no step crosses it but by a connection.
  const walls = mapWalls(map)
  /** Drawn connections between hexes that aren't next to each other: more neighbours. */
  const far = new Map<string, string[]>()
  /** The connection drawn between two places, both ways. */
  const drawn = new Map<string, MapConnection>()
  for (const { between, kind, ...rest } of map.connections ?? []) {
    const [a, b] = between
    if (!inBounds(cell(a), grid) || !inBounds(cell(b), grid)) continue
    join(a, b, kind)
    if (!drawn.has(`${a}|${b}`))
      for (const pair of [`${a}|${b}`, `${b}|${a}`]) drawn.set(pair, { between, kind, ...rest })
    if (hexDistance(a, b) <= 1) continue
    far.set(a, [...(far.get(a) ?? []), b])
    far.set(b, [...(far.get(b) ?? []), a])
  }
  const territories = map.territories ?? {}
  const holder = (hex: string) =>
    Object.keys(territories).find((id) => territories[id].includes(hex))
  const water = new Set(map.terrains.filter((t) => t.water).map((t) => t.id))
  const km = map.scale.cellKm ?? systemCellKm ?? DEFAULT_CELL_KM
  const isFar = (a: string, b: string) =>
    !!wayOf(a, b) || (drawn.has(`${a}|${b}`) && hexDistance(a, b) > 1)
  return {
    // A connection between far hexes measures its own `km`, else the hexes between its ends;
    // a way into another map, none.
    km(a, b) {
      if (wayOf(a, b)) return 0
      const other = within(a, b)
      if (other) return other.world.km(other.a, other.b)
      return isFar(a, b) ? (drawn.get(`${a}|${b}`)!.km ?? km * hexDistance(a, b)) : km
    },
    far(a, b) {
      const other = within(a, b)
      return other ? !!other.world.far?.(other.a, other.b) : isFar(a, b)
    },
    place(hex) {
      const there = parsePlaceOn(hex)
      if (there) return otherWorld(there.map)?.place(there.place) ?? null
      if (!inBounds(cell(hex), grid)) return null
      const data = map.hexes[hex as HexKey]
      const regions = cellRegions(map, hex)
      // A region's values hold for all its cells, those of a region inside it winning, and a
      // cell's own values win over all.
      const stats = { ...fieldValues(regionFields(regions)), ...fieldValues(data?.fields) }
      // Regions by name, what tables and travel rules write in a condition: the one region,
      // or every region it's in, innermost first (`place.region: The Greywood` holds in its heart).
      const names = regions.map((r) => r.name).filter(Boolean)
      const region = names.length > 1 ? names : names[0]
      return {
        ...stats,
        terrain: data?.terrain,
        tags: data?.tags ?? [],
        ...(region && { region }),
        ...(data?.name && { name: data.name }),
        // Water as the palette says (Edit palette → Water): travel rules' `water` applies.
        ...(data?.terrain && water.has(data.terrain) && { water: true }),
        // A structure's floor (a room, a corridor), as the palette says (`place.floor`).
        ...(walls.floor(hex) && { floor: true }),
        // The hex's icon (a village, a bridge…) and its values: {{icon.guards}}.
        ...(data?.icon && { icon: { ...fieldValues(data.icon.fields), id: data.icon.id } }),
        // The faction that holds it, if any (`place.faction`).
        ...(holder(hex) && { faction: holder(hex) }),
        // The places in it, by id: characters' relations to them (`poi:<id>`) hold here.
        ...(data?.pois?.length && { pois: data.pois.map((p) => p.id) }),
      }
    },
    neighbors: (hex) => {
      const there = parsePlaceOn(hex)
      if (there)
        return [
          ...(otherWorld(there.map)
            ?.neighbors(there.place)
            .map((n) => placeOn(there.map, n)) ?? []),
          ...ways.filter((w) => w.there === hex).map((w) => w.here),
        ]
      return [
        ...neighborCells(cell(hex), around)
          .map(keyOf)
          .filter((n) => !walls.between(hex, n)),
        ...(far.get(hex) ?? []),
        ...ways.filter((w) => w.here === hex).map((w) => w.there),
      ]
    },
    // A far connection is a shortcut: with any, no distance is sure to be a lower bound.
    distance: (a, b) =>
      far.size || parsePlaceOn(a) || parsePlaceOn(b)
        ? 0
        : km * cellDistance(cell(a), cell(b), around),
    diagonal(a, b) {
      const other = within(a, b)
      if (other) {
        const beside = other.world.diagonal?.(other.a, other.b)
        return beside && [placeOn(other.map, beside[0]), placeOn(other.map, beside[1])]
      }
      if (!square || parsePlaceOn(a) || parsePlaceOn(b)) return undefined
      const [p, q] = [cell(a), cell(b)]
      if (Math.abs(p.col - q.col) !== 1 || Math.abs(p.row - q.row) !== 1) return undefined
      return [keyOf({ col: q.col, row: p.row }), keyOf({ col: p.col, row: q.row })]
    },
    connections: (a, b) => {
      const way = wayOf(a, b)
      if (way) return way.kind ? [way.kind] : []
      const other = within(a, b)
      if (other) return other.world.connections(other.a, other.b)
      return [...(connections.get(`${a}|${b}`) ?? [])]
    },
    // Its values (`fields`) as `connection.<key>`, beside its id, kind, name and tags.
    connectionOf(a, b) {
      const way = wayOf(a, b)
      if (way)
        return way.kind ? { id: way.id, kind: way.kind, tags: [], name: way.name } : undefined
      const other = within(a, b)
      if (other) return other.world.connectionOf?.(other.a, other.b)
      const c = drawn.get(`${a}|${b}`)
      if (!c) return undefined
      return {
        ...fieldValues(c.fields),
        id: c.id,
        kind: c.kind,
        tags: c.tags ?? [],
        ...(c.name && { name: c.name }),
      }
    },
  }
}

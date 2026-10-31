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
import { fieldValues } from './hex'
import { type HexMap, type MapConnection, TRAVEL_PATH_KINDS } from './types'

/** A place of another map of the tree, as the world of this one names it: `@<map>/<hex>`. */
export const placeOn = (map: string, hex: string): string => `@${map}/${hex}`

/** The map and place of a place of another map (`@<map>/<hex>`); undefined for this map's. */
export function parsePlaceOn(id: string): { map: string; place: HexKey } | undefined {
  const match = /^@(.+)\/(\d+,\d+)$/.exec(id)
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

/** This map's ways: into each of its sub-maps (from their parent place), and out of it. */
function waysOf(map: HexMap, links: MapLinks): Way[] {
  const ways: Way[] = []
  for (const child of links.children ?? []) {
    const p = child.meta.parent
    if (!p || p.map !== map.meta.id) continue
    ways.push({
      here: p.place,
      there: placeOn(child.meta.id, p.entrance),
      other: child,
      ...(p.kind && { kind: p.kind }),
      id: `way-${child.meta.id}`,
      name: child.meta.name,
    })
  }
  const own = map.meta.parent
  if (own && links.parent?.meta.id === own.map)
    ways.push({
      here: own.entrance,
      there: placeOn(own.map, own.place),
      other: links.parent,
      ...(own.kind && { kind: own.kind }),
      id: `way-${map.meta.id}`,
      name: map.meta.name,
    })
  return ways
}

/**
 * The map as the Travel Engine sees it: each hex a place (its terrain, tags, region, values,
 * icon, faction and places in it), its neighbours, and the roads, rivers and drawn
 * connections between them (one drawn between far hexes makes them neighbours), a step a
 * hex at the map's scale, else the system's (`systemHexKm`), else the default. With its
 * `links`, the ways into its sub-maps and out of it are steps too: to a place of the other
 * map (`@<map>/<hex>`, what it knows of it), of the way's kind, no distance.
 */
export function mapWorld(map: HexMap, systemHexKm?: number, links: MapLinks = {}): TravelWorld {
  const ways = waysOf(map, links)
  const wayOf = (a: string, b: string) =>
    ways.find((w) => (w.here === a && w.there === b) || (w.here === b && w.there === a))
  const others = new Map<string, TravelWorld>()
  const otherWorld = (other: HexMap) => {
    if (!others.has(other.meta.id)) others.set(other.meta.id, mapWorld(other, systemHexKm))
    return others.get(other.meta.id)!
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
  const km = map.scale.cellKm ?? systemHexKm ?? DEFAULT_CELL_KM
  const isFar = (a: string, b: string) =>
    !!wayOf(a, b) || (drawn.has(`${a}|${b}`) && hexDistance(a, b) > 1)
  return {
    // A connection between far hexes measures its own `km`, else the hexes between its ends;
    // a way into another map, none.
    km: (a, b) =>
      wayOf(a, b) ? 0 : isFar(a, b) ? (drawn.get(`${a}|${b}`)!.km ?? km * hexDistance(a, b)) : km,
    far: isFar,
    place(hex) {
      const there = parsePlaceOn(hex)
      if (there) {
        const way = ways.find((w) => w.there === hex)
        return way ? otherWorld(way.other).place(there.place) : null
      }
      if (!inBounds(cell(hex), grid)) return null
      const data = map.hexes[hex as HexKey]
      const inRegion = data?.region ? map.regions.find((r) => r.id === data.region) : undefined
      // The region's values hold for all its hexes; a hex's own values win.
      const stats = { ...fieldValues(inRegion?.fields), ...fieldValues(data?.fields) }
      // Regions by name: what tables and travel rules would write in a condition.
      const region = inRegion?.name
      return {
        ...stats,
        terrain: data?.terrain,
        tags: data?.tags ?? [],
        ...(region && { region }),
        ...(data?.name && { name: data.name }),
        // Water as the palette says (Edit palette → Water): travel rules' `water` applies.
        ...(data?.terrain && water.has(data.terrain) && { water: true }),
        // The hex's icon (a village, a bridge…) and its values: {{icon.guards}}.
        ...(data?.icon && { icon: { ...fieldValues(data.icon.fields), id: data.icon.id } }),
        // The faction that holds it, if any (`place.faction`).
        ...(holder(hex) && { faction: holder(hex) }),
        // The places in it, by id: characters' relations to them (`poi:<id>`) hold here.
        ...(data?.pois?.length && { pois: data.pois.map((p) => p.id) }),
      }
    },
    neighbors: (hex) =>
      parsePlaceOn(hex)
        ? ways.filter((w) => w.there === hex).map((w) => w.here)
        : [
            ...neighborCells(cell(hex), around).map(keyOf),
            ...(far.get(hex) ?? []),
            ...ways.filter((w) => w.here === hex).map((w) => w.there),
          ],
    // A far connection is a shortcut: with any, no distance is sure to be a lower bound.
    distance: (a, b) =>
      far.size || parsePlaceOn(a) || parsePlaceOn(b)
        ? 0
        : km * cellDistance(cell(a), cell(b), around),
    diagonal(a, b) {
      if (!square || parsePlaceOn(a) || parsePlaceOn(b)) return undefined
      const [p, q] = [cell(a), cell(b)]
      if (Math.abs(p.col - q.col) !== 1 || Math.abs(p.row - q.row) !== 1) return undefined
      return [keyOf({ col: q.col, row: p.row }), keyOf({ col: p.col, row: q.row })]
    },
    connections: (a, b) => {
      const way = wayOf(a, b)
      if (way) return way.kind ? [way.kind] : []
      return [...(connections.get(`${a}|${b}`) ?? [])]
    },
    // Its values (`fields`) as `connection.<key>`, beside its id, kind, name and tags.
    connectionOf(a, b) {
      const way = wayOf(a, b)
      if (way)
        return way.kind ? { id: way.id, kind: way.kind, tags: [], name: way.name } : undefined
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

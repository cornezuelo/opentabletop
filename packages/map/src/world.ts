import {
  distance,
  inBounds,
  keyOf,
  neighborCells,
  parseKey,
  toAxial,
  type HexKey,
} from '@open-tabletop/hex'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { DEFAULT_HEX_KM } from './defaults'
import { fieldValues } from './hex'
import { type HexMap, type MapConnection, TRAVEL_PATH_KINDS } from './types'

/**
 * The map as the Travel Engine sees it: each hex a place (its terrain, tags, region, values,
 * icon, faction and places in it), its neighbours, and the roads, rivers and drawn
 * connections between them (one drawn between far hexes makes them neighbours), a step a
 * hex at the map's scale, else the system's (`systemHexKm`), else the default.
 */
export function mapWorld(map: HexMap, systemHexKm?: number): TravelWorld {
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
  const hexDistance = (a: string, b: string) =>
    distance(toAxial(cell(a), grid.orientation), toAxial(cell(b), grid.orientation))
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
  const km = map.scale.hexKm ?? systemHexKm ?? DEFAULT_HEX_KM
  const isFar = (a: string, b: string) => drawn.has(`${a}|${b}`) && hexDistance(a, b) > 1
  return {
    // A connection between far hexes measures its own `km`, else the hexes between its ends.
    km: (a, b) => (isFar(a, b) ? (drawn.get(`${a}|${b}`)!.km ?? km * hexDistance(a, b)) : km),
    far: isFar,
    place(hex) {
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
    neighbors: (hex) => [...neighborCells(cell(hex), grid).map(keyOf), ...(far.get(hex) ?? [])],
    // A far connection is a shortcut: with any, no distance is sure to be a lower bound.
    distance: (a, b) => (far.size ? 0 : km * hexDistance(a, b)),
    connections: (a, b) => [...(connections.get(`${a}|${b}`) ?? [])],
    // Its values (`fields`) as `connection.<key>`, beside its id, kind, name and tags.
    connectionOf(a, b) {
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

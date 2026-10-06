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
import { TRAVEL_PATH_KINDS, type HexMap } from '../model/types'

/** The map as the Travel Engine sees it: terrain, neighbors and road/river edges. */
export function mapWorld(map: HexMap): TravelWorld {
  const { grid } = map
  const edges = new Map<string, Set<string>>()
  for (const path of map.paths.filter((p) => TRAVEL_PATH_KINDS.includes(p.kind)))
    for (let i = 0; i < path.hexes.length - 1; i++) {
      const [a, b] = [path.hexes[i], path.hexes[i + 1]]
      for (const pair of [`${a}|${b}`, `${b}|${a}`]) {
        if (!edges.has(pair)) edges.set(pair, new Set())
        edges.get(pair)!.add(path.kind)
      }
    }
  const cell = (hex: string) => parseKey(hex as HexKey)
  const water = new Set(map.terrains.filter((t) => t.water).map((t) => t.id))
  return {
    hexKm: map.scale.hexKm,
    cell(hex) {
      if (!inBounds(cell(hex), grid)) return null
      const data = map.hexes[hex as HexKey]
      const stats: Record<string, unknown> = {}
      for (const field of data?.fields ?? []) {
        const n = Number(field.value)
        stats[field.key] = field.value !== '' && Number.isFinite(n) ? n : field.value
      }
      // Regions by name: what tables and travel rules would write in a condition.
      const region = data?.region ? map.regions.find((r) => r.id === data.region)?.name : undefined
      return {
        ...stats,
        terrain: data?.terrain,
        tags: data?.tags ?? [],
        ...(region && { region }),
        // Water as the palette says (Edit palette → Water): travel rules' `water` applies.
        ...(data?.terrain && water.has(data.terrain) && { water: true }),
      }
    },
    neighbors: (hex) => neighborCells(cell(hex), grid).map(keyOf),
    distance: (a, b) =>
      distance(toAxial(cell(a), grid.orientation), toAxial(cell(b), grid.orientation)),
    edges: (a, b) => [...(edges.get(`${a}|${b}`) ?? [])],
  }
}

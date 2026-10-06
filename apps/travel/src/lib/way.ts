import type { TravelWorld } from '@open-tabletop/travel-engine'

/** One hex of an abstract trip: what it is and how it joins the next one. */
export interface WayHex {
  terrain: string
  tags: string[]
  /** Kinds of line (road, river…) that lead from this hex to the next. */
  edges: string[]
}

/**
 * A trip without a map: a line of hexes ("0", "1", "2"…) the party walks along. Each hex
 * has the terrain and tags you give it; roads and rivers join it to the next one.
 */
export function wayWorld(way: readonly WayHex[], hexKm: number): TravelWorld {
  const index = (hex: string) => Number(hex)
  const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < way.length
  return {
    hexKm,
    cell(hex) {
      const h = way[index(hex)]
      return h ? { terrain: h.terrain, tags: h.tags } : null
    },
    neighbors(hex) {
      const i = index(hex)
      return [i - 1, i + 1].filter(valid).map(String)
    },
    distance: (a, b) => Math.abs(index(a) - index(b)),
    edges(a, b) {
      const [i, j] = [index(a), index(b)].sort((x, y) => x - y)
      return j === i + 1 ? (way[i]?.edges ?? []) : []
    },
  }
}

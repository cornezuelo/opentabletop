import type { TravelWorld } from '@open-tabletop/travel-engine'

/** The default palette's water terrains (Map's map palette decides there). */
export const WATER = ['lake', 'sea', 'deep-sea']

/** The lines every way can have; any other kind is the system's own (a gate, a door). */
export const LINES = ['road', 'trail', 'river']

/** One hex of an abstract trip: what it is and how it joins the next one. */
export interface WayHex {
  terrain: string
  tags: string[]
  /** Kinds of connection (road, river…) that lead from this hex to the next. */
  connections: string[]
}

/**
 * A trip without a map: a line of hexes ("0", "1", "2"…) the party walks along. Each hex
 * has the terrain and tags you give it; roads and rivers join it to the next one. A river
 * with nothing else on its leg is crossed, as on a map; a road or gate there takes it over.
 */
export function wayWorld(way: readonly WayHex[], cellKm: number): TravelWorld {
  const index = (hex: string) => Number(hex)
  const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < way.length
  /** The kinds of the leg between two hexes, if they're next to each other. */
  const leg = (a: string, b: string): { i: number; kinds: string[] } | undefined => {
    const [i, j] = [index(a), index(b)].sort((x, y) => x - y)
    return j === i + 1 ? { i, kinds: way[i]?.connections ?? [] } : undefined
  }
  const waded = (kinds: string[]) => kinds.length === 1 && kinds[0] === 'river'
  return {
    km: () => cellKm,
    place(hex) {
      const h = way[index(hex)]
      return h
        ? { terrain: h.terrain, tags: h.tags, ...(WATER.includes(h.terrain) && { water: true }) }
        : null
    },
    neighbors(hex) {
      const i = index(hex)
      return [i - 1, i + 1].filter(valid).map(String)
    },
    distance: (a, b) => cellKm * Math.abs(index(a) - index(b)),
    connections(a, b) {
      const kinds = leg(a, b)?.kinds ?? []
      return waded(kinds) ? [] : kinds
    },
    crossings(a, b) {
      const kinds = leg(a, b)?.kinds ?? []
      return waded(kinds) ? kinds : []
    },
    // The connection to the next hex is the leg's (`leg-<n>`): the system's own kind if it has
    // one (a gate on the road), else its first. Its state in play is kept by that id.
    connectionOf(a, b) {
      const found = leg(a, b)
      if (!found || waded(found.kinds)) return undefined
      const kind = found.kinds.find((k) => !LINES.includes(k)) ?? found.kinds[0]
      return kind === undefined ? undefined : { id: `leg-${found.i}`, kind }
    },
  }
}

import { regionChain, type HexKey, type HexMap, type MapRegion } from '@open-tabletop/map'
import type { Command, MapChange } from './command'

/** Replaces the region list (add, rename, recolor…). Hexes keep their region ids. */
export class SetRegionsCommand implements Command {
  private before: MapRegion[] = []

  constructor(private after: MapRegion[]) {}

  apply(map: HexMap): MapChange {
    this.before = map.regions
    map.regions = structuredClone(this.after)
    return { kind: 'regions' }
  }

  revert(map: HexMap): MapChange {
    map.regions = this.before
    return { kind: 'regions' }
  }
}

/**
 * Deletes a region: its hexes and the regions inside it go to the region it lay inside, or
 * out of any region when it lay in none.
 */
export class RemoveRegionCommand implements Command {
  private before: MapRegion[] = []
  private hexes: HexKey[] = []

  constructor(private region: MapRegion) {}

  apply(map: HexMap): MapChange {
    this.before = map.regions
    const parent = this.region.parent
    map.regions = map.regions
      .filter((r) => r.id !== this.region.id)
      .map((r) => {
        if (r.parent !== this.region.id) return r
        const moved = { ...r }
        if (parent) moved.parent = parent
        else delete moved.parent
        return moved
      })
    this.hexes = []
    for (const [key, hex] of Object.entries(map.hexes) as [HexKey, HexMap['hexes'][HexKey]][]) {
      if (hex.region !== this.region.id) continue
      this.hexes.push(key)
      const rest = { ...hex }
      if (parent) rest.region = parent
      else delete rest.region
      if (Object.keys(rest).length > 0) map.hexes[key] = rest
      else delete map.hexes[key]
    }
    return { kind: 'all' }
  }

  revert(map: HexMap): MapChange {
    map.regions = this.before
    for (const key of this.hexes) map.hexes[key] = { ...map.hexes[key], region: this.region.id }
    return { kind: 'all' }
  }
}

/** How many hexes each region has, with those of the regions inside it. */
export function regionSizes(map: HexMap): Map<string, number> {
  const sizes = new Map<string, number>()
  for (const hex of Object.values(map.hexes))
    for (const { id } of regionChain(map.regions, hex.region))
      sizes.set(id, (sizes.get(id) ?? 0) + 1)
  return sizes
}

import type { HexKey, HexMap, MapRegion } from '../model/types'
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

/** Deletes a region and takes its hexes out of it. */
export class RemoveRegionCommand implements Command {
  private index = -1
  private hexes: HexKey[] = []

  constructor(private region: MapRegion) {}

  apply(map: HexMap): MapChange {
    this.index = map.regions.findIndex((r) => r.id === this.region.id)
    map.regions = map.regions.filter((r) => r.id !== this.region.id)
    this.hexes = []
    for (const [key, hex] of Object.entries(map.hexes) as [HexKey, HexMap['hexes'][HexKey]][]) {
      if (hex.region !== this.region.id) continue
      this.hexes.push(key)
      const rest = { ...hex }
      delete rest.region
      if (Object.keys(rest).length > 0) map.hexes[key] = rest
      else delete map.hexes[key]
    }
    return { kind: 'all' }
  }

  revert(map: HexMap): MapChange {
    const regions = [...map.regions]
    regions.splice(Math.max(0, this.index), 0, structuredClone(this.region))
    map.regions = regions
    for (const key of this.hexes) map.hexes[key] = { ...map.hexes[key], region: this.region.id }
    return { kind: 'all' }
  }
}

/** How many hexes each region has. */
export function regionSizes(map: HexMap): Map<string, number> {
  const sizes = new Map<string, number>()
  for (const hex of Object.values(map.hexes))
    if (hex.region) sizes.set(hex.region, (sizes.get(hex.region) ?? 0) + 1)
  return sizes
}

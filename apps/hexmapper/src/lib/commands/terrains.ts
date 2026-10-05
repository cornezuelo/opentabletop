import type { HexKey, HexMap, TerrainType } from '../model/types'
import type { Command, MapChange } from './command'

/**
 * Replaces the terrain palette. Hexes painted with a terrain that no longer exists
 * are cleared (and restored on undo).
 */
export class SetTerrainsCommand implements Command {
  private before: TerrainType[] = []
  private cleared = new Map<HexKey, string>()

  constructor(private after: TerrainType[]) {}

  apply(map: HexMap): MapChange {
    this.before = structuredClone(map.terrains)
    map.terrains = structuredClone(this.after)
    const ids = new Set(this.after.map((t) => t.id))
    this.cleared.clear()
    for (const [key, hex] of Object.entries(map.hexes) as [HexKey, HexMap['hexes'][HexKey]][]) {
      if (!hex.terrain || ids.has(hex.terrain)) continue
      this.cleared.set(key, hex.terrain)
      const rest = { ...hex }
      delete rest.terrain
      if (Object.keys(rest).length > 0) map.hexes[key] = rest
      else delete map.hexes[key]
    }
    return { kind: 'all' }
  }

  revert(map: HexMap): MapChange {
    map.terrains = structuredClone(this.before)
    for (const [key, terrain] of this.cleared) map.hexes[key] = { ...map.hexes[key], terrain }
    return { kind: 'all' }
  }
}

/** Number of hexes painted with each terrain id. */
export function terrainUsage(map: HexMap): Map<string, number> {
  const usage = new Map<string, number>()
  for (const hex of Object.values(map.hexes))
    if (hex.terrain) usage.set(hex.terrain, (usage.get(hex.terrain) ?? 0) + 1)
  return usage
}

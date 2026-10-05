import type { HexIcon, HexKey, HexMap, MapAsset } from '../model/types'
import type { Command, MapChange } from './command'

export class AddAssetCommand implements Command {
  constructor(private asset: MapAsset) {}

  apply(map: HexMap): MapChange {
    // New array so reactive views of the asset list notice the change.
    map.assets = [...map.assets, { ...this.asset }]
    return { kind: 'assets' }
  }

  revert(map: HexMap): MapChange {
    map.assets = map.assets.filter((a) => a.id !== this.asset.id)
    return { kind: 'assets' }
  }
}

/** Removes an asset and clears it from every hex that uses it as icon. */
export class RemoveAssetCommand implements Command {
  private index = -1
  private cleared = new Map<HexKey, HexIcon>()

  constructor(private asset: MapAsset) {}

  apply(map: HexMap): MapChange {
    const ref = `asset:${this.asset.id}`
    this.index = map.assets.findIndex((a) => a.id === this.asset.id)
    map.assets = map.assets.filter((a) => a.id !== this.asset.id)
    this.cleared.clear()
    for (const [key, hex] of Object.entries(map.hexes) as [HexKey, HexMap['hexes'][HexKey]][]) {
      if (hex.icon?.id !== ref) continue
      this.cleared.set(key, hex.icon)
      const rest = { ...hex }
      delete rest.icon
      if (Object.keys(rest).length > 0) map.hexes[key] = rest
      else delete map.hexes[key]
    }
    return { kind: 'all' }
  }

  revert(map: HexMap): MapChange {
    const assets = [...map.assets]
    assets.splice(Math.max(0, this.index), 0, { ...this.asset })
    map.assets = assets
    for (const [key, icon] of this.cleared) map.hexes[key] = { ...map.hexes[key], icon }
    return { kind: 'all' }
  }
}

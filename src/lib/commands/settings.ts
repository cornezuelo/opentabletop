import type { GridSettings, HexMap, MapMeta } from '../model/types'
import type { Command, MapChange } from './command'

/** Changes grid settings (size, orientation, coordinates...). Hex data outside the new bounds is kept. */
export class SetGridCommand implements Command {
  private before: Partial<GridSettings> = {}

  constructor(private patch: Partial<GridSettings>) {}

  apply(map: HexMap): MapChange {
    for (const key of Object.keys(this.patch) as (keyof GridSettings)[])
      (this.before as Record<string, unknown>)[key] = map.grid[key]
    Object.assign(map.grid, this.patch)
    return { kind: 'grid' }
  }

  revert(map: HexMap): MapChange {
    Object.assign(map.grid, this.before)
    return { kind: 'grid' }
  }
}

export class SetMetaCommand implements Command {
  private before: Partial<MapMeta> = {}

  constructor(private patch: Partial<Pick<MapMeta, 'name'>>) {}

  apply(map: HexMap): MapChange {
    this.before = { name: map.meta.name }
    Object.assign(map.meta, this.patch)
    return { kind: 'meta' }
  }

  revert(map: HexMap): MapChange {
    Object.assign(map.meta, this.before)
    return { kind: 'meta' }
  }
}

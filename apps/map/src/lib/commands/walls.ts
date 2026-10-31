import type { HexKey, HexMap } from '@open-tabletop/map'
import type { Command, MapChange } from './command'

const CHANGE: MapChange = { kind: 'walls' }

/** The walls drawn by hand, before and after a stroke of the walls tool. */
export class ReplaceWallsCommand implements Command {
  constructor(
    private before: [HexKey, HexKey][],
    private after: [HexKey, HexKey][],
  ) {}

  apply(map: HexMap): MapChange {
    map.walls = structuredClone(this.after)
    return CHANGE
  }

  revert(map: HexMap): MapChange {
    map.walls = structuredClone(this.before)
    return CHANGE
  }
}

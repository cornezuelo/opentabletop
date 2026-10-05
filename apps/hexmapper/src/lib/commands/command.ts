import type { HexKey, HexMap } from '../model/types'

/** What part of the map a mutation touched, so renderers can update incrementally. */
export type MapChange =
  | { kind: 'hexes'; keys: HexKey[] }
  | { kind: 'grid' }
  | { kind: 'terrains' }
  | { kind: 'meta' }
  | { kind: 'all' }

/** A reversible map mutation. Every edit goes through one so undo/redo always works. */
export interface Command {
  apply(map: HexMap): MapChange
  revert(map: HexMap): MapChange
}

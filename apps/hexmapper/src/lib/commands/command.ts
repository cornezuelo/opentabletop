import type { HexKey, HexMap } from '../model/types'

/** What part of the map a mutation touched, so renderers can update incrementally. */
export type MapChange =
  | { kind: 'hexes'; keys: HexKey[] }
  | { kind: 'grid' }
  | { kind: 'terrains' }
  | { kind: 'paths' }
  | { kind: 'assets' }
  | { kind: 'layers' }
  | { kind: 'labels' }
  | { kind: 'play' }
  /** The map's Oracle state or roll history. */
  | { kind: 'oracle' }
  /** The world clock (time, events, progress clocks). */
  | { kind: 'world' }
  /** The factions: their sheets, territory and turns. */
  | { kind: 'factions' }
  | { kind: 'tokens' }
  | { kind: 'regions' }
  /** Look-only settings (glyph opacity): redraw without rebuilding the grid. */
  | { kind: 'style' }
  | { kind: 'meta' }
  | { kind: 'all' }

/** A reversible map mutation. Every edit goes through one so undo/redo always works. */
export interface Command {
  apply(map: HexMap): MapChange
  revert(map: HexMap): MapChange
}

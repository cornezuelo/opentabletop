import type { CoordFormat, HexKey } from '../hex/grid'
import type { Orientation } from '../hex/offset'
import type { PaperId, Size } from '../print/paper'

export type { CoordFormat, HexKey, Orientation }

export interface TerrainType {
  id: string
  /** Custom name. When absent, the UI shows the translated default for `id`. */
  name?: string
  color: string
}

export interface Poi {
  id: string
  name: string
  description?: string
}

export interface CustomField {
  key: string
  value: string
}

/** All fields are optional; empty values are stripped (see `normalizeHex`). */
export interface HexData {
  terrain?: string
  name?: string
  /** Markdown. */
  notes?: string
  pois?: Poi[]
  tags?: string[]
  /** Ordered key/value stats. */
  fields?: CustomField[]
  /** SilverBullet page path, e.g. "Kal-Arath/Hexes/0101". */
  note?: string
}

export interface GridSettings {
  orientation: Orientation
  /** Center-to-corner radius in world units. */
  hexSize: number
  width: number
  height: number
  coordFormat: CoordFormat
  showCoords: boolean
}

/** Physical size for printing. The grid's cols × rows stay the source of truth. */
export interface PrintSettings {
  /** Hex size flat-to-flat in mm (how mini bases are measured). */
  hexMm: number
  /** When set, cols × rows are derived from what fits on this paper. Null = sized by hex count. */
  paper: PaperId | null
  landscape: boolean
  marginMm: number
  /** Paper size when `paper` is 'custom'. */
  customPaper: Size
}

export interface MapMeta {
  /** Unique, shareable id. Used as the save file name and (later) in deep links. */
  id: string
  name: string
  created: string
  modified: string
}

export interface HexMap {
  version: number
  meta: MapMeta
  grid: GridSettings
  print: PrintSettings
  terrains: TerrainType[]
  /** Keyed by offset coordinates "col,row". */
  hexes: Record<HexKey, HexData>
}

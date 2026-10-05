import type { CoordFormat, HexKey } from '../hex/grid'
import type { Orientation } from '../hex/offset'

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

export interface MapMeta {
  name: string
  created: string
  modified: string
}

export interface HexMap {
  version: number
  meta: MapMeta
  grid: GridSettings
  terrains: TerrainType[]
  /** Keyed by offset coordinates "col,row". */
  hexes: Record<HexKey, HexData>
}

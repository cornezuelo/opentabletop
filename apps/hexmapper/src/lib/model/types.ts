import { type CoordFormat, type HexKey, type Orientation } from '@open-tabletop/hex'
import type { PaperId, Size } from '../print/paper'

export type { CoordFormat, HexKey, Orientation }

export interface TerrainType {
  id: string
  /** Custom name. When absent, the UI shows the translated default for `id`. */
  name?: string
  color: string
  /** Water (lake, sea…): roads and rivers stop at its shore. */
  water?: boolean
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
  /** External note path, e.g. "Kal-Arath/Hexes/0101". */
  note?: string
  icon?: HexIcon
}

/** Icon placed on a hex. Only non-default style values are stored. */
export interface HexIcon {
  /** "game:<name>" (bundled set) or "asset:<id>" (imported into the map). */
  id: string
  /** Ink color for single-color icons; absent = automatic (dark on terrain, light on empty). */
  color?: string
  /** Size multiplier, 1 = default. */
  scale?: number
  /** Degrees clockwise. */
  rotation?: number
  flip?: boolean
  /** Soft light disc behind the icon, for legibility on busy terrain. */
  halo?: boolean
}

export type IconStyle = Omit<HexIcon, 'id'>

export interface GridSettings {
  orientation: Orientation
  /** Center-to-corner radius in world units. */
  hexSize: number
  width: number
  height: number
  coordFormat: CoordFormat
  showCoords: boolean
}

/** An image imported by the user (e.g. a custom icon), embedded in the map file. */
export interface MapAsset {
  id: string
  name: string
  /** data:image/png|svg+xml|jpeg|webp;base64,... */
  dataUrl: string
}

export const PATH_KINDS = ['road', 'trail', 'river'] as const
export type PathKind = (typeof PATH_KINDS)[number]

/**
 * A road, trail or river running center-to-center through hexes. Consecutive hexes
 * are neighbors, so a path also defines edges the Travel Engine can query.
 */
export interface MapPath {
  id: string
  kind: PathKind
  hexes: HexKey[]
  /**
   * Where the path passes inside each hex, parallel to `hexes`, as [dx, dy] from the
   * center in hex-size units. Null (or missing array) = centered.
   */
  offsets?: ([number, number] | null)[]
  /** Straight segments instead of a smooth curve (e.g. rivers following hex edges). */
  straight?: boolean
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
  paths: MapPath[]
  assets: MapAsset[]
}

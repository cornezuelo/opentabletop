import type { CharacterState } from '@open-tabletop/character-engine'
import type { WorldState } from '@open-tabletop/world-engine'
import { type CoordFormat, type HexKey, type Orientation } from '@open-tabletop/hex'
import type { OracleState } from '@open-tabletop/oracle-engine'
import type { HistoryItem } from '@open-tabletop/oracle-ui'
import type { PaperId, Size } from '../print/paper'

export type { CoordFormat, HexKey, Orientation }

export interface TerrainType {
  id: string
  /** Custom name. When absent, the UI shows the translated default for `id`. */
  name?: string
  color: string
  /** Water (lake, sea…): roads and rivers stop at its shore. */
  water?: boolean
  /**
   * Small symbol drawn on its hexes (`game:<name>` or an imported `asset:<id>`), in a
   * lighter or darker shade of `color`. Absent = none.
   */
  glyph?: string
}

export interface Poi {
  id: string
  /** Values tables and travel checks can read (key/value, like a hex's fields). */
  fields?: CustomField[]
  name: string
  description?: string
  /** External note path (same providers as hexes). */
  note?: string
  /** Icon to tell it apart in the hex panel (not drawn on the map). */
  icon?: string
}

export interface CustomField {
  key: string
  value: string
}

/** All fields are optional; empty values are stripped (see `normalizeHex`). */
export interface HexData {
  terrain?: string
  /** Id of the region (kingdom, territory…) the hex belongs to. */
  region?: string
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
  /** False hides the name on the map (it's still the hex's name). */
  showName?: boolean
  nameStyle?: CaptionOverride
}

/** Icon placed on a hex. Only non-default style values are stored. */
export interface HexIcon {
  /** Values tables and travel checks can read (key/value, like a hex's fields). */
  fields?: CustomField[]
  /** "game:<name>" (bundled set) or "asset:<id>" (imported into the map). */
  id: string
  /** Ink color for single-color icons; absent = automatic (dark on terrain, light on empty). */
  color?: string
  /** Size multiplier, 1 = default. */
  scale?: number
  /** Degrees clockwise. */
  rotation?: number
  flip?: boolean
  /** Disc behind the icon, for legibility on busy terrain. */
  halo?: boolean
  haloColor?: string
  /** Disc radius as a fraction of the icon size (default 0.48). */
  haloSize?: number
  /** Outline hugging the icon's shape. */
  outline?: boolean
  outlineColor?: string
  /** Outline thickness as a fraction of the icon size (default 0.03). */
  outlineWidth?: number
  /** Position inside the hex as [dx, dy] from the center, in hex-size units. */
  offset?: [number, number]
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
  /** Opacity of terrain glyphs, 0 (hidden) to 1. */
  glyphs: number
}

/** An image imported by the user (e.g. a custom icon), embedded in the map file. */
export interface MapAsset {
  id: string
  name: string
  /** data:image/png|svg+xml|jpeg|webp;base64,... */
  dataUrl: string
}

export const LABEL_FONTS = ['fell', 'cinzel', 'sans'] as const
export type LabelFont = (typeof LABEL_FONTS)[number]

/** Free text on the map (regions, seas, mountain ranges…), positioned in world space. */
export interface MapLabel {
  id: string
  text: string
  /** Center position in hex-size units from the map origin, so it scales with hex size. */
  x: number
  y: number
  style: LabelStyle
}

export interface LabelStyle {
  font: LabelFont
  /** Font size in hex-size units (1 = hex radius). */
  size: number
  color: string
  /** Degrees clockwise. */
  rotation: number
  italic: boolean
  /** Outline around the letters for legibility over busy terrain. */
  halo: boolean
  haloColor: string
  /** Outline thickness as a fraction of the font size. */
  haloWidth: number
}

/** A named area painted over hexes: kingdom, territory, danger zone… */
export interface MapRegion {
  id: string
  /** Values tables and travel checks can read (key/value, like a hex's fields). */
  fields?: CustomField[]
  name: string
  color: string
  /** Show the name on the map (default on). */
  showName?: boolean
  nameStyle?: CaptionOverride
  /** External note path (same providers as hexes). */
  note?: string
  /** Its own look; what it leaves out comes from the map's region style. */
  style?: Partial<RegionStyle>
}

/** How regions are drawn (map-wide, and per region as an override). */
export interface RegionStyle {
  /** Opacity of the tint inside (0 = no fill). */
  fill: number
  /** Border width in hex sizes (0 = no border). */
  border: number
  dashed: boolean
  /** Opacity of the border. */
  borderOpacity: number
}

export const CAPTION_KINDS = ['hexNames', 'regionNames', 'tokenNames'] as const
export type CaptionKind = (typeof CAPTION_KINDS)[number]

/** How one kind of map text is drawn (hex names, region names, token names). */
export interface CaptionStyle {
  show: boolean
  font: LabelFont
  /** Relative size, 1 = default. */
  size: number
  /** Absent = automatic: dark ink, or each region's own color. */
  color?: string
  italic: boolean
  halo: boolean
  haloColor: string
}

/** One element's own text style, replacing its kind's (Map settings → Map texts). */
export type CaptionOverride = Omit<CaptionStyle, 'show'>

export const TOKEN_KINDS = ['party', 'pc', 'npc', 'enemy'] as const
export type TokenKind = (typeof TOKEN_KINDS)[number]

/**
 * A movable piece on the map: the party, a character, a monster… Several can share a
 * hex. Saved in OTD as a character (or, for the party, the party) with a location.
 */
export interface MapToken {
  id: string
  /** Values tables and travel checks can read (key/value, like a hex's fields). */
  fields?: CustomField[]
  name: string
  kind: TokenKind
  /** Where it stands; absent = off the map (kept in the token list). */
  hex?: HexKey
  /** Bundled icon or an imported image (`asset:<id>`). */
  iconId: string
  /** Ink and ring color; absent = the kind's default. */
  color?: string
  /** Light disc behind the icon (default on). */
  halo?: boolean
  /** Show the name under the token. */
  showName?: boolean
  nameStyle?: CaptionOverride
  /** External note path (same providers as hexes). */
  note?: string
}

/** Oracle state (decks drawn, once-only entries, values set) and the history of hand rolls. */
export interface MapOracle {
  state: OracleState
  history: HistoryItem[]
}

/** Play mode: the party (the `party` token) travelling on the map. */
export interface PlayState {
  /** 'simple': move the token freely. 'rules': the Travel Engine and Oracle drive the trip. */
  mode: 'simple' | 'rules'
  /** Hexes visited, in order. */
  trail: HexKey[]
  showTrail: boolean
  /** The trail and the planned route as straight lines between hexes (default: curves). */
  straightTrail?: boolean
  /** Rules mode only: system (pack id or 'generic') and the session state (travel, oracle, journal). */
  /**
   * The trip: `system` is the one it was started with (the map's, `meta.system`, at that
   * moment); a trip keeps playing it until a new one starts.
   */
  rules?: {
    system: string
    startDay: number
    session: unknown
    /**
     * The party's characters before a trip starts (a map can bring its company); once it
     * starts they're the trip's (`session.members`).
     */
    members?: CharacterState[]
  }
  /**
   * Discovery (rules mode, systems with `discover` bindings): empty hexes are decided as
   * the party travels. `reveal` overrides the system's choice (neighbours or entered hex).
   */
  discover?: { on: boolean; reveal?: 'neighbors' | 'entered' }
}

/**
 * Fixed map layers, in draw order (bottom first). Keep MapRenderer's container order in
 * step; the Layers panel lists them top first.
 */
export const LAYER_IDS = [
  'terrain',
  'grid',
  'regions',
  'paths',
  'icons',
  'coords',
  'labels',
  'party',
  'tokens',
  'markers',
] as const
export type LayerId = (typeof LAYER_IDS)[number]
/** Layers that tools edit, and so can be locked. */
export const LOCKABLE_LAYERS: readonly LayerId[] = [
  'terrain',
  'regions',
  'paths',
  'icons',
  'labels',
  'tokens',
]

export interface LayerState {
  visible: boolean
  locked: boolean
}

export const PATH_KINDS = ['road', 'trail', 'river', 'border', 'wall'] as const
export type PathKind = (typeof PATH_KINDS)[number]
/** Paths the Travel Engine sees as edges; borders and walls are only drawn. */
export const TRAVEL_PATH_KINDS: readonly PathKind[] = ['road', 'trail', 'river']

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
  /**
   * Indices of the hexes that are drawn vertices (points the user placed). The other
   * hexes only record what the path crosses, for travel. Absent = every hex is a vertex.
   */
  nodes?: number[]
  /** Straight segments between vertices instead of a smooth curve. */
  straight?: boolean
  /** A loop: the last vertex joins the first (e.g. a border around a region). */
  closed?: boolean
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
  /** The system the map is played with (`kind: system` id); absent = the generic one. */
  system?: string
  /**
   * Packs the map works with besides the ones its system brings (its Oracle panel shows
   * both); absent = every loaded pack.
   */
  packs?: string[]
}

export interface HexMap {
  version: number
  meta: MapMeta
  grid: GridSettings
  /**
   * World scale for travel: kilometres per hex (not to be confused with print.hexMm).
   * Absent: the system's (`travel.hexKm` in its rules), else DEFAULT_HEX_KM.
   */
  scale: { hexKm?: number }
  print: PrintSettings
  terrains: TerrainType[]
  /** Keyed by offset coordinates "col,row". */
  hexes: Record<HexKey, HexData>
  paths: MapPath[]
  assets: MapAsset[]
  labels: MapLabel[]
  tokens: MapToken[]
  regions: MapRegion[]
  captions: Record<CaptionKind, CaptionStyle>
  regionStyle: RegionStyle
  layers: Record<LayerId, LayerState>
  play?: PlayState
  /** The Oracle on this map: hand rolls and trip checks share its decks and once-only entries. */
  oracle?: MapOracle
  /** The world clock of the campaign on this map (time, scheduled events, progress clocks). */
  world?: WorldState
  /**
   * OTD data this app doesn't understand (other tools' ext namespaces, parties, log…),
   * kept verbatim so saving never loses it.
   */
  foreign?: { bundle?: Record<string, unknown>; mapExt?: Record<string, unknown> }
}

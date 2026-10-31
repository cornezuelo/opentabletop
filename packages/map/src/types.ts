import type { CharacterState } from '@open-tabletop/character-engine'
import { type CoordFormat, type GridKind, type HexKey, type Orientation } from '@open-tabletop/hex'
import type { PaperId, Size } from './paper'

export type { CoordFormat, GridKind, HexKey, Orientation }

export interface TerrainType {
  id: string
  /** Custom name. When absent, the UI shows the translated default for `id`. */
  name?: string
  color: string
  /** Water (lake, sea…): roads and rivers stop at its shore. */
  water?: boolean
  /**
   * Floor (a room's, a corridor's): where it meets a cell that isn't floor a wall is drawn by
   * itself, and trips don't cross it unless a connection is drawn there (a door).
   */
  floor?: boolean
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
  /**
   * The place template it was made from in play (`grey-marches/default/ruins`: a catalogue of
   * places, `kind: places`, and its id), shown as **Made from**; edited like any other after.
   */
  template?: string
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
  /** Its cells: hexes (absent) or squares. */
  kind?: GridKind
  /** Hexes only: flat or pointy tops. */
  orientation: Orientation
  /** Center-to-corner radius in world units (a square measures a hex's flat-to-flat across). */
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
  /**
   * Played as one place (a room, a cave, a yard): a trip is in it, not in one of its cells.
   * On floor, a wall stands between it and another such region it touches, unless a
   * connection is drawn there (a door).
   */
  onePlace?: boolean
  /**
   * The region it lies inside (a forest's heart inside the forest, a tomb inside a hall): its
   * cells are in that one too, and its values hold here unless this one sets its own.
   */
  parent?: string
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
  /**
   * Its sheet, when it's a character of the map's system (an NPC, a creature: a statblock),
   * as the character engine keeps it; its id and name are the token's.
   */
  character?: Omit<CharacterState, 'id' | 'name'>
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
  /** Those present of one template on a hex drawn apart, however many (default: one ×N past six). */
  copiesApart?: boolean
  /** Rules mode only: system (pack id or 'generic') and the session state (travel, oracle, journal). */
  /**
   * The trip: `system` is the one it was started with (its campaign's, at that
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
  /**
   * The trip went on into another map of its tree (a sub-map, or its parent), by id: it plays
   * there now, and this map keeps only where the party left from.
   */
  away?: string
}

/**
 * Fixed map layers, in draw order (bottom first). Keep MapRenderer's container order in
 * step; the Layers panel lists them top first.
 */
export const LAYER_IDS = [
  'terrain',
  'grid',
  'regions',
  'factions',
  'paths',
  'connections',
  'icons',
  'coords',
  'labels',
  'party',
  'relations',
  'tokens',
  'markers',
] as const
export type LayerId = (typeof LAYER_IDS)[number]
/** Layers that tools edit, and so can be locked. */
export const LOCKABLE_LAYERS: readonly LayerId[] = [
  'terrain',
  'regions',
  'paths',
  'connections',
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
/** Paths the Travel Engine sees as connections; borders and walls are only drawn. */
export const TRAVEL_PATH_KINDS: readonly PathKind[] = ['road', 'trail', 'river']

/**
 * A road, trail or river running center-to-center through hexes. Consecutive hexes
 * are neighbors, so a path also defines connections the Travel Engine can query.
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

/**
 * A connection drawn between two places: a bridge, a gate or a pass between neighbouring
 * hexes, or a tunnel, a ferry or a hidden path between far ones (which become neighbours).
 * Its kind is the system's (`connections:` in its travel rules), read by rules as
 * `trip.connections`; what changes while playing (open, found…) is the trip's, not the map's.
 */
export interface MapConnection {
  id: string
  /** The two places it joins, in either direction. */
  between: [HexKey, HexKey]
  /** Its kind, as the system names it (`bridge`, `ford`, `tunnel`…). */
  kind: string
  name?: string
  tags?: string[]
  fields?: CustomField[]
  /** How long it is, between far places; else the hexes between its ends at the map's scale. */
  km?: number
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
  /**
   * The campaign the map belongs to (its id): the system it's played with and the packs it
   * adds, the world clock, its weather, the factions' sheets and the Oracle state live there
   * (`@open-tabletop/campaign`), shared by its maps.
   * A new map, and every map saved before campaigns, has one of its own.
   */
  campaign: string
  /** A sub-map: the place of another map of its campaign that leads into it. */
  parent?: MapParent
}

/**
 * Where a sub-map hangs (a dungeon under a hex, a city on a map of the land, a tunnel under
 * the mountains): its parent map, and its ways to it, each a step between a place of the
 * parent and a cell of its own the trip takes like any other. A sub-map with several ways
 * is crossed: in by one, out by another.
 */
export interface MapParent {
  /** The parent map's id. */
  map: string
  /** Its ways in and out (one at least). */
  ways: MapWay[]
}

/** A way between a sub-map and its parent: the parent's place and its own cell, both ways. */
export interface MapWay {
  /** The parent's place that leads in. */
  place: HexKey
  /** Its cell the way arrives at, and leaves from. */
  entrance: HexKey
  /**
   * The kind of connection the way is, as the system names it (`way-in`): what the step
   * costs and does (`extra`, `passable`, `connection.kind` in checks). Absent: none.
   */
  kind?: string
}

export interface HexMap {
  version: number
  meta: MapMeta
  grid: GridSettings
  /**
   * World scale for travel: kilometres per hex (not to be confused with print.hexMm).
   * Absent: the system's (`travel.cellKm` in its rules), else DEFAULT_CELL_KM.
   */
  scale: { cellKm?: number }
  print: PrintSettings
  terrains: TerrainType[]
  /** Keyed by offset coordinates "col,row". */
  hexes: Record<HexKey, HexData>
  paths: MapPath[]
  /** Connections drawn between places (bridges, gates, tunnels…). */
  connections: MapConnection[]
  assets: MapAsset[]
  labels: MapLabel[]
  tokens: MapToken[]
  regions: MapRegion[]
  captions: Record<CaptionKind, CaptionStyle>
  regionStyle: RegionStyle
  layers: Record<LayerId, LayerState>
  play?: PlayState
  /**
   * The land each faction of the map's campaign holds on this map (faction id → hexes); the
   * factions themselves (their sheets, the last turn) are the campaign's.
   */
  territories?: Record<string, string[]>
  /**
   * OTD data this app doesn't understand (other tools' ext namespaces, parties, log…),
   * kept verbatim so saving never loses it.
   */
  foreign?: { bundle?: Record<string, unknown>; mapExt?: Record<string, unknown> }
}

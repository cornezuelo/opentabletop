import type { Diagnostic } from '@open-tabletop/oracle-engine'
import type { LocalizedText } from '@open-tabletop/session'
import { DEFAULT_CAPTIONS, DEFAULT_GLYPH_OPACITY, DEFAULT_REGION_STYLE } from './defaults'
import {
  CAPTION_KINDS,
  LABEL_FONTS,
  type CaptionKind,
  type CaptionStyle,
  type HexMap,
  type LabelFont,
  type RegionStyle,
} from './types'

/**
 * A map style (`kind: style`, docs/map-styles.md): how a map is drawn, never what it holds.
 * Choosing one copies its texts, regions, coordinates and glyphs into the map's own settings
 * (`applyStyle`), which the map then changes freely; what only a style decides (the grid's
 * line) is read from it while drawing. What a style leaves out is the Schematic style's.
 */
export interface MapStyle {
  kind: 'style'
  id: string
  name?: LocalizedText
  description?: LocalizedText
  /** The grid's line, and whether cells show their coordinates. */
  grid: { color: string; opacity: number; coords: boolean }
  /** Opacity of terrains' glyphs, 0 (hidden) to 1. */
  glyphs: number
  /** How each kind of name is drawn (cells', regions', tokens'). */
  captions: Record<CaptionKind, CaptionStyle>
  /** How regions are drawn. */
  regions: RegionStyle
  /** The colour of cells nothing is painted on (and of the map's paper, when exported). */
  paper: string
  /** How terrains fill their cells. */
  ground: {
    /** Each terrain's colour mixed towards the paper's: 0 as painted, 1 the paper. */
    wash: number
    /** Soft borders between terrains: how far they blend, in cells (0 hard). */
    blend: number
    /** Borders that wander off the cells' edges, in cells (0 straight). */
    ragged: number
    /** Paper grain over the ground: 0 none, 1 strong. */
    grain: number
  }
  /** What is drawn on each terrain's cells (mountains, trees…), and how. */
  art: {
    /** `ink`: lines over the terrain's colour; `painted`: shapes lit on one side, shaded on the other. */
    mode: ArtMode
    /** The colour of the lines. */
    ink: string
    /** By terrain id: the painter that draws it. A terrain not named has no art. */
    terrains: Record<string, TerrainArt>
  }
  /** Where water meets land: lines along the shore on the water's side, and a shallow band. */
  shores: { lines: number; color: string; band: number }
  /** Roads, trails and rivers: a hand's wobble, and each kind's colour and width. */
  paths: { wobble: number; kinds: Partial<Record<StyledPath, PathLook>> }
  /**
   * Floor (a terrain marked as floor: rooms, corridors): its colour, how far the terrains'
   * own colours give way to it (water keeps its own), and a grid drawn on it alone.
   */
  floors: { color: string; wash: number; grid: number }
  /** The walls round floor: colour, width (in cells), and what is drawn outside them, how deep. */
  walls: { color: string; width: number; outside: WallOutside; band: number }
}

/** What is drawn outside a dungeon's walls: nothing, hatching, a shadow, or a cave's stipple. */
export const WALL_OUTSIDES = ['none', 'hatch', 'shadow', 'stipple'] as const
export type WallOutside = (typeof WALL_OUTSIDES)[number]

/** Painters: how the art of a terrain is drawn (code, not data: a style picks one by name). */
export const PAINTERS = [
  'grass',
  'farmland',
  'conifers',
  'broadleaf',
  'forest',
  'reeds',
  'hills',
  'mountains',
  'peaks',
  'volcano',
  'dunes',
  'rocks',
  'waves',
  'dots',
] as const
export type Painter = (typeof PAINTERS)[number]

export const ART_MODES = ['ink', 'painted'] as const
export type ArtMode = (typeof ART_MODES)[number]

/** A terrain's art: its painter, how many things it draws and how big (1 the usual). */
export interface TerrainArt {
  painter: Painter
  density: number
  size: number
  /** The art's own colour; absent, the terrain's. */
  color?: string
}

/** The kinds of path a style draws its own way. */
export const STYLED_PATHS = ['river', 'road', 'trail'] as const
export type StyledPath = (typeof STYLED_PATHS)[number]
/** A path's colour, and its width in cells. */
export interface PathLook {
  color?: string
  width?: number
}

/** The Schematic style: today's look (flat colours and glyphs), and what any style leaves out. */
export const SCHEMATIC_STYLE: MapStyle = {
  kind: 'style',
  id: 'schematic',
  grid: { color: '#000000', opacity: 0.35, coords: true },
  glyphs: DEFAULT_GLYPH_OPACITY,
  captions: structuredClone(DEFAULT_CAPTIONS) as Record<CaptionKind, CaptionStyle>,
  regions: { ...DEFAULT_REGION_STYLE },
  paper: '#2a2823',
  ground: { wash: 0, blend: 0, ragged: 0, grain: 0 },
  art: { mode: 'ink', ink: '#2b2118', terrains: {} },
  shores: { lines: 0, color: '#2b2118', band: 0 },
  paths: { wobble: 0, kinds: {} },
  floors: { color: '#ffffff', wash: 0, grid: 0 },
  walls: { color: '#15130f', width: 0.16, outside: 'none', band: 0.4 },
}

/** The style a map without one is drawn in: Core's Schematic. */
export const DEFAULT_STYLE_REF = 'core/schematic'

const STYLE_KEYS = [
  'kind',
  'id',
  'name',
  'description',
  'grid',
  'glyphs',
  'captions',
  'regions',
  'paper',
  'ground',
  'art',
  'shores',
  'paths',
  'floors',
  'walls',
]
const FLOOR_KEYS = ['color', 'wash', 'grid']
const WALL_KEYS = ['color', 'width', 'outside', 'band']
const GROUND_KEYS = ['wash', 'blend', 'ragged', 'grain']
const ART_KEYS = ['mode', 'ink', 'terrains']
const TERRAIN_ART_KEYS = ['painter', 'density', 'size', 'color']
const SHORE_KEYS = ['lines', 'color', 'band']
const PATH_KEYS = ['wobble', ...STYLED_PATHS]
const PATH_LOOK_KEYS = ['color', 'width']
const GRID_KEYS = ['color', 'opacity', 'coords']
const CAPTION_KEYS = ['show', 'font', 'size', 'color', 'italic', 'halo', 'haloColor']
const REGION_KEYS = ['fill', 'border', 'dashed', 'borderOpacity']

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is LocalizedText =>
  (typeof v === 'string' && v !== '') ||
  (isRecord(v) && Object.values(v).every((x) => typeof x === 'string'))
const isColor = (v: unknown): v is string =>
  typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Reads a `kind: style` definition: the style, or the problems found (`path: message`). */
export function parseStyle(raw: unknown): { style?: MapStyle; errors: string[] } {
  const errors: string[] = []
  if (!isRecord(raw)) return { errors: ['style: expected a definition'] }
  if (raw.kind !== 'style') errors.push('kind: expected "style"')
  if (typeof raw.id !== 'string' || !raw.id) errors.push('id: expected an id')
  const unknown = (where: Record<string, unknown>, keys: string[], at: string, what: string) => {
    for (const key of Object.keys(where))
      if (!keys.includes(key)) errors.push(`${at}${key}: unknown key in ${what}`)
  }
  unknown(raw, STYLE_KEYS, '', 'a style')
  for (const key of ['name', 'description'])
    if (raw[key] !== undefined && !isText(raw[key])) errors.push(`${key}: expected a text`)
  const base = SCHEMATIC_STYLE
  const fraction = (value: unknown, at: string, fallback: number, max = 1): number => {
    if (value === undefined) return fallback
    if (isNumber(value) && value >= 0 && value <= max) return value
    errors.push(`${at}: expected a number from 0 to ${max}`)
    return fallback
  }
  const flag = (value: unknown, at: string, fallback: boolean): boolean => {
    if (value === undefined) return fallback
    if (typeof value === 'boolean') return value
    errors.push(`${at}: expected true or false`)
    return fallback
  }
  const color = (value: unknown, at: string, fallback: string): string => {
    if (value === undefined) return fallback
    if (isColor(value)) return value
    errors.push(`${at}: expected a colour (#rrggbb)`)
    return fallback
  }
  const lineCount = (value: unknown): number => {
    if (value === undefined) return base.shores.lines
    if (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 5)
      return value as number
    errors.push('shores.lines: expected a whole number from 0 to 5')
    return base.shores.lines
  }
  const part = (value: unknown, at: string): Record<string, unknown> => {
    if (value === undefined) return {}
    if (isRecord(value)) return value
    errors.push(`${at}: expected its settings by name`)
    return {}
  }

  const grid = part(raw.grid, 'grid')
  unknown(grid, GRID_KEYS, 'grid.', "a style's grid")
  const regions = part(raw.regions, 'regions')
  unknown(regions, REGION_KEYS, 'regions.', "a style's regions")
  const captions = part(raw.captions, 'captions')
  unknown(
    captions,
    [...CAPTION_KINDS],
    'captions.',
    "a style's names (hexNames, regionNames, tokenNames)",
  )

  const ground = part(raw.ground, 'ground')
  unknown(ground, GROUND_KEYS, 'ground.', "a style's ground")
  const art = part(raw.art, 'art')
  unknown(art, ART_KEYS, 'art.', "a style's art")
  const shores = part(raw.shores, 'shores')
  unknown(shores, SHORE_KEYS, 'shores.', "a style's shores")
  const paths = part(raw.paths, 'paths')
  unknown(paths, PATH_KEYS, 'paths.', "a style's paths (wobble, river, road, trail)")
  const floors = part(raw.floors, 'floors')
  unknown(floors, FLOOR_KEYS, 'floors.', "a style's floors")
  const walls = part(raw.walls, 'walls')
  unknown(walls, WALL_KEYS, 'walls.', "a style's walls")
  let outside: WallOutside = base.walls.outside
  if (walls.outside !== undefined) {
    if (WALL_OUTSIDES.includes(walls.outside as WallOutside)) outside = walls.outside as WallOutside
    else errors.push(`walls.outside: expected one of ${WALL_OUTSIDES.join(', ')}`)
  }
  let mode: ArtMode = base.art.mode
  if (art.mode !== undefined) {
    if (ART_MODES.includes(art.mode as ArtMode)) mode = art.mode as ArtMode
    else errors.push(`art.mode: expected one of ${ART_MODES.join(', ')}`)
  }
  const terrainArt: Record<string, TerrainArt> = {}
  for (const [id, value] of Object.entries(part(art.terrains, 'art.terrains'))) {
    const at = `art.terrains.${id}`
    // `forest: conifers` says the painter alone.
    const own = typeof value === 'string' ? { painter: value } : part(value, at)
    unknown(own, TERRAIN_ART_KEYS, `${at}.`, "a terrain's art")
    if (!PAINTERS.includes(own.painter as Painter)) {
      errors.push(`${at}.painter: expected one of ${PAINTERS.join(', ')}`)
      continue
    }
    terrainArt[id] = {
      painter: own.painter as Painter,
      density: fraction(own.density, `${at}.density`, 1, 3),
      size: fraction(own.size, `${at}.size`, 1, 3),
      ...(own.color !== undefined && { color: color(own.color, `${at}.color`, '') }),
    }
  }
  const pathKinds: Partial<Record<StyledPath, PathLook>> = {}
  for (const kind of STYLED_PATHS) {
    if (paths[kind] === undefined) continue
    const own = part(paths[kind], `paths.${kind}`)
    unknown(own, PATH_LOOK_KEYS, `paths.${kind}.`, "a path's look")
    pathKinds[kind] = {
      ...(own.color !== undefined && { color: color(own.color, `paths.${kind}.color`, '') }),
      ...(own.width !== undefined && { width: fraction(own.width, `paths.${kind}.width`, 0.1) }),
    }
  }

  const style: MapStyle = {
    kind: 'style',
    id: typeof raw.id === 'string' ? raw.id : '',
    ...(isText(raw.name) && { name: raw.name }),
    ...(isText(raw.description) && { description: raw.description }),
    grid: {
      color: color(grid.color, 'grid.color', base.grid.color),
      opacity: fraction(grid.opacity, 'grid.opacity', base.grid.opacity),
      coords: flag(grid.coords, 'grid.coords', base.grid.coords),
    },
    glyphs: fraction(raw.glyphs, 'glyphs', base.glyphs),
    captions: Object.fromEntries(
      CAPTION_KINDS.map((kind) => {
        const own = part(captions[kind], `captions.${kind}`)
        const at = `captions.${kind}.`
        unknown(own, CAPTION_KEYS, at, "a kind of name's style")
        const fallback = base.captions[kind]
        let font: LabelFont = fallback.font
        if (own.font !== undefined) {
          if (LABEL_FONTS.includes(own.font as LabelFont)) font = own.font as LabelFont
          else errors.push(`${at}font: expected one of ${LABEL_FONTS.join(', ')}`)
        }
        const textColor =
          own.color === undefined ? fallback.color : color(own.color, `${at}color`, '')
        const caption: CaptionStyle = {
          show: flag(own.show, `${at}show`, fallback.show),
          font,
          size: fraction(own.size, `${at}size`, fallback.size, 4),
          ...(textColor && { color: textColor }),
          italic: flag(own.italic, `${at}italic`, fallback.italic),
          halo: flag(own.halo, `${at}halo`, fallback.halo),
          haloColor: color(own.haloColor, `${at}haloColor`, fallback.haloColor),
        }
        return [kind, caption]
      }),
    ) as Record<CaptionKind, CaptionStyle>,
    regions: {
      fill: fraction(regions.fill, 'regions.fill', base.regions.fill),
      border: fraction(regions.border, 'regions.border', base.regions.border),
      dashed: flag(regions.dashed, 'regions.dashed', base.regions.dashed),
      borderOpacity: fraction(
        regions.borderOpacity,
        'regions.borderOpacity',
        base.regions.borderOpacity,
      ),
    },
    paper: color(raw.paper, 'paper', base.paper),
    ground: {
      wash: fraction(ground.wash, 'ground.wash', base.ground.wash),
      blend: fraction(ground.blend, 'ground.blend', base.ground.blend),
      ragged: fraction(ground.ragged, 'ground.ragged', base.ground.ragged),
      grain: fraction(ground.grain, 'ground.grain', base.ground.grain),
    },
    art: { mode, ink: color(art.ink, 'art.ink', base.art.ink), terrains: terrainArt },
    shores: {
      lines: lineCount(shores.lines),
      color: color(shores.color, 'shores.color', base.shores.color),
      band: fraction(shores.band, 'shores.band', base.shores.band),
    },
    paths: { wobble: fraction(paths.wobble, 'paths.wobble', base.paths.wobble), kinds: pathKinds },
    floors: {
      color: color(floors.color, 'floors.color', base.floors.color),
      wash: fraction(floors.wash, 'floors.wash', base.floors.wash),
      grid: fraction(floors.grid, 'floors.grid', base.floors.grid),
    },
    walls: {
      color: color(walls.color, 'walls.color', base.walls.color),
      width: fraction(walls.width, 'walls.width', base.walls.width, 0.5),
      outside,
      band: fraction(walls.band, 'walls.band', base.walls.band),
    },
  }
  return errors.length ? { errors } : { style, errors }
}

/** The definitions a pack library keeps besides tables (its `extras`), as `mapStyles` reads them. */
interface Extras {
  extras: Map<string, { kind: string; id?: string; data: Record<string, unknown>; file: string }[]>
}

/** A style of the loaded packs, by its full id (`core/schematic`). */
export interface NamedStyle {
  ref: string
  style: MapStyle
}

/** Every loaded pack's styles (`kind: style`), and the problems of the broken ones. */
export function mapStyles(registry: Extras): { styles: NamedStyle[]; problems: Diagnostic[] } {
  const styles: NamedStyle[] = []
  const problems: Diagnostic[] = []
  for (const [pack, extras] of registry.extras)
    for (const extra of extras) {
      if (extra.kind !== 'style') continue
      const id = extra.id ?? 'default'
      const parsed = parseStyle(extra.data)
      for (const error of parsed.errors) {
        const cut = error.indexOf(': ')
        problems.push({
          severity: 'error',
          message: cut > 0 ? error.slice(cut + 2) : error,
          pack,
          file: extra.file,
          at: `@style/${id}${cut > 0 ? `.${error.slice(0, cut)}` : ''}`,
        })
      }
      if (parsed.style) styles.push({ ref: `${pack}/${id}`, style: parsed.style })
    }
  return { styles, problems }
}

/** The style a map is drawn in: its own if loaded, else the Schematic one. */
export function styleOf(map: Pick<HexMap, 'meta'>, styles: readonly NamedStyle[]): MapStyle {
  const ref = map.meta.style ?? DEFAULT_STYLE_REF
  return styles.find((s) => s.ref === ref)?.style ?? SCHEMATIC_STYLE
}

/**
 * A map in another style: the style named in it, and the style's texts, regions, coordinates
 * and glyphs copied into its own settings (which the map changes freely after).
 */
export function applyStyle(map: HexMap, ref: string, style: MapStyle): HexMap {
  return {
    ...map,
    meta: { ...map.meta, style: ref },
    grid: { ...map.grid, showCoords: style.grid.coords, glyphs: style.glyphs },
    captions: structuredClone(style.captions),
    regionStyle: { ...style.regions },
  }
}

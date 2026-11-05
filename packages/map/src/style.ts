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
}

/** The Schematic style: today's look (flat colours and glyphs), and what any style leaves out. */
export const SCHEMATIC_STYLE: MapStyle = {
  kind: 'style',
  id: 'schematic',
  grid: { color: '#000000', opacity: 0.35, coords: true },
  glyphs: DEFAULT_GLYPH_OPACITY,
  captions: structuredClone(DEFAULT_CAPTIONS) as Record<CaptionKind, CaptionStyle>,
  regions: { ...DEFAULT_REGION_STYLE },
}

/** The style a map without one is drawn in: Core's Schematic. */
export const DEFAULT_STYLE_REF = 'core/schematic'

const STYLE_KEYS = ['kind', 'id', 'name', 'description', 'grid', 'glyphs', 'captions', 'regions']
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

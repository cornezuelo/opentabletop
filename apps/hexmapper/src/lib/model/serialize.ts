import type { CharacterState } from '@open-tabletop/character-engine'
import { readWorld } from '@open-tabletop/world-engine'
import { PAPERS, type PaperId } from '../print/paper'
import {
  CAPTION_SIZE_RANGE,
  DEFAULT_CAPTIONS,
  ownStyleOf,
  DEFAULT_GRID,
  DEFAULT_LABEL_STYLE,
  DEFAULT_PRINT,
  defaultLayers,
  LABEL_HALO_RANGE,
  LABEL_SIZE_RANGE,
  MAX_MAP_SIZE,
  MIN_MAP_SIZE,
  DEFAULT_REGION_STYLE,
  REGION_BORDER_RANGE,
  REGION_FILL_RANGE,
} from './defaults'
import { MapFormatError, migrate } from './migrations'
import { isEmptyHex, normalizeHex, normalizePath, cleanFields } from './hex'
import { isValidId, newId } from './id'
import { CAPTION_KINDS, LABEL_FONTS, PATH_KINDS, TOKEN_KINDS } from './types'
import type {
  CustomField,
  HexData,
  HexKey,
  HexMap,
  LabelStyle,
  MapAsset,
  MapLabel,
  CaptionOverride,
  CaptionStyle,
  MapPath,
  MapRegion,
  MapToken,
  Poi,
  PrintSettings,
  RegionStyle,
  TerrainType,
} from './types'

export function serializeMap(map: HexMap): string {
  return JSON.stringify(map)
}

/** Parses, migrates and validates a map. Throws MapFormatError on bad input. */
export function deserializeMap(json: string): HexMap {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new MapFormatError('invalid')
  }
  if (!isRecord(raw)) throw new MapFormatError('invalid')
  return validate(migrate(raw))
}

function validate(data: Record<string, unknown>): HexMap {
  const { meta, grid, terrains, hexes } = data
  if (!isRecord(meta) || !isRecord(grid) || !Array.isArray(terrains) || !isRecord(hexes))
    throw new MapFormatError('invalid')

  const validTerrains: TerrainType[] = terrains
    .filter((t): t is Record<string, unknown> => isRecord(t))
    .filter((t) => typeof t.id === 'string' && typeof t.color === 'string')
    .map((t) => ({
      id: t.id as string,
      color: t.color as string,
      ...(typeof t.name === 'string' ? { name: t.name } : {}),
      ...(t.water === true ? { water: true } : {}),
      ...(typeof t.glyph === 'string' && t.glyph ? { glyph: t.glyph } : {}),
    }))

  const validHexes: Record<HexKey, HexData> = {}
  for (const [key, value] of Object.entries(hexes)) {
    if (!/^\d+,\d+$/.test(key) || !isRecord(value)) continue
    const hex = parseHex(value)
    if (!isEmptyHex(hex)) validHexes[key as HexKey] = hex
  }

  const now = new Date().toISOString()
  return {
    version: data.version as number,
    meta: {
      id: isValidId(meta.id) ? meta.id : newId(),
      name: typeof meta.name === 'string' ? meta.name : '',
      created: typeof meta.created === 'string' ? meta.created : now,
      modified: typeof meta.modified === 'string' ? meta.modified : now,
      ...(typeof meta.system === 'string' &&
        meta.system &&
        meta.system !== 'generic' && { system: meta.system }),
      ...(Array.isArray(meta.packs) && {
        packs: [...new Set(meta.packs.filter((p): p is string => typeof p === 'string' && !!p))],
      }),
    },
    grid: {
      orientation: grid.orientation === 'pointy' ? 'pointy' : 'flat',
      hexSize: positiveNumber(grid.hexSize, DEFAULT_GRID.hexSize),
      width: mapSize(grid.width, DEFAULT_GRID.width),
      height: mapSize(grid.height, DEFAULT_GRID.height),
      coordFormat: grid.coordFormat === 'axial' ? 'axial' : 'CCRR',
      showCoords: typeof grid.showCoords === 'boolean' ? grid.showCoords : true,
      glyphs:
        typeof grid.glyphs === 'number' && Number.isFinite(grid.glyphs)
          ? Math.min(1, Math.max(0, grid.glyphs))
          : DEFAULT_GRID.glyphs,
    },
    // The map's own scale; absent, the system's (or the default).
    scale: (() => {
      const km = isRecord(data.scale) ? data.scale.hexKm : undefined
      return typeof km === 'number' && Number.isFinite(km) && km > 0 ? { hexKm: km } : {}
    })(),
    print: parsePrint(data.print),
    terrains: validTerrains,
    hexes: validHexes,
    paths: parsePaths(data.paths),
    assets: parseAssets(data.assets),
    labels: parseLabels(data.labels),
    tokens: parseTokens(data.tokens),
    regions: parseRegions(data.regions),
    captions: parseCaptions(data.captions),
    regionStyle: { ...DEFAULT_REGION_STYLE, ...parseRegionStyle(data.regionStyle) },
    layers: parseLayers(data.layers),
    ...(isRecord(data.play) && { play: parsePlay(data.play) }),
    ...(isRecord(data.oracle) && { oracle: parseOracle(data.oracle) }),
    ...(isRecord(data.world) && { world: readWorld(data.world) }),
    ...(isRecord(data.foreign) && { foreign: data.foreign as HexMap['foreign'] }),
  }
}

function parseHex(value: Record<string, unknown>): HexData {
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const records = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord) : [])
  const pois: Poi[] = records(value.pois)
    .filter((p) => typeof p.name === 'string')
    .map((p) => ({
      id: str(p.id) ?? newId(),
      name: p.name as string,
      description: str(p.description),
      note: str(p.note),
      icon: str(p.icon),
      fields: parseFields(p.fields),
    }))
  const fields: CustomField[] = parseFields(value.fields) ?? []
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((t): t is string => typeof t === 'string')
    : []
  return normalizeHex({
    terrain: str(value.terrain),
    region: str(value.region),
    name: str(value.name),
    notes: str(value.notes),
    pois,
    tags,
    fields,
    note: str(value.note),
    icon: parseIcon(value.icon),
    ...(value.showName === false && { showName: false }),
    nameStyle: parseCaptionOverride(value.nameStyle, DEFAULT_CAPTIONS.hexNames),
  })
}

function parseIcon(value: unknown): HexData['icon'] {
  if (!isRecord(value) || typeof value.id !== 'string') return undefined
  return {
    id: value.id,
    color: typeof value.color === 'string' ? value.color : undefined,
    scale: typeof value.scale === 'number' ? value.scale : undefined,
    rotation: typeof value.rotation === 'number' ? value.rotation : undefined,
    flip: value.flip === true,
    halo: value.halo === true,
    haloColor: typeof value.haloColor === 'string' ? value.haloColor : undefined,
    haloSize: typeof value.haloSize === 'number' ? value.haloSize : undefined,
    outline: value.outline === true,
    outlineColor: typeof value.outlineColor === 'string' ? value.outlineColor : undefined,
    outlineWidth: typeof value.outlineWidth === 'number' ? value.outlineWidth : undefined,
    offset: parseOffset(value.offset) ?? undefined,
    fields: parseFields(value.fields),
  }
}

/** Key/value fields (hexes, POIs, icons, regions, tokens): strings only, empty rows dropped. */
function parseFields(value: unknown): CustomField[] | undefined {
  const text = (v: unknown) => (typeof v === 'string' ? v : '')
  return cleanFields(
    (Array.isArray(value) ? value.filter(isRecord) : []).map((f) => ({
      key: text(f.key),
      value: text(f.value),
    })),
  )
}

function parsePaths(value: unknown): MapPath[] {
  if (!Array.isArray(value)) return []
  const paths: MapPath[] = []
  for (const p of value.filter(isRecord)) {
    const raw = Array.isArray(p.hexes) ? p.hexes : []
    const rawOffsets = Array.isArray(p.offsets) ? p.offsets : []
    const hexes: HexKey[] = []
    const offsets: ([number, number] | null)[] = []
    raw.forEach((k, i) => {
      if (typeof k !== 'string' || !/^\d+,\d+$/.test(k)) return
      hexes.push(k as HexKey)
      offsets.push(parseOffset(rawOffsets[i]))
    })
    if (hexes.length < 2) continue
    paths.push(
      normalizePath({
        id: isValidId(p.id) ? p.id : newId(),
        kind: PATH_KINDS.includes(p.kind as MapPath['kind']) ? (p.kind as MapPath['kind']) : 'road',
        hexes,
        offsets,
        nodes: parseNodes(p.nodes, raw, hexes.length),
        straight: p.straight === true,
        closed: p.closed === true,
      }),
    )
  }
  return paths
}

/**
 * Node indices refer to the raw hex list; invalid hexes were dropped while parsing, so
 * remap to the kept ones. Returns undefined (every hex is a vertex) when absent.
 */
function parseNodes(value: unknown, raw: unknown[], kept: number): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const remap: number[] = []
  let j = 0
  raw.forEach((k) => {
    remap.push(typeof k === 'string' && /^\d+,\d+$/.test(k) ? j++ : -1)
  })
  const nodes = value
    .filter((i): i is number => Number.isInteger(i) && i >= 0 && i < raw.length)
    .map((i) => remap[i])
    .filter((i) => i >= 0 && i < kept)
  return [...new Set(nodes)].sort((a, b) => a - b)
}

function parseOffset(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const [x, y] = value
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x + y)) return null
  // Offsets are relative to the hex size; anything beyond the hex is bogus.
  return Math.hypot(x, y) <= 1 ? [x, y] : null
}

const DATA_URL = /^data:image\/(png|svg\+xml|jpeg|webp);base64,[a-z0-9+/=]+$/i

function parseAssets(value: unknown): MapAsset[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .filter((a) => isValidId(a.id) && typeof a.dataUrl === 'string' && DATA_URL.test(a.dataUrl))
    .map((a) => ({
      id: a.id as string,
      name: typeof a.name === 'string' ? a.name : '',
      dataUrl: a.dataUrl as string,
    }))
}

function parseLabels(value: unknown): MapLabel[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .filter((l) => typeof l.text === 'string' && Number.isFinite(l.x) && Number.isFinite(l.y))
    .map((l) => ({
      id: isValidId(l.id) ? l.id : newId(),
      text: l.text as string,
      x: l.x as number,
      y: l.y as number,
      style: parseLabelStyle(l.style),
    }))
}

export function parseLabelStyle(value: unknown): LabelStyle {
  const s = isRecord(value) ? value : {}
  const d = DEFAULT_LABEL_STYLE
  const size = typeof s.size === 'number' && Number.isFinite(s.size) ? s.size : d.size
  return {
    font: LABEL_FONTS.includes(s.font as LabelStyle['font'])
      ? (s.font as LabelStyle['font'])
      : d.font,
    size: Math.min(LABEL_SIZE_RANGE[1], Math.max(LABEL_SIZE_RANGE[0], size)),
    color: typeof s.color === 'string' && /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : d.color,
    rotation: typeof s.rotation === 'number' && Number.isFinite(s.rotation) ? s.rotation : 0,
    italic: s.italic === true,
    halo: s.halo !== false,
    haloColor:
      typeof s.haloColor === 'string' && /^#[0-9a-f]{6}$/i.test(s.haloColor)
        ? s.haloColor
        : d.haloColor,
    haloWidth:
      typeof s.haloWidth === 'number' && Number.isFinite(s.haloWidth)
        ? Math.min(LABEL_HALO_RANGE[1], Math.max(LABEL_HALO_RANGE[0], s.haloWidth))
        : d.haloWidth,
  }
}

const HEX_KEY = /^\d+,\d+$/

const COLOR = /^#[0-9a-f]{6}$/i

/** An element's own text style; anything invalid falls back to the kind's style. */
export function parseCaptionOverride(
  value: unknown,
  fallback: CaptionStyle,
): CaptionOverride | undefined {
  if (!isRecord(value)) return undefined
  return ownStyleOf(parseCaptionStyle(value, fallback))
}

function parseCaptionStyle(c: Record<string, unknown>, d: CaptionStyle): CaptionStyle {
  return {
    show: typeof c.show === 'boolean' ? c.show : d.show,
    font: LABEL_FONTS.includes(c.font as LabelStyle['font'])
      ? (c.font as LabelStyle['font'])
      : d.font,
    size:
      typeof c.size === 'number' && Number.isFinite(c.size)
        ? Math.min(CAPTION_SIZE_RANGE[1], Math.max(CAPTION_SIZE_RANGE[0], c.size))
        : d.size,
    ...(typeof c.color === 'string' && COLOR.test(c.color) && { color: c.color }),
    italic: typeof c.italic === 'boolean' ? c.italic : d.italic,
    halo: typeof c.halo === 'boolean' ? c.halo : d.halo,
    haloColor:
      typeof c.haloColor === 'string' && COLOR.test(c.haloColor) ? c.haloColor : d.haloColor,
  }
}

function parseCaptions(value: unknown): HexMap['captions'] {
  const raw = isRecord(value) ? value : {}
  const out = structuredClone(DEFAULT_CAPTIONS) as HexMap['captions']
  for (const kind of CAPTION_KINDS)
    out[kind] = parseCaptionStyle(isRecord(raw[kind]) ? raw[kind] : {}, out[kind])
  return out
}

function parseRegions(value: unknown): MapRegion[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.flatMap((r): MapRegion[] => {
    if (!isRecord(r) || !isValidId(r.id) || seen.has(r.id)) return []
    seen.add(r.id)
    return [
      {
        id: r.id,
        name: typeof r.name === 'string' ? r.name : '',
        color: typeof r.color === 'string' && COLOR.test(r.color) ? r.color : '#8b1e1e',
        ...(r.showName === false && { showName: false }),
        ...(isRecord(r.nameStyle) && {
          nameStyle: parseCaptionOverride(r.nameStyle, DEFAULT_CAPTIONS.regionNames),
        }),
        ...(typeof r.note === 'string' && r.note && { note: r.note }),
        ...(parseFields(r.fields) && { fields: parseFields(r.fields) }),
        ...(Object.keys(parseRegionStyle(r.style)).length && { style: parseRegionStyle(r.style) }),
      },
    ]
  })
}

/** The valid parts of a region style (clamped); missing or broken ones are left out. */
function parseRegionStyle(value: unknown): Partial<RegionStyle> {
  if (!isRecord(value)) return {}
  const num = (v: unknown, [min, max]: readonly [number, number]) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined
  const fill = num(value.fill, REGION_FILL_RANGE)
  const border = num(value.border, REGION_BORDER_RANGE)
  const borderOpacity = num(value.borderOpacity, [0, 1])
  return {
    ...(fill !== undefined && { fill }),
    ...(border !== undefined && { border }),
    ...(typeof value.dashed === 'boolean' && { dashed: value.dashed }),
    ...(borderOpacity !== undefined && { borderOpacity }),
  }
}

function parseTokens(value: unknown): MapToken[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const tokens: MapToken[] = []
  for (const t of value) {
    if (!isRecord(t)) continue
    // Nothing refers to tokens by id: a malformed or repeated one gets a new id, not dropped.
    const id = isValidId(t.id) && !seen.has(t.id) ? t.id : newId()
    seen.add(id)
    const kind = (TOKEN_KINDS as readonly unknown[]).includes(t.kind)
      ? (t.kind as MapToken['kind'])
      : 'npc'
    tokens.push({
      id,
      name: typeof t.name === 'string' ? t.name : '',
      kind,
      ...(typeof t.hex === 'string' && HEX_KEY.test(t.hex) && { hex: t.hex as HexKey }),
      iconId: typeof t.iconId === 'string' ? t.iconId : 'game:meeple',
      ...(typeof t.color === 'string' && COLOR.test(t.color) && { color: t.color }),
      ...(t.halo === false && { halo: false }),
      ...(t.showName === true && { showName: true }),
      ...(isRecord(t.nameStyle) && {
        nameStyle: parseCaptionOverride(t.nameStyle, DEFAULT_CAPTIONS.tokenNames),
      }),
      ...(typeof t.note === 'string' && t.note && { note: t.note }),
      ...(parseFields(t.fields) && { fields: parseFields(t.fields) }),
      // The character engine's own (re-read by it when used).
      ...(isRecord(t.character) &&
        typeof t.character.sheet === 'string' && {
          character: t.character as unknown as MapToken['character'],
        }),
    })
  }
  // One party at most: extra ones become player characters.
  let party = false
  for (const token of tokens)
    if (token.kind === 'party') {
      if (party) token.kind = 'pc'
      party = true
    }
  return tokens
}

function parsePlay(p: Record<string, unknown>): NonNullable<HexMap['play']> {
  const rules = isRecord(p.rules) ? p.rules : undefined
  return {
    mode: p.mode === 'rules' ? 'rules' : 'simple',
    trail: (Array.isArray(p.trail) ? p.trail : []).filter(
      (k): k is HexKey => typeof k === 'string' && HEX_KEY.test(k),
    ),
    showTrail: p.showTrail !== false,
    ...(p.straightTrail === true && { straightTrail: true }),
    ...(p.showRelations === false && { showRelations: false as const }),
    ...(isRecord(p.discover) && {
      discover: {
        on: p.discover.on === true,
        ...((p.discover.reveal === 'neighbors' || p.discover.reveal === 'entered') && {
          reveal: p.discover.reveal,
        }),
      },
    }),
    ...(rules &&
      typeof rules.system === 'string' && {
        rules: {
          system: rules.system,
          startDay: typeof rules.startDay === 'number' ? rules.startDay : 1,
          // The session belongs to the engines; it is re-validated when play resumes.
          // None yet: the system is chosen but the trip hasn't started.
          session: isRecord(rules.session) ? rules.session : null,
          // The company waiting for a trip (the character engine's, as the session is).
          ...(Array.isArray(rules.members) &&
            rules.members.length && { members: rules.members as CharacterState[] }),
        },
      }),
  }
}

function parseLayers(value: unknown): HexMap['layers'] {
  const layers = defaultLayers()
  if (!isRecord(value)) return layers
  for (const id of Object.keys(layers) as (keyof typeof layers)[]) {
    const raw = value[id]
    if (!isRecord(raw)) continue
    layers[id] = { visible: raw.visible !== false, locked: raw.locked === true }
  }
  return layers
}

function parsePrint(value: unknown): PrintSettings {
  const p = isRecord(value) ? value : {}
  const custom = isRecord(p.customPaper) ? p.customPaper : {}
  const paper = p.paper === 'custom' || (typeof p.paper === 'string' && p.paper in PAPERS)
  return {
    hexMm: positiveNumber(p.hexMm, DEFAULT_PRINT.hexMm),
    paper: paper ? (p.paper as PaperId) : null,
    landscape: p.landscape === true,
    marginMm:
      typeof p.marginMm === 'number' && p.marginMm >= 0 ? p.marginMm : DEFAULT_PRINT.marginMm,
    customPaper: {
      width: positiveNumber(custom.width, DEFAULT_PRINT.customPaper.width),
      height: positiveNumber(custom.height, DEFAULT_PRINT.customPaper.height),
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

function mapSize(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return fallback
  return Math.min(MAX_MAP_SIZE, Math.max(MIN_MAP_SIZE, value))
}

/** The engine re-validates its state on use; here only the shape is checked. */
function parseOracle(o: Record<string, unknown>): NonNullable<HexMap['oracle']> {
  const state = isRecord(o.state) ? o.state : {}
  return {
    state: {
      decks: isRecord(state.decks) ? state.decks : {},
      occurrences: isRecord(state.occurrences) ? state.occurrences : {},
      vars: isRecord(state.vars) ? state.vars : {},
    } as NonNullable<HexMap['oracle']>['state'],
    history: Array.isArray(o.history)
      ? (o.history.filter(isRecord) as unknown as NonNullable<HexMap['oracle']>['history'])
      : [],
  }
}

import { PAPERS, type PaperId } from '../print/paper'
import {
  DEFAULT_HEX_KM,
  DEFAULT_GRID,
  DEFAULT_LABEL_STYLE,
  DEFAULT_PRINT,
  defaultLayers,
  LABEL_HALO_RANGE,
  LABEL_SIZE_RANGE,
  MAX_MAP_SIZE,
  MIN_MAP_SIZE,
} from './defaults'
import { MapFormatError, migrate } from './migrations'
import { isEmptyHex, normalizeHex, normalizePath } from './hex'
import { isValidId, newId } from './id'
import { LABEL_FONTS, PATH_KINDS } from './types'
import type {
  CustomField,
  HexData,
  HexKey,
  HexMap,
  LabelStyle,
  MapAsset,
  MapLabel,
  MapPath,
  Poi,
  PrintSettings,
  TerrainType,
} from './types'

/** Extension of the pre-OTD format, still importable. */
export const FILE_EXTENSION = '.hexmap.json'

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
    },
    grid: {
      orientation: grid.orientation === 'pointy' ? 'pointy' : 'flat',
      hexSize: positiveNumber(grid.hexSize, DEFAULT_GRID.hexSize),
      width: mapSize(grid.width, DEFAULT_GRID.width),
      height: mapSize(grid.height, DEFAULT_GRID.height),
      coordFormat: grid.coordFormat === 'axial' ? 'axial' : 'CCRR',
      showCoords: typeof grid.showCoords === 'boolean' ? grid.showCoords : true,
    },
    scale: {
      hexKm: positiveNumber(isRecord(data.scale) ? data.scale.hexKm : undefined, DEFAULT_HEX_KM),
    },
    print: parsePrint(data.print),
    terrains: validTerrains,
    hexes: validHexes,
    paths: parsePaths(data.paths),
    assets: parseAssets(data.assets),
    labels: parseLabels(data.labels),
    layers: parseLayers(data.layers),
    ...(isRecord(data.play) && { play: parsePlay(data.play) }),
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
    }))
  const fields: CustomField[] = records(value.fields).map((f) => ({
    key: str(f.key) ?? '',
    value: str(f.value) ?? '',
  }))
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((t): t is string => typeof t === 'string')
    : []
  return normalizeHex({
    terrain: str(value.terrain),
    name: str(value.name),
    notes: str(value.notes),
    pois,
    tags,
    fields,
    note: str(value.note),
    icon: parseIcon(value.icon),
  })
}

function parseIcon(value: unknown): HexData['icon'] {
  // Older drafts stored just the id.
  if (typeof value === 'string') return { id: value }
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
  }
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

function parsePlay(p: Record<string, unknown>): NonNullable<HexMap['play']> {
  const token = isRecord(p.token) ? p.token : {}
  const rules = isRecord(p.rules) ? p.rules : undefined
  return {
    mode: p.mode === 'rules' ? 'rules' : 'simple',
    token: {
      iconId: typeof token.iconId === 'string' ? token.iconId : 'game:meeple',
      ...(typeof token.color === 'string' &&
        /^#[0-9a-f]{6}$/i.test(token.color) && { color: token.color }),
    },
    ...(typeof p.location === 'string' &&
      HEX_KEY.test(p.location) && { location: p.location as HexKey }),
    trail: (Array.isArray(p.trail) ? p.trail : []).filter(
      (k): k is HexKey => typeof k === 'string' && HEX_KEY.test(k),
    ),
    showTrail: p.showTrail !== false,
    ...(rules &&
      typeof rules.system === 'string' &&
      isRecord(rules.session) && {
        rules: {
          system: rules.system,
          startDay: typeof rules.startDay === 'number' ? rules.startDay : 1,
          // The session belongs to the engines; it is re-validated when play resumes.
          session: rules.session,
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

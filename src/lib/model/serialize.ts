import { PAPERS, type PaperId } from '../print/paper'
import { DEFAULT_GRID, DEFAULT_PRINT, MAX_MAP_SIZE, MIN_MAP_SIZE } from './defaults'
import { MapFormatError, migrate } from './migrations'
import { isEmptyHex, normalizeHex } from './hex'
import { isValidId, newId } from './id'
import type { CustomField, HexData, HexKey, HexMap, Poi, PrintSettings, TerrainType } from './types'

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
    print: parsePrint(data.print),
    terrains: validTerrains,
    hexes: validHexes,
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
  })
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

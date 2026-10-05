import { DEFAULT_GRID, MAX_MAP_SIZE, MIN_MAP_SIZE } from './defaults'
import { MapFormatError, migrate } from './migrations'
import type { HexData, HexKey, HexMap, TerrainType } from './types'

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
    const hex: HexData = {}
    if (typeof value.terrain === 'string') hex.terrain = value.terrain
    validHexes[key as HexKey] = hex
  }

  const now = new Date().toISOString()
  return {
    version: data.version as number,
    meta: {
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
    terrains: validTerrains,
    hexes: validHexes,
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

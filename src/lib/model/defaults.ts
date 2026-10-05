import type { GridSettings, HexMap, TerrainType } from './types'

export const CURRENT_VERSION = 1

export const MIN_MAP_SIZE = 1
export const MAX_MAP_SIZE = 200

/** Default palette, tuned for the Kal-Arath steppe. Names come from i18n (`terrains.<id>`). */
export const DEFAULT_TERRAINS: readonly TerrainType[] = [
  { id: 'steppe', color: '#c9b977' },
  { id: 'plains', color: '#a8c070' },
  { id: 'forest', color: '#4f7a3a' },
  { id: 'hills', color: '#a08a5a' },
  { id: 'mountains', color: '#7d7468' },
  { id: 'badlands', color: '#b5734a' },
  { id: 'desert', color: '#e2cd8f' },
  { id: 'swamp', color: '#5f6e4a' },
  { id: 'lake', color: '#5b8fb0' },
  { id: 'sea', color: '#36668a' },
  { id: 'snow', color: '#e6ecef' },
]

export const DEFAULT_GRID: GridSettings = {
  orientation: 'flat',
  hexSize: 40,
  width: 30,
  height: 20,
  coordFormat: 'CCRR',
  showCoords: true,
}

export function createMap(name = ''): HexMap {
  const now = new Date().toISOString()
  return {
    version: CURRENT_VERSION,
    meta: { name, created: now, modified: now },
    grid: { ...DEFAULT_GRID },
    terrains: DEFAULT_TERRAINS.map((t) => ({ ...t })),
    hexes: {},
  }
}

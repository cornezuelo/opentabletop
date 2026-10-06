import { newId } from './id'
import { LAYER_IDS, type LayerId, type LayerState } from './types'
import type { GridSettings, HexMap, LabelStyle, PrintSettings, TerrainType } from './types'

export const CURRENT_VERSION = 3

export const MIN_MAP_SIZE = 1
export const MAX_MAP_SIZE = 200

/** Glyph of each built-in terrain id (also given to old maps by the v3 migration). */
export const DEFAULT_GLYPHS: Readonly<Record<string, string>> = {
  steppe: 'game:high-grass',
  plains: 'game:grass',
  farmland: 'game:wheat',
  forest: 'game:pine-tree',
  jungle: 'game:palm-tree',
  taiga: 'game:pine-tree',
  hills: 'game:hills',
  mountains: 'game:mountains',
  badlands: 'game:falling-rocks',
  desert: 'game:desert',
  swamp: 'game:reed',
  tundra: 'game:snowing',
  snow: 'game:snowflake-1',
  volcanic: 'game:volcano',
  lake: 'game:waves',
  sea: 'game:wave-crest',
}

/** Default palette (biomes), first tuned for the Kal-Arath steppe. Names come from i18n (`terrains.<id>`). */
export const DEFAULT_TERRAINS: readonly TerrainType[] = (
  [
    { id: 'steppe', color: '#c9b977' },
    { id: 'plains', color: '#a8c070' },
    { id: 'farmland', color: '#d6c56a' },
    { id: 'forest', color: '#4f7a3a' },
    { id: 'jungle', color: '#2f6b3f' },
    { id: 'taiga', color: '#3f5f4a' },
    { id: 'hills', color: '#a08a5a' },
    { id: 'mountains', color: '#7d7468' },
    { id: 'badlands', color: '#b5734a' },
    { id: 'desert', color: '#e2cd8f' },
    { id: 'swamp', color: '#5f6e4a' },
    { id: 'tundra', color: '#b9c3b4' },
    { id: 'snow', color: '#e6ecef' },
    { id: 'volcanic', color: '#4a3b38' },
    { id: 'lake', color: '#5b8fb0', water: true },
    { id: 'sea', color: '#36668a', water: true },
  ] as TerrainType[]
).map((t) => ({ ...t, glyph: DEFAULT_GLYPHS[t.id] }))

export const DEFAULT_GLYPH_OPACITY = 0.45

export const DEFAULT_GRID: GridSettings = {
  orientation: 'flat',
  hexSize: 40,
  width: 30,
  height: 20,
  coordFormat: 'CCRR',
  showCoords: true,
  glyphs: 0.45,
}

/** A common hexcrawl scale (6 miles ≈ 10 km). Kal-Arath uses 30 km. */
export const DEFAULT_HEX_KM = 10

export const DEFAULT_PRINT: PrintSettings = {
  hexMm: 25,
  paper: null,
  landscape: false,
  marginMm: 10,
  customPaper: { width: 500, height: 700 },
}

export const DEFAULT_LABEL_STYLE: LabelStyle = {
  font: 'fell',
  size: 0.6,
  color: '#2b2118',
  rotation: 0,
  italic: false,
  halo: true,
  haloColor: '#f4eedd',
  haloWidth: 0.18,
}

export const LABEL_SIZE_RANGE = [0.2, 4] as const
export const LABEL_HALO_RANGE = [0.05, 0.4] as const

export function defaultLayers(): Record<LayerId, LayerState> {
  return Object.fromEntries(
    LAYER_IDS.map((id) => [id, { visible: true, locked: false }]),
  ) as Record<LayerId, LayerState>
}

export function createMap(name = ''): HexMap {
  const now = new Date().toISOString()
  return {
    version: CURRENT_VERSION,
    meta: { id: newId(), name, created: now, modified: now },
    grid: { ...DEFAULT_GRID },
    scale: { hexKm: DEFAULT_HEX_KM },
    print: structuredClone(DEFAULT_PRINT),
    terrains: DEFAULT_TERRAINS.map((t) => ({ ...t })),
    hexes: {},
    paths: [],
    assets: [],
    labels: [],
    tokens: [],
    layers: defaultLayers(),
  }
}

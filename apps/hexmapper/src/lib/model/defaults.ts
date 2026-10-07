import { newId } from './id'
import { LAYER_IDS, type LayerId, type LayerState } from './types'
import type {
  CaptionKind,
  CaptionOverride,
  CaptionStyle,
  GridSettings,
  HexMap,
  LabelStyle,
  PrintSettings,
  TerrainType,
} from './types'

export const CURRENT_VERSION = 7

export const MIN_MAP_SIZE = 1
export const MAX_MAP_SIZE = 200

/** Glyph of each built-in terrain id (also given to old maps by the v3 migration). */
export const DEFAULT_GLYPHS: Readonly<Record<string, string>> = {
  steppe: 'game:high-grass',
  plains: 'game:grass',
  farmland: 'game:wheat',
  heath: 'game:flowers',
  savanna: 'game:oak',
  forest: 'game:pine-tree',
  'dense-forest': 'game:forest',
  jungle: 'game:palm-tree',
  taiga: 'game:pine-tree',
  swamp: 'game:reed',
  marsh: 'game:lotus-flower',
  hills: 'game:hills',
  mountains: 'game:mountains',
  peaks: 'game:peaks',
  volcanic: 'game:volcano',
  desert: 'game:desert',
  badlands: 'game:falling-rocks',
  canyon: 'game:cliff-crossing',
  oasis: 'game:oasis',
  tundra: 'game:snowing',
  snow: 'game:snowflake-1',
  glacier: 'game:iceberg',
  coast: 'game:seagull',
  lake: 'game:waves',
  sea: 'game:wave-crest',
  'deep-sea': 'game:big-wave',
}

/** Default palette (biomes), first tuned for the Kal-Arath steppe. Names come from i18n (`terrains.<id>`). */
export const DEFAULT_TERRAINS: readonly TerrainType[] = (
  [
    { id: 'steppe', color: '#c9b977' },
    { id: 'plains', color: '#a8c070' },
    { id: 'farmland', color: '#d6c56a' },
    { id: 'heath', color: '#8e7d8a' },
    { id: 'savanna', color: '#c4b25c' },
    { id: 'forest', color: '#4f7a3a' },
    { id: 'dense-forest', color: '#2f5530' },
    { id: 'jungle', color: '#2f6b3f' },
    { id: 'taiga', color: '#3f5f4a' },
    { id: 'swamp', color: '#5f6e4a' },
    { id: 'marsh', color: '#738a5c' },
    { id: 'hills', color: '#a08a5a' },
    { id: 'mountains', color: '#7d7468' },
    { id: 'peaks', color: '#b9b3ab' },
    { id: 'volcanic', color: '#4a3b38' },
    { id: 'desert', color: '#e2cd8f' },
    { id: 'badlands', color: '#b5734a' },
    { id: 'canyon', color: '#a65b3c' },
    { id: 'oasis', color: '#7fae6a' },
    { id: 'tundra', color: '#b9c3b4' },
    { id: 'snow', color: '#e6ecef' },
    { id: 'glacier', color: '#cfe4ec' },
    { id: 'coast', color: '#dccb9c' },
    { id: 'lake', color: '#5b8fb0', water: true },
    { id: 'sea', color: '#36668a', water: true },
    { id: 'deep-sea', color: '#244a6b', water: true },
  ] as TerrainType[]
).map((t) => ({ ...t, glyph: DEFAULT_GLYPHS[t.id] }))

/**
 * Terrains for other kinds of game, added from Edit palette (a map keeps the palette it
 * was made with). Names come from i18n (`terrains.<id>`), like the default ones.
 */
export const TERRAIN_SETS = {
  natural: DEFAULT_TERRAINS,
  modern: [
    { id: 'city', color: '#8d8a86', glyph: 'game:modern-city' },
    { id: 'suburbs', color: '#b8ae9c', glyph: 'game:house' },
    { id: 'industrial', color: '#6e6a64', glyph: 'game:factory' },
  ],
  wasteland: [
    { id: 'ruins', color: '#7b7068', glyph: 'game:broken-wall' },
    { id: 'wasteland', color: '#a69675', glyph: 'game:barbed-wire' },
    { id: 'irradiated', color: '#8f9d45', glyph: 'game:radioactive' },
    { id: 'toxic-swamp', color: '#5c6a30', glyph: 'game:biohazard' },
    { id: 'crater', color: '#6a5d55', glyph: 'game:meteor-impact' },
  ],
  scifi: [
    { id: 'alien-jungle', color: '#3c7c6d', glyph: 'game:alien-bug' },
    { id: 'crystal-field', color: '#9db6d8', glyph: 'game:crystal-growth' },
    { id: 'lava-field', color: '#8a3424', glyph: 'game:lava' },
    { id: 'regolith', color: '#9b978f', glyph: 'game:moon' },
    { id: 'space', color: '#121729', glyph: 'game:ringed-planet' },
    { id: 'nebula', color: '#3d2c5e', glyph: 'game:vortex' },
    { id: 'asteroid-field', color: '#4c4b54', glyph: 'game:asteroid' },
  ],
} as const satisfies Record<string, readonly TerrainType[]>
export type TerrainSet = keyof typeof TERRAIN_SETS

export const TERRAIN_GROUPS = [
  'lowlands',
  'forests',
  'wetlands',
  'highlands',
  'arid',
  'cold',
  'water',
  'urban',
  'wasteland',
  'alien',
  'space',
  'other',
] as const
export type TerrainGroup = (typeof TERRAIN_GROUPS)[number]

/** Palette groups of the default terrains (only for display); others go to "other". */
const GROUP_OF: Readonly<Record<string, TerrainGroup>> = {
  steppe: 'lowlands',
  plains: 'lowlands',
  farmland: 'lowlands',
  heath: 'lowlands',
  savanna: 'lowlands',
  forest: 'forests',
  'dense-forest': 'forests',
  jungle: 'forests',
  taiga: 'forests',
  swamp: 'wetlands',
  marsh: 'wetlands',
  hills: 'highlands',
  mountains: 'highlands',
  peaks: 'highlands',
  volcanic: 'highlands',
  desert: 'arid',
  badlands: 'arid',
  canyon: 'arid',
  oasis: 'arid',
  tundra: 'cold',
  snow: 'cold',
  glacier: 'cold',
  coast: 'water',
  lake: 'water',
  sea: 'water',
  'deep-sea': 'water',
  city: 'urban',
  suburbs: 'urban',
  industrial: 'urban',
  ruins: 'wasteland',
  wasteland: 'wasteland',
  irradiated: 'wasteland',
  'toxic-swamp': 'wasteland',
  crater: 'wasteland',
  'alien-jungle': 'alien',
  'crystal-field': 'alien',
  'lava-field': 'alien',
  regolith: 'alien',
  space: 'space',
  nebula: 'space',
  'asteroid-field': 'space',
}

export function terrainGroup(terrain: TerrainType): TerrainGroup {
  return GROUP_OF[terrain.id] ?? (terrain.water ? 'water' : 'other')
}

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

export const DEFAULT_CAPTIONS: Readonly<Record<CaptionKind, CaptionStyle>> = {
  hexNames: { show: true, font: 'fell', size: 1, italic: false, halo: true, haloColor: '#f4eedd' },
  regionNames: {
    show: true,
    font: 'fell',
    size: 1,
    italic: true,
    halo: true,
    haloColor: '#f4eedd',
  },
  tokenNames: {
    show: true,
    font: 'fell',
    size: 1,
    italic: false,
    halo: true,
    haloColor: '#f4eedd',
  },
}
export const CAPTION_SIZE_RANGE = [0.5, 2.5] as const

/** A kind's style as an element's own style (everything but `show`). */
export const ownStyleOf = ({
  font,
  size,
  color,
  italic,
  halo,
  haloColor,
}: CaptionStyle): CaptionOverride => ({
  font,
  size,
  ...(color && { color }),
  italic,
  halo,
  haloColor,
})

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
    regions: [],
    captions: structuredClone(DEFAULT_CAPTIONS) as HexMap['captions'],
    layers: defaultLayers(),
  }
}

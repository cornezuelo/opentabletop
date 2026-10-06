import {
  isBundle,
  OTD_VERSION,
  validateBundle,
  type OtdBundle,
  type OtdHex,
  type OtdMap,
  type OtdPoi,
} from '@open-tabletop/schema'
import { MapFormatError } from '../model/migrations'
import { deserializeMap } from '../model/serialize'
import type { HexIcon, HexKey, HexMap, Poi } from '../model/types'

/** What the hexmapper keeps in `map.ext.hexmapper`: rendering, printing and editor-only data. */
interface HexmapperExt {
  version: number
  created: string
  modified: string
  hexSize: number
  showCoords: boolean
  print: HexMap['print']
  layers: HexMap['layers']
  labels: HexMap['labels']
  assets: HexMap['assets']
  icons: Record<string, HexIcon>
}

const BUNDLE_KEYS = ['otd', 'maps', 'pois'] as const

/** Converts the editor model into an OTD bundle (data other tools understand). */
export function mapToBundle(map: HexMap): OtdBundle {
  const foreign = map.foreign ?? {}
  const icons: Record<string, HexIcon> = {}
  const hexes: Record<string, OtdHex> = {}
  const pois: OtdPoi[] = []
  for (const [key, hex] of Object.entries(map.hexes) as [HexKey, HexMap['hexes'][HexKey]][]) {
    if (hex.icon) icons[key] = hex.icon
    const out: OtdHex = {}
    if (hex.terrain) out.terrain = hex.terrain
    if (hex.name) out.name = hex.name
    if (hex.notes) out.notes = hex.notes
    if (hex.note) out.noteRef = hex.note
    if (hex.tags?.length) out.tags = hex.tags
    if (hex.fields?.length) out.stats = hex.fields
    if (Object.keys(out).length) hexes[key] = out
    for (const poi of hex.pois ?? [])
      pois.push({
        id: poi.id,
        type: 'poi',
        name: poi.name,
        location: { map: map.meta.id, hex: key },
        ...(poi.description && { description: poi.description }),
        ...(poi.note && { noteRef: poi.note }),
      })
  }
  const ext: HexmapperExt = {
    version: map.version,
    created: map.meta.created,
    modified: map.meta.modified,
    hexSize: map.grid.hexSize,
    showCoords: map.grid.showCoords,
    print: map.print,
    layers: map.layers,
    labels: map.labels,
    assets: map.assets,
    icons,
  }
  const otdMap: OtdMap = {
    id: map.meta.id,
    type: 'map',
    name: map.meta.name,
    grid: {
      orientation: map.grid.orientation,
      width: map.grid.width,
      height: map.grid.height,
      coordFormat: map.grid.coordFormat,
    },
    scale: { hexKm: map.scale.hexKm },
    terrains: map.terrains.map((t) => ({ ...t })),
    hexes,
    paths: map.paths.map((p) => ({ ...p })),
    ext: { ...foreign.mapExt, hexmapper: ext },
  }
  const extra = foreign.bundle ?? {}
  const otherMaps = Array.isArray(extra.maps) ? (extra.maps as OtdMap[]) : []
  const otherPois = Array.isArray(extra.pois) ? (extra.pois as OtdPoi[]) : []
  return {
    parties: [],
    characters: [],
    factions: [],
    clocks: [],
    log: [],
    state: {},
    ...extra,
    otd: OTD_VERSION,
    maps: [otdMap, ...otherMaps],
    pois: [...pois, ...otherPois],
  } as OtdBundle
}

/**
 * Reads the first map of an OTD bundle into the editor model. Everything else in the
 * bundle (other maps, parties, log, other tools' ext data) is kept in `map.foreign`.
 */
export function bundleToMap(raw: unknown): HexMap {
  const { bundle, errors } = validateBundle(raw)
  if (!bundle) {
    if (errors.some((e) => e.includes('newer'))) throw new MapFormatError('newerVersion')
    throw new MapFormatError('invalid')
  }
  const [otdMap, ...otherMaps] = bundle.maps
  if (!otdMap) throw new MapFormatError('invalid')
  const { hexmapper, ...otherExt } = (otdMap.ext ?? {}) as { hexmapper?: Partial<HexmapperExt> }
  const ext = hexmapper ?? {}
  const pois = bundle.pois.filter((p) => p.location.map === otdMap.id)
  const otherPois = bundle.pois.filter((p) => p.location.map !== otdMap.id)

  const hexes: Record<string, Record<string, unknown>> = {}
  for (const [key, hex] of Object.entries(otdMap.hexes))
    hexes[key] = {
      terrain: hex.terrain,
      name: hex.name,
      notes: hex.notes,
      note: hex.noteRef,
      tags: hex.tags,
      fields: hex.stats,
    }
  for (const [key, icon] of Object.entries(ext.icons ?? {})) hexes[key] = { ...hexes[key], icon }
  for (const poi of pois) {
    const entry: Poi = {
      id: poi.id,
      name: poi.name ?? '',
      description: poi.description,
      note: poi.noteRef,
    }
    const hex = (hexes[poi.location.hex] ??= {})
    hex.pois = [...((hex.pois as Poi[]) ?? []), entry]
  }

  const extraBundle: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(bundle))
    if (!(BUNDLE_KEYS as readonly string[]).includes(key)) extraBundle[key] = value
  if (otherMaps.length) extraBundle.maps = otherMaps
  if (otherPois.length) extraBundle.pois = otherPois

  const internal = {
    version: ext.version ?? 1,
    meta: {
      id: otdMap.id,
      name: otdMap.name ?? '',
      created: ext.created,
      modified: ext.modified,
    },
    grid: {
      orientation: otdMap.grid.orientation,
      width: otdMap.grid.width,
      height: otdMap.grid.height,
      coordFormat: otdMap.grid.coordFormat,
      hexSize: ext.hexSize,
      showCoords: ext.showCoords,
    },
    scale: otdMap.scale,
    print: ext.print,
    terrains: otdMap.terrains,
    hexes,
    paths: otdMap.paths ?? [],
    assets: ext.assets ?? [],
    labels: ext.labels ?? [],
    layers: ext.layers,
    foreign: {
      ...(Object.keys(extraBundle).length && { bundle: extraBundle }),
      ...(Object.keys(otherExt).length && { mapExt: otherExt }),
    },
  }
  // Reuse the editor's own sanitizing so imported data obeys the same rules.
  return deserializeMap(JSON.stringify(internal))
}

/** Parses a saved file: OTD bundles (.otd.json) or the legacy hexmapper format. */
export function parseMapFile(json: string): HexMap {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new MapFormatError('invalid')
  }
  return isBundle(raw) ? bundleToMap(raw) : deserializeMap(json)
}

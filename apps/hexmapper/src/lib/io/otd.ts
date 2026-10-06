import {
  isBundle,
  OTD_VERSION,
  validateBundle,
  type OtdBundle,
  type OtdHex,
  type OtdLogEntry,
  type OtdMap,
  type OtdParty,
  type OtdPoi,
} from '@open-tabletop/schema'
import type { SessionState } from '@open-tabletop/session'
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
  const play = playToOtd(map)
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
    ...(play && {
      parties: [play.party, ...((extra.parties as OtdParty[] | undefined) ?? [])],
      log: [...play.log, ...((extra.log as OtdLogEntry[] | undefined) ?? [])],
      state: {
        ...(extra.state as Record<string, unknown> | undefined),
        ...(play.oracle && { oracle: play.oracle }),
      },
    }),
  } as OtdBundle
}

/** Play state as OTD: the party entity, its journal as log entries and the Oracle state. */
function playToOtd(map: HexMap) {
  const play = map.play
  if (!play) return null
  const session = play.rules?.session as Partial<SessionState> | null | undefined
  const party: OtdParty = {
    id: `party-${map.meta.id}`,
    type: 'party',
    ...(play.location && { location: { map: map.meta.id, hex: play.location } }),
    ...(session?.stats && { stats: session.stats }),
    ...(session?.travel && { travel: session.travel as unknown as Record<string, unknown> }),
    ext: {
      hexmapper: {
        mode: play.mode,
        token: play.token,
        trail: play.trail,
        showTrail: play.showTrail,
        ...(play.rules && { system: play.rules.system, startDay: play.rules.startDay }),
        ...(session && { dayVars: session.dayVars, nextEntry: session.nextEntry }),
      },
    },
  }
  const log = (session?.journal ?? []) as unknown as OtdLogEntry[]
  return { party, log, oracle: session?.oracle }
}

/** Reads play state back from the party this app wrote (party-<mapId>). */
function playFromOtd(
  bundle: OtdBundle,
  mapId: string,
): { play?: Record<string, unknown>; partyId?: string } {
  const party = bundle.parties.find((p) => p.id === `party-${mapId}`)
  const ext = (party?.ext as { hexmapper?: Record<string, unknown> } | undefined)?.hexmapper
  if (!party || !ext) return {}
  const rules =
    typeof ext.system === 'string' && party.travel
      ? {
          system: ext.system,
          startDay: ext.startDay,
          session: {
            travel: party.travel,
            oracle: bundle.state.oracle ?? { decks: {}, occurrences: {}, vars: {} },
            stats: party.stats ?? {},
            dayVars: ext.dayVars ?? {},
            journal: bundle.log.filter((e) => ['travel', 'oracle', 'user'].includes(e.source)),
            nextEntry: ext.nextEntry ?? bundle.log.length + 1,
          },
        }
      : undefined
  return {
    partyId: party.id,
    play: {
      mode: ext.mode,
      token: ext.token,
      trail: ext.trail,
      showTrail: ext.showTrail,
      location: party.location?.hex,
      ...(rules && { rules }),
    },
  }
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

  const { play, partyId } = playFromOtd(bundle, otdMap.id)
  const extraBundle: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(bundle))
    if (!(BUNDLE_KEYS as readonly string[]).includes(key)) extraBundle[key] = value
  if (partyId) {
    // Our party, its journal and the oracle state are rebuilt from `play` when saving.
    extraBundle.parties = bundle.parties.filter((p) => p.id !== partyId)
    extraBundle.log = play?.rules ? [] : bundle.log
    const otherState = { ...bundle.state }
    delete otherState.oracle
    extraBundle.state = play?.rules ? otherState : bundle.state
  }
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
    ...(play && { play }),
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

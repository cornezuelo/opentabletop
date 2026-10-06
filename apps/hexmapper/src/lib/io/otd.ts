import {
  isBundle,
  OTD_VERSION,
  validateBundle,
  type OtdBundle,
  type OtdCharacter,
  type OtdHex,
  type OtdLogEntry,
  type OtdMap,
  type OtdParty,
  type OtdPoi,
} from '@open-tabletop/schema'
import type { SessionState } from '@open-tabletop/session'
import { MapFormatError } from '../model/migrations'
import { deserializeMap } from '../model/serialize'
import { partyToken } from '../model/tokens'
import {
  TOKEN_KINDS,
  type HexData,
  type HexIcon,
  type HexKey,
  type HexMap,
  type MapToken,
  type Poi,
} from '../model/types'

/** How a token looks, kept in `ext.hexmapper.token` of its OTD character or party. */
interface TokenLook {
  id: string
  iconId: string
  color?: string
  halo?: boolean
  showName?: boolean
  nameStyle?: MapToken['nameStyle']
}

const lookOf = (token: MapToken): TokenLook => ({
  id: token.id,
  iconId: token.iconId,
  ...(token.color && { color: token.color }),
  ...(token.halo === false && { halo: false }),
  ...(token.showName && { showName: true }),
  ...(token.nameStyle && { nameStyle: token.nameStyle }),
})

/** Tokens other than the party, as OTD characters with a location. */
function tokensToOtd(map: HexMap): OtdCharacter[] {
  return map.tokens
    .filter((t) => t.kind !== 'party')
    .map((t) => ({
      id: t.id,
      type: 'character' as const,
      name: t.name,
      kind: t.kind,
      ...(t.hex && { location: { map: map.meta.id, hex: t.hex } }),
      ...(t.note && { noteRef: t.note }),
      ext: { hexmapper: { token: lookOf(t) } },
    }))
}

/** Characters this app wrote as tokens (they carry ext.hexmapper.token). */
function tokenOf(c: OtdCharacter, mapId: string): Record<string, unknown> | null {
  const look = (c.ext as { hexmapper?: { token?: Partial<TokenLook> } } | undefined)?.hexmapper
    ?.token
  if (!look) return null
  return {
    id: c.id,
    name: c.name ?? '',
    kind: (TOKEN_KINDS as readonly string[]).includes(c.kind ?? '') ? c.kind : 'npc',
    ...(c.location?.map === mapId && { hex: c.location.hex }),
    iconId: look.iconId,
    color: look.color,
    halo: look.halo,
    showName: look.showName,
    nameStyle: look.nameStyle,
    note: c.noteRef,
  }
}

/** What the hexmapper keeps in `map.ext.hexmapper`: rendering, printing and editor-only data. */
interface HexmapperExt {
  version: number
  created: string
  modified: string
  hexSize: number
  showCoords: boolean
  glyphs: number
  print: HexMap['print']
  layers: HexMap['layers']
  labels: HexMap['labels']
  regions: HexMap['regions']
  captions: HexMap['captions']
  assets: HexMap['assets']
  icons: Record<string, HexIcon>
  /** How hex names are shown, per hex (only hexes that differ from the map's style). */
  names?: Record<string, Partial<Pick<HexData, 'showName' | 'nameStyle'>>>
}

const BUNDLE_KEYS = ['otd', 'maps', 'pois'] as const

/** Converts the editor model into an OTD bundle (data other tools understand). */
export function mapToBundle(map: HexMap): OtdBundle {
  const foreign = map.foreign ?? {}
  const icons: Record<string, HexIcon> = {}
  const names: NonNullable<HexmapperExt['names']> = {}
  const hexes: Record<string, OtdHex> = {}
  const pois: OtdPoi[] = []
  for (const [key, hex] of Object.entries(map.hexes) as [HexKey, HexMap['hexes'][HexKey]][]) {
    if (hex.icon) icons[key] = hex.icon
    if (hex.showName === false || hex.nameStyle)
      names[key] = {
        ...(hex.showName === false && { showName: false }),
        ...(hex.nameStyle && { nameStyle: hex.nameStyle }),
      }
    const out: OtdHex = {}
    if (hex.terrain) out.terrain = hex.terrain
    if (hex.region) out.region = hex.region
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
        ...(poi.icon && { ext: { hexmapper: { icon: poi.icon } } }),
      })
  }
  const ext: HexmapperExt = {
    version: map.version,
    created: map.meta.created,
    modified: map.meta.modified,
    hexSize: map.grid.hexSize,
    showCoords: map.grid.showCoords,
    glyphs: map.grid.glyphs,
    print: map.print,
    layers: map.layers,
    labels: map.labels,
    regions: map.regions,
    captions: map.captions,
    assets: map.assets,
    icons,
    ...(Object.keys(names).length && { names }),
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
  const characters = [
    ...tokensToOtd(map),
    ...((extra.characters as OtdCharacter[] | undefined) ?? []),
  ]
  return {
    parties: [],
    factions: [],
    clocks: [],
    log: [],
    state: {},
    ...extra,
    otd: OTD_VERSION,
    characters,
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

/**
 * The party token and play state as OTD: the party entity, its journal as log entries
 * and the Oracle state.
 */
function playToOtd(map: HexMap) {
  const play = map.play
  const token = partyToken(map)
  if (!play && !token) return null
  const session = play?.rules?.session as Partial<SessionState> | null | undefined
  const party: OtdParty = {
    id: `party-${map.meta.id}`,
    type: 'party',
    ...(token?.name && { name: token.name }),
    ...(token?.note && { noteRef: token.note }),
    ...(token?.hex && { location: { map: map.meta.id, hex: token.hex } }),
    ...(session?.stats && { stats: session.stats }),
    ...(session?.travel && { travel: session.travel as unknown as Record<string, unknown> }),
    ext: {
      hexmapper: {
        ...(token && { token: lookOf(token) }),
        ...(play && { mode: play.mode, trail: play.trail, showTrail: play.showTrail }),
        ...(play?.rules && { system: play.rules.system, startDay: play.rules.startDay }),
        ...(session && { dayVars: session.dayVars, nextEntry: session.nextEntry }),
      },
    },
  }
  const log = (session?.journal ?? []) as unknown as OtdLogEntry[]
  return { party, log, oracle: session?.oracle }
}

/**
 * Reads play state and the party token back from the party this app wrote (party-<mapId>).
 * Files from before tokens (`legacy`) keep the old shape; the map migration converts it.
 */
function playFromOtd(
  bundle: OtdBundle,
  mapId: string,
  legacy: boolean,
): { play?: Record<string, unknown>; partyId?: string; token?: Record<string, unknown> } {
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
  const play = {
    mode: ext.mode,
    trail: ext.trail,
    showTrail: ext.showTrail,
    ...(rules && { rules }),
  }
  if (legacy)
    return { partyId: party.id, play: { ...play, token: ext.token, location: party.location?.hex } }
  const look = ext.token as Partial<TokenLook> | undefined
  const token = look && {
    id: look.id,
    name: party.name ?? '',
    kind: 'party',
    ...(party.location?.map === mapId && { hex: party.location.hex }),
    iconId: look.iconId,
    color: look.color,
    halo: look.halo,
    showName: look.showName,
    nameStyle: look.nameStyle,
    note: party.noteRef,
  }
  return {
    partyId: party.id,
    ...(typeof ext.mode === 'string' && { play }),
    ...(token && { token }),
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
      region: hex.region,
      name: hex.name,
      notes: hex.notes,
      note: hex.noteRef,
      tags: hex.tags,
      fields: hex.stats,
    }
  for (const [key, icon] of Object.entries(ext.icons ?? {})) hexes[key] = { ...hexes[key], icon }
  for (const [key, name] of Object.entries(ext.names ?? {})) hexes[key] = { ...hexes[key], ...name }
  for (const poi of pois) {
    const entry: Poi = {
      id: poi.id,
      name: poi.name ?? '',
      description: poi.description,
      note: poi.noteRef,
      icon: (poi.ext as { hexmapper?: { icon?: string } } | undefined)?.hexmapper?.icon,
    }
    const hex = (hexes[poi.location.hex] ??= {})
    hex.pois = [...((hex.pois as Poi[]) ?? []), entry]
  }

  const version = ext.version ?? 1
  const { play, partyId, token: party } = playFromOtd(bundle, otdMap.id, version < 2)
  const tokens: Record<string, unknown>[] = party ? [party] : []
  const otherCharacters: OtdCharacter[] = []
  for (const c of bundle.characters) {
    const token = tokenOf(c, otdMap.id)
    if (token) tokens.push(token)
    else otherCharacters.push(c)
  }
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
  // Our tokens are rebuilt from the map when saving.
  extraBundle.characters = otherCharacters
  if (otherMaps.length) extraBundle.maps = otherMaps
  if (otherPois.length) extraBundle.pois = otherPois

  const internal = {
    version,
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
      glyphs: ext.glyphs,
    },
    scale: otdMap.scale,
    print: ext.print,
    terrains: otdMap.terrains,
    hexes,
    paths: otdMap.paths ?? [],
    assets: ext.assets ?? [],
    labels: ext.labels ?? [],
    regions: ext.regions ?? [],
    ...(ext.captions && { captions: ext.captions }),
    ...(version >= 2 && { tokens }),
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

/** Parses a saved file (an OTD bundle). */
export function parseMapFile(json: string): HexMap {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new MapFormatError('invalid')
  }
  if (!isBundle(raw)) throw new MapFormatError('invalid')
  return bundleToMap(raw)
}

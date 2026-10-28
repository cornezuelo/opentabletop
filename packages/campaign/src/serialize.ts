import type { CharacterState } from '@open-tabletop/character-engine'
import type { CampaignParts, HexMap } from '@open-tabletop/map'
import { CAMPAIGN_PARTS, readMap } from '@open-tabletop/map'
import { DEFAULT_SYSTEM, systemIdOf } from '@open-tabletop/session'
import { readWorld } from '@open-tabletop/world-engine'
import type {
  Campaign,
  CampaignFactions,
  CampaignOracle,
  CampaignTrip,
  FactionNotes,
  WorldMoment,
  WorldWeather,
} from './types'

/**
 * The campaign format's version. Every format change bumps it and adds a migration to
 * `migrations` (`migrations[n]` upgrades raw data from version n to n + 1). v2: the trip
 * going on (`playing`), none in older campaigns; v3: its system and packs (`system`,
 * `packs`), which were its maps' (a map saved before brings them on opening); v4: the
 * moments of the world waiting for the trip going on (`moments`), none in older campaigns;
 * v5: the world's conditions that held (`reactions`), none in older campaigns (what holds
 * when next seen is taken as seen); v6: a moment waiting names what it's heard by (`at`),
 * world turns too, not only clocks (`{ clock, ids }` before).
 */
export const CAMPAIGN_VERSION = 6

const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  5: (data) =>
    Array.isArray(data.moments)
      ? {
          ...data,
          moments: data.moments.map((m: unknown) =>
            isRecord(m) && Array.isArray(m.ids)
              ? { clock: m.clock, at: m.ids.map((id) => `world.clocks.${String(id)}.full`) }
              : m,
          ),
        }
      : data,
}

export type CampaignFormatErrorCode = 'invalid' | 'newerVersion'

export class CampaignFormatError extends Error {
  constructor(public code: CampaignFormatErrorCode) {
    super(`Campaign format error: ${code}`)
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A new, empty campaign (no clock, no factions yet). */
export function createCampaign(id: string, name = '', now = new Date().toISOString()): Campaign {
  return { version: CAMPAIGN_VERSION, id, name, created: now, modified: now }
}

/**
 * A name no other campaign has (`taken`, theirs): the name itself, or it with the first
 * number free, “The Marches (2)”, so two campaigns are never told apart by id alone. An
 * empty name stays empty.
 */
export function freeName(name: string, taken: readonly string[]): string {
  const names = new Set(taken.map((n) => n.trim().toLowerCase()))
  const base = name.trim()
  if (!base || !names.has(base.toLowerCase())) return name
  let n = 2
  while (names.has(`${base} (${n})`.toLowerCase())) n++
  return `${base} (${n})`
}

export function serializeCampaign(campaign: Campaign): string {
  return JSON.stringify(campaign)
}

/** Parses, migrates and validates a campaign. Throws CampaignFormatError on bad input. */
export function deserializeCampaign(json: string): Campaign {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new CampaignFormatError('invalid')
  }
  if (!isRecord(raw)) throw new CampaignFormatError('invalid')
  let data = raw
  let version = typeof data.version === 'number' ? data.version : 0
  if (version > CAMPAIGN_VERSION) throw new CampaignFormatError('newerVersion')
  while (version < CAMPAIGN_VERSION) {
    const step = migrations[version]
    data = { ...(step ? step(data) : data), version: version + 1 }
    version++
  }
  if (typeof data.id !== 'string' || !data.id) throw new CampaignFormatError('invalid')
  const now = new Date().toISOString()
  return {
    ...createCampaign(
      data.id,
      typeof data.name === 'string' ? data.name : '',
      typeof data.created === 'string' ? data.created : now,
    ),
    modified: typeof data.modified === 'string' ? data.modified : now,
    ...(typeof data.noteRef === 'string' && data.noteRef && { noteRef: data.noteRef }),
    ...readSetup(data),
    ...readParts(data),
    ...(isTrip(data.playing) && { playing: data.playing }),
    ...readMoments(data.moments),
  }
}

/** The moments waiting for the trip going on, with broken ones dropped. */
function readMoments(raw: unknown): Pick<Campaign, 'moments'> {
  if (!Array.isArray(raw)) return {}
  const moments = raw.filter(
    (m): m is WorldMoment =>
      isRecord(m) &&
      (m.clock === undefined || typeof m.clock === 'string') &&
      Array.isArray(m.at) &&
      m.at.length > 0 &&
      m.at.every((at) => typeof at === 'string'),
  )
  return moments.length ? { moments } : {}
}

const isTrip = (t: unknown): t is CampaignTrip =>
  isRecord(t) && typeof t.app === 'string' && typeof t.id === 'string' && typeof t.name === 'string'

/** The system and packs as stored (in a campaign, or in a map saved before v25), tidied. */
export function readSetup(parts: CampaignParts): Pick<Campaign, 'system' | 'packs'> {
  const { system, packs } = parts
  return {
    ...(typeof system === 'string' &&
      system &&
      systemIdOf(system) !== DEFAULT_SYSTEM && { system: systemIdOf(system) }),
    ...(Array.isArray(packs) && {
      packs: [...new Set(packs.filter((p): p is string => typeof p === 'string' && !!p))],
    }),
  }
}

/**
 * The world, its weather, the factions and the Oracle as stored (in a campaign, or in a map
 * saved before campaigns), with broken parts dropped.
 */
export function readParts(
  parts: CampaignParts,
): Pick<Campaign, 'world' | 'worldWeather' | 'factions' | 'oracle'> {
  return {
    ...(isRecord(parts.world) && { world: readWorld(parts.world) }),
    ...(isRecord(parts.worldWeather) && readWeather(parts.worldWeather)),
    ...(isRecord(parts.factions) && { factions: readFactions(parts.factions) }),
    ...(isRecord(parts.oracle) && { oracle: readOracle(parts.oracle) }),
  }
}

function readWeather(w: Record<string, unknown>): { worldWeather?: WorldWeather } {
  if (typeof w.weather !== 'string' || typeof w.day !== 'number') return {}
  return {
    worldWeather: {
      weather: w.weather,
      day: w.day,
      ...(typeof w.at === 'string' && { at: w.at }),
    },
  }
}

/** The factions' sheets are re-read by the character engine when used; here only the shape. */
function readFactions(f: Record<string, unknown>): CampaignFactions {
  return {
    system: typeof f.system === 'string' ? f.system : '',
    factions: (Array.isArray(f.factions) ? f.factions : []).filter(
      (c): c is CharacterState =>
        isRecord(c) && typeof c.id === 'string' && typeof c.sheet === 'string',
    ),
    lastTurn: typeof f.lastTurn === 'number' ? f.lastTurn : 0,
    ...(f.auto === false && { auto: false as const }),
    ...(isRecord(f.notes) && readNotes(f.notes)),
  }
}

/** Each faction's link and note, the empty ones left out. */
function readNotes(raw: Record<string, unknown>): Pick<CampaignFactions, 'notes'> {
  let out: { notes?: Record<string, FactionNotes> } = {}
  for (const [id, n] of Object.entries(raw))
    if (isRecord(n))
      out = withNotes(out, id, {
        ...(typeof n.noteRef === 'string' && { noteRef: n.noteRef }),
        ...(typeof n.note === 'string' && { note: n.note }),
      })
  return out
}

/**
 * The factions with one faction's notes changed (its link, its note or both; an empty one
 * is taken away, and with it a faction that has none).
 */
export function withNotes<F extends object>(
  factions: F & { notes?: Record<string, FactionNotes> },
  id: string,
  change: Partial<FactionNotes>,
): F & { notes?: Record<string, FactionNotes> } {
  const next: FactionNotes = { ...factions.notes?.[id], ...change }
  const clean: FactionNotes = {
    ...(next.noteRef?.trim() && { noteRef: next.noteRef.trim() }),
    ...(next.note?.trim() && { note: next.note }),
  }
  const notes = { ...factions.notes }
  if (Object.keys(clean).length) notes[id] = clean
  else delete notes[id]
  const out: F & { notes?: Record<string, FactionNotes> } = { ...factions, notes }
  if (!Object.keys(notes).length) delete out.notes
  return out
}

/** The engine re-validates its state on use; here only the shape is checked. */
function readOracle(o: Record<string, unknown>): CampaignOracle {
  const state = isRecord(o.state) ? o.state : {}
  return {
    state: {
      decks: isRecord(state.decks) ? state.decks : {},
      occurrences: isRecord(state.occurrences) ? state.occurrences : {},
      vars: isRecord(state.vars) ? state.vars : {},
    } as CampaignOracle['state'],
    history: Array.isArray(o.history)
      ? (o.history.filter(isRecord) as unknown as CampaignOracle['history'])
      : [],
  }
}

/**
 * Reads a stored map (`@open-tabletop/map`'s format) and, if it brings the parts of a
 * campaign (saved before campaigns, or a file that carries them), the campaign made from
 * them: its id is the map's `meta.campaign`, its name the map's. Without them, `campaign`
 * is absent and the map's campaign is looked up where campaigns are kept; `setup` is the
 * system and packs a map saved before v25 chose, for that campaign if it has none.
 */
export function openMap(json: string): {
  map: HexMap
  campaign?: Campaign
  setup?: Pick<Campaign, 'system' | 'packs'>
} {
  const { map, campaign: parts } = readMap(json)
  const setup = readSetup(parts)
  if (!(CAMPAIGN_PARTS as readonly string[]).some((p) => p in parts))
    return { map, ...(Object.keys(setup).length && { setup }) }
  return {
    map,
    campaign: {
      ...createCampaign(map.meta.campaign, map.meta.name, map.meta.created),
      modified: map.meta.modified,
      ...setup,
      ...readParts(parts),
    },
  }
}

/** A campaign with the system and packs its map chose before v25, unless it has its own. */
export function withSetup(
  campaign: Campaign,
  setup?: Pick<Campaign, 'system' | 'packs'>,
): Campaign {
  if (!setup || 'system' in campaign || 'packs' in campaign) return campaign
  return { ...campaign, ...setup }
}

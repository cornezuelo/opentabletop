import type { CharacterState } from '@open-tabletop/character-engine'
import type { CampaignParts, HexMap } from '@open-tabletop/map'
import { readMap } from '@open-tabletop/map'
import { readWorld } from '@open-tabletop/world-engine'
import type { Campaign, CampaignFactions, CampaignOracle, WorldWeather } from './types'

/**
 * The campaign format's version. Every format change bumps it and adds a migration to
 * `migrations` (`migrations[n]` upgrades raw data from version n to n + 1).
 */
export const CAMPAIGN_VERSION = 1

const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {}

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
    ...readParts(data),
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
  }
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
 * is absent and the map's campaign is looked up where campaigns are kept.
 */
export function openMap(json: string): { map: HexMap; campaign?: Campaign } {
  const { map, campaign: parts } = readMap(json)
  if (!Object.keys(parts).length) return { map }
  return {
    map,
    campaign: {
      ...createCampaign(map.meta.campaign, map.meta.name, map.meta.created),
      modified: map.meta.modified,
      ...readParts(parts),
    },
  }
}

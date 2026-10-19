import type { CharacterState } from '@open-tabletop/character-engine'
import type { HistoryItem, OracleState } from '@open-tabletop/oracle-engine'
import type { WorldState } from '@open-tabletop/world-engine'

/**
 * The factions of a campaign: those of the system they were brought from (`system`), each
 * as a character of its factions' sheet, the last world turn, and whether turns come by
 * themselves with the world clock (`auto: false`: only by hand). The land each holds is
 * kept by each map (`HexMap.territories`).
 */
export interface CampaignFactions {
  system: string
  factions: CharacterState[]
  lastTurn: number
  auto?: false
  /** What the GM keeps on each faction, by its id (principle 9: the lore is in the notes app). */
  notes?: Record<string, FactionNotes>
}

/** A faction's page in the notes app (`noteRef`) and a short GM note (Markdown). */
export interface FactionNotes {
  noteRef?: string
  note?: string
}

/** The factions as one map sees them: the campaign's, with the land each holds on that map. */
export interface FactionsOnMap extends CampaignFactions {
  territories: Record<string, string[]>
}

/** Oracle state (decks drawn, once-only entries, values set) and the history of hand rolls. */
export interface CampaignOracle {
  state: OracleState
  history: HistoryItem[]
}

/** The world clock's own weather, rolled day by day while no trip is going on. */
export interface WorldWeather {
  weather: string
  /** The day it's for. */
  day: number
  /** Where it is on a hex flower. */
  at?: string
}

/**
 * The trip going on in a campaign: one at a time (a map's in the Hexmapper, or one of
 * Travel's), so the world's time is one. Another trip asks to take its place.
 */
export interface CampaignTrip {
  /** The app it plays in (`hexmapper`, `travel`) and its id there (the map's, the trip's). */
  app: string
  id: string
  /** Its name, to say which one it is. */
  name: string
}

/**
 * A campaign: what happens in the world, shared by its maps (each map names its campaign,
 * `meta.campaign`). Mechanical state only (principle 9): lore lives behind `noteRef`.
 */
export interface Campaign {
  version: number
  id: string
  name: string
  created: string
  modified: string
  /** Its page in the notes app. */
  noteRef?: string
  /**
   * The system its maps and trips are played with (`kind: system` id; absent: the default
   * one, Core's): its world clock's calendar, its clocks and factions are that system's. A
   * trip keeps playing the system it started with until a new one starts.
   */
  system?: string
  /**
   * Packs its maps work with besides the ones its system brings (their Oracle panel shows
   * both); absent: every loaded pack.
   */
  packs?: string[]
  /** The world clock: time, scheduled events, progress clocks, timeline. */
  world?: WorldState
  worldWeather?: WorldWeather
  factions?: CampaignFactions
  /** Hand rolls and trips' checks share its decks and once-only entries. */
  oracle?: CampaignOracle
  /** The trip that played in it last, which another asks to pause. */
  playing?: CampaignTrip
}

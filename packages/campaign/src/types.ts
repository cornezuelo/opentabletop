import type { CharacterState } from '@open-tabletop/character-engine'
import type { HistoryItem, OracleState } from '@open-tabletop/oracle-engine'
import type { ClockThen, WorldState } from '@open-tabletop/world-engine'

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
 * The trip going on in a campaign: one at a time (a map's in Map, or one of
 * Travel's), so the world's time is one. Another trip asks to take its place.
 */
export interface CampaignTrip {
  /** The app it plays in (`map`, `travel`) and its id there (the map's, the trip's). */
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
  /**
   * The moments of the world waiting for the trip going on (`playing`), heard on its next
   * step: clocks that filled by any means (by hand, a faction's turn, a trip's effects) and
   * world turns (due on the way, by hand, brought by a trip's `do: world.turn`).
   */
  moments?: WorldMoment[]
  /**
   * The world's moments written as conditions that held when last seen (`<reaction>:<index>`
   * in its system's `kind: world`): each comes again only after it stopped holding. Absent:
   * what holds when next seen is taken as seen.
   */
  reactions?: string[]
  /**
   * What the world waits for the player to answer (a reaction's pause or question), and
   * what's left to play then. Nothing else moves the world until it's answered.
   */
  waiting?: WorldWaiting
}

/**
 * What the world has left to play once the player answers, in order: a reaction's steps
 * from one on (with what the player answered it), the other reactions of a moment, clocks
 * that filled still to react to, what becomes of a full clock, changes still to apply, the
 * world turns that came due.
 */
export type WorldRest =
  | { kind: 'steps'; reaction: string; next: number; params?: Record<string, string> }
  | { kind: 'reactions'; ids: string[] }
  | { kind: 'clocks'; ids: string[] }
  | { kind: 'clockThen'; id: string; then: ClockThen }
  | { kind: 'effects'; changes: Record<string, number | string | boolean> }
  | { kind: 'turns' }

/**
 * A reaction of the world waiting for the player: a pause (its words, if any) or a question
 * on one of its parameters (`ask`); what's left to play once answered, and the time the
 * world was moving to (a trip moving on while it waits moves it later).
 */
export interface WorldWaiting {
  reaction: string
  text?: string
  ask?: string
  rest: WorldRest[]
  until?: number
}

/**
 * A moment of the world that came while a trip was going on: the names a trip's rules may
 * hear it by, the first they name heard (`world.turn`; a clock's `world.clocks.<id>.full`,
 * by the id its system declares it with and by its name written as one, `the-wyrm-wakes`,
 * as conditions read it), and a full clock's name.
 */
export interface WorldMoment {
  at: string[]
  clock?: string
}

import { applyCharacter } from '@open-tabletop/character-engine'
import { changeTerritory, turnsDue } from '@open-tabletop/faction-engine'
import type { HexMap } from '@open-tabletop/map'
import { emptyState, type OracleEngine } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import {
  clockFull,
  factionFacts,
  localize,
  startClocks,
  type ClockFull,
  type FactionLine,
  type StartingClock,
  type SystemClocks,
  type SystemFactions,
} from '@open-tabletop/session'
import type { Calendar, DataCalendar } from '@open-tabletop/time'
import { nextWeather, type WeatherModel } from '@open-tabletop/weather-engine'
import {
  createWorld,
  findClock,
  initialWorld,
  worldFacts,
  type ProgressClock,
  type WorldAction,
  type WorldEvent,
} from '@open-tabletop/world-engine'
import { factionsHere, splitFactions, territoryWorld, worldTurnOn } from './factions'
import type { Campaign } from './types'

/**
 * The world clock of a campaign, played the same way by every app: actions on the clock
 * with what they bring along (the world's own weather day by day, the factions' turns as
 * they come due, what a declared clock does when it fills), a trip's results on the world,
 * and the world following a trip's time. Pure: each takes a campaign (and the map being
 * played, if any, where the factions' land is) and returns them changed.
 */

/** A campaign and the map being played, if any (the factions' land is on it). */
export interface WorldPlace {
  campaign: Campaign
  map?: HexMap
}

/** The words the timeline needs, in the host's language (cores don't translate). */
export interface WorldWords {
  /** A full clock's line after its name: its words, what it rolled, what happens to it. */
  clockFull: (full: ClockFull) => string
  /** A faction's turn: "The Iron Clans: raid the Vale (+1 hex)". */
  factionLine: (system: SystemFactions, line: FactionLine) => string
}

/** What the world plays with: the campaign's system, its Oracle, randomness, language. */
export interface WorldHost {
  calendar: Calendar
  /** The progress clocks the system declares, and the language its texts fall back to. */
  clocks?: SystemClocks
  fallback?: string
  /** The model the world's own weather is rolled on, if any. */
  weather?: WeatherModel
  /** The system the campaign's factions came from (their names and turn tables), if loaded. */
  factions?: SystemFactions
  oracle: OracleEngine
  random: RandomSource
  locale: string
  /**
   * A trip going on in the campaign, if any: its weather is the world's then (the world's
   * own isn't rolled).
   */
  trip?: { weather?: string }
  words: WorldWords
}

/** A full clock said: its name and what happened, for a notice. */
export interface ClockNotice {
  clock: string
  text: string
}

/** What an action on the world did: the place changed, the clock's events, full clocks. */
export interface WorldDone extends WorldPlace {
  events: WorldEvent[]
  filled: ClockNotice[]
}

/** How many full clocks deep a chain may go (a full clock ticking another that fills…). */
const MAX_CHAIN = 10

/**
 * What tables and conditions read of the world: the world clock's (its clocks, today's
 * events), if running, the factions' (`factions.<id>.*`), if any, and, without a trip, the
 * world's own weather (`weather`, as a trip's).
 */
export function worldFactsOf(
  place: WorldPlace,
  host: Pick<WorldHost, 'calendar' | 'factions' | 'locale' | 'trip'>,
): Record<string, unknown> | undefined {
  const { world, worldWeather } = place.campaign
  const own = factionsHere(place.campaign, place.map)
  const factions = own && factionFacts(own, host.factions, host.locale)
  if (!world && !factions) return undefined
  const weather = host.trip ? undefined : worldWeather?.weather
  return {
    ...(world && worldFacts(world, host.calendar)),
    ...factions,
    ...(weather && { weather }),
  }
}

/** The clocks the system declares that the world doesn't have (by their declared id). */
export function missingClocks(
  campaign: Campaign,
  host: Pick<WorldHost, 'clocks' | 'locale' | 'fallback'>,
): StartingClock[] {
  if (!host.clocks || !campaign.world) return []
  const have = campaign.world.clocks.map((c) => c.ref)
  return startClocks(host.clocks, host.locale, host.fallback).filter((c) => !have.includes(c.ref))
}

/**
 * The world's own weather, day by day up to today, while no trip is going on (a trip's
 * weather is the world's then): each day follows the day before's, in that day's season.
 */
export function rollWorldWeather(
  campaign: Campaign,
  host: Pick<WorldHost, 'calendar' | 'weather' | 'trip' | 'random'>,
): Campaign {
  const { world } = campaign
  const model = host.weather
  if (!world || !model || host.trip) return campaign
  const calendar = host.calendar
  const today = calendar.describe(world.time).day
  let weather = campaign.worldWeather
  if (weather && weather.day >= today) return campaign
  // A long jump: only the last days matter.
  const from = Math.max(weather ? weather.day + 1 : today, today - 30)
  for (let day = from; day <= today; day++) {
    const next = nextWeather(model, {
      season: calendar.describe(calendar.at(day, '12:00')).season,
      previous: weather?.weather,
      at: weather?.at,
      random: host.random,
    })
    weather = { weather: next.weather, day, ...(next.at && { at: next.at }) }
  }
  return { ...campaign, worldWeather: weather }
}

/**
 * Plays on the world of a campaign. The functions share one place as it changes, since
 * one action can bring others (a full clock ticking another, a turn logging its lines).
 */
function playWorld(start: WorldPlace, host: WorldHost) {
  let { campaign, map } = start
  const filled: ClockNotice[] = []
  const world = createWorld({ calendar: host.calendar })
  let chain = 0
  const facts = () => worldFactsOf({ campaign, map }, host)

  function act(action: WorldAction): WorldEvent[] {
    const state = campaign.world
    if (!state) return []
    const { state: next, events } = world.apply(state, action)
    campaign = { ...campaign, world: next }
    if (next.time > state.time) {
      // The world's own weather, day by day, while no trip has a weather of its own.
      campaign = rollWorldWeather(campaign, host)
      // The factions take the turns that came due on the way (every so many days).
      for (const at of dueTurns()) turn(at)
    }
    // A clock the system declares does what it says when it fills.
    for (const e of events) if (e.type === 'CLOCK_FILLED' && e.clock.ref) clockFilled(e.clock)
    return events
  }

  function dueTurns(): number[] {
    const own = campaign.factions
    if (!own || !host.factions || own.auto === false || !campaign.world) return []
    return turnsDue(
      own.lastTurn,
      campaign.world.time,
      host.factions.def.every,
      host.calendar.minutesPerDay,
    )
  }

  function turn(time = campaign.world?.time ?? 0): FactionLine[] {
    const system = host.factions
    if (!campaign.factions || !system) return []
    const done = worldTurnOn(
      { campaign, map },
      {
        system,
        oracle: host.oracle,
        random: host.random,
        facts: facts(),
        locale: host.locale,
        time,
      },
    )
    campaign = done.campaign
    map = done.map
    for (const line of done.lines)
      act({
        type: 'log',
        text: host.words.factionLine(system, line),
        data: { ...line },
        time,
      })
    for (const [ref, n] of Object.entries(done.ticks)) {
      const found = n && campaign.world && findClock(campaign.world, ref)
      if (found) act({ type: 'tick', id: found.id, segments: n })
    }
    return done.lines
  }

  function clockFilled(clock: ProgressClock): void {
    if (!host.clocks || !clock.ref || chain >= MAX_CHAIN) return
    chain++
    try {
      const shared = campaign.oracle
      const done = clockFull(
        {
          system: host.clocks,
          oracle: host.oracle,
          random: host.random,
          facts: facts(),
          locale: host.locale,
          fallback: host.fallback,
        },
        shared?.state ?? emptyState(),
        clock.ref,
      )
      if (!done) return
      const { full } = done
      campaign = { ...campaign, oracle: { state: done.oracle, history: shared?.history ?? [] } }
      const said = host.words.clockFull(full)
      if (said) act({ type: 'log', text: `${clock.name}: ${said}`, data: { clock: clock.id } })
      filled.push({ clock: clock.name, text: said })
      effects(full.effects)
      if (full.then === 'reset') act({ type: 'updateClock', id: clock.id, patch: { filled: 0 } })
      if (full.then === 'remove') act({ type: 'removeClock', id: clock.id })
    } finally {
      chain--
    }
  }

  function effects(changes: Record<string, unknown>): void {
    for (const [path, change] of Object.entries(changes)) {
      const [, ref] = /^world\.clocks\.(.+)$/.exec(path) ?? []
      const found = ref && campaign.world && findClock(campaign.world, ref)
      if (!found) continue
      // A number fills (or empties) segments; `'=N'` fills it up to N.
      const set = typeof change === 'string' && /^\s*=/.test(change)
      const n = Number(set ? (change as string).replace('=', '') : change)
      if (!Number.isFinite(n)) continue
      const by = set ? n - found.filled : n
      if (by) act({ type: 'tick', id: found.id, segments: by })
    }
    factionEffects(changes)
  }

  function factionEffects(changes: Record<string, unknown>): void {
    const own = factionsHere(campaign, map)
    const system = host.factions
    if (!own || !system) return
    let state = structuredClone(own)
    let changed = false
    for (const [path, change] of Object.entries(changes)) {
      const [, id, rest] = /^factions\.([^.]+)\.(.+)$/.exec(path) ?? []
      if (!id || (typeof change !== 'number' && typeof change !== 'string')) continue
      if (rest === 'territory') {
        // Land changes on the map being played; without one there's none to change.
        const by = Number(change)
        if (!map || !Number.isFinite(by)) continue
        const done = changeTerritory(state.territories, id, by, territoryWorld(map), host.random)
        state = { ...state, territories: done.territories }
        changed = true
        continue
      }
      const at = state.factions.findIndex((f) => f.id === id)
      if (at < 0 || !/^(values|conditions)\./.test(rest)) continue
      state.factions[at] = applyCharacter(system.sheet.def, state.factions[at], {
        type: 'change',
        effects: { [rest]: change },
      }).state
      changed = true
    }
    if (!changed) return
    const split = splitFactions(state)
    campaign = { ...campaign, factions: split.factions }
    if (map) map = { ...map, territories: split.territories }
  }

  const done = (events: WorldEvent[] = []): WorldDone => ({ campaign, map, events, filled })
  return { act, turn, effects, done }
}

/** Applies an action to the world clock, with all it brings along. */
export function worldAct(place: WorldPlace, action: WorldAction, host: WorldHost): WorldDone {
  const play = playWorld(place, host)
  return play.done(play.act(action))
}

/**
 * Starts the world clock at a moment: the world's weather rolled for its first day, and
 * the clocks the system declares brought.
 */
export function startWorld(place: WorldPlace, time: number, host: WorldHost): WorldDone {
  let campaign: Campaign = { ...place.campaign, world: initialWorld(time) }
  delete campaign.worldWeather
  campaign = rollWorldWeather(campaign, host)
  return bringClocks({ ...place, campaign }, host)
}

/** Adds the clocks the system declares that the world doesn't have yet. */
export function bringClocks(place: WorldPlace, host: WorldHost): WorldDone {
  const play = playWorld(place, host)
  const events = missingClocks(place.campaign, host).flatMap((clock) =>
    play.act({ type: 'addClock', clock }),
  )
  return play.done(events)
}

/**
 * A world turn: every faction takes its turn (at `time`, the world clock's by default);
 * what they did goes to the timeline, and the progress clocks they tick move.
 */
export function worldTurnNow(
  place: WorldPlace,
  host: WorldHost,
  time?: number,
): WorldDone & { lines: FactionLine[] } {
  const play = playWorld(place, host)
  const lines = play.turn(time)
  return { ...play.done(), lines }
}

/**
 * What a trip's results do to the world: progress clocks they tick (`world.clocks.<name>: 1`,
 * by name as an id or by the id its system declares it with; `'=N'` fills it up to N) and the
 * factions they change (`factions.<id>.…`; land only on the map being played).
 */
export function worldEffects(
  place: WorldPlace,
  effects: Record<string, unknown>,
  host: WorldHost,
): WorldDone {
  const play = playWorld(place, host)
  play.effects(effects)
  return play.done()
}

/** A line a trip's journal gets from the world: an event or holiday that came due. */
export interface WorldLine {
  code: 'WORLD_EVENT' | 'HOLIDAY'
  text: string
  time: number
}

/**
 * A trip moved time on: the world follows, and what came due on the way is told (events
 * and holidays), as journal lines.
 */
export function followTrip(
  place: WorldPlace,
  time: number,
  host: WorldHost,
): WorldDone & { lines: WorldLine[] } {
  const world = place.campaign.world
  if (!world || time <= world.time) return { ...place, events: [], filled: [], lines: [] }
  const calendar = host.calendar as Partial<DataCalendar>
  const holidayName = (id: string) => {
    const h = calendar.def?.holidays?.find((x) => x.id === id)
    return localize(h?.name, host.locale, 'en') ?? id
  }
  const done = worldAct(place, { type: 'setTime', time }, host)
  const lines = done.events.flatMap((e): WorldLine[] =>
    e.type === 'EVENT_DUE'
      ? [{ code: 'WORLD_EVENT', text: e.event.name, time: e.time }]
      : e.type === 'HOLIDAY'
        ? [{ code: 'HOLIDAY', text: holidayName(e.id), time: e.time }]
        : [],
  )
  return { ...done, lines }
}

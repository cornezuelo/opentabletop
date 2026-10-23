import { applyCharacter } from '@open-tabletop/character-engine'
import { changeTerritory, turnsDue } from '@open-tabletop/faction-engine'
import type { HexMap } from '@open-tabletop/map'
import { emptyState, type OracleEngine, type OracleState } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import {
  clockThen,
  factionFacts,
  localize,
  startClocks,
  worldHolds,
  worldStep,
  type FactionLine,
  type ReactionLine,
  type StartingClock,
  type SystemClocks,
  type SystemFactions,
  type SystemWorld,
} from '@open-tabletop/session'
import type { Calendar, DataCalendar } from '@open-tabletop/time'
import { calendarFacts, momentsOf, type TravelRules } from '@open-tabletop/travel-engine'
import { nextWeather, type WeatherModel } from '@open-tabletop/weather-engine'
import {
  clockFullMoment,
  createWorld,
  factId,
  findClock,
  initialWorld,
  reactionOf,
  reactionsAt,
  worldConditions,
  worldFacts,
  WORLD_TURN,
  type ClockThen,
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

/** A clock that filled: what the world's reactions to it said, and what becomes of it. */
export interface ClockFull {
  lines: ReactionLine[]
  then: ClockThen
}

/** The words the timeline needs, in the host's language (cores don't translate). */
export interface WorldWords {
  /** A full clock's line after its name: what its reactions said, what happens to it. */
  clockFull: (full: ClockFull) => string
  /** A reaction's line: its words, what it rolled. */
  reaction: (lines: ReactionLine[]) => string
  /** Where reactions bringing each other were stopped, after `max` in a row. */
  reactionsStopped: (max: number) => string
  /** A faction's turn: "The Iron Clans: raid the Vale (+1 hex)". */
  factionLine: (system: SystemFactions, line: FactionLine) => string
}

/** What the world plays with: the campaign's system, its Oracle, randomness, language. */
export interface WorldHost {
  calendar: Calendar
  /** The progress clocks the system declares, and the language its texts fall back to. */
  clocks?: SystemClocks
  /** The system's world rules: what the world does by itself when something happens in it. */
  world?: SystemWorld
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

/** How many times one trip's step may hear the world in a row (a moment filling a clock…). */
export const MAX_HEARD = 10

/** A moment of the world a trip hears (`world.clocks.<id>.full`), and the clock's name. */
export interface HeardMoment {
  at: string
  clock: string
}

/**
 * The moments the world had waiting for the trip going on, taken: those its rules name
 * (an action's `on:`, a check's `at:`), each by the first id of its clock they name. The
 * others are dropped (no trip of the campaign hears them).
 */
export function takeMoments(
  campaign: Campaign,
  rules: TravelRules,
): { campaign: Campaign; heard: HeardMoment[] } {
  if (!campaign.moments) return { campaign, heard: [] }
  const named = new Set([
    ...Object.values(rules.actions ?? {}).flatMap((a) => momentsOf(a.on)),
    ...(rules.checks ?? []).flatMap((c) => momentsOf(c.at)),
  ])
  const heard = campaign.moments.flatMap((m): HeardMoment[] => {
    const at = m.ids.map((id) => `world.clocks.${id}.full`).find((x) => named.has(x))
    return at ? [{ at, clock: m.clock }] : []
  })
  const rest = { ...campaign }
  delete rest.moments
  return { campaign: rest, heard }
}

/** What an action on the world did: the place changed, the clock's events, full clocks. */
export interface WorldDone extends WorldPlace {
  events: WorldEvent[]
  filled: ClockNotice[]
}

/**
 * How deep reactions may bring each other (a full clock ticking another that fills…), and
 * how many rounds of conditions turning true in a row are played.
 */
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
 * one action can bring others (a full clock ticking another, a turn logging its lines, a
 * reaction of the world changing what its conditions see).
 */
function playWorld(start: WorldPlace, host: WorldHost) {
  let { campaign, map } = start
  const filled: ClockNotice[] = []
  const world = createWorld({ calendar: host.calendar })
  const rules = host.world?.def
  /** How deep reactions are bringing each other now, and whether a chain was stopped. */
  let depth = 0
  let stopped = false
  const facts = () => worldFactsOf({ campaign, map }, host)
  /** What the world's reactions read: the world's facts and its moment (`time.*`). */
  const reactionFacts = (): Record<string, unknown> => {
    const parts = host.calendar.describe(campaign.world?.time ?? 0)
    return {
      ...facts(),
      day: parts.day,
      hour: parts.hour,
      ...(parts.season && { season: parts.season }),
      ...calendarFacts(parts),
    }
  }

  /**
   * An action on the world clock. Moving time on goes day by day, so what holds at each
   * day's start (an event's day, a market day in the middle of a week) is seen on the way.
   */
  function act(action: WorldAction): WorldEvent[] {
    const state = campaign.world
    if (!state) return []
    const to =
      action.type === 'advance'
        ? state.time + Math.max(0, action.minutes)
        : action.type === 'advanceUntil'
          ? world.target(state, action.until)
          : action.type === 'setTime'
            ? action.time
            : undefined
    if (to === undefined) return once(action)
    const events: WorldEvent[] = []
    const calendar = host.calendar
    const last = calendar.describe(to).day
    for (let d = calendar.describe(state.time).day + 1; d <= last; d++) {
      const dawn = calendar.at(d, 0)
      if (dawn >= to) break
      events.push(...once({ type: 'setTime', time: dawn }))
      settle()
    }
    events.push(...once({ type: 'setTime', time: to }))
    return events
  }

  function once(action: WorldAction): WorldEvent[] {
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
    for (const e of events) {
      if (e.type !== 'CLOCK_FILLED') continue
      heard(e.clock)
      clockFilled(e.clock)
    }
    return events
  }

  /** A clock filled: the trip going on, if any, hears it on its next step. */
  function heard(clock: ProgressClock): void {
    if (!campaign.playing) return
    campaign = {
      ...campaign,
      moments: [...(campaign.moments ?? []), { clock: clock.name, ids: clockIds(clock) }],
    }
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

  /** A world turn: each faction's, then the world's reactions to it (`world.turn`). */
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
    for (const id of reactionsAt(rules, WORLD_TURN)) logged(id)
    return done.lines
  }

  /**
   * A clock filled: the world's reactions to it (by its declared id or its name as an id),
   * a line on the timeline with what they said, and what becomes of a declared clock.
   */
  function clockFilled(clock: ProgressClock): void {
    const mark = campaign.world?.timeline.length ?? 0
    const lines = reactionsAt(rules, ...clockIds(clock).map(clockFullMoment)).flatMap(react)
    const then = clockThen(host.clocks, clock.ref)
    if (!clock.ref && !lines.length) return
    const said = host.words.clockFull({ lines, then })
    if (said) logAt(mark, `${clock.name}: ${said}`, { clock: clock.id })
    filled.push({ clock: clock.name, text: said })
    const now = campaign.world && findClock(campaign.world, clock.ref ?? clock.id)
    if (!now || now.id !== clock.id) return
    if (then === 'reset') act({ type: 'updateClock', id: clock.id, patch: { filled: 0 } })
    if (then === 'remove') act({ type: 'removeClock', id: clock.id })
  }

  /** A reaction played, its line on the timeline where it began. */
  function logged(id: string): void {
    const mark = campaign.world?.timeline.length ?? 0
    const lines = react(id)
    const said = lines.length ? host.words.reaction(lines) : ''
    if (said) logAt(mark, said, { reaction: id })
  }

  /** A line of the timeline put before what came after `mark` (what its steps brought). */
  function logAt(mark: number, text: string, data: Record<string, unknown>): void {
    act({ type: 'log', text, data })
    const state = campaign.world
    if (!state) return
    const timeline = [...state.timeline]
    timeline.splice(mark, 0, timeline.pop()!)
    campaign = { ...campaign, world: { ...state, timeline } }
  }

  /**
   * One of the world's reactions, if its conditions hold: its steps in order, each seeing
   * what the ones before changed. What its lines said (a reaction it does says its own).
   */
  function react(id: string): ReactionLine[] {
    const reaction = rules?.reactions[id]
    if (!reaction || !host.world || !campaign.world) return []
    if (depth >= MAX_CHAIN) {
      stop()
      return []
    }
    if (!worldHolds(reactionFacts(), reaction)) return []
    depth++
    try {
      const lines: ReactionLine[] = []
      for (const step of reaction.do) {
        const shared = campaign.oracle
        const done = worldStep(
          {
            system: host.world,
            oracle: host.oracle,
            random: host.random,
            locale: host.locale,
            fallback: host.fallback,
          },
          shared?.state ?? emptyState(),
          step,
          reactionFacts(),
        )
        if (!done) continue
        campaign = { ...campaign, oracle: { state: done.oracle, history: shared?.history ?? [] } }
        if (done.line) lines.push(done.line)
        effects(done.effects)
        if (done.do === WORLD_TURN) turn()
        const other = reactionOf(done.do)
        if (other) lines.push(...react(other))
      }
      return lines
    } finally {
      depth--
    }
  }

  /** Reactions brought each other too deep: said once, where it stopped. */
  function stop(): void {
    if (stopped) return
    stopped = true
    act({ type: 'log', text: host.words.reactionsStopped(MAX_CHAIN), data: { stopped: true } })
  }

  /**
   * The world's moments written as conditions: each that turned true since last time comes
   * once (its reaction played), in declared order, checked again until nothing new holds
   * (ten rounds at most). What held is kept in the campaign; a campaign that kept nothing
   * takes what holds now as seen, so nothing comes at once in a campaign under way.
   */
  function settle(): void {
    const conditions = worldConditions(rules)
    if (!conditions.length || !campaign.world) return
    const holding = () => conditions.filter((c) => worldHolds(reactionFacts(), c))
    if (!campaign.reactions) {
      campaign = { ...campaign, reactions: holding().map((c) => c.key) }
      return
    }
    for (let round = 0; ; round++) {
      const held = new Set(campaign.reactions ?? [])
      const now = holding()
      const fresh = [...new Set(now.filter((c) => !held.has(c.key)).map((c) => c.reaction))]
      campaign = { ...campaign, reactions: now.map((c) => c.key) }
      if (!fresh.length) return
      if (round >= MAX_CHAIN) return stop()
      for (const id of fresh) logged(id)
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
      if (!id || !['number', 'string', 'boolean'].includes(typeof change)) continue
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
        effects: { [rest]: change as number | string | boolean },
      }).state
      changed = true
    }
    if (!changed) return
    const split = splitFactions(state)
    campaign = { ...campaign, factions: split.factions }
    if (map) map = { ...map, territories: split.territories }
  }

  /** What was done, once the world's conditions have been seen. */
  const done = (events: WorldEvent[] = []): WorldDone => {
    settle()
    return { campaign, map, events, filled }
  }
  return { act, turn, effects, done }
}

/** The ids rules may name a clock by: the one its system declares, its name as an id. */
const clockIds = (clock: ProgressClock): string[] =>
  [...new Set([clock.ref, factId(clock.name)])].filter((id): id is string => !!id)

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

/** What a journal line of a trip's step changes in the world: its effects, or its result's. */
export function entryEffects(entry: {
  data?: Record<string, unknown>
}): Record<string, unknown> | undefined {
  const value = entry.data?.value as { effects?: Record<string, unknown> } | undefined
  return (entry.data?.effects as Record<string, unknown> | undefined) ?? value?.effects
}

/**
 * A trip's highlights written in the campaign's timeline, a line each at its time, in the
 * host's words (what happened outside a step: a character leaving the party). Nothing
 * while the world clock hasn't started.
 */
export function tripHighlights(
  place: WorldPlace,
  highlights: { time: number; text: string }[],
  host: WorldHost,
): WorldDone {
  let done: WorldDone = { ...place, events: [], filled: [] }
  if (!place.campaign.world) return done
  for (const { time, text } of highlights) {
    const next = worldAct(done, { type: 'log', text, data: { trip: true }, time }, host)
    done = { ...next, filled: done.filled }
  }
  return done
}

/**
 * A trip of the campaign stepped: its checks rolled on the campaign's Oracle (`oracle`, the
 * state the step left), what its results, checks and actions did changes the world (its
 * clocks, its factions), its highlights (arrivals, places found, encounters that paused, in
 * the host's words) go to the timeline, a line each, and the world follows its time; the
 * lines for its journal are what came due on the way.
 */
export function tripStepped(
  place: WorldPlace,
  step: {
    oracle: OracleState
    entries: { data?: Record<string, unknown> }[]
    time: number
    highlights?: { time: number; text: string }[]
  },
  host: WorldHost,
): WorldDone & { lines: WorldLine[] } {
  const { campaign } = place
  let done: WorldDone = {
    ...place,
    campaign: {
      ...campaign,
      oracle: { state: step.oracle, history: campaign.oracle?.history ?? [] },
    },
    events: [],
    filled: [],
  }
  for (const entry of step.entries) {
    const effects = entryEffects(entry)
    if (!effects) continue
    const next = worldEffects(done, effects, host)
    done = { ...next, filled: [...done.filled, ...next.filled] }
  }
  if (step.highlights?.length) {
    const logged = tripHighlights(done, step.highlights, host)
    done = { ...logged, filled: done.filled }
  }
  const followed = followTrip(done, step.time, host)
  return { ...followed, filled: [...done.filled, ...followed.filled] }
}

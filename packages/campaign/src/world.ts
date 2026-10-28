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
  worldQuestion,
  worldStep,
  type WorldHold,
  type WorldQuestion,
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
import type { Campaign, WorldMoment, WorldRest, WorldWaiting } from './types'

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
  /** What the player answered a reaction's question: "Who takes the bridge? The Clans". */
  answered: (question: string, choice: string) => string
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
  /**
   * Whether the trip going on skips pauses: the world's pauses are written on the timeline
   * and passed too (its questions still wait for the player).
   */
  skipPauses?: boolean
  words: WorldWords
}

/** A full clock said: its name and what happened, for a notice. */
export interface ClockNotice {
  clock: string
  text: string
}

/** How many times one trip's step may hear the world in a row (a moment filling a clock…). */
export const MAX_HEARD = 10

/**
 * A moment of the world a trip hears (`world.turn`, `world.clocks.<id>.full`), and a full
 * clock's name.
 */
export interface HeardMoment {
  at: string
  clock?: string
}

/**
 * The moments the world had waiting for the trip going on, taken: those its rules name
 * (an action's `on:`, a check's `at:`), each by the first of its names they name (a clock
 * by its declared id or its name as an id). The others are dropped (no trip of the
 * campaign hears them).
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
    const at = m.at.find((x) => named.has(x))
    return at ? [{ at, ...(m.clock !== undefined && { clock: m.clock }) }] : []
  })
  const rest = { ...campaign }
  delete rest.moments
  return { campaign: rest, heard }
}

/** A world turn that was played: when, and what each faction did, in the host's words. */
export interface TurnDone {
  time: number
  lines: string[]
}

/**
 * What an action on the world did: the place changed, the clock's events, full clocks,
 * world turns played.
 */
export interface WorldDone extends WorldPlace {
  events: WorldEvent[]
  filled: ClockNotice[]
  turns: TurnDone[]
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
 * The world waiting for the player stops where it is: each level of what was being played
 * (a reaction's steps, a moment's other reactions, a full clock's end, changes left, turns
 * and days still due) adds what it had left as this goes up, so everything goes on, in
 * order, once the player answers.
 */
class Held {
  /** What was left, in the order it goes on (the innermost first). */
  rest: WorldRest[] = []
  /** What the reactions under way said before it stopped, for their line on the timeline. */
  lines: ReactionLine[] = []
  /** The time the world was moving to, if it was. */
  until?: number
  constructor(
    readonly reaction: string,
    readonly hold: WorldHold,
  ) {}
}

/**
 * Plays on the world of a campaign. The functions share one place as it changes, since
 * one action can bring others (a full clock ticking another, a turn logging its lines, a
 * reaction of the world changing what its conditions see). A step that waits for the
 * player stops it all (`Held`); `run` keeps what was left in the campaign (`waiting`).
 */
function playWorld(start: WorldPlace, host: WorldHost) {
  let { campaign, map } = start
  const filled: ClockNotice[] = []
  const turns: TurnDone[] = []
  const world = createWorld({ calendar: host.calendar })
  const rules = host.world?.def
  /** How deep reactions are bringing each other now, and whether a chain was stopped. */
  let depth = 0
  let stopped = false
  const facts = () => worldFactsOf({ campaign, map }, host)
  /**
   * What the world's reactions read: the world's facts, its moment (`time.*`) and what the
   * player answered the reaction (`params.*`).
   */
  const reactionFacts = (params?: Record<string, string>): Record<string, unknown> => {
    const parts = host.calendar.describe(campaign.world?.time ?? 0)
    return {
      ...facts(),
      day: parts.day,
      hour: parts.hour,
      ...(parts.season && { season: parts.season }),
      ...calendarFacts(parts),
      ...(params && Object.keys(params).length && { params }),
    }
  }
  /** Runs `fn` on a Held going up: adds what this level had left, then lets it go on up. */
  const leaving = <T>(fn: () => T, left: (held: Held) => void): T => {
    try {
      return fn()
    } catch (error) {
      if (error instanceof Held) left(error)
      throw error
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
    leaving(
      () => {
        for (let d = calendar.describe(state.time).day + 1; d <= last; d++) {
          const dawn = calendar.at(d, 0)
          if (dawn >= to) break
          events.push(...once({ type: 'setTime', time: dawn }))
          settle()
        }
        events.push(...once({ type: 'setTime', time: to }))
      },
      (held) => (held.until = Math.max(held.until ?? to, to)),
    )
    return events
  }

  function once(action: WorldAction): WorldEvent[] {
    const state = campaign.world
    if (!state) return []
    const { state: next, events } = world.apply(state, action)
    campaign = { ...campaign, world: next }
    const full = events.flatMap((e) => (e.type === 'CLOCK_FILLED' ? [e.clock.id] : []))
    if (next.time > state.time) {
      // The world's own weather, day by day, while no trip has a weather of its own.
      campaign = rollWorldWeather(campaign, host)
      // The factions take the turns that came due on the way (every so many days).
      leaving(dueTurns, (held) => held.rest.push({ kind: 'turns' }, { kind: 'clocks', ids: full }))
    }
    clocksFilled(full)
    return events
  }

  /** Clocks that filled (by their ids): each heard by the trip going on, each reacted to. */
  function clocksFilled(ids: string[]): void {
    ids.forEach((id, i) =>
      leaving(
        () => {
          const clock = campaign.world?.clocks.find((c) => c.id === id)
          if (!clock) return
          heard({ clock: clock.name, at: clockIds(clock).map(clockFullMoment) })
          clockFilled(clock)
        },
        (held) => {
          if (i + 1 < ids.length) held.rest.push({ kind: 'clocks', ids: ids.slice(i + 1) })
        },
      ),
    )
  }

  /** A moment of the world: the trip going on, if any, hears it on its next step. */
  function heard(moment: WorldMoment): void {
    if (!campaign.playing) return
    campaign = { ...campaign, moments: [...(campaign.moments ?? []), moment] }
  }

  /** The world turns that came due (every so many days), each played at its time. */
  function dueTurns(): void {
    const own = campaign.factions
    if (!own || !host.factions || own.auto === false || !campaign.world) return
    const due = turnsDue(
      own.lastTurn,
      campaign.world.time,
      host.factions.def.every,
      host.calendar.minutesPerDay,
    )
    // A turn played moves the last turn on: those after it are due again when it's answered.
    for (const at of due) turn(at)
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
    const texts = done.lines.map((line) => host.words.factionLine(system, line))
    turns.push({ time, lines: texts })
    done.lines.forEach((line, i) => act({ type: 'log', text: texts[i], data: { ...line }, time }))
    heard({ at: [WORLD_TURN] })
    const after = reactionsAt(rules, WORLD_TURN)
    const ticks = Object.entries(done.ticks).flatMap(([ref, n]) =>
      n ? [[`world.clocks.${ref}`, n] as const] : [],
    )
    leaving(
      () => effects(Object.fromEntries(ticks)),
      (held) => {
        if (after.length) held.rest.push({ kind: 'reactions', ids: after })
      },
    )
    reactionsIn(after)
    return done.lines
  }

  /** Reactions of one moment, in order, each its own line on the timeline. */
  function reactionsIn(ids: string[]): void {
    ids.forEach((id, i) =>
      leaving(
        () => logged(id),
        (held) => {
          if (i + 1 < ids.length) held.rest.push({ kind: 'reactions', ids: ids.slice(i + 1) })
        },
      ),
    )
  }

  /**
   * A clock filled: the world's reactions to it (by its declared id or its name as an id),
   * a line on the timeline with what they said, and what becomes of a declared clock.
   */
  function clockFilled(clock: ProgressClock): void {
    const mark = campaign.world?.timeline.length ?? 0
    const ids = reactionsAt(rules, ...clockIds(clock).map(clockFullMoment))
    const then = clockThen(host.clocks, clock.ref)
    const lines: ReactionLine[] = []
    let held: Held | undefined
    for (let i = 0; i < ids.length && !held; i++)
      try {
        lines.push(...react(ids[i]))
      } catch (error) {
        if (!(error instanceof Held)) throw error
        held = error
        lines.push(...held.lines)
        held.lines = []
        if (i + 1 < ids.length) held.rest.push({ kind: 'reactions', ids: ids.slice(i + 1) })
      }
    if (clock.ref || lines.length) {
      const said = host.words.clockFull({ lines, then })
      if (said) logAt(mark, `${clock.name}: ${said}`, { clock: clock.id })
      filled.push({ clock: clock.name, text: said })
    }
    if (held) {
      // What becomes of it once full waits for the rest of its reactions.
      held.rest.push({ kind: 'clockThen', id: clock.id, then })
      throw held
    }
    clockDone(clock.id, then)
  }

  /** What becomes of a full clock: kept, emptied to start over, or removed. */
  function clockDone(id: string, then: ClockThen): void {
    if (!campaign.world?.clocks.some((c) => c.id === id)) return
    if (then === 'reset') act({ type: 'updateClock', id, patch: { filled: 0 } })
    if (then === 'remove') act({ type: 'removeClock', id })
  }

  /**
   * A reaction played (from step `from`, with what the player answered it), its line on the
   * timeline where it began; what it said before waiting for the player, too.
   */
  function logged(id: string, from = 0, params: Record<string, string> = {}): void {
    const mark = campaign.world?.timeline.length ?? 0
    const lines = leaving(
      () => react(id, from, params),
      (held) => {
        said(mark, held.lines, id)
        held.lines = []
      },
    )
    said(mark, lines, id)
  }

  /** A reaction's line on the timeline, before what came after `mark`. */
  function said(mark: number, lines: ReactionLine[], id: string): void {
    const text = lines.length ? host.words.reaction(lines) : ''
    if (text) logAt(mark, text, { reaction: id })
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
   * One of the world's reactions, if its conditions hold: its steps in order (from `from`,
   * going on after the player answered it: its conditions were seen as it came), each seeing
   * what the ones before changed. What its lines said (a reaction it does says its own). A
   * step that waits for the player stops the world (`Held`), unless it's a pause and the
   * trip going on skips them: its words go on the timeline then.
   */
  function react(id: string, from = 0, params: Record<string, string> = {}): ReactionLine[] {
    const reaction = rules?.reactions[id]
    if (!reaction || !host.world || !campaign.world) return []
    if (depth >= MAX_CHAIN) {
      stop()
      return []
    }
    if (from === 0 && !worldHolds(reactionFacts(), reaction)) return []
    depth++
    try {
      const lines: ReactionLine[] = []
      for (let i = from; i < reaction.do.length; i++) {
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
          reaction.do[i],
          reactionFacts(params),
        )
        if (!done) continue
        campaign = { ...campaign, oracle: { state: done.oracle, history: shared?.history ?? [] } }
        if (done.line) lines.push(done.line)
        const rest: WorldRest = {
          kind: 'steps',
          reaction: id,
          next: i + 1,
          ...(Object.keys(params).length && { params }),
        }
        const hold = done.hold
        if (hold) {
          const words =
            'ask' in hold
              ? host.world &&
                worldQuestion(host.world, id, hold.ask, host.locale, host.fallback)?.question
              : hold.text
          if (words) lines.push({ say: words })
          if ('pause' in hold && host.skipPauses) continue
          const held = new Held(id, hold)
          held.lines = lines
          held.rest.push(rest)
          throw held
        }
        leaving(
          () => {
            effects(done.effects)
            if (done.do === WORLD_TURN) turn()
            const other = reactionOf(done.do)
            if (other) lines.push(...react(other))
          },
          (held) => {
            held.lines = [...lines, ...held.lines]
            held.rest.push(rest)
          },
        )
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
   * takes what holds now as seen, so nothing comes at once in a campaign under way. One
   * that turned true is seen as its reaction comes: those after one that waits for the
   * player come once it's answered.
   */
  function settle(): void {
    const conditions = worldConditions(rules)
    if (!conditions.length || !campaign.world || campaign.waiting) return
    const holding = () => conditions.filter((c) => worldHolds(reactionFacts(), c))
    if (!campaign.reactions) {
      campaign = { ...campaign, reactions: holding().map((c) => c.key) }
      return
    }
    for (let round = 0; ; round++) {
      const held = new Set(campaign.reactions ?? [])
      const now = holding()
      const fresh = [...new Set(now.filter((c) => !held.has(c.key)).map((c) => c.reaction))]
      const seen = (played: Set<string>) =>
        now.filter((c) => held.has(c.key) || played.has(c.reaction)).map((c) => c.key)
      if (!fresh.length || round >= MAX_CHAIN) {
        campaign = { ...campaign, reactions: now.map((c) => c.key) }
        if (fresh.length) stop()
        return
      }
      const played = new Set<string>()
      for (const id of fresh) {
        played.add(id)
        campaign = { ...campaign, reactions: seen(played) }
        logged(id)
      }
    }
  }

  function effects(changes: Record<string, unknown>): void {
    const entries = Object.entries(changes)
    entries.forEach(([path, change], i) => {
      const [, ref] = /^world\.clocks\.(.+)$/.exec(path) ?? []
      const found = ref && campaign.world && findClock(campaign.world, ref)
      if (!found) return
      // A number fills (or empties) segments; `'=N'` fills it up to N.
      const set = typeof change === 'string' && /^\s*=/.test(change)
      const n = Number(set ? (change as string).replace('=', '') : change)
      if (!Number.isFinite(n)) return
      const by = set ? n - found.filled : n
      if (!by) return
      leaving(
        () => act({ type: 'tick', id: found.id, segments: by }),
        (held) => {
          // The clocks after it, and every faction's change (applied after the clocks).
          const left = entries.filter(([p], j) => j > i || !/^world\.clocks\./.test(p))
          if (left.length)
            held.rest.push({
              kind: 'effects',
              changes: Object.fromEntries(left) as Record<string, number | string | boolean>,
            })
        },
      )
    })
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

  /** What was left once the player answered, in order. */
  function goOn(rest: WorldRest[]): void {
    rest.forEach((item, i) =>
      leaving(
        () => {
          if (item.kind === 'steps') logged(item.reaction, item.next, item.params)
          else if (item.kind === 'reactions') reactionsIn(item.ids)
          else if (item.kind === 'clocks') clocksFilled(item.ids)
          else if (item.kind === 'clockThen') clockDone(item.id, item.then)
          else if (item.kind === 'effects') effects(item.changes)
          else dueTurns()
        },
        (held) => held.rest.push(...rest.slice(i + 1)),
      ),
    )
  }

  /**
   * The player answered what the world waited for (`choice`, a question's): its line on
   * the timeline, then what was left, the turns that came due and the days still to move.
   */
  function resume(waiting: WorldWaiting, choice?: string): void {
    const params: Record<string, string> = {}
    if (waiting.ask !== undefined && choice !== undefined) {
      params[waiting.ask] = choice
      const asked =
        host.world &&
        worldQuestion(host.world, waiting.reaction, waiting.ask, host.locale, host.fallback)
      const name = asked?.choices.find((c) => c.id === choice)?.name ?? choice
      act({
        type: 'log',
        text: host.words.answered(asked?.question ?? waiting.ask, name),
        data: { answered: waiting.reaction, choice },
      })
    }
    // The reaction that asked reads the answer from then on.
    let given = false
    const rest = waiting.rest.map((item): WorldRest => {
      if (given || item.kind !== 'steps' || item.reaction !== waiting.reaction) return item
      given = true
      return { ...item, params: { ...item.params, ...params } }
    })
    const until = waiting.until
    leaving(
      () => {
        goOn(rest)
        dueTurns()
      },
      (held) => {
        if (until !== undefined) held.until = Math.max(held.until ?? until, until)
      },
    )
    if (until !== undefined) act({ type: 'setTime', time: until })
  }

  /**
   * Plays `fn`, unless the world waits for the player; if a step waits for one, what was
   * left is kept in the campaign (`waiting`) and `otherwise` is returned.
   */
  function run<T>(fn: () => T, otherwise: T): T {
    if (campaign.waiting) return otherwise
    try {
      return fn()
    } catch (error) {
      if (!(error instanceof Held)) throw error
      const now = campaign.world?.time ?? 0
      const hold = error.hold
      campaign = {
        ...campaign,
        waiting: {
          reaction: error.reaction,
          ...('ask' in hold ? { ask: hold.ask } : hold.text !== undefined && { text: hold.text }),
          rest: error.rest,
          ...(error.until !== undefined && error.until > now && { until: error.until }),
        },
      }
      return otherwise
    }
  }

  /** What was done, once the world's conditions have been seen. */
  const done = (events: WorldEvent[] = []): WorldDone => {
    run(settle, undefined)
    return { campaign, map, events, filled, turns }
  }
  /** Goes on with the campaign's world, as `resume` does (it waits no more). */
  const answer = (waiting: WorldWaiting, choice?: string) => {
    const left = { ...campaign }
    delete left.waiting
    campaign = left
    run(() => resume(waiting, choice), undefined)
  }
  return {
    act: (action: WorldAction) => run(() => act(action), []),
    turn: (time?: number) => run(() => turn(time), []),
    effects: (changes: Record<string, unknown>) => run(() => effects(changes), undefined),
    answer,
    done,
  }
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
 * The player answers what the world waits for (`campaign.waiting`): goes on after a pause,
 * or with a question's `choice` (one of its parameter's choices). What was left is played,
 * then the turns that came due and the days still to move; it may wait again. Nothing
 * changes when nothing waits, or when a question gets no choice of its own.
 */
export function worldAnswer(place: WorldPlace, host: WorldHost, choice?: string): WorldDone {
  const waiting = place.campaign.waiting
  const asked = waiting?.ask !== undefined && host.world
  const choices = asked
    ? (worldQuestion(host.world!, waiting!.reaction, waiting!.ask!, host.locale)?.choices ?? [])
    : []
  if (!waiting || (asked && !choices.some((c) => c.id === choice)))
    return { ...place, events: [], filled: [], turns: [] }
  const play = playWorld(place, host)
  play.answer(waiting, asked ? choice : undefined)
  return play.done()
}

/** What the world waits for, in words: a pause's, or a question and its choices. */
export interface WaitingSaid {
  /** The reaction's name (its id if it has none). */
  reaction: string
  text?: string
  question?: WorldQuestion
}

/** What the campaign's world waits for, if anything, in the host's language. */
export function waitingSaid(
  campaign: Campaign,
  host: Pick<WorldHost, 'world' | 'locale' | 'fallback'>,
): WaitingSaid | undefined {
  const waiting = campaign.waiting
  if (!waiting) return undefined
  const def = host.world?.def.reactions[waiting.reaction]
  const question =
    waiting.ask !== undefined && host.world
      ? worldQuestion(host.world, waiting.reaction, waiting.ask, host.locale, host.fallback)
      : undefined
  return {
    reaction: localize(def?.name, host.locale, host.fallback) ?? waiting.reaction,
    ...(waiting.text !== undefined && { text: waiting.text }),
    ...(question && { question }),
  }
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

/**
 * A line a trip's journal gets from the world: an event or holiday that came due, a world
 * turn played (what the factions did, in the host's words; empty when the world had no turn
 * to play, without factions).
 */
export interface WorldLine {
  code: 'WORLD_EVENT' | 'HOLIDAY' | 'WORLD_TURN'
  text: string
  time: number
}

/** A world turn's journal line. */
const turnLine = (turn: TurnDone): WorldLine => ({
  code: 'WORLD_TURN',
  text: turn.lines.join('; '),
  time: turn.time,
})

/**
 * A trip moved time on: the world follows, and what came due on the way is told (events,
 * holidays, world turns), as journal lines in the order they came.
 */
export function followTrip(
  place: WorldPlace,
  time: number,
  host: WorldHost,
): WorldDone & { lines: WorldLine[] } {
  const world = place.campaign.world
  const waiting = place.campaign.waiting
  // The world waits for the player: it follows the trip's time once answered.
  if (waiting && world && time > world.time) {
    const until = Math.max(waiting.until ?? time, time)
    const campaign = { ...place.campaign, waiting: { ...waiting, until } }
    return { ...place, campaign, events: [], filled: [], turns: [], lines: [] }
  }
  if (!world || time <= world.time)
    return { ...place, events: [], filled: [], turns: [], lines: [] }
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
  // Sorted, a turn among the day's events where it came (the sort keeps the order of ties).
  const all = [...lines, ...done.turns.map(turnLine)].sort((a, b) => a.time - b.time)
  return { ...done, lines: all }
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
  let done: WorldDone = { ...place, events: [], filled: [], turns: [] }
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
 * clocks, its factions), the world turns its steps brought are played (`WORLD_DO`, `do:
 * world.turn`), its highlights (arrivals, places found, encounters that paused, in the host's
 * words) go to the timeline, a line each, and the world follows its time; the lines for its
 * journal are the turns played and what came due on the way.
 */
export function tripStepped(
  place: WorldPlace,
  step: {
    oracle: OracleState
    entries: { code?: string; time?: number; data?: Record<string, unknown> }[]
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
    turns: [],
  }
  const turned: WorldLine[] = []
  for (const entry of step.entries) {
    if (entry.code === 'WORLD_DO' && entry.data?.do === WORLD_TURN) {
      const time = entry.time ?? step.time
      const next = worldTurnNow(done, host, time)
      // Without factions the world has no turn to play: the journal says nothing happened.
      turned.push(...(next.turns.length ? next.turns.map(turnLine) : [noTurn(time)]))
      done = { ...next, filled: [...done.filled, ...next.filled], turns: [] }
      continue
    }
    const effects = entryEffects(entry)
    if (!effects) continue
    const next = worldEffects(done, effects, host)
    // A clock its effects fill may bring a turn too (a reaction's `do: world.turn`).
    turned.push(...next.turns.map(turnLine))
    done = { ...next, filled: [...done.filled, ...next.filled], turns: [] }
  }
  if (step.highlights?.length) {
    const logged = tripHighlights(done, step.highlights, host)
    done = { ...logged, filled: done.filled }
  }
  const followed = followTrip(done, step.time, host)
  return {
    ...followed,
    filled: [...done.filled, ...followed.filled],
    lines: [...turned, ...followed.lines],
  }
}

/**
 * The journal line of a world turn a trip brought that had none to play (no campaign, or
 * one without factions): an empty one, the host saying nothing happened.
 */
export const noTurn = (time: number): WorldLine => ({ code: 'WORLD_TURN', text: '', time })

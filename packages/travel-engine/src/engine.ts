import { matches, type Condition } from '@open-tabletop/conditions'
import { findPath } from '@open-tabletop/hex'
import {
  defaultCalendar,
  nextAt,
  type Calendar,
  type CalendarParts,
  type GameTime,
  type TimeParts,
} from '@open-tabletop/time'
import {
  actionSteps,
  availableActions,
  changeValue,
  modeThrough,
  declaredValues,
  olderEatingId,
  resourceBounds,
  type ActionStep,
  type Bounds,
  type CheckRule,
  type TravelRules,
} from './rules'

/** Read-only view of the map. The hexmapper implements it; a standalone app can fake it. */
export interface TravelWorld {
  hexKm: number
  /** `water`: the map marks the hex's terrain as water (lake, sea… or one of the user's). */
  cell(
    hex: string,
  ): { terrain?: string; tags?: string[]; water?: boolean; [key: string]: unknown } | null
  neighbors(hex: string): string[]
  distance(a: string, b: string): number
  /** Edge kinds between two neighboring hexes, e.g. ['road'] or ['river']. */
  edges(a: string, b: string): string[]
}

export interface PendingCheck {
  id: string
  event: string
  /** Facts for whoever resolves it (terrain, weather, hex…). */
  context: Record<string, unknown>
  /** The check's own effects (`party.stats.fatigue: 1`), applied by whoever resolves it. */
  effects?: Record<string, number | string>
  /** The check says to stop after it, until the player goes on. */
  pause?: boolean
  /**
   * Already rolled and waiting for the player (a pause): resolving it applies this outcome
   * unless another is given.
   */
  rolled?: CheckOutcome
}

export interface CheckOutcome {
  /** Values of the day the system declares (`lost: true`), set by the result. */
  values?: Record<string, unknown>
  /** Older form of `values: { lost: true }`. */
  lost?: boolean
  weather?: string
  /** Movement multiplier for the rest of the day (e.g. 0.5 when foraging). */
  speed?: number
  resources?: Record<string, number>
}

export interface TravelState {
  time: GameTime
  location: string
  destination?: string
  /** Planned hexes from the current location ([0]) to the destination. */
  route?: string[]
  mode: string
  resources: Record<string, number>
  /** Older trips kept the party's fatigue here; it's a stat of the system now (migrated). */
  fatigue?: number
  weather?: string
  /** Minutes already spent towards route[1]. */
  progress: number
  /** Calendar day the daily counters belong to. */
  day: number
  travelledToday: number
  dayChecksDone: boolean
  /** Today's values the system declares (`lost: true`): what they block is blocked. */
  today?: Record<string, unknown>
  /** The day before's declared values (false when unset), read as `yesterday.<id>`. */
  yesterday?: Record<string, unknown>
  /**
   * The values that hit a bound today (`below`: an effect would have taken them under their
   * `min`; `above`: over their `max`), by id; conditions read them as `below` / `above`.
   */
  reached?: { below?: string[]; above?: string[] }
  /** Older trips: the day whose supplies an `eat: day` step ate (read as that action done). */
  ate?: { day: number; short: boolean }
  /** Older trips: being lost was built in (read as `today.lost` / `yesterday.lost`). */
  lostToday?: boolean
  lostYesterday?: boolean
  speedToday?: number
  /** The system's own actions done today (for `oncePerDay`). */
  actionsToday?: string[]
  pendingChecks: PendingCheck[]
  nextCheckId: number
}

export type StopReason =
  | 'destination'
  | 'hex'
  | 'nightfall'
  | 'day-limit'
  | 'check'
  | 'blocked'
  /** A declared value blocks travel (`value` says which: lost…). */
  | 'value'
  /** Older trips' reason for being lost. */
  | 'lost'
  | 'no-route'
  | 'weather'
  /** A wait reached its moment. */
  | 'waited'
  /** Night fell on a wait and the party can't camp (`because` says why). */
  | 'camp'

export type TravelEvent =
  | { type: 'DAY_STARTED'; day: number }
  | { type: 'ROUTE_PLANNED'; route: string[]; strategy: RouteStrategy }
  | { type: 'NO_ROUTE'; to: string }
  | { type: 'HEX_ENTERED'; hex: string; time: GameTime }
  | { type: 'CHECK_REQUIRED'; check: PendingCheck; time: GameTime }
  | { type: 'CHECK_RESOLVED'; id: string; outcome: CheckOutcome }
  | { type: 'DESTINATION_REACHED'; hex: string }
  | { type: 'ROUTE_BLOCKED'; from: string; to: string }
  | {
      type: 'TRAVEL_STOPPED'
      reason: StopReason
      time: GameTime
      value?: string
      because?: Unavailable
    }
  | { type: 'CAMP_STARTED'; time: GameTime }
  /**
   * An effect would have taken a value past its bound (`party.resources.food` under its
   * `min`): it stopped at `value`.
   */
  | {
      type: 'LIMIT_REACHED'
      path: string
      limit: 'min' | 'max'
      value: number
      time: GameTime
    }
  | { type: 'ACTION_UNAVAILABLE'; action: string; because?: Unavailable }
  /** An action's step changes the party (applied by whoever keeps the party's values). */
  | { type: 'EFFECTS'; action: string; effects: Record<string, number | string>; time: GameTime }
  /**
   * `checks`: how many of its checks came up here (0: nothing to roll, e.g. foraging on
   * hills); `on`: the moment or action that took it by itself (`on:` in the rules).
   */
  | {
      type: 'ACTION_TAKEN'
      action: string
      time: GameTime
      minutes: number
      checks: number
      hex: string
      terrain?: string
      on?: string
    }
  | { type: 'RESTED'; minutes: number; time: GameTime }

/**
 * Why an action (or travelling) can't be done now: the system turns it off, a declared
 * value blocks it (`lost`), it was done today (`oncePerDay`), or its `when` / `unless`.
 */
export type Unavailable =
  { off: true } | { value: string } | { once: true } | { condition: 'when' | 'unless' }

export type RouteStrategy = 'shortest' | 'fastest'

export type TravelAction =
  | { type: 'setDestination'; hex: string; strategy?: RouteStrategy }
  | { type: 'travel'; until?: 'hex' | 'destination' }
  | { type: 'advanceTime'; minutes: number }
  /**
   * Waits where the party is until a moment, living it: day-start and day-end checks and
   * actions, the system's camp at nightfall. Stops early when a check is pending.
   */
  | { type: 'wait'; until: GameTime }
  | { type: 'camp' }
  /** A rest; its length comes from the rules unless given. */
  | { type: 'rest'; minutes?: number }
  /** One of the system's own actions (`actions.<id>` in the rules), e.g. forage. */
  | { type: 'action'; id: string }
  | { type: 'setMode'; mode: string }
  | { type: 'setWeather'; weather: string | undefined }
  | { type: 'resolveCheck'; id: string; outcome?: CheckOutcome }

/**
 * What the host knows that conditions may read besides the trip's facts: the party's
 * stats, today's values, `yesterday` (the session passes `tripContext`).
 */
export type HostFacts = Record<string, unknown>

export interface TravelEngine {
  apply(
    state: TravelState,
    action: TravelAction,
    facts?: HostFacts,
  ): { state: TravelState; events: TravelEvent[] }
  /**
   * What can't be done now and why: `travel`, every action by id and each way of travelling
   * as `mode.<id>` (absent: available).
   */
  availability(state: TravelState, facts?: HostFacts): Record<string, Unavailable>
  /** Minutes to step from `a` to its neighbor `b` in the given state (Infinity if impossible). */
  stepMinutes(state: TravelState, a: string, b: string): number
  plan(state: TravelState, to: string, strategy?: RouteStrategy): string[] | null
}

export function initialTravelState(init: {
  location: string
  mode: string
  time?: GameTime
  resources?: Record<string, number>
  calendar?: Calendar
}): TravelState {
  const time = init.time ?? 0
  return {
    time,
    location: init.location,
    mode: init.mode,
    resources: { ...init.resources },
    progress: 0,
    day: (init.calendar ?? defaultCalendar).describe(time).day,
    travelledToday: 0,
    dayChecksDone: false,
    pendingChecks: [],
    nextCheckId: 1,
  }
}

/** Older trips (built-in `lost`) in today's shape: `today.lost`, `yesterday.lost`. */
export function upgradeTravelState(state: TravelState): TravelState {
  if (!('lostToday' in state) && !('lostYesterday' in state)) return state
  const { lostToday, lostYesterday, ...rest } = state
  return {
    ...rest,
    ...(lostToday && { today: { ...rest.today, lost: true } }),
    ...(lostYesterday !== undefined && { yesterday: { ...rest.yesterday, lost: lostYesterday } }),
  }
}

/**
 * What a calendar of the system's own says about now, for tables and checks: `month`,
 * `year`, `weekday`, `moons` (each moon's phase: `moons.pale: full`) and `holidays`.
 */
export function calendarFacts(parts: TimeParts | CalendarParts): Record<string, unknown> {
  if (!('month' in parts)) return {}
  return {
    month: parts.month.id,
    year: parts.year,
    ...(parts.weekday && { weekday: parts.weekday.id }),
    moons: Object.fromEntries(parts.moons.map((m) => [m.id, m.phase])),
    holidays: parts.holidays.map((h) => h.id),
  }
}

export function createTravelEngine(options: {
  world: TravelWorld
  rules: TravelRules
  calendar?: Calendar
  /**
   * The bounds of the party's stats (the host keeps them): an action's effects on a stat
   * stop there, and later steps see `below` / `above` (and the stat's new value).
   */
  stats?: Record<string, Bounds>
}): TravelEngine {
  const { world, rules } = options
  const calendar = options.calendar ?? defaultCalendar
  const dayMinutes = rules.travel.hoursPerDay * 60
  const actions = availableActions(rules)
  const values = declaredValues(rules)
  const supplies = resourceBounds(rules)
  /** Actions the system takes by itself, by the moment or action they follow. */
  const triggered = new Map<string, string[]>()
  for (const [id, def] of Object.entries(actions.all))
    if (def.on) triggered.set(def.on, [...(triggered.get(def.on) ?? []), id])
  /** A declared value holds while it's set to anything but false. */
  const holds = (v: unknown) => v !== undefined && v !== null && v !== false
  /** The declared value that blocks `what` today (travel, an action), if any. */
  const blocker = (state: TravelState, what: string): string | undefined =>
    Object.entries(values).find(
      ([id, v]) => v.blocks?.includes(what) && holds(state.today?.[id]),
    )?.[0]

  /**
   * What a way of travelling's "only through" sees when stepping from `a` into `b`: the hex
   * entered (everything the map knows of it), the roads or rivers of the step, the mode, the
   * weather and today's values. Light on purpose: route planning asks it for many hexes.
   */
  const throughContext = (state: TravelState, a: string, b: string): Record<string, unknown> => {
    const cell = world.cell(b)
    return {
      ...state.today,
      ...cell,
      hex: b,
      terrain: cell?.terrain,
      water: !!cell?.water,
      tags: cell?.tags ?? [],
      edges: world.edges(a, b),
      mode: state.mode,
      weather: state.weather,
    }
  }

  /** Terrain/edge multiplier for entering `b` from `a` (0 or Infinity-safe). */
  const multiplier = (state: TravelState, a: string, b: string): number => {
    const mode = rules.modes[state.mode]
    const cell = world.cell(b)
    if (!mode || !cell) return 0
    const terrain = cell.terrain
    // A terrain's own rule wins; water hexes without one follow the `water` rule.
    const terrainRule =
      (terrain ? rules.terrains[terrain] : undefined) ?? (cell.water ? rules.water : undefined)
    const through = modeThrough(mode)
    if (through) {
      // "Only through" where its condition holds: there, even closed terrains are open to it.
      if (!matches(through, throughContext(state, a, b))) return 0
    } else if (terrainRule?.passable === false) return 0
    const edgeMultipliers = world
      .edges(a, b)
      .map((e) => rules.edges?.[e]?.multiplier)
      .filter((m): m is number => m !== undefined)
    // Roads and similar edges replace the terrain penalty.
    return edgeMultipliers.length
      ? Math.max(...edgeMultipliers)
      : (terrainRule?.multiplier ?? rules.defaultTerrain?.multiplier ?? 1)
  }

  const dayFactor = (state: TravelState): number =>
    (state.weather ? (rules.weather?.[state.weather]?.speed ?? 1) : 1) * (state.speedToday ?? 1)

  const baseMinutes = (state: TravelState, a: string, b: string): number => {
    const mode = rules.modes[state.mode]
    const m = multiplier(state, a, b)
    if (!mode || m <= 0) return Infinity
    const kmPerHour = mode.kmPerDay / rules.travel.hoursPerDay
    return (world.hexKm / (kmPerHour * m)) * 60
  }

  const stepMinutes = (state: TravelState, a: string, b: string): number => {
    const factor = dayFactor(state)
    return factor <= 0 ? Infinity : baseMinutes(state, a, b) / factor
  }

  const plan = (
    state: TravelState,
    to: string,
    strategy: RouteStrategy = 'fastest',
  ): string[] | null => {
    const mode = rules.modes[state.mode]
    if (!mode) return null
    // Admissible heuristic for "fastest": the best possible speed on any hex.
    const best = Math.max(
      rules.defaultTerrain?.multiplier ?? 1,
      ...Object.values(rules.terrains).map((t) => t.multiplier ?? 1),
      rules.water?.multiplier ?? 0,
      ...Object.values(rules.edges ?? {}).map((e) => e.multiplier ?? 0),
    )
    const minPerHex = (world.hexKm / ((mode.kmPerDay / rules.travel.hoursPerDay) * best)) * 60
    const result = findPath<string>(state.location, to, {
      neighbors: world.neighbors,
      cost: (a, b) => {
        const minutes = baseMinutes(state, a, b)
        if (!Number.isFinite(minutes)) return Infinity
        return strategy === 'shortest' ? 1 : minutes
      },
      heuristic: (a, b) => world.distance(a, b) * (strategy === 'shortest' ? 1 : minPerHex),
    })
    return result?.path ?? null
  }

  /**
   * What checks see. `edges` are the lines of the stretch the check is about: the one just
   * walked when entering a hex, the one ahead at dawn or in camp.
   */
  const checkContext = (
    state: TravelState,
    [a, b]: string[] = [],
    facts: HostFacts = {},
  ): Record<string, unknown> => {
    const cell = world.cell(state.location)
    const host = facts.party as Record<string, unknown> | undefined
    return {
      ...facts,
      ...state.today,
      ...calendarFacts(calendar.describe(state.time)),
      // Everything the map knows about the hex (fields, region…), then the travel facts.
      ...cell,
      hex: state.location,
      terrain: cell?.terrain,
      tags: cell?.tags ?? [],
      edges: a && b ? world.edges(a, b) : [],
      weather: state.weather,
      mode: state.mode,
      season: calendar.describe(state.time).season,
      day: state.day,
      // The day before's values (the host's, then the declared ones).
      yesterday: { ...(facts.yesterday as object | undefined), ...state.yesterday },
      // What hit a bound today; `short` is how older rules read "something hit its minimum".
      below: state.reached?.below ?? [],
      above: state.reached?.above ?? [],
      short: !!state.reached?.below?.length,
      // What the engine knows of the party (the host adds its stats).
      party: { ...host, resources: { ...state.resources }, mode: state.mode },
    }
  }

  /** Facts of the current action or step (the host's, given to `apply`). */
  let hostFacts: HostFacts = {}

  const schedule = (
    state: TravelState,
    at: string,
    events: TravelEvent[],
    from?: string,
    facts: Record<string, unknown> = {},
    /** A check event rolled now by a step (`roll:`), whatever its `at`. */
    event?: string,
  ): number => {
    const next = state.route?.[1]
    const stretch = from ? [from, state.location] : next ? [state.location, next] : []
    // Conditions also see the host's facts (stats, today's values); the check keeps the
    // trip's own (the host adds its facts again when resolving it).
    if (!event)
      // The actions the system takes at this moment come first (their checks too).
      for (const id of triggered.get(at) ?? [])
        takeAction(state, id, events, { on: at, facts, quiet: true })
    const context = { ...checkContext(state, stretch), ...facts }
    const seen = { ...checkContext(state, stretch, hostFacts), ...facts }
    let scheduled = 0
    for (const rule of (rules.checks ?? []) as CheckRule[]) {
      if (event ? rule.event !== event : rule.at !== at) continue
      if (rule.when && !matches(rule.when, seen)) continue
      if (rule.unless && matches(rule.unless, seen)) continue
      const check: PendingCheck = {
        id: `c${state.nextCheckId++}`,
        event: rule.event,
        context,
        ...(rule.effects && { effects: rule.effects }),
        ...(rule.pause && { pause: true }),
      }
      state.pendingChecks.push(check)
      events.push({ type: 'CHECK_REQUIRED', check, time: state.time })
      scheduled++
    }
    return scheduled
  }

  /** Whether the day is being changed (actions at day-end may pass time themselves). */
  let syncing = false

  /**
   * Starts a new day when the calendar day changed. Each day that ended, whatever passed
   * the time (camping, resting, waiting), ends with the system's day-end actions and
   * checks, seeing whether the day ended in camp; then the daily counters reset.
   */
  const syncDay = (state: TravelState, events: TravelEvent[], camping = false): void => {
    if (syncing) return
    const { day } = calendar.describe(state.time)
    if (day <= state.day) return
    syncing = true
    try {
      const now = state.time
      for (let d = state.day; d < day; d++) {
        // The day ends at midnight (or now, if the day changed by hand).
        state.time = Math.min(now, calendar.at(d + 1, '00:00'))
        schedule(state, 'day-end', events, undefined, { camping })
        state.time = Math.max(now, state.time)
        state.day = d + 1
        state.travelledToday = 0
        state.dayChecksDone = false
        // Today's declared values become yesterday's (false if unset); a new day starts clean.
        state.yesterday = Object.fromEntries(
          Object.keys(values).map((id) => [
            id,
            holds(state.today?.[id]) ? state.today![id] : false,
          ]),
        )
        delete state.today
        delete state.reached
        state.speedToday = undefined
        delete state.actionsToday
      }
      events.push({ type: 'DAY_STARTED', day: state.day })
    } finally {
      syncing = false
    }
  }

  const travel = (
    state: TravelState,
    until: 'hex' | 'destination',
    events: TravelEvent[],
  ): void => {
    const stop = (reason: StopReason): void => {
      events.push({ type: 'TRAVEL_STOPPED', reason, time: state.time })
    }
    syncDay(state, events)
    const start = calendar.at(state.day, rules.day.start)
    const nightfall = calendar.at(state.day, rules.day.nightfall)
    if (state.time < start) state.time = start
    if (!state.route || state.route.length < 2) {
      if (state.destination && state.destination === state.location)
        events.push({ type: 'DESTINATION_REACHED', hex: state.location })
      return stop(state.route ? 'destination' : 'no-route')
    }
    if (!state.dayChecksDone && state.time < nightfall) {
      state.dayChecksDone = true
      schedule(state, 'day-start', events)
    }
    if (state.pendingChecks.length) return stop('check')
    const blocked = blocker(state, 'travel')
    if (blocked) {
      events.push({ type: 'TRAVEL_STOPPED', reason: 'value', value: blocked, time: state.time })
      return
    }
    if (dayFactor(state) <= 0) return stop('weather')

    for (;;) {
      const next = state.route[1]
      if (!next) {
        events.push({ type: 'DESTINATION_REACHED', hex: state.location })
        return stop('destination')
      }
      const cost = stepMinutes(state, state.location, next)
      if (!Number.isFinite(cost)) {
        events.push({ type: 'ROUTE_BLOCKED', from: state.location, to: next })
        return stop('blocked')
      }
      const untilNight = nightfall - state.time
      const untilLimit = dayMinutes - state.travelledToday
      const available = Math.min(untilNight, untilLimit)
      if (available <= 0) return stop(untilNight <= untilLimit ? 'nightfall' : 'day-limit')
      const remaining = cost - state.progress
      if (remaining > available) {
        state.time += available
        state.travelledToday += available
        state.progress += available
        return stop(untilNight <= untilLimit ? 'nightfall' : 'day-limit')
      }
      state.time += remaining
      state.travelledToday += remaining
      state.progress = 0
      const from = state.location
      state.location = next
      state.route = state.route.slice(1)
      events.push({ type: 'HEX_ENTERED', hex: next, time: state.time })
      schedule(state, 'hex-enter', events, from)
      if (state.route.length < 2) {
        events.push({ type: 'DESTINATION_REACHED', hex: next })
        return stop('destination')
      }
      if (state.pendingChecks.length) return stop('check')
      if (until === 'hex') return stop('hex')
    }
  }

  /**
   * Waits until `until`, moment by moment: dawn (day-start checks), nightfall (the system's
   * camp, if it has one and the party hasn't camped today), midnight (the day's supplies and
   * day-end checks). Stops when a check comes up (the host resolves it and waits on), or when
   * night falls and the party can't camp. Camping may end past `until` (it lasts till dawn).
   */
  const wait = (state: TravelState, until: GameTime, events: TravelEvent[]): void => {
    const stop = (reason: StopReason, because?: Unavailable): void => {
      events.push({ type: 'TRAVEL_STOPPED', reason, time: state.time, ...(because && { because }) })
    }
    for (let guard = 0; guard < 10000; guard++) {
      syncDay(state, events)
      if (state.pendingChecks.length) return stop('check')
      if (state.time >= until) return stop('waited')
      const dawn = calendar.at(state.day, rules.day.start)
      const nightfall = calendar.at(state.day, rules.day.nightfall)
      if (!state.dayChecksDone && state.time >= dawn && state.time < nightfall) {
        state.dayChecksDone = true
        schedule(state, 'day-start', events)
        continue
      }
      if (state.time >= nightfall && actions.camp && !state.actionsToday?.includes('camp')) {
        const because = unavailable(state, 'camp', hostFacts)
        if (because) return stop('camp', because)
        takeAction(state, 'camp', events)
        continue
      }
      const next =
        state.time < dawn
          ? dawn
          : state.time < nightfall
            ? nightfall
            : calendar.at(state.day + 1, 0)
      state.time = Math.min(until, next)
    }
  }

  /** Why an action can't be taken now (undefined: it can). */
  const unavailable = (
    state: TravelState,
    id: string,
    facts: HostFacts,
    moment: Record<string, unknown> = {},
  ): Unavailable | undefined => {
    const def = actions.all[id]
    if (!def) return { off: true }
    const value = blocker(state, id)
    if (value) return { value }
    if (def.oncePerDay && state.actionsToday?.includes(id)) return { once: true }
    const context = { ...checkContext(state, [], facts), ...moment }
    if (def.when && !matches(def.when as Condition, context)) return { condition: 'when' }
    if (def.unless && matches(def.unless as Condition, context)) return { condition: 'unless' }
    return undefined
  }

  /** Why a way of travelling can't be chosen now (undefined: it can). */
  const modeUnavailable = (
    state: TravelState,
    id: string,
    facts: HostFacts,
  ): Unavailable | undefined => {
    const mode = rules.modes[id]
    if (!mode) return { off: true }
    const value = blocker(state, `mode.${id}`)
    if (value) return { value }
    const context = checkContext(state, [], facts)
    if (mode.when && !matches(mode.when as Condition, context)) return { condition: 'when' }
    if (mode.unless && matches(mode.unless as Condition, context)) return { condition: 'unless' }
    return undefined
  }

  /** The moment a `time` step goes to: minutes from now, or the next dawn / nightfall / clock. */
  const timeOf = (state: TravelState, time: NonNullable<ActionStep['time']>): GameTime =>
    typeof time === 'number'
      ? state.time + time
      : nextAt(
          calendar,
          state.time + 1,
          time === 'dawn' ? rules.day.start : time === 'nightfall' ? rules.day.nightfall : time,
        )

  type Hits = { below: Set<string>; above: Set<string> }
  /** What hit a bound during each action under way: its later steps see it past midnight. */
  const underWay: Hits[] = []

  /** Notes that a value hit a bound today (`below` / `above`), by id. */
  const reach = (state: TravelState, id: string, limit: 'min' | 'max'): void => {
    const key = limit === 'min' ? 'below' : 'above'
    const list = state.reached?.[key] ?? []
    if (!list.includes(id)) state.reached = { ...state.reached, [key]: [...list, id] }
    for (const hits of underWay) hits[key].add(id)
  }

  /**
   * A step's effects: supplies change here (within their bounds), the party's stats in the
   * host's facts (so later steps see them; the host applies them for real from the event).
   */
  const applyEffects = (
    state: TravelState,
    action: string,
    effects: Record<string, number | string>,
    events: TravelEvent[],
  ): void => {
    const limits: TravelEvent[] = []
    const party = hostFacts.party as { stats?: Record<string, number> } | undefined
    for (const [path, change] of Object.entries(effects)) {
      const [, scope, id] = /^party\.(stats|resources)\.(.+)$/.exec(path) ?? []
      if (!scope) continue
      const own = scope === 'resources'
      const values: Record<string, number> = own ? state.resources : (party?.stats ?? {})
      const from = values[id] ?? 0
      const { to, limit } = changeValue(from, change, (own ? supplies : options.stats)?.[id])
      values[id] = to
      // A stat by its own name too (`{{fatigue}}`), unless something else hides it.
      if (!own && hostFacts[id] === from) hostFacts[id] = to
      if (limit) {
        reach(state, id, limit)
        limits.push({ type: 'LIMIT_REACHED', path, limit, value: to, time: state.time })
      }
    }
    events.push({ type: 'EFFECTS', action, effects, time: state.time }, ...limits)
  }

  /**
   * Takes an action: its journal line (camp, rest or the action), the actions that follow
   * it (`on: <its id>`) and its checks (`at: <its id>`), then its steps in order, each only
   * when its condition holds. Taken by the system (`on`, a `do:` step), it's `quiet`: when
   * it isn't available it just doesn't happen.
   */
  const takeAction = (
    state: TravelState,
    id: string,
    events: TravelEvent[],
    options: {
      minutes?: number
      /** The moment or action that took it by itself. */
      on?: string
      /** Facts of that moment for its conditions (`camping` at day-end). */
      facts?: Record<string, unknown>
      quiet?: boolean
      depth?: number
    } = {},
  ): void => {
    const depth = options.depth ?? 0
    // Validation rejects loops; this only guards rules that were never validated.
    if (depth > 32) return
    const because = unavailable(state, id, hostFacts, options.facts)
    if (because) {
      if (!options.quiet) events.push({ type: 'ACTION_UNAVAILABLE', action: id, because })
      return
    }
    syncDay(state, events)
    let steps = actionSteps(id, actions.all[id])
    // A rest of a length chosen by hand replaces the rules' time.
    if (options.minutes !== undefined)
      steps = [
        { time: Math.max(0, options.minutes) },
        ...steps.filter((s) => typeof s.time !== 'number'),
      ]
    const start = state.time
    const cell = world.cell(state.location)
    const head =
      id === 'camp'
        ? { type: 'CAMP_STARTED' as const, time: start }
        : id === 'rest'
          ? { type: 'RESTED' as const, minutes: 0, time: start }
          : {
              type: 'ACTION_TAKEN' as const,
              action: id,
              time: start,
              minutes: 0,
              checks: 0,
              hex: state.location,
              ...(cell?.terrain && { terrain: cell.terrain }),
              ...(options.on && { on: options.on }),
            }
    events.push(head)
    state.actionsToday = [...(state.actionsToday ?? []), id]
    // Its checks see the place and moment it starts (after the actions that follow it).
    const checks = schedule(state, id, events, undefined, options.facts)
    if (head.type === 'ACTION_TAKEN') head.checks = checks
    // What hit a bound today, and during the action: its later steps see it past midnight.
    const hit: Hits = {
      below: new Set(state.reached?.below),
      above: new Set(state.reached?.above),
    }
    underWay.push(hit)
    try {
      runSteps(state, id, steps, hit, events, options, depth)
    } finally {
      underWay.pop()
    }
    if (head.type !== 'CAMP_STARTED') head.minutes = state.time - start
  }

  /** An action's steps in order, each only when its condition holds. */
  const runSteps = (
    state: TravelState,
    id: string,
    steps: ActionStep[],
    hit: Hits,
    events: TravelEvent[],
    options: { facts?: Record<string, unknown> },
    depth: number,
  ): void => {
    for (const step of steps) {
      const context = {
        ...checkContext(state, [], hostFacts),
        below: [...hit.below],
        above: [...hit.above],
        short: hit.below.size > 0,
        camping: id === 'camp',
        ...options.facts,
      }
      if (step.when && !matches(step.when, context)) continue
      if (step.unless && matches(step.unless, context)) continue
      if (step.time !== undefined) {
        state.time = Math.max(state.time, timeOf(state, step.time))
        syncDay(state, events, id === 'camp')
      } else if (step.speed !== undefined) state.speedToday = (state.speedToday ?? 1) * step.speed
      else if (step.effects) applyEffects(state, id, step.effects, events)
      else if (step.do !== undefined)
        takeAction(state, step.do, events, { facts: options.facts, quiet: true, depth: depth + 1 })
      else if (step.roll !== undefined)
        schedule(state, id, events, undefined, options.facts, step.roll)
      else if (step.set) state.today = { ...state.today, ...step.set }
    }
  }

  return {
    stepMinutes,
    plan,
    availability(input, facts = {}) {
      const state = upgradeTravelState(input)
      const out: Record<string, Unavailable> = {}
      const travelBlocked = blocker(state, 'travel')
      if (travelBlocked) out.travel = { value: travelBlocked }
      for (const id of Object.keys(actions.all)) {
        const why = unavailable(state, id, facts)
        if (why) out[id] = why
      }
      for (const id of Object.keys(rules.modes)) {
        const why = modeUnavailable(state, id, facts)
        if (why) out[`mode.${id}`] = why
      }
      return out
    },
    apply(input, action, facts = {}) {
      const state = structuredClone(upgradeTravelState(input))
      // Older trips: a day already eaten by `eat: day` is the day-end eating done today.
      if (state.ate) {
        if (state.ate.day === state.day)
          state.actionsToday = [...(state.actionsToday ?? []), olderEatingId(rules)]
        delete state.ate
      }
      const events: TravelEvent[] = []
      // A copy: actions' effects change the party's stats in it as their steps go.
      const party = facts.party as { stats?: Record<string, number> } | undefined
      hostFacts = party
        ? { ...facts, party: { ...party, stats: { ...party.stats } } }
        : { ...facts }
      switch (action.type) {
        case 'setDestination': {
          const strategy = action.strategy ?? 'fastest'
          const route = plan(state, action.hex, strategy)
          if (!route) {
            events.push({ type: 'NO_ROUTE', to: action.hex })
            break
          }
          if (state.route?.[1] !== route[1]) state.progress = 0
          state.destination = action.hex
          state.route = route
          events.push({ type: 'ROUTE_PLANNED', route, strategy })
          break
        }
        case 'travel':
          travel(state, action.until ?? 'destination', events)
          break
        case 'advanceTime':
          state.time += Math.max(0, action.minutes)
          syncDay(state, events)
          break
        case 'wait':
          wait(state, action.until, events)
          break
        case 'camp':
          takeAction(state, 'camp', events)
          break
        case 'rest':
          takeAction(state, 'rest', events, { minutes: action.minutes })
          break
        case 'action':
          takeAction(state, action.id, events)
          break
        case 'setMode': {
          if (action.mode === state.mode) break
          const because = modeUnavailable(state, action.mode, hostFacts)
          if (because)
            events.push({ type: 'ACTION_UNAVAILABLE', action: `mode.${action.mode}`, because })
          else state.mode = action.mode
          break
        }
        case 'setWeather':
          state.weather = action.weather
          break
        case 'resolveCheck': {
          const index = state.pendingChecks.findIndex((c) => c.id === action.id)
          if (index < 0) break
          const [check] = state.pendingChecks.splice(index, 1)
          const outcome = action.outcome ?? check.rolled ?? {}
          const set = { ...(outcome.lost && { lost: true }), ...outcome.values }
          if (Object.keys(set).length) state.today = { ...state.today, ...set }
          if (outcome.weather !== undefined) state.weather = outcome.weather
          if (outcome.speed !== undefined)
            state.speedToday = (state.speedToday ?? 1) * outcome.speed
          for (const [id, delta] of Object.entries(outcome.resources ?? {}))
            state.resources[id] = changeValue(state.resources[id] ?? 0, delta, supplies[id]).to
          events.push({ type: 'CHECK_RESOLVED', id: action.id, outcome })
          break
        }
      }
      return { state, events }
    },
  }
}

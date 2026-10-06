import { matches } from '@open-tabletop/conditions'
import { findPath } from '@open-tabletop/hex'
import { defaultCalendar, nextAt, type Calendar, type GameTime } from '@open-tabletop/time'
import { availableActions, type CheckRule, type TravelRules } from './rules'

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
}

export interface CheckOutcome {
  /** The party got lost: no more travel today. */
  lost?: boolean
  weather?: string
  /** Movement multiplier for the rest of the day (e.g. 0.5 when foraging). */
  speed?: number
  resources?: Record<string, number>
  fatigue?: number
}

export interface TravelState {
  time: GameTime
  location: string
  destination?: string
  /** Planned hexes from the current location ([0]) to the destination. */
  route?: string[]
  mode: string
  resources: Record<string, number>
  fatigue: number
  weather?: string
  /** Minutes already spent towards route[1]. */
  progress: number
  /** Calendar day the daily counters belong to. */
  day: number
  travelledToday: number
  dayChecksDone: boolean
  lostToday: boolean
  speedToday?: number
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
  | 'lost'
  | 'no-route'
  | 'weather'

export type TravelEvent =
  | { type: 'DAY_STARTED'; day: number }
  | { type: 'ROUTE_PLANNED'; route: string[]; strategy: RouteStrategy }
  | { type: 'NO_ROUTE'; to: string }
  | { type: 'HEX_ENTERED'; hex: string; time: GameTime }
  | { type: 'CHECK_REQUIRED'; check: PendingCheck; time: GameTime }
  | { type: 'CHECK_RESOLVED'; id: string; outcome: CheckOutcome }
  | { type: 'DESTINATION_REACHED'; hex: string }
  | { type: 'ROUTE_BLOCKED'; from: string; to: string }
  | { type: 'TRAVEL_STOPPED'; reason: StopReason; time: GameTime }
  | { type: 'CAMP_STARTED'; time: GameTime }
  | { type: 'RESOURCE_DEPLETED'; resource: string }
  | { type: 'ACTION_UNAVAILABLE'; action: string }

export type RouteStrategy = 'shortest' | 'fastest'

export type TravelAction =
  | { type: 'setDestination'; hex: string; strategy?: RouteStrategy }
  | { type: 'travel'; until?: 'hex' | 'destination' }
  | { type: 'advanceTime'; minutes: number }
  | { type: 'camp' }
  /** Short rest; length and fatigue recovery come from the rules unless given. */
  | { type: 'rest'; minutes?: number }
  | { type: 'setMode'; mode: string }
  | { type: 'setWeather'; weather: string | undefined }
  | { type: 'resolveCheck'; id: string; outcome?: CheckOutcome }

export interface TravelEngine {
  apply(state: TravelState, action: TravelAction): { state: TravelState; events: TravelEvent[] }
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
    fatigue: 0,
    progress: 0,
    day: (init.calendar ?? defaultCalendar).describe(time).day,
    travelledToday: 0,
    dayChecksDone: false,
    lostToday: false,
    pendingChecks: [],
    nextCheckId: 1,
  }
}

export function createTravelEngine(options: {
  world: TravelWorld
  rules: TravelRules
  calendar?: Calendar
}): TravelEngine {
  const { world, rules } = options
  const calendar = options.calendar ?? defaultCalendar
  const dayMinutes = rules.travel.hoursPerDay * 60
  const actions = availableActions(rules)

  /** Terrain/edge multiplier for entering `b` from `a` (0 or Infinity-safe). */
  const multiplier = (state: TravelState, a: string, b: string): number => {
    const mode = rules.modes[state.mode]
    const cell = world.cell(b)
    if (!mode || !cell) return 0
    const terrain = cell.terrain
    // A terrain's own rule wins; water hexes without one follow the `water` rule.
    const terrainRule =
      (terrain ? rules.terrains[terrain] : undefined) ?? (cell.water ? rules.water : undefined)
    if (mode.allowedTerrains) {
      // "Only through" these terrains (`water` = any water hex): they're open to this mode.
      const allowed =
        (!!terrain && mode.allowedTerrains.includes(terrain)) ||
        (!!cell.water && mode.allowedTerrains.includes('water'))
      if (!allowed) return 0
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
  const checkContext = (state: TravelState, [a, b]: string[] = []): Record<string, unknown> => {
    const cell = world.cell(state.location)
    return {
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
    }
  }

  const schedule = (
    state: TravelState,
    at: CheckRule['at'],
    events: TravelEvent[],
    from?: string,
  ): void => {
    const next = state.route?.[1]
    const stretch = from ? [from, state.location] : next ? [state.location, next] : []
    const context = checkContext(state, stretch)
    for (const rule of (rules.checks ?? []) as CheckRule[]) {
      if (rule.at !== at) continue
      if (rule.when && !matches(rule.when, context)) continue
      if (rule.unless && matches(rule.unless, context)) continue
      const check: PendingCheck = { id: `c${state.nextCheckId++}`, event: rule.event, context }
      state.pendingChecks.push(check)
      events.push({ type: 'CHECK_REQUIRED', check, time: state.time })
    }
  }

  /** Supplies used per day (resources' perDay plus what the travel mode consumes). */
  const dailyConsumption = (state: TravelState): Record<string, number> => {
    const consumption: Record<string, number> = {}
    for (const [id, r] of Object.entries(rules.resources ?? {}))
      consumption[id] = (consumption[id] ?? 0) + (r.perDay ?? 0)
    for (const [id, n] of Object.entries(rules.modes[state.mode]?.consumes ?? {}))
      consumption[id] = (consumption[id] ?? 0) + n
    return consumption
  }

  /** Eats one day of supplies; going without raises fatigue. Returns true if short. */
  const eatOneDay = (state: TravelState, events: TravelEvent[]): boolean => {
    let short = false
    for (const [id, amount] of Object.entries(dailyConsumption(state))) {
      if (amount <= 0) continue
      const left = (state.resources[id] ?? 0) - amount
      if (left < 0) {
        short = true
        events.push({ type: 'RESOURCE_DEPLETED', resource: id })
      }
      state.resources[id] = Math.max(0, left)
    }
    if (short) state.fatigue += 1
    return short
  }

  /**
   * Starts a new day when the calendar day changed: supplies are eaten for every day
   * that ended (whatever passed the time: camping, resting, waiting), and the daily
   * counters reset. Returns true if the party went short of supplies.
   */
  const syncDay = (state: TravelState, events: TravelEvent[]): boolean => {
    const { day } = calendar.describe(state.time)
    if (day <= state.day) return false
    let short = false
    for (let d = state.day; d < day; d++) short = eatOneDay(state, events) || short
    state.day = day
    state.travelledToday = 0
    state.dayChecksDone = false
    state.lostToday = false
    state.speedToday = undefined
    events.push({ type: 'DAY_STARTED', day })
    return short
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
    if (state.lostToday) return stop('lost')
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

  /** Ends the day: night checks, sleep until dawn (supplies are eaten as the day ends). */
  const camp = (state: TravelState, events: TravelEvent[]): void => {
    events.push({ type: 'CAMP_STARTED', time: state.time })
    schedule(state, 'camp', events)
    state.time = nextAt(calendar, state.time + 1, rules.day.start)
    const short = syncDay(state, events)
    // A fed night's sleep recovers fatigue.
    if (!short) state.fatigue = Math.max(0, state.fatigue - 1)
  }

  return {
    stepMinutes,
    plan,
    apply(input, action) {
      const state = structuredClone(input)
      const events: TravelEvent[] = []
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
        case 'camp':
          if (!actions.camp) events.push({ type: 'ACTION_UNAVAILABLE', action: 'camp' })
          else camp(state, events)
          break
        case 'rest': {
          if (!actions.rest) {
            events.push({ type: 'ACTION_UNAVAILABLE', action: 'rest' })
            break
          }
          state.time += Math.max(0, action.minutes ?? actions.rest.minutes)
          syncDay(state, events)
          state.fatigue = Math.max(0, state.fatigue - actions.rest.fatigue)
          break
        }
        case 'setMode':
          if (rules.modes[action.mode]) state.mode = action.mode
          break
        case 'setWeather':
          state.weather = action.weather
          break
        case 'resolveCheck': {
          const index = state.pendingChecks.findIndex((c) => c.id === action.id)
          if (index < 0) break
          state.pendingChecks.splice(index, 1)
          const outcome = action.outcome ?? {}
          if (outcome.lost) state.lostToday = true
          if (outcome.weather !== undefined) state.weather = outcome.weather
          if (outcome.speed !== undefined)
            state.speedToday = (state.speedToday ?? 1) * outcome.speed
          for (const [id, delta] of Object.entries(outcome.resources ?? {}))
            state.resources[id] = Math.max(0, (state.resources[id] ?? 0) + delta)
          if (outcome.fatigue) state.fatigue = Math.max(0, state.fatigue + outcome.fatigue)
          events.push({ type: 'CHECK_RESOLVED', id: action.id, outcome })
          break
        }
      }
      return { state, events }
    },
  }
}

import { matches, type Condition } from '@open-tabletop/conditions'
import { findPath } from '@open-tabletop/hex'
import { momentRoller, type Roller } from '@open-tabletop/variables'
import {
  defaultCalendar,
  nextAt,
  parseClock,
  type Calendar,
  type CalendarParts,
  type GameTime,
  type TimeParts,
} from '@open-tabletop/time'
import {
  actionSteps,
  availableActions,
  changeValue,
  isPassable,
  momentsOf,
  modeThrough,
  declaredValues,
  nightAction,
  MARCH,
  olderEatingId,
  resolveChange,
  resourceBounds,
  type ActionStep,
  type Bounds,
  type CheckRule,
  type TravelRules,
} from './rules'
import { hexIdOf, qualify } from './facts'

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

/**
 * What a trip has done so far, for the trip panel and for conditions and tables
 * (`trip.hexes`, `trip.km`, `trip.hours`, `trip.taken.camp`, `trip.checks`,
 * `trip.spent.food`, `trip.gained.food`).
 */
export interface TripTotals {
  /** Hexes entered (`trip.km` is them at the map's scale). */
  hexes: number
  /** Minutes marched (`trip.hours`). */
  marched: number
  /** Times each of the system's actions was taken, by the player or by itself. */
  taken: Record<string, number>
  /** Checks that came up. */
  checks: number
  /** How much effects took from each supply, and added to it (hand edits don't count). */
  spent: Record<string, number>
  gained: Record<string, number>
}

/** A trip that has done nothing yet. */
export const noTotals = (): TripTotals => ({
  hexes: 0,
  marched: 0,
  taken: {},
  checks: 0,
  spent: {},
  gained: {},
})

/** Counts a supply's change in the trip's totals (spent when it went down, gained when up). */
export function tallySupply(
  travel: { totals?: TripTotals },
  id: string,
  from: number,
  to: number,
): void {
  if (to === from) return
  const totals = (travel.totals ??= noTotals())
  const key = to < from ? 'spent' : 'gained'
  totals[key] = { ...totals[key], [id]: (totals[key][id] ?? 0) + Math.abs(to - from) }
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
  /** The day the trip started (`tripDay` counts from it; absent in older trips). */
  firstDay?: number
  /** Times the party has been in each hex this trip, the one it starts in included. */
  visits?: Record<string, number>
  /** The system's own actions done today (for `oncePerDay`). */
  actionsToday?: string[]
  /**
   * What the trip's rolls in conditions and effects (`'{{1d20}}'`) are seeded with, with the
   * day, hex and moment (see `momentRolls`); older trips have none.
   */
  seed?: string
  /** What the trip has done so far (absent in older trips: counted from then on). */
  totals?: TripTotals
  pendingChecks: PendingCheck[]
  nextCheckId: number
}

export type StopReason =
  | 'destination'
  | 'hex'
  | 'nightfall'
  | 'day-limit'
  /** The system's own rule for marching (`actions.march`) doesn't hold now. */
  | 'march'
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
  /** Night fell on a wait and the party can't take the night's action (`because` says why). */
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
      /** With `value`: who has it, when it's a member's condition (the host's `party.blocked`). */
      who?: string
      /** With `camp`: the night's action, which the party can't take (`because`). */
      action?: string
      because?: Unavailable
    }
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
  /**
   * Night fell and the party couldn't take the night's action (`day.night`, camp by
   * default; `because` says why): the night passes without it, on to the next day.
   */
  | { type: 'NIGHT_WITHOUT'; action: string; because: Unavailable; time: GameTime }
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

type StoppedEvent = Extract<TravelEvent, { type: 'TRAVEL_STOPPED' }>

/**
 * Why an action (or travelling) can't be done now: the system turns it off, a declared
 * value blocks it (`lost`), it was done today (`oncePerDay`), or its `when` / `unless`.
 */
export type Unavailable =
  | { off: true }
  /** A value of the day blocks it, or a member's condition (`who` has it). */
  | { value: string; who?: string }
  | { once: true }
  | { condition: 'when' | 'unless' }
  /** The trip is paused on a check (its event): it must be resolved first (Continue). */
  | { pending: string }

export type RouteStrategy = 'shortest' | 'fastest'

export type TravelAction =
  | { type: 'setDestination'; hex: string; strategy?: RouteStrategy }
  /**
   * Marches along the route. With `by` (a moment), the trip goes on by itself until then:
   * it marches each day, passes each night (the system's night action, or the night
   * without it), and waits where it ends up once the route is done.
   */
  | { type: 'travel'; until?: 'hex' | 'destination'; by?: GameTime }
  | { type: 'advanceTime'; minutes: number }
  /**
   * Waits where the party is until a moment, living it: day-start and day-end checks and
   * actions, the system's camp at nightfall. Stops early when a check is pending.
   */
  | { type: 'wait'; until: GameTime }
  /**
   * One of the system's actions (`actions.<id>` in the rules), e.g. camp or forage. With
   * `minutes`, a length chosen by hand replaces the time its steps pass.
   */
  | { type: 'action'; id: string; minutes?: number }
  /** Older forms of `{ type: 'action', id: 'camp' }` and `'rest'`. */
  | { type: 'camp' }
  | { type: 'rest'; minutes?: number }
  | { type: 'setMode'; mode: string }
  | { type: 'setWeather'; weather: string | undefined }
  | { type: 'resolveCheck'; id: string; outcome?: CheckOutcome }

/**
 * What the host knows that conditions may read besides the trip's facts: the party's
 * stats, today's values, `yesterday` (the session passes `tripContext`). `party.blocked`
 * says what else is blocked and by what (`{ travel: { value: 'wounded', who: 'kael' } }`).
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
  /** What conditions and tables see now where the party is (the host's facts included). */
  context(state: TravelState, facts?: HostFacts): Record<string, unknown>
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
  /** Seeds the trip's rolls in conditions and effects (any text; the host picks one). */
  seed?: string
}): TravelState {
  const time = init.time ?? 0
  return {
    time,
    location: init.location,
    mode: init.mode,
    resources: { ...init.resources },
    progress: 0,
    day: (init.calendar ?? defaultCalendar).describe(time).day,
    firstDay: (init.calendar ?? defaultCalendar).describe(time).day,
    visits: { [init.location]: 1 },
    travelledToday: 0,
    dayChecksDone: false,
    totals: noTotals(),
    pendingChecks: [],
    nextCheckId: 1,
    ...(init.seed !== undefined && { seed: init.seed }),
  }
}

/**
 * The rolls a trip's conditions and effects make (`gte: '{{1d20}}'`), fixed for a moment:
 * the same dice give the same total all through the same day, hex and moment (a moment
 * such as `hex-enter`, or the action being taken), however many times they're read, so
 * what's available, the route and the checks don't change when they're looked at again.
 */
export function momentRolls(
  state: Pick<TravelState, 'seed' | 'day' | 'location'>,
  hex: string = state.location,
  moment = '',
): Roller {
  return momentRoller(`${state.seed ?? ''}|${state.day}|${hex}|${moment}`)
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
    monthDay: parts.month.day,
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
  const night = nightAction(rules)
  const values = declaredValues(rules)
  const supplies = resourceBounds(rules)
  /** Actions the system takes by itself, by the moment or action they follow. */
  const triggered = new Map<string, string[]>()
  for (const [id, def] of Object.entries(actions.all))
    for (const moment of momentsOf(def.on))
      triggered.set(moment, [...(triggered.get(moment) ?? []), id])
  /** A declared value holds while it's set to anything but false. */
  const holds = (v: unknown) => v !== undefined && v !== null && v !== false
  /**
   * Whether a condition holds where it's read, its rolls fixed for the moment: the hex it
   * reads (`hex`), and the moment (`moment`, else the one given: the action, `march`…).
   */
  const test = (
    state: TravelState,
    condition: Condition | undefined,
    seen: Record<string, unknown>,
    moment?: string,
  ): boolean => matches(condition, qualify(seen), { roller: rollsOf(state, seen, moment) })
  const rollsOf = (state: TravelState, seen: Record<string, unknown>, moment?: string) =>
    momentRolls(
      state,
      hexIdOf(seen) ?? state.location,
      typeof seen.moment === 'string' ? seen.moment : moment,
    )
  /**
   * What blocks `what` (travel, an action, `mode.<id>`) now, if anything: a value of the
   * day the system declares, or what the host says blocks it (`party.blocked`: a member's
   * condition, with who has it).
   */
  const blocker = (
    state: TravelState,
    what: string,
    facts: HostFacts = hostFacts,
  ): { value: string; who?: string } | undefined => {
    const value = Object.entries(values).find(
      ([id, v]) => v.blocks?.includes(what) && holds(state.today?.[id]),
    )?.[0]
    if (value) return { value }
    const party = facts.party as { blocked?: Record<string, unknown> } | undefined
    const held = party?.blocked?.[what] as { value?: unknown; who?: unknown } | undefined
    if (typeof held?.value !== 'string') return undefined
    return { value: held.value, ...(typeof held.who === 'string' && { who: held.who }) }
  }

  /** Whether it's day: between the system's dawn and nightfall of the day it is. */
  const isDaylight = (time: GameTime): boolean => {
    const { day } = calendar.describe(time)
    return time >= calendar.at(day, rules.day.start) && time < calendar.at(day, rules.day.nightfall)
  }

  /** The system's own day as numbers (hours), for conditions: `hour: { gte: '{{nightfall}}' }`. */
  const clockHours = (clock: string) => parseClock(clock) / 60
  /**
   * The moment as conditions read it: the season, the day, whether it's day, the hour
   * (`14.5` is 14:30), the calendar's watch, and the system's dawn, nightfall and
   * marching hours.
   */
  const clockFacts = (state: TravelState): Record<string, unknown> => {
    const parts = calendar.describe(state.time)
    return {
      season: parts.season,
      day: state.day,
      daylight: isDaylight(state.time),
      hour: parts.hour + parts.minute / 60,
      ...(parts.watch !== undefined && { watch: parts.watch }),
      dawn: clockHours(rules.day.start),
      nightfall: clockHours(rules.day.nightfall),
      hoursPerDay: rules.travel.hoursPerDay,
    }
  }
  /** A hex as conditions read it (`from.terrain`, `from.tags`, `from.region`…). */
  const hexFacts = (hex: string): Record<string, unknown> => {
    const cell = world.cell(hex)
    return {
      ...cell,
      id: hex,
      terrain: cell?.terrain,
      tags: cell?.tags ?? [],
      water: !!cell?.water,
    }
  }
  /** The neighbours of a hex together: every terrain, tag and region among them. */
  const aroundFacts = (hex: string): Record<string, unknown> => {
    type Cell = NonNullable<ReturnType<TravelWorld['cell']>>
    const cells = world.neighbors(hex).flatMap((h): Cell[] => {
      const cell = world.cell(h)
      return cell ? [cell] : []
    })
    const all = (pick: (c: Cell) => unknown) => [
      ...new Set(cells.flatMap((c) => [pick(c)].flat().filter((v) => v !== undefined))),
    ]
    return {
      terrain: all((c) => c.terrain),
      tags: all((c) => c.tags ?? []),
      region: all((c) => c.region),
      water: cells.some((c) => c.water),
    }
  }

  /**
   * What a way of travelling's "only through" and a terrain's `passable` see when stepping
   * from `a` into `b`: the hex entered (everything the map knows of it), the roads or rivers
   * of the step, the mode, the weather, the calendar (season, moons…) and today's values.
   * Light on purpose: route planning asks it for many hexes.
   */
  const throughContext = (state: TravelState, a: string, b: string): Record<string, unknown> => {
    const cell = world.cell(b)
    const date = calendar.describe(state.time)
    return {
      ...state.today,
      today: { ...state.today },
      ...calendarFacts(date),
      season: date.season,
      ...cell,
      hex: hexFacts(b),
      terrain: cell?.terrain,
      water: !!cell?.water,
      tags: cell?.tags ?? [],
      edges: world.edges(a, b),
      mode: state.mode,
      weather: state.weather,
      daylight: isDaylight(state.time),
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
      if (!test(state, through, throughContext(state, a, b))) return 0
    } else if (
      !isPassable(
        terrainRule?.passable,
        () => qualify(throughContext(state, a, b)),
        momentRolls(state, b),
      )
    )
      return 0
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
      hex: hexFacts(state.location),
      terrain: cell?.terrain,
      tags: cell?.tags ?? [],
      // The stretch given (the one just walked entering a hex), or else the one ahead.
      edges:
        a && b
          ? world.edges(a, b)
          : state.route?.[1]
            ? world.edges(state.location, state.route[1])
            : [],
      weather: state.weather,
      mode: state.mode,
      ...clockFacts(state),
      // Where the party stands among its neighbours: their terrains, tags and regions.
      around: aroundFacts(state.location),
      // How the day and the trip go.
      marched: state.travelledToday / 60,
      doneToday: state.actionsToday ?? [],
      routeLeft: state.route ? Math.max(0, state.route.length - 1) : 0,
      arrived: !!state.destination && state.destination === state.location,
      ...(state.firstDay !== undefined && { tripDay: state.day - state.firstDay + 1 }),
      visits: state.visits?.[state.location] ?? 0,
      // What the trip has done so far (only by its full names: `trip.km`…).
      trip: tripTotals(state),
      // Today's values (the host's, then the declared ones), and the day before's.
      today: { ...(facts.today as object | undefined), ...state.today },
      yesterday: { ...(facts.yesterday as object | undefined), ...state.yesterday },
      // What hit a bound today; `short` is how older rules read "something hit its minimum".
      below: state.reached?.below ?? [],
      above: state.reached?.above ?? [],
      short: !!state.reached?.below?.length,
      // What the engine knows of the party (the host adds its stats).
      party: { ...host, resources: { ...state.resources }, mode: state.mode },
    }
  }

  /** Every action and supply the system declares at 0, so `trip.taken.rite: 0` holds. */
  const zeros = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, 0]))
  const takenIds = Object.keys(actions.all).filter((id) => id !== MARCH)
  const supplyIds = Object.keys(rules.resources ?? {})
  /**
   * The trip's totals as conditions read them: `trip.km`, `trip.hours`, `trip.taken.camp`…
   * (each of the system's actions and supplies, 0 until it counts).
   */
  const tripTotals = (state: TravelState): Record<string, unknown> => {
    const totals = state.totals ?? noTotals()
    return {
      hexes: totals.hexes,
      km: totals.hexes * world.hexKm,
      hours: totals.marched / 60,
      taken: { ...zeros(takenIds), ...totals.taken },
      checks: totals.checks,
      spent: { ...zeros(supplyIds), ...totals.spent },
      gained: { ...zeros(supplyIds), ...totals.gained },
    }
  }
  /** The trip's totals, to count in (older trips start them now). */
  const totalsOf = (state: TravelState): TripTotals => (state.totals ??= noTotals())

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
        takeAction(state, id, events, { on: at, facts: { ...facts, moment: at }, quiet: true })
    // Conditions (and the tables) see which moment it is: a check may come at several.
    // Entering a hex, the one left: `from.terrain`, `from.region`…
    const left = from ? { from: hexFacts(from) } : {}
    const context = { ...checkContext(state, stretch), ...left, ...facts, moment: at }
    const seen = { ...checkContext(state, stretch, hostFacts), ...left, ...facts, moment: at }
    let scheduled = 0
    for (const rule of (rules.checks ?? []) as CheckRule[]) {
      if (event ? rule.event !== event : !momentsOf(rule.at).includes(at)) continue
      if (rule.when && !test(state, rule.when, seen)) continue
      if (rule.unless && test(state, rule.unless, seen)) continue
      const check: PendingCheck = {
        id: `c${state.nextCheckId++}`,
        event: rule.event,
        context,
        ...(rule.effects && { effects: rule.effects }),
        ...(rule.pause && { pause: true }),
      }
      state.pendingChecks.push(check)
      totalsOf(state).checks++
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
  const syncDay = (state: TravelState, events: TravelEvent[]): void => {
    if (syncing) return
    const { day } = calendar.describe(state.time)
    if (day <= state.day) return
    syncing = true
    try {
      const now = state.time
      for (let d = state.day; d < day; d++) {
        // The day ends at midnight (or now, if the day changed by hand).
        state.time = Math.min(now, calendar.at(d + 1, '00:00'))
        schedule(state, 'day-end', events, undefined, doingFacts())
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

  /**
   * Why the party can't march at `time`, having marched `marched` minutes today
   * (undefined: it can): the system's march (`actions.march`, its `when` / `unless`; by
   * default by day, for the day's marching hours) or a value of the day that blocks it.
   * Said as night falling, the day's hours spent, or the system's rule.
   */
  const marchStop = (
    state: TravelState,
    time: GameTime,
    marched: number,
  ): StopReason | undefined => {
    const now = { ...state, time, travelledToday: marched }
    const march = actions.all[MARCH]
    if (march && !blocker(now, MARCH)) {
      const seen = checkContext(now, [], hostFacts)
      if (
        (!march.when || test(now, march.when as Condition, seen, MARCH)) &&
        !(march.unless && test(now, march.unless as Condition, seen, MARCH))
      )
        return undefined
    }
    if (!isDaylight(time)) return 'nightfall'
    return marched >= dayMinutes ? 'day-limit' : 'march'
  }

  const travel = (
    state: TravelState,
    until: 'hex' | 'destination',
    events: TravelEvent[],
    by = Infinity,
  ): void => {
    const stop = (reason: StopReason): void => {
      events.push({ type: 'TRAVEL_STOPPED', reason, time: state.time })
    }
    syncDay(state, events)
    const start = calendar.at(state.day, rules.day.start)
    const nightfall = calendar.at(state.day, rules.day.nightfall)
    const midnight = calendar.at(state.day + 1, '00:00')
    if (!state.route || state.route.length < 2) {
      if (state.destination && state.destination === state.location)
        events.push({ type: 'DESTINATION_REACHED', hex: state.location })
      return stop(state.route ? 'destination' : 'no-route')
    }
    /** Dawn's checks, once the day has dawned: the first march of the day comes after them. */
    const dawnChecks = (): boolean => {
      if (state.dayChecksDone || state.time < start || state.time >= nightfall) return false
      state.dayChecksDone = true
      schedule(state, 'day-start', events)
      return state.pendingChecks.length > 0
    }
    dawnChecks()
    if (state.pendingChecks.length) return stop('check')
    // A value that blocks travel, or the way the party is travelling (`mode.horse`).
    const blocked = blocker(state, 'travel') ?? blocker(state, `mode.${state.mode}`)
    if (blocked) {
      events.push({ type: 'TRAVEL_STOPPED', reason: 'value', ...blocked, time: state.time })
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
      if (state.time >= by) return stop('waited')
      if (state.time >= midnight) return stop('nightfall')
      const why = marchStop(state, state.time, state.travelledToday)
      if (why) return stop(why)
      // March minute by minute while the system's march holds, up to the next hex, the
      // moment asked for, dawn (its checks come first) or midnight (a new day).
      // Already past it (the way got faster since: better weather…): the hex is entered now.
      const remaining = Math.max(0, cost - state.progress)
      let end = Math.min(by, midnight, state.time + remaining)
      if (state.time < start) end = Math.min(end, start)
      let time = state.time + 1
      while (time < end && !marchStop(state, time, state.travelledToday + time - state.time)) time++
      const marched = Math.min(time, end) - state.time
      state.time += marched
      state.travelledToday += marched
      totalsOf(state).marched += marched
      state.progress += marched
      if (state.progress < cost) {
        if (state.time >= by) return stop('waited')
        if (state.time === start) {
          if (dawnChecks()) return stop('check')
          continue
        }
        if (state.time >= midnight) return stop('nightfall')
        return stop(marchStop(state, state.time, state.travelledToday) ?? 'march')
      }
      const from = state.location
      enter(state, next, events)
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
   * The trip going on by itself until `by`: a day's march along the route, then the night
   * (the night's action, or the night without it) until the next dawn, and so on; once the
   * route is done (or there is none), it waits there. A day travel is blocked (a storm, a
   * value like lost) is a day lost, said in the journal. Stops early for a check (the host
   * resolves it and goes on) or a way blocked for good.
   */
  const journey = (
    state: TravelState,
    until: 'hex' | 'destination',
    by: GameTime,
    events: TravelEvent[],
  ): void => {
    const stopAt = (reason: StopReason): StoppedEvent => ({
      type: 'TRAVEL_STOPPED',
      reason,
      time: state.time,
    })
    const stop = (reason: StopReason): void => void events.push(stopAt(reason))
    for (let guard = 0; guard < 10000; guard++) {
      syncDay(state, events)
      if (state.pendingChecks.length) return stop('check')
      if (state.time >= by) return stop('waited')
      const dawn = calendar.at(state.day, rules.day.start)
      // Before dawn, the night goes on.
      if (state.time < dawn) {
        const waited = quietly(events, () => wait(state, Math.min(by, dawn), events))
        if (waited?.reason !== 'waited') return void events.push(waited ?? stopAt('waited'))
        continue
      }
      if (!state.route || state.route.length < 2) {
        if (state.destination && state.destination === state.location)
          events.push({ type: 'DESTINATION_REACHED', hex: state.location })
        return wait(state, by, events)
      }
      const stopped = quietly(events, () => travel(state, until, events, by))
      const reason = stopped?.reason
      if (reason === 'destination' || reason === 'no-route') return wait(state, by, events)
      // A value that blocks travel today (lost…) costs the day: said in the journal.
      if (reason === 'value') events.push(stopped!)
      // Nothing more to march today: the night, until the next dawn.
      if (
        reason === 'nightfall' ||
        reason === 'day-limit' ||
        reason === 'march' ||
        reason === 'weather' ||
        reason === 'value'
      ) {
        const next = Math.min(by, calendar.at(state.day + 1, rules.day.start))
        const waited = quietly(events, () => wait(state, next, events))
        if (waited?.reason !== 'waited') return void events.push(waited ?? stopAt('waited'))
        continue
      }
      return void events.push(stopped ?? stopAt('check'))
    }
  }

  /** Runs `go` and takes its stop back out of `events`, to say why it stopped. */
  const quietly = (events: TravelEvent[], go: () => void): StoppedEvent | undefined => {
    const at = events.length
    go()
    const index = events.findLastIndex((e, i) => i >= at && e.type === 'TRAVEL_STOPPED')
    return index < 0 ? undefined : (events.splice(index, 1)[0] as StoppedEvent)
  }

  /**
   * A travel order with nothing left to march today (night fell, the day's hours are spent,
   * or the weather keeps the party in) while the night's action can't be taken (no food to camp…) or the system has
   * none: the night passes, without it, and the march goes on at dawn. Otherwise the
   * party stops, for the player to camp.
   */
  const travelOn = (state: TravelState, until: 'hex' | 'destination', events: TravelEvent[]) => {
    const time = state.time
    const stopped = quietly(events, () => travel(state, until, events))
    const stuck =
      state.time === time &&
      (stopped?.reason === 'nightfall' ||
        stopped?.reason === 'day-limit' ||
        stopped?.reason === 'march' ||
        stopped?.reason === 'weather') &&
      (!night || unavailable(state, night, hostFacts))
    if (!stuck) return void (stopped && events.push(stopped))
    const waited = quietly(events, () =>
      wait(state, calendar.at(state.day + 1, rules.day.start), events),
    )
    if (waited?.reason !== 'waited') return void events.push(waited ?? stopped!)
    travel(state, until, events)
  }

  /**
   * Waits until `until`, moment by moment: dawn (day-start checks), nightfall (the system's
   * camp, if it has one and the party hasn't camped today), midnight (the day's supplies and
   * day-end checks). Stops when a check comes up (the host resolves it and waits on). A
   * night whose action can't be taken (no food to camp…) passes without it. Camping may
   * end past `until` (it lasts till dawn).
   */
  const wait = (state: TravelState, until: GameTime, events: TravelEvent[]): void => {
    const stop = (reason: StopReason, because?: Unavailable): void => {
      events.push({ type: 'TRAVEL_STOPPED', reason, time: state.time, ...(because && { because }) })
    }
    /** The day whose night passed without the night's action. */
    let without = -1
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
      if (
        state.time >= nightfall &&
        night &&
        without !== state.day &&
        !state.actionsToday?.includes(night)
      ) {
        const because = unavailable(state, night, hostFacts)
        if (!because) {
          takeAction(state, night, events)
          continue
        }
        // Without its night's action (no food to camp…), the night still passes.
        events.push({ type: 'NIGHT_WITHOUT', action: night, because, time: state.time })
        without = state.day
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
    // Marching isn't taken like an action: it's the Travel buttons.
    if (!def || id === MARCH) return { off: true }
    const value = blocker(state, id, facts)
    if (value) return value
    if (def.oncePerDay && state.actionsToday?.includes(id)) return { once: true }
    const context = { ...checkContext(state, [], facts), ...moment }
    if (def.when && !test(state, def.when as Condition, context, id)) return { condition: 'when' }
    if (def.unless && test(state, def.unless as Condition, context, id))
      return { condition: 'unless' }
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
    const value = blocker(state, `mode.${id}`, facts)
    if (value) return value
    const context = checkContext(state, [], facts)
    const at = `mode.${id}`
    if (mode.when && !test(state, mode.when as Condition, context, at)) return { condition: 'when' }
    if (mode.unless && test(state, mode.unless as Condition, context, at))
      return { condition: 'unless' }
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
  /** The actions under way, the one the player (or a moment) started first. */
  const doing: string[] = []
  /**
   * What conditions see of the action under way: `doing` (its id) and `camping` (it's the
   * night's action: older packs' way of asking whether the day ended in camp).
   */
  const doingFacts = () => ({ doing: doing[0], camping: !!night && doing[0] === night })
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
    written: Record<string, number | string>,
    events: TravelEvent[],
    /** The rolls they make (`'-{{1d3}}'`): the step's moment's. */
    roller: Roller,
  ): void => {
    const limits: TravelEvent[] = []
    const party = hostFacts.party as { stats?: Record<string, number> } | undefined
    // The variables they name (`'-{{party.stats.mouths}}'`) are read now, before any changes.
    const now = checkContext(state, [], hostFacts)
    const effects = Object.fromEntries(
      Object.entries(written).map(([path, change]) => [path, resolveChange(change, now, roller)]),
    )
    for (const [path, change] of Object.entries(effects)) {
      const [, scope, id] = /^party\.(stats|resources)\.(.+)$/.exec(path) ?? []
      if (!scope) continue
      const own = scope === 'resources'
      const values: Record<string, number> = own ? state.resources : (party?.stats ?? {})
      const from = values[id] ?? 0
      const { to, limit } = changeValue(from, change, (own ? supplies : options.stats)?.[id])
      values[id] = to
      if (own) tallySupply(state, id, from, to)
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
    let steps = actionSteps(actions.all[id])
    // A rest of a length chosen by hand replaces the rules' time.
    if (options.minutes !== undefined)
      steps = [
        { time: Math.max(0, options.minutes) },
        ...steps.filter((s) => typeof s.time !== 'number'),
      ]
    const start = state.time
    const cell = world.cell(state.location)
    const head = {
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
    const totals = totalsOf(state)
    totals.taken = { ...totals.taken, [id]: (totals.taken[id] ?? 0) + 1 }
    // Its checks see the place and moment it starts (after the actions that follow it).
    const checks = schedule(state, id, events, undefined, options.facts)
    head.checks = checks
    // What hit a bound today, and during the action: its later steps see it past midnight.
    const hit: Hits = {
      below: new Set(state.reached?.below),
      above: new Set(state.reached?.above),
    }
    underWay.push(hit)
    doing.push(id)
    try {
      runSteps(state, id, steps, hit, events, options, depth)
    } finally {
      underWay.pop()
      doing.pop()
    }
    head.minutes = state.time - start
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
        ...doingFacts(),
        ...options.facts,
      }
      if (step.when && !test(state, step.when, context, id)) continue
      if (step.unless && test(state, step.unless, context, id)) continue
      if (step.time !== undefined) {
        state.time = Math.max(state.time, timeOf(state, step.time))
        syncDay(state, events)
      } else if (step.speed !== undefined) state.speedToday = (state.speedToday ?? 1) * step.speed
      else if (step.effects)
        applyEffects(state, id, step.effects, events, rollsOf(state, context, id))
      else if (step.do !== undefined)
        takeAction(state, step.do, events, { facts: options.facts, quiet: true, depth: depth + 1 })
      else if (step.roll !== undefined)
        schedule(state, id, events, undefined, options.facts, step.roll)
      else if (step.set) state.today = { ...state.today, ...step.set }
      else if (step.advance !== undefined) {
        const legs = resolveChange(step.advance, qualify(context), rollsOf(state, context, id))
        advance(state, typeof legs === 'number' ? Math.floor(legs) : 0, events)
      }
    }
  }

  /**
   * Moves the party `legs` hexes along its route at once, no time passing (a move that
   * makes progress): each hex entered as by marching (its visit, the trip's totals, its
   * `hex-enter` checks). Stops at the destination, at a way it can't take, or at a check.
   */
  const advance = (state: TravelState, legs: number, events: TravelEvent[]): void => {
    for (let i = 0; i < legs; i++) {
      const next = state.route?.[1]
      if (!state.route || !next) return
      if (!Number.isFinite(stepMinutes(state, state.location, next))) {
        events.push({ type: 'ROUTE_BLOCKED', from: state.location, to: next })
        return
      }
      const from = state.location
      enter(state, next, events)
      schedule(state, 'hex-enter', events, from)
      if (state.route.length < 2)
        return void events.push({ type: 'DESTINATION_REACHED', hex: next })
      if (state.pendingChecks.length) return
    }
  }

  /** Why nothing can move the trip on: a check it's paused on (undefined: none). */
  const pausedOn = (state: TravelState): Unavailable | undefined => {
    const check = state.pendingChecks[0]
    return check && { pending: check.event }
  }

  /** The party steps into the next hex of its route: its visit, the totals, the journal. */
  const enter = (state: TravelState, next: string, events: TravelEvent[]): void => {
    state.progress = 0
    state.location = next
    state.route = state.route!.slice(1)
    state.visits = { ...state.visits, [next]: (state.visits?.[next] ?? 0) + 1 }
    totalsOf(state).hexes++
    events.push({ type: 'HEX_ENTERED', hex: next, time: state.time })
  }

  return {
    stepMinutes,
    plan,
    context: (input, facts = {}) => qualify(checkContext(upgradeTravelState(input), [], facts)),
    availability(input, facts = {}) {
      const state = upgradeTravelState(input)
      const out: Record<string, Unavailable> = {}
      // Paused on a check: nothing moves the trip on until it's resolved.
      const paused = pausedOn(state)
      if (paused) {
        out.travel = paused
        for (const id of Object.keys(actions.all)) if (id !== MARCH) out[id] = paused
        for (const id of Object.keys(rules.modes)) {
          const why = modeUnavailable(state, id, facts)
          if (why) out[`mode.${id}`] = why
        }
        return out
      }
      const travelBlocked =
        blocker(state, 'travel', facts) ?? blocker(state, `mode.${state.mode}`, facts)
      if (travelBlocked) out.travel = travelBlocked
      for (const id of Object.keys(actions.all)) {
        if (id === MARCH) continue
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
      // Paused on a check: what moves the trip on waits until it's resolved (Continue).
      const paused = pausedOn(state)
      const moves = ['travel', 'wait', 'camp', 'rest', 'action'].includes(action.type)
      if (paused && moves) {
        const id = action.type === 'action' ? action.id : action.type
        events.push({ type: 'ACTION_UNAVAILABLE', action: id, because: paused })
        return { state, events }
      }
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
          if (action.by === undefined) travelOn(state, action.until ?? 'destination', events)
          else journey(state, action.until ?? 'destination', action.by, events)
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
          takeAction(state, action.id, events, { minutes: action.minutes })
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
          for (const [id, delta] of Object.entries(outcome.resources ?? {})) {
            const from = state.resources[id] ?? 0
            state.resources[id] = changeValue(from, delta, supplies[id]).to
            tallySupply(state, id, from, state.resources[id])
          }
          events.push({ type: 'CHECK_RESOLVED', id: action.id, outcome })
          break
        }
      }
      return { state, events }
    },
  }
}

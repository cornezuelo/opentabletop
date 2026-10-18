import { matches, type Condition } from '@open-tabletop/conditions'
import { findPath } from '@open-tabletop/hex'
import { momentRoller, type Roller } from '@open-tabletop/variables'
import {
  defaultCalendar,
  findPart,
  nextAt,
  nextPartStart,
  type Calendar,
  type CalendarParts,
  type GameTime,
  parseClock,
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
  isClock,
  MARCH,
  olderDay,
  olderEatingId,
  resolveChange,
  resourceBounds,
  type ActionStep,
  type Bounds,
  type CheckRule,
  type TravelRules,
} from './rules'
import { FACT_PATHS, hexIdOf, qualify } from './facts'
import { isPartRef } from './day'

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
  /**
   * A moment whose clocks and parts beginning haven't happened yet: a new trip's start.
   * They happen as the trip next marches or waits, that same day (before it, as dawn's
   * checks did, the party may take actions).
   */
  momentsDue?: GameTime
  /** Older trips: dawn's checks done today (read as `momentsDue` when false). */
  dayChecksDone?: boolean
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
  /** Older trips: night fell, or the day's marching hours were spent. */
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
   * The party couldn't take the halt's action (`travel.halt`; `because` says why): the time
   * passes without it until it can march.
   */
  | { type: 'HALT_WITHOUT'; action: string; because: Unavailable; time: GameTime }
  /** Older journals: the night passed without the night's action. */
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
   * it marches while the system's march lets it, waits (with the system's halt) until it
   * can march again, and waits where it ends up once the route is done.
   */
  | { type: 'travel'; until?: 'hex' | 'destination'; by?: GameTime }
  | { type: 'advanceTime'; minutes: number }
  /**
   * Waits where the party is until a moment, living it: the checks and actions of the
   * moments on the way, the system's halt. Stops early when a check is pending.
   */
  | { type: 'wait'; until: GameTime }
  /**
   * Waits for the next march: lets today's go by (while the party could march, it waits on
   * until it can't), then until the system's march lets it again, living the moments on
   * the way and the halt (camp…). Three days at most.
   */
  | { type: 'waitForMarch' }
  /**
   * One of the system's actions (`actions.<id>` in the rules), e.g. camp or forage. With
   * `minutes`, a length chosen by hand replaces the time its steps pass.
   */
  | { type: 'action'; id: string; minutes?: number }
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
    momentsDue: time,
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

/**
 * Older trips in today's shape: the built-in `lost` as `today.lost` / `yesterday.lost`,
 * and dawn's checks not done yet as the moments of now still to happen (`momentsDue`).
 */
export function upgradeTravelState(state: TravelState): TravelState {
  let out = state
  if ('lostToday' in out || 'lostYesterday' in out) {
    const { lostToday, lostYesterday, ...rest } = out
    out = {
      ...rest,
      ...(lostToday && { today: { ...rest.today, lost: true } }),
      ...(lostYesterday !== undefined && { yesterday: { ...rest.yesterday, lost: lostYesterday } }),
    }
  }
  if ('dayChecksDone' in out) {
    // Older trips said whether dawn's checks were done; their moments of now are owed only if not.
    const { dayChecksDone, ...rest } = out
    delete rest.momentsDue
    out = { ...rest, ...(dayChecksDone === false && { momentsDue: rest.time }) }
  }
  return out
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
  const world = options.world
  // Older rules (`day:`) in today's terms: their moments, actions and halt.
  const rules = olderDay(options.rules)
  const calendar = options.calendar ?? defaultCalendar
  const actions = availableActions(rules)
  /** The calendar's divisions of the day (meals, watches…). */
  const divisions = calendar.divisions ?? []
  /** A clock (`'06:00'`) or a part (`part.night`: when it starts) as minutes of the day. */
  const clockOf = (ref: string): number | undefined =>
    isPartRef(ref) ? findPart(divisions, ref)?.part.from : parseClock(ref)
  /** What the party does when it can't march (`travel.halt`), and from when. */
  const halt = rules.travel.halt
  const haltAt = halt && clockOf(halt.at)
  /** Older rules' dawn and nightfall, for the facts they read (`daylight`, `camping`). */
  const older = rules.day && {
    dawn: clockOf(rules.day.start) ?? parseClock('06:00'),
    nightfall: clockOf(rules.day.nightfall) ?? parseClock('20:00'),
  }
  /** The hour each part starts, as a number: `system.<division>.<part>`. */
  const partHours = Object.fromEntries(
    divisions.map((d) => [d.id, Object.fromEntries(d.parts.map((p) => [p.id, p.from / 60]))]),
  )
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

  /** Older rules: whether it's day, between their dawn and nightfall of the day it is. */
  const daylight = (time: GameTime) => {
    if (!older) return {}
    const { day } = calendar.describe(time)
    return {
      daylight: time >= calendar.at(day, older.dawn) && time < calendar.at(day, older.nightfall),
    }
  }

  /**
   * The moment as conditions read it: the season, the day, the hour (`14.5` is 14:30), the
   * calendar's divisions of the day, and the system's marching hours (older rules: whether
   * it's day, their dawn and nightfall).
   */
  const clockFacts = (state: TravelState): Record<string, unknown> => {
    const parts = calendar.describe(state.time)
    return {
      season: parts.season,
      day: state.day,
      ...daylight(state.time),
      hour: parts.hour + parts.minute / 60,
      ...(parts.watch !== undefined && { watch: parts.watch }),
      // The divisions of the day by their own names too (`meal`), unless one is a fact's.
      ...Object.fromEntries(
        Object.entries(parts.divisions ?? {}).filter(
          ([id]) => !(id in FACT_PATHS) || FACT_PATHS[id] === `time.${id}`,
        ),
      ),
      // Older rules' day as numbers (hours): `hour: { gte: '{{nightfall}}' }`.
      ...(older && { dawn: older.dawn / 60, nightfall: older.nightfall / 60 }),
      hoursPerDay: rules.travel.hoursPerDay,
      // What it is in each division (`time.meal: elevenses`) and its parts' tags.
      time: { ...parts.divisions, tags: parts.tags ?? [] },
      // When each part starts (`system.meal.dinner`: 18).
      system: partHours,
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
      ...daylight(state.time),
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

  /**
   * The moments of the day a check (`at`) or an action (`on`) names: parts of the
   * calendar's day and clocks.
   */
  const namedParts = [
    ...new Set([
      ...((rules.checks ?? []) as CheckRule[]).flatMap((c) => momentsOf(c.at)),
      ...Object.values(actions.all).flatMap((a) => momentsOf(a.on)),
    ]),
  ].filter((ref) => isClock(ref) || (isPartRef(ref) && findPart(divisions, ref)))
  /** When a named moment comes next after `time`: a part's start or a clock. */
  const nextOf = (time: GameTime, ref: string): GameTime | undefined =>
    isClock(ref) ? nextAt(calendar, time + 1, ref) : nextPartStart(calendar, time, ref)
  /** The next moment after `time` a named part begins, and which (several may at once). */
  const nextNamed = (time: GameTime): { time: GameTime; refs: string[] } | undefined => {
    let next: { time: GameTime; refs: string[] } | undefined
    for (const ref of namedParts) {
      const at = nextOf(time, ref)
      if (at === undefined || (next && at > next.time)) continue
      next =
        next && at === next.time
          ? { time: at, refs: [...next.refs, ref] }
          : { time: at, refs: [ref] }
    }
    return next
  }
  /**
   * Time passes up to `to`: each named part that begins on the way has its moment (its
   * actions, then its checks), in order, the day changing as it goes.
   */
  const passTo = (state: TravelState, to: GameTime, events: TravelEvent[]): void => {
    for (let guard = 0; guard < 1000; guard++) {
      const next = nextNamed(state.time)
      if (!next || next.time > to) break
      state.time = next.time
      syncDay(state, events)
      for (const ref of next.refs) schedule(state, ref, events, undefined, doingFacts())
    }
    if (state.time < to) state.time = to
    syncDay(state, events)
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
        // What the host said of the day that ended (its values, the trip's too) is the
        // day before's now: later moments of this order see a clean day, as the host will.
        const ended = hostFacts.today as Record<string, unknown> | undefined
        if (ended) {
          const next: HostFacts = { ...hostFacts, today: {}, yesterday: { ...ended } }
          for (const [key, value] of Object.entries(ended))
            if (next[key] === value) delete next[key]
          hostFacts = next
        }
      }
      events.push({ type: 'DAY_STARTED', day: state.day })
    } finally {
      syncing = false
    }
  }

  /**
   * Why the party can't march at `time`, having marched `marched` minutes today
   * (undefined: it can): the system's march (`actions.march`, its `when` / `unless`) or a
   * value of the day that blocks marching. Without a march of its own, the party can.
   */
  const marchStop = (
    state: TravelState,
    time: GameTime,
    marched: number,
  ): StopReason | undefined => {
    const now = { ...state, time, travelledToday: marched }
    if (blocker(now, MARCH)) return 'march'
    const march = actions.all[MARCH]
    if (!march) return undefined
    const seen = checkContext(now, [], hostFacts)
    if (
      (!march.when || test(now, march.when as Condition, seen, MARCH)) &&
      !(march.unless && test(now, march.unless as Condition, seen, MARCH))
    )
      return undefined
    return 'march'
  }

  /** Every part of the calendar's day, as `<division>.<part>`. */
  const allParts = divisions.flatMap((d) => d.parts.map((p) => `${d.id}.${p.id}`))

  /** Whether nothing stops the party marching at `time` (today's march, values, weather). */
  const canMarchAt = (state: TravelState, time: GameTime): boolean =>
    !blocker(state, 'travel') &&
    !blocker(state, `mode.${state.mode}`) &&
    dayFactor(state) > 0 &&
    !marchStop(state, time, state.travelledToday)

  /**
   * The next moment after `time` something may change while the party waits: a moment a
   * check or action names, the start of any part of the day, the halt, older rules' dawn
   * and nightfall, midnight.
   */
  const nextBoundary = (time: GameTime): GameTime =>
    Math.min(
      calendar.at(calendar.describe(time).day + 1, 0),
      nextNamed(time)?.time ?? Infinity,
      ...allParts.map((ref) => nextPartStart(calendar, time, ref) ?? Infinity),
      ...[haltAt, older?.dawn, older?.nightfall].map((at) =>
        at === undefined ? Infinity : nextAt(calendar, time + 1, at),
      ),
    )

  /**
   * Waits until the party can march again (or `by`), moment by moment, living them: the
   * halt is taken on the way. Undefined once it can; else why it stopped (a check, `by`).
   */
  const untilMarch = (
    state: TravelState,
    by: GameTime,
    events: TravelEvent[],
  ): StoppedEvent | undefined => {
    const stopAt = (reason: StopReason): StoppedEvent => ({
      type: 'TRAVEL_STOPPED',
      reason,
      time: state.time,
    })
    for (let guard = 0; guard < 10000; guard++) {
      syncDay(state, events)
      if (state.pendingChecks.length) return stopAt('check')
      if (state.time >= by) return stopAt('waited')
      if (canMarchAt(state, state.time)) return undefined
      const boundary = Math.min(by, nextBoundary(state.time))
      // Up to it, the march may hold again minute by minute (`time.hour: { gte: 6.5 }`);
      // what blocks it otherwise (values, weather) only changes at a moment.
      let next = state.time + 1
      if (
        !blocker(state, 'travel') &&
        !blocker(state, `mode.${state.mode}`) &&
        dayFactor(state) > 0
      )
        while (next < boundary && marchStop(state, next, state.travelledToday)) next++
      const waited = quietly(events, () => wait(state, Math.min(next, boundary), events))
      if (waited?.reason !== 'waited') return waited ?? stopAt('waited')
    }
    return stopAt('waited')
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
    if (state.pendingChecks.length) return stop('check')
    if (!state.route || state.route.length < 2) {
      if (state.destination && state.destination === state.location)
        events.push({ type: 'DESTINATION_REACHED', hex: state.location })
      return stop(state.route ? 'destination' : 'no-route')
    }
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
      const why = marchStop(state, state.time, state.travelledToday)
      if (why) return stop(why)
      // March minute by minute while the system's march holds, up to the next hex, the
      // moment asked for, a moment the system names or midnight (a new day).
      // Already past it (the way got faster since: better weather…): the hex is entered now.
      const reach = state.time + Math.max(0, cost - state.progress)
      const midnight = calendar.at(state.day + 1, 0)
      let end = Math.min(by, midnight, reach)
      // A moment a check or action names: it comes on the march.
      const part = nextNamed(state.time)
      if (part) end = Math.min(end, part.time)
      let time = state.time + 1
      while (time < end && !marchStop(state, time, state.travelledToday + time - state.time)) time++
      const marched = Math.min(time, end) - state.time
      state.time += marched
      state.travelledToday += marched
      totalsOf(state).marched += marched
      // Marched up to the hex's moment, the hex is reached: minutes add up with decimals, and
      // a sliver left short of the cost (less than the clock tells apart from now) would be
      // marched towards for no time at all, for ever.
      state.progress = state.time >= reach ? cost : state.progress + marched
      // Midnight: the day ends (its actions and checks) and a new one starts.
      if (state.time >= midnight) {
        syncDay(state, events)
        if (state.pendingChecks.length) return stop('check')
      }
      const atPart = !!part && state.time === part.time
      if (atPart) {
        for (const ref of part.refs) schedule(state, ref, events, undefined, doingFacts())
        if (state.pendingChecks.length) return stop('check')
      }
      if (state.progress < cost) {
        if (state.time >= by) return stop('waited')
        if (atPart || state.time >= midnight) {
          // What the moment set (a value, the weather) may stop the march.
          const blockedNow = blocker(state, 'travel') ?? blocker(state, `mode.${state.mode}`)
          if (blockedNow)
            return void events.push({
              type: 'TRAVEL_STOPPED',
              reason: 'value',
              ...blockedNow,
              time: state.time,
            })
          if (dayFactor(state) <= 0) return stop('weather')
          continue
        }
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
   * The trip going on by itself until `by`: it marches along the route while the system's
   * march lets it, then waits (taking the system's halt) until it can march again, and so
   * on; once the route is done (or there is none), it waits there. A value that blocks
   * travel (a storm, lost…) is said in the journal once a day. Stops early for a check
   * (the host resolves it and goes on) or a way blocked for good.
   */
  const journey = (
    state: TravelState,
    until: 'hex' | 'destination',
    by: GameTime,
    events: TravelEvent[],
  ): void => {
    const stop = (reason: StopReason): void =>
      void events.push({ type: 'TRAVEL_STOPPED', reason, time: state.time })
    /** The value that blocked travel already said, by day. */
    let said = ''
    for (let guard = 0; guard < 10000; guard++) {
      syncDay(state, events)
      if (state.pendingChecks.length) return stop('check')
      if (state.time >= by) return stop('waited')
      if (!state.route || state.route.length < 2) {
        if (state.destination && state.destination === state.location)
          events.push({ type: 'DESTINATION_REACHED', hex: state.location })
        return wait(state, by, events)
      }
      const stopped = quietly(events, () => travel(state, until, events, by))
      const reason = stopped?.reason
      if (reason === 'destination' || reason === 'no-route') return wait(state, by, events)
      // A value that blocks travel today (lost…): said in the journal.
      if (reason === 'value' && said !== `${state.day}|${stopped!.value}`) {
        said = `${state.day}|${stopped!.value}`
        events.push(stopped!)
      }
      // Nothing more to march now: wait until it can march again.
      if (reason === 'march' || reason === 'weather' || reason === 'value') {
        const waited = untilMarch(state, by, events)
        if (waited) return void events.push(waited)
        continue
      }
      return void events.push(
        stopped ?? { type: 'TRAVEL_STOPPED', reason: 'check', time: state.time },
      )
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
   * A travel order when the party can't march now (the system's march, the weather) while
   * the halt's action can't be taken (no food to camp…) or the system has none: the time
   * passes until it can march (until tomorrow ends at most), and the march goes on.
   * Otherwise the party stops, for the player to choose (camp…).
   */
  const travelOn = (state: TravelState, until: 'hex' | 'destination', events: TravelEvent[]) => {
    const time = state.time
    const stopped = quietly(events, () => travel(state, until, events))
    const stuck =
      state.time === time &&
      (stopped?.reason === 'march' || stopped?.reason === 'weather') &&
      (!halt || unavailable(state, halt.do, hostFacts))
    if (!stuck) return void (stopped && events.push(stopped))
    const waited = untilMarch(state, calendar.at(state.day + 2, 0), events)
    if (waited) return void events.push(waited.reason === 'waited' ? stopped! : waited)
    travel(state, until, events)
  }

  /**
   * Waits until `until`, moment by moment: the moments checks and actions name, the
   * system's halt (once a day, from its moment, if the party hasn't taken it today),
   * midnight (the day-end actions and checks). Stops when a check comes up (the host
   * resolves it and waits on). A halt that can't be taken (no food to camp…) is said, and
   * the time passes without it. The halt may end past `until` (camp lasts till morning).
   */
  const wait = (state: TravelState, until: GameTime, events: TravelEvent[]): void => {
    const stop = (reason: StopReason): void => {
      events.push({ type: 'TRAVEL_STOPPED', reason, time: state.time })
    }
    /** The day whose halt couldn't be taken. */
    let without = -1
    for (let guard = 0; guard < 10000; guard++) {
      syncDay(state, events)
      if (state.pendingChecks.length) return stop('check')
      if (state.time >= until) return stop('waited')
      const haltTime = haltAt === undefined ? Infinity : calendar.at(state.day, haltAt)
      if (
        halt &&
        state.time >= haltTime &&
        without !== state.day &&
        !state.actionsToday?.includes(halt.do)
      ) {
        const because = unavailable(state, halt.do, hostFacts)
        if (!because) {
          takeAction(state, halt.do, events)
          continue
        }
        // Without its halt (no food to camp…), the time still passes.
        events.push({ type: 'HALT_WITHOUT', action: halt.do, because, time: state.time })
        without = state.day
      }
      const next = Math.min(
        state.time < haltTime ? haltTime : Infinity,
        calendar.at(state.day + 1, 0),
        // A moment a check or action names: it comes on the way.
        nextNamed(state.time)?.time ?? Infinity,
      )
      passTo(state, Math.min(until, next), events)
    }
  }

  /** See the `waitForMarch` action: today's march goes by, then until the next. */
  const waitForMarch = (state: TravelState, events: TravelEvent[]): void => {
    const by = calendar.at(state.day + 3, 0)
    for (let guard = 0; guard < 10000 && canMarchAt(state, state.time); guard++) {
      const boundary = Math.min(by, nextBoundary(state.time))
      let next = state.time + 1
      while (next < boundary && !marchStop(state, next, state.travelledToday)) next++
      const waited = quietly(events, () => wait(state, next, events))
      if (waited?.reason !== 'waited') return void (waited && events.push(waited))
      if (state.time >= by) return void events.push(waited)
    }
    const stopped = untilMarch(state, by, events)
    events.push(stopped ?? { type: 'TRAVEL_STOPPED', reason: 'waited', time: state.time })
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

  /**
   * The moment a `time` step goes to: minutes from now, the next start of a part, or the
   * next time a clock strikes (older rules' `dawn` / `nightfall` are read as theirs).
   */
  const timeOf = (state: TravelState, time: NonNullable<ActionStep['time']>): GameTime =>
    typeof time === 'number'
      ? state.time + time
      : isPartRef(time)
        ? (nextPartStart(calendar, state.time, time) ?? state.time)
        : isClock(time)
          ? nextAt(calendar, state.time + 1, time)
          : state.time

  type Hits = { below: Set<string>; above: Set<string> }
  /** The actions under way, the one the player (or a moment) started first. */
  const doing: string[] = []
  /**
   * What conditions see of the action under way: `doing` (its id), and for older rules
   * `camping` (it's the night's action: their way of asking whether the day ended in camp).
   */
  const doingFacts = () => ({
    doing: doing[0],
    ...(older && { camping: !!halt && doing[0] === halt.do }),
  })
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
        passTo(state, Math.max(state.time, timeOf(state, step.time)), events)
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
      const moves = ['travel', 'wait', 'waitForMarch', 'action'].includes(action.type)
      if (paused && moves) {
        const id = action.type === 'action' ? action.id : action.type
        events.push({ type: 'ACTION_UNAVAILABLE', action: id, because: paused })
        return { state, events }
      }
      // A new trip's first moments (a clock, a part beginning as it starts) happen as it
      // first marches or waits that day; a check they bring comes first.
      if (
        (action.type === 'travel' || action.type === 'wait' || action.type === 'waitForMarch') &&
        state.momentsDue !== undefined
      ) {
        const due = state.momentsDue
        delete state.momentsDue
        syncDay(state, events)
        const now = nextNamed(due - 1)
        if (now?.time === due && calendar.describe(due).day === state.day)
          for (const ref of now.refs) schedule(state, ref, events, undefined, doingFacts())
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
          passTo(state, state.time + Math.max(0, action.minutes), events)
          break
        case 'wait':
          wait(state, action.until, events)
          break
        case 'waitForMarch':
          waitForMarch(state, events)
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

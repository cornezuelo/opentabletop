import type { Diagnostic, OracleEngine, Registry } from '@open-tabletop/oracle-engine'
import { validateWeather, type WeatherModel } from '@open-tabletop/weather-engine'
import {
  calendarFrom,
  defaultCalendar,
  seasonsOf,
  seasonStartDay,
  validateCalendar,
  type Calendar,
  type CalendarDef,
  type DataCalendar,
} from '@open-tabletop/time'
import {
  createTravelEngine,
  genericTravelRules,
  initialTravelState,
  parseTravelRules,
  type TravelAction,
  type TravelRules,
  type TravelWorld,
  type Unavailable,
} from '@open-tabletop/travel-engine'
import { createDiscovery, type DiscoveredHex, type RevealMode } from './discovery'
import {
  createSession,
  initialSessionState,
  parseBindings,
  type Bindings,
  type JournalEntry,
  type SessionState,
  tripContext,
} from './index'

/** A travel system: rules (and optional bindings) from a pack, or the generic rules. */
export interface TravelSystem {
  /** Pack id, or 'generic' for the built-in rules. */
  id: string
  /** The pack's name ('' for generic: the UI names it). */
  name: string
  rules: TravelRules
  bindings?: Bindings
  /** The pack's own calendar (`kind: calendar`), if it has one. */
  calendar?: DataCalendar
  /** Weather models its bindings may name (every pack's, by pack/id). */
  weather?: Record<string, WeatherModel>
}

/** The calendar a system's trips use: its own, or the default one. */
export const calendarOf = (system: TravelSystem): Calendar => system.calendar ?? defaultCalendar

export const GENERIC_SYSTEM: TravelSystem = { id: 'generic', name: '', rules: genericTravelRules }

/** "checks.2.event: Expected …" → a diagnostic pointing at that path of the definition. */
function problem(pack: string, file: string, kind: string, error: string): Diagnostic {
  const cut = error.indexOf(': ')
  const path = cut > 0 ? error.slice(0, cut).replace(/^(rules|bindings)\.?/, '') : ''
  const message = cut > 0 ? error.slice(cut + 2) : error
  return {
    severity: 'error',
    message,
    pack,
    file,
    // `@kind` locates the definition by its kind (rules and bindings often share an id).
    at: `@${kind}${path ? `.${path}` : ''}`,
  }
}

/**
 * Travel systems declared by the loaded packs (`kind: travel-rules`, optionally with
 * `kind: bindings`), after the generic one. Broken rules are reported, not loaded;
 * bindings to tables that don't exist are reported too.
 */
export function travelSystems(registry: Registry): {
  systems: TravelSystem[]
  problems: Diagnostic[]
} {
  const systems = [GENERIC_SYSTEM]
  const problems: Diagnostic[] = []
  // Weather models of every pack (`kind: weather`), by pack/id: any system may use them.
  const weather: Record<string, WeatherModel> = {}
  for (const [id] of registry.packs)
    for (const extra of registry.extras.get(id) ?? []) {
      if (extra.kind !== 'weather') continue
      const errors = extra.id ? validateWeather(extra.data) : ['id: a weather model needs one']
      problems.push(...errors.map((e) => problem(id, extra.file, 'weather', e)))
      if (!errors.length) weather[`${id}/${extra.id}`] = extra.data as unknown as WeatherModel
    }
  for (const [id, pack] of registry.packs) {
    const extras = registry.extras.get(id) ?? []
    const rulesRaw = extras.find((e) => e.kind === 'travel-rules')
    const bindingsRaw = extras.find((e) => e.kind === 'bindings')
    const parsed = bindingsRaw ? parseBindings(bindingsRaw.data, id) : undefined
    if (bindingsRaw) {
      problems.push(
        ...(parsed?.errors ?? []).map((e) => problem(id, bindingsRaw.file, 'bindings', e)),
      )
      const discover = parsed?.bindings?.discover
      for (const key of ['terrain', 'contents'] as const) {
        const target = discover?.[key]?.resolve
        if (target && !registry.definitions.has(target))
          problems.push(
            problem(
              id,
              bindingsRaw.file,
              'bindings',
              `discover.${key}.resolve: Unknown table or generator "${target}"`,
            ),
          )
      }
      for (const [event, binding] of Object.entries(parsed?.bindings?.on ?? {}))
        if (binding.resolve && !registry.definitions.has(binding.resolve))
          problems.push(
            problem(
              id,
              bindingsRaw.file,
              'bindings',
              `on.${event}.resolve: Unknown table or generator "${binding.resolve}"`,
            ),
          )
        else if (binding.weather && !weather[binding.weather])
          problems.push(
            problem(
              id,
              bindingsRaw.file,
              'bindings',
              `on.${event}.weather: Unknown weather model "${binding.weather}"`,
            ),
          )
    }
    if (!rulesRaw) continue
    const { rules, errors } = parseTravelRules(rulesRaw.data)
    if (!rules) {
      problems.push(...errors.map((e) => problem(id, rulesRaw.file, 'travel-rules', e)))
      continue
    }
    const name = typeof pack.manifest.name === 'string' ? pack.manifest.name : id
    const calendarRaw = extras.find((e) => e.kind === 'calendar')
    const calendarErrors = calendarRaw ? validateCalendar(calendarRaw.data) : []
    problems.push(...calendarErrors.map((e) => problem(id, calendarRaw!.file, 'calendar', e)))
    const calendar =
      calendarRaw && !calendarErrors.length
        ? calendarFrom(calendarRaw.data as unknown as CalendarDef)
        : undefined
    problems.push(...undeclaredEffects(registry, id, rules, parsed?.bindings, rulesRaw.file))
    systems.push({
      id,
      name,
      rules,
      bindings: parsed?.bindings,
      ...(calendar && { calendar }),
      ...(Object.keys(weather).length && { weather }),
    })
  }
  return { systems, problems }
}

/**
 * Effects of a system (its actions, rests and checks, and its pack's tables, oracles and
 * decks) on values it doesn't declare: a stat missing from its bindings, or a supply
 * missing from its rules. Warnings: the effect still applies, but nobody names the value.
 */
function undeclaredEffects(
  registry: Registry,
  pack: string,
  rules: TravelRules,
  bindings: Bindings | undefined,
  file: string,
): Diagnostic[] {
  const out: Diagnostic[] = []
  const check = (effects: unknown, where: { file: string; at: string }) => {
    if (typeof effects !== 'object' || effects === null) return
    for (const path of Object.keys(effects)) {
      const [, scope, valueId] = /^party\.(stats|resources)\.(.+)$/.exec(path) ?? []
      const known =
        scope === 'stats'
          ? !!bindings?.stats?.[valueId]
          : scope === 'resources'
            ? !!rules.resources?.[valueId]
            : false
      if (!known)
        out.push({
          severity: 'warning',
          message: `Effect on "${path}", which this system doesn't declare (stats in its bindings, resources in its rules)`,
          pack,
          ...where,
        })
    }
  }
  for (const [action, own] of Object.entries(rules.actions ?? {}))
    if (own && typeof own === 'object' && 'effects' in own)
      check(own.effects, { file, at: `@travel-rules.actions.${action}.effects` })
  ;(rules.checks ?? []).forEach((c, i) =>
    check(c.effects, { file, at: `@travel-rules.checks.${i}.effects` }),
  )
  for (const def of registry.definitions.values()) {
    if (def.pack !== pack) continue
    const lists =
      def.kind === 'table'
        ? [def.entries]
        : def.kind === 'oracle'
          ? Object.values(def.variants).map((v) => v.entries)
          : def.kind === 'deck'
            ? [def.cards]
            : []
    for (const items of lists)
      for (const item of items)
        check(item.effects, { file: def.file, at: `${def.localId}.${item.key}.effects` })
  }
  return out
}

/** First day of each season in the default calendar. */
export const SEASON_START_DAYS = { spring: 1, summer: 91, autumn: 181, winter: 271 } as const
/** A season id: spring… in the default calendar; a system's calendar may have others. */
export type Season = string

/** The seasons trips of a system can start in, in order. */
export const seasonsFor = (system: TravelSystem): string[] =>
  system.calendar ? seasonsOf(system.calendar) : Object.keys(SEASON_START_DAYS)

/** The first day of a season in a system's calendar. */
export function seasonStart(system: TravelSystem, season: Season): number {
  if (system.calendar) return seasonStartDay(system.calendar, season)
  return SEASON_START_DAYS[season as keyof typeof SEASON_START_DAYS] ?? 1
}

/**
 * A new trip at `location`: first travel mode of the rules, dawn of the season's first
 * day, 6 of each resource, and the system's declared stats (values in `stats` win; any
 * stat the system doesn't declare, e.g. kept from a trip with another system, is dropped).
 */
export function startTrip(options: {
  system: TravelSystem
  location: string
  season?: Season
  stats?: Record<string, number>
  /** Start at this moment instead (e.g. the world clock's), whatever the season. */
  time?: number
}): { startDay: number; session: SessionState } {
  const { rules, bindings } = options.system
  const calendar = calendarOf(options.system)
  const startDay =
    options.time !== undefined
      ? calendar.describe(options.time).day
      : seasonStart(options.system, options.season ?? seasonsFor(options.system)[0])
  const travel = initialTravelState({
    location: options.location,
    mode: Object.keys(rules.modes)[0],
    calendar,
    time: options.time ?? calendar.at(startDay, rules.day.start),
    resources: Object.fromEntries(Object.keys(rules.resources ?? {}).map((r) => [r, 6])),
  })
  const stats = Object.fromEntries(
    Object.entries(bindings?.stats ?? {}).map(([k, v]) => [
      k,
      options.stats?.[k] ?? v.default ?? 0,
    ]),
  )
  return { startDay, session: initialSessionState(travel, stats) }
}

/**
 * Runs one travel action through the session; bound checks are resolved by the Oracle.
 * With `discover` (and a system whose bindings have `discover`), empty hexes are decided
 * on the way: `discovered` is what the host should write on its map.
 */
export function stepTrip(
  options: {
    system: TravelSystem
    world: TravelWorld
    oracle?: OracleEngine
    locale?: string
    /** Turn discovery on, revealing the entered hex only or its neighbours too. */
    discover?: RevealMode
  },
  session: SessionState,
  action: TravelAction,
): { state: SessionState; entries: JournalEntry[]; discovered: Record<string, DiscoveredHex> } {
  const { system } = options
  const discover = system.bindings?.discover
  const discovery =
    options.discover && discover && options.oracle
      ? createDiscovery({
          world: options.world,
          oracle: options.oracle,
          discover,
          reveal: options.discover,
          locale: options.locale,
        })
      : undefined
  const result = createSession({
    travel: createTravelEngine({
      world: discovery?.world ?? options.world,
      rules: system.rules,
      calendar: calendarOf(system),
    }),
    oracle: system.bindings ? options.oracle : undefined,
    bindings: system.bindings,
    rules: system.rules,
    locale: options.locale,
    discovery,
    weather: system.weather,
  }).step(session, action)
  return { ...result, discovered: Object.fromEntries(discovery?.found ?? []) }
}

/** A world that knows nothing (for questions that don't need the map). */
const NO_WORLD: TravelWorld = {
  hexKm: 1,
  cell: () => null,
  neighbors: () => [],
  distance: () => 0,
  edges: () => [],
}

/**
 * What the party can't do now and why, for the trip's buttons: `travel` and each action
 * by id (absent: available). A declared value blocks (`lost`), an action was done today,
 * or its `when` / `unless` (which see the map, the party and today's values).
 */
export function tripAvailability(
  options: { system: TravelSystem; world?: TravelWorld },
  session: SessionState,
): Record<string, Unavailable> {
  const engine = createTravelEngine({
    world: options.world ?? NO_WORLD,
    rules: options.system.rules,
    calendar: calendarOf(options.system),
  })
  return engine.availability(session.travel, tripContext(session, {}))
}

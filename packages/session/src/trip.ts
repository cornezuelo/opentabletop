import type { Diagnostic, OracleEngine, Registry } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
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
import { migrateRules } from './formats'
import { createDiscovery, type DiscoveredHex, type RevealMode } from './discovery'
import {
  createSession,
  initialSessionState,
  parseBindings,
  type Bindings,
  localize,
  type JournalEntry,
  type LocalizedText,
  type SessionState,
  tripContext,
} from './index'

/**
 * A game system: what a pack declares it brings (`kind: system`), or, for older packs,
 * its travel rules and bindings, or the generic rules.
 */
export interface TravelSystem {
  /**
   * 'generic' for the built-in rules; the pack id for a pack's `default` system (and an
   * older pack's implicit one); `pack/id` for any other system a pack declares.
   */
  id: string
  /** The pack that declares it (absent for the generic system). */
  pack?: string
  /** Its name ('' for generic: the UI names it); texts by language when translated. */
  name: LocalizedText
  description?: LocalizedText
  /** The base language of its pack, the fallback for its texts. */
  locale?: string
  rules: TravelRules
  bindings?: Bindings
  /**
   * Where its parts are written: travel rules (absent: the generic ones), bindings, and
   * the `kind: system` naming them (absent for an older pack's implicit system).
   */
  sources?: { rules?: SystemSource; bindings?: SystemSource; system?: SystemSource }
  /** The calendar its trips and world clock use (`kind: calendar`), if it has one. */
  calendar?: DataCalendar
  /** Weather models its bindings may name, by pack/id. */
  weather?: Record<string, WeatherModel>
  /** Packs whose tables, oracles and decks it brings: its own first. */
  packs: string[]
  /**
   * Its example maps: OTD bundles (`*.otd.json`) in its own pack, by path in the pack
   * (`maps/frontier.otd.json`), in the order it lists them.
   */
  maps?: string[]
}

/** Where a system's part is defined: a definition of a pack. */
export interface SystemSource {
  pack: string
  id: string
  file: string
}

/** The calendar a system's trips use: its own, or the default one. */
export const calendarOf = (system: TravelSystem): Calendar => system.calendar ?? defaultCalendar

/** A system's name in a language ('' for the generic one: the UI names it). */
export const systemName = (system: TravelSystem, locale: string): string =>
  localize(system.name, locale, system.locale) ?? system.id

/**
 * Every pack a system needs, to take it elsewhere as a whole: its own first, then the
 * packs it brings and those its parts are written in (a declared system's weather models
 * included), and every dependency of each, as far as they go. Packs that aren't loaded are left out. None for
 * the generic system.
 */
export function systemPackIds(system: TravelSystem, registry: Registry): string[] {
  const out: string[] = []
  const add = (id: string | undefined) => {
    if (!id || out.includes(id) || !registry.packs.has(id)) return
    out.push(id)
    for (const dependency of registry.packs.get(id)!.dependencies) add(dependency)
  }
  if (!system.pack) return out
  add(system.pack)
  for (const id of system.packs) add(id)
  for (const source of Object.values(system.sources ?? {})) add(source?.pack)
  // An older pack's implicit system sees every pack's weather: only a declared one names its own.
  if (system.sources?.system)
    for (const key of Object.keys(system.weather ?? {})) add(key.split('/')[0])
  return out
}

export const GENERIC_SYSTEM: TravelSystem = {
  id: 'generic',
  name: '',
  rules: genericTravelRules,
  packs: [],
}

/**
 * "checks.2.event: Expected …" → a diagnostic pointing at that path of the definition,
 * found by its kind and id (`@travel-rules/default.checks.2.event`).
 */
function problem(
  pack: string,
  file: string,
  kind: string,
  error: string,
  id = 'default',
): Diagnostic {
  const cut = error.indexOf(': ')
  const path = cut > 0 ? error.slice(0, cut).replace(/^(rules|bindings)\.?/, '') : ''
  const message = cut > 0 ? error.slice(cut + 2) : error
  return {
    severity: 'error',
    message,
    pack,
    file,
    // `@kind/id` locates the definition (rules and bindings often share an id).
    at: `@${kind}/${id}${path ? `.${path}` : ''}`,
  }
}

type Extra = Registry['extras'] extends Map<string, (infer E)[]> ? E : never
const isText = (v: unknown): v is LocalizedText =>
  typeof v === 'string' ||
  (typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === 'string'))
/** How a system's parts are named in its problems. */
const PART_NAMES: Record<string, string> = {
  'travel-rules': 'travel rules',
  bindings: 'bindings',
  calendar: 'calendar',
  weather: 'weather model',
}
const SYSTEM_KEYS = new Set([
  'kind',
  'id',
  'name',
  'description',
  'travel',
  'bindings',
  'calendar',
  'weather',
  'packs',
  'maps',
])

/**
 * Travel systems of the loaded packs, after the generic one. A pack declares its own with
 * `kind: system` (which travel rules, bindings, calendar, weather models and packs each
 * brings); an older pack without one has an implicit system from its travel rules, its
 * bindings, its calendar and every pack's weather models. Broken parts are reported, and
 * a system whose travel rules are broken isn't loaded.
 */
export function travelSystems(registry: Registry): {
  systems: TravelSystem[]
  problems: Diagnostic[]
} {
  const systems = [GENERIC_SYSTEM]
  const problems: Diagnostic[] = []
  const extrasOf = (pack: string) => registry.extras.get(pack) ?? []
  // Weather models of every pack (`kind: weather`), by pack/id.
  const weather: Record<string, WeatherModel> = {}
  for (const [id] of registry.packs)
    for (const extra of extrasOf(id)) {
      if (extra.kind !== 'weather') continue
      const errors = extra.id ? validateWeather(extra.data) : ['id: a weather model needs one']
      problems.push(...errors.map((e) => problem(id, extra.file, 'weather', e, extra.id)))
      if (!errors.length) weather[`${id}/${extra.id}`] = extra.data as unknown as WeatherModel
    }
  // Every pack's bindings, parsed once; their tables checked.
  const bindingsOf = new Map<Extra, ReturnType<typeof parseBindings>>()
  for (const [id] of registry.packs)
    for (const extra of extrasOf(id)) {
      if (extra.kind !== 'bindings') continue
      const parsed = parseBindings(extra.data, id)
      bindingsOf.set(extra, parsed)
      problems.push(...parsed.errors.map((e) => problem(id, extra.file, 'bindings', e, extra.id)))
      const unknown = (path: string, target: string) =>
        problems.push(
          problem(
            id,
            extra.file,
            'bindings',
            `${path}: Unknown table or generator "${target}"`,
            extra.id,
          ),
        )
      const discover = parsed.bindings?.discover
      for (const key of ['terrain', 'contents'] as const) {
        const target = discover?.[key]?.resolve
        if (target && !registry.definitions.has(target)) unknown(`discover.${key}.resolve`, target)
      }
      for (const [event, binding] of Object.entries(parsed.bindings?.on ?? {}))
        if (binding.resolve && !registry.definitions.has(binding.resolve))
          unknown(`on.${event}.resolve`, binding.resolve)
    }

  /** A system made of these parts; undefined (and reported) when its rules are broken. */
  function build(
    pack: string,
    base: Omit<TravelSystem, 'rules' | 'bindings' | 'calendar' | 'weather' | 'sources'>,
    parts: {
      rules?: Extra
      bindings?: Extra
      calendar?: Extra
      weather: Record<string, WeatherModel>
      /** The `kind: system` naming these parts (absent for an implicit system). */
      system?: Extra
    },
  ): TravelSystem | undefined {
    let rules = genericTravelRules
    if (parts.rules) {
      const parsed = parseTravelRules(parts.rules.data)
      if (!parsed.rules) {
        problems.push(
          ...parsed.errors.map((e) =>
            problem(
              ownerOf(parts.rules!) ?? pack,
              parts.rules!.file,
              'travel-rules',
              e,
              parts.rules!.id,
            ),
          ),
        )
        return undefined
      }
      rules = parsed.rules
    }
    const bindings = parts.bindings ? bindingsOf.get(parts.bindings)?.bindings : undefined
    // Rules of a pack written for an older format keep their old meaning.
    if (parts.rules) {
      const owner = registry.packs.get(ownerOf(parts.rules) ?? pack)
      rules = migrateRules(rules, bindings, owner?.manifest.format ?? 1)
    }
    for (const [event, binding] of Object.entries(bindings?.on ?? {}))
      if (binding.weather && !parts.weather[binding.weather])
        problems.push(
          problem(
            ownerOf(parts.bindings!) ?? pack,
            parts.bindings!.file,
            'bindings',
            `on.${event}.weather: Unknown weather model "${binding.weather}"`,
            parts.bindings!.id,
          ),
        )
    let calendar: DataCalendar | undefined
    if (parts.calendar) {
      const errors = validateCalendar(parts.calendar.data)
      problems.push(
        ...errors.map((e) =>
          problem(
            ownerOf(parts.calendar!) ?? pack,
            parts.calendar!.file,
            'calendar',
            e,
            parts.calendar!.id,
          ),
        ),
      )
      if (!errors.length) calendar = calendarFrom(parts.calendar.data as unknown as CalendarDef)
    }
    if (parts.rules)
      problems.push(
        ...undeclaredEffects(registry, pack, rules, bindings, parts.rules.file, parts.rules.id),
      )
    const source = (extra: Extra | undefined, owner: string): SystemSource | undefined =>
      extra && { pack: owner, id: extra.id ?? 'default', file: extra.file }
    return {
      ...base,
      rules,
      ...(bindings && { bindings }),
      sources: {
        ...(parts.rules && { rules: source(parts.rules, ownerOf(parts.rules) ?? pack) }),
        ...(parts.bindings && {
          bindings: source(parts.bindings, ownerOf(parts.bindings) ?? pack),
        }),
        ...(parts.system && { system: source(parts.system, pack) }),
      },
      ...(calendar && { calendar }),
      ...(Object.keys(parts.weather).length && { weather: parts.weather }),
    }
  }
  const owners = new Map<Extra, string>()
  for (const [id] of registry.packs) for (const extra of extrasOf(id)) owners.set(extra, id)
  const ownerOf = (extra: Extra) => owners.get(extra)

  for (const [id, pack] of registry.packs) {
    const extras = extrasOf(id)
    const packName = typeof pack.manifest.name === 'string' ? pack.manifest.name : id
    const locale = typeof pack.manifest.locale === 'string' ? pack.manifest.locale : undefined
    const declared = extras.filter((e) => e.kind === 'system')
    if (!declared.length) {
      // An older pack: its travel rules make a system, with every pack's weather.
      const rules = extras.find((e) => e.kind === 'travel-rules')
      if (!rules) continue
      const system = build(
        id,
        { id, pack: id, name: packName, ...(locale && { locale }), packs: [id] },
        {
          rules,
          bindings: extras.find((e) => e.kind === 'bindings'),
          calendar: extras.find((e) => e.kind === 'calendar'),
          weather,
        },
      )
      if (system) systems.push(system)
      continue
    }
    const dependencies = Object.keys(pack.manifest.dependencies ?? {})
    for (const def of declared) {
      const report = (path: string, message: string) =>
        problems.push(problem(id, def.file, 'system', `${path}: ${message}`, def.id))
      const data = def.data
      const localId = def.id ?? 'default'
      for (const key of Object.keys(data))
        if (!SYSTEM_KEYS.has(key)) report(key, `Unknown key "${key}" in a system`)
      /** A part named `id` (this pack's) or `pack/id` (a dependency's). */
      const part = (key: string, kind: string, ref: unknown): Extra | undefined => {
        if (ref === undefined) return undefined
        if (typeof ref !== 'string' || !ref)
          return void report(key, `Expected the id of ${PART_NAMES[kind]}`)
        const [owner, partId] = ref.includes('/') ? ref.split('/', 2) : [id, ref]
        if (owner !== id && !dependencies.includes(owner))
          return void report(key, `"${owner}" isn't a dependency of this pack`)
        const found = extrasOf(owner).find((e) => e.kind === kind && (e.id ?? 'default') === partId)
        if (!found) report(key, `Unknown ${PART_NAMES[kind]} "${ref}"`)
        return found
      }
      const list = (key: string, value: unknown): string[] => {
        if (value === undefined) return []
        if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return value
        report(key, 'Expected a list of ids')
        return []
      }
      const own: Record<string, WeatherModel> = {}
      list('weather', data.weather).forEach((ref, i) => {
        const model = part(`weather.${i}`, 'weather', ref)
        const key = ref.includes('/') ? ref : `${id}/${ref}`
        if (model && weather[key]) own[key] = weather[key]
      })
      const packs = [id]
      list('packs', data.packs).forEach((other, i) => {
        if (other !== id && !dependencies.includes(other))
          report(`packs.${i}`, `"${other}" isn't a dependency of this pack`)
        else if (!packs.includes(other)) packs.push(other)
      })
      const bundles = registry.packs.get(id)?.bundles ?? []
      const maps = list('maps', data.maps).filter((path, i) => {
        if (bundles.includes(path)) return true
        report(
          `maps.${i}`,
          /\.otd\.json$/.test(path)
            ? `No map "${path}" in this pack`
            : `Expected the path of an OTD bundle in this pack (…/name.otd.json)`,
        )
        return false
      })
      for (const key of ['name', 'description'] as const)
        if (data[key] !== undefined && !isText(data[key])) report(key, 'Expected a text')
      const rules = part('travel', 'travel-rules', data.travel)
      if (data.travel !== undefined && !rules) continue
      const system = build(
        id,
        {
          id: localId === 'default' ? id : `${id}/${localId}`,
          pack: id,
          name: isText(data.name) ? data.name : packName,
          ...(isText(data.description) && { description: data.description }),
          ...(locale && { locale }),
          packs,
          ...(maps.length && { maps }),
        },
        {
          rules,
          bindings: part('bindings', 'bindings', data.bindings),
          calendar: part('calendar', 'calendar', data.calendar),
          weather: own,
          system: def,
        },
      )
      if (system) systems.push(system)
    }
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
  rulesId = 'default',
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
      check(own.effects, { file, at: `@travel-rules/${rulesId}.actions.${action}.effects` })
  ;(rules.checks ?? []).forEach((c, i) =>
    check(c.effects, { file, at: `@travel-rules/${rulesId}.checks.${i}.effects` }),
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
    /** For the weather (tables roll with the Oracle's own); seeded in tests and replays. */
    random?: RandomSource
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
      stats: system.bindings?.stats,
    }),
    oracle: system.bindings ? options.oracle : undefined,
    bindings: system.bindings,
    rules: system.rules,
    locale: options.locale,
    discovery,
    weather: system.weather,
    random: options.random,
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
    stats: options.system.bindings?.stats,
  })
  return engine.availability(session.travel, tripContext(session, {}))
}

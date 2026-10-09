import { mathRandom, type RandomSource } from '@open-tabletop/random'
import { nextWeather, type WeatherModel } from '@open-tabletop/weather-engine'
import {
  emptyState,
  mergeEffects,
  OracleError,
  type OracleEngine,
  type OracleState,
} from '@open-tabletop/oracle-engine'
import {
  validatePartyFrom,
  type CharacterState,
  type PartyFrom,
  type Share,
} from '@open-tabletop/character-engine'
import { applyEffects, effectsOf, type Effects, type LimitReached } from './effects'
import {
  applyMemberEffects,
  carriedBounds,
  carriedNow,
  isMemberPath,
  memberFacts,
  partyBlocks,
  refreshParty,
  settleParty,
  type PartyRules,
} from './party'
import {
  parseDiscover,
  type DiscoverBindings,
  type Discovery,
  type DiscoveryState,
} from './discovery'
import {
  declaredValues,
  hexIdOf,
  momentRolls,
  qualify,
  resolveChange,
  resourceBounds,
  upgradeTravelState,
  type Bounds,
  type CheckOutcome,
  type DayValue,
  type TravelAction,
  type TravelEngine,
  type TravelEvent,
  type TravelRules,
  type TravelState,
} from '@open-tabletop/travel-engine'

/** Text in one or several languages: "Presence" or { en: Presence, es: Presencia }. */
export type LocalizedText = string | Record<string, string>

/** A party stat the system's tables use (e.g. Kal-Arath's PRE in reaction rolls). */
export interface StatDefinition {
  name?: LocalizedText
  description?: LocalizedText
  default?: number
  /** Effects never take it below / above these. */
  min?: number
  max?: number
  /**
   * Made of the members' values while the party has members (`{ max: survival }`, `{ count:
   * true }`); kept like any other stat while it has none.
   */
  from?: PartyFrom
}

/**
 * A supply the members carry between them (`carried`: the value of their sheet that holds
 * it): with members, the party's is their sum, and what the trip spends or gains is shared
 * out among them (`share`: `even` by default, or `order`).
 */
export interface CarriedSupply {
  carried: string
  share?: Share
}

/**
 * `kind: bindings` in a pack: which Oracle definition resolves each travel check, and
 * which party stats the tables read from the context.
 */
export interface Bindings {
  /**
   * Per check event: the table or generator that resolves it (`resolve`), or a weather
   * model that does (`weather`: today's weather follows yesterday's), with extra context.
   */
  on: Record<string, { resolve?: string; weather?: string; context?: Record<string, unknown> }>
  stats?: Record<string, StatDefinition>
  /** Supplies the members carry, by the travel rules' id. */
  resources?: Record<string, CarriedSupply>
  /**
   * Journey roles (lead the way, keep watch…): jobs the player gives the characters, read
   * as `roles.<id>.*` (the holder's values and conditions), each with a name for players.
   */
  roles?: Record<string, { name?: LocalizedText; description?: LocalizedText }>
  /** Tables that decide empty hexes as the party travels (the host may turn it off). */
  discover?: DiscoverBindings
}

/** Picks the requested language, then the fallback, then any available text. */
export function localize(
  text: LocalizedText | undefined,
  locale: string,
  fallback?: string,
): string | undefined {
  if (text === undefined || typeof text === 'string') return text
  return text[locale] ?? (fallback ? text[fallback] : undefined) ?? Object.values(text)[0]
}

export function parseBindings(
  raw: unknown,
  pack?: string,
): { bindings?: Bindings; errors: string[] } {
  const on = (raw as { on?: unknown })?.on
  if (typeof on !== 'object' || on === null) return { errors: ['bindings: missing "on"'] }
  const out: Bindings = { on: {} }
  const errors: string[] = []
  for (const [event, value] of Object.entries(on)) {
    const target = (value as { resolve?: unknown })?.resolve
    const weather = (value as { weather?: unknown })?.weather
    const ok = (v: unknown): v is string => typeof v === 'string' && !!v
    if (ok(target) === ok(weather)) {
      errors.push(`bindings.on.${event}: needs "resolve" (a table) or "weather" (a model)`)
      continue
    }
    // Local ids are resolved in the pack that declares the bindings.
    const qualify = (id: string) => (pack && !id.includes('/') ? `${pack}/${id}` : id)
    const context = (value as { context?: unknown }).context
    out.on[event] = {
      ...(ok(target) ? { resolve: qualify(target) } : { weather: qualify(weather as string) }),
      ...(typeof context === 'object' &&
        context !== null && { context: context as Record<string, unknown> }),
    }
  }
  const discover = parseDiscover((raw as { discover?: unknown })?.discover, pack, errors)
  if (discover) out.discover = discover
  const stats = (raw as { stats?: unknown })?.stats
  if (typeof stats === 'object' && stats !== null) {
    out.stats = {}
    for (const [key, value] of Object.entries(stats)) {
      const v = (typeof value === 'object' && value !== null ? value : {}) as Record<
        string,
        unknown
      >
      const text = (t: unknown) =>
        typeof t === 'string' || (typeof t === 'object' && t !== null)
          ? (t as LocalizedText)
          : undefined
      out.stats[key] = {
        name: text(v.name),
        description: text(v.description),
        default: typeof v.default === 'number' ? v.default : 0,
        ...(typeof v.min === 'number' && { min: v.min }),
        ...(typeof v.max === 'number' && { max: v.max }),
      }
      if (v.from !== undefined) {
        const problems = validatePartyFrom(v.from, `bindings.stats.${key}.from`)
        if (problems.length) errors.push(...problems)
        else out.stats[key].from = v.from as PartyFrom
      }
    }
  }
  const roles = (raw as { roles?: unknown })?.roles
  if (roles !== undefined) {
    if (typeof roles !== 'object' || roles === null || Array.isArray(roles))
      errors.push('bindings.roles: expected roles by id')
    else
      for (const [key, value] of Object.entries(roles)) {
        const v = (typeof value === 'object' && value !== null ? value : {}) as Record<
          string,
          unknown
        >
        for (const k of Object.keys(v))
          if (k !== 'name' && k !== 'description')
            errors.push(`bindings.roles.${key}: unknown key "${k}"`)
        const text = (t: unknown) =>
          typeof t === 'string' || (typeof t === 'object' && t !== null)
            ? (t as LocalizedText)
            : undefined
        ;(out.roles ??= {})[key] = {
          ...(text(v.name) && { name: text(v.name) }),
          ...(text(v.description) && { description: text(v.description) }),
        }
      }
  }
  const resources = (raw as { resources?: unknown })?.resources
  if (resources !== undefined) {
    if (typeof resources !== 'object' || resources === null || Array.isArray(resources))
      errors.push('bindings.resources: expected supplies by id')
    else
      for (const [key, value] of Object.entries(resources)) {
        const at = `bindings.resources.${key}`
        const v = (typeof value === 'object' && value !== null ? value : {}) as Record<
          string,
          unknown
        >
        if (typeof v.carried !== 'string' || !v.carried) {
          errors.push(`${at}.carried: the id of a value of the members' sheet`)
          continue
        }
        if (v.share !== undefined && v.share !== 'even' && v.share !== 'order') {
          errors.push(`${at}.share: even or order`)
          continue
        }
        for (const k of Object.keys(v))
          if (k !== 'carried' && k !== 'share') errors.push(`${at}: unknown key "${k}"`)
        ;(out.resources ??= {})[key] = {
          carried: v.carried,
          ...(v.share !== undefined && { share: v.share as Share }),
        }
      }
  }
  return errors.length ? { errors } : { bindings: out, errors: [] }
}

export interface JournalEntry {
  id: string
  /** Game time (minutes). */
  time: number
  /** Real-world ISO timestamp. */
  at: string
  source: 'travel' | 'oracle' | 'user'
  /** Language-neutral code; the UI translates it (DAY_STARTED, HEX_ENTERED, ORACLE_RESULT…). */
  code: string
  /** Free text (e.g. a rendered table result, already in the pack's language). */
  text?: string
  data?: Record<string, unknown>
}

export interface SessionState {
  travel: TravelState
  oracle: OracleState
  /** Party stats available to tables (e.g. pre for Kal-Arath reactions). */
  stats: Record<string, number>
  /** Values from today's results that later checks use (weather modifiers…). */
  dayVars: Record<string, unknown>
  /** The day before's values, read by tables as `yesterday.*` (absent: none). */
  yesterday?: Record<string, unknown>
  journal: JournalEntry[]
  nextEntry: number
  /** Discovery: hexes revealed whose contents are still to be rolled. */
  discovery?: DiscoveryState
  /** The party's characters, in order (none: the party is played as a whole). */
  members?: CharacterState[]
  /** The member acting now (`acting.*`), chosen by the player. */
  acting?: string
  /** Who holds each of the system's journey roles (`roles.<id>.*`), chosen by the player. */
  roles?: Record<string, string>
  /** On a weather model's hex flower, the cell today's weather is on (`q,r`). */
  weatherAt?: string
}

export function initialSessionState(
  travel: TravelState,
  stats: Record<string, number> = {},
): SessionState {
  return { travel, oracle: emptyState(), stats, dayVars: {}, journal: [], nextEntry: 1 }
}

/**
 * The party as tables read it: `{{party.resources.food}}`, `party.stats.survival`…, and
 * its members' ids (`party.members`) when it has them.
 */
export function partyValues(s: SessionState): Record<string, unknown> {
  return {
    stats: { ...s.stats },
    resources: { ...s.travel.resources },
    mode: s.travel.mode,
    ...(s.members?.length && { members: s.members.map((m) => m.id) }),
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** The hex and moment a context is about (for its rolls). */
const hexOf = (seen: Record<string, unknown>) => hexIdOf(seen)
const momentOf = (seen: Record<string, unknown>) =>
  typeof seen.moment === 'string' ? seen.moment : undefined

/**
 * What a table rolled during a trip sees, later sources winning: the party stats by
 * name (`{{survival}}`) and today's values, then the facts of the map and the trip
 * (`terrain`, `weather`… so a stat can't hide them), then `party` and `yesterday` (the
 * day before's values and whether the party ended it lost), then `extra` (a binding's
 * context). `party.stats.x` always reaches a stat, whatever its name.
 */
export function tripContext(
  s: SessionState,
  facts: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  // The day before's values: the session's, then the ones the system declares (lost…).
  const yesterday = { ...s.yesterday, ...upgradeTravelState(s.travel).yesterday }
  // Today's values: the session's (weather, modifiers…), then the ones the system declares.
  const today = { ...s.dayVars, ...upgradeTravelState(s.travel).today }
  // What the host says of the party (what its members block) goes with the party.
  const host = isRecord(facts.party) ? facts.party : {}
  return qualify({
    ...s.stats,
    ...s.dayVars,
    ...facts,
    ...memberFacts(s),
    party: { ...host, ...partyValues(s) },
    today,
    yesterday,
    ...extra,
  })
}

/**
 * What a result would change in a trip, as `[path, change]` pairs: its effects
 * (`['party.resources.food', -1]`, `['party.stats.fatigue', '=0']`) and the weather.
 */
export function tripChanges(value: Record<string, unknown>): [string, number | string][] {
  const changes: [string, number | string][] = Object.entries(effectsOf(value))
  if (typeof value.weather === 'string') changes.push(['weather', value.weather])
  return changes
}

/**
 * Applies a result rolled by hand to the trip, as a check's would be: its effects, and
 * `weather` becomes today's. `stats` and `resources` are the system's, for their bounds
 * (`resourceBounds(rules)`).
 */
export function applyResult(
  input: SessionState,
  value: Record<string, unknown>,
  stats: Record<string, StatDefinition> = {},
  resources: Record<string, Bounds> = {},
  /** The party's members' sheet and bindings, when the system has them. */
  party: PartyRules = {},
): SessionState {
  const s = structuredClone(input)
  refreshParty(s, party)
  const before = carriedNow(s, party)
  const effects = effectsOf(value)
  const context = { ...tripContext(s, {}), ...value }
  applyEffects(s, effects, stats, { ...resources, ...carriedBounds(s, party) }, context)
  applyMemberEffects(s, effects, party, context, s.travel.time)
  settleParty(s, party, before)
  if (typeof value.weather === 'string') s.travel.weather = value.weather
  return s
}

export interface Session {
  /** Applies a travel action, resolving checks with the Oracle when bound; returns new entries. */
  step(state: SessionState, action: TravelAction): { state: SessionState; entries: JournalEntry[] }
  /** Adds a user note to the journal. */
  note(state: SessionState, text: string): SessionState
}

const QUIET_STOPS = new Set(['check', 'destination', 'hex', 'waited'])
/** The journal line of an action, which its steps' effects are added to. */
const isActionLine = (e: JournalEntry, action: string) =>
  e.code === 'ACTION_TAKEN' && e.data?.action === action
const JOURNALED: TravelEvent['type'][] = [
  'DAY_STARTED',
  'HEX_ENTERED',
  'ACTION_TAKEN',
  'LIMIT_REACHED',
  'NIGHT_WITHOUT',
  'DESTINATION_REACHED',
  'ROUTE_BLOCKED',
  'NO_ROUTE',
  'TRAVEL_STOPPED',
]

export function createSession(options: {
  travel: TravelEngine
  oracle?: OracleEngine
  bindings?: Bindings
  /** Locale for oracle texts. */
  locale?: string
  now?: () => string
  /** Safety limit for automatic continue-after-check loops. */
  maxAutoSteps?: number
  /**
   * Discovery for this step (its world must be the one the travel engine uses): travel
   * goes hex by hex, deciding empty hexes on the way and re-planning the route.
   */
  discovery?: Discovery
  /** Weather models bindings may name (`weather: pack/id`). */
  weather?: Record<string, WeatherModel>
  /** For the weather (tables use the Oracle's own). */
  random?: RandomSource
  /** The system's travel rules: the values it declares (lost…), set by results. */
  rules?: TravelRules
  /**
   * What the host knows besides the trip, for conditions and tables: the world clock's
   * `clocks` and today's `events` (`worldFacts` of the world engine).
   */
  facts?: Record<string, unknown>
  /** The sheet the party's members are made with (the system's), if it has one. */
  sheet?: PartyRules['sheet']
}): Session {
  const random = options.random ?? mathRandom()
  const host = options.facts ?? {}
  const now = options.now ?? (() => new Date().toISOString())
  const discovery = options.discovery
  const declared = options.rules ? declaredValues(options.rules) : undefined
  const supplies = options.rules ? resourceBounds(options.rules) : {}
  const stats = options.bindings?.stats
  const party: PartyRules = { sheet: options.sheet, bindings: options.bindings }
  /** The host's facts, with what the members' conditions block (for the travel engine). */
  const hostOf = (s: SessionState, more: Record<string, unknown> = {}) => {
    const blocked = partyBlocks(s, party)
    return Object.keys(blocked).length
      ? {
          ...host,
          ...more,
          party: { ...(isRecord(host.party) ? host.party : {}), blocked },
        }
      : { ...host, ...more }
  }
  // Hex by hex, a long trip takes many steps.
  const maxAuto = options.maxAutoSteps ?? (discovery ? 500 : 20)

  const add = (
    s: SessionState,
    entries: JournalEntry[],
    entry: Omit<JournalEntry, 'id' | 'at' | 'time'> & { time?: JournalEntry['time'] },
  ) => {
    const full: JournalEntry = { id: `j${s.nextEntry++}`, time: s.travel.time, at: now(), ...entry }
    s.journal.push(full)
    entries.push(full)
  }

  const journalEvent = (s: SessionState, entries: JournalEntry[], e: TravelEvent) => {
    if (!JOURNALED.includes(e.type)) return
    if (e.type === 'TRAVEL_STOPPED' && QUIET_STOPS.has(e.reason)) return
    const { type, ...data } = e
    // Events carry the moment they happened (a whole day of travel is one step).
    const time = 'time' in e ? e.time : undefined
    add(s, entries, {
      source: 'travel',
      code: type,
      data: data as Record<string, unknown>,
      ...(time !== undefined && { time }),
    })
  }

  return {
    step(input, action) {
      const s = structuredClone(input)
      const entries: JournalEntry[] = []
      // The members as they are now (the player may have changed them by hand).
      refreshParty(s, party)
      let carried = carriedNow(s, party)
      /** Shares out what the supplies the members carry changed, and brings the party up to date. */
      const settle = () => {
        settleParty(s, party, carried)
        carried = carriedNow(s, party)
      }
      /**
       * Effects on the members (`party.members.…`, `characters.<id>.…`, `acting.…`): applied,
       * with what hit a bound, and a line when nobody was acting.
       */
      const memberEffects = (
        effects: Effects,
        context: Record<string, unknown>,
        time: number,
      ): LimitReached[] => {
        const done = applyMemberEffects(s, effects, party, context, time)
        for (const path of done.nobody)
          add(s, entries, { source: 'travel', code: 'NOBODY_ACTING', time, data: { path } })
        return done.limits
      }
      /** Supplies' bounds now (the members' sums for what they carry). */
      const suppliesNow = () => ({ ...supplies, ...carriedBounds(s, party) })
      /** Discovers at the party's hex; true when it found something to stop for. */
      const arrive = (hex: string, from?: string, time?: number): boolean => {
        if (!discovery) return false
        let outcome: ReturnType<Discovery['arrive']>
        try {
          outcome = discovery.arrive(s, tripContext(s, hostOf(s)), hex, from)
        } catch (error) {
          if (!(error instanceof OracleError)) throw error
          add(s, entries, {
            source: 'travel',
            code: 'DISCOVERY_FAILED',
            ...(time !== undefined && { time }),
            text: error.message,
            data: { hex },
          })
          return false
        }
        const { text, discovered } = outcome
        if (!discovered) return false
        add(s, entries, {
          source: 'oracle',
          code: 'HEX_DISCOVERED',
          ...(time !== undefined && { time }),
          ...(text && { text }),
          data: { hex, ...discovered },
        })
        return !!discovered.poi
      }
      const travelling = action.type === 'travel'
      // Before setting off (or choosing where to go), see around the party.
      if (discovery && (travelling || action.type === 'setDestination'))
        if (arrive(s.travel.location) && travelling) return { state: s, entries }
      // Discovering, a travel order goes hex by hex (until a moment, if it has one).
      const hexByHex: TravelAction = {
        type: 'travel',
        until: 'hex',
        ...(action.type === 'travel' && action.by !== undefined && { by: action.by }),
      }
      let act: TravelAction = discovery && travelling ? hexByHex : action
      // A wait goes on after each check it stops for, like a travel order.
      const waiting = action.type === 'wait'
      if (waiting && action.until > s.travel.time)
        add(s, entries, { source: 'travel', code: 'WAIT', data: { until: action.until } })
      // A long wait, or a trip going on by itself until a moment, stops for its checks every day.
      const long = waiting || (action.type === 'travel' && action.by !== undefined)
      const limit = long ? Math.max(maxAuto, 2000) : maxAuto
      for (let i = 0; i <= limit; i++) {
        const dayBefore = s.travel.day
        const from = s.travel.location
        // Conditions on actions and checks also see the party and today's values.
        const result = options.travel.apply(s.travel, act, tripContext(s, hostOf(s)))
        s.travel = result.state
        // What the engine took from the supplies the members carry, taken from them.
        settle()
        if (s.travel.day !== dayBefore) {
          // Today's values become yesterday's (none if more than a day went by).
          s.yesterday = s.travel.day === dayBefore + 1 ? s.dayVars : {}
          s.dayVars = {}
        }
        let resolvedAll = true
        let found = false
        for (const event of result.events) {
          journalEvent(s, entries, event)
          // An action's step changes the party (the engine already changed the supplies, and
          // told what hit a bound): applied, and told on the action's line.
          if (event.type === 'EFFECTS') {
            const own = Object.fromEntries(
              Object.entries(event.effects).filter(([p]) => !p.startsWith('party.resources.')),
            )
            applyEffects({ stats: s.stats, travel: { resources: {} } }, own, stats)
            for (const limit of memberEffects(event.effects, tripContext(s, host), event.time))
              add(s, entries, {
                source: 'travel',
                code: 'LIMIT_REACHED',
                time: event.time,
                data: { ...limit },
              })
            settle()
            const line = entries.findLast((e) => isActionLine(e, event.action))
            // A party without characters: what the system says of them didn't happen.
            const told = s.members?.length
              ? event.effects
              : Object.fromEntries(Object.entries(event.effects).filter(([p]) => !isMemberPath(p)))
            if (line && Object.keys(told).length)
              line.data = {
                ...line.data,
                effects: mergeEffects(
                  line.data?.effects as Record<string, number | string> | undefined,
                  told,
                ),
              }
            continue
          }
          if (event.type === 'HEX_ENTERED') found = arrive(event.hex, from, event.time) || found
          if (event.type !== 'CHECK_REQUIRED') continue
          const binding = options.bindings?.on[event.check.event]
          // A check's own effects (the system's rules as data: hunger, a fed night's sleep…).
          if (event.check.effects) {
            const seenNow = tripContext(s, { ...host, ...event.check.context })
            const { limits } = applyEffects(s, event.check.effects, stats, suppliesNow(), seenNow)
            limits.push(...memberEffects(event.check.effects, seenNow, event.time))
            settle()
            // A party without characters: only what happened to it is told (nothing, when
            // the check only changes characters).
            const told = s.members?.length
              ? event.check.effects
              : Object.fromEntries(
                  Object.entries(event.check.effects).filter(([p]) => !isMemberPath(p)),
                )
            if (Object.keys(told).length)
              add(s, entries, {
                source: 'travel',
                code: 'CHECK_EFFECTS',
                time: event.time,
                data: { event: event.check.event, effects: told },
              })
            for (const limit of limits)
              add(s, entries, {
                source: 'travel',
                code: 'LIMIT_REACHED',
                time: event.time,
                data: { ...limit },
              })
          }
          if (!binding) {
            // Nothing rolls it: the journal says it came up (its effects' line, if it has
            // any), and it only stops the trip when it says so (`pause: true`).
            if (!event.check.effects)
              add(s, entries, {
                source: 'travel',
                code: 'CHECK_NOTED',
                time: event.time,
                data: { event: event.check.event },
              })
            if (!event.check.pause) {
              s.travel = options.travel.apply(s.travel, {
                type: 'resolveCheck',
                id: event.check.id,
              }).state
              continue
            }
          }
          if (!binding || !options.oracle) {
            resolvedAll = false
            add(s, entries, {
              source: 'travel',
              code: 'CHECK_PENDING',
              time: event.time,
              data: { event: event.check.event, id: event.check.id },
            })
            continue
          }
          const context = tripContext(s, { ...host, ...event.check.context }, binding.context)
          let value: Record<string, unknown>
          let text: string | undefined
          try {
            if (binding.weather) {
              const model = options.weather?.[binding.weather]
              if (!model) throw new OracleError(`Unknown weather model "${binding.weather}"`)
              // Today's weather follows yesterday's (the trip's until now).
              const day = nextWeather(model, {
                season: typeof context.season === 'string' ? context.season : undefined,
                previous: s.travel.weather,
                at: s.weatherAt,
                random,
              })
              // On a hex flower, where the day is: tomorrow moves on from there.
              if (day.at) s.weatherAt = day.at
              else delete s.weatherAt
              value = day.value
              text = localize(day.name, options.locale ?? 'en', 'en') ?? day.weather
            } else {
              const out = options.oracle.resolve(binding.resolve!, context, s.oracle, {
                locale: options.locale,
              })
              s.oracle = out.state
              value = out.resolution.value
              text = out.resolution.text
            }
          } catch (error) {
            // A broken pack (unknown table, a roll that needs a missing number…) must not
            // lose the trip: the check stays pending and the journal says why.
            if (!(error instanceof OracleError)) throw error
            resolvedAll = false
            add(s, entries, {
              source: 'travel',
              code: 'CHECK_FAILED',
              time: event.time,
              text: error.message,
              data: {
                event: event.check.event,
                id: event.check.id,
                table: binding.resolve ?? binding.weather,
              },
            })
            continue
          }
          // Its effects with the variables they name read now (`'-{{party.stats.mouths}}'`;
          // the Oracle reads its own entries' first): the journal says what they did.
          const seen = { ...tripContext(s, { ...host, ...event.check.context }), ...value }
          const written = effectsOf(value)
          const effects = Object.fromEntries(
            Object.entries(written).map(([p, c]) => [
              p,
              resolveChange(c, seen, momentRolls(s.travel, hexOf(seen), momentOf(seen))),
            ]),
          )
          // Written with variables (the Oracle renders its own: '-{{loss}}' comes as '-2'),
          // the journal keeps them as numbers.
          const named = Object.values((value.effects ?? {}) as Record<string, unknown>).some(
            (c) => typeof c === 'string' && !c.trim().startsWith('='),
          )
          add(s, entries, {
            source: 'oracle',
            code: 'ORACLE_RESULT',
            // When the check came up (e.g. a night encounter belongs to the camp, not dawn).
            time: event.time,
            text,
            data: {
              event: event.check.event,
              ...(binding.weather ? { weather: binding.weather } : { table: binding.resolve }),
              value: named ? { ...value, effects } : value,
            },
          })
          s.dayVars = { ...s.dayVars, ...dayVariables(value, declared) }
          const limits = [
            ...applyEffects(s, effects, stats, suppliesNow()).limits,
            ...memberEffects(effects, seen, event.time),
          ]
          settle()
          for (const limit of limits)
            add(s, entries, {
              source: 'travel',
              code: 'LIMIT_REACHED',
              time: event.time,
              data: { ...limit },
            })
          // A pause (the check's, or an entry's that came up) stops the trip after the roll:
          // the check waits, rolled, until the player presses Continue.
          if (event.check.pause || value.pause === true) {
            const pending = s.travel.pendingChecks.find((c) => c.id === event.check.id)
            if (pending) pending.rolled = toOutcome(value, declared)
            resolvedAll = false
            add(s, entries, {
              source: 'travel',
              code: 'CHECK_PAUSED',
              time: event.time,
              data: { event: event.check.event, id: event.check.id },
            })
            continue
          }
          s.travel = options.travel.apply(s.travel, {
            type: 'resolveCheck',
            id: event.check.id,
            outcome: toOutcome(value, declared),
          }).state
        }
        const stopped = result.events.findLast((e) => e.type === 'TRAVEL_STOPPED')
        const reason = stopped?.type === 'TRAVEL_STOPPED' ? stopped.reason : undefined
        const clear =
          (travelling || waiting) && resolvedAll && s.travel.pendingChecks.length === 0 && !found
        // A travel order keeps going once its checks are resolved…
        let keepGoing = clear && reason === 'check'
        // …and, discovering, from hex to hex, with the route re-planned over what was found
        // (only a travel order: a wait goes on waiting where the party is).
        if (
          travelling &&
          discovery &&
          clear &&
          (reason === 'hex' || reason === 'check') &&
          (action as { until?: string }).until !== 'hex'
        ) {
          const destination = s.travel.destination
          if (!destination) break
          const planned = options.travel.apply(s.travel, {
            type: 'setDestination',
            hex: destination,
          })
          s.travel = planned.state
          for (const event of planned.events) journalEvent(s, entries, event)
          keepGoing = !!s.travel.route
        }
        if (!keepGoing) break
        act = discovery && travelling ? hexByHex : action
      }
      return { state: s, entries }
    },
    note(input, text) {
      return addEntry(input, { source: 'user', code: 'NOTE', text }, now())
    },
  }
}

/**
 * Adds an entry to the journal at the current game time, outside a travel step: user
 * notes, or tables rolled by hand (`source: 'oracle'`, `code: 'ORACLE_ROLL'`).
 */
export function addEntry(
  input: SessionState,
  entry: Omit<JournalEntry, 'id' | 'at' | 'time'>,
  at: string = new Date().toISOString(),
): SessionState {
  const s = structuredClone(input)
  s.journal.push({ id: `j${s.nextEntry++}`, time: s.travel.time, at, ...entry })
  return s
}

/**
 * Table values that the travel engine understands as a check outcome (its effects on the
 * party are applied by the session: `effectsOf`).
 */
export function toOutcome(
  value: Record<string, unknown>,
  /** The system's declared values (default: the older built-in `lost`). */
  declared: Record<string, DayValue> = { lost: {} },
): CheckOutcome {
  const outcome: CheckOutcome = {}
  const values = Object.fromEntries(
    Object.keys(declared).flatMap((id) => (id in value ? [[id, value[id]]] : [])),
  )
  if (Object.keys(values).length) outcome.values = values
  if (typeof value.weather === 'string') outcome.weather = value.weather
  return outcome
}

/**
 * Values later checks of the same day may need: weather, any `*Modifier`, `*Impossible`,
 * and the values the system declares (lost…).
 */
export function dayVariables(
  value: Record<string, unknown>,
  declared: Record<string, DayValue> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value))
    if (
      key === 'weather' ||
      key.endsWith('Modifier') ||
      key.endsWith('Impossible') ||
      key in declared
    )
      out[key] = v
  return out
}
export * from './effects'
export * from './trip'
export * from './discovery'
export * from './suggestions'
export * from './formats'
// The full names of facts (`hex.terrain`, `trip.day`…), for hosts that build contexts.
export { FACT_GROUPS, FACT_PATHS, hexIdOf, qualify } from '@open-tabletop/travel-engine'
export * from './party'
export * from './factions'

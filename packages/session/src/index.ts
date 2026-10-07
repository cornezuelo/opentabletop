import {
  emptyState,
  OracleError,
  type OracleEngine,
  type OracleState,
} from '@open-tabletop/oracle-engine'
import {
  parseDiscover,
  type DiscoverBindings,
  type Discovery,
  type DiscoveryState,
} from './discovery'
import type {
  CheckOutcome,
  TravelAction,
  TravelEngine,
  TravelEvent,
  TravelState,
} from '@open-tabletop/travel-engine'

/** Text in one or several languages: "Presence" or { en: Presence, es: Presencia }. */
export type LocalizedText = string | Record<string, string>

/** A party stat the system's tables use (e.g. Kal-Arath's PRE in reaction rolls). */
export interface StatDefinition {
  name?: LocalizedText
  description?: LocalizedText
  default?: number
}

/**
 * `kind: bindings` in a pack: which Oracle definition resolves each travel check, and
 * which party stats the tables read from the context.
 */
export interface Bindings {
  on: Record<string, { resolve: string; context?: Record<string, unknown> }>
  stats?: Record<string, StatDefinition>
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
    if (typeof target !== 'string' || !target) {
      errors.push(`bindings.on.${event}: needs "resolve"`)
      continue
    }
    const context = (value as { context?: unknown }).context
    out.on[event] = {
      // Local ids are resolved in the pack that declares the bindings.
      resolve: pack && !target.includes('/') ? `${pack}/${target}` : target,
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
  journal: JournalEntry[]
  nextEntry: number
  /** Discovery: hexes revealed whose contents are still to be rolled. */
  discovery?: DiscoveryState
}

export function initialSessionState(
  travel: TravelState,
  stats: Record<string, number> = {},
): SessionState {
  return { travel, oracle: emptyState(), stats, dayVars: {}, journal: [], nextEntry: 1 }
}

export interface Session {
  /** Applies a travel action, resolving checks with the Oracle when bound; returns new entries. */
  step(state: SessionState, action: TravelAction): { state: SessionState; entries: JournalEntry[] }
  /** Adds a user note to the journal. */
  note(state: SessionState, text: string): SessionState
}

const QUIET_STOPS = new Set(['check', 'destination', 'hex'])
const JOURNALED: TravelEvent['type'][] = [
  'DAY_STARTED',
  'HEX_ENTERED',
  'CAMP_STARTED',
  'ACTION_TAKEN',
  'RESOURCE_DEPLETED',
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
}): Session {
  const now = options.now ?? (() => new Date().toISOString())
  const discovery = options.discovery
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
      /** Discovers at the party's hex; true when it found something to stop for. */
      const arrive = (hex: string, from?: string, time?: number): boolean => {
        if (!discovery) return false
        let outcome: ReturnType<Discovery['arrive']>
        try {
          outcome = discovery.arrive(s, { ...s.stats, ...s.dayVars }, hex, from)
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
      let act: TravelAction = discovery && travelling ? { type: 'travel', until: 'hex' } : action
      for (let i = 0; i <= maxAuto; i++) {
        const dayBefore = s.travel.day
        const from = s.travel.location
        const result = options.travel.apply(s.travel, act)
        s.travel = result.state
        if (s.travel.day !== dayBefore) s.dayVars = {}
        let resolvedAll = true
        let found = false
        for (const event of result.events) {
          journalEvent(s, entries, event)
          if (event.type === 'HEX_ENTERED') found = arrive(event.hex, from, event.time) || found
          if (event.type !== 'CHECK_REQUIRED') continue
          const binding = options.bindings?.on[event.check.event]
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
          const context = { ...event.check.context, ...s.stats, ...s.dayVars, ...binding.context }
          let out: ReturnType<OracleEngine['resolve']>
          try {
            out = options.oracle.resolve(binding.resolve, context, s.oracle, {
              locale: options.locale,
            })
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
              data: { event: event.check.event, id: event.check.id, table: binding.resolve },
            })
            continue
          }
          s.oracle = out.state
          const value = out.resolution.value
          add(s, entries, {
            source: 'oracle',
            code: 'ORACLE_RESULT',
            // When the check came up (e.g. a night encounter belongs to the camp, not dawn).
            time: event.time,
            text: out.resolution.text,
            data: { event: event.check.event, table: binding.resolve, value },
          })
          s.dayVars = { ...s.dayVars, ...dayVariables(value) }
          s.travel = options.travel.apply(s.travel, {
            type: 'resolveCheck',
            id: event.check.id,
            outcome: toOutcome(value),
          }).state
        }
        const stopped = result.events.findLast((e) => e.type === 'TRAVEL_STOPPED')
        const reason = stopped?.type === 'TRAVEL_STOPPED' ? stopped.reason : undefined
        const clear = travelling && resolvedAll && s.travel.pendingChecks.length === 0 && !found
        // A travel order keeps going once its checks are resolved…
        let keepGoing = clear && reason === 'check'
        // …and, discovering, from hex to hex, with the route re-planned over what was found.
        if (
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
        act = discovery ? { type: 'travel', until: 'hex' } : action
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

/** Table values that the travel engine understands as a check outcome. */
export function toOutcome(value: Record<string, unknown>): CheckOutcome {
  const outcome: CheckOutcome = {}
  if (value.lost === true) outcome.lost = true
  if (typeof value.weather === 'string') outcome.weather = value.weather
  if (typeof value.fatigue === 'number') outcome.fatigue = value.fatigue
  if (typeof value.resources === 'object' && value.resources !== null) {
    const numbers = Object.entries(value.resources).filter(
      (e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]),
    )
    if (numbers.length) outcome.resources = Object.fromEntries(numbers)
  }
  return outcome
}

/** Values later checks of the same day may need: weather, any `*Modifier`, `*Impossible`. */
export function dayVariables(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value))
    if (key === 'weather' || key.endsWith('Modifier') || key.endsWith('Impossible')) out[key] = v
  return out
}
export * from './trip'
export * from './discovery'

import type { Diagnostic, OracleEngine, Registry } from '@open-tabletop/oracle-engine'
import { defaultCalendar } from '@open-tabletop/time'
import {
  createTravelEngine,
  genericTravelRules,
  initialTravelState,
  parseTravelRules,
  type TravelAction,
  type TravelRules,
  type TravelWorld,
} from '@open-tabletop/travel-engine'
import {
  createSession,
  initialSessionState,
  parseBindings,
  type Bindings,
  type JournalEntry,
  type SessionState,
} from './index'

/** A travel system: rules (and optional bindings) from a pack, or the generic rules. */
export interface TravelSystem {
  /** Pack id, or 'generic' for the built-in rules. */
  id: string
  /** The pack's name ('' for generic: the UI names it). */
  name: string
  rules: TravelRules
  bindings?: Bindings
}

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
  for (const [id, pack] of registry.packs) {
    const extras = registry.extras.get(id) ?? []
    const rulesRaw = extras.find((e) => e.kind === 'travel-rules')
    const bindingsRaw = extras.find((e) => e.kind === 'bindings')
    const parsed = bindingsRaw ? parseBindings(bindingsRaw.data, id) : undefined
    if (bindingsRaw) {
      problems.push(
        ...(parsed?.errors ?? []).map((e) => problem(id, bindingsRaw.file, 'bindings', e)),
      )
      for (const [event, binding] of Object.entries(parsed?.bindings?.on ?? {}))
        if (!registry.definitions.has(binding.resolve))
          problems.push(
            problem(
              id,
              bindingsRaw.file,
              'bindings',
              `on.${event}.resolve: Unknown table or generator "${binding.resolve}"`,
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
    systems.push({ id, name, rules, bindings: parsed?.bindings })
  }
  return { systems, problems }
}

/** First day of each season in the default calendar. */
export const SEASON_START_DAYS = { spring: 1, summer: 91, autumn: 181, winter: 271 } as const
export type Season = keyof typeof SEASON_START_DAYS

/**
 * A new trip at `location`: first travel mode of the rules, dawn of the season's first
 * day, 6 of each resource, and the system's declared stats (values in `stats` win).
 */
export function startTrip(options: {
  system: TravelSystem
  location: string
  season?: Season
  stats?: Record<string, number>
}): { startDay: number; session: SessionState } {
  const { rules, bindings } = options.system
  const startDay = SEASON_START_DAYS[options.season ?? 'spring']
  const travel = initialTravelState({
    location: options.location,
    mode: Object.keys(rules.modes)[0],
    time: defaultCalendar.at(startDay, rules.day.start),
    resources: Object.fromEntries(Object.keys(rules.resources ?? {}).map((r) => [r, 6])),
  })
  const declared = Object.fromEntries(
    Object.entries(bindings?.stats ?? {}).map(([k, v]) => [k, v.default ?? 0]),
  )
  return { startDay, session: initialSessionState(travel, { ...declared, ...options.stats }) }
}

/** Runs one travel action through the session; bound checks are resolved by the Oracle. */
export function stepTrip(
  options: { system: TravelSystem; world: TravelWorld; oracle?: OracleEngine; locale?: string },
  session: SessionState,
  action: TravelAction,
): { state: SessionState; entries: JournalEntry[] } {
  const { system } = options
  return createSession({
    travel: createTravelEngine({ world: options.world, rules: system.rules }),
    oracle: system.bindings ? options.oracle : undefined,
    bindings: system.bindings,
    locale: options.locale,
  }).step(session, action)
}

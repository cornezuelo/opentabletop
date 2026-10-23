/**
 * For tests: the engine with a host that keeps the party's supplies, as the session does
 * with the party sheet's values. The engine keeps no supplies of its own: the host hands
 * it their values and bounds (`kept`, as `party.values.<id>`) and applies the steps'
 * effects on them from the events. Tests write supplies as before (`resources: { food: 3 }`
 * in the rules for their bounds, on the state for their amounts) and effects and
 * conditions by their full names (`party.values.food`).
 */
import {
  changeValue,
  createTravelEngine as createEngine,
  initialTravelState as initialState,
  parseTravelRules as parseRules,
  type Bounds,
  type TravelEngine,
  type TravelRules,
  type TravelState as EngineState,
} from './index'

/** A trip's state with the supplies its host keeps. */
export type TravelState = EngineState & { resources: Record<string, number> }

/**
 * The supplies' bounds the rules written in a test declare (`resources:`), kept on the
 * rules under a symbol: a copy of them (`{ ...rules, actions }`) keeps it.
 */
const SUPPLIES = Symbol('supplies')
const suppliesOf = (rules: TravelRules): Record<string, Bounds> =>
  (rules as { [SUPPLIES]?: Record<string, Bounds> })[SUPPLIES] ?? {}

/** Travel rules, the supplies (`resources:`) taken out for the host. */
export function parseTravelRules(raw: unknown): ReturnType<typeof parseRules> {
  const { resources, ...rest } = (raw ?? {}) as { resources?: Record<string, Bounds> }
  const parsed = parseRules(raw && resources ? rest : raw)
  // Written here, or kept from the rules this copies (`{ ...rules!, actions }`).
  const bounds = resources ?? (raw as { [SUPPLIES]?: Record<string, Bounds> })?.[SUPPLIES]
  if (parsed.rules && bounds) Object.assign(parsed.rules, { [SUPPLIES]: bounds })
  return parsed
}

export function initialTravelState(
  init: Parameters<typeof initialState>[0] & { resources?: Record<string, number> },
): TravelState {
  const { resources, ...rest } = init
  return { ...initialState(rest), resources: { ...resources } }
}

const SUPPLY = /^party\.values\.(.+)$/

/** An engine whose host keeps the supplies, as the session keeps the party's values. */
export function createTravelEngine(options: Parameters<typeof createEngine>[0]): Omit<
  TravelEngine,
  'apply'
> & {
  apply(
    state: EngineState & { resources?: Record<string, number> },
    action: Parameters<TravelEngine['apply']>[1],
    facts?: Record<string, unknown>,
  ): { state: TravelState; events: ReturnType<TravelEngine['apply']>['events'] }
} {
  const bounds = suppliesOf(options.rules)
  const kept = Object.fromEntries(
    Object.entries(bounds).map(([id, b]) => [`party.values.${id}`, b]),
  )
  const engine = createEngine({ kept, ...options })
  /** The host's facts with the supplies it keeps, as the party's values. */
  const hosted = (resources: Record<string, number>, facts: Record<string, unknown> = {}) => {
    const host = (facts.party ?? {}) as Record<string, unknown>
    const values = { ...(host.values as object | undefined), ...resources }
    return { ...facts, party: { ...host, values } }
  }
  return {
    ...engine,
    availability: (input, facts) => {
      const { resources = {}, ...state } = input as TravelState
      return engine.availability(state, hosted(resources, facts))
    },
    context: (input, facts) => {
      const { resources = {}, ...state } = input as TravelState
      return engine.context(state, hosted(resources, facts))
    },
    apply(input, action, facts = {}) {
      const { resources = {}, ...state } = input
      const out = engine.apply(state, action, hosted(resources, facts))
      const next = { ...resources }
      for (const e of out.events)
        if (e.type === 'EFFECTS')
          for (const [path, change] of Object.entries(e.effects)) {
            const id = SUPPLY.exec(path)?.[1]
            if (id !== undefined) next[id] = changeValue(next[id] ?? 0, change, bounds[id]).to
          }
      return { ...out, state: { ...out.state, resources: next } }
    },
  }
}

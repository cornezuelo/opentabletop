import {
  changeValue,
  momentRolls,
  resolveChange,
  upgradeTravelState,
  type Bounds,
  type TravelState,
} from '@open-tabletop/travel-engine'

/**
 * Effects: changes to the values a system declares, keyed by the path tables read them
 * with (`party.stats.morale`, `party.resources.food`). A number adds or subtracts (also
 * written as text: '+2'), '=value' sets; a variable is another value
 * (`'-{{party.stats.mouths}}'`, `'={{party.stats.endurance}}'`) and dice a roll (`'-{{1d3}}'`),
 * read when it's applied. One vocabulary for table entries, deck cards and actions; the
 * engines only pass them on, the session applies them.
 */
export type Effects = Record<string, number | string>

/** What a party stat may be: its bounds, and where it starts. */
export interface ValueBounds extends Bounds {
  default?: number
}

/**
 * What the session needs to apply effects: the party's stats and its supplies (and where
 * to note the values that hit a bound today).
 */
export interface EffectTarget {
  stats: Record<string, number>
  travel: Pick<TravelState, 'resources' | 'reached'> &
    Partial<Pick<TravelState, 'seed' | 'day' | 'location'>>
}

/** One change that happened: the path, before and after. */
export interface AppliedEffect {
  path: string
  from: number
  to: number
}

/** An effect that would have taken a value past its bound: it stopped at `value`. */
export interface LimitReached {
  path: string
  limit: 'min' | 'max'
  value: number
}

const number = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && /^[+-]?\d+(\.\d+)?$/.test(v.trim())
      ? Number(v)
      : undefined

/**
 * A result's effects: its `effects`, plus the older ways of writing the same
 * (`set: { resources: { food: 2 }, stats: { morale: -1 }, fatigue: 1 }`), read as effects.
 */
export function effectsOf(value: Record<string, unknown>): Effects {
  const out: Effects = {}
  const add = (path: string, change: unknown) => {
    const n = number(change)
    if (n !== undefined) out[path] = (number(out[path]) ?? 0) + n
    else if (typeof change === 'string' && /^\s*(=|[+-]?\s*\{\{)/.test(change)) out[path] = change
  }
  const record = (v: unknown) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  for (const [id, change] of Object.entries(record(value.resources)))
    add(`party.resources.${id}`, change)
  for (const [id, change] of Object.entries(record(value.stats))) add(`party.stats.${id}`, change)
  // Fatigue is one of the system's stats now (`party.fatigue` was its older path).
  if (value.fatigue !== undefined) add('party.stats.fatigue', value.fatigue)
  for (const [path, change] of Object.entries(record(value.effects)))
    add(path === 'party.fatigue' ? 'party.stats.fatigue' : path, change)
  return out
}

/**
 * Applies effects to the party: stats within their bounds, supplies within theirs (the
 * system's rules: `resourceBounds`; none given, they may go negative). Returns what
 * changed, what hit a bound (also noted in the trip as today's `below` / `above`) and the
 * paths nobody knows (a pack error to report).
 */
export function applyEffects(
  target: EffectTarget,
  effects: Effects,
  bounds: Record<string, ValueBounds> = {},
  resources: Record<string, Bounds> = {},
  /**
   * What variables in the changes read (the trip's context; none: they change nothing).
   * Their rolls are the trip's, fixed for the moment the context says (`moment`, `hex`).
   */
  context: Record<string, unknown> = {},
): { applied: AppliedEffect[]; limits: LimitReached[]; unknown: string[] } {
  const { travel } = target
  const roller =
    travel.day !== undefined
      ? momentRolls(
          { seed: travel.seed, day: travel.day, location: travel.location ?? '' },
          typeof context.hex === 'string' ? context.hex : undefined,
          typeof context.moment === 'string' ? context.moment : undefined,
        )
      : undefined
  const applied: AppliedEffect[] = []
  const limits: LimitReached[] = []
  const unknown: string[] = []
  for (const [path, change] of Object.entries(effects)) {
    const [, scope, id] = /^party\.(stats|resources)\.(.+)$/.exec(path) ?? []
    if (!scope) {
      unknown.push(path)
      continue
    }
    const stat = scope === 'stats'
    const values = stat ? target.stats : target.travel.resources
    const from = values[id] ?? (stat ? bounds[id]?.default : undefined) ?? 0
    const { to, limit } = changeValue(
      from,
      resolveChange(change, context, roller),
      stat ? bounds[id] : resources[id],
    )
    values[id] = to
    if (to !== from) applied.push({ path, from, to })
    if (limit) {
      limits.push({ path, limit, value: to })
      const key = limit === 'min' ? 'below' : 'above'
      const list = target.travel.reached?.[key] ?? []
      if (!list.includes(id))
        target.travel.reached = { ...target.travel.reached, [key]: [...list, id] }
    }
  }
  return { applied, limits, unknown }
}

/**
 * Older saved trips kept the party's fatigue in the travel state; now it's a stat of the
 * system (`party.stats.fatigue`). Moves it there (returns a copy).
 */
export function migrateFatigue<S extends { stats: Record<string, number>; travel: TravelState }>(
  session: S,
): S {
  const { fatigue, ...travel } = session.travel
  if (fatigue === undefined) return session
  return {
    ...session,
    travel,
    stats:
      fatigue && session.stats.fatigue === undefined
        ? { ...session.stats, fatigue }
        : session.stats,
  }
}

/**
 * Older saved trips had being lost built in (`lostToday`, `lostYesterday`); now it's a
 * value the system declares, kept as `today.lost` / `yesterday.lost` (returns a copy).
 */
export function migrateLost<S extends { travel: TravelState }>(session: S): S {
  const travel = upgradeTravelState(session.travel)
  return travel === session.travel ? session : { ...session, travel }
}

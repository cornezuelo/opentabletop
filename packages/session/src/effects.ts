import {
  changeValue,
  hexIdOf,
  momentRolls,
  noTotals,
  resolveChange,
  upgradeTravelState,
  type Bounds,
  type TravelState,
} from '@open-tabletop/travel-engine'

/**
 * Effects: changes to the values a system declares, keyed by the path tables read them
 * with (`party.stats.morale`, `party.values.food`, `party.items.ration`). A number adds or subtracts (also
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
 * What the session needs to apply effects on the party's stats (and where to note the
 * values that hit a bound today).
 */
export interface EffectTarget {
  stats: Record<string, number>
  travel: Pick<TravelState, 'reached'> & Partial<Pick<TravelState, 'seed' | 'day' | 'location'>>
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

/** A result's effects: its `effects` (`party.items.ration: 2`). */
export function effectsOf(value: Record<string, unknown>): Effects {
  const out: Effects = {}
  const add = (path: string, change: unknown) => {
    const n = number(change)
    if (n !== undefined) out[path] = (number(out[path]) ?? 0) + n
    else if (typeof change === 'string' && /^\s*(=|[+-]?\s*\{\{)/.test(change)) out[path] = change
    // A character's condition set or cleared.
    else if (change === true || change === false || change === 'true' || change === 'false')
      out[path] = String(change)
  }
  const record = (v: unknown) =>
    typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  for (const [path, change] of Object.entries(record(value.effects))) add(path, change)
  return out
}

/**
 * Applies effects to the party's stats (`party.stats.<id>`), within their bounds (none
 * given, they may go negative). Returns what changed, what hit a bound (also noted in the
 * trip as today's `below` / `above`, by full name) and the other paths, which the members'
 * and the party sheet's effects take (`applyMemberEffects`).
 */
export function applyEffects(
  target: EffectTarget,
  effects: Effects,
  bounds: Record<string, ValueBounds> = {},
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
          hexIdOf(context),
          typeof context.moment === 'string' ? context.moment : undefined,
        )
      : undefined
  const applied: AppliedEffect[] = []
  const limits: LimitReached[] = []
  const unknown: string[] = []
  for (const [path, change] of Object.entries(effects)) {
    const id = /^party\.stats\.(.+)$/.exec(path)?.[1]
    if (id === undefined) {
      unknown.push(path)
      continue
    }
    const values = target.stats
    const from = values[id] ?? bounds[id]?.default ?? 0
    const { to, limit } = changeValue(from, resolveChange(change, context, roller), bounds[id])
    values[id] = to
    if (to !== from) applied.push({ path, from, to })
    if (limit) {
      limits.push({ path, limit, value: to })
      const key = limit === 'min' ? 'below' : 'above'
      const list = target.travel.reached?.[key] ?? []
      if (!list.includes(path))
        target.travel.reached = { ...target.travel.reached, [key]: [...list, path] }
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

/**
 * Older saved trips had no totals (`travel.totals`): rebuilt from their journal what it
 * says (hexes entered, actions taken); the rest (hours marched, checks, supplies spent)
 * counts from then on (returns a copy).
 */
export function migrateTotals<
  S extends { travel: TravelState; journal: { code: string; data?: Record<string, unknown> }[] },
>(session: S): S {
  if (session.travel.totals) return session
  const totals = noTotals()
  for (const entry of session.journal) {
    if (entry.code === 'HEX_ENTERED') totals.hexes++
    const action = entry.data?.action
    if (entry.code === 'ACTION_TAKEN' && typeof action === 'string')
      totals.taken[action] = (totals.taken[action] ?? 0) + 1
  }
  return { ...session, travel: { ...session.travel, totals } }
}

/**
 * Older saved trips kept the party's supplies in the travel state (`travel.resources`); now
 * they're the party's values or items, as its system says. Each moves to the party sheet's
 * value of the same id, when the party has a sheet of its own (a supply its members carried
 * is theirs no more), and the totals of what was spent and gained go by full name
 * (`party.values.food`). Returns a copy.
 */
export function migrateSupplies<
  S extends { travel: TravelState; party?: { values: Record<string, number> } },
>(session: S): S {
  const { resources, ...travel } = session.travel
  if (resources === undefined) return session
  const named = (r: Record<string, number> = {}) =>
    Object.fromEntries(
      Object.entries(r).map(([id, n]) => [id.includes('.') ? id : `party.values.${id}`, n]),
    )
  const totals = travel.totals && {
    ...travel.totals,
    spent: named(travel.totals.spent),
    gained: named(travel.totals.gained),
  }
  return {
    ...session,
    travel: { ...travel, ...(totals && { totals }) },
    ...(session.party && {
      party: { ...session.party, values: { ...resources, ...session.party.values } },
    }),
  }
}

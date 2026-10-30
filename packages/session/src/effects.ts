import {
  changeValue,
  placeIdOf,
  momentRolls,
  noTotals,
  resolveChange,
  upgradeTravelState,
  type Bounds,
  type TravelState,
  type TripTotals,
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
    // A connection's value set to a word (`connection.state: open`, a hidden path `found`).
    else if (typeof change === 'string' && /^(connection|place\.connections)\./.test(path))
      out[path] = change
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
          placeIdOf(context),
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
 * says (places entered, at `km` each; actions taken); the rest (hours marched, checks,
 * supplies spent) counts from then on (returns a copy).
 */
export function migrateTotals<
  S extends { travel: TravelState; journal: { code: string; data?: Record<string, unknown> }[] },
>(session: S, km = 10): S {
  if (session.travel.totals) return session
  const totals = noTotals()
  for (const entry of session.journal) {
    if (entry.code === 'PLACE_ENTERED' || entry.code === 'HEX_ENTERED') {
      totals.places++
      totals.km += km
    }
    const action = entry.data?.action
    if (entry.code === 'ACTION_TAKEN' && typeof action === 'string')
      totals.taken[action] = (totals.taken[action] ?? 0) + 1
  }
  return { ...session, travel: { ...session.travel, totals } }
}

/** The journal's lines that said where they happened as `hex` (now `place`). */
const PLACED = [
  'HEX_ENTERED',
  'DESTINATION_REACHED',
  'ACTION_TAKEN',
  'CHECK_PENDING',
  'CHECK_PAUSED',
  'CHECK_ASKS',
  'PAUSE_SKIPPED',
]

/** A journal line's data with a key renamed (`hex` → `place`), when it has it. */
const renamed = (data: Record<string, unknown> | undefined, from: string, to: string) => {
  if (!data || !(from in data)) return data
  const { [from]: value, ...rest } = data
  return { ...rest, [to]: value }
}

/**
 * Older saved trips said hexes where they meant places: the journal's `HEX_ENTERED` lines
 * (now `PLACE_ENTERED`), the place an action was taken, a destination reached or a check
 * came up (`hex` → `place`; discovery's lines keep the hex they decided), a route's length (`hexes` → `places`), and the totals' hexes entered (now
 * `places`, and their km at `km` each). Returns a copy, or the same session when there's
 * nothing to change.
 */
export function migratePlaces<
  S extends { travel: TravelState; journal: { code: string; data?: Record<string, unknown> }[] },
>(session: S, km = 10): S {
  const old = session.travel.totals as (TripTotals & { hexes?: number }) | undefined
  const oldTotals = old && typeof old.hexes === 'number'
  const oldJournal = session.journal.some(
    (e) =>
      e.code === 'HEX_ENTERED' ||
      (e.data &&
        ((PLACED.includes(e.code) && 'hex' in e.data) ||
          (e.code === 'ROUTE_PLANNED' && 'hexes' in e.data))),
  )
  if (!oldTotals && !oldJournal) return session
  const journal = !oldJournal
    ? session.journal
    : session.journal.map((e) => {
        const code = e.code === 'HEX_ENTERED' ? 'PLACE_ENTERED' : e.code
        const data =
          e.code === 'ROUTE_PLANNED'
            ? renamed(e.data, 'hexes', 'places')
            : PLACED.includes(e.code)
              ? renamed(e.data, 'hex', 'place')
              : e.data
        return code === e.code && data === e.data ? e : { ...e, code, ...(data && { data }) }
      })
  let travel = session.travel
  if (oldTotals) {
    const { hexes, ...rest } = old
    travel = { ...travel, totals: { ...rest, places: hexes!, km: hexes! * km } }
  }
  return { ...session, journal, travel }
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

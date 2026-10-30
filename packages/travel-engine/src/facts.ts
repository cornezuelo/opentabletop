/**
 * Every fact conditions and tables read has a full name by where it comes from, and most
 * a short one too (today's names, kept as shortcuts):
 *
 *   place.*    where the party is: `place.id`, `place.terrain`, `place.tags`, `place.danger` (its values)…
 *   time.*     the moment: `time.season`, `time.hour`, `time.daylight`, `time.moons.pale`…
 *   system.*   the system's own day: `system.dawn`, `system.nightfall`, `system.hoursPerDay`
 *   trip.*     the trip: `trip.day`, `trip.marched`, `trip.mode`, `trip.moment`…
 *   world.*    the world clock: `world.clocks.<name>`, `world.events`
 *   party.*, today.*, yesterday.*, from.*, around.*   as they were
 *
 * A short name and its full name read the same value; the full one can't be hidden by a
 * party stat or a value of the day with the same name.
 */

/** Each short name, and its full name. */
export const FACT_PATHS: Readonly<Record<string, string>> = {
  terrain: 'place.terrain',
  water: 'place.water',
  tags: 'place.tags',
  region: 'place.region',
  season: 'time.season',
  day: 'time.day',
  daylight: 'time.daylight',
  hour: 'time.hour',
  watch: 'time.watch',
  month: 'time.month',
  monthDay: 'time.monthDay',
  year: 'time.year',
  weekday: 'time.weekday',
  moons: 'time.moons',
  holidays: 'time.holidays',
  dawn: 'system.dawn',
  nightfall: 'system.nightfall',
  hoursPerDay: 'system.hoursPerDay',
  tripDay: 'trip.day',
  marched: 'trip.marched',
  doneToday: 'trip.doneToday',
  routeLeft: 'trip.routeLeft',
  arrived: 'trip.arrived',
  visits: 'trip.visits',
  mode: 'trip.mode',
  weather: 'trip.weather',
  connections: 'trip.connections',
  moment: 'trip.moment',
  below: 'trip.below',
  above: 'trip.above',
  doing: 'trip.doing',
  clocks: 'world.clocks',
  events: 'world.events',
}

/** The groups of full names. */
export const FACT_GROUPS = ['place', 'time', 'system', 'trip', 'world'] as const

/**
 * A context with its full names: each group (`time`, `trip`…) holds what its short names
 * say (the group's own values, if it had any, stay under them). A `place` written as its id
 * (`'5,7'`) becomes `{ id: '5,7' }`.
 */
export function qualify(context: Record<string, unknown>): Record<string, unknown> {
  const groups: Record<string, Record<string, unknown>> = {}
  for (const group of FACT_GROUPS) {
    const own = context[group]
    groups[group] = isObject(own) ? { ...own } : {}
  }
  if (typeof context.place === 'string') groups.place.id = context.place
  for (const [short, full] of Object.entries(FACT_PATHS)) {
    const value = context[short]
    if (value === undefined) continue
    const [group, key] = full.split('.')
    groups[group][key] = value
  }
  const out = { ...context }
  for (const group of FACT_GROUPS) if (Object.keys(groups[group]).length) out[group] = groups[group]
  return out
}

/** The id of the place a context is about (`place.id`, or `place: '5,7'`). */
export function placeIdOf(context: Record<string, unknown>): string | undefined {
  const place = context.place
  if (typeof place === 'string') return place
  return isObject(place) && typeof place.id === 'string' ? place.id : undefined
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

import { weightedIndex, type RandomSource } from '@open-tabletop/random'

/**
 * Weather with inertia (`kind: weather` in a pack): today's weather follows from
 * yesterday's. Each season says, for every kind of weather, how likely tomorrow is to be
 * each kind (a Markov chain), so rain tends to last and storms to clear. Headless and
 * pure: the randomness comes in, nothing is stored here.
 */

/** Text in one or several languages: "Rain" or { en: Rain, es: Lluvia }. */
export type WeatherText = string | Record<string, string>

export interface WeatherModel {
  id?: string
  name?: WeatherText
  /** Every kind of weather: its name and the values it gives the day (like a table's `set`). */
  states: Record<string, { name?: WeatherText; set?: Record<string, unknown> }>
  /**
   * Per season: where the weather starts (a state, or weights) and, from each state,
   * the weights of the next day's. A season may leave states out: tomorrow then starts
   * over from `start`.
   */
  seasons: Record<
    string,
    { start: string | Record<string, number>; next: Record<string, Record<string, number>> }
  >
}

export interface WeatherDay {
  /** The state id: what travel rules read as `weather`. */
  weather: string
  name?: WeatherText
  /** The values the day gets: `weather` plus the state's own (`fordModifier`…). */
  value: Record<string, unknown>
}

/** Readable problems of a weather model (empty: valid). */
export function validateWeather(raw: unknown): string[] {
  const errors: string[] = []
  const model = raw as Partial<WeatherModel> | null
  if (typeof model !== 'object' || model === null) return ['weather: must be a map']
  const states = model.states && typeof model.states === 'object' ? model.states : null
  if (!states || !Object.keys(states).length) errors.push('states: needs at least one')
  const known = new Set(Object.keys(states ?? {}))
  const seasons = model.seasons && typeof model.seasons === 'object' ? model.seasons : null
  if (!seasons || !Object.keys(seasons).length) errors.push('seasons: needs at least one')
  const weights = (at: string, w: unknown) => {
    if (typeof w !== 'object' || w === null) return errors.push(`${at}: weights by weather`)
    for (const [state, n] of Object.entries(w)) {
      if (!known.has(state)) errors.push(`${at}.${state}: no such weather`)
      if (!(typeof n === 'number' && n >= 0)) errors.push(`${at}.${state}: a weight (0 or more)`)
    }
  }
  for (const [season, s] of Object.entries(seasons ?? {})) {
    if (typeof s?.start === 'string') {
      if (!known.has(s.start)) errors.push(`seasons.${season}.start: no such weather "${s.start}"`)
    } else weights(`seasons.${season}.start`, s?.start)
    for (const [from, w] of Object.entries(s?.next ?? {})) {
      if (!known.has(from)) errors.push(`seasons.${season}.next.${from}: no such weather`)
      weights(`seasons.${season}.next.${from}`, w)
    }
  }
  return errors
}

/** Picks from weights; null when there is nothing to pick. */
function pick(weights: Record<string, number>, random: RandomSource): string | null {
  const entries = Object.entries(weights)
  const i = weightedIndex(
    random,
    entries.map(([, w]) => w),
  )
  return i < 0 ? null : entries[i][0]
}

/**
 * Today's weather from yesterday's (`previous`, if any) in a season. A season the model
 * doesn't know, or yesterday's weather it has no row for, starts over from `start` (of
 * the season, else the first season's).
 */
export function nextWeather(
  model: WeatherModel,
  options: { season?: string; previous?: string; random: RandomSource },
): WeatherDay {
  const seasons = Object.values(model.seasons)
  const season = (options.season && model.seasons[options.season]) || seasons[0]
  const row = options.previous ? season?.next[options.previous] : undefined
  const fromStart = () =>
    typeof season?.start === 'string' ? season.start : pick(season?.start ?? {}, options.random)
  const weather = (row && pick(row, options.random)) ?? fromStart() ?? Object.keys(model.states)[0]
  const state = model.states[weather] ?? {}
  return {
    weather,
    ...(state.name && { name: state.name }),
    value: { weather, ...state.set },
  }
}

/** How often each weather comes up over many days in a season (for checking a model). */
export function weatherShares(
  model: WeatherModel,
  season: string,
  days: number,
  random: RandomSource,
): Record<string, number> {
  const counts: Record<string, number> = {}
  let previous: string | undefined
  for (let i = 0; i < days; i++) {
    previous = nextWeather(model, { season, previous, random }).weather
    counts[previous] = (counts[previous] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, n / days]))
}

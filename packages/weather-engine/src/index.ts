import { weightedIndex, type RandomSource } from '@open-tabletop/random'

/**
 * Weather with inertia (`kind: weather` in a pack): today's weather follows from
 * yesterday's. Each season says, for every kind of weather, how likely tomorrow is to be
 * each kind (a Markov chain), so rain tends to last and storms to clear; or lays its
 * weathers on a **hex flower**, 19 cells the day moves across by a 2d6 roll, so weather
 * drifts from one kind to its neighbours. Headless and pure: the randomness comes in,
 * nothing is stored here.
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
  seasons: Record<string, WeatherSeason>
}

/** A season's weather: weights from each kind to the next (`next`), or a hex flower. */
export type WeatherSeason =
  | { start: string | Record<string, number>; next: Record<string, Record<string, number>> }
  | { flower: HexFlower }

/** A hex direction on a flower of pointy-top hexes (rows of 3, 4, 5, 4 and 3 cells). */
export type FlowerDirection = 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'stay'

/**
 * Weathers laid on 19 hexes: five `rows` of 3, 4, 5, 4 and 3 cells, top to bottom, each a
 * kind of weather. Each day 2d6 picks where to move (`moves`: a direction by the totals it
 * takes, `'2-3'`, `'12'`; absent: the default below) and the day's weather is the cell's.
 * Leaving the flower, the day comes back in on the far side (`edge: wrap`, the default) or
 * stays where it is (`stay`). It starts on the `start` cell's weather (absent: the middle).
 */
export interface HexFlower {
  rows: string[][]
  moves?: Partial<Record<FlowerDirection, string>>
  edge?: 'wrap' | 'stay'
  start?: string
}

/** Where the day moves on a 2d6 roll when a flower doesn't say: the middle rolls go south-east. */
export const DEFAULT_MOVES: Record<Exclude<FlowerDirection, 'stay'>, string> = {
  ne: '2-3',
  e: '4-5',
  se: '6-7',
  sw: '8-9',
  w: '10-11',
  nw: '12',
}

const ROW_LENGTHS = [3, 4, 5, 4, 3]
const STEPS: Record<Exclude<FlowerDirection, 'stay'>, [number, number]> = {
  e: [1, 0],
  w: [-1, 0],
  ne: [1, -1],
  nw: [0, -1],
  se: [0, 1],
  sw: [-1, 1],
}
/** A flower's cell by its axial position (`q,r`, the middle `0,0`), row by row. */
function flowerCells(flower: HexFlower): Map<string, string> {
  const cells = new Map<string, string>()
  flower.rows.forEach((row, i) => {
    const r = i - 2
    const first = Math.max(-2, -r - 2)
    row.forEach((state, j) => cells.set(`${first + j},${r}`, state))
  })
  return cells
}
const parseAt = (at: string): [number, number] => at.split(',').map(Number) as [number, number]

/** The direction a 2d6 total takes, by the flower's moves (or the default ones). */
function directionOf(flower: HexFlower, total: number): FlowerDirection {
  const moves = flower.moves ?? DEFAULT_MOVES
  for (const [dir, range] of Object.entries(moves) as [FlowerDirection, string][]) {
    const [lo, hi] = range.split('-').map(Number)
    if (total >= lo && total <= (hi ?? lo)) return dir
  }
  return 'stay'
}

export interface WeatherDay {
  /** The state id: what travel rules read as `weather`. */
  weather: string
  /** On a hex flower, the cell it's on (`q,r`): where tomorrow moves from. */
  at?: string
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
    if (s && 'flower' in s) {
      const f = s.flower as Partial<HexFlower> | null
      const at = `seasons.${season}.flower`
      if (
        !f ||
        !Array.isArray(f.rows) ||
        f.rows.length !== 5 ||
        f.rows.some((row, i) => !Array.isArray(row) || row.length !== ROW_LENGTHS[i])
      ) {
        errors.push(`${at}.rows: five rows of 3, 4, 5, 4 and 3 weathers`)
        continue
      }
      f.rows.forEach((row, i) =>
        row.forEach((state, j) => {
          if (!known.has(state)) errors.push(`${at}.rows.${i}.${j}: no such weather "${state}"`)
        }),
      )
      if (f.start !== undefined && !known.has(f.start))
        errors.push(`${at}.start: no such weather "${f.start}"`)
      if (f.edge !== undefined && f.edge !== 'wrap' && f.edge !== 'stay')
        errors.push(`${at}.edge: wrap or stay`)
      for (const [dir, range] of Object.entries(f.moves ?? {})) {
        if (!(dir in STEPS) && dir !== 'stay')
          errors.push(`${at}.moves.${dir}: e, w, ne, nw, se, sw or stay`)
        if (!/^\d+(-\d+)?$/.test(String(range)))
          errors.push(`${at}.moves.${dir}: totals of 2d6, '2-3'`)
      }
      continue
    }
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
  options: {
    season?: string
    previous?: string
    /** On a hex flower, the cell yesterday's weather was on. */
    at?: string
    random: RandomSource
  },
): WeatherDay {
  const seasons = Object.values(model.seasons)
  const season = (options.season && model.seasons[options.season]) || seasons[0]
  if (season && 'flower' in season) return flowerDay(model, season.flower, options)
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

/**
 * A day on a hex flower: from yesterday's cell (or the one nearest the middle with
 * yesterday's weather, or the start), 2d6 moves it one cell; off the flower it wraps to the
 * far side or stays, as the flower says.
 */
function flowerDay(
  model: WeatherModel,
  flower: HexFlower,
  options: { previous?: string; at?: string; random: RandomSource },
): WeatherDay {
  const cells = flowerCells(flower)
  const distance = (at: string) => {
    const [q, r] = parseAt(at)
    return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
  }
  const nearest = (state: string | undefined) =>
    [...cells.entries()]
      .filter(([, s]) => s === state)
      .sort(([a], [b]) => distance(a) - distance(b))[0]?.[0]
  let at: string
  if (options.at && cells.has(options.at)) {
    const total = 2 + Math.floor(options.random.next() * 6) + Math.floor(options.random.next() * 6)
    const dir = directionOf(flower, total)
    at = options.at
    if (dir !== 'stay') {
      const [dq, dr] = STEPS[dir]
      const [q, r] = parseAt(options.at)
      const next = `${q + dq},${r + dr}`
      if (cells.has(next)) at = next
      else if ((flower.edge ?? 'wrap') === 'wrap') {
        // Back in on the far side: as far as the flower goes the other way.
        let [wq, wr] = [q, r]
        while (cells.has(`${wq - dq},${wr - dr}`)) [wq, wr] = [wq - dq, wr - dr]
        at = `${wq},${wr}`
      }
    }
  } else at = nearest(options.previous) ?? nearest(flower.start) ?? '0,0'
  const weather = cells.get(at) ?? Object.keys(model.states)[0]
  const state = model.states[weather] ?? {}
  return {
    weather,
    at,
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
  let at: string | undefined
  for (let i = 0; i < days; i++) {
    const day = nextWeather(model, { season, previous, at, random })
    previous = day.weather
    at = day.at
    counts[previous] = (counts[previous] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, n / days]))
}

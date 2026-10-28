import { weightedIndex, type RandomSource } from '@open-tabletop/random'

/**
 * Terrain with memory (`kind: land` in a pack): an empty hex's terrain follows from the land
 * around it. For each terrain, a model says how likely a hex next to it is to be each
 * terrain (a Markov chain in space); an empty hex adds up the rows of all its known
 * neighbours, so forests, ranges and lakes grow together. Headless and pure: the randomness
 * and the map come in, nothing is stored here.
 */

/** Text in one or several languages: "Forest" or { en: Forest, es: Bosque }. */
export type LandText = string | Record<string, string>

export interface LandModel {
  id?: string
  name?: LandText
  description?: LandText
  /** For each terrain, the weights of a neighbouring hex's terrain. */
  next: Record<string, Record<string, number>>
  /** The weights of a hex with no known neighbour (or none the model can say anything of). */
  start?: Record<string, number>
  /**
   * How much each neighbour counts: `from`, the hex it's seen from (the land the party
   * comes from), counts that many times (absent: 1, as every other).
   */
  weights?: { from?: number }
}

/** Readable problems of a land model (empty: valid). */
export function validateLand(raw: unknown): string[] {
  const errors: string[] = []
  const model = raw as Partial<LandModel> | null
  if (typeof model !== 'object' || model === null) return ['land: must be a map']
  const KEYS = new Set(['kind', 'id', 'name', 'description', 'tags', 'next', 'start', 'weights'])
  for (const key of Object.keys(model))
    if (!KEYS.has(key)) errors.push(`${key}: unknown key in a land model`)
  const weights = (at: string, w: unknown) => {
    if (typeof w !== 'object' || w === null || Array.isArray(w))
      return void errors.push(`${at}: weights by terrain ({ forest: 6, hills: 2 })`)
    for (const [terrain, n] of Object.entries(w))
      if (!(typeof n === 'number' && n >= 0)) errors.push(`${at}.${terrain}: a weight (0 or more)`)
  }
  const next = model.next
  if (typeof next !== 'object' || next === null || Array.isArray(next) || !Object.keys(next).length)
    errors.push('next: needs a row for at least one terrain (forest: { forest: 6, hills: 2 })')
  else for (const [terrain, row] of Object.entries(next)) weights(`next.${terrain}`, row)
  if (model.start !== undefined) weights('start', model.start)
  const w = model.weights
  if (w !== undefined) {
    if (typeof w !== 'object' || w === null || Array.isArray(w))
      errors.push('weights: how much a neighbour counts ({ from: 2 })')
    else
      for (const [key, n] of Object.entries(w))
        if (key !== 'from') errors.push(`weights.${key}: expected from`)
        else if (!(typeof n === 'number' && n >= 0))
          errors.push('weights.from: a number (0 or more)')
  }
  return errors
}

/** Every terrain a model names, as a neighbour or as a result, in the order it names them. */
export function landTerrains(model: LandModel): string[] {
  const out = new Set<string>()
  for (const [terrain, row] of Object.entries(model.next ?? {})) {
    out.add(terrain)
    for (const t of Object.keys(row ?? {})) out.add(t)
  }
  for (const t of Object.keys(model.start ?? {})) out.add(t)
  return [...out]
}

/** A terrain the model chose for a hex, and how. */
export interface LandPick {
  /** The terrain (absent: the model couldn't say, every weight 0). */
  terrain?: string
  /**
   * How it was chosen, for a journal that tells everything: the known neighbours' terrains
   * whose rows were added up, each by how many times it counted; empty, from `start`.
   */
  from: Record<string, number>
  /** The weights it was chosen with, by terrain. */
  weights: Record<string, number>
}

/**
 * The weights of an empty hex's terrain: the rows of its known neighbours' terrains added
 * up (the one it's seen from counting `weights.from` times); with none the model knows,
 * its `start`.
 */
export function landWeights(
  model: LandModel,
  /** The terrains of the hex's known neighbours (one per neighbour, repeats count). */
  neighbours: readonly string[],
  /** The terrain of the hex it's seen from, if any (also one of `neighbours`). */
  from?: string,
): Pick<LandPick, 'from' | 'weights'> {
  const counted: Record<string, number> = {}
  const weights: Record<string, number> = {}
  const add = (terrain: string, times: number) => {
    const row = model.next[terrain]
    if (!row || !times) return
    counted[terrain] = (counted[terrain] ?? 0) + times
    if (!counted[terrain]) delete counted[terrain]
    for (const [t, n] of Object.entries(row)) weights[t] = (weights[t] ?? 0) + n * times
  }
  for (const terrain of neighbours) add(terrain, 1)
  // The hex it's seen from counts `weights.from` times instead of once.
  if (from !== undefined && neighbours.includes(from)) add(from, (model.weights?.from ?? 1) - 1)
  for (const t of Object.keys(weights)) if (weights[t] <= 0) delete weights[t]
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  if (total > 0) return { from: counted, weights }
  return { from: {}, weights: { ...model.start } }
}

/** The terrain of an empty hex, picked from the land around it (see `landWeights`). */
export function nextTerrain(
  model: LandModel,
  neighbours: readonly string[],
  random: RandomSource,
  from?: string,
): LandPick {
  const { from: counted, weights } = landWeights(model, neighbours, from)
  const terrains = Object.keys(weights)
  const i = weightedIndex(
    random,
    terrains.map((t) => weights[t]),
  )
  return { ...(i >= 0 && { terrain: terrains[i] }), from: counted, weights }
}

/**
 * Fills the empty hexes of an area with a model, from the known land outwards: each time,
 * the empty hex with most known neighbours (ties in the area's order), so the land grows
 * from what is painted. Painted hexes are never changed. Returns the terrain chosen for
 * each hex, in the order they were chosen (a hex the model can't say anything of is left
 * out).
 */
export function generateLand(
  model: LandModel,
  options: {
    /** The hexes to fill, in the order ties are broken (only the empty ones are filled). */
    area: readonly string[]
    /** A hex's terrain, if it has one (painted, or outside the area). */
    terrain: (hex: string) => string | undefined
    /** A hex's neighbours. */
    neighbors: (hex: string) => readonly string[]
    random: RandomSource
  },
): Map<string, string> {
  const { area, neighbors, random } = options
  const chosen = new Map<string, string>()
  const terrainOf = (hex: string) => chosen.get(hex) ?? options.terrain(hex)
  const empty = area.filter((hex, i) => !options.terrain(hex) && area.indexOf(hex) === i)
  const known = (hex: string) =>
    neighbors(hex).flatMap((n) => {
      const t = terrainOf(n)
      return t ? [t] : []
    })
  while (empty.length) {
    let best = 0
    let most = -1
    empty.forEach((hex, i) => {
      const n = known(hex).length
      if (n > most) {
        most = n
        best = i
      }
    })
    const [hex] = empty.splice(best, 1)
    const pick = nextTerrain(model, known(hex), random)
    if (pick.terrain) chosen.set(hex, pick.terrain)
  }
  return chosen
}

/**
 * What a model's land is made of over many hexes: a seeded patch grown from nothing (a
 * `size` × `size` grid of offset hexes), each terrain's share of it (0–1), most first.
 */
export function landShares(
  model: LandModel,
  random: RandomSource,
  size = 24,
): { terrain: string; share: number }[] {
  const grid = landPatch(model, random, size)
  const counts = new Map<string, number>()
  for (const t of grid.values()) counts.set(t, (counts.get(t) ?? 0) + 1)
  const total = size * size
  return [...counts]
    .map(([terrain, n]) => ({ terrain, share: n / total }))
    .sort((a, b) => b.share - a.share)
}

/**
 * A patch of land grown from nothing with a model: `size` × `size` hexes in rows (`col,row`,
 * odd rows shifted right), filled from the middle outwards. For previews.
 */
export function landPatch(model: LandModel, random: RandomSource, size = 12): Map<string, string> {
  const key = (c: number, r: number) => `${c},${r}`
  const area: string[] = []
  const mid = Math.floor(size / 2)
  // From the middle outwards, so ties grow a single patch.
  const cells: [number, number][] = []
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([c, r])
  cells.sort(
    ([c1, r1], [c2, r2]) =>
      Math.abs(c1 - mid) + Math.abs(r1 - mid) - (Math.abs(c2 - mid) + Math.abs(r2 - mid)),
  )
  for (const [c, r] of cells) area.push(key(c, r))
  const neighbors = (hex: string) => {
    const [c, r] = hex.split(',').map(Number)
    const shift = r % 2 ? 0 : -1
    return [
      [c - 1, r],
      [c + 1, r],
      [c + shift, r - 1],
      [c + shift + 1, r - 1],
      [c + shift, r + 1],
      [c + shift + 1, r + 1],
    ]
      .filter(([x, y]) => x >= 0 && y >= 0 && x < size && y < size)
      .map(([x, y]) => key(x, y))
  }
  return generateLand(model, { area, terrain: () => undefined, neighbors, random })
}

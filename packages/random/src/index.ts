/** A source of uniformly distributed numbers in [0, 1). Engines never call Math.random directly. */
export interface RandomSource {
  next(): number
}

/** A seeded source whose internal state can be saved and restored (session replays). */
export interface SeededRandom extends RandomSource {
  /** Current internal state; `fromState(state)` continues the exact same sequence. */
  readonly state: number
}

export function mathRandom(): RandomSource {
  return { next: () => Math.random() }
}

/** Mulberry32: tiny, fast and good enough for games. Seeds may be numbers or strings. */
export function seeded(seed: number | string): SeededRandom {
  return fromState(typeof seed === 'string' ? hashString(seed) : seed >>> 0)
}

export function fromState(state: number): SeededRandom {
  let s = state >>> 0
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0
      let t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
    get state() {
      return s
    },
  }
}

/** Integer in [min, max], both inclusive. */
export function randomInt(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random.next() * (max - min + 1))
}

/** A new array with the items in random order (Fisher–Yates). */
export function shuffled<T>(random: RandomSource, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(random, 0, i)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Index chosen with probability proportional to its weight. Returns -1 if all weights are 0. */
export function weightedIndex(random: RandomSource, weights: readonly number[]): number {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0)
  if (total <= 0) return -1
  let roll = random.next() * total
  for (let i = 0; i < weights.length; i++) {
    roll -= Math.max(0, weights[i])
    if (roll < 0) return i
  }
  return weights.length - 1
}

/** cyrb53-style string hash folded to 32 bits, so text seeds are shareable ("kal-arath-43"). */
function hashString(text: string): number {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h1 ^ h2) >>> 0
}

/** Replays a fixed list of values in [0, 1), then throws. For tests and scripted examples. */
export function sequence(values: readonly number[]): RandomSource {
  let i = 0
  return {
    next() {
      if (i >= values.length) throw new Error('sequence(): out of values')
      return values[i++]
    },
  }
}

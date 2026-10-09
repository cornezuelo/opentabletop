import { parseDice } from './parse'
import type { DiceExpression, DiceTerm } from './types'

/** Smallest and largest possible totals. */
export function bounds(expression: string | DiceExpression): { min: number; max: number } {
  const parsed = typeof expression === 'string' ? parseDice(expression) : expression
  let min = 0
  let max = 0
  for (const term of parsed.terms) {
    if (term.kind === 'const') {
      min += term.sign * term.value
      max += term.sign * term.value
      continue
    }
    const kept = term.keep?.count ?? term.count
    const [lo, hi] = faceRange(term.sides)
    const [a, b] = term.sign > 0 ? [lo * kept, hi * kept] : [-hi * kept, -lo * kept]
    min += a
    max += b
  }
  return { min, max }
}

/**
 * Every possible total, sorted, or null when the outcome space is too large to
 * enumerate (above `limit` combinations). Lets table validators find gaps and
 * unreachable entries, e.g. d66 tables only have 36 valid results.
 */
export function possibleTotals(
  expression: string | DiceExpression,
  limit = 200_000,
): number[] | null {
  const parsed = typeof expression === 'string' ? parseDice(expression) : expression
  let totals = new Set<number>([0])
  for (const term of parsed.terms) {
    const values =
      term.kind === 'const'
        ? new Set([term.value])
        : termTotals(term, Math.floor(limit / totals.size))
    if (!values) return null
    if (totals.size * values.size > limit) return null
    const next = new Set<number>()
    for (const a of totals) for (const b of values) next.add(a + term.sign * b)
    totals = next
  }
  return [...totals].sort((a, b) => a - b)
}

function termTotals(term: DiceTerm, limit: number): Set<number> | null {
  const faces = faceValues(term.sides)
  if (Math.pow(faces.length, term.count) > limit) {
    // Without keep, sums of identical dice are contiguous between bounds.
    if (!term.keep && term.sides !== 'd66') {
      const [lo, hi] = faceRange(term.sides)
      const set = new Set<number>()
      for (let v = lo * term.count; v <= hi * term.count; v++) set.add(v)
      return set
    }
    return null
  }
  const kept = term.keep?.count ?? term.count
  const out = new Set<number>()
  const walk = (rolled: number[]) => {
    if (rolled.length === term.count) {
      const sorted = [...rolled].sort((a, b) => (term.keep?.mode === 'lowest' ? a - b : b - a))
      out.add(sorted.slice(0, kept).reduce((s, v) => s + v, 0))
      return
    }
    for (const face of faces) walk([...rolled, face])
  }
  walk([])
  return out
}

function faceValues(sides: DiceTerm['sides']): number[] {
  if (sides === 'F') return [-1, 0, 1]
  if (sides === 'd66') {
    const values: number[] = []
    for (let tens = 1; tens <= 6; tens++)
      for (let units = 1; units <= 6; units++) values.push(tens * 10 + units)
    return values
  }
  return Array.from({ length: sides }, (_, i) => i + 1)
}

function faceRange(sides: DiceTerm['sides']): [number, number] {
  if (sides === 'F') return [-1, 1]
  if (sides === 'd66') return [11, 66]
  return [1, sides]
}

/**
 * How likely each total is: total → probability (they add up to 1), exactly. With
 * `repeat` and `keep` (a system's roll mode), the chances of the total kept. Null when
 * there are too many combinations to count (dice that keep some of many, above `limit`).
 */
export function distribution(
  expression: string | DiceExpression,
  options: { repeat?: number; keep?: 'highest' | 'lowest' | 'middle' } = {},
  limit = 200_000,
): Map<number, number> | null {
  const parsed = typeof expression === 'string' ? parseDice(expression) : expression
  let dist = new Map<number, number>([[0, 1]])
  for (const term of parsed.terms) {
    const own = term.kind === 'const' ? new Map([[term.value, 1]]) : termDistribution(term, limit)
    if (!own) return null
    const next = new Map<number, number>()
    for (const [a, pa] of dist)
      for (const [b, pb] of own) {
        const total = a + term.sign * b
        next.set(total, (next.get(total) ?? 0) + pa * pb)
      }
    dist = next
  }
  const times = Math.max(1, Math.floor(options.repeat ?? 1))
  if (times === 1) return sorted(dist)
  // The total kept is an order statistic of `times` rolls: its j-th smallest.
  const j =
    options.keep === 'lowest'
      ? 1
      : options.keep === 'middle'
        ? Math.floor((times - 1) / 2) + 1
        : times
  const totals = [...dist.keys()].sort((a, b) => a - b)
  const atMost = (f: number) => {
    let p = 0
    for (let i = j; i <= times; i++) p += choose(times, i) * f ** i * (1 - f) ** (times - i)
    return p
  }
  const out = new Map<number, number>()
  let cumulative = 0
  let before = 0
  for (const total of totals) {
    cumulative += dist.get(total)!
    const now = atMost(Math.min(1, cumulative))
    out.set(total, now - before)
    before = now
  }
  return out
}

function termDistribution(term: DiceTerm, limit: number): Map<number, number> | null {
  const faces = faceValues(term.sides)
  const one = 1 / faces.length
  if (!term.keep) {
    let dist = new Map<number, number>([[0, 1]])
    for (let i = 0; i < term.count; i++) {
      const next = new Map<number, number>()
      for (const [a, pa] of dist)
        for (const face of faces) next.set(a + face, (next.get(a + face) ?? 0) + pa * one)
      dist = next
    }
    return dist
  }
  if (Math.pow(faces.length, term.count) > limit) return null
  const kept = term.keep.count
  const out = new Map<number, number>()
  const p = Math.pow(one, term.count)
  const walk = (rolled: number[]) => {
    if (rolled.length === term.count) {
      const order = [...rolled].sort((a, b) => (term.keep!.mode === 'lowest' ? a - b : b - a))
      const total = order.slice(0, kept).reduce((s, v) => s + v, 0)
      out.set(total, (out.get(total) ?? 0) + p)
      return
    }
    for (const face of faces) walk([...rolled, face])
  }
  walk([])
  return out
}

function sorted(dist: Map<number, number>): Map<number, number> {
  return new Map([...dist].sort(([a], [b]) => a - b))
}

function choose(n: number, k: number): number {
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

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

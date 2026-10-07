import { randomInt, type RandomSource } from '@open-tabletop/random'
import { parseDice } from './parse'
import type { DiceExpression, DiceResult, DiceTerm, TermResult } from './types'

/** Which of several totals of the same expression is kept. */
export type Keep = 'highest' | 'lowest' | 'middle'

export interface RollOptions {
  /**
   * Roll the whole expression this many times and keep one total (`keep`); the others
   * are returned as `discarded`. Systems name these ways of rolling (advantage…).
   */
  repeat?: number
  keep?: Keep
}

/** Rolls an expression (string or parsed) with a full breakdown of every die. */
export function roll(
  expression: string | DiceExpression,
  random: RandomSource,
  options: RollOptions = {},
): DiceResult {
  const parsed = typeof expression === 'string' ? parseDice(expression) : expression
  const times = Math.max(1, Math.floor(options.repeat ?? 1))
  const rolls = Array.from({ length: times }, () => rollOnce(parsed, random))
  if (times === 1) return { expression: parsed.source, ...rolls[0] }
  // Sorted by total, ties in rolling order: the earlier roll wins a tie.
  const order = rolls.map((_, i) => i).sort((a, b) => rolls[a].total - rolls[b].total || a - b)
  const keep = options.keep ?? 'highest'
  const top = rolls[order[times - 1]].total
  const kept =
    keep === 'lowest'
      ? order[0]
      : // "middle" of an even count is the lower of the two middle ones.
        keep === 'middle'
        ? order[Math.floor((times - 1) / 2)]
        : rolls.findIndex((r) => r.total === top)
  return {
    expression: parsed.source,
    ...rolls[kept],
    discarded: rolls.filter((_, i) => i !== kept),
  }
}

function rollOnce(
  parsed: DiceExpression,
  random: RandomSource,
): { terms: TermResult[]; total: number } {
  const terms = parsed.terms.map((term): TermResult => {
    if (term.kind === 'const') return term
    const rolls = Array.from({ length: term.count }, () => rollDie(term.sides, random))
    const kept = keptIndices(rolls, term)
    const subtotal = kept.reduce((sum, i) => sum + rolls[i], 0)
    return { kind: 'dice', sign: term.sign, sides: term.sides, rolls, kept, subtotal }
  })
  const total = terms.reduce(
    (sum, t) => sum + t.sign * (t.kind === 'const' ? t.value : t.subtotal),
    0,
  )
  return { terms, total }
}

function rollDie(sides: DiceTerm['sides'], random: RandomSource): number {
  if (sides === 'F') return randomInt(random, -1, 1)
  if (sides === 'd66') return randomInt(random, 1, 6) * 10 + randomInt(random, 1, 6)
  return randomInt(random, 1, sides)
}

function keptIndices(rolls: number[], term: DiceTerm): number[] {
  const all = rolls.map((_, i) => i)
  if (!term.keep) return all
  const sorted = [...all].sort((a, b) =>
    term.keep!.mode === 'highest' ? rolls[b] - rolls[a] : rolls[a] - rolls[b],
  )
  return sorted.slice(0, term.keep.count).sort((a, b) => a - b)
}

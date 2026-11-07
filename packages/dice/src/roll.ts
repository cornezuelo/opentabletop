import { randomInt, type RandomSource } from '@open-tabletop/random'
import { parseDice } from './parse'
import type { DiceExpression, DiceResult, DiceTerm, DiceTermResult, TermResult } from './types'

/** Which of several totals of the same expression is kept. */
export type Keep = 'highest' | 'lowest' | 'middle'

export interface RollOptions {
  /**
   * Roll the whole expression this many times and keep one total (`keep`); the others
   * are returned as `discarded`. Systems name these ways of rolling (advantage…).
   */
  repeat?: number
  keep?: Keep
  /**
   * Instead, a percentile die's (`d%`, `d66`) tens and units swapped when it gives the higher
   * or lower total: 73 read as 37 (`lowest`). The total not kept is returned as `discarded`.
   */
  swap?: 'highest' | 'lowest'
}

/** Rolls an expression (string or parsed) with a full breakdown of every die. */
export function roll(
  expression: string | DiceExpression,
  random: RandomSource,
  options: RollOptions = {},
): DiceResult {
  const parsed = typeof expression === 'string' ? parseDice(expression) : expression
  if (options.swap) return swapped(parsed.source, rollOnce(parsed, random), options.swap)
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

/** A roll with its percentile die's digits swapped, if that's the total kept. */
function swapped(
  expression: string,
  rolled: { terms: TermResult[]; total: number },
  keep: 'highest' | 'lowest',
): DiceResult {
  const at = rolled.terms.findIndex(
    (t) => t.kind === 'dice' && t.rolls.length === 1 && (t.sides === 100 || t.sides === 'd66'),
  )
  if (at < 0) return { expression, ...rolled }
  const term = rolled.terms[at] as DiceTermResult
  const value = term.rolls[0]
  const digits = swapDigits(value)
  const terms = [...rolled.terms]
  terms[at] = { ...term, rolls: [digits], subtotal: digits }
  const other = { terms, total: rolled.total + term.sign * (digits - value) }
  const better = keep === 'highest' ? other.total > rolled.total : other.total < rolled.total
  const [kept, not] = better ? [other, rolled] : [rolled, other]
  return { expression, ...kept, discarded: [not] }
}

/** Tens and units swapped: 73 → 37, 10 → 1, 100 (00) stays 100, 5 (05) → 50. */
export function swapDigits(value: number): number {
  const tens = Math.floor((value % 100) / 10)
  const units = value % 10
  return units * 10 + tens || 100
}

function rollOnce(
  parsed: DiceExpression,
  random: RandomSource,
): { terms: TermResult[]; total: number } {
  const terms = parsed.terms.map((term): TermResult => {
    if (term.kind === 'const') return term
    const chains = term.explode
      ? Array.from({ length: term.count }, () =>
          explodeDie(term.sides as number, term.explode!, random),
        )
      : undefined
    const rolls = chains
      ? chains.map((c) => c.reduce((a, b) => a + b, 0))
      : Array.from({ length: term.count }, () => rollDie(term.sides, random))
    const kept = keptIndices(rolls, term)
    const subtotal = kept.reduce((sum, i) => sum + rolls[i], 0)
    return {
      kind: 'dice',
      sign: term.sign,
      sides: term.sides,
      rolls,
      kept,
      subtotal,
      ...(chains && { chains }),
    }
  })
  const total = terms.reduce(
    (sum, t) => sum + t.sign * (t.kind === 'const' ? t.value : t.subtotal),
    0,
  )
  return { terms, total }
}

/** An exploding die: rolled again on its highest face, at most `times` more times. */
function explodeDie(sides: number, times: number, random: RandomSource): number[] {
  const faces = [randomInt(random, 1, sides)]
  while (faces.at(-1) === sides && faces.length <= times) faces.push(randomInt(random, 1, sides))
  return faces
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

/**
 * The expression with `extra` more dice on its first plain term, keeping as many as it had:
 * `2d6` with 1 more, the highest, is `3d6kh2`. Terms that already keep some stay as they are.
 */
export function withExtraDice(
  expression: DiceExpression,
  extra: number,
  keep: 'highest' | 'lowest',
): DiceExpression {
  const at = expression.terms.findIndex(
    (t) => t.kind === 'dice' && !t.keep && typeof t.sides === 'number',
  )
  if (at < 0) return expression
  const terms = [...expression.terms]
  const term = terms[at] as Extract<(typeof terms)[number], { kind: 'dice' }>
  terms[at] = { ...term, count: term.count + extra, keep: { mode: keep, count: term.count } }
  return { ...expression, terms }
}

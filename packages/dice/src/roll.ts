import { randomInt, type RandomSource } from '@open-tabletop/random'
import { parseDice } from './parse'
import type { DiceExpression, DiceResult, DiceTerm, TermResult } from './types'

export interface RollOptions {
  /** +1 = advantage (roll twice, keep the higher total), -1 = disadvantage, 0 = normal. */
  advantage?: number
}

/** Rolls an expression (string or parsed) with a full breakdown of every die. */
export function roll(
  expression: string | DiceExpression,
  random: RandomSource,
  options: RollOptions = {},
): DiceResult {
  const parsed = typeof expression === 'string' ? parseDice(expression) : expression
  const first = rollOnce(parsed, random)
  const advantage = Math.sign(options.advantage ?? 0)
  if (advantage === 0) return { expression: parsed.source, ...first }
  const second = rollOnce(parsed, random)
  const secondWins = advantage > 0 ? second.total > first.total : second.total < first.total
  const [kept, discarded] = secondWins ? [second, first] : [first, second]
  return { expression: parsed.source, ...kept, discarded }
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

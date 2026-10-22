import type { DiceResult } from './types'

/**
 * A roll as one line of text, the same in any language: the expression, its total, each
 * die (`~3~` for one not kept) and the totals a roll mode didn't keep, e.g.
 * `2d6+1 → 8  [3, 4] +1` or `2d20kh1 → 17  [~5~, 17]  (9)`.
 */
export function diceText(r: DiceResult): string {
  const parts = r.terms.map((term) =>
    term.kind === 'dice'
      ? `[${term.rolls.map((v, i) => (term.kept.includes(i) ? v : `~${v}~`)).join(', ')}]`
      : `${term.sign < 0 ? '−' : '+'}${term.value}`,
  )
  // Rolls not kept (a roll mode); older histories kept a single one.
  const discarded = r.discarded === undefined ? [] : [r.discarded].flat()
  const others = discarded.length ? `  (${discarded.map((d) => d.total).join(', ')})` : ''
  return `${r.expression} → ${r.total}  ${parts.join(' ')}${others}`
}

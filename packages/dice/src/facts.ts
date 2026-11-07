import type { DiceResult } from './types'

/** What a roll's dice show, besides its total: what tables read as `dice.*`. */
export interface DiceFacts {
  /**
   * Two dice alike: among the dice kept, two showing the same face (`2d6` → 4 and 4); a
   * single percentile die (`d%`, `d66`) whose tens and units match (33, 100 as 00).
   */
  doubles: boolean
  /** The faces of the dice kept, in the order rolled (a `d%` or `d66` as its number). */
  faces: number[]
}

export function diceFacts(r: DiceResult): DiceFacts {
  const dice = r.terms.flatMap((t) => (t.kind === 'dice' ? [t] : []))
  const faces = dice.flatMap((t) => t.kept.map((i) => t.rolls[i]))
  const single = dice.length === 1 && dice[0].kept.length === 1 ? dice[0] : undefined
  const percentile = single && (single.sides === 100 || single.sides === 'd66')
  const doubles = percentile
    ? Math.floor((faces[0] % 100) / 10) === faces[0] % 10
    : new Set(faces).size < faces.length
  return { doubles, faces }
}

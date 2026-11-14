import type { DiceResult, DiceTermResult } from '@open-tabletop/dice'

/** The shape a die is drawn as: its number of faces, or a round one for any other. */
export type DieShape = 4 | 6 | 8 | 10 | 12 | 20 | 'percent' | 'fudge' | 'round'

/** One die as drawn: its shape and face, whether it counts, and the faces it exploded into. */
export interface DrawnDie {
  shape: DieShape
  /** What its face shows: `4`, `00` (a d% of 100), `+` / `−` / blank (Fudge). */
  face: string
  /** Left out by a keep (advantage, the highest of several): drawn faded. */
  dropped: boolean
  /** Rolled again on its highest face (`d6!`): each further face, in order. */
  more: string[]
  /** Its value, for words: `4`, `-1`. */
  value: number
}

/** A roll as drawn: each term its dice (or a number added), then the total. */
export interface DrawnRoll {
  expression: string
  parts: ({ kind: 'dice'; sign: 1 | -1; dice: DrawnDie[] } | { kind: 'mod'; text: string })[]
  total: number
  /** Rolled by the player with dice of their own: only its total. */
  byHand: boolean
  /** The rolls a roll mode didn't keep (advantage's other), each as drawn. */
  others: DrawnRoll[]
}

const SHAPES: readonly number[] = [4, 6, 8, 10, 12, 20]

function shapeOf(sides: DiceTermResult['sides']): DieShape {
  if (sides === 'F') return 'fudge'
  if (sides === 100) return 'percent'
  if (sides === 'd66') return 6
  return SHAPES.includes(sides) ? (sides as DieShape) : 'round'
}

/** A face as the die shows it. */
function faceOf(sides: DiceTermResult['sides'], value: number): string {
  if (sides === 'F') return value > 0 ? '+' : value < 0 ? '−' : ''
  if (sides === 100) return value === 100 ? '00' : String(value).padStart(2, '0')
  return String(value)
}

/** The dice of one term: a d66 is two d6, its tens and its units. */
function termDice(term: DiceTermResult): DrawnDie[] {
  return term.rolls.flatMap((value, i) => {
    const dropped = !term.kept.includes(i)
    if (term.sides === 'd66') {
      const tens = Math.floor(value / 10)
      return [tens, value % 10].map((v) => ({
        shape: 6 as const,
        face: String(v),
        dropped,
        more: [],
        value: v,
      }))
    }
    const chain = term.chains?.[i]
    const faces = chain && chain.length > 1 ? chain : [value]
    return [
      {
        shape: shapeOf(term.sides),
        face: faceOf(term.sides, faces[0]!),
        dropped,
        more: faces.slice(1).map((v) => faceOf(term.sides, v)),
        value,
      },
    ]
  })
}

/** A roll (with its breakdown) as the dice tray draws it. */
export function drawRoll(
  r: Pick<DiceResult, 'expression' | 'terms' | 'total' | 'discarded' | 'byHand'>,
): DrawnRoll {
  const parts = (r.terms ?? []).map((term) =>
    term.kind === 'dice'
      ? { kind: 'dice' as const, sign: term.sign, dice: termDice(term) }
      : { kind: 'mod' as const, text: `${term.sign < 0 ? '−' : '+'}${term.value}` },
  )
  const discarded = r.discarded === undefined ? [] : [r.discarded].flat()
  return {
    expression: r.expression,
    parts,
    total: r.total,
    byHand: !!r.byHand,
    others: discarded.map((d) =>
      drawRoll({ expression: r.expression, terms: d.terms, total: d.total }),
    ),
  }
}

/** How long a roll just made tumbles before its faces settle, in ms (each die a little later). */
export const ROLL_MS = 1200
export const ROLL_STAGGER_MS = 120

/** A face a die of that shape may show while it rolls (`n` in [0, 1), from any randomness). */
export function rollingFace(shape: DieShape, n: number): string {
  if (shape === 'fudge') return ['−', '', '+'][Math.floor(n * 3)]!
  if (shape === 'percent')
    return String(Math.floor(n * 100) + 1)
      .padStart(2, '0')
      .slice(-2)
  const sides = shape === 'round' ? 6 : shape
  return String(Math.floor(n * sides) + 1)
}

import type { DiceResult, DiceTermResult } from '@open-tabletop/dice'

/**
 * A roll as a tray takes it: `inside` when it was rolled inside the result another roll came
 * to (a row's `{{1d3}}` of harm), drawn after the rolls asked for, said so in words.
 */
export type TrayRoll = Pick<
  DiceResult,
  'expression' | 'terms' | 'total' | 'discarded' | 'byHand'
> & {
  inside?: boolean
}

/**
 * The solid a die is drawn as: a real die's (d4 to d20, d%, Fudge's cube), or a coin for a
 * d2. A die with no solid of its own is drawn as the one it's rolled with at a table: a d3
 * as a d6 (1–3 twice), a d5 as a d10, any other as the smallest that has enough faces.
 */
export type DieShape = 4 | 6 | 8 | 10 | 12 | 20 | 'percent' | 'fudge' | 'coin'

/** One die as drawn: its shape and face, whether it counts, and the faces it exploded into. */
export interface DrawnDie {
  shape: DieShape
  /** What it is, written small on it: `6`, `3` (a d3 drawn as a d6), `%`, `F`. */
  sides: string
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

const SHAPES = [4, 6, 8, 10, 12, 20] as const

function shapeOf(sides: DiceTermResult['sides']): DieShape {
  if (sides === 'F') return 'fudge'
  if (sides === 100) return 'percent'
  if (sides === 'd66') return 6
  if (sides === 2) return 'coin'
  if (sides <= 3) return 6
  if (sides === 5) return 10
  return SHAPES.find((s) => s >= sides) ?? 20
}

/** A die's name, as written on it. */
function sidesOf(sides: DiceTermResult['sides']): string {
  if (sides === 'F') return 'F'
  if (sides === 100) return '%'
  if (sides === 'd66') return '6'
  return String(sides)
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
        sides: '6',
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
        sides: sidesOf(term.sides),
        face: faceOf(term.sides, faces[0]!),
        dropped,
        more: faces.slice(1).map((v) => faceOf(term.sides, v)),
        value,
      },
    ]
  })
}

/**
 * A roll made by hand has only its total: when it's of one die and nothing else (`1d6`,
 * `d20`), that die showing it; anything else stays a total.
 */
function handDie(expression: string, total: number): DrawnRoll['parts'] {
  const sides = Number(/^\s*1?d(\d+)\s*$/i.exec(expression)?.[1])
  if (!sides || total < 1 || total > sides) return []
  const die = {
    shape: shapeOf(sides),
    sides: sidesOf(sides),
    face: faceOf(sides, total),
    dropped: false,
    more: [],
  }
  return [{ kind: 'dice', sign: 1, dice: [{ ...die, value: total }] }]
}

/** A roll (with its breakdown) as the dice tray draws it. */
export function drawRoll(
  r: Pick<DiceResult, 'expression' | 'terms' | 'total' | 'discarded' | 'byHand'>,
): DrawnRoll {
  // Nothing added or taken (`1d6 - 0`, a modifier read as 0) isn't drawn.
  const parts = (r.terms ?? [])
    .filter((term) => term.kind === 'dice' || term.value !== 0)
    .map((term) =>
      term.kind === 'dice'
        ? { kind: 'dice' as const, sign: term.sign, dice: termDice(term) }
        : { kind: 'mod' as const, text: `${term.sign < 0 ? '−' : '+'}${term.value}` },
    )
  const discarded = r.discarded === undefined ? [] : [r.discarded].flat()
  return {
    expression: r.expression,
    parts: parts.length || !r.byHand ? parts : handDie(r.expression, r.total),
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

/**
 * A face that die may show while it rolls (`n` in [0, 1), from any randomness): only faces
 * it has, never an 8 on a d3.
 */
export function rollingFace(die: Pick<DrawnDie, 'sides'>, n: number): string {
  if (die.sides === 'F') return ['−', '', '+'][Math.floor(n * 3)]!
  if (die.sides === '%')
    return String(Math.floor(n * 100) + 1)
      .padStart(2, '0')
      .slice(-2)
  return String(Math.floor(n * (Number(die.sides) || 6)) + 1)
}

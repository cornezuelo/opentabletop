/** Parsed dice expression: a signed sum of terms. */
export interface DiceExpression {
  source: string
  terms: Term[]
}

export type Term = DiceTerm | ConstTerm

export interface DiceTerm {
  kind: 'dice'
  sign: 1 | -1
  count: number
  /** Number of faces, or 'F' (Fudge: -1/0/+1) or 'd66' (tens and units on two d6). */
  sides: number | 'F' | 'd66'
  /** Keep the highest/lowest N dice, if any. */
  keep?: { mode: 'highest' | 'lowest'; count: number }
}

export interface ConstTerm {
  kind: 'const'
  sign: 1 | -1
  value: number
}

export interface DiceTermResult {
  kind: 'dice'
  sign: 1 | -1
  sides: DiceTerm['sides']
  /** Every die rolled, in order. */
  rolls: number[]
  /** Indices into `rolls` of the dice that count. */
  kept: number[]
  subtotal: number
}

export interface ConstTermResult {
  kind: 'const'
  sign: 1 | -1
  value: number
}

export type TermResult = DiceTermResult | ConstTermResult

export interface DiceResult {
  expression: string
  terms: TermResult[]
  total: number
  /** With advantage/disadvantage, the discarded roll of the expression. */
  discarded?: { terms: TermResult[]; total: number }
}

export class DiceSyntaxError extends Error {
  constructor(
    message: string,
    public expression: string,
    public position: number,
  ) {
    super(`${message} at position ${position} in "${expression}"`)
  }
}

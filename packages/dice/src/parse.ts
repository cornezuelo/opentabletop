import { DiceSyntaxError, type DiceExpression, type Term } from './types'

const MAX_DICE = 1000
const MAX_SIDES = 1_000_000
/** How many times a die of a plain `!` may explode: practically without end. */
export const EXPLODE_MAX = 100

/** One term of dice as written: `2d6`, `d20`, `4d6kh3`, `dF`, `d%`, `d66`, `1d6!`. */
const DICE_TERM = /\d*d(?:\d+|%|f)(?:!\d*)?(?:k[hl]\d*)?/i.source
const TERM = new RegExp(`^${DICE_TERM}$`, 'i')
const ROLL = new RegExp(`^\\s*${DICE_TERM}(?:\\s*[+-]\\s*\\d+)?\\s*$`, 'i')

/** Whether a text is one term of dice (`2d6`, `d%`, `1d6!`), with nothing else. */
export const isDiceTerm = (text: string): boolean => TERM.test(text)

/** Whether a text is dice, maybe plus or minus a number (`1d6+2`): a roll, not a name. */
export const isDiceRoll = (text: string): boolean => ROLL.test(text)

/**
 * Parses expressions like `2d6+1`, `d100`, `d%`, `d66`, `4dF`, `4d6kh3`, `2d20kl1 - 2`, `2d6!`.
 * Grammar: expr := term (('+'|'-') term)* ;
 * term := number | [count] 'd' sides ['!' [n]] [('kh'|'kl') n]
 */
export function parseDice(source: string): DiceExpression {
  const text = source.toLowerCase()
  let pos = 0
  const terms: Term[] = []

  const skipSpaces = () => {
    while (text[pos] === ' ') pos++
  }
  const readInt = (): number | null => {
    const start = pos
    while (pos < text.length && text[pos] >= '0' && text[pos] <= '9') pos++
    return pos > start ? Number(text.slice(start, pos)) : null
  }
  const fail = (message: string): never => {
    throw new DiceSyntaxError(message, source, pos)
  }

  skipSpaces()
  if (pos >= text.length) fail('Empty expression')
  let sign: 1 | -1 = 1
  if (text[pos] === '-' || text[pos] === '+') {
    sign = text[pos] === '-' ? -1 : 1
    pos++
  }

  for (;;) {
    skipSpaces()
    const count = readInt()
    if (text[pos] === 'd') {
      pos++
      let sides: number | 'F' | 'd66'
      if (text[pos] === 'f') {
        pos++
        sides = 'F'
      } else if (text[pos] === '%') {
        pos++
        sides = 100
      } else {
        const n = readInt()
        if (n === null) fail('Expected number of sides')
        sides = n === 66 ? 'd66' : n!
        if (typeof sides === 'number' && (sides < 1 || sides > MAX_SIDES))
          fail('Invalid number of sides')
      }
      const dice = count ?? 1
      if (dice < 1 || dice > MAX_DICE) fail('Invalid number of dice')
      const term: Term = { kind: 'dice', sign, count: dice, sides }
      if (text[pos] === '!') {
        pos++
        if (typeof sides !== 'number' || sides < 2) fail('Only dice of 2 or more sides explode')
        const times = readInt() ?? EXPLODE_MAX
        if (times < 1 || times > EXPLODE_MAX) fail('Invalid number of explosions')
        term.explode = times
      }
      if (text.startsWith('kh', pos) || text.startsWith('kl', pos)) {
        const mode = text[pos + 1] === 'h' ? 'highest' : 'lowest'
        pos += 2
        const keep = readInt() ?? 1
        if (keep < 1 || keep > dice) fail('Cannot keep more dice than rolled')
        term.keep = { mode, count: keep }
      }
      terms.push(term)
    } else if (count !== null) {
      terms.push({ kind: 'const', sign, value: count })
    } else {
      fail('Expected a number or dice')
    }
    skipSpaces()
    if (pos >= text.length) break
    if (text[pos] !== '+' && text[pos] !== '-') fail(`Unexpected "${source[pos]}"`)
    sign = text[pos] === '-' ? -1 : 1
    pos++
  }
  return { source: source.trim(), terms }
}

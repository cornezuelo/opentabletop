/**
 * Variables and rolls in written values, one syntax for every engine and pack:
 *
 *   '{{party.stats.stealth}}'     a variable: the value with that name
 *   '{{2d6}}'                     a roll: dice, rolled when it's read
 *   'Found {{1d6}} coins'         inside a text, each is written in its place
 *
 * A value that is a whole `{{…}}` keeps what it names (numbers stay numbers, lists stay
 * lists); a text with them inside renders them. No logic, ever: a name or dice, nothing
 * else.
 */
import { parseDice, roll, DiceSyntaxError, type DiceResult } from '@open-tabletop/dice'
import { seeded, type RandomSource } from '@open-tabletop/random'

const VARIABLE = /\{\{\s*([^}]+?)\s*\}\}/g
const WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/
/** Dice an expression may roll: `2d6`, `d20`, `1d6+2`, `4d6kh3`, `dF`, `d%`, `d66`. */
const DICE = /^\s*\d*d(\d+|%|f)(k[hl]\d*)?(\s*[+-]\s*\d+)?\s*$/i

/** What a variable reads: the value of a name, or a roll's total. */
export type Lookup = (expression: string) => unknown

/** Rolls a dice expression (undefined if it isn't dice). */
export type Roller = (expression: string) => number | undefined

/** The expression of a value that is a whole `{{…}}` (`'{{2d6}}'` → `2d6`), if it is one. */
export function variableOf(value: unknown): string | undefined {
  return typeof value === 'string' ? WHOLE.exec(value)?.[1] : undefined
}

/** Whether a text has `{{…}}` in it. */
export function hasVariables(text: unknown): boolean {
  return typeof text === 'string' && /\{\{[^}]*\}\}/.test(text)
}

/** Whether an expression is dice (`2d6`) rather than a variable's name. */
export function isRoll(expression: string): boolean {
  return DICE.test(expression)
}

/** Reads `a.b.c` from nested plain objects; never touches prototypes. */
export function resolvePath(context: Record<string, unknown>, path: string): unknown {
  let node: unknown = context
  for (const part of path.split('.')) {
    if (!isObject(node) || !Object.prototype.hasOwnProperty.call(node, part)) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return node
}

/**
 * What a variable or roll reads in a context: names are its values, dice are rolled with
 * `roller` (none: a roll reads nothing).
 */
export function lookupIn(context: Record<string, unknown>, roller?: Roller): Lookup {
  return (expression) =>
    isRoll(expression) ? roller?.(expression) : resolvePath(context, expression.trim())
}

/**
 * A text with each `{{…}}` written in its place. Nothing (a missing value) writes nothing;
 * a result (an object with a `text`) writes its text.
 */
export function render(template: string, lookup: Lookup): string {
  return template.replace(VARIABLE, (_, expression: string) => {
    const value = lookup(expression)
    if (value === undefined || value === null) return ''
    if (typeof value === 'object') {
      const text = (value as Record<string, unknown>).text
      return typeof text === 'string' ? text : ''
    }
    return String(value)
  })
}

/** A written value as it reads: a whole `{{…}}` keeps the raw value, a text renders. */
export function evaluate(value: unknown, lookup: Lookup): unknown {
  const whole = variableOf(value)
  if (whole !== undefined) return lookup(whole)
  return typeof value === 'string' && hasVariables(value) ? render(value, lookup) : value
}

/**
 * Rolls fixed for a moment: the same dice in the same moment (named by `key`) give the
 * same total, however many times they're read, so what depends on them doesn't change
 * when it's looked at again. Seeded by the key and the dice, so nothing needs keeping.
 */
export function momentRoller(key: string): Roller {
  return (expression) => {
    const dice = normalized(expression)
    return dice === undefined ? undefined : roll(dice, seeded(`${key}|${dice}`)).total
  }
}

/**
 * Rolls with a random source, once per dice expression (the same dice read again give the
 * same total): what one moment, one resolution, rolls. `onRoll` hears each new roll.
 */
export function onceRoller(random: RandomSource, onRoll?: (result: DiceResult) => void): Roller {
  const rolled = new Map<string, number>()
  return (expression) => {
    const dice = normalized(expression)
    if (dice === undefined) return undefined
    const known = rolled.get(dice)
    if (known !== undefined) return known
    const result = roll(dice, random)
    onRoll?.(result)
    rolled.set(dice, result.total)
    return result.total
  }
}

/** The bounds a value declares: its `min` / `max`, or none. */
export interface Bounds {
  min?: number
  max?: number
}

/**
 * An effect's change with the variables and rolls it names read (`'-{{party.stats.mouths}}'`:
 * as many as the party's mouths, taken away; `'={{party.stats.endurance}}'`: set to it;
 * `'{{days}}'`: add them; `'-{{1d3}}'`: a roll, with `roller`): a number to add, or `'=N'`
 * to set. A variable that isn't a number changes nothing.
 */
export function resolveChange(
  change: number | string,
  context: Record<string, unknown>,
  roller?: Roller,
): number | string {
  if (typeof change !== 'string') return change
  const text = change.trim()
  const set = text.startsWith('=')
  let rest = set ? text.slice(1).trim() : text
  let sign = 1
  if (/^[+-]\s*\{\{/.test(rest)) {
    if (rest[0] === '-') sign = -1
    rest = rest.slice(1).trim()
  }
  const expression = variableOf(rest)
  if (expression === undefined) return change
  const value = lookupIn(context, roller)(expression)
  const n =
    typeof value === 'number' && Number.isFinite(value)
      ? value
      : typeof value === 'string' && /^[+-]?\d+(\.\d+)?$/.test(value.trim())
        ? Number(value)
        : undefined
  if (n === undefined) return 0
  return set ? `=${n * sign}` : n * sign
}

/**
 * A value changed by an effect: a number adds (also as text, '+2'), '=3' sets; the result
 * stops at the bounds, and `limit` says which one it was cut by.
 */
export function changeValue(
  from: number,
  change: number | string,
  bounds: Bounds = {},
): { to: number; limit?: 'min' | 'max' } {
  const number = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && /^[+-]?\d+(\.\d+)?$/.test(v.trim())
        ? Number(v)
        : undefined
  const set =
    typeof change === 'string' && change.startsWith('=') ? number(change.slice(1)) : undefined
  const wanted = set !== undefined ? set : from + (number(change) ?? 0)
  if (bounds.min !== undefined && wanted < bounds.min) return { to: bounds.min, limit: 'min' }
  if (bounds.max !== undefined && wanted > bounds.max) return { to: bounds.max, limit: 'max' }
  return { to: wanted }
}

/** Dice written one way (`1d20`, ` 1D20 ` alike), or undefined if they aren't dice. */
function normalized(expression: string): string | undefined {
  if (!isRoll(expression)) return undefined
  const text = expression.replace(/\s+/g, '').toLowerCase()
  try {
    parseDice(text)
  } catch (error) {
    if (error instanceof DiceSyntaxError) return undefined
    throw error
  }
  return text
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

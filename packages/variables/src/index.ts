/**
 * Variables and rolls in written values, one syntax for every engine and pack:
 *
 *   '{{party.stats.stealth}}'     a variable: the value with that name
 *   '{{2d6}}'                     a roll: dice, rolled when it's read
 *   'Found {{1d6}} coins'         inside a text, each is written in its place
 *   '{{self.values.might * 2 + 4}}' arithmetic: numbers, names and dice with + - * /,
 *                                 brackets and floor, ceil, round, min, max, abs
 *
 * A value that is a whole `{{…}}` keeps what it names (numbers stay numbers, lists stay
 * lists); a text with them inside renders them. Arithmetic, never logic: no conditions,
 * no code, and a parser of our own (never `eval`). Ids may hold a hyphen
 * (`actions.night-march`), so a minus between names is written with spaces (`a - b`).
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
  return (expression) => {
    if (isRoll(expression)) return roller?.(expression)
    const sum = arithmetic(expression)
    if (!sum) return resolvePath(context, expression.trim())
    return calculate(sum, (name) => resolvePath(context, name), roller)
  }
}

/**
 * The names an expression reads (`self.values.might * 2` → `self.values.might`): itself if
 * it's a name, none if it's dice.
 */
export function namesIn(expression: string): string[] {
  if (isRoll(expression)) return []
  const sum = arithmetic(expression)
  if (!sum) return [expression.trim()]
  const names: string[] = []
  const walk = (node: Node): void => {
    if (node.type === 'name') names.push(node.name)
    else if (node.type === 'unary') walk(node.of)
    else if (node.type === 'binary') [node.left, node.right].forEach(walk)
    else if (node.type === 'call') node.args.forEach(walk)
  }
  walk(sum)
  return [...new Set(names)]
}

/** Whether an expression rolls dice anywhere (`1d6`, `self.values.x + 1d4`). */
export function rollsIn(expression: string): boolean {
  if (isRoll(expression)) return true
  const sum = arithmetic(expression)
  if (!sum) return false
  const walk = (node: Node): boolean =>
    node.type === 'dice' ||
    (node.type === 'unary' && walk(node.of)) ||
    (node.type === 'binary' && (walk(node.left) || walk(node.right))) ||
    (node.type === 'call' && node.args.some(walk))
  return walk(sum)
}

/** The functions arithmetic may call. */
export const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
}

type Node =
  | { type: 'number'; value: number }
  | { type: 'name'; name: string }
  | { type: 'dice'; dice: string }
  | { type: 'unary'; of: Node }
  | { type: 'binary'; op: '+' | '-' | '*' | '/'; left: Node; right: Node }
  | { type: 'call'; fn: string; args: Node[] }

const TOKEN =
  /\s*(?:(\d*d(?:\d+|%|f)(?:k[hl]\d*)?)(?![\w.])|(\d+(?:\.\d+)?)(?![\w.])|([A-Za-z_][A-Za-z0-9_]*(?:[.-][A-Za-z0-9_]+)*)|([-+*/(),]))/iy

/**
 * An expression read as arithmetic, or undefined when it isn't (a lone name stays a name,
 * read as before; anything that doesn't parse too, so no older value changes meaning).
 */
function arithmetic(expression: string): Node | undefined {
  const tokens: { kind: 'dice' | 'number' | 'name' | 'op'; text: string }[] = []
  TOKEN.lastIndex = 0
  const text = expression.trim()
  while (TOKEN.lastIndex < text.length) {
    const m = TOKEN.exec(text)
    if (!m) return undefined
    const kind = m[1] ? 'dice' : m[2] ? 'number' : m[3] ? 'name' : 'op'
    tokens.push({ kind, text: m[1] ?? m[2] ?? m[3] ?? m[4] })
  }
  if (tokens.length < 2 && tokens[0]?.kind !== 'number') return undefined
  let at = 0
  const peek = () => tokens[at]
  const take = (op: string) => (peek()?.kind === 'op' && peek().text === op ? (at++, true) : false)
  const sum = (): Node | undefined => {
    let left = product()
    while (left && (peek()?.text === '+' || peek()?.text === '-') && peek().kind === 'op') {
      const op = tokens[at++].text as '+' | '-'
      const right = product()
      left = right && { type: 'binary', op, left, right }
    }
    return left
  }
  const product = (): Node | undefined => {
    let left = unary()
    while (left && (peek()?.text === '*' || peek()?.text === '/') && peek().kind === 'op') {
      const op = tokens[at++].text as '*' | '/'
      const right = unary()
      left = right && { type: 'binary', op, left, right }
    }
    return left
  }
  const unary = (): Node | undefined => {
    if (take('-')) {
      const of = unary()
      return of && { type: 'unary', of }
    }
    if (take('+')) return unary()
    return atom()
  }
  const atom = (): Node | undefined => {
    const t = tokens[at++]
    if (!t) return undefined
    if (t.kind === 'number') return { type: 'number', value: Number(t.text) }
    if (t.kind === 'dice') return { type: 'dice', dice: t.text }
    if (t.kind === 'name') {
      if (!take('(')) return { type: 'name', name: t.text }
      if (!(t.text in FUNCTIONS)) return undefined
      const args: Node[] = []
      if (!take(')')) {
        do {
          const arg = sum()
          if (!arg) return undefined
          args.push(arg)
        } while (take(','))
        if (!take(')')) return undefined
      }
      return args.length ? { type: 'call', fn: t.text, args } : undefined
    }
    if (t.text === '(') {
      const inner = sum()
      return inner && take(')') ? inner : undefined
    }
    return undefined
  }
  const tree = sum()
  return tree && at === tokens.length ? tree : undefined
}

/** What an expression comes to; undefined when a name isn't a number, or it divides by 0. */
function calculate(
  node: Node,
  read: (name: string) => unknown,
  roller: Roller | undefined,
): number | undefined {
  const go = (n: Node): number | undefined => {
    switch (n.type) {
      case 'number':
        return n.value
      case 'dice':
        return roller?.(n.dice)
      case 'name':
        return numeric(read(n.name))
      case 'unary': {
        const v = go(n.of)
        return v === undefined ? undefined : -v
      }
      case 'binary': {
        const a = go(n.left)
        const b = go(n.right)
        if (a === undefined || b === undefined) return undefined
        if (n.op === '+') return a + b
        if (n.op === '-') return a - b
        if (n.op === '*') return a * b
        return b === 0 ? undefined : a / b
      }
      case 'call': {
        const args = n.args.map(go)
        if (args.some((a) => a === undefined)) return undefined
        const v = FUNCTIONS[n.fn](...(args as number[]))
        return Number.isFinite(v) ? v : undefined
      }
    }
  }
  return go(node)
}

function numeric(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'string' && /^[+-]?\d+(\.\d+)?$/.test(v.trim())) return Number(v)
  return undefined
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

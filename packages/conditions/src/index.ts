/**
 * Declarative conditions over plain context objects, safe for third-party packs
 * (nothing is ever evaluated as code).
 *
 *   { terrain: forest }                          equality
 *   { terrain: [forest, swamp] }                 membership
 *   { danger: { gte: 4 }, season: { not: winter } }
 *   { 'party.stats.pre': { gt: 0 } }             dotted paths
 *   { any: [{ weather: storm }, { lost: true }] }  all / any / not
 *   { danger: { gt: '{{party.stats.stealth}}' } }  a variable: another value of the context
 *   { party.stats.str: { gte: '{{1d20}}' } }       a roll
 *
 * Array context values (e.g. tags) match when they contain the expected value. A value
 * written as a whole `{{…}}` is a variable (the context's value with that name) or a roll
 * (dice, rolled by the `roller` the caller gives: see `@open-tabletop/variables`).
 */
import { lookupIn, resolvePath, variableOf, type Roller } from '@open-tabletop/variables'

export { resolvePath }

export type Primitive = string | number | boolean | null

export interface Comparison {
  eq?: Primitive
  not?: Primitive | Primitive[]
  in?: Primitive[]
  /** A number, or a variable or roll (`'{{party.stats.stealth}}'`, `'{{1d20}}'`). */
  gt?: number | string
  gte?: number | string
  lt?: number | string
  lte?: number | string
  exists?: boolean
}

export type Matcher = Primitive | Primitive[] | Comparison

export type Condition =
  { all: Condition[] } | { any: Condition[] } | { not: Condition } | { [path: string]: Matcher }

const COMPARISON_KEYS = new Set(['eq', 'not', 'in', 'gt', 'gte', 'lt', 'lte', 'exists'])
const MAX_DEPTH = 32

export interface MatchOptions {
  /**
   * Rolls the dice a condition names (`'{{1d20}}'`); without it a roll reads nothing, and
   * never holds. Engines give one that rolls once per moment (`momentRoller`).
   */
  roller?: Roller
}

export function matches(
  condition: Condition | undefined,
  context: Record<string, unknown>,
  options: MatchOptions = {},
): boolean {
  return condition === undefined || evaluate(condition, context, options.roller, 0)
}

function evaluate(
  condition: Condition,
  context: Record<string, unknown>,
  roller: Roller | undefined,
  depth: number,
): boolean {
  if (depth > MAX_DEPTH) return false
  const inner = (c: Condition) => evaluate(c, context, roller, depth + 1)
  // Every key holds together: `all` / `any` / `not` beside values (`{ tags: market, any:
  // […] }`) are one more of them.
  return Object.entries(condition).every(([key, value]) => {
    if (key === 'all' && Array.isArray(value)) return (value as Condition[]).every(inner)
    if (key === 'any' && Array.isArray(value)) return (value as Condition[]).some(inner)
    if (key === 'not' && isObject(value) && !isComparison(value)) return !inner(value as Condition)
    return matchValue(resolvePath(context, key), value as Matcher, context, roller)
  })
}

/**
 * A written value as the condition means it: a variable or a roll (`'{{…}}'`) reads what
 * it names, anything else is itself.
 */
export function valueOf(
  written: unknown,
  context: Record<string, unknown>,
  roller?: Roller,
): unknown {
  const expression = variableOf(written)
  return expression === undefined ? written : lookupIn(context, roller)(expression)
}

function matchValue(
  value: unknown,
  matcher: Matcher,
  context: Record<string, unknown>,
  roller: Roller | undefined,
): boolean {
  const is = (expected: unknown) => equals(value, valueOf(expected, context, roller))
  if (Array.isArray(matcher)) return matcher.some(is)
  if (!isObject(matcher)) return is(matcher)
  const c = matcher as Comparison
  if (c.exists !== undefined && (value !== undefined && value !== null) !== c.exists) return false
  if ('eq' in c && !is(c.eq)) return false
  if ('not' in c) {
    const excluded = Array.isArray(c.not) ? c.not : [c.not!]
    if (excluded.some(is)) return false
  }
  if (c.in && !c.in.some(is)) return false
  const numeric = ['gt', 'gte', 'lt', 'lte'].some((k) => k in c)
  if (numeric) {
    if (typeof value !== 'number' || Number.isNaN(value)) return false
    // A variable that isn't a number never compares.
    const bound = (written: unknown) => {
      const n = valueOf(written, context, roller)
      return typeof n === 'number' && !Number.isNaN(n) ? n : undefined
    }
    for (const [op, holds] of [
      ['gt', (b: number) => value > b],
      ['gte', (b: number) => value >= b],
      ['lt', (b: number) => value < b],
      ['lte', (b: number) => value <= b],
    ] as const) {
      if (!(op in c) || c[op] === undefined) continue
      const b = bound(c[op])
      if (b === undefined || !holds(b)) return false
    }
  }
  return true
}

/**
 * Equality, where an array context value matches if it contains the expected value, and
 * an expected list (a reference to one) if it holds the value.
 */
function equals(value: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) return expected.some((e) => equals(value, e))
  if (Array.isArray(value)) return value.some((v) => v === expected)
  return value === expected
}

/** Structural validation for pack loading. Returns human-readable problems (empty = valid). */
export function validateCondition(condition: unknown, at = 'when'): string[] {
  return check(condition, at, 0)
}

function check(condition: unknown, at: string, depth: number): string[] {
  if (depth > MAX_DEPTH) return [`${at}: nested too deeply`]
  if (!isObject(condition)) return [`${at}: must be an object`]
  const entries = Object.entries(condition)
  if (entries.length === 0) return [`${at}: is empty`]
  const errors: string[] = []
  for (const [key, value] of entries) {
    if (key === 'all' || key === 'any') {
      if (!Array.isArray(value) || value.length === 0)
        errors.push(`${at}.${key}: must be a non-empty list`)
      else value.forEach((c, i) => errors.push(...check(c, `${at}.${key}[${i}]`, depth + 1)))
    } else if (key === 'not' && isObject(value) && !isComparison(value)) {
      errors.push(...check(value, `${at}.not`, depth + 1))
    } else {
      errors.push(...checkMatcher(value, `${at}.${key}`))
    }
  }
  return errors
}

function checkMatcher(matcher: unknown, at: string): string[] {
  if (isPrimitive(matcher)) return []
  if (Array.isArray(matcher))
    return matcher.every(isPrimitive) ? [] : [`${at}: lists may only contain plain values`]
  if (!isObject(matcher)) return [`${at}: unsupported value`]
  const errors: string[] = []
  for (const [op, value] of Object.entries(matcher)) {
    if (!COMPARISON_KEYS.has(op)) errors.push(`${at}: unknown operator "${op}"`)
    else if (
      ['gt', 'gte', 'lt', 'lte'].includes(op) &&
      typeof value !== 'number' &&
      variableOf(value) === undefined
    )
      errors.push(`${at}.${op}: must be a number, or a variable or roll in {{…}}`)
    else if (op === 'in' && !(Array.isArray(value) && value.every(isPrimitive)))
      errors.push(`${at}.in: must be a list of plain values`)
    else if (op === 'exists' && typeof value !== 'boolean')
      errors.push(`${at}.exists: must be true or false`)
  }
  return errors
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isComparison(value: unknown): boolean {
  return (
    isObject(value) &&
    Object.keys(value).length > 0 &&
    Object.keys(value).every((k) => COMPARISON_KEYS.has(k))
  )
}

function isPrimitive(value: unknown): value is Primitive {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

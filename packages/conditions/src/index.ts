/**
 * Declarative conditions over plain context objects, safe for third-party packs
 * (nothing is ever evaluated as code).
 *
 *   { terrain: forest }                          equality
 *   { terrain: [forest, swamp] }                 membership
 *   { danger: { gte: 4 }, season: { not: winter } }
 *   { 'party.stats.pre': { gt: 0 } }             dotted paths
 *   { any: [{ weather: storm }, { lost: true }] }  all / any / not
 *
 * Array context values (e.g. tags) match when they contain the expected value.
 */
export type Primitive = string | number | boolean | null

export interface Comparison {
  eq?: Primitive
  not?: Primitive | Primitive[]
  in?: Primitive[]
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  exists?: boolean
}

export type Matcher = Primitive | Primitive[] | Comparison

export type Condition =
  { all: Condition[] } | { any: Condition[] } | { not: Condition } | { [path: string]: Matcher }

const COMPARISON_KEYS = new Set(['eq', 'not', 'in', 'gt', 'gte', 'lt', 'lte', 'exists'])
const MAX_DEPTH = 32

export function matches(
  condition: Condition | undefined,
  context: Record<string, unknown>,
): boolean {
  return condition === undefined || evaluate(condition, context, 0)
}

function evaluate(condition: Condition, context: Record<string, unknown>, depth: number): boolean {
  if (depth > MAX_DEPTH) return false
  if ('all' in condition && Array.isArray(condition.all))
    return (condition.all as Condition[]).every((c) => evaluate(c, context, depth + 1))
  if ('any' in condition && Array.isArray(condition.any))
    return (condition.any as Condition[]).some((c) => evaluate(c, context, depth + 1))
  if ('not' in condition && isObject(condition.not) && !isComparison(condition.not))
    return !evaluate(condition.not as Condition, context, depth + 1)
  return Object.entries(condition).every(([path, matcher]) =>
    matchValue(resolvePath(context, path), matcher as Matcher),
  )
}

function matchValue(value: unknown, matcher: Matcher): boolean {
  if (Array.isArray(matcher)) return matcher.some((m) => equals(value, m))
  if (!isObject(matcher)) return equals(value, matcher as Primitive)
  const c = matcher as Comparison
  if (c.exists !== undefined && (value !== undefined && value !== null) !== c.exists) return false
  if ('eq' in c && !equals(value, c.eq!)) return false
  if ('not' in c) {
    const excluded = Array.isArray(c.not) ? c.not : [c.not!]
    if (excluded.some((m) => equals(value, m))) return false
  }
  if (c.in && !c.in.some((m) => equals(value, m))) return false
  const numeric = ['gt', 'gte', 'lt', 'lte'].some((k) => k in c)
  if (numeric) {
    if (typeof value !== 'number' || Number.isNaN(value)) return false
    if (c.gt !== undefined && !(value > c.gt)) return false
    if (c.gte !== undefined && !(value >= c.gte)) return false
    if (c.lt !== undefined && !(value < c.lt)) return false
    if (c.lte !== undefined && !(value <= c.lte)) return false
  }
  return true
}

/** Equality, where an array context value matches if it contains the expected value. */
function equals(value: unknown, expected: Primitive): boolean {
  if (Array.isArray(value)) return value.some((v) => v === expected)
  return value === expected
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
    else if (['gt', 'gte', 'lt', 'lte'].includes(op) && typeof value !== 'number')
      errors.push(`${at}.${op}: must be a number`)
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

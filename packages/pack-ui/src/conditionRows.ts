import { FACT_PATHS } from '@open-tabletop/travel-engine'

/**
 * Conditions as rows of _fact · comparison · value_, for forms that build them visually:
 * a condition made of pairs (or one `any` / `all` list of single pairs) reads as rows, and
 * rows write back the same syntax a pack would. Anything richer (nested groups, `not` of a
 * whole condition, several comparisons inside one branch of an `any`) has no rows: forms
 * show it as YAML, never losing it.
 */

/** A comparison a row can make, each one key of the condition syntax. */
export const CONDITION_OPS = [
  'is',
  'in',
  'not',
  'notIn',
  'gt',
  'gte',
  'lt',
  'lte',
  'exists',
  'missing',
] as const
export type ConditionOp = (typeof CONDITION_OPS)[number]

/** Comparisons that take no value. */
export const BARE_OPS: readonly ConditionOp[] = ['exists', 'missing']
/** Comparisons whose value is a list (written comma-separated). */
export const LIST_OPS: readonly ConditionOp[] = ['in', 'notIn']

export interface ConditionRow {
  fact: string
  op: ConditionOp
  /** As written in the box: `forest`, `3`, `'{{party.stats.stealth}}'`, `forest, hills`. */
  value: string
  /** Written with its comparison's key (`{ eq: x }`, `{ in: [ … ] }`), kept so when written back. */
  keyed?: boolean
}

export interface ConditionRows {
  /** Every row must hold (`all`), or at least one (`any`). */
  join: 'all' | 'any'
  rows: ConditionRow[]
  /** Written as a list (`all: [ … ]`), kept so when written back. */
  list?: boolean
}

type Scalar = string | number | boolean
const isScalar = (v: unknown): v is Scalar =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
const isMap = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** A value as a box shows it; lists comma-separated. */
export function valueText(value: unknown): string {
  if (Array.isArray(value)) return value.map(valueText).join(', ')
  return value === undefined || value === null ? '' : String(value)
}

/** What a box's text means: a number, `true` / `false`, or the text itself. */
export function readValue(text: string): Scalar {
  const s = text.trim().replace(/^(['"])(.*)\1$/, '$2')
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) return Number(s)
  if (s === 'true' || s === 'false') return s === 'true'
  return s
}

const readList = (text: string): Scalar[] =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(readValue)

/** One pair (`danger: { gte: 2, lte: 4 }`) as rows, or null when it has none. */
function pairRows(fact: string, value: unknown): ConditionRow[] | null {
  if (isScalar(value)) return [{ fact, op: 'is', value: valueText(value) }]
  if (Array.isArray(value))
    return value.every(isScalar) ? [{ fact, op: 'in', value: valueText(value) }] : null
  if (!isMap(value) || !Object.keys(value).length) return null
  const rows: ConditionRow[] = []
  for (const [key, x] of Object.entries(value)) {
    const list = Array.isArray(x) && x.every(isScalar)
    if (key === 'eq' && isScalar(x)) rows.push({ fact, op: 'is', value: valueText(x), keyed: true })
    else if (key === 'not' && (isScalar(x) || list))
      rows.push({ fact, op: list ? 'notIn' : 'not', value: valueText(x) })
    else if (key === 'in' && list) rows.push({ fact, op: 'in', value: valueText(x), keyed: true })
    else if (['gt', 'gte', 'lt', 'lte'].includes(key) && isScalar(x))
      rows.push({ fact, op: key as ConditionOp, value: valueText(x) })
    else if (key === 'exists' && typeof x === 'boolean')
      rows.push({ fact, op: x ? 'exists' : 'missing', value: '' })
    else return null
  }
  return rows
}

/** A map of pairs as rows, or null when it joins conditions (`all`, `any`, `not`). */
function mapRows(map: Record<string, unknown>): ConditionRow[] | null {
  const rows: ConditionRow[] = []
  for (const [fact, value] of Object.entries(map)) {
    if (['all', 'any', 'not'].includes(fact)) return null
    const more = pairRows(fact, value)
    if (!more) return null
    rows.push(...more)
  }
  return rows
}

/** A condition as rows; nothing written is no rows; null when it can't be rows. */
export function conditionRows(condition: unknown): ConditionRows | null {
  if (condition === undefined || condition === null) return { join: 'all', rows: [] }
  if (!isMap(condition)) return null
  const keys = Object.keys(condition)
  const list = condition[keys[0]]
  if (keys.length === 1 && (keys[0] === 'any' || keys[0] === 'all') && Array.isArray(list)) {
    const parts = list.map((c) => (isMap(c) ? mapRows(c) : null))
    if (parts.some((p) => !p)) return null
    // A branch of an `any` with two comparisons is a group of its own: not rows.
    if (keys[0] === 'any' && parts.some((p) => p!.length !== 1)) return null
    const rows = parts.flat() as ConditionRow[]
    return keys[0] === 'all' ? { join: 'all', rows, list: true } : { join: 'any', rows }
  }
  const rows = mapRows(condition)
  return rows && { join: 'all', rows }
}

/** What a row compares its fact with, as a pair's value. */
function rowValue({ op, value, keyed }: ConditionRow): unknown {
  if (op === 'is') return keyed ? { eq: readValue(value) } : readValue(value)
  if (op === 'in') return keyed ? { in: readList(value) } : readList(value)
  if (op === 'notIn') return { not: readList(value) }
  if (op === 'exists' || op === 'missing') return { exists: op === 'exists' }
  return { [op]: readValue(value) }
}

/**
 * Rows as the condition a pack writes: pairs (`{ place.terrain: forest, danger: { gte: 3 } }`),
 * comparisons of one fact together (`danger: { gte: 2, lte: 4 }`), `all` when a fact must be
 * two things at once (or it was written so), `any` for either. Rows without a fact are left out; none is undefined.
 */
export function rowsCondition({
  join,
  rows,
  list,
}: ConditionRows): Record<string, unknown> | undefined {
  const kept = rows.filter((r) => r.fact.trim())
  if (!kept.length) return undefined
  const pair = (r: ConditionRow) => ({ [r.fact.trim()]: rowValue(r) })
  if (join === 'any') return kept.length === 1 ? pair(kept[0]) : { any: kept.map(pair) }
  if (list && kept.length > 1) return { all: kept.map(pair) }
  const out: Record<string, unknown> = {}
  for (const r of kept) {
    const fact = r.fact.trim()
    const value = rowValue(r)
    const before = out[fact]
    if (before === undefined) out[fact] = value
    else if (isMap(before) && isMap(value) && Object.keys(value).every((k) => !(k in before)))
      out[fact] = { ...before, ...value }
    // The same fact twice in ways one pair can't say: each row a condition of its own.
    else return { all: kept.map(pair) }
  }
  return out
}

/**
 * The facts a condition's rows suggest: by their full names (`place.terrain`), leaving out
 * the short names that say the same (`terrain`), which are still read.
 */
export function conditionFacts(suggestions: Record<string, readonly string[]>): string[] {
  return Object.keys(suggestions)
    .filter((key) => !(key.split('.')[0] in FACT_PATHS))
    .sort()
}

/**
 * Rows in words, for a folded card: "place.terrain is forest and danger is at least 3", with
 * the comparisons' words given by the host (its language). Null when there are no rows.
 */
export function rowsWords(
  { join, rows }: ConditionRows,
  words: { ops: Record<ConditionOp, string>; and: string; or: string },
): string | null {
  const kept = rows.filter((r) => r.fact.trim())
  if (!kept.length) return null
  return kept
    .map((r) =>
      BARE_OPS.includes(r.op)
        ? `${r.fact} ${words.ops[r.op]}`
        : `${r.fact} ${words.ops[r.op]} ${r.value}`,
    )
    .join(join === 'any' ? ` ${words.or} ` : ` ${words.and} `)
}

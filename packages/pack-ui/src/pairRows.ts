/**
 * A map of `key: value` pairs (a check's `effects`, a binding's `context`, values of the day
 * a step sets…) as rows a form edits one by one, keeping the keys' order. A map whose values
 * aren't all plain (a number, a text, true / false) has no rows: forms show it as YAML.
 */

export type PairValue = string | number | boolean
export type Pairs = [key: string, value: PairValue][]

const isPlain = (v: unknown): v is PairValue =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

/** The map's pairs in order (none for no map), or null when one value isn't plain. */
export function pairRows(value: unknown): Pairs | null {
  if (value === undefined || value === null) return []
  if (typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value)
  return entries.every(([, v]) => isPlain(v)) ? (entries as Pairs) : null
}

/** The rows written back as a map; none left is no map at all. */
export const rowsPairs = (rows: Pairs): Record<string, PairValue> | undefined =>
  rows.length ? Object.fromEntries(rows) : undefined

/**
 * Row `index` renamed to `key` and given `value`, in its place; an empty key removes it.
 * Null when another row already has that key.
 */
export function setPair(rows: Pairs, index: number, key: string, value: PairValue): Pairs | null {
  if (!key) return rows.filter((_, i) => i !== index)
  if (rows.some(([k], i) => i !== index && k === key)) return null
  return rows.map((row, i) => (i === index ? [key, value] : row))
}

/** A row more: the first suggested key not used yet (else `new`, `new2`…). */
export function addPair(rows: Pairs, keys: readonly string[], value: PairValue): Pairs {
  const used = new Set(rows.map(([k]) => k))
  let key = keys.find((k) => !used.has(k))
  for (let n = 1; !key; n++) if (!used.has(`new${n > 1 ? n : ''}`)) key = `new${n > 1 ? n : ''}`
  return [...rows, [key, value]]
}

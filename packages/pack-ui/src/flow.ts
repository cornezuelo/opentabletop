import { parse, stringify } from 'yaml'

/** A condition or context as one line of YAML (`{ tags: landmark }`), for a text box. */
export function flowText(value: unknown): string {
  if (value === undefined || value === null) return ''
  // A map keyed by whole numbers (tones from a value up) in their order, unquoted: `-3: danger, 0: good`.
  const keys = typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : []
  if (keys.length && keys.every((k) => /^-?\d+$/.test(k)))
    value = new Map(
      keys
        .map(Number)
        .sort((a, b) => a - b)
        .map((k) => [k, (value as Record<string, unknown>)[k]]),
    )
  // One line however long: a box shows it whole, never folded.
  return stringify(value, { collectionStyle: 'flow', lineWidth: 0 }).trim()
}

/** Reads such a line back; undefined for an empty box, null when it isn't a map. */
export function parseFlow(text: string): Record<string, unknown> | undefined | null {
  if (!text.trim()) return undefined
  try {
    const value = parse(/^\s*[[{]/.test(text) ? text : `{ ${text} }`)
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

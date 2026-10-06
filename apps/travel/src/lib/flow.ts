import { parse, stringify } from 'yaml'

/** A condition or context as one line of YAML (`{ tags: landmark }`), for a text box. */
export function flowText(value: unknown): string {
  if (value === undefined || value === null) return ''
  return stringify(value, { collectionStyle: 'flow' }).trim()
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

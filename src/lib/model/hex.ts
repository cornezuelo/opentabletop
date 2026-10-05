import type { HexData } from './types'

/**
 * Canonical form of a hex: trims text, drops empty values and duplicate tags, and
 * always builds keys in the same order so two equal hexes serialize identically.
 */
export function normalizeHex(hex: HexData | undefined): HexData {
  const out: HexData = {}
  if (!hex) return out
  if (hex.terrain) out.terrain = hex.terrain
  const name = hex.name?.trim()
  if (name) out.name = name
  if (hex.notes?.trim()) out.notes = hex.notes.trimEnd()

  const pois = (hex.pois ?? [])
    .map((p) => {
      const description = p.description?.trim()
      return { id: p.id, name: p.name.trim(), ...(description ? { description } : {}) }
    })
    .filter((p) => p.name || p.description)
  if (pois.length > 0) out.pois = pois

  const tags = [...new Set((hex.tags ?? []).map((t) => t.trim()).filter(Boolean))]
  if (tags.length > 0) out.tags = tags

  const fields = (hex.fields ?? [])
    .map((f) => ({ key: f.key.trim(), value: f.value.trim() }))
    .filter((f) => f.key || f.value)
  if (fields.length > 0) out.fields = fields

  const note = hex.note?.trim()
  if (note) out.note = note

  return out
}

export function isEmptyHex(hex: HexData | undefined): boolean {
  return Object.keys(normalizeHex(hex)).length === 0
}

export function sameHex(a: HexData | undefined, b: HexData | undefined): boolean {
  return JSON.stringify(normalizeHex(a)) === JSON.stringify(normalizeHex(b))
}

/** True if the hex carries anything beyond its terrain. */
export function hasMetadata(hex: HexData | undefined): boolean {
  return Object.keys(normalizeHex(hex)).some((key) => key !== 'terrain')
}

/** Every tag and field key used in the map, sorted, for autocompletion. */
export function collectSuggestions(hexes: Iterable<HexData>): {
  tags: string[]
  fieldKeys: string[]
} {
  const tags = new Set<string>()
  const fieldKeys = new Set<string>()
  for (const hex of hexes) {
    hex.tags?.forEach((tag) => tags.add(tag))
    hex.fields?.forEach((f) => f.key && fieldKeys.add(f.key))
  }
  return { tags: [...tags].sort(), fieldKeys: [...fieldKeys].sort() }
}

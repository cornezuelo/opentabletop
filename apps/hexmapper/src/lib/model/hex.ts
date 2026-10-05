import type { HexData, HexIcon } from './types'

export const ICON_SCALE_RANGE = [0.4, 2] as const

/** Drops default values so equal icons compare and serialize identically. */
export function normalizeIcon(icon: HexIcon | undefined): HexIcon | undefined {
  if (!icon?.id) return undefined
  const out: HexIcon = { id: icon.id }
  if (icon.color && /^#[0-9a-f]{6}$/i.test(icon.color)) out.color = icon.color.toLowerCase()
  if (icon.scale !== undefined && Number.isFinite(icon.scale) && icon.scale !== 1)
    out.scale = Math.min(ICON_SCALE_RANGE[1], Math.max(ICON_SCALE_RANGE[0], icon.scale))
  const rotation = (((icon.rotation ?? 0) % 360) + 360) % 360
  if (Number.isFinite(rotation) && rotation !== 0) out.rotation = rotation
  if (icon.flip) out.flip = true
  if (icon.halo) out.halo = true
  return out
}

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

  const icon = normalizeIcon(hex.icon)
  if (icon) out.icon = icon

  return out
}

export function isEmptyHex(hex: HexData | undefined): boolean {
  return Object.keys(normalizeHex(hex)).length === 0
}

export function sameHex(a: HexData | undefined, b: HexData | undefined): boolean {
  return JSON.stringify(normalizeHex(a)) === JSON.stringify(normalizeHex(b))
}

/** Visible on the map by themselves, so they don't count as "has notes". */
const SELF_EVIDENT: (keyof HexData)[] = ['terrain', 'icon']

/** True if the hex carries data that isn't visible on the map (name, notes, POIs…). */
export function hasMetadata(hex: HexData | undefined): boolean {
  return (Object.keys(normalizeHex(hex)) as (keyof HexData)[]).some(
    (key) => !SELF_EVIDENT.includes(key),
  )
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

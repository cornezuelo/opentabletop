import type { HexData, HexIcon, MapPath } from './types'

export const ICON_SCALE_RANGE = [0.4, 2] as const
export const ICON_HALO_RANGE = [0.3, 0.9] as const
export const ICON_OUTLINE_RANGE = [0.01, 0.1] as const
export const ICON_DEFAULTS = {
  haloColor: '#f4eedd',
  haloSize: 0.48,
  outlineColor: '#f4eedd',
  outlineWidth: 0.03,
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function clampOptional(
  value: number | undefined,
  [min, max]: readonly [number, number],
  fallback: number,
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined
  const clamped = Math.min(max, Math.max(min, value))
  return clamped === fallback ? undefined : clamped
}

function colorOptional(value: string | undefined, fallback: string): string | undefined {
  if (!value || !HEX_COLOR.test(value)) return undefined
  const color = value.toLowerCase()
  return color === fallback ? undefined : color
}

/** Drops default values so equal icons compare and serialize identically. */
export function normalizeIcon(icon: HexIcon | undefined): HexIcon | undefined {
  if (!icon?.id) return undefined
  const out: HexIcon = { id: icon.id }
  if (icon.color && HEX_COLOR.test(icon.color)) out.color = icon.color.toLowerCase()
  if (icon.scale !== undefined && Number.isFinite(icon.scale) && icon.scale !== 1)
    out.scale = Math.min(ICON_SCALE_RANGE[1], Math.max(ICON_SCALE_RANGE[0], icon.scale))
  const rotation = (((icon.rotation ?? 0) % 360) + 360) % 360
  if (Number.isFinite(rotation) && rotation !== 0) out.rotation = rotation
  if (icon.flip) out.flip = true
  if (icon.halo) {
    out.halo = true
    const haloColor = colorOptional(icon.haloColor, ICON_DEFAULTS.haloColor)
    const haloSize = clampOptional(icon.haloSize, ICON_HALO_RANGE, ICON_DEFAULTS.haloSize)
    if (haloColor) out.haloColor = haloColor
    if (haloSize !== undefined) out.haloSize = haloSize
  }
  if (icon.outline) {
    out.outline = true
    const outlineColor = colorOptional(icon.outlineColor, ICON_DEFAULTS.outlineColor)
    const outlineWidth = clampOptional(
      icon.outlineWidth,
      ICON_OUTLINE_RANGE,
      ICON_DEFAULTS.outlineWidth,
    )
    if (outlineColor) out.outlineColor = outlineColor
    if (outlineWidth !== undefined) out.outlineWidth = outlineWidth
  }
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
      const note = p.note?.trim()
      return {
        id: p.id,
        name: p.name.trim(),
        ...(description ? { description } : {}),
        ...(note ? { note } : {}),
      }
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

/** Drops centered offsets and default flags so equal paths serialize identically. */
export function normalizePath(path: MapPath): MapPath {
  const out: MapPath = { id: path.id, kind: path.kind, hexes: [...path.hexes] }
  const offsets = path.hexes.map((_, i) => {
    const o = path.offsets?.[i]
    if (!o || (o[0] === 0 && o[1] === 0)) return null
    return [round3(o[0]), round3(o[1])] as [number, number]
  })
  if (offsets.some((o) => o !== null)) out.offsets = offsets
  const flags = nodeFlags(path)
  if (flags.some((f) => !f)) out.nodes = flags.flatMap((f, i) => (f ? [i] : []))
  if (path.straight) out.straight = true
  return out
}

/** Per-hex "is a drawn vertex" flags; endpoints always are. */
export function nodeFlags(path: Pick<MapPath, 'hexes' | 'nodes'>): boolean[] {
  const last = path.hexes.length - 1
  if (!path.nodes) return path.hexes.map(() => true)
  const set = new Set(path.nodes)
  return path.hexes.map((_, i) => i === 0 || i === last || set.has(i))
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

import data from '../../assets/icons/game-icons.json'
import { t, type MessageKey } from '../i18n/index.svelte'
import type { MapAsset } from '../model/types'

export interface BuiltinIcon {
  id: string // 'game:castle'
  name: string
  category: IconCategory
  body: string // inner SVG markup, fill="currentColor"
}

export const ICON_CATEGORIES = [
  'party',
  'terrain',
  'settlements',
  'landmarks',
  'nature',
  'danger',
  'modern',
  'scifi',
  'misc',
] as const
export type IconCategory = (typeof ICON_CATEGORIES)[number]

const SIZE = data.size

export const BUILTIN_ICONS = data.icons as BuiltinIcon[]
const byId = new Map(BUILTIN_ICONS.map((icon) => [icon.id, icon]))

export function getBuiltinIcon(id: string): BuiltinIcon | undefined {
  return byId.get(id)
}

/** Standalone SVG for a bundled icon. Bundled content only, so it's safe to inline. */
export function builtinSvg(icon: BuiltinIcon, color = 'currentColor'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" style="color:${color}">${icon.body}</svg>`
}

export function assetIdOf(iconId: string): string | null {
  return iconId.startsWith('asset:') ? iconId.slice('asset:'.length) : null
}

export interface IconImage {
  url: string
  /** Bundled icons are single-color white images meant to be tinted. */
  tintable: boolean
}

/** Image URL to render an icon id, or null if it can't be resolved (e.g. deleted asset). */
export function iconImage(iconId: string, assets: MapAsset[]): IconImage | null {
  const builtin = byId.get(iconId)
  if (builtin) {
    const svg = builtinSvg(builtin, '#ffffff')
    return { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, tintable: true }
  }
  const assetId = assetIdOf(iconId)
  const asset = assetId ? assets.find((a) => a.id === assetId) : undefined
  return asset ? { url: asset.dataUrl, tintable: false } : null
}

/** The icon's name in the UI's language ("stone-bridge" → "stone bridge", "puente de piedra"). */
export function iconLabel(icon: BuiltinIcon): string {
  const key = `iconNames.${icon.name}` as MessageKey
  const name = t(key)
  return name === key ? icon.name.replaceAll('-', ' ') : name
}

/** Whether an icon matches a search, by its name in the UI's language or in English. */
export function iconMatches(icon: BuiltinIcon, query: string): boolean {
  const q = query.trim().toLowerCase()
  return (
    !q || iconLabel(icon).toLowerCase().includes(q) || icon.name.replaceAll('-', ' ').includes(q)
  )
}

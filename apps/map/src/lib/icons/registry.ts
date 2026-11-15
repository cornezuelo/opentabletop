import { builtinSvg, getBuiltinIcon, type BuiltinIcon } from '@open-tabletop/ui-kit/icons'
import { t, type MessageKey } from '../i18n/index.svelte'
import type { MapAsset } from '@open-tabletop/map'

// The bundled icons are shared (ui-kit); what's Map's own is its assets and the icons' names.
export {
  BUILTIN_ICONS,
  builtinSvg,
  getBuiltinIcon,
  ICON_CATEGORIES,
  type BuiltinIcon,
  type IconCategory,
} from '@open-tabletop/ui-kit/icons'

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
  const builtin = getBuiltinIcon(iconId)
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

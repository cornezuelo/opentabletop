import {
  builtinSvg,
  getBuiltinIcon,
  iconLabel as labelOf,
  iconMatches as matchesIcon,
  type BuiltinIcon,
} from '@open-tabletop/ui-kit/icons'
import { characterPicture } from '@open-tabletop/character-ui'
import { getLocale } from '../i18n/index.svelte'
import type { MapAsset, MapToken } from '@open-tabletop/map'

// The bundled icons are shared (ui-kit); what's Map's own is its imported images.
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

/**
 * The library picture a token draws in place of its icon (**Show its picture**): its sheet's
 * portrait, else its template's; undefined when it's off, or there's no sheet or picture.
 */
export const tokenPicture = (token: MapToken): string | undefined =>
  token.showPicture && token.character
    ? characterPicture({ ...token.character, id: token.id, name: token.name })
    : undefined

/** The icon's name in the UI's language ("stone-bridge" → "stone bridge", "puente de piedra"). */
export const iconLabel = (icon: BuiltinIcon): string => labelOf(icon, getLocale())

/** Whether an icon matches a search, by its name in the UI's language or in English. */
export const iconMatches = (icon: BuiltinIcon, query: string): boolean =>
  matchesIcon(icon, query, getLocale())

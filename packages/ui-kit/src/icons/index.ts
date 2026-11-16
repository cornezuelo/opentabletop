import data from './game-icons.json'
import { iconNamesEn, iconNamesEs } from './names'

/**
 * The bundled icons (a subset of game-icons.net, CC BY 3.0), shared by the apps: Map's
 * tokens, glyphs and icons, and the faces of those drawn small elsewhere (a fight's cards).
 * Its own entry point (`@open-tabletop/ui-kit/icons`), so an app loads it only when it draws one.
 */
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

const NAMES: Record<string, Record<string, string>> = { en: iconNamesEn, es: iconNamesEs }

/** The icon's name in a language ("stone-bridge" → "stone bridge", "puente de piedra"). */
export function iconLabel(icon: BuiltinIcon, locale: string): string {
  return (
    NAMES[locale]?.[icon.name] ??
    (iconNamesEn as Record<string, string>)[icon.name] ??
    icon.name.replaceAll('-', ' ')
  )
}

/** Whether an icon matches a search, by its name in a language or in English. */
export function iconMatches(icon: BuiltinIcon, query: string, locale: string): boolean {
  const q = query.trim().toLowerCase()
  return (
    !q ||
    iconLabel(icon, locale).toLowerCase().includes(q) ||
    icon.name.replaceAll('-', ' ').includes(q)
  )
}

export { default as IconPicker } from './IconPicker.svelte'

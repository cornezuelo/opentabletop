import data from './game-icons.json'

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

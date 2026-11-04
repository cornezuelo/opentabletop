import { localize } from '@open-tabletop/session'
import { en } from './i18n/en'
import { getLocale, t, type MessageKey } from './i18n/index.svelte'
import { mapSystem } from './play/systems'
import type { TerrainType } from '@open-tabletop/map'

/**
 * The map's own name if set, then the name the map's system gives the terrain (in the
 * interface's language), then the translated default for built-in terrain ids.
 */
export function terrainName(terrain: TerrainType): string {
  if (terrain.name) return terrain.name
  const own = localize(mapSystem().rules.terrains[terrain.id]?.name, getLocale(), 'en')
  if (own) return own
  if (terrain.id in en.terrains) return t(`terrains.${terrain.id}` as MessageKey)
  return terrain.id
}

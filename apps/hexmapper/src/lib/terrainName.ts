import { en } from './i18n/en'
import { t, type MessageKey } from './i18n/index.svelte'
import type { TerrainType } from './model/types'

/** Custom name if set, otherwise the translated default for built-in terrain ids. */
export function terrainName(terrain: TerrainType): string {
  if (terrain.name) return terrain.name
  if (terrain.id in en.terrains) return t(`terrains.${terrain.id}` as MessageKey)
  return terrain.id
}

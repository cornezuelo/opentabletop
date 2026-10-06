import type { TravelSystem } from '@open-tabletop/session'
import { en } from './i18n/en'
import { t, type MessageKey } from './i18n'

/** Terrain ids of the Hexmapper's default palette, so trips can use them with any system. */
export const PALETTE = Object.keys(en.terrains)

/** Terrains to choose from: the palette plus any the system's rules name. */
export function terrainChoices(system: TravelSystem): string[] {
  return [...new Set([...PALETTE, ...Object.keys(system.rules.terrains)])]
}

/** Kinds of line to choose from: the usual ones plus any the rules name. */
export function edgeChoices(system: TravelSystem): string[] {
  return [...new Set(['road', 'trail', 'river', ...Object.keys(system.rules.edges ?? {})])]
}

export const terrainName = (id: string): string =>
  id in en.terrains ? t(`terrains.${id}` as MessageKey) : id.replaceAll('-', ' ')

export const edgeName = (id: string): string =>
  id in en.edgeKinds ? t(`edgeKinds.${id}` as MessageKey) : id.replaceAll('-', ' ')

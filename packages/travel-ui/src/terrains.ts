import type { TravelSystem } from '@open-tabletop/session'
import { vocabulary } from '@open-tabletop/ui-kit'
import { idText, type Translate } from './i18n'

/** Terrain ids of the Hexmapper's default palette, so trips can use them with any system. */
export const PALETTE = Object.keys(vocabulary.en.terrains)

/** Terrains to choose from: the palette plus any the system's rules name. */
export function terrainChoices(system: TravelSystem): string[] {
  return [...new Set([...PALETTE, ...Object.keys(system.rules.terrains)])]
}

/** Kinds of line to choose from: the usual ones plus any the rules name. */
export function edgeChoices(system: TravelSystem): string[] {
  return [...new Set(['road', 'trail', 'river', ...Object.keys(system.rules.edges ?? {})])]
}

export const terrainName = (t: Translate, id: string): string => idText(t, `terrains.${id}`, id)

export const edgeName = (t: Translate, id: string): string => idText(t, `edgeKinds.${id}`, id)

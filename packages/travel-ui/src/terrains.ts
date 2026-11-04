import { localize, type TravelSystem } from '@open-tabletop/session'
import { vocabulary } from '@open-tabletop/ui-kit'
import { idText, type Translate } from './i18n'

/** Terrain ids of Map's default palette, so trips can use them with any system. */
export const PALETTE = Object.keys(vocabulary.en.terrains)

/** Terrains to choose from: the palette plus any the system's rules name. */
export function terrainChoices(system: TravelSystem): string[] {
  return [...new Set([...PALETTE, ...Object.keys(system.rules.terrains)])]
}

/** Kinds of line to choose from: the usual ones plus any the rules name. */
export function connectionChoices(system: TravelSystem): string[] {
  return [...new Set(['road', 'trail', 'river', ...Object.keys(system.rules.connections ?? {})])]
}

/** Where a system's own names are read: the system and the language shown. */
export type NamedBy = { system: TravelSystem; locale: string }

/** The name the system gives a terrain, then the app's for the usual ones, then the id. */
export const terrainName = (t: Translate, id: string, by?: NamedBy): string =>
  (by && localize(by.system.rules.terrains[id]?.name, by.locale, 'en')) ||
  idText(t, `terrains.${id}`, id)

/** The name the system gives a kind of connection, then the app's, then the id. */
export const connectionName = (t: Translate, id: string, by?: NamedBy): string =>
  (by && localize(by.system.rules.connections?.[id]?.name, by.locale, 'en')) ||
  idText(t, `connectionKinds.${id}`, id)

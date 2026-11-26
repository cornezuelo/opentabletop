import type { Campaign } from '@open-tabletop/campaign'
import { PackLibrary } from '@open-tabletop/pack-ui'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { factionName, systemIdOf, travelSystems } from '@open-tabletop/session'
import { getLocale } from './i18n'

/** Bundled packs plus the user's: only to name the campaigns' factions as their systems do. */
export const library = new PackLibrary(bundledPacks)

/** A campaign's faction's name, from the system its factions came from (if loaded). */
export function nameFaction(campaign: Campaign, id: string): string | undefined {
  const from = campaign.factions?.system
  if (!from) return undefined
  const system = travelSystems(library.registry).systems.find((s) => s.id === systemIdOf(from))
  return system?.factions ? factionName(system.factions, id, getLocale()) : undefined
}

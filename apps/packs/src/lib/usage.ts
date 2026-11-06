import { shownPlace as placeOf, type UsePlaceShown } from '@open-tabletop/oracle-ui'
import {
  declaredOf,
  systemUses,
  usesOf,
  type Declared,
  type TravelSystem,
  type Use,
} from '@open-tabletop/session'
import { FACT_GROUPS } from '@open-tabletop/travel-engine'
import { getLocale } from './i18n'
import { library } from './packs.svelte'

/** Where a system's names are used (`docs/used-by.md`): the index, and how to show a use. */

export { sheetScope, type PlaceKind, type UsePlaceShown } from '@open-tabletop/oracle-ui'

const cache = new WeakMap<TravelSystem, Use[]>()

/** Every use of a name in the system's packs (systems are made again when packs change). */
export function usesIn(system: TravelSystem): Use[] {
  let uses = cache.get(system)
  if (!uses) {
    uses = systemUses(library.registry, system)
    cache.set(system, uses)
  }
  return uses
}

/** The uses of one thing the system declares. */
export const usesFor = (system: TravelSystem, declared: Declared): Use[] =>
  usesOf(usesIn(system), declared, system)

/**
 * The names the system's own parts declare, as full names (`party.stats.morale`), and those
 * the engines give every system (`hex.*`, `trip.*`…): a name in neither is likely a typo.
 */
export function knownName(system: TravelSystem, name: string): boolean {
  const first = name.split('.')[0]
  if ((FACT_GROUPS as readonly string[]).includes(first)) return true
  if (['from', 'around', 'token', 'icon', 'params'].includes(first)) return true
  const uses = usesIn(system)
  return declaredOf(library.registry, system).some((d) =>
    usesOf(uses, d, system).some((u) => u.name === name || u.written === name),
  )
}

/** A use as the list shows it (oracle-ui's `shownPlace`, in the UI's language). */
export const shownPlace = (system: TravelSystem, use: Use): UsePlaceShown =>
  placeOf(system, use, library.registry, getLocale())

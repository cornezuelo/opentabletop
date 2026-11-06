import { localize, type TravelSystem } from '@open-tabletop/session'
import { WORLD_DO_TURN as WORLD_TURN } from '@open-tabletop/travel-engine'

/** A moment of the world a trip hears: one of the system's clocks filling. */
const FULL = /^world\.clocks\.(.+)\.full$/

/** The clocks a system declares filling (`world.clocks.<id>.full`). */
export function clockMoments(system: TravelSystem | undefined): string[] {
  return Object.keys(system?.clocks?.def.clocks ?? {}).map((id) => `world.clocks.${id}.full`)
}

/**
 * The moments of the world a system's actions (`on:`) and checks (`at:`) may name,
 * suggested in the forms: a world turn (`world.turn`), if it declares factions to take one,
 * and each clock it declares filling.
 */
export function tripWorldMoments(system: TravelSystem | undefined): string[] {
  return [...(system?.factions ? [WORLD_TURN] : []), ...clockMoments(system)]
}

/** The clock a moment of the world names, by its name ("The Wyrm wakes"); undefined if it isn't one. */
export function clockOfMoment(
  system: TravelSystem | undefined,
  moment: string,
  locale: string,
): string | undefined {
  const id = FULL.exec(moment)?.[1]
  if (!id) return undefined
  const clock = system?.clocks?.def.clocks[id]
  return localize(clock?.name, locale, system?.locale) ?? id
}

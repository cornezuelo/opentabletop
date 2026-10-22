import { localize, type TravelSystem } from '@open-tabletop/session'

/** A moment of the world a trip hears: one of the system's clocks filling. */
const FULL = /^world\.clocks\.(.+)\.full$/

/**
 * The moments of the world a system's actions (`on:`) and checks (`at:`) may name: each
 * clock it declares filling (`world.clocks.<id>.full`), suggested in the forms.
 */
export function clockMoments(system: TravelSystem | undefined): string[] {
  return Object.keys(system?.clocks?.def.clocks ?? {}).map((id) => `world.clocks.${id}.full`)
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

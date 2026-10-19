import { calendarOf, type TravelSystem } from '@open-tabletop/session'
import { findPartRef } from '@open-tabletop/travel-engine'
import { divisionName, partName } from '@open-tabletop/travel-ui'
import { vocabulary } from '@open-tabletop/ui-kit'

/**
 * The parts of a system's calendar's day as rules name them (`time.meal.elevenses`): what
 * moments, time steps and the system's day can say, suggested in the forms.
 */
export function dayPartRefs(system: TravelSystem | undefined): string[] {
  if (!system) return []
  return (calendarOf(system).divisions ?? []).flatMap((d) =>
    d.parts.map((p) => `time.${d.id}.${p.id}`),
  )
}

/** A part named in the rules, as players read it: "Meals: elevenses" (else as written). */
export function partLabel(system: TravelSystem | undefined, ref: string, locale: string): string {
  const found = system && findPartRef(calendarOf(system).divisions ?? [], ref)
  if (!found) return ref
  const watches = (locale === 'es' ? vocabulary.es : vocabulary.en).terms.watches
  return `${divisionName(found.division, locale, watches)}: ${partName(found.division, found.part, locale)}`
}

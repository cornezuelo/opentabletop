import { localize } from '@open-tabletop/session'
import type { Calendar, DayPart, Division, GameTime } from '@open-tabletop/time'

/**
 * A division of the day's name: its own, `watches` for the older `watchHours` (it has no
 * name of its own), else its id.
 */
export function divisionName(division: Division, locale: string, watches: string): string {
  if (division.name !== undefined) return localize(division.name, locale, 'en') ?? division.id
  return division.id === 'watch' && division.numbered ? watches : division.id
}

/** A part's name: its number for numbered parts, else its own name or its id. */
export function partName(division: Division, part: DayPart, locale: string): string {
  return division.numbered ? part.id : (localize(part.name, locale, 'en') ?? part.id)
}

/** "Meals: elevenses · Watches: 3": what a moment is in each division of the calendar's day. */
export function dayPartsLine(
  calendar: Calendar,
  time: GameTime,
  locale: string,
  watches: string,
): string {
  const values = calendar.describe(time).divisions ?? {}
  return (calendar.divisions ?? [])
    .flatMap((d) => {
      const part = d.parts.find((p) => p.id === String(values[d.id]))
      return part ? [`${divisionName(d, locale, watches)}: ${partName(d, part, locale)}`] : []
    })
    .join(' · ')
}

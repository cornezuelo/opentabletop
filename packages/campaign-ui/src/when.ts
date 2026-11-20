import { localize } from '@open-tabletop/session'
import { formatClock, type Calendar, type CalendarParts, type GameTime } from '@open-tabletop/time'
import { translator } from './i18n'

/**
 * A moment said short, in the calendar's terms: "15 Thaw, 09:00" with a calendar of its
 * own, "Day 15, 09:00" with the default one.
 */
export function shortTime(calendar: Calendar, time: GameTime, locale: string): string {
  return `${dayText(calendar, time, locale)}, ${formatClock(calendar.describe(time))}`
}

/** The day of a moment, in the calendar's terms: "15 Thaw", or "Day 15" with the default one. */
export function dayText(calendar: Calendar, time: GameTime, locale: string): string {
  const parts = calendar.describe(time)
  return 'month' in parts
    ? `${(parts as CalendarParts).month.day} ${
        localize((parts as CalendarParts).month.name, locale, 'en') ??
        (parts as CalendarParts).month.id
      }`
    : translator(() => locale)('world.day', { day: parts.day })
}

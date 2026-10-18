/**
 * Game time is an absolute number of minutes since the campaign start. Calendars only
 * present it (day, hour, season…), so changing calendar never corrupts saved data.
 */
export type GameTime = number

export const MINUTES_PER_HOUR = 60

export interface TimeParts {
  /** 1-based day number since the campaign start. */
  day: number
  hour: number
  minute: number
  /** Minutes since midnight. */
  minuteOfDay: number
  season?: string
  /**
   * The watch of the day, when the calendar has a `watch` division: its number (1-based,
   * `watchHours` / `every`) or its part's id.
   */
  watch?: number | string
  /** What it is in each division of the day: `{ meal: 'elevenses', watch: 2 }` (a gap: absent). */
  divisions?: Record<string, string | number>
  /** The tags of every part it is now. */
  tags?: string[]
}

export interface Calendar {
  readonly minutesPerDay: number
  /** The divisions of its day (meals, watches…), in the order the calendar declares them. */
  readonly divisions?: readonly Division[]
  describe(time: GameTime): TimeParts
  /** Absolute time of `clock` ("06:00") on the given 1-based day. */
  at(day: number, clock: string | number): GameTime
}

export interface SimpleCalendarOptions {
  hoursPerDay?: number
  /** Watch length in hours (e.g. 4 → six watches a day). */
  watchHours?: number
  /** Seasons in order with their length in days; the cycle repeats. */
  seasons?: { id: string; days: number }[]
  /** Day of the cycle the campaign starts on (0-based), e.g. to start in autumn. */
  startDayOfYear?: number
}

export function simpleCalendar(options: SimpleCalendarOptions = {}): Calendar {
  const hoursPerDay = options.hoursPerDay ?? 24
  const minutesPerDay = hoursPerDay * MINUTES_PER_HOUR
  const seasons = options.seasons ?? []
  const year = seasons.reduce((sum, s) => sum + s.days, 0)
  const divisions = readDivisions(undefined, options.watchHours, hoursPerDay)
  return {
    minutesPerDay,
    divisions,
    describe(time) {
      const t = Math.max(0, Math.floor(time))
      const dayIndex = Math.floor(t / minutesPerDay)
      const minuteOfDay = t - dayIndex * minutesPerDay
      const parts: TimeParts = {
        day: dayIndex + 1,
        hour: Math.floor(minuteOfDay / MINUTES_PER_HOUR),
        minute: minuteOfDay % MINUTES_PER_HOUR,
        minuteOfDay,
      }
      if (year > 0) {
        let dayOfYear = (dayIndex + (options.startDayOfYear ?? 0)) % year
        for (const season of seasons) {
          if (dayOfYear < season.days) {
            parts.season = season.id
            break
          }
          dayOfYear -= season.days
        }
      }
      return { ...parts, ...divisionParts(divisions, minuteOfDay, minutesPerDay) }
    },
    at(day, clock) {
      const minutes = typeof clock === 'number' ? clock : parseClock(clock)
      return (day - 1) * minutesPerDay + minutes
    },
  }
}

/** The usual default: 24 h days, 4 h watches, four 90-day seasons starting in spring. */
export const defaultCalendar = simpleCalendar({
  watchHours: 4,
  seasons: [
    { id: 'spring', days: 90 },
    { id: 'summer', days: 90 },
    { id: 'autumn', days: 90 },
    { id: 'winter', days: 90 },
  ],
})

/** What a moment is in a calendar's divisions, as `TimeParts` says it (none: nothing). */
export function divisionParts(
  divisions: readonly Division[],
  minuteOfDay: number,
  minutesPerDay: number,
): Pick<TimeParts, 'watch' | 'divisions' | 'tags'> {
  if (!divisions.length) return {}
  const { values, tags } = divisionValues(divisions, minuteOfDay, minutesPerDay)
  return {
    ...(values.watch !== undefined && { watch: values.watch }),
    divisions: values,
    tags,
  }
}

/**
 * The next moment (after `time`) a part begins: `<division>.<part>` (`meal.luncheon`), or
 * any part of a division (`watch`). Undefined: the calendar has no such part.
 */
export function nextPartStart(
  calendar: Calendar,
  time: GameTime,
  ref: string,
): GameTime | undefined {
  const divisions = calendar.divisions ?? []
  const found = findPart(divisions, ref)
  const starts = found
    ? [found.part.from]
    : (divisions.find((d) => d.id === ref)?.parts.map((p) => p.from) ?? [])
  if (!starts.length) return undefined
  return Math.min(...starts.map((from) => nextAt(calendar, time + 1, from)))
}

/** "06:30" → 390 minutes. */
export function parseClock(clock: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim())
  if (!match) throw new Error(`Invalid clock "${clock}" (expected HH:MM)`)
  return Number(match[1]) * MINUTES_PER_HOUR + Number(match[2])
}

/** The next absolute time (>= `time`) at which the clock reads `clock`. */
export function nextAt(calendar: Calendar, time: GameTime, clock: string | number): GameTime {
  const { day } = calendar.describe(time)
  const today = calendar.at(day, clock)
  return today >= time ? today : calendar.at(day + 1, clock)
}

/** "Day 43, 09:05" style label in a language-neutral form; UIs translate the words. */
export function formatClock(parts: Pick<TimeParts, 'hour' | 'minute'>): string {
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}
export * from './calendar'
export * from './divisions'
import { divisionValues, findPart, readDivisions, type Division } from './divisions'

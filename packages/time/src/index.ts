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
  /** 1-based watch of the day, when the calendar defines watches. */
  watch?: number
}

export interface Calendar {
  readonly minutesPerDay: number
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
  const watchMinutes = options.watchHours ? options.watchHours * MINUTES_PER_HOUR : undefined
  return {
    minutesPerDay,
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
      if (watchMinutes) parts.watch = Math.floor(minuteOfDay / watchMinutes) + 1
      return parts
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

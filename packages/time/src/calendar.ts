import { MINUTES_PER_HOUR, parseClock, type Calendar, type GameTime, type TimeParts } from './index'

/** Text in one or several languages: "Thaw" or { en: Thaw, es: Deshielo }. */
export type CalendarText = string | Record<string, string>

/**
 * A calendar as data (`kind: calendar` in a pack): months with their seasons, weekdays,
 * moons and holidays. Game time stays an absolute number of minutes; the calendar only
 * names it, so changing calendars never breaks saved data.
 */
export interface CalendarDef {
  id?: string
  name?: CalendarText
  hoursPerDay?: number
  /** Watch length in hours (4 → six watches a day). */
  watchHours?: number
  /** The months of a year, in order; each may say its season (spring…). */
  months: { id: string; name?: CalendarText; days: number; season?: string }[]
  weekdays?: { id: string; name?: CalendarText }[]
  /** Moons: a cycle in days; `offset` is the day of the cycle on day 1. */
  moons?: { id: string; name?: CalendarText; cycle: number; offset?: number }[]
  /** Fixed days of the year. */
  holidays?: { id: string; name?: CalendarText; month: string; day: number }[]
  /** The year of day 1 (default 1). */
  startYear?: number
  /** Month and day of day 1 (default the first day of the first month). */
  start?: { month: string; day?: number }
  /** When the day starts and night falls, for "until dawn" / "until nightfall". */
  dawn?: string
  dusk?: string
}

export type MoonPhase = 'new' | 'waxing' | 'full' | 'waning'

/** What a calendar of data says about a moment, on top of the day and hour. */
export interface CalendarParts extends TimeParts {
  year: number
  /** The month, and the day in it (1-based). */
  month: { id: string; name?: CalendarText; day: number }
  weekday?: { id: string; name?: CalendarText }
  moons: { id: string; name?: CalendarText; phase: MoonPhase }[]
  holidays: { id: string; name?: CalendarText }[]
}

export interface DataCalendar extends Calendar {
  readonly def: CalendarDef
  describe(time: GameTime): CalendarParts
  /** Days in a year. */
  readonly yearDays: number
  /**
   * The game day (1-based) of a date of the calendar: a year, a month's id and its day.
   * Undefined for a month it doesn't have, a day the month doesn't have, or a date
   * before day 1.
   */
  dayOf(date: { year: number; month: string; day: number }): number | undefined
}

/** Readable problems of a calendar definition (empty: valid). */
export function validateCalendar(raw: unknown): string[] {
  const errors: string[] = []
  const def = raw as Partial<CalendarDef> | null
  if (typeof def !== 'object' || def === null) return ['calendar: must be a map']
  if (!Array.isArray(def.months) || def.months.length === 0)
    errors.push('months: needs at least one month')
  const months = new Set<string>()
  for (const [i, m] of (def.months ?? []).entries()) {
    if (typeof m?.id !== 'string' || !m.id) errors.push(`months[${i}].id: needed`)
    else if (months.has(m.id)) errors.push(`months[${i}].id: "${m.id}" is repeated`)
    else months.add(m.id)
    if (!Number.isInteger(m?.days) || m.days < 1) errors.push(`months[${i}].days: a whole number`)
  }
  for (const [i, h] of (def.holidays ?? []).entries())
    if (!months.has(h?.month)) errors.push(`holidays[${i}].month: no month "${h?.month}"`)
  for (const [i, moon] of (def.moons ?? []).entries())
    if (!(typeof moon?.cycle === 'number' && moon.cycle > 0))
      errors.push(`moons[${i}].cycle: a number of days`)
  if (def.start && !months.has(def.start.month))
    errors.push(`start.month: no month "${def.start.month}"`)
  for (const key of ['dawn', 'dusk'] as const)
    if (def[key] !== undefined && !/^\d{1,2}:\d{2}$/.test(String(def[key])))
      errors.push(`${key}: times look like "06:00"`)
  return errors
}

/** A Calendar from its data (validate it first: broken parts are skipped). */
export function calendarFrom(def: CalendarDef): DataCalendar {
  const minutesPerDay = (def.hoursPerDay ?? 24) * MINUTES_PER_HOUR
  const months = def.months
  const yearDays = months.reduce((sum, m) => sum + m.days, 0)
  const monthStart = (id: string) => {
    let day = 0
    for (const m of months) {
      if (m.id === id) return day
      day += m.days
    }
    return 0
  }
  // Day of the year (0-based) of day 1.
  const startOfYear = def.start ? monthStart(def.start.month) + (def.start.day ?? 1) - 1 : 0
  const watchMinutes = def.watchHours ? def.watchHours * MINUTES_PER_HOUR : undefined

  const describe = (time: GameTime): CalendarParts => {
    const t = Math.max(0, Math.floor(time))
    const dayIndex = Math.floor(t / minutesPerDay)
    const minuteOfDay = t - dayIndex * minutesPerDay
    const absolute = startOfYear + dayIndex
    const year = (def.startYear ?? 1) + Math.floor(absolute / yearDays)
    let dayOfYear = absolute % yearDays
    let month = months[0]
    for (const m of months) {
      if (dayOfYear < m.days) {
        month = m
        break
      }
      dayOfYear -= m.days
    }
    const monthDay = dayOfYear + 1
    return {
      day: dayIndex + 1,
      hour: Math.floor(minuteOfDay / MINUTES_PER_HOUR),
      minute: minuteOfDay % MINUTES_PER_HOUR,
      minuteOfDay,
      ...(month.season && { season: month.season }),
      ...(watchMinutes && { watch: Math.floor(minuteOfDay / watchMinutes) + 1 }),
      year,
      month: { id: month.id, ...(month.name && { name: month.name }), day: monthDay },
      ...(def.weekdays?.length && { weekday: def.weekdays[dayIndex % def.weekdays.length] }),
      moons: (def.moons ?? []).map((moon) => ({
        id: moon.id,
        ...(moon.name && { name: moon.name }),
        phase: moonPhase(dayIndex + (moon.offset ?? 0), moon.cycle),
      })),
      holidays: (def.holidays ?? [])
        .filter((h) => h.month === month.id && h.day === monthDay)
        .map((h) => ({ id: h.id, ...(h.name && { name: h.name }) })),
    }
  }

  const dayOf = (date: { year: number; month: string; day: number }): number | undefined => {
    const month = months.find((m) => m.id === date.month)
    if (!month || !Number.isInteger(date.day) || date.day < 1 || date.day > month.days)
      return undefined
    const absolute =
      (date.year - (def.startYear ?? 1)) * yearDays + monthStart(month.id) + date.day - 1
    const day = absolute - startOfYear + 1
    return Number.isInteger(day) && day >= 1 ? day : undefined
  }

  return {
    def,
    minutesPerDay,
    yearDays,
    describe,
    dayOf,
    at(day, clock) {
      const minutes = typeof clock === 'number' ? clock : parseClock(clock)
      return (day - 1) * minutesPerDay + minutes
    },
  }
}

/** The phase of a moon on a day of its cycle: new and full last a few days each. */
export function moonPhase(day: number, cycle: number): MoonPhase {
  const at = (((day % cycle) + cycle) % cycle) / cycle
  if (at < 0.125 || at >= 0.875) return 'new'
  if (at < 0.375) return 'waxing'
  if (at < 0.625) return 'full'
  return 'waning'
}

/** The first day (1-based, within the first year from day 1) that falls in a season. */
export function seasonStartDay(calendar: Calendar, season: string, maxDays = 1000): number {
  for (let day = 1; day <= maxDays; day++) {
    const parts = calendar.describe(calendar.at(day, 0))
    if (parts.season === season) return day
  }
  return 1
}

/** Seasons a calendar has, in the order they come. */
export function seasonsOf(calendar: Calendar, maxDays = 1000): string[] {
  const out: string[] = []
  for (let day = 1; day <= maxDays; day++) {
    const season = calendar.describe(calendar.at(day, 0)).season
    if (season && !out.includes(season)) out.push(season)
  }
  return out
}

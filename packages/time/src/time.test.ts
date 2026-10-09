import { describe, expect, it } from 'vitest'
import { defaultCalendar, formatClock, nextAt, parseClock, simpleCalendar } from './index'
import { calendarFrom, moonPhase, seasonStartDay, seasonsOf, validateCalendar } from './calendar'

describe('calendar', () => {
  it('describes absolute minutes as day, hour, watch and season', () => {
    const t = defaultCalendar.at(43, '09:05')
    expect(defaultCalendar.describe(t)).toEqual({
      day: 43,
      hour: 9,
      minute: 5,
      minuteOfDay: 545,
      season: 'spring',
      watch: 3,
    })
    expect(defaultCalendar.describe(defaultCalendar.at(91, '00:00')).season).toBe('summer')
    expect(defaultCalendar.describe(defaultCalendar.at(361, '12:00')).season).toBe('spring')
  })

  it('supports custom calendars', () => {
    const cal = simpleCalendar({
      hoursPerDay: 20,
      seasons: [
        { id: 'dry', days: 3 },
        { id: 'wet', days: 2 },
      ],
      startDayOfYear: 3,
    })
    expect(cal.minutesPerDay).toBe(1200)
    expect(cal.describe(0).season).toBe('wet')
    expect(cal.describe(cal.at(3, '00:00')).season).toBe('dry')
    expect(cal.describe(cal.at(2, '19:59'))).toMatchObject({ day: 2, hour: 19 })
  })

  it('finds the next time a clock time comes around', () => {
    const morning = defaultCalendar.at(2, '06:00')
    expect(nextAt(defaultCalendar, defaultCalendar.at(2, '05:00'), '06:00')).toBe(morning)
    expect(nextAt(defaultCalendar, morning, '06:00')).toBe(morning)
    expect(nextAt(defaultCalendar, defaultCalendar.at(2, '07:00'), '06:00')).toBe(
      defaultCalendar.at(3, '06:00'),
    )
  })

  it('parses and formats clock times', () => {
    expect(parseClock('6:30')).toBe(390)
    expect(() => parseClock('noon')).toThrow()
    expect(formatClock({ hour: 9, minute: 5 })).toBe('09:05')
  })
})

describe('calendars as data', () => {
  const def = {
    months: [
      { id: 'thaw', days: 3, season: 'spring', name: { en: 'Thaw', es: 'Deshielo' } },
      { id: 'sun', days: 2, season: 'summer' },
      { id: 'frost', days: 2, season: 'winter' },
    ],
    weekdays: [{ id: 'one' }, { id: 'two' }],
    moons: [{ id: 'pale', cycle: 4 }],
    holidays: [{ id: 'feast', month: 'sun', day: 2 }],
    startYear: 300,
    start: { month: 'thaw', day: 2 },
    watchHours: 6,
  }

  it('find the game day of a date, and none for dates they don’t have', () => {
    const cal = calendarFrom(def)
    // Day 1 is the 2nd of Thaw, 300.
    expect(cal.dayOf({ year: 300, month: 'thaw', day: 2 })).toBe(1)
    expect(cal.dayOf({ year: 300, month: 'sun', day: 2 })).toBe(4)
    expect(cal.dayOf({ year: 301, month: 'thaw', day: 1 })).toBe(7)
    for (let day = 1; day <= 20; day++) {
      const p = cal.describe(cal.at(day, 0))
      expect(cal.dayOf({ year: p.year, month: p.month.id, day: p.month.day })).toBe(day)
    }
    expect(cal.dayOf({ year: 300, month: 'thaw', day: 1 })).toBeUndefined()
    expect(cal.dayOf({ year: 300, month: 'sun', day: 3 })).toBeUndefined()
    expect(cal.dayOf({ year: 300, month: 'nope', day: 1 })).toBeUndefined()
  })

  it('name every day: year, month, weekday, moons, holidays and season', () => {
    expect(validateCalendar(def)).toEqual([])
    const cal = calendarFrom(def)
    expect(cal.yearDays).toBe(7)
    const first = cal.describe(cal.at(1, '13:00'))
    expect(first).toMatchObject({
      day: 1,
      year: 300,
      month: { id: 'thaw', day: 2, name: { en: 'Thaw', es: 'Deshielo' } },
      weekday: { id: 'one' },
      season: 'spring',
      watch: 3,
      holidays: [],
    })
    // Day 4 is the 2nd of Sun: the feast.
    expect(cal.describe(cal.at(4, 0))).toMatchObject({
      month: { id: 'sun', day: 2 },
      holidays: [{ id: 'feast' }],
    })
    // Day 7 starts the next year.
    expect(cal.describe(cal.at(7, 0))).toMatchObject({ year: 301, month: { id: 'thaw', day: 1 } })
    expect(seasonStartDay(cal, 'winter')).toBe(5)
    expect(seasonsOf(cal)).toEqual(['spring', 'summer', 'winter'])
  })

  it('moons go through their phases', () => {
    expect([0, 1, 2, 3].map((d) => moonPhase(d, 4))).toEqual(['new', 'waxing', 'full', 'waning'])
    expect(moonPhase(-1, 4)).toBe('waning')
  })

  it('reports broken definitions', () => {
    expect(validateCalendar({ months: [] })).toEqual(['months: needs at least one month'])
    expect(
      validateCalendar({
        months: [{ id: 'a', days: 0 }],
        holidays: [{ id: 'h', month: 'b', day: 1 }],
        dawn: 'early',
      }),
    ).toEqual([
      'months[0].days: a whole number',
      'holidays[0].month: no month "b"',
      'dawn: times look like "06:00"',
    ])
  })
})

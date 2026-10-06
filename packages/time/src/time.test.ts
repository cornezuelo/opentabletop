import { describe, expect, it } from 'vitest'
import { defaultCalendar, formatClock, nextAt, parseClock, simpleCalendar } from './index'

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

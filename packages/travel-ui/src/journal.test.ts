import type { JournalEntry } from '@open-tabletop/session'
import { defaultCalendar } from '@open-tabletop/time'
import { describe, expect, it } from 'vitest'
import { translator } from './i18n'
import { journalMarkdown } from './journal'

const at = (day: number, clock: string) => defaultCalendar.at(day, clock)
const entry = (time: number, code: string, rest: Partial<JournalEntry> = {}): JournalEntry => ({
  id: `j${time}`,
  time,
  at: '',
  source: 'travel',
  code,
  ...rest,
})

describe('journal export', () => {
  it('writes Markdown by day, oldest first, with the host’s names', () => {
    const journal = [
      entry(at(1, '06:00'), 'HEX_ENTERED', { data: { hex: '3' } }),
      entry(at(1, '07:30'), 'ORACLE_RESULT', {
        source: 'oracle',
        text: 'Rain\nall day',
        data: { event: 'WEATHER_CHECK_REQUIRED' },
      }),
      entry(at(2, '06:00'), 'DAY_STARTED', { data: { day: 2 } }),
      entry(at(2, '09:00'), 'NOTE', { source: 'user', text: 'We camp by the well' }),
    ]
    const markdown = journalMarkdown(
      journal,
      { t: translator(() => 'en'), startDay: 1, hexLabel: (h) => `Hex ${h}`, nameOf: (id) => id },
      'The Grey Marches',
    )
    expect(markdown).toBe(
      [
        '# The Grey Marches',
        '',
        '## Day 1',
        '',
        '- **06:00** Entered Hex 3',
        '- **07:30** Weather: Rain all day',
        '',
        '## Day 2',
        '',
        '- **09:00** _We camp by the well_',
        '',
      ].join('\n'),
    )
  })

  it('names checks as the system does', () => {
    const t = translator(() => 'en')
    const pending = entry(at(1, '06:00'), 'CHECK_PENDING', { data: { event: 'X_REQUIRED' } })
    const context = { t, startDay: 1, hexLabel: (h: string) => h, nameOf: (id: string) => id }
    expect(journalMarkdown([pending], context, 'T')).toContain('X REQUIRED: waiting for you')
    expect(journalMarkdown([pending], { ...context, checkName: () => 'Landmark' }, 'T')).toContain(
      'Landmark: waiting for you',
    )
  })
})

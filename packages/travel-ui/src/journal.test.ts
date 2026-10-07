import type { JournalEntry } from '@open-tabletop/session'
import { defaultCalendar } from '@open-tabletop/time'
import { describe, expect, it } from 'vitest'
import { translator } from './i18n'
import { entryText, journalMarkdown, type JournalContext } from './journal'

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

describe('journal lines', () => {
  const t = translator(() => 'en')
  const context = {
    t,
    startDay: 1,
    hexLabel: (h: string) => `Hex ${h}`,
    nameOf: (id: string) => id,
    actionName: () => 'Forage for food',
    valueName: (key: string) => ({ food: 'Food', morale: 'Morale' })[key] ?? key,
    terrainName: (id: string) => ({ hills: 'Hills' })[id] ?? id,
  }
  const line = (code: string, data: Record<string, unknown>, more: Partial<JournalContext> = {}) =>
    entryText(entry(at(1, '06:00'), code, { data }), { ...context, ...more })

  it('say what results changed', () => {
    const result = entry(at(1, '09:00'), 'ORACLE_RESULT', {
      text: 'Berries and roots',
      data: {
        event: 'FORAGE_CHECK_REQUIRED',
        value: { resources: { food: 1 }, stats: { morale: -1 }, lost: true, weather: 'rain' },
      },
    })
    expect(entryText(result, { ...context, checkName: () => 'Foraging' })).toBe(
      'Foraging: Berries and roots (Food +1, Morale −1, lost for today)',
    )
  })

  it('say when an action rolled nothing, in the system’s words or the generic ones', () => {
    const taken = { action: 'forage', minutes: 180, checks: 0, hex: '4', terrain: 'hills' }
    expect(line('ACTION_TAKEN', taken)).toBe(
      'Forage for food (3 h): none of its rolls apply on Hills, so nothing happens',
    )
    expect(
      line('ACTION_TAKEN', taken, { actionNothing: () => 'nothing to forage on {terrain}' }),
    ).toBe('Forage for food (3 h): nothing to forage on Hills')
    // An action without checks has nothing to say; one whose check came up neither.
    expect(line('ACTION_TAKEN', taken, { actionNothing: () => '' })).toBe('Forage for food (3 h)')
    expect(line('ACTION_TAKEN', { ...taken, checks: 1 })).toBe('Forage for food (3 h)')
  })

  it('tell supplies eaten, rests and fatigue with its reason', () => {
    expect(line('SUPPLIES_USED', { used: { food: 1 }, left: { food: 4 } })).toBe(
      'Supplies for the day: Food −1 (4 left)',
    )
    expect(line('LIMIT_REACHED', { path: 'party.resources.food', limit: 'min', value: 0 })).toBe(
      'Food can’t go lower than 0',
    )
    expect(line('LIMIT_REACHED', { path: 'party.stats.morale', limit: 'max', value: 5 })).toBe(
      'Morale can’t go higher than 5',
    )
    expect(line('RESTED', { minutes: 90 })).toBe('Rest for 1 h 30')
    expect(line('FATIGUE_CHANGED', { change: 1, fatigue: 2, reason: 'hunger' })).toBe(
      'Not enough to eat: fatigue +1 (now 2)',
    )
    expect(line('FATIGUE_CHANGED', { change: -1, fatigue: 0, reason: 'action', action: 'x' })).toBe(
      'Forage for food: fatigue −1 (now 0)',
    )
  })
})

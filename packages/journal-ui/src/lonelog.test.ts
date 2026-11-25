import { describe, expect, it } from 'vitest'
import {
  addMoments,
  addNote,
  campaignLog,
  emptyJournal,
  startSession,
  type ToldMoment,
} from '@open-tabletop/journal'
import type { HistoryItem, Resolution } from '@open-tabletop/oracle-engine'
import type { JournalEntry } from '@open-tabletop/session'
import { defaultCalendar } from '@open-tabletop/time'
import { logLonelog } from './lonelog'
import { shownLog, type LogWords } from './log'

const DAY = defaultCalendar.minutesPerDay
const AT = '2026-11-18T10:00:00.000Z'
const entry = (n: number, code: string, more: Partial<JournalEntry> = {}): JournalEntry => ({
  id: `j${n}`,
  time: DAY + 480,
  at: AT,
  source: 'travel',
  code,
  beat: 1,
  ...more,
})
const die = (expression: string, total: number) => ({ expression, total, terms: [] })
const words: LogWords = { locale: 'en', calendar: defaultCalendar, nameOf: () => 'Weather' }

/** A march: an action taken, a scouting roll against 3 and an encounter table, a ration eaten. */
const march: JournalEntry[] = [
  entry(1, 'ACTION_TAKEN', { data: { action: 'march', minutes: 480 } }),
  entry(2, 'ROLLED', {
    data: {
      check: 'scout',
      rolls: [
        {
          source: 'gm/scout',
          depth: 0,
          dice: [],
          against: { op: 'lte', target: 3, total: 2, success: true, margin: 1 },
        },
      ],
    },
  }),
  entry(3, 'ORACLE_RESULT', { text: 'The way is clear', data: { event: 'scout' } }),
  entry(4, 'ROLLED', {
    data: { check: 'encounter', rolls: [{ source: 'gm/enc', depth: 0, dice: [] }] },
  }),
  entry(5, 'ORACLE_RESULT', { text: 'Wolves, 4 of them', data: { event: 'encounter' } }),
  entry(6, 'CHECK_SKIPPED', { data: { check: 'toll' } }),
]
const told: ToldMoment = {
  title: 'March · 8 h',
  lines: [
    {
      id: 'j3',
      text: 'Scouting: The way is clear',
      notable: false,
      level: 'story',
      dice: [die('1d6', 2)],
    },
    {
      id: 'j5',
      text: 'Encounter: Wolves, 4 of them',
      notable: true,
      level: 'story',
      dice: [die('1d6', 6), { ...die('1d4', 4), inside: true }],
    },
    { id: 'j6', text: 'The toll didn’t come up', notable: false, level: 'detail' },
  ],
  changes: ['Rations −1'],
  notable: true,
}
const resolution = { rolls: [die('2d6', 9)], text: 'Rain\nall day', source: 'gm/weather' }
const handRoll: HistoryItem = {
  id: 1,
  at: '2026-11-18T10:30:00.000Z',
  source: 'gm/weather',
  resolution: resolution as unknown as Resolution,
}

function exported(level: 'story' | 'detail') {
  let journal = startSession(emptyJournal('c1'), DAY, '2026-11-18T09:00:00.000Z')
  journal = addMoments(journal, { app: 'travel', id: 't1', name: 'Company' }, march, [
    { entries: march, told: { en: told } },
  ])
  journal = addNote(journal, {
    time: DAY + 600,
    at: '2026-11-18T11:00:00.000Z',
    text: 'Tobin **lied**',
  })
  const log = campaignLog(
    journal,
    [
      { id: 'w1', time: DAY + 30, code: 'EVENT', text: 'Market day' },
      {
        id: 'w2',
        time: DAY + 700,
        code: 'CLOCK',
        text: 'The Wyrm wakes',
        data: { clock: 'wyrm', filled: 3, segments: 6 },
      },
    ],
    [handRoll],
  )
  return logLonelog(shownLog(log, { level }, words), 'The Marches', words, level)
}

describe('the campaign’s log in Lonelog', () => {
  it('writes sessions, days as scenes, and each moment in its notation', () => {
    const text = exported('detail')
    expect(text).toMatch(/^---\ntitle: "The Marches"\n---\n\n# The Marches\n/)
    expect(text).toContain('## Session 1\n*Date: 2026-11-18*')
    expect(text).toContain('### S1 *Day 2*')
    expect(text).toContain(
      [
        '```',
        '=> Market day',
        '@ March · 8 h',
        'd: Scouting 1d6=2 ≤ 3 -> Success',
        '=> The way is clear',
        'tbl: Encounter 1d6=6 -> Wolves, 4 of them (1d4=4)',
        '(note: The toll didn’t come up)',
        '=> Rations −1',
        'tbl: Weather 2d6=9 -> Rain all day',
        '```',
        '',
        'Tobin **lied**',
        '',
        '```',
        '[Clock:The Wyrm wakes 3/6]',
        '```',
      ].join('\n'),
    )
  })

  it('leaves what happened behind out of the story', () => {
    const text = exported('story')
    expect(text).not.toContain('toll')
    expect(text).toContain('tbl: Encounter 1d6=6')
  })
})

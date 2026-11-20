import { describe, expect, it } from 'vitest'
import {
  addMoments,
  addNote,
  campaignLog,
  emptyJournal,
  startSession,
  type ToldMoment,
} from '@open-tabletop/journal'
import type { JournalEntry } from '@open-tabletop/session'
import { defaultCalendar } from '@open-tabletop/time'
import { logMarkdown, logPlaces, shownLog, type LogWords } from './log'

const DAY = defaultCalendar.minutesPerDay
const line = (n: number, time: number, at: string): JournalEntry => ({
  id: `j${n}`,
  time,
  at,
  source: 'travel',
  code: 'SAID',
  beat: n,
})
const told = (title: string, text: string): Record<string, ToldMoment> => ({
  en: {
    title,
    lines: [
      { id: 'a', text, notable: false, level: 'story' },
      { id: 'b', text: 'Navigation rolled: 2d6 → 7', notable: false, level: 'detail' },
    ],
    changes: ['Rations −1'],
    notable: false,
  },
})
const words: LogWords = { locale: 'en', calendar: defaultCalendar, nameOf: (id) => `Table ${id}` }

/** Two sessions: a march on day 1 (Travel), a fight on day 2 (a scene), a note and the world. */
function played() {
  const march = [line(1, DAY + 480, '2026-11-18T10:00')]
  const fight = [line(1, 2 * DAY + 600, '2026-11-20T10:00')]
  let journal = startSession(emptyJournal('c1'), DAY, '2026-11-18T09:00')
  journal = addMoments(journal, { app: 'travel', id: 't1', name: 'The Grey Company' }, march, [
    { entries: march, told: told('March · 8 h', 'A wolf howls') },
  ])
  journal = startSession(journal, 2 * DAY, '2026-11-20T09:00')
  journal = addMoments(journal, { app: 'scene', id: 's1', name: 'At the ford' }, fight, [
    { entries: fight, told: told('Fight', 'The troll falls') },
  ])
  journal = addNote(journal, { time: 2 * DAY + 700, at: '2026-11-20T11:00', text: 'Tobin lied' })
  return campaignLog(journal, [{ id: 'w1', time: DAY + 30, code: 'EVENT', text: 'Market day' }])
}

describe('the campaign’s log as shown', () => {
  it('shows sessions, days and lines newest first', () => {
    const shown = shownLog(played(), { level: 'story' }, words)
    expect(shown.map((s) => s.number)).toEqual([2, 1])
    expect(shown[0]!.days[0]!.lines.map((l) => l.kind)).toEqual(['note', 'moment'])
    expect(shown[1]!.days[0]!.lines.map((l) => l.kind)).toEqual(['moment', 'world'])
    expect(shown[1]!.days[0]!.text).toBe('Day 2')
  })

  it('filters by where a moment was played and by words, at the level shown', () => {
    const log = played()
    expect(logPlaces(log).map((p) => p.name)).toEqual(['At the ford', 'The Grey Company'])
    const ford = shownLog(log, { level: 'story', from: 'scene:s1' }, words)
    expect(ford.flatMap((s) => s.days.flatMap((d) => d.lines)).map((l) => l.kind)).toEqual([
      'moment',
    ])
    // The dice are told only at the whole detail: a search for them finds nothing below it.
    expect(shownLog(log, { level: 'story', search: 'navigation' }, words)).toEqual([])
    expect(shownLog(log, { level: 'detail', search: 'navigation' }, words)).toHaveLength(2)
    expect(shownLog(log, { level: 'story', search: 'TOBIN' }, words)[0]!.days).toHaveLength(1)
  })

  it('leaves out of the story a moment that only told what happened behind', () => {
    const behind: JournalEntry[] = [
      { ...line(2, DAY + 600, '2026-11-18T11:00'), code: 'CHECK_SKIPPED' },
    ]
    const log = campaignLog(
      addMoments(emptyJournal('c1'), { app: 'travel', id: 't1', name: 'T' }, behind, [
        { entries: behind, told: told('Toll doesn’t come up', '') },
      ]),
    )
    expect(shownLog(log, { level: 'story' }, words)).toEqual([])
    expect(shownLog(log, { level: 'detail' }, words)[0]!.days).toHaveLength(1)
  })

  it('exports as Markdown, oldest first, sessions and days as headings', () => {
    const markdown = logMarkdown(
      shownLog(played(), { level: 'story' }, words),
      'The Marches',
      words,
      'story',
    )
    expect(markdown).toMatch(/^# The Marches\n/)
    const at = (text: string) => markdown.indexOf(text)
    expect(at('## Session 1')).toBeLessThan(at('## Session 2'))
    expect(markdown).toContain('### Day 2')
    expect(markdown).toContain('- **00:30** The world: Market day')
    expect(markdown).toContain('- **08:00** March · 8 h\n  - A wolf howls\n  - _Rations −1_')
    expect(markdown).toContain('_Tobin lied_')
    expect(markdown).not.toContain('Navigation rolled')
  })
})

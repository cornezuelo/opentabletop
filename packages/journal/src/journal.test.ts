import { describe, expect, it } from 'vitest'
import type { JournalEntry } from '@open-tabletop/session'
import {
  addMoments,
  addNote,
  campaignLog,
  editNote,
  emptyJournal,
  endSession,
  linesToCopy,
  openSession,
  readJournal,
  removeItem,
  startSession,
  toldAt,
  toldIn,
  type ToldMoment,
} from './journal'

const line = (n: number, time: number, at: string, code = 'DAY_STARTED'): JournalEntry => ({
  id: `j${n}`,
  time,
  at,
  source: 'travel',
  code,
})

const told = (title: string): Record<string, ToldMoment> => ({
  en: {
    title,
    lines: [
      { id: 'j1', text: 'A wolf howls', notable: false, level: 'story' },
      { id: 'j2', text: 'Navigation: 4', notable: false, level: 'mechanics' },
      { id: 'j3', text: 'Rations 3 → 2', notable: false, level: 'detail' },
      { id: 'j4', text: 'Ambush!', notable: true, level: 'detail' },
    ],
    changes: ['Rations −1'],
    notable: true,
  },
  es: { title: `${title} (es)`, lines: [], changes: [], notable: false },
})

const trip = { app: 'travel', id: 't1', name: 'The Grey Company' }

describe('the campaign journal', () => {
  it('copies a trip’s moments once, from the last line copied on', () => {
    const lines = [line(1, 100, '2026-11-20T10:00'), line(2, 160, '2026-11-20T10:01')]
    let journal = emptyJournal('c1')
    expect(linesToCopy(journal, lines)).toHaveLength(2)
    journal = addMoments(journal, trip, lines, [{ entries: lines, told: told('March') }])
    expect(journal.items).toHaveLength(1)
    expect(journal.items[0]).toMatchObject({ kind: 'moment', time: 160, from: trip })
    expect(linesToCopy(journal, lines)).toEqual([])
    const more = [...lines, line(3, 200, '2026-11-20T10:05')]
    expect(linesToCopy(journal, more).map((e) => e.id)).toEqual(['j3'])
  })

  it('copies a new trip from its first line, and a trip gone on in another map from where it was', () => {
    const lines = [line(1, 100, '2026-11-20T10:00'), line(2, 160, '2026-11-20T10:01')]
    const journal = addMoments(emptyJournal('c1'), trip, lines, [])
    const again = [line(1, 500, '2026-11-21T09:00')]
    expect(linesToCopy(journal, again)).toHaveLength(1)
    const below = [...lines, line(3, 200, '2026-11-20T10:05')]
    expect(linesToCopy(journal, below).map((e) => e.id)).toEqual(['j3'])
  })

  it('starts and ends sessions, one going on at a time', () => {
    let journal = startSession(emptyJournal('c1'), 100, '2026-11-20T10:00')
    expect(openSession(journal)?.time).toBe(100)
    journal = startSession(journal, 300, '2026-11-21T10:00')
    const sessions = journal.items.filter((i) => i.kind === 'session')
    expect(sessions[0]).toMatchObject({ end: { time: 300 } })
    expect(openSession(journal)?.time).toBe(300)
    journal = endSession(journal, 400, '2026-11-21T12:00')
    expect(openSession(journal)).toBeUndefined()
  })

  it('keeps, changes and removes notes', () => {
    let journal = addNote(emptyJournal('c1'), { time: 50, at: 'a', text: 'Tobin lies' })
    const id = journal.items[0]!.id
    journal = editNote(journal, id, 'Tobin lies about the ford', 'b')
    expect(journal.items[0]).toMatchObject({ text: 'Tobin lies about the ford', edited: 'b' })
    expect(removeItem(journal, id).items).toEqual([])
  })

  it('reads back what it wrote, and refuses what isn’t one', () => {
    const journal = addNote(startSession(emptyJournal('c1'), 0, 'a'), {
      time: 1,
      at: 'b',
      text: 'x',
    })
    expect(readJournal(JSON.stringify(journal))).toEqual(journal)
    expect(readJournal('{"format":99,"campaign":"c1"}')).toBeUndefined()
    expect(readJournal('nope')).toBeUndefined()
  })

  it('tells a moment at a level as a trip’s journal does', () => {
    const moment = told('March').en!
    expect(toldAt(moment, 'story').lines.map((l) => l.text)).toEqual(['A wolf howls', 'Ambush!'])
    expect(toldAt(moment, 'story').why).toEqual(['Navigation: 4'])
    expect(toldAt(moment, 'mechanics').lines).toHaveLength(3)
    expect(toldAt(moment, 'detail').lines).toHaveLength(4)
  })

  it('tells a moment in the UI’s language, else in English', () => {
    const lines = [line(1, 100, 'a')]
    const journal = addMoments(emptyJournal('c1'), trip, lines, [
      { entries: lines, told: told('March') },
    ])
    const moment = journal.items[0]!
    if (moment.kind !== 'moment') throw new Error('not a moment')
    expect(toldIn(moment, 'es').title).toBe('March (es)')
    expect(toldIn(moment, 'fr').title).toBe('March')
  })

  it('lays the world, hand rolls and notes among the moments by game time, by session', () => {
    const lines = [line(1, 100, '2026-11-20T10:00'), line(2, 160, '2026-11-20T10:02')]
    let journal = startSession(emptyJournal('c1'), 90, '2026-11-20T09:59')
    journal = addMoments(journal, trip, lines, [{ entries: lines, told: told('March') }])
    journal = startSession(journal, 400, '2026-11-21T10:00')
    journal = addNote(journal, { time: 420, at: '2026-11-21T10:30', text: 'A note' })
    const log = campaignLog(
      journal,
      [
        { id: 'w1', time: 10, code: 'EVENT', text: 'Market day' },
        { id: 'w2', time: 130, code: 'CLOCK', text: 'The Wyrm wakes 3/6' },
      ],
      [
        {
          id: 1,
          at: '2026-11-20T10:03',
          source: 'core/yes-no',
          resolution: { source: 'core/yes-no', kind: 'table', value: {}, rolls: [], children: [] },
        },
      ] as never,
    )
    expect(log.map((s) => s.number)).toEqual([undefined, 1, 2])
    expect(log[0]!.lines.map((l) => l.kind)).toEqual(['world'])
    // The hand roll was made after the march: laid at the march's end.
    expect(log[1]!.lines.map((l) => l.kind)).toEqual(['world', 'moment', 'oracle'])
    expect(log[1]!.lines[2]!.time).toBe(160)
    expect(log[2]!.lines.map((l) => l.kind)).toEqual(['note'])
  })
})

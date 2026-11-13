import type { JournalEntry, SessionState } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { journalBeats, lastNotableBeat, tellBeat } from './beats'
import { translator } from './i18n'
import type { JournalContext } from './journal'

const context: JournalContext = {
  t: translator(() => 'en'),
  startDay: 1,
  hexLabel: (hex) => hex,
  nameOf: (id) => id,
  actionName: (id) => (id === 'march' ? 'March' : id),
  memberName: (path) => (path === 'party.items.ration' ? 'Ration' : undefined),
  checkName: (event) => ({ TOLL: 'Toll', OMENS: 'Omens' })[event],
}
const line = (n: number, code: string, rest: Partial<JournalEntry> = {}): JournalEntry => ({
  id: `j${n}`,
  time: n,
  at: '',
  source: 'travel',
  code,
  beat: 1,
  ...rest,
})
/** A march: the toll at a bridge (its changes), the cells entered, a check that didn't come up. */
const march = [
  line(1, 'ACTION_TAKEN', { data: { action: 'march', minutes: 480, checks: 1 } }),
  line(2, 'PLACE_ENTERED', { data: { place: '0102', terrain: 'plains' } }),
  line(3, 'ORACLE_RESULT', {
    source: 'oracle',
    text: 'The bridge keeper asks a toll',
    data: { event: 'TOLL', value: { effects: { 'party.items.ration': -1 } } },
  }),
  line(4, 'CHANGED', { data: { path: 'party.items.ration', from: 6, to: 5 } }),
  line(5, 'CHECK_SKIPPED', { data: { check: 'AMBUSH', condition: 'when', failed: [] } }),
]

describe('moments of play told (beats)', () => {
  it('a step: what was done as its title, the story under it, its changes apart, the rules folded', () => {
    const told = tellBeat({ id: 'j1', entries: march }, context, 'story')
    expect(told.title).toBe('March · 8 h')
    expect(told.lines.map((l) => l.text)).toEqual(['Toll: The bridge keeper asks a toll'])
    expect(told.changes).toEqual(['Ration −1'])
    expect(told.why).toEqual(['Entered 0102 (plains)'])
    expect(told.notable).toBe(false)
    // With the rules: the cells too, under the title; what happened behind only in everything.
    const rules = tellBeat({ id: 'j1', entries: march }, context, 'mechanics')
    expect(rules.lines).toHaveLength(2)
    expect(rules.why).toEqual([])
    expect(tellBeat({ id: 'j1', entries: march }, context, 'detail').lines).toHaveLength(4)
  })

  it('the journal as moments, newest first; a note is one of its own; a search finds a step by any line', () => {
    const note = line(6, 'NOTE', { source: 'user', text: 'Ask about the keeper', beat: undefined })
    const journal = [...march, note]
    expect(journalBeats(journal, { level: 'story' }, context).map((b) => b.id)).toEqual([
      'j6',
      'j1',
    ])
    expect(
      journalBeats(journal, { level: 'story', search: '0102' }, context).map((b) => b.id),
    ).toEqual(['j1'])
  })

  it('the important moment the last step ended on: one with a line that matters', () => {
    const session = (journal: JournalEntry[]) =>
      ({ journal, lastStep: 1 }) as unknown as SessionState
    expect(lastNotableBeat(session(march))).toBeUndefined()
    const omen = line(6, 'ORACLE_RESULT', {
      source: 'oracle',
      text: 'Scorched trees',
      data: { event: 'OMENS', value: { notable: true } },
    })
    expect(lastNotableBeat(session([...march, omen]))?.id).toBe('j1')
    expect(
      tellBeat({ id: 'j1', entries: [...march, omen] }, context, 'story').lines[1],
    ).toMatchObject({
      text: 'Omens: Scorched trees',
      notable: true,
    })
  })
})

describe('the dice of a moment', () => {
  it('a result shows the dice it was rolled with, from the roll’s line just before it', () => {
    const rolled = line(6, 'ROLLED', {
      source: 'oracle',
      data: {
        check: 'OMENS',
        rolls: [
          {
            source: 'gm/omens',
            dice: ['1d6 → 4  [4]'],
            depth: 0,
            results: [
              {
                expression: '1d6',
                total: 4,
                terms: [{ kind: 'dice', sign: 1, sides: 6, rolls: [4], kept: [0], subtotal: 4 }],
              },
            ],
          },
        ],
      },
    })
    const omen = line(7, 'ORACLE_RESULT', {
      source: 'oracle',
      text: 'Crows',
      data: { event: 'OMENS', value: {} },
    })
    const told = tellBeat({ id: 'j1', entries: [...march, rolled, omen] }, context, 'story')
    expect(told.lines.find((l) => l.id === 'j7')?.dice?.[0]?.total).toBe(4)
    // Older journals kept the dice as text only: none drawn.
    const old = {
      ...rolled,
      data: { ...rolled.data, rolls: [{ source: 'gm/omens', dice: ['1d6 → 4  [4]'], depth: 0 }] },
    }
    expect(
      tellBeat({ id: 'j1', entries: [old, omen] }, context, 'story').lines[0]?.dice,
    ).toBeUndefined()
  })
})

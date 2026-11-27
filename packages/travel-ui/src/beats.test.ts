import type { JournalEntry, SessionState } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import {
  cardsToWatch,
  journalBeats,
  lastNotableBeat,
  rollToWatch,
  tellBeat,
  type BeatTold,
} from './beats'
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

  it('a moment that begins with a roll the player gave is named by what was rolled, never by its dice', () => {
    const told = tellBeat(
      {
        id: 'j1',
        entries: [
          line(1, 'ROLLED', {
            source: 'oracle',
            data: {
              check: 'table.parting',
              named: 'A parting blow',
              rolls: [{ source: 'gm/parting', entry: 'caught', dice: ['1d6 → 1  [1]'], depth: 0 }],
            },
          }),
          line(2, 'ORACLE_RESULT', {
            source: 'oracle',
            text: 'Caught as you fall back',
            data: { event: 'table.parting', named: 'A parting blow', value: {} },
          }),
        ],
      },
      context,
      'story',
    )
    expect(told.title).toBe('A parting blow')
    expect(told.lines.map((l) => l.text)).toEqual(['A parting blow: Caught as you fall back'])
  })

  it('a check played after others that didn’t come up is named by it, not by them', () => {
    const told = tellBeat(
      {
        id: 'j1',
        entries: [
          line(1, 'CHECK_SKIPPED', { data: { check: 'AMBUSH', condition: 'when', failed: [] } }),
          line(2, 'ROLLED', {
            source: 'oracle',
            data: { check: 'TOLL', rolls: [{ source: 'gm/toll', dice: [], depth: 0 }] },
          }),
          line(3, 'ORACLE_RESULT', {
            source: 'oracle',
            text: 'The bridge keeper asks a toll',
            data: { event: 'TOLL', value: {} },
          }),
        ],
      },
      context,
      'detail',
    )
    expect(told.title).toBe('Toll')
    expect(told.lines.map((l) => l.text)).toContain('Toll: The bridge keeper asks a toll')
    expect(told.lines.some((l) => /Ambush|AMBUSH/.test(l.text))).toBe(true)
  })

  it('what an action changes of whoever acts is said of them: the one a reaction is played for', () => {
    const named: JournalContext = {
      ...context,
      memberName: (path) =>
        path === 'characters.kael.conditions.wounded'
          ? 'Kael: Wounded'
          : path === 'acting.conditions.wounded'
            ? 'Whoever acts: Wounded'
            : undefined,
    }
    const told = tellBeat(
      {
        id: 'j1',
        entries: [
          line(1, 'REACTED', { data: { who: 'kael' } }),
          line(2, 'ACTION_TAKEN', {
            data: {
              action: 'collapse',
              on: 'when:{}',
              effects: { 'acting.conditions.wounded': 'true' },
            },
          }),
        ],
      },
      named,
      'story',
    )
    expect(told.changes).toEqual(['Kael: Wounded'])
  })

  it('an action taken for each member says each one by name, read from what it changed', () => {
    const named: JournalContext = {
      ...context,
      memberName: (path) =>
        ({
          'characters.kael.values.renown': 'Kael: Renown',
          'characters.mira.values.renown': 'Mira: Renown',
          'acting.values.renown': 'Whoever acts: Renown',
        })[path],
    }
    const forEach = (n: number, who: string) => [
      line(n, 'ACTION_TAKEN', {
        data: { action: 'name-made', on: 'encounter.end', effects: { 'acting.values.renown': 1 } },
      }),
      line(n + 1, 'CHANGED', {
        data: { path: `characters.${who}.values.renown`, from: 1, to: 2 },
      }),
    ]
    const told = tellBeat(
      {
        id: 'j1',
        entries: [line(0, 'ENCOUNTER_ENDED'), ...forEach(1, 'kael'), ...forEach(3, 'mira')],
      },
      named,
      'story',
    )
    expect(told.changes).toEqual(['Kael: Renown +1', 'Mira: Renown +1'])
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

describe("an important moment's roll, to watch", () => {
  const die = (byHand = false) => ({
    expression: '1d6',
    total: 6,
    terms: byHand
      ? []
      : [{ kind: 'dice' as const, sign: 1 as const, sides: 6, rolls: [6], kept: [0], subtotal: 6 }],
    ...(byHand && { byHand: true as const }),
  })
  const at = '2026-11-20T10:00:00.000Z'
  const moment = (dice: ReturnType<typeof die>[], notable = true): BeatTold => ({
    id: 'j1',
    title: 'Omens',
    lines: [{ id: 'j2', text: 'The Wyrm stirs', notable, level: 'story', dice }],
    changes: [],
    why: [],
    notable,
    first: { id: 'j1', at, time: 0, source: 'oracle', code: 'ORACLE_RESULT' },
  })
  const now = Date.parse(at) + 2000

  it("is the computer's dice of an important line, just now", () => {
    expect(rollToWatch(moment([die()]), now)?.[0]?.total).toBe(6)
  })

  it('never a moment reopened, one that isn’t important, nor the player’s own roll', () => {
    expect(rollToWatch(moment([die()]), Date.parse(at) + 60_000)).toBeUndefined()
    expect(rollToWatch(moment([die()], false), now)).toBeUndefined()
    expect(rollToWatch(moment([die(true)]), now)).toBeUndefined()
  })
})

describe("an important moment's cards, to watch", () => {
  const at = '2026-11-20T10:00:00.000Z'
  const moment = (notable = true): BeatTold => ({
    id: 'j1',
    title: 'Omens',
    lines: [
      {
        id: 'j2',
        text: 'Scorched trees and a smell of sulphur',
        notable,
        level: 'story',
        cards: [{ icon: 'game:dragon-head', ink: 'red' }],
      },
    ],
    changes: [],
    why: [],
    notable,
    first: { id: 'j1', at, time: 0, source: 'oracle', code: 'ORACLE_RESULT' },
  })
  const now = Date.parse(at) + 2000

  it('are the cards of its important line, with its text, just now', () => {
    expect(cardsToWatch(moment(), now)).toEqual([
      {
        face: { icon: 'game:dragon-head', ink: 'red' },
        caption: 'Scorched trees and a smell of sulphur',
      },
    ])
  })

  it('never a moment reopened, nor one that isn’t important', () => {
    expect(cardsToWatch(moment(), Date.parse(at) + 60_000)).toBeUndefined()
    expect(cardsToWatch(moment(false), now)).toBeUndefined()
  })
})

import type { JournalEntry } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { translator } from './i18n'
import { tellTurn } from './turns'

const line = (id: number, code: string, data: Record<string, unknown> = {}, text?: string) =>
  ({
    id: `j${id}`,
    time: 0,
    at: '',
    source: 'travel',
    code,
    data,
    beat: id < 10 ? 1 : 10,
    ...(text !== undefined && { text }),
  }) as JournalEntry

const t = translator(() => 'en')
const names: Record<string, string> = { kael: 'Kael', 'grey-wolf': 'Grey wolf' }
const context = {
  t,
  startDay: 1,
  hexLabel: (h: string) => h,
  nameOf: (id: string) => id,
  actionName: (id: string) => (id === 'strike' ? 'Strike one down' : id),
  memberName: (path: string) => {
    const [, who, , what] = path.split('.')
    return `${names[who!] ?? who}: ${what === 'health' ? 'Health' : what}`
  },
  conditionTold: (path: string, gained: boolean) =>
    path.endsWith('.down') && gained ? 'The grey wolf falls' : undefined,
  textOf: (v: unknown) => String(v),
}
const whoName = (id: string) => names[id]
const die = { expression: '1d6', terms: [], total: 4 }

describe('a turn of a fight, told in one sentence', () => {
  it("a foe's: who, its table's result, whom it went for, what it left, its dice", () => {
    const beat = {
      id: 'j1',
      entries: [
        line(1, 'ENCOUNTER_TURN', {
          id: 'grey-wolf',
          name: 'Grey wolf',
          side: 'foes',
          target: 'kael',
          targetName: 'Kael',
        }),
        line(2, 'ROLLED', { check: 'table.wolf-turn', rolls: [{ results: [die] }] }),
        line(3, 'ORACLE_RESULT', { event: 'table.wolf-turn' }, 'The wolf bites'),
        line(4, 'CHANGED', { path: 'characters.kael.values.health', from: 5, to: 3 }),
        // The party's own sheet isn't a fighter's: not told here.
        line(5, 'CHANGED', { path: 'party.values.morale', from: 2, to: 1 }),
      ],
    }
    expect(tellTurn(beat, [], context, whoName)).toEqual({
      id: 'j1',
      who: 'Grey wolf',
      what: 'The wolf bites',
      on: 'Kael',
      results: ['Kael: Health: 5 → 3'],
      dice: [die],
      side: 'foes',
    })
  })

  it("the party's: whose turn it was, the action's own words or its name, the foe given, conditions in the pack's words", () => {
    const before = [line(0, 'ENCOUNTER_TURN', { id: 'kael', name: 'Kael', side: 'party' })]
    const entries = [
      line(11, 'ACTION_TAKEN', { action: 'strike', params: { foe: 'grey-wolf' } }),
      line(12, 'CHANGED', { path: 'characters.grey-wolf.values.health', from: 4, to: 0 }),
      line(13, 'CHANGED', { path: 'characters.grey-wolf.conditions.down', from: 0, to: 1 }),
    ]
    const plain = tellTurn({ id: 'j11', entries }, before, context, whoName)
    expect(plain).toMatchObject({
      who: 'Kael',
      what: 'Strike one down',
      on: 'Grey wolf',
      results: ['Grey wolf: Health: 4 → 0', 'The grey wolf falls'],
      side: 'party',
    })
    // Told in the system's words, which say whom already.
    const told = tellTurn(
      {
        id: 'j11',
        entries: [
          ...entries,
          line(14, 'ACTION_TOLD', { action: 'strike', text: 'Kael strikes at the grey wolf' }),
        ],
      },
      before,
      context,
      whoName,
    )
    expect(told).toMatchObject({ what: 'Kael strikes at the grey wolf', on: '' })
  })

  it('a moment that is no turn is none', () => {
    const beat = { id: 'j1', entries: [line(1, 'ENCOUNTER_STARTED')] }
    expect(tellTurn(beat, [], context, whoName)).toBeUndefined()
  })
})

import type { JournalEntry } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { translator } from './i18n'
import { ladderOf, tellFight } from './turns'

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
    if (!path.startsWith('characters.')) return undefined
    const [, who, , what] = path.split('.')
    return `${names[who!] ?? who}: ${what === 'health' ? 'Health' : what}`
  },
  conditionTold: (path: string, gained: boolean) =>
    path.endsWith('.down') && gained ? 'The grey wolf falls' : undefined,
  textOf: (v: unknown) => String(v),
}
const whoName = (id: string) => names[id]
const die = { expression: '1d6', terms: [], total: 4 }
const rolledWith = (check: string, source: string, entry?: string) => ({
  check,
  rolls: [{ source, dice: [], results: [die], depth: 0, ...(entry && { entry }) }],
})
const wolfTurn = (id: number, more: Record<string, unknown> = {}) =>
  line(id, 'ENCOUNTER_TURN', {
    id: 'grey-wolf',
    name: 'Grey wolf',
    side: 'foes',
    round: 1,
    target: 'kael',
    targetName: 'Kael',
    ...more,
  })
const kaelTurn = (id: number) =>
  line(id, 'ENCOUNTER_TURN', { id: 'kael', name: 'Kael', side: 'party', round: 1 })

describe('a fight told a turn at a time', () => {
  it('a foe going for the party played as a whole: the party, never its id', () => {
    const told = tellFight(
      [
        wolfTurn(1, { target: 'party', targetName: '' }),
        line(2, 'ORACLE_RESULT', { event: 'table.wolf-turn' }, 'The wolf circles'),
      ],
      context,
      { whoName },
    )
    expect(told.turns[0]?.on).toBe('the party')
  })

  it("a foe's: who, its table's result, whom it went for, what it left large, the rest apart, its dice named", () => {
    const told = tellFight(
      [
        line(1, 'ENCOUNTER_STARTED'),
        line(2, 'ENCOUNTER_ROUND', { round: 1 }),
        wolfTurn(3),
        line(4, 'MOMENT_REACHED', { at: 'encounter.turn' }),
        line(5, 'ROLLED', rolledWith('table.wolf-turn', 'pack/wolf-turn', 'bite')),
        line(6, 'ORACLE_RESULT', { event: 'table.wolf-turn' }, 'The wolf bites'),
        line(7, 'CHANGED', { path: 'characters.kael.values.health', from: 5, to: 3 }),
        // Not its main value, and the party's own sheet: told, but apart.
        line(8, 'CHANGED', { path: 'characters.kael.values.wounds', from: 0, to: 2 }),
        line(9, 'CHANGED', { path: 'party.stats.morale', from: 2, to: 1 }),
        line(10, 'LIMIT_REACHED', { path: 'characters.kael.values.health', limit: 'min' }),
      ],
      { ...context, nameOf: (id: string) => (id === 'pack/wolf-turn' ? "A wolf's turn" : id) },
      {
        whoName,
        isMain: (path) => path.endsWith('.health'),
        rowsOf: () => [
          { key: 'circle', range: '1–2', text: 'circles' },
          { key: 'bite', range: '3–6', text: 'bites' },
        ],
      },
    )
    expect(told.turns).toEqual([
      {
        id: 'j3',
        round: 1,
        whoId: 'grey-wolf',
        who: 'Grey wolf',
        side: 'foes',
        stage: 'told',
        what: 'The wolf bites',
        on: 'Kael',
        outcome: ['Kael: Health: 5 → 3'],
        more: ['Kael: wounds: 0 → 2', 'morale: 2 → 1'],
        rolls: [
          {
            source: 'pack/wolf-turn',
            label: "A wolf's turn",
            dice: [die],
            rows: [
              { key: 'circle', range: '1–2', text: 'circles' },
              { key: 'bite', range: '3–6', text: 'bites' },
            ],
            hit: 'bite',
          },
        ],
        before: [],
      },
    ])
  })

  it("the party's: nothing said of what it did until it's done", () => {
    const start = [kaelTurn(1), line(2, 'MOMENT_REACHED', { at: 'encounter.turn' })]
    // Its turn begun, nothing taken: the player chooses.
    expect(tellFight(start, context, { whoName }).turns[0]).toMatchObject({
      stage: 'choosing',
      who: 'Kael',
      what: '',
      outcome: [],
    })
    // Strike taken, its roll the player's: who, what and whom, and it waits.
    const taken = [
      ...start,
      line(11, 'ACTION_TAKEN', { action: 'strike', params: { foe: 'grey-wolf' } }),
      line(12, 'CHECK_YOURS', { event: 'generator.blow', dice: '1d6' }),
    ]
    expect(tellFight(taken, context, { whoName, waiting: true }).turns[0]).toMatchObject({
      stage: 'rolling',
      what: 'Strike one down',
      on: 'Grey wolf',
      outcome: [],
      rolls: [],
    })
  })

  it("the party's, done: the action's own words, its roll's result first, the fallen said once, what it set off apart", () => {
    const done = [
      kaelTurn(1),
      line(11, 'ACTION_TAKEN', { action: 'strike', params: { foe: 'grey-wolf' } }),
      line(12, 'CHECK_YOURS', { event: 'generator.blow', dice: '1d6' }),
      line(13, 'ROLLED', rolledWith('generator.blow', 'pack/blow')),
      line(14, 'ORACLE_RESULT', { event: 'generator.blow', named: 'A blow' }, '4 harm, steel'),
      line(15, 'CHANGED', { path: 'characters.grey-wolf.values.health', from: 4, to: 0 }),
      line(16, 'CHANGED', { path: 'characters.grey-wolf.conditions.down', from: 0, to: 1 }),
      line(17, 'PRESENT_LEFT', {
        id: 'grey-wolf',
        name: 'Grey wolf',
        because: 'condition',
        condition: 'down',
      }),
      // What its fall set off: a moment's action, its table and what it gave.
      line(18, 'MOMENT_REACHED', { at: 'present.leave' }),
      line(19, 'ACTION_TAKEN', { action: 'strip', on: 'present.leave' }),
      line(20, 'ROLLED', rolledWith('table.fallen', 'pack/fallen', 'pelt')),
      line(21, 'ORACLE_RESULT', { event: 'table.fallen', named: 'Spoils' }, 'A grey pelt'),
      line(22, 'CHANGED', { path: 'party.stats.silver', from: 1, to: 3 }),
      line(23, 'SAID', { action: 'strike', text: 'A blow, at one of them.' }),
      line(24, 'ACTION_TOLD', { action: 'strike', text: 'Kael strikes at the grey wolf' }),
    ]
    const turn = tellFight(done, context, { whoName, waiting: true }).turns[0]!
    expect(turn).toMatchObject({
      stage: 'rolling',
      what: 'Kael strikes at the grey wolf',
      // Told in the system's words, which say whom already.
      on: '',
      outcome: ['4 harm, steel', 'Grey wolf: Health: 4 → 0', 'The grey wolf falls'],
      more: ['Spoils: A grey pelt', 'silver: 1 → 3', 'A blow, at one of them.'],
    })
    // Only its own roll is drawn: the spoils' dice are the journal's.
    expect(turn.rolls.map((r) => r.source)).toEqual(['pack/blow'])
    expect(tellFight(done, context, { whoName }).turns[0]?.stage).toBe('told')
  })

  it("each turn its own lines, whichever moments they fell in; a round's start before its first turn", () => {
    const told = tellFight(
      [
        line(1, 'ACTION_TAKEN', { action: 'stand' }),
        line(2, 'SAID', { action: 'stand', text: 'Steel out.' }),
        line(3, 'ENCOUNTER_STARTED'),
        line(4, 'ENCOUNTER_ROUND', { round: 1 }),
        wolfTurn(5),
        line(6, 'ORACLE_RESULT', { event: 'table.wolf-turn' }, 'The wolf circles'),
        kaelTurn(7),
        line(8, 'ACTION_TAKEN', { action: 'strike', params: { foe: 'grey-wolf' } }),
        line(9, 'ENCOUNTER_ROUND', { round: 2 }),
        line(10, 'CHANGED', { path: 'characters.kael.conditions.rattled', from: 1, to: 0 }),
        wolfTurn(11, { round: 2 }),
        line(12, 'ENCOUNTER_SKIPPED', { id: 'grey-wolf', name: 'Grey wolf' }),
      ],
      context,
      { whoName },
    )
    expect(told.opening).toEqual(['Steel out.'])
    expect(told.turns.map((turn) => [turn.round, turn.who, turn.stage, turn.before])).toEqual([
      [1, 'Grey wolf', 'told', []],
      [1, 'Kael', 'told', []],
      [2, 'Grey wolf', 'told', [expect.stringContaining('Kael')]],
    ])
    // A turn with nothing changed has no outcome: the stage says so.
    expect(told.turns[0]).toMatchObject({ what: 'The wolf circles', outcome: [] })
    expect(told.ended).toBeUndefined()
  })

  it("a foe's turn a moment took: what the system said of it, nobody gone for, never _does nothing_", () => {
    const told = tellFight(
      [
        line(1, 'ENCOUNTER_STARTED'),
        line(2, 'ENCOUNTER_ROUND', { round: 1 }),
        wolfTurn(3, { target: 'kael' }),
        line(4, 'MOMENT_REACHED', { at: 'encounter.turn' }),
        line(5, 'ACTION_TAKEN', { action: 'nerve-breaks', on: 'encounter.turn' }),
        line(6, 'CHANGED', { path: 'characters.grey-wolf.conditions.routed', from: 0, to: 1 }),
        line(7, 'SAID', { action: 'nerve-breaks', text: 'One of them runs.' }),
        wolfTurn(8, { target: 'kael' }),
        line(9, 'CHANGED', { path: 'characters.kael.values.health', from: 5, to: 3 }),
      ],
      context,
      { whoName },
    )
    expect(told.turns[0]).toMatchObject({ what: 'One of them runs.', on: '' })
    expect(told.turns[0]?.outcome).toEqual([expect.stringContaining('Grey wolf')])
    expect(told.turns[0]?.more).toEqual([])
    // Something changed with no words for it: the change alone, no sentence against it.
    expect(told.turns[1]).toMatchObject({ what: '', on: '', outcome: ['Kael: Health: 5 → 3'] })
  })

  it('its end: the rounds, who went, what it left of those still here, what its end did', () => {
    const told = tellFight(
      [
        line(1, 'ENCOUNTER_STARTED'),
        line(2, 'ENCOUNTER_ROUND', { round: 1 }),
        wolfTurn(3),
        line(4, 'CHANGED', { path: 'characters.kael.values.health', from: 5, to: 3 }),
        kaelTurn(5),
        line(6, 'ACTION_TAKEN', { action: 'strike', params: { foe: 'grey-wolf' } }),
        line(7, 'CHANGED', { path: 'characters.grey-wolf.values.health', from: 4, to: 0 }),
        line(8, 'PRESENT_LEFT', { id: 'grey-wolf', name: 'Grey wolf' }),
        line(9, 'ENCOUNTER_ENDED', { rounds: 1 }),
        line(10, 'MOMENT_REACHED', { at: 'encounter.end' }),
        line(11, 'ACTION_TAKEN', { action: 'name-made', on: 'encounter.end' }),
        line(12, 'CHANGED', { path: 'characters.kael.values.renown', from: 0, to: 1 }),
      ],
      context,
      { whoName, isMain: (path) => path.endsWith('.health') },
    )
    expect(told.turns).toHaveLength(2)
    expect(told.turns[1]?.stage).toBe('told')
    expect(told.ended).toEqual({
      rounds: 1,
      gone: [expect.stringContaining('Grey wolf')],
      // The wolf is gone: only Kael's is said.
      left: ['Kael: Health: 5 → 3'],
      lines: ['Kael: renown: 0 → 1'],
    })
  })
})

describe('what a roll can give', () => {
  it('a short table with a range on every row: each range and its words, what the table reads left out', () => {
    expect(
      ladderOf([
        { key: 'miss', min: 1, max: 3, text: '{{acting.name}} swings, and misses' },
        { key: 'hit', min: 4, max: 5, text: '{{acting.name}} lands a blow' },
        { key: 'heavy', min: 6, max: 6, text: 'A heavy blow, {{harm}} harm' },
      ]),
    ).toEqual([
      { key: 'miss', range: '1–3', text: 'swings, and misses' },
      { key: 'hit', range: '4–5', text: 'lands a blow' },
      { key: 'heavy', range: '6', text: 'A heavy blow, … harm' },
    ])
  })

  it('none for a long table, rows by weight, or rows chosen by a condition', () => {
    const row = (i: number) => ({ key: String(i), min: i, max: i, text: 'x' })
    expect(ladderOf(undefined)).toBeUndefined()
    expect(ladderOf([1, 2, 3, 4, 5, 6, 7].map(row))).toBeUndefined()
    expect(ladderOf([{ key: 'a', text: 'by weight' }])).toBeUndefined()
    expect(ladderOf([{ ...row(1), when: { 'acting.tags': 'outlaw' } }])).toBeUndefined()
  })
})

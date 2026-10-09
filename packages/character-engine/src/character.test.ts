import { describe, expect, it } from 'vitest'
import { onceRoller } from '@open-tabletop/variables'
import { sequence } from '@open-tabletop/random'
import {
  applyCharacter,
  blockedBy,
  boundsOf,
  characterFacts,
  createCharacter,
  membersBlock,
  parseSheet,
  partyValue,
  shareChange,
  validatePartyFrom,
  type CharacterState,
} from './index'

// A sheet with made-up values: an Ironsworn-like momentum under a max that falls, a stress
// track, conditions that block, and relations with and without a number.
const raw = {
  kind: 'sheet',
  id: 'wanderer',
  name: 'Wanderer',
  values: {
    wits: { name: 'Wits', default: 2, min: 1, max: 3, group: 'stats' },
    health: { default: 5, min: 0, max: 5 },
    momentum: { default: 2, min: -6, max: '{{maxMomentum}}' },
    maxMomentum: { default: 10, min: 0, max: 10 },
    stress: { default: 0, min: 0, max: 9, track: true },
  },
  conditions: {
    wounded: { name: 'Wounded', blocks: ['forced-march'] },
    hungry: { blocks: ['rest', 'travel'] },
  },
  relations: {
    bond: { name: 'Bond', value: { min: 0, max: 10 } },
    home: {},
  },
}

const { sheet, errors } = parseSheet(raw)
const kael = (): CharacterState =>
  createCharacter(sheet!, 'test/wanderer', { id: 'kael', name: 'Kael' })

describe('sheets', () => {
  it('are read with their values, conditions and relations', () => {
    expect(errors).toEqual([])
    expect(Object.keys(sheet!.values)).toEqual([
      'wits',
      'health',
      'momentum',
      'maxMomentum',
      'stress',
    ])
  })

  it('explain what is wrong', () => {
    expect(
      parseSheet({ kind: 'sheet', id: 'x', values: { a: { max: '{{nope}}' } } }).errors,
    ).toEqual(['values.a.max: no value "nope" on this sheet'])
    expect(parseSheet({ kind: 'sheet', id: 'x', values: { a: { max: 'ten' } } }).errors).toEqual([
      "values.a.max: a number or '{{a value}}'",
    ])
    expect(parseSheet({ kind: 'sheet', id: 'x', values: { a: { track: true } } }).errors).toEqual([
      'values.a: a track needs a number as its max (its boxes)',
    ])
    expect(parseSheet({ kind: 'sheet', id: 'x', values: { a: { colour: 1 } } }).errors[0]).toMatch(
      /^values\.a/,
    )
  })
})

describe('characters', () => {
  it('start with the sheet’s defaults, and what they’re given', () => {
    const c = createCharacter(sheet!, 'test/wanderer', { id: 'b', values: { wits: 3, luck: 1 } })
    expect(c.values).toEqual({
      wits: 3,
      health: 5,
      momentum: 2,
      maxMomentum: 10,
      stress: 0,
      luck: 1,
    })
    expect(c).toMatchObject({ sheet: 'test/wanderer', conditions: {}, tags: [], relations: [] })
  })

  it('change within their bounds, saying when one was reached', () => {
    const { state, events } = applyCharacter(sheet!, kael(), {
      type: 'change',
      effects: { 'values.health': -7, 'values.stress': 2, 'values.wits': '=3' },
    })
    expect(state.values).toMatchObject({ health: 0, stress: 2, wits: 3 })
    expect(events).toContainEqual({
      type: 'LIMIT_REACHED',
      character: 'kael',
      value: 'health',
      limit: 'min',
    })
    expect(events).toContainEqual({
      type: 'VALUE_CHANGED',
      character: 'kael',
      value: 'stress',
      from: 0,
      to: 2,
    })
  })

  it('take variables and rolls in their changes; a value without bounds goes anywhere', () => {
    const roller = onceRoller(sequence([0.99]))
    const { state } = applyCharacter(
      sheet!,
      kael(),
      { type: 'change', effects: { 'values.momentum': '+{{wits}}', 'values.luck': '-{{1d6}}' } },
      { roller },
    )
    expect(state.values.momentum).toBe(4)
    expect(state.values.luck).toBe(-6)
  })

  it('keep a value under a bound that is another value (momentum under its max)', () => {
    let c = applyCharacter(sheet!, kael(), {
      type: 'change',
      effects: { 'values.momentum': '=9' },
    }).state
    const { state, events } = applyCharacter(sheet!, c, {
      type: 'change',
      effects: { 'values.maxMomentum': -3 },
    })
    expect(boundsOf(sheet!, state, 'momentum')).toEqual({ min: -6, max: 7 })
    expect(state.values.momentum).toBe(7)
    expect(events.map((e) => e.type)).toEqual(['VALUE_CHANGED', 'VALUE_CHANGED'])
    c = applyCharacter(sheet!, state, { type: 'change', effects: { 'values.momentum': 5 } }).state
    expect(c.values.momentum).toBe(7)
  })

  it('get and lose conditions, which block what they say', () => {
    const { state, events } = applyCharacter(sheet!, kael(), {
      type: 'change',
      effects: { 'conditions.wounded': true },
      time: 600,
    })
    expect(state.conditions).toEqual({ wounded: { since: 600 } })
    expect(events).toEqual([{ type: 'CONDITION_SET', character: 'kael', condition: 'wounded' }])
    expect(blockedBy(sheet!, state, 'forced-march')).toBe('wounded')
    expect(blockedBy(sheet!, state, 'travel')).toBeUndefined()
    const healed = applyCharacter(sheet!, state, {
      type: 'change',
      effects: { 'conditions.wounded': false },
    })
    expect(healed.state.conditions).toEqual({})
    expect(healed.events[0].type).toBe('CONDITION_CLEARED')
    // A condition the sheet doesn't name is still kept, and said.
    const odd = applyCharacter(sheet!, kael(), {
      type: 'change',
      effects: { 'conditions.cursed': true },
    })
    expect(odd.events.map((e) => e.type)).toEqual(['UNKNOWN_CONDITION', 'CONDITION_SET'])
  })

  it('hold tags, cards and relations (bonds with a number within its bounds)', () => {
    let c = kael()
    const step = (action: Parameters<typeof applyCharacter>[2]) =>
      (c = applyCharacter(sheet!, c, action).state)
    step({ type: 'tag', tag: 'oathbound' })
    step({ type: 'addCard', card: 'test/explorer' })
    step({ type: 'relate', to: 'poi:ashford', kind: 'home' })
    step({ type: 'relate', to: 'character:brenna', kind: 'bond', value: 1 })
    step({ type: 'relate', to: 'character:brenna', kind: 'bond', value: 12 })
    expect(c.relations).toEqual([
      { to: 'poi:ashford', kind: 'home' },
      { to: 'character:brenna', kind: 'bond', value: 10 },
    ])
    expect(characterFacts(c)).toMatchObject({
      wits: 2,
      values: { wits: 2 },
      conditions: [],
      tags: ['oathbound'],
      cards: ['test/explorer'],
      relations: { home: ['poi:ashford'], bond: ['character:brenna'] },
      bonds: { bond: { 'character:brenna': 10 } },
    })
    const { state, events } = applyCharacter(sheet!, c, { type: 'unrelate', to: 'poi:ashford' })
    expect(state.relations).toHaveLength(1)
    expect(events).toEqual([
      { type: 'RELATION_REMOVED', character: 'kael', to: 'poi:ashford', kind: 'home' },
    ])
  })

  it('never change the state they were given', () => {
    const before = kael()
    const copy = structuredClone(before)
    applyCharacter(sheet!, before, { type: 'change', effects: { 'values.health': -1 } })
    applyCharacter(sheet!, before, { type: 'tag', tag: 'x' })
    expect(before).toEqual(copy)
  })
})

describe('translated sheets', () => {
  it('reads texts in several languages, as translations fold them in', () => {
    const { sheet: translated, errors } = parseSheet({
      ...raw,
      name: { en: 'Wanderer', es: 'Errante' },
      values: { wits: { name: { en: 'Wits', es: 'Ingenio' } } },
    })
    expect(errors).toEqual([])
    expect(translated?.values.wits.name).toEqual({ en: 'Wits', es: 'Ingenio' })
  })
})

describe('a party of characters', () => {
  const band = () => [
    createCharacter(sheet!, 'test/wanderer', { id: 'kael', values: { wits: 3, health: 4 } }),
    createCharacter(sheet!, 'test/wanderer', { id: 'mara', values: { wits: 1, health: 1 } }),
    createCharacter(sheet!, 'test/wanderer', { id: 'pip', values: { wits: 2, health: 0 } }),
  ]

  it('makes party values of the members: best, worst, sum, how many', () => {
    const members = band()
    members[1].conditions = { wounded: {} }
    expect(partyValue(members, { max: 'wits' })).toBe(3)
    expect(partyValue(members, { min: 'wits' })).toBe(1)
    expect(partyValue(members, { sum: 'health' })).toBe(5)
    expect(partyValue(members, { count: true })).toBe(3)
    // Only those the conditions let in: the unwounded, the ones still standing.
    expect(partyValue(members, { count: true, unless: { conditions: 'wounded' } })).toBe(2)
    expect(partyValue(members, { max: 'wits', when: { health: { gt: 0 } }, none: -1 })).toBe(3)
    expect(partyValue([], { max: 'wits' })).toBe(0)
    expect(partyValue([], { max: 'wits', none: -1 })).toBe(-1)
  })

  it('validates how a party value is made', () => {
    expect(validatePartyFrom({ max: 'wits' })).toEqual([])
    expect(validatePartyFrom({ count: true, when: { health: { gt: 0 } } })).toEqual([])
    expect(validatePartyFrom({ max: 'wits', sum: 'health' })).toHaveLength(1)
    expect(validatePartyFrom({ count: 2 })).toEqual(['from.count: true'])
    expect(validatePartyFrom({ average: 'wits' }).length).toBeGreaterThan(0)
  })

  it("shares a change out evenly, within each one's bounds", () => {
    // Health: min 0, max 5. Taking 3: from whoever has most, one at a time.
    const taken = shareChange(() => sheet, band(), 'health', -3)
    expect(taken.members.map((m) => m.values.health)).toEqual([1, 1, 0])
    expect(taken.left).toBe(0)
    // Giving 4: to whoever has least, never past 5.
    const given = shareChange(() => sheet, band(), 'health', 4)
    expect(given.members.map((m) => m.values.health)).toEqual([4, 3, 2])
    // More than they can take: what's left stays undone.
    const tooMuch = shareChange(() => sheet, band(), 'health', -9)
    expect(tooMuch.members.map((m) => m.values.health)).toEqual([0, 0, 0])
    expect(tooMuch.left).toBe(4)
    expect(tooMuch.events).toContainEqual({
      type: 'VALUE_CHANGED',
      character: 'kael',
      value: 'health',
      from: 4,
      to: 0,
    })
  })

  it('shares a change out in order', () => {
    const taken = shareChange(() => sheet, band(), 'health', -4, 'order')
    expect(taken.members.map((m) => m.values.health)).toEqual([0, 1, 0])
    const given = shareChange(() => sheet, band(), 'health', 3, 'order')
    expect(given.members.map((m) => m.values.health)).toEqual([5, 3, 0])
  })

  it("says what members' conditions block, and who has them", () => {
    const members = band()
    members[1].conditions = { hungry: {} }
    members[2].conditions = { wounded: {}, hungry: {} }
    expect(membersBlock(() => sheet, members)).toEqual({
      rest: { value: 'hungry', who: 'mara' },
      travel: { value: 'hungry', who: 'mara' },
      'forced-march': { value: 'wounded', who: 'pip' },
    })
  })
})

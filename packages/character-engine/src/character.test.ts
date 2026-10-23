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
  partySource,
  partyValue,
  readsWorld,
  settleCharacter,
  shareChange,
  validatePartyFrom,
  displayOf,
  toneOf,
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
    momentum: { default: 2, min: -6, max: '{{self.values.maxMomentum}}' },
    maxMomentum: { default: 10, min: 0, max: 10 },
    stress: { default: 0, min: 0, max: 9, track: true },
  },
  conditions: {
    wounded: { name: 'Wounded', blocks: ['actions.forced-march'] },
    hungry: { blocks: ['actions.rest', 'travel.move'] },
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
      parseSheet({ kind: 'sheet', id: 'x', values: { a: { max: '{{self.values.nope}}' } } }).errors,
    ).toEqual(['values.a.max: no value "nope" on this sheet'])
    expect(parseSheet({ kind: 'sheet', id: 'x', values: { a: { max: 'ten' } } }).errors).toEqual([
      "values.a.max: a number or '{{self.values.<id>}}'",
    ])
    // Another value of the sheet by its short name says which full one it meant.
    expect(
      parseSheet({ kind: 'sheet', id: 'x', values: { a: { max: '{{b}}' }, b: {} } }).errors,
    ).toEqual([
      "values.a.max: another value of this sheet is '{{self.values.<id>}}' (did you mean '{{self.values.b}}'?)",
    ])
    expect(parseSheet({ kind: 'sheet', id: 'x', values: { a: { track: true } } }).errors).toEqual([
      'values.a: display: boxes needs a max',
    ])
    expect(parseSheet({ kind: 'sheet', id: 'x', values: { a: { colour: 1 } } }).errors[0]).toMatch(
      /^values\.a/,
    )
  })
})

describe('how values are shown', () => {
  const looks = (values: Record<string, unknown>, relations: Record<string, unknown> = {}) =>
    parseSheet({ kind: 'sheet', id: 'x', values, relations }).errors

  it('reads every display, a track as boxes, and a number by default', () => {
    expect(
      looks({
        hp: {
          min: 0,
          max: '{{self.values.top}}',
          display: 'bar',
          tones: { 0: 'danger', 3: 'good' },
        },
        top: { default: 5, display: 'number' },
        load: { max: 6, display: 'of' },
        heart: { min: 1, max: 5, display: 'pips' },
        ritual: { max: 8, display: 'dial' },
        harm: { display: 'levels', levels: ['unhurt', { id: 'hurt', name: 'Hurt' }] },
      }),
    ).toEqual([])
    expect(displayOf(sheet!.values.stress)).toBe('boxes')
    expect(displayOf(sheet!.values.wits)).toBe('number')
  })

  it('says what a display needs', () => {
    expect(looks({ a: { display: 'bar' } })).toEqual(['values.a: display: bar needs a max'])
    expect(looks({ a: { display: 'levels' } })).toEqual([
      'values.a: display: levels needs its levels',
    ])
    expect(looks({ a: { levels: ['x'] } })).toEqual(['values.a.levels: only with display: levels'])
    expect(looks({ a: { display: 'levels', levels: ['d6', 'd6'] } })).toEqual([
      'values.a.levels: "d6" twice',
    ])
    expect(looks({ a: { max: 3, track: true, display: 'bar' } })).toEqual([
      'values.a: track: true is display: boxes, not bar',
    ])
    expect(looks({ a: { max: 3, display: 'bar', tones: { low: 'danger' } } })[0]).toMatch(
      /^values\.a\.tones/,
    )
    expect(looks({ a: { max: 3, display: 'bar', tones: { 0: 'red' } } })[0]).toMatch(
      /^values\.a\.tones/,
    )
    expect(looks({}, { bond: { value: { min: 0, display: 'pips' } } })).toEqual([
      'relations.bond.value: display: pips needs a max',
    ])
  })

  it('takes the tone of the highest threshold reached', () => {
    const tones = { 0: 'danger', 2: 'warning', 4: 'good' } as const
    expect([-1, 0, 1, 2, 3, 4, 9].map((v) => toneOf(tones, v))).toEqual([
      undefined,
      'danger',
      'danger',
      'warning',
      'warning',
      'good',
      'good',
    ])
    expect(toneOf(undefined, 3)).toBeUndefined()
  })

  it('takes a share of the max as it is now', () => {
    const tones = { 0: 'danger', '50%': 'warning', '75%': 'good' } as const
    // A max of 3: red at 0 and 1, amber at 2, green at 3.
    expect([0, 1, 2, 3].map((v) => toneOf(tones, v, 3))).toEqual([
      'danger',
      'danger',
      'warning',
      'good',
    ])
    // The same tones under a max of 6.
    expect([2, 3, 4, 5, 6].map((v) => toneOf(tones, v, 6))).toEqual([
      'danger',
      'warning',
      'warning',
      'good',
      'good',
    ])
    // Without a max, shares count for nothing.
    expect(toneOf(tones, 5)).toBe('danger')
    expect(
      parseSheet({ kind: 'sheet', id: 'x', values: { a: { tones: { '50%': 'good' } } } }).errors,
    ).toEqual(['values.a.tones: a share (50%) needs a max'])
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
    expect(blockedBy(sheet!, state, 'actions.forced-march')).toBe('wounded')
    expect(blockedBy(sheet!, state, 'travel.move')).toBeUndefined()
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

  it('says whose a party value is', () => {
    const members = band()
    members[1].conditions = { wounded: {} }
    expect(partySource(members, { max: 'wits' })).toEqual({ value: 3, members: ['kael'] })
    expect(partySource(members, { min: 'wits', unless: { conditions: 'wounded' } })).toEqual({
      value: 2,
      members: ['pip'],
    })
    expect(partySource(members, { sum: 'health' })).toEqual({
      value: 5,
      members: ['kael', 'mara', 'pip'],
    })
    expect(partySource(members, { count: true, unless: { conditions: 'wounded' } })).toEqual({
      value: 2,
      members: ['kael', 'pip'],
    })
    // Picked: the chosen one's, said so; nobody chosen, the best.
    expect(partySource(members, { pick: 'wits' }, 'mara')).toEqual({
      value: 1,
      members: ['mara'],
      chosen: true,
    })
    expect(partySource(members, { pick: 'wits' })).toEqual({ value: 3, members: ['kael'] })
    // Nobody counts: the system's `none`, nobody's.
    expect(partySource([], { max: 'wits', none: -1 })).toEqual({ value: -1, members: [] })
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
      'actions.rest': { value: 'hungry', who: 'mara' },
      'travel.move': { value: 'hungry', who: 'mara' },
      'actions.forced-march': { value: 'wounded', who: 'pip' },
    })
  })
})

describe('what holds by itself', () => {
  // A made-up sheet: a capacity made of might, a load set by hand, wounds made of health,
  // a state while over the capacity, one when dread is full, and one that reads the world.
  const { sheet } = parseSheet({
    kind: 'sheet',
    id: 'porter',
    values: {
      might: { default: 2, min: 0, max: 5 },
      capacity: { from: '{{self.values.might * 2 + 4}}' },
      load: { default: 0, min: 0 },
      maxHealth: { default: 4 },
      health: { default: 4, min: 0, max: '{{self.values.maxHealth}}' },
      wounds: { from: '{{self.values.maxHealth - self.values.health}}', min: 0 },
      half: { from: '{{floor(self.values.capacity / 3)}}' },
      dread: { default: 0, min: 0, max: 3 },
    },
    conditions: {
      encumbered: {
        when: { 'self.values.load': { gt: '{{self.values.capacity}}' } },
        blocks: ['actions.forced-march'],
      },
      terrified: { when: { 'self.values.dread': { gte: 3 } } },
      // Holds while another state that holds by itself does.
      shaking: { when: { 'self.conditions': 'terrified' } },
      cold: { when: { 'time.season': 'winter', 'self.values.health': { lt: 3 } } },
      wounded: {},
    },
  })
  const porter = () => createCharacter(sheet!, 'p/porter', { id: 'bran' })

  it('makes values of others, in order, from the start', () => {
    const p = porter()
    expect(p.values).toMatchObject({ capacity: 8, wounds: 0, half: 2 })
    const stronger = applyCharacter(sheet!, p, {
      type: 'change',
      effects: { 'values.might': 1, 'values.health': -3 },
    })
    expect(stronger.state.values).toMatchObject({ capacity: 10, half: 3, wounds: 3 })
    expect(stronger.events).toContainEqual({
      type: 'VALUE_CHANGED',
      character: 'bran',
      value: 'capacity',
      from: 8,
      to: 10,
    })
  })

  it('keeps a value made of others within its bounds', () => {
    const healed = applyCharacter(sheet!, porter(), {
      type: 'change',
      effects: { 'values.maxHealth': -3 },
    })
    // Health follows its max down to 1; wounds are 1 - 1 = 0, never below its min.
    expect(healed.state.values).toMatchObject({ health: 1, wounds: 0 })
  })

  it('sets and clears a condition while its when holds, with when it began', () => {
    const loaded = applyCharacter(sheet!, porter(), {
      type: 'change',
      effects: { 'values.load': 9 },
      time: 600,
    })
    expect(loaded.state.conditions.encumbered).toEqual({ since: 600 })
    expect(blockedBy(sheet!, loaded.state, 'actions.forced-march')).toBe('encumbered')
    const lighter = applyCharacter(sheet!, loaded.state, {
      type: 'change',
      effects: { 'values.might': 1 },
    })
    expect(lighter.state.conditions.encumbered).toBeUndefined()
    expect(lighter.events).toContainEqual({
      type: 'CONDITION_CLEARED',
      character: 'bran',
      condition: 'encumbered',
    })
  })

  it('settles conditions that read other conditions holding by themselves', () => {
    const scared = applyCharacter(sheet!, porter(), {
      type: 'change',
      effects: { 'values.dread': 3 },
    })
    expect(Object.keys(scared.state.conditions).sort()).toEqual(['shaking', 'terrified'])
  })

  it('refuses effects on what holds by itself, and says so', () => {
    const tried = applyCharacter(sheet!, porter(), {
      type: 'change',
      effects: { 'values.capacity': 5, 'conditions.terrified': true, 'conditions.wounded': true },
    })
    expect(tried.state.values.capacity).toBe(8)
    expect(tried.state.conditions).toEqual({ wounded: {} })
    expect(tried.events.filter((e) => e.type === 'NOT_WRITABLE')).toEqual([
      { type: 'NOT_WRITABLE', character: 'bran', path: 'values.capacity' },
      { type: 'NOT_WRITABLE', character: 'bran', path: 'conditions.terrified' },
    ])
  })

  it('settles what reads the world only with a world; without one it stays as last seen', () => {
    expect(readsWorld(sheet!, 'cold')).toBe(true)
    expect(readsWorld(sheet!, 'encumbered')).toBe(false)
    const hurt = applyCharacter(sheet!, porter(), {
      type: 'change',
      effects: { 'values.health': -2 },
    })
    expect(hurt.state.conditions.cold).toBeUndefined()
    const winter = settleCharacter(sheet!, hurt.state, { world: { time: { season: 'winter' } } })
    expect(winter.state.conditions.cold).toEqual({})
    // No world (a roster): kept as it was, even if health came back.
    const healed = applyCharacter(sheet!, winter.state, {
      type: 'change',
      effects: { 'values.health': 2 },
    })
    expect(healed.state.conditions.cold).toEqual({})
    const spring = settleCharacter(sheet!, healed.state, { world: { time: { season: 'spring' } } })
    expect(spring.state.conditions.cold).toBeUndefined()
  })

  it('follows a shared-out change', () => {
    const shared = shareChange(() => sheet!, [porter()], 'load', 10)
    expect(shared.members[0].conditions.encumbered).toEqual({})
  })

  it('refuses from and bounds that are not the sheet own values, dice and cycles', () => {
    const errors = (values: Record<string, unknown>) =>
      parseSheet({ kind: 'sheet', id: 'x', values }).errors
    expect(errors({ a: { from: 'a * 2' } })).toEqual([
      "values.a.from: the sheet's values in '{{…}}' ('{{self.values.might * 2}}')",
    ])
    expect(errors({ a: { from: '{{1d6 + 1}}' } })).toEqual([
      "values.a.from: no dice (it would change each time it's read)",
    ])
    expect(errors({ a: { from: '{{self.values.b * 2}}' } })).toEqual([
      'values.a.from: no value "b" on this sheet',
    ])
    expect(
      errors({ a: { from: '{{self.values.b}}' }, b: { from: '{{self.values.a + 1}}' } }),
    ).toEqual(['values.a.from: made of itself (a → b → a)'])
    expect(errors({ a: { from: '{{self.values.b}}', default: 2 }, b: {} })).toEqual([
      'values.a.default: not with from (it is made of other values)',
    ])
    expect(errors({ a: { max: '{{self.values.b * 2}}' }, b: { default: 3 } })).toEqual([])
    expect(
      parseSheet({ kind: 'sheet', id: 'x', conditions: { c: { when: { a: { gt: [] } } } } }).errors
        .length,
    ).toBeGreaterThan(0)
  })

  it('reads a bound made with arithmetic', () => {
    const { sheet: s } = parseSheet({
      kind: 'sheet',
      id: 'x',
      values: { b: { default: 3 }, a: { default: 9, max: '{{self.values.b * 2}}' } },
    })
    const c = createCharacter(s!, 'x/x', { id: 'c' })
    expect(boundsOf(s!, c, 'a')).toEqual({ max: 6 })
    expect(c.values.a).toBe(6)
  })
})

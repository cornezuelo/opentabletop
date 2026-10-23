import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { sequence } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { applyResult, type SessionState } from './index'
import { newMember } from './party'
import {
  partyOf,
  shareTrip,
  startTrip,
  stepTrip,
  travelSystems,
  tripAvailability,
  tripFacts,
} from './trip'

/** A system whose party is its members: stats from them, rations they carry, wounds that block. */
const PACK = [
  { path: 'band/pack.yaml', content: 'id: band\nversion: 0.1.0\nlocale: en\nformat: 9\n' },
  {
    path: 'band/system.yaml',
    content: `
kind: system
name: Band
travel: travel-rules.default
bindings: bindings.default
sheet: sheet.companion
partySheet: sheet.crew
items: [items.gear]
`,
  },
  {
    path: 'band/sheet.yaml',
    content: `
kind: sheet
id: companion
values:
  survival: { default: 1 }
  health: { default: 3, min: 0, max: 3 }
  harm: { from: '{{3 - self.values.health}}' }
conditions:
  wounded: { blocks: [actions.forced-march] }
  broken-leg: { blocks: [travel.move] }
  faint: { when: { self.values.health: { lte: 1 } } }
  footsore: { when: { trip.marched: { gte: 1 } } }
items: { start: { ration: 2 } }
---
kind: sheet
id: crew
values: { morale: { default: 3 } }
items: {}
---
kind: items
id: gear
items: { ration: { name: Ration, tags: [food] } }
`,
  },
  {
    path: 'band/travel.yaml',
    content: `
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 7, lt: 19 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }] }
  rest: { do: [{ time: 60 }] }
  eat: { on: time.day-end, do: [{ effects: { party.items.ration: '-{{party.stats.mouths}}' } }] }
  forced-march: { do: [{ time: 60 }, { effects: { acting.values.health: -1 } }] }
  bandage: { do: [{ effects: { acting.conditions.wounded: false } }] }
  scout: { when: { roles.guide.values.survival: { gte: 2 } }, do: [{ effects: { roles.guide.values.health: -1 } }] }
  ambushed: { do: [{ effects: { party.members.values.health: -1, characters.mara.conditions.wounded: true } }] }
  soothe: { do: [{ effects: { party.members.values.harm: -1, party.members.conditions.faint: false } }] }
checks: [{ event: TRAIL, at: '07:00' }]
values: { lost: { blocks: [travel.move] } }
---
kind: bindings
on: { TRAIL: { resolve: table.trail } }
stats:
  navigation: { name: Navigation, from: { max: survival } }
  mouths: { from: { count: true } }
  fit: { from: { count: true, unless: { conditions: wounded } } }
roles:
  guide: { name: Guide }
---
kind: table
id: trail
roll: 1d2
entries:
  - { range: 1, result: Easy, when: { navigation: { gte: 3 } } }
  - { range: 1-2, result: Hard, effects: { party.members.values.health: -1 } }
`,
  },
]

const { registry } = loadPacks(PACK)
const band = travelSystems(registry).systems.find((s) => s.id === 'band')!
const party = partyOf(band)

const world: TravelWorld = {
  hexKm: 24,
  cell: () => ({ terrain: 'plains' }),
  neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
  distance: (x, y) => (x === y ? 0 : 1),
  edges: () => [],
}

const rations = (count: number) => [
  { key: 'ration', id: 'ration', from: 'band/gear', count, tags: ['food'], fields: {} },
]
const members = () => [
  newMember(party, { id: 'kael', values: { survival: 3 }, items: rations(3) }),
  newMember(party, { id: 'mara', values: { survival: 1 }, items: rations(1) }),
]
/** How many rations each member carries, and the party's own. */
const carried = (s: SessionState) => [
  ...s.members!.map((m) => (m.items ?? []).reduce((n, i) => n + i.count, 0)),
  (s.party?.items ?? []).reduce((n, i) => n + i.count, 0),
]

describe('the party is its members', () => {
  it('reads the sheet a system names, with its problems', () => {
    expect(band.sheet?.id).toBe('band/companion')
    const { problems } = travelSystems(
      loadPacks([
        ...PACK.slice(0, 2),
        { path: 'band/sheet.yaml', content: 'kind: sheet\nid: companion\nvalues: { a: {} }\n' },
        PACK[3],
      ]).registry,
    )
    // The bindings name values the sheet doesn't have.
    expect(problems.map((p) => p.message)).toEqual(
      expect.arrayContaining([`The members' sheet has no value "survival"`]),
    )
  })

  it('settles what holds by itself: made of values, read from the world, never written', () => {
    const { session } = startTrip({ system: band, location: 'a', members: members() })
    const oracle = createOracleEngine({ registry, random: sequence([0]) })
    // Hurt twice: harm follows health, and Faint holds by itself at 1 health.
    let s = stepTrip({ system: band, world, oracle }, session, {
      type: 'action',
      id: 'ambushed',
    }).state
    s = stepTrip({ system: band, world, oracle }, s, { type: 'action', id: 'ambushed' }).state
    expect(s.members!.map((m) => [m.values.harm, Object.keys(m.conditions).sort()])).toEqual([
      [2, ['faint']],
      [2, ['faint', 'wounded']],
    ])
    // Effects on them change nothing, and the journal says so, by whose.
    const soothe = stepTrip({ system: band, world, oracle }, s, { type: 'action', id: 'soothe' })
    expect(soothe.state.members).toEqual(s.members)
    expect(
      soothe.entries.filter((e) => e.code === 'NOT_WRITABLE').map((e) => e.data?.path),
    ).toEqual([
      'characters.kael.values.harm',
      'characters.mara.values.harm',
      'characters.kael.conditions.faint',
      'characters.mara.conditions.faint',
    ])
    // Footsore reads the world (`trip.marched`): set once the party has marched an hour.
    expect(s.members![0].conditions).not.toHaveProperty('footsore')
    const marched = stepTrip(
      { system: band, world, oracle },
      { ...s, acting: 'kael' },
      {
        type: 'action',
        id: 'forced-march',
      },
    )
    expect(marched.state.members![0].conditions).not.toHaveProperty('footsore')
    const moved = stepTrip({ system: band, world, oracle }, s, { type: 'setDestination', hex: 'b' })
    const walked = stepTrip({ system: band, world, oracle }, moved.state, { type: 'travel' })
    expect(walked.state.travel.travelledToday).toBeGreaterThanOrEqual(60)
    expect(walked.state.members!.every((m) => 'footsore' in m.conditions)).toBe(true)
    expect(walked.entries).toContainEqual(
      expect.objectContaining({
        code: 'CHANGED',
        data: { path: 'characters.kael.conditions.footsore', from: 0, to: 1 },
      }),
    )
  })

  it("makes the party's stats of its members, and its items theirs and its own together", () => {
    const { session } = startTrip({ system: band, location: 'a', members: members() })
    expect(session.stats).toMatchObject({ navigation: 3, mouths: 2, fit: 2 })
    const facts = tripFacts({ system: band, world }, session)
    expect(facts).toMatchObject({
      party: {
        members: ['kael', 'mara'],
        stats: { navigation: 3 },
        items: { ration: { count: 4, tags: ['food'] } },
      },
      characters: { kael: { values: { survival: 3 } }, mara: { conditions: [] } },
    })
    // A new member sets out with what the sheet says (`items.start`).
    expect(carried({ ...session, members: [newMember(party, { id: 'oro' })] })).toEqual([2, 0])
  })

  it('keeps its own stats and items without members', () => {
    const { session } = startTrip({ system: band, location: 'a' })
    expect(session.stats).toMatchObject({ navigation: 0, mouths: 0 })
    expect(session.members).toBeUndefined()
    // Every item of the system's catalogues is there, at 0 while nobody has it.
    expect(tripFacts({ system: band, world }, session)).toMatchObject({
      party: { items: { ration: { count: 0 } } },
    })
    // What it gains is its own sheet's.
    const s = applyResult(session, { effects: { 'party.items.ration': 3 } }, {}, party)
    expect(s.party!.items).toEqual([expect.objectContaining({ id: 'ration', count: 3 })])
  })

  it('takes what the party eats from whoever carries most, within their bounds', () => {
    const { session } = startTrip({
      system: band,
      location: 'a',
      members: members(),
      time: 7 * 60,
    })
    const oracle = createOracleEngine({ registry, random: sequence([0, 0]) })
    // Waiting until the next morning: dawn's trail check, eating at day-end (2 mouths), and
    // the next dawn's check as the wait reaches it.
    let s = session
    for (let i = 0; i < 3 && s.travel.time < 31 * 60; i++)
      s = stepTrip({ system: band, world, oracle }, s, { type: 'wait', until: 31 * 60 }).state
    // Kael carried most, so he gave both: 3 → 2 → 1, then they're equal.
    expect(carried(s)).toEqual([1, 1, 0])
    // What it ate counts in the trip's totals, by full name.
    expect(s.travel.totals?.spent).toMatchObject({ 'party.items.ration': 2 })
  })

  it("spends the party's own first, then shares out in order when the sheet says so", () => {
    const sheet = band.sheet!
    const ordered = {
      ...band,
      sheet: {
        ...sheet,
        def: { ...sheet.def, items: { ...sheet.def.items, share: 'order' as const } },
      },
    }
    const rules = partyOf(ordered)
    let s = startTrip({ system: ordered, location: 'a', members: members() }).session
    s = applyResult(s, { effects: { 'party.items.ration': 10 } }, {}, rules)
    // In order: all to the first member.
    expect(carried(s)).toEqual([13, 1, 0])
    s = { ...s, party: { ...s.party!, items: rations(2) } }
    s = applyResult(s, { effects: { 'party.items.ration': -4 } }, {}, rules)
    // The party's own two first, then two of Kael's.
    expect(carried(s)).toEqual([11, 1, 0])
    // More than they all have: none left, the bound hit and noted for the day.
    s = applyResult(s, { effects: { 'party.items.ration': -20 } }, {}, rules)
    expect(carried(s)).toEqual([0, 0, 0])
    expect(s.travel.reached?.below).toContain('party.items.ration')
  })

  it('asks who takes what the party gains, and who gives what it spends', () => {
    const rules = partyOf(band)
    let s: SessionState = {
      ...startTrip({ system: band, location: 'a', members: members() }).session,
      askShare: true,
    }
    // A gain: the rule gives to whoever carries least (Mara, 1 to Kael's 3), and asks.
    s = applyResult(s, { effects: { 'party.items.ration': 2 } }, {}, rules)
    expect(carried(s)).toEqual([3, 3, 0])
    expect(s.sharing).toEqual([
      expect.objectContaining({ item: 'ration', delta: 2, moved: { mara: 2 } }),
    ])
    // Nothing goes on while it waits.
    const time = s.travel.time
    s = stepTrip({ system: band, world }, s, { type: 'wait', until: time + 60 }).state
    expect(s.travel.time).toBe(time)
    // Kael takes them instead: Mara's two move to him, and the journal says so.
    s = shareTrip({ system: band, world }, s, { kael: 2 }).state
    expect(s.sharing).toBeUndefined()
    expect(carried(s)).toEqual([5, 1, 0])
    expect(s.journal.at(-1)).toMatchObject({
      code: 'SHARED',
      data: { path: 'party.items.ration', moved: { kael: 2 } },
    })
    // Giving more than one has, or not adding up, is refused.
    s = applyResult(s, { effects: { 'party.items.ration': -2 } }, {}, rules)
    expect(s.sharing?.[0]).toMatchObject({ delta: -2, moved: { kael: -2 } })
    expect(shareTrip({ system: band, world }, s, { mara: -2 }).state).toEqual(s)
    expect(shareTrip({ system: band, world }, s, { kael: -1 }).state).toEqual(s)
    // Mara gives one of them: Kael gets one back.
    s = shareTrip({ system: band, world }, s, { kael: -1, mara: -1 }).state
    expect(carried(s)).toEqual([4, 0, 0])
    // Without asking, nothing waits.
    s = { ...s, askShare: false }
    s = applyResult(s, { effects: { 'party.items.ration': -1 } }, {}, rules)
    expect(s.sharing).toBeUndefined()
  })

  it('applies effects on every member, one by id, and the acting one', () => {
    const { session } = startTrip({ system: band, location: 'a', members: members() })
    const oracle = createOracleEngine({ registry, random: sequence([0]) })
    let s = stepTrip({ system: band, world, oracle }, session, {
      type: 'action',
      id: 'ambushed',
    }).state
    expect(s.members!.map((m) => m.values.health)).toEqual([2, 2])
    expect(Object.keys(s.members![1].conditions)).toEqual(['wounded'])
    // A wounded member: one less fit.
    expect(s.stats.fit).toBe(1)

    // Nobody acting: the journal says so, and nothing changes.
    const before = s.members
    const step = stepTrip({ system: band, world, oracle }, s, { type: 'action', id: 'bandage' })
    expect(step.entries.some((e) => e.code === 'NOBODY_ACTING')).toBe(true)
    expect(step.state.members).toEqual(before)

    s = stepTrip(
      { system: band, world, oracle },
      { ...s, acting: 'mara' },
      { type: 'action', id: 'bandage' },
    ).state
    expect(s.members![1].conditions).toEqual({})
    expect(s.stats.fit).toBe(2)
  })

  it("blocks what a member's condition blocks, saying who", () => {
    const { session } = startTrip({ system: band, location: 'a', members: members() })
    const hurt = structuredClone(session)
    hurt.members![1].conditions = { wounded: {}, 'broken-leg': {} }
    const why = tripAvailability({ system: band, world }, hurt)
    expect(why['forced-march']).toEqual({ value: 'wounded', who: 'mara' })
    expect(why.travel).toEqual({ value: 'broken-leg', who: 'mara' })

    // Marching stops for it, and says who.
    const oracle = createOracleEngine({ registry, random: sequence([0]) })
    const planned = stepTrip({ system: band, world }, hurt, { type: 'setDestination', hex: 'b' })
    const { entries } = stepTrip({ system: band, world, oracle }, planned.state, { type: 'travel' })
    expect(entries.find((e) => e.code === 'TRAVEL_STOPPED')?.data).toMatchObject({
      reason: 'value',
      value: 'broken-leg',
      who: 'mara',
    })
  })

  it("rolls tables with the members' stats and applies their effects to them", () => {
    const { session } = startTrip({
      system: band,
      location: 'a',
      members: members(),
      time: 6 * 60,
    })
    // 1d2 rolls 1: navigation 3 makes it Easy.
    const oracle = createOracleEngine({ registry, random: sequence([0]) })
    const s = stepTrip({ system: band, world, oracle }, session, {
      type: 'wait',
      until: 8 * 60,
    }).state
    expect(s.journal.find((e) => e.code === 'ORACLE_RESULT')?.text).toBe('Easy')
    // With a weak band, it's Hard, and hurts everyone.
    const weak = startTrip({
      system: band,
      location: 'a',
      members: [newMember(party, { id: 'pip' })],
      time: 6 * 60,
    }).session
    const t = stepTrip(
      { system: band, world, oracle: createOracleEngine({ registry, random: sequence([0]) }) },
      weak,
      {
        type: 'wait',
        until: 8 * 60,
      },
    ).state
    expect(t.journal.find((e) => e.code === 'ORACLE_RESULT')?.text).toBe('Hard')
    expect(t.members![0].values.health).toBe(2)
  })

  it('reads where the characters are related: a hex, its region, a place in it', () => {
    const regionWorld: TravelWorld = {
      ...world,
      cell: (h) => ({ terrain: 'plains', region: h === 'b' ? 'Vale' : undefined, pois: ['inn'] }),
    }
    const company = members()
    company[0].relations = [{ to: 'hex:a', kind: 'home' }]
    company[1].relations = [
      { to: 'region:Vale', kind: 'bond', value: 2 },
      { to: 'poi:inn', kind: 'debt' },
    ]
    const { session } = startTrip({ system: band, location: 'a', members: company })
    const here = tripFacts({ system: band, world: regionWorld }, session)
    expect(here).toMatchObject({
      hex: { related: ['kael', 'mara'], relations: { home: ['kael'], debt: ['mara'] } },
      characters: {
        mara: { relations: { bond: ['region:Vale'] }, bonds: { bond: { 'region:Vale': 2 } } },
      },
    })
    const there = tripFacts(
      { system: band, world: regionWorld },
      { ...session, travel: { ...session.travel, location: 'b' } },
    )
    expect(there.hex).toMatchObject({
      related: ['mara'],
      relations: { bond: ['mara'], debt: ['mara'] },
    })
  })

  it('gives journey roles to characters: conditions read the holder, effects reach them', () => {
    const { session } = startTrip({ system: band, location: 'a', members: members() })
    expect(band.bindings?.roles).toEqual({ guide: { name: 'Guide' } })
    // Nobody guides: the scout's condition doesn't hold.
    expect(tripAvailability({ system: band, world }, session).scout).toMatchObject({
      condition: 'when',
    })
    const guided = { ...session, roles: { guide: 'kael' } }
    expect(tripFacts({ system: band, world }, guided)).toMatchObject({
      roles: { guide: { id: 'kael', values: { survival: 3 } } },
    })
    expect(tripAvailability({ system: band, world }, guided).scout).toBeUndefined()
    const s = stepTrip({ system: band, world }, guided, { type: 'action', id: 'scout' }).state
    expect(s.members!.map((m) => m.values.health)).toEqual([2, 3])
  })
})

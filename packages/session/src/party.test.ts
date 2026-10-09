import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { sequence } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { applyResult } from './index'
import { newMember } from './party'
import { partyOf, startTrip, stepTrip, travelSystems, tripAvailability, tripFacts } from './trip'

/** A system whose party is its members: stats from them, food they carry, wounds that block. */
const PACK = [
  { path: 'band/pack.yaml', content: 'id: band\nversion: 0.1.0\nlocale: en\nformat: 2\n' },
  {
    path: 'band/system.yaml',
    content: `
kind: system
name: Band
travel: default
bindings: default
sheet: companion
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
  rations: { default: 2, min: 0, max: 4 }
conditions:
  wounded: { blocks: [forced-march] }
  broken-leg: { blocks: [travel] }
`,
  },
  {
    path: 'band/travel.yaml',
    content: `
kind: travel-rules
day: { start: '07:00', nightfall: '19:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
resources: { food: { min: 0 } }
actions:
  eat: { on: day-end, do: [{ effects: { party.resources.food: '-{{party.stats.mouths}}' } }] }
  forced-march: { do: [{ time: 60 }, { effects: { acting.values.health: -1 } }] }
  bandage: { do: [{ effects: { acting.conditions.wounded: false } }] }
  ambushed: { do: [{ effects: { party.members.values.health: -1, characters.mara.conditions.wounded: true } }] }
checks: [{ event: TRAIL, at: day-start }]
---
kind: bindings
on: { TRAIL: { resolve: trail } }
stats:
  navigation: { name: Navigation, from: { max: survival } }
  mouths: { from: { count: true } }
  fit: { from: { count: true, unless: { conditions: wounded } } }
resources:
  food: { carried: rations }
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

const members = () => [
  newMember(party, { id: 'kael', values: { survival: 3, rations: 3 } }),
  newMember(party, { id: 'mara', values: { survival: 1, rations: 1 } }),
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
      expect.arrayContaining([
        `The members' sheet has no value "survival"`,
        `The members' sheet has no value "rations"`,
      ]),
    )
  })

  it("makes the party's stats and carried supplies of its members", () => {
    const { session } = startTrip({ system: band, location: 'a', members: members() })
    expect(session.stats).toMatchObject({ navigation: 3, mouths: 2, fit: 2 })
    expect(session.travel.resources.food).toBe(4)
    const facts = tripFacts({ system: band, world }, session)
    expect(facts).toMatchObject({
      party: { members: ['kael', 'mara'], stats: { navigation: 3 } },
      characters: { kael: { values: { survival: 3 } }, mara: { conditions: [] } },
    })
  })

  it('keeps its own stats and supplies without members', () => {
    const { session } = startTrip({ system: band, location: 'a' })
    expect(session.stats).toMatchObject({ navigation: 0, mouths: 0 })
    expect(session.travel.resources.food).toBe(6)
    expect(session.members).toBeUndefined()
  })

  it('takes what the party eats from whoever carries most, within their bounds', () => {
    const { session } = startTrip({
      system: band,
      location: 'a',
      members: members(),
      time: 7 * 60,
    })
    const oracle = createOracleEngine({ registry, random: sequence([0]) })
    // Waiting until the next morning: dawn's trail check, then eating at day-end (2 mouths).
    let s = session
    for (let i = 0; i < 3 && s.travel.time < 31 * 60; i++)
      s = stepTrip({ system: band, world, oracle }, s, { type: 'wait', until: 31 * 60 }).state
    const food = (id: string) => s.members!.find((m) => m.id === id)!.values.rations
    expect(s.travel.resources.food).toBe(2)
    expect(food('kael') + food('mara')).toBe(2)
    // Kael carried most, so he gave first: 3 → 2 → (equal) …
    expect(food('kael')).toBeGreaterThanOrEqual(food('mara'))
  })

  it('shares out in order when the system says so, and sums bounds for the engine', () => {
    const ordered = {
      ...band,
      bindings: {
        ...band.bindings!,
        resources: { food: { carried: 'rations', share: 'order' as const } },
      },
    }
    const s0 = startTrip({ system: ordered, location: 'a', members: members() }).session
    const s = applyResult(s0, { effects: { 'party.resources.food': 10 } }, {}, {}, partyOf(ordered))
    // Kael fills up first (to 4), then Mara (to 4): 8 in all, the members' max.
    expect(s.members!.map((m) => m.values.rations)).toEqual([4, 4])
    expect(s.travel.resources.food).toBe(8)
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
})

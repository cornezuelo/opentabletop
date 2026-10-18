import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { sequence } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { applyResult } from './index'
import { editPartySheet, newMember, refreshParty } from './party'
import { partyOf, startTrip, stepTrip, travelSystems, tripAvailability, tripFacts } from './trip'

/** A system with a sheet for the party itself (morale, routed) beside its characters'. */
const PACK = [
  { path: 'band/pack.yaml', content: 'id: band\nversion: 0.1.0\nlocale: en\nformat: 2\n' },
  {
    path: 'band/system.yaml',
    content:
      'kind: system\nname: Band\ntravel: default\nbindings: default\nsheet: companion\npartySheet: company\n',
  },
  {
    path: 'band/sheets.yaml',
    content: `
kind: sheet
id: companion
values: { survival: { default: 1 } }
---
kind: sheet
id: company
values:
  morale: { default: 3, min: 0, max: 5, track: true }
  renown: { default: 0 }
conditions:
  routed: { blocks: [travel] }
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
actions:
  sing: { do: [{ effects: { party.stats.morale: 1, party.values.renown: 1 } }] }
  flee: { do: [{ effects: { party.conditions.routed: true } }] }
checks: [{ event: GLOOM, at: day-start }]
---
kind: bindings
on: { GLOOM: { resolve: gloom } }
stats:
  morale: { name: Morale, from: { party: morale } }
---
kind: table
id: gloom
roll: 1d1
entries:
  - { range: 1, result: 'Gloom ({{party.values.morale}})', effects: { party.stats.morale: -9 } }
`,
  },
]

const { registry, diagnostics } = loadPacks(PACK)
const { systems, problems } = travelSystems(registry)
const band = systems.find((s) => s.id === 'band')!
const world: TravelWorld = {
  hexKm: 24,
  cell: () => ({ terrain: 'plains' }),
  neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
  distance: (x, y) => (x === y ? 0 : 1),
  edges: () => [],
}

describe('the party sheet: the party itself, beside its characters', () => {
  it('reads the party sheet a system names; a stat made of it takes its bounds', () => {
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(problems).toEqual([])
    expect(band.partySheet?.id).toBe('band/company')
    expect(band.bindings?.stats?.morale).toMatchObject({ min: 0, max: 5, default: 3 })
    const broken = travelSystems(
      loadPacks([
        PACK[0],
        { ...PACK[1], content: PACK[1].content.replace('partySheet: company\n', '') },
        ...PACK.slice(2),
      ]).registry,
    )
    expect(broken.problems.map((p) => p.message)).toContain(
      'the system has no party sheet (partySheet: in kind: system)',
    )
  })

  it('every trip has it, with or without characters; tables read it', () => {
    const { session } = startTrip({ system: band, location: 'a' })
    expect(session.party).toMatchObject({
      id: 'party',
      sheet: 'band/company',
      values: { morale: 3 },
    })
    expect(session.stats.morale).toBe(3)
    expect(tripFacts({ system: band, world }, session)).toMatchObject({
      party: { values: { morale: 3, renown: 0 }, conditions: [], stats: { morale: 3 } },
    })
    // Characters come and go; the party's sheet stays.
    const joined = structuredClone(session)
    joined.members = [newMember(partyOf(band), { id: 'kael' })]
    refreshParty(joined, partyOf(band))
    expect(joined.party?.values.morale).toBe(3)
    delete joined.members
    refreshParty(joined, partyOf(band))
    expect(joined.party?.values.morale).toBe(3)
  })

  it('a stat made of it and its value are one: effects on either change both, within its bounds', () => {
    const { session } = startTrip({ system: band, location: 'a', time: 7 * 60 })
    const sang = stepTrip({ system: band, world }, session, { type: 'action', id: 'sing' }).state
    expect(sang.stats.morale).toBe(4)
    expect(sang.party?.values).toEqual({ morale: 4, renown: 1 })
    // A table's effect on the stat lands on the sheet, at its minimum.
    const gloomy = applyResult(
      sang,
      { effects: { 'party.stats.morale': -9 } },
      band.bindings?.stats,
      {},
      partyOf(band),
    )
    expect(gloomy.party?.values.morale).toBe(0)
    expect(gloomy.stats.morale).toBe(0)
    // Changed by hand on the sheet, the stat follows; changed on the stat, the sheet does.
    const edited = structuredClone(gloomy)
    editPartySheet(edited, partyOf(band), { ...edited.party!, values: { morale: 5, renown: 1 } })
    expect(edited.stats.morale).toBe(5)
    const byStat = structuredClone(gloomy)
    byStat.stats.morale = 9
    expect(tripFacts({ system: band, world }, byStat)).toMatchObject({
      party: { values: { morale: 5 }, stats: { morale: 5 } },
    })
  })

  it('its conditions block what they say for the party', () => {
    const { session } = startTrip({ system: band, location: 'a', time: 7 * 60 })
    const fled = stepTrip({ system: band, world }, session, { type: 'action', id: 'flee' }).state
    expect(fled.party?.conditions).toHaveProperty('routed')
    expect(tripAvailability({ system: band, world }, fled).travel).toMatchObject({
      value: 'routed',
      who: 'party',
    })
  })

  it("a check's table reads and changes it", () => {
    const { session } = startTrip({ system: band, location: 'a', time: 6 * 60 })
    const oracle = createOracleEngine({ registry, random: sequence([0]) })
    const done = stepTrip({ system: band, world, oracle }, session, {
      type: 'wait',
      until: 8 * 60,
    })
    expect(done.entries.some((e) => e.text === 'Gloom (3)')).toBe(true)
    expect(done.state.party?.values.morale).toBe(0)
    // Saved and read back as plain data.
    expect(JSON.parse(JSON.stringify(done.state)).party.values.morale).toBe(0)
  })
})

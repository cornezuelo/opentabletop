import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { createCharacter } from '@open-tabletop/character-engine'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { encounterView, fightStarters } from './encounter'
import { startTrip, stepTrip, travelSystems, tripAvailability, tripFacts } from './trip'

/**
 * A made-up system whose fights go in turns: an ambush brings two goblins and starts a
 * fight; the party's members strike one goblin chosen, or flee; on each foe's turn the
 * goblins bite whoever leads; a round takes a minute; it ends with no goblin left.
 */
const pack = (encounter: string) => [
  { path: 'brawl/pack.yaml', content: 'id: brawl\nversion: 0.1.0\nlocale: en\nformat: 15\n' },
  {
    path: 'brawl/system.yaml',
    content: `kind: system\nname: Brawl\ntravel: travel-rules.default\nsheet: sheet.fighter\nbestiary: [bestiary.foes]\nencounter: ${encounter}\n`,
  },
  {
    path: 'brawl/rules.yaml',
    content: `
kind: sheet
id: fighter
values: { health: { default: 10, min: 0 }, speed: { default: 1 } }
---
kind: sheet
id: foe
values: { health: { default: 8, min: 0 }, speed: { default: 3 } }
conditions:
  down: { when: { self.values.health: { lte: 0 } }, leaves: true }
---
kind: bestiary
id: foes
sheet: sheet.foe
templates:
  goblin: { name: Goblin }
---
kind: travel-rules
travel: { hoursPerDay: 8, start: '07:00' }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
actions:
  march: { do: [{ travel.move: destination }] }
  rest: { do: [{ time: 60 }] }
  ambush: { do: [{ effects: { present.goblin: 2, encounter: start } }] }
  strike:
    params: { foe: { from: present.ids } }
    do: [{ effects: { 'characters[params.foe].values.health': -4 } }]
  flee: { do: [{ effects: { encounter: end } }] }
  bite:
    on: encounter.turn
    when: { encounter.side: foes }
    do: [{ effects: { characters.kael.values.health: -1 } }]
`,
  },
]

const systemOf = (encounter: string) => {
  const { registry, diagnostics } = loadPacks(pack(encounter))
  const { systems, problems } = travelSystems(registry)
  return { system: systems.find((s) => s.id === 'brawl')!, problems, diagnostics, registry }
}
const world: TravelWorld = {
  km: () => 24,
  place: () => ({ terrain: 'plains' }),
  neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
  distance: (x, y) => (x === y ? 0 : 1),
  connections: () => [],
}
const BY_SIDE =
  '{ order: { by: side }, actions: [actions.strike, actions.flee], minutes: 1, ends: { present.count: 0 } }'

function begin(encounter = BY_SIDE) {
  const { system, registry } = systemOf(encounter)
  const sheet = system.sheet!
  const members = ['kael', 'mira'].map((id) =>
    createCharacter(sheet.def, sheet.id, { id, name: id[0].toUpperCase() + id.slice(1) }),
  )
  const { session } = startTrip({ system, location: 'a', time: 8 * 60, seed: 's', members })
  const options = { system, world, oracle: createOracleEngine({ registry, random: seeded(1) }) }
  return { system, options, session }
}
const codes = (entries: { code: string; data?: Record<string, unknown> }[]) =>
  entries
    .filter((e) => e.code.startsWith('ENCOUNTER_'))
    .map((e) => (e.code === 'ENCOUNTER_TURN' ? `turn ${e.data?.id}` : e.code))

describe('an encounter: a fight in turns', () => {
  it('a system declares how its fights go; what is wrong in it is a problem', () => {
    const { system, problems } = systemOf(BY_SIDE)
    expect(problems.filter((p) => p.severity === 'error')).toEqual([])
    expect(system.encounter).toEqual({
      order: { by: 'side' },
      actions: ['strike', 'flee'],
      minutes: 1,
      ends: { 'present.count': 0 },
    })
    const bad = systemOf('{ order: { by: chance }, actions: [actions.dance], minutes: -1 }')
    expect(bad.system.encounter).toBeUndefined()
    expect(bad.problems.map((p) => p.message)).toEqual(
      expect.arrayContaining([
        'expected side or participant',
        'the system has no action "actions.dance"',
        'expected the minutes a round takes',
      ]),
    )
  })

  it("an effect starts it: the party's side first, each member's turn waits for the player", () => {
    const { options, session } = begin()
    const done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    expect(codes(done.entries)).toEqual(['ENCOUNTER_STARTED', 'ENCOUNTER_ROUND', 'turn kael'])
    expect(done.state.encounter).toMatchObject({
      stage: 'acting',
      round: 1,
      order: ['kael', 'mira', 'goblin', 'goblin-2'],
      turn: 0,
    })
    // Whoever's turn it is acts; conditions read the encounter.
    expect(done.state.acting).toBe('kael')
    const facts = tripFacts(options, done.state)
    expect(facts.encounter).toEqual({
      round: 1,
      order: ['kael', 'mira', 'goblin', 'goblin-2'],
      turn: 'kael',
      side: 'party',
    })
  })

  it('a fight closes travelling and the other actions; its own only on a turn of the party', () => {
    const { options, session, system } = begin()
    const before = tripAvailability(options, session)
    expect(before.strike).toBeUndefined()
    expect(before.rest).toBeUndefined()
    const fighting = stepTrip(options, session, { type: 'action', id: 'ambush' }).state
    const now = tripAvailability(options, fighting)
    expect(now.travel).toEqual({ encounter: 'fight' })
    expect(now.rest).toEqual({ encounter: 'fight' })
    expect(now.strike).toBeUndefined()
    // What it closes isn't done, even if asked for.
    const refused = stepTrip(options, fighting, { type: 'action', id: 'rest' })
    expect(refused.state).toBe(fighting)
    expect(system.encounter).toBeDefined()
  })

  it("turns pass as the members act; the foes' go by themselves; rounds take their minutes; it ends when none is left", () => {
    const { options, session } = begin()
    let done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    const start = done.state.travel.time
    const strike = (foe: string) =>
      (done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } }))
    strike('goblin')
    expect(codes(done.entries)).toEqual(['turn mira'])
    expect(done.state.acting).toBe('mira')
    // Mira's blow: the goblins bite on their turns, Kael's turn comes in round 2.
    strike('goblin-2')
    expect(codes(done.entries)).toEqual([
      'turn goblin',
      'turn goblin-2',
      'ENCOUNTER_ROUND',
      'turn kael',
    ])
    expect(done.state.members!.find((m) => m.id === 'kael')!.values.health).toBe(8)
    expect(done.state.encounter).toMatchObject({ round: 2, turn: 0 })
    expect(done.state.travel.time).toBe(start + 1)
    // The goblins fall: the fight ends, and who acted before it acts again.
    strike('goblin')
    strike('goblin-2')
    expect(codes(done.entries)).toEqual(['ENCOUNTER_ENDED'])
    expect(done.state.encounter).toBeUndefined()
    expect(done.state.present ?? []).toEqual([])
    expect(tripAvailability(options, done.state).travel).toBeUndefined()
  })

  it("an action's effect ends it; so can the player, and start one by hand", () => {
    const { options, session } = begin()
    let done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    done = stepTrip(options, done.state, { type: 'action', id: 'flee' })
    expect(codes(done.entries)).toEqual(['ENCOUNTER_ENDED'])
    expect(done.state.encounter).toBeUndefined()
    // Started by hand with the goblins still here, then called off.
    done = stepTrip(options, done.state, { type: 'encounter', what: 'start' })
    expect(codes(done.entries)).toEqual(['ENCOUNTER_STARTED', 'ENCOUNTER_ROUND', 'turn kael'])
    done = stepTrip(options, done.state, { type: 'encounter', what: 'end' })
    expect(codes(done.entries)).toEqual(['ENCOUNTER_ENDED'])
  })

  it("the player's actions that start a fight: the host's own button isn't needed", () => {
    const { system } = systemOf(BY_SIDE)
    expect(fightStarters(system.rules)).toEqual(['ambush'])
  })

  it('a fight panel sees the round, who acts in order, whose turn it is and who has acted', () => {
    const { options, session } = begin()
    expect(encounterView(session)).toBeUndefined()
    let done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    // Round 2, Kael's turn: the first goblin fell and left the order, the second still here.
    const view = encounterView(done.state)!
    expect(view.round).toBe(2)
    expect(view.choosing).toBe(true)
    expect(view.fighters.map((f) => [f.name, f.side, f.acting, f.done])).toEqual([
      ['Kael', 'party', true, false],
      ['Mira', 'party', false, false],
      ['Goblin 2', 'foes', false, false],
    ])
    done = stepTrip(options, done.state, {
      type: 'action',
      id: 'strike',
      with: { foe: 'goblin-2' },
    })
    const after = encounterView(done.state)!
    expect(after.fighters.map((f) => [f.id, f.acting, f.done, f.gone])).toEqual([
      ['kael', false, true, false],
      ['mira', true, false, false],
      ['goblin-2', false, false, false],
    ])
  })

  it('by participant: each one by the value it rolls, highest first', () => {
    const { options, session } = begin(
      "{ order: { by: participant, value: '{{acting.values.speed}}' }, actions: [actions.strike] }",
    )
    const done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    // The goblins are faster: they bite before Kael's first turn.
    expect(done.state.encounter?.order).toEqual(['goblin', 'goblin-2', 'kael', 'mira'])
    expect(codes(done.entries)).toEqual([
      'ENCOUNTER_STARTED',
      'ENCOUNTER_ROUND',
      'turn goblin',
      'turn goblin-2',
      'turn kael',
    ])
    expect(done.state.members!.find((m) => m.id === 'kael')!.values.health).toBe(8)
  })

  it("encounter.start's actions may say which side goes first", () => {
    const { options, session } = begin(
      '{ order: { by: side }, actions: [actions.strike], ends: { present.count: 0 } }',
    )
    const rules = options.system.rules
    rules.actions = {
      ...rules.actions,
      surprise: { on: 'encounter.start', do: [{ effects: { 'encounter.first': 'foes' } }] },
    }
    const done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    expect(done.state.encounter?.order).toEqual(['goblin', 'goblin-2', 'kael', 'mira'])
  })
})

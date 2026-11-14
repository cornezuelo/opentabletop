import type { SessionState } from './index'
import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { createCharacter } from '@open-tabletop/character-engine'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { encounterView, fightStarters, parseEncounter } from './encounter'
import { applyResult } from './index'
import { beatsOf, notableLines } from './journal'
import {
  partyOf,
  startTrip as startPaced,
  stepTrip,
  travelSystems,
  tripAvailability,
  tripFacts,
} from './trip'

/**
 * Trips whose foes play their turns one after another at once (**Foes' turns at once**): what
 * these tests read is each fight's whole round; waiting for Next is tested apart.
 */
const startTrip = (o: Parameters<typeof startPaced>[0]) => {
  const started = startPaced(o)
  const session: SessionState = { ...started.session, foesAtOnce: true }
  return { ...started, session }
}

/**
 * A made-up system whose fights go in turns: an ambush brings two goblins and starts a
 * fight; the party's members strike one goblin chosen, or flee; on each foe's turn the
 * goblins bite whoever leads; a round takes a minute; it ends with no goblin left. A party
 * played as a whole has a sheet of its own, that foes may hit too.
 */
const pack = (encounter: string) => [
  { path: 'brawl/pack.yaml', content: 'id: brawl\nversion: 0.1.0\nlocale: en\nformat: 15\n' },
  {
    path: 'brawl/system.yaml',
    content: `kind: system\nname: Brawl\ntravel: travel-rules.default\nsheet: sheet.fighter\npartySheet: sheet.band\nbestiary: [bestiary.foes]\nencounter: ${encounter}\n`,
  },
  {
    path: 'brawl/rules.yaml',
    content: `
kind: sheet
id: fighter
values: { health: { default: 10, min: 0 }, speed: { default: 1 } }
---
kind: sheet
id: band
values: { health: { default: 10, min: 0 } }
---
kind: sheet
id: foe
values: { health: { default: 8, min: 0 }, speed: { default: 3 }, rage: { default: 0 } }
conditions:
  down: { when: { self.values.health: { lte: 0 } }, leaves: true }
  dazed: { lasts: rounds }
  braced: { lasts: turns }
---
kind: bestiary
id: foes
sheet: sheet.foe
templates:
  goblin: { name: Goblin }
  ogre: { name: Ogre, actions: table.ogre-turn }
  troll: { name: Troll, actions: table.troll-turn }
---
kind: table
id: troll-turn
roll: 1d1
entries:
  - { range: 1, result: The troll sweeps, set: { target: party.members.all }, effects: { 'characters[target].values.health': '-{{1d4 + characters[target].values.speed}}' } }
---
kind: table
id: ogre-turn
roll: 1d1
entries:
  - { range: 1, result: The ogre smashes, set: { target: party.members.highest.values.health }, effects: { 'characters[target].values.health': -3 } }
---
kind: table
id: foe-turn
roll: 1d1
entries:
  - { range: 1, result: A blow, set: { target: party.members.random }, effects: { 'characters[target].values.health': -1 } }
---
kind: table
id: lurk
roll: 1d1
entries:
  - { range: 1, result: They were waiting, effects: { present.goblin: 2, encounter: start, encounter.first: foes } }
---
kind: table
id: taunt
roll: 1d1
entries:
  - { range: 1, result: Taunted, effects: { 'characters[params.foe].values.rage': 1, acting.values.rage: 1, characters.kael.values.rage: 1, acting.values.fury: 1 } }
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
  daze:
    params: { foe: { from: present.ids } }
    do: [{ effects: { 'characters[params.foe].conditions.dazed': 2, 'characters[params.foe].conditions.braced': 1 } }]
  # After a fight, each of the party catches their breath: once each, with them acting.
  breathe:
    on: encounter.end
    for: party.members
    do: [{ effects: { acting.values.speed: 1 } }]
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

  it("foes act: a template's own table, else the system's, each aimed at a member", () => {
    const { options, session } = begin(
      '{ order: { by: side }, actions: [actions.strike], foes: table.foe-turn, ends: { present.count: 0 } }',
    )
    const s = applyResult(session, { effects: { 'present.ogre': 1 } }, {}, partyOf(options.system))
    const health = (st: typeof s, id: string) => st.members!.find((m) => m.id === id)!.values.health
    let done = stepTrip(options, s, { type: 'action', id: 'ambush' })
    // Kael and Mara strike the goblins; then the foes' turns: each goblin hears the moment
    // (a bite at Kael) and rolls the system's table (a blow at one of them); the ogre rolls
    // its own: a smash at whoever has the most health.
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    const rolled = done.entries.filter((e) => e.code === 'ORACLE_RESULT').map((e) => e.data?.table)
    expect(rolled).toEqual(['brawl/ogre-turn', 'brawl/foe-turn'])
    // 20 health between them before; the bites (-1 each, two foes left), the blow (-1), the smash (-3).
    expect(health(done.state, 'kael') + health(done.state, 'mira')).toBe(20 - 2 - 1 - 3)
    expect(done.state.encounter?.round).toBe(2)
  })

  it("the player's rolls: a foe's turn waits for the total the player rolled, or rolls it for them", () => {
    const { options, session } = begin(
      '{ order: { by: side }, actions: [actions.strike], foes: table.foe-turn, ends: { present.count: 0 } }',
    )
    let done = stepTrip(
      options,
      { ...session, rollWay: 'matters' },
      { type: 'action', id: 'ambush' },
    )
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    // The first goblin is down; the other's turn waits (after its moment: the bite at Kael),
    // its table's roll the player's, as a check that waits.
    const check = done.state.travel.pendingChecks[0]!
    expect(done.state.yours).toEqual([
      expect.objectContaining({
        id: check.id,
        table: 'brawl/foe-turn',
        dice: '1d1',
        who: 'goblin-2',
      }),
    ])
    expect(done.state.encounter?.stage).toBe('acted')
    expect(encounterView(done.state)?.fighters.find((f) => f.acting)?.id).toBe('goblin-2')
    expect(done.entries.at(-1)).toMatchObject({
      code: 'CHECK_YOURS',
      data: { id: check.id, dice: '1d1', who: 'goblin-2' },
    })
    // Meanwhile the party's actions wait too.
    const closed = stepTrip(options, done.state, {
      type: 'action',
      id: 'strike',
      with: { foe: 'goblin-2' },
    })
    expect(closed.state).toBe(done.state)
    // The player's 1 is its blow; the round ends, and the party's turn comes again.
    const rolled = stepTrip(options, done.state, { type: 'rolled', id: check.id, total: 1 })
    const roll = rolled.entries.find((e) => e.code === 'ROLLED')
    expect(roll?.data?.rolls).toEqual([
      expect.objectContaining({ source: 'brawl/foe-turn', byHand: true }),
    ])
    expect(rolled.state.handTotal).toBeUndefined()
    expect(rolled.state.yours).toBeUndefined()
    expect(rolled.state.encounter).toMatchObject({ stage: 'acting', round: 2 })
    const kael = rolled.state.members!.find((m) => m.id === 'kael')!.values.health
    const mira = rolled.state.members!.find((m) => m.id === 'mira')!.values.health
    // The goblin standing bit Kael (-1), then its blow landed (-1); the fallen one had no turn.
    expect(kael + mira).toBe(20 - 1 - 1)
    // Rolled for them (going on from the check), it plays as the computer's roll.
    const forMe = stepTrip(options, done.state, { type: 'resolveCheck', id: check.id })
    expect(forMe.state.encounter?.round).toBe(2)
    expect(
      forMe.entries.find((e) => e.code === 'ROLLED')?.data?.rolls as { byHand?: true }[],
    ).toEqual([expect.not.objectContaining({ byHand: true })])
    // With nothing waiting, a total given does nothing.
    expect(stepTrip(options, rolled.state, { type: 'rolled', id: check.id, total: 1 }).state).toBe(
      rolled.state,
    )
    // The computer rolls everything: nothing waits.
    let auto = stepTrip(options, session, { type: 'action', id: 'ambush' })
    auto = stepTrip(options, auto.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    auto = stepTrip(options, auto.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    expect(auto.state.yours).toBeUndefined()
    expect(auto.state.encounter?.round).toBe(2)
  })

  it('foes aim at a party played as a whole through its own sheet', () => {
    const { system, registry } = systemOf(
      '{ order: { by: side }, actions: [actions.strike], foes: table.foe-turn, ends: { present.count: 0 } }',
    )
    const options = { system, world, oracle: createOracleEngine({ registry, random: seeded(1) }) }
    const { session } = startTrip({ system, location: 'a', time: 8 * 60, seed: 's' })
    const s = applyResult(session, { effects: { 'present.ogre': 1 } }, {}, partyOf(system))
    let done = stepTrip(options, s, { type: 'action', id: 'ambush' })
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    // The two goblins' blows (-1 each) and the ogre's smash (-3) land on the party; the bites
    // at Kael find nobody.
    expect(done.state.party!.values.health).toBe(10 - 1 - 1 - 3)
  })

  it('a blow at everyone (party.members.all) lands on each, read and rolled for each', () => {
    const { system, registry } = systemOf(BY_SIDE)
    const sheet = system.sheet!
    const options = { system, world, oracle: createOracleEngine({ registry, random: seeded(1) }) }
    const health = (
      s: { members?: { id: string; values: Record<string, number> }[] },
      id: string,
    ) => s.members!.find((m) => m.id === id)!.values.health
    let differ = false
    for (let n = 0; n < 12; n++) {
      const members = ['kael', 'mira'].map((id) =>
        createCharacter(sheet.def, sheet.id, { id, name: id }),
      )
      const { session } = startTrip({ system, location: 'a', time: 8 * 60, seed: `s${n}`, members })
      let s = applyResult(session, { effects: { 'present.troll': 1 } }, {}, partyOf(system))
      s = stepTrip(options, s, { type: 'action', id: 'ambush' }).state
      // Both of the party strike; then the foes' turns.
      s = stepTrip(options, s, { type: 'action', id: 'strike', with: { foe: 'goblin' } }).state
      const done = stepTrip(options, s, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
      const sweeps = done.entries.filter(
        (e) => e.code === 'ORACLE_RESULT' && e.data?.table === 'brawl/troll-turn',
      )
      // One line for each of them, each with its own roll.
      expect(sweeps.map((e) => (e.data?.value as { target: string }).target)).toEqual([
        'kael',
        'mira',
      ])
      const lost = 10 - health(done.state, 'mira')
      // 1d4 and the target's own speed (1).
      expect(lost).toBeGreaterThanOrEqual(2)
      expect(lost).toBeLessThanOrEqual(5)
      // Kael was bitten too, on each foe's turn (the troll's and the goblin left standing).
      const kael = 10 - 2 - health(done.state, 'kael')
      expect(kael).toBeGreaterThanOrEqual(2)
      if (kael !== lost) differ = true
    }
    expect(differ).toBe(true)
  })

  it('an action on a moment for each member (for: party.members): each of them acting in turn', () => {
    const { options, session } = begin()
    let done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    // Kael flees on his turn: the fight ends, and each of them catches their breath.
    done = stepTrip(options, done.state, { type: 'action', id: 'flee' })
    expect(done.state.encounter).toBeUndefined()
    expect(done.state.members!.map((m) => [m.id, m.values.speed])).toEqual([
      ['kael', 2],
      ['mira', 2],
    ])
    expect(done.state.dueForEach).toBeUndefined()
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

  it('conditions given for a while: counted down by rounds or by its own turns, gone with the fight', () => {
    const { options, session } = begin(
      '{ order: { by: side }, actions: [actions.daze, actions.strike, actions.flee] }',
    )
    const goblin = (st: typeof session) =>
      st.present!.find((p) => p.character.id === 'goblin')!.character.conditions
    let done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    // Kael's turn (round 1): two rounds dazed, braced until its next turn.
    done = stepTrip(options, done.state, { type: 'action', id: 'daze', with: { foe: 'goblin' } })
    expect(goblin(done.state)).toMatchObject({ dazed: { left: 2 }, braced: { left: 1 } })
    // Mira's turn; then the goblins': braced is gone at the goblin's own turn, and round 2
    // begins with one round of dazed left.
    done = stepTrip(options, done.state, {
      type: 'action',
      id: 'strike',
      with: { foe: 'goblin-2' },
    })
    expect(done.state.encounter?.round).toBe(2)
    expect(goblin(done.state)).toEqual({ dazed: { since: 480, left: 1 } })
    expect(
      done.entries.some((e) => e.code === 'CHANGED' && JSON.stringify(e).includes('braced')),
    ).toBe(true)
    // Round 3: gone.
    done = stepTrip(options, done.state, { type: 'action', id: 'daze', with: { foe: 'goblin-2' } })
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    expect(done.state.encounter?.round).toBe(3)
    expect(goblin(done.state).dazed).toBeUndefined()
    // The fight over, whatever was given for a while is gone (goblin-2's last round).
    const second = (st: typeof session) =>
      st.present!.find((p) => p.character.id === 'goblin-2')?.character.conditions
    expect(second(done.state)?.dazed).toEqual({ since: 480, left: 1 })
    done = stepTrip(options, done.state, { type: 'action', id: 'flee' })
    expect(done.state.encounter).toBeUndefined()
    expect(second(done.state)?.dazed).toBeUndefined()
  })

  it('a turn is lost while the system says so, its moment still said, and counted down after', () => {
    const { options, session } = begin(
      '{ order: { by: side }, actions: [actions.daze, actions.strike, actions.flee], skip: { acting.conditions: braced } }',
    )
    let done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    // Kael braces the goblin until its next turn: that turn is lost.
    done = stepTrip(options, done.state, { type: 'action', id: 'daze', with: { foe: 'goblin' } })
    done = stepTrip(options, done.state, {
      type: 'action',
      id: 'strike',
      with: { foe: 'goblin-2' },
    })
    const skipped = done.entries.filter((e) => e.code === 'ENCOUNTER_SKIPPED')
    expect(skipped.map((e) => e.data?.id)).toEqual(['goblin'])
    // Its moment still came: the goblins bite Kael on each of their turns, the lost one too.
    expect(done.state.members!.find((m) => m.id === 'kael')!.values.health).toBe(8)
    // Braced was counted down at that turn, after it was read: gone.
    const goblin = done.state.present!.find((p) => p.character.id === 'goblin')!.character
    expect(goblin.conditions.braced).toBeUndefined()
    // Back to Kael, round 2.
    expect(done.state.encounter).toMatchObject({ round: 2, stage: 'acting' })
    expect(systemOf('{ actions: [actions.strike], skip: { not: 1 } }').problems.length).toBe(1)
  })

  it('several turns a round: each one as many times in a row as its turns say', () => {
    const { options, session } = begin(
      "{ order: { by: side }, actions: [actions.strike, actions.flee], turns: '{{acting.values.speed}}' }",
    )
    // Members' speed 1, the goblins' 3.
    let done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    const order = done.state.encounter!.order
    expect(order).toEqual([
      'kael',
      'mira',
      ...Array(3).fill('goblin'),
      ...Array(3).fill('goblin-2'),
    ])
    expect(encounterView(done.state)!.fighters).toHaveLength(8)
    // Kael and Mira strike; the goblins then take their three turns each (the bite on each).
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    const turns = done.entries.filter((e) => e.code === 'ENCOUNTER_TURN').map((e) => e.data?.id)
    expect(turns.filter((id) => id === 'goblin-2')).toHaveLength(3)
    expect(done.state.members!.find((m) => m.id === 'kael')!.values.health).toBe(10 - 3)
    // The goblin felled, round 2's order keeps the rest, with their turns again.
    expect(done.state.encounter!.order).toEqual(['kael', 'mira', ...Array(3).fill('goblin-2')])
    expect(parseEncounter({ actions: [], turns: [2] }, []).errors).toEqual([
      "encounter.turns: expected how many turns each one takes ('{{1 + acting.values.extra}}')",
    ])
  })

  it("effects on a copy's values are checked against the bestiary's sheets too", () => {
    const { problems } = systemOf(BY_SIDE)
    const messages = problems.map((p) => p.message).filter((m) => m.includes('rage'))
    // `rage` is only on the foes' sheet: a copy's (by brackets, by its id, the one acting)
    // is known, since any of them may be one of those present.
    expect(messages).toEqual([])
    // A value nobody's sheet has is still a problem.
    expect(problems.map((p) => p.message)).toContain(
      'Effect on "acting.values.fury", which the members\' sheet doesn\'t declare',
    )
  })

  it('a table rolled may start a fight and say which side goes first', () => {
    const { options, session } = begin()
    const rules = options.system.rules
    rules.actions = { ...rules.actions, lurk: { do: [{ roll: 'table.lurk' }] } }
    const done = stepTrip(options, session, { type: 'action', id: 'lurk' })
    expect(done.state.encounter?.first).toBe('foes')
    expect(done.state.encounter?.order).toEqual(['goblin', 'goblin-2', 'kael', 'mira'])
  })

  it('reads the highest and the lowest of a value among those present and the members', () => {
    const { options, session } = begin()
    let s = applyResult(session, { effects: { 'present.goblin': 2 } }, {}, partyOf(options.system))
    s = applyResult(
      s,
      { effects: { 'characters.goblin-2.values.speed': 2, 'characters.mira.values.speed': 4 } },
      {},
      partyOf(options.system),
    )
    const facts = tripFacts(options, s) as {
      present: {
        highest: { values: Record<string, number> }
        lowest: { values: Record<string, number> }
      }
      party: {
        highest: { values: Record<string, number> }
        lowest: { values: Record<string, number> }
      }
    }
    expect(facts.present.highest.values.speed).toBe(5)
    expect(facts.present.lowest.values.speed).toBe(3)
    expect(facts.party.highest.values.speed).toBe(5)
    expect(facts.party.lowest.values.speed).toBe(1)
  })
})

describe('moments of play (beats)', () => {
  it('a step is one moment, each turn of a fight played on in it another, its round with the first', () => {
    const { options, session } = begin()
    let done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    // The ambush and the fight it starts; then the first round, with Kael's turn.
    expect(beatsOf(done.entries).map((b) => codes(b.entries))).toEqual([
      ['ENCOUNTER_STARTED'],
      ['ENCOUNTER_ROUND', 'turn kael'],
    ])
    done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
    done = stepTrip(options, done.state, {
      type: 'action',
      id: 'strike',
      with: { foe: 'goblin-2' },
    })
    // Mira's blow, each goblin's turn, then round 2 with Kael's turn.
    const told = beatsOf(done.entries)
    expect(told.map((b) => codes(b.entries))).toEqual([
      [],
      ['turn goblin'],
      ['turn goblin-2'],
      ['ENCOUNTER_ROUND', 'turn kael'],
    ])
    // The state's own lines, each marked with its moment's first line.
    expect(done.entries.every((e) => done.state.journal.includes(e))).toBe(true)
    expect(told[1]!.entries.every((e) => e.beat === Number(told[1]!.id.slice(1)))).toBe(true)
    // The whole journal reads the same; a note written by hand is a moment of its own.
    const all = beatsOf([
      ...done.state.journal,
      { id: 'j999', time: 0, at: '', source: 'user', code: 'NOTE' },
    ])
    expect(all.at(-1)!.entries.map((e) => e.code)).toEqual(['NOTE'])
    expect(all.at(-2)!.id).toBe(told.at(-1)!.id)
  })

  it('important moments: a fight starting, a condition gained; a result says so or not', () => {
    const { options, session } = begin()
    const done = stepTrip(options, session, { type: 'action', id: 'ambush' })
    const first = beatsOf(done.entries)[0]!
    expect(notableLines(first.entries).map((e) => e.code)).toEqual(['ENCOUNTER_STARTED'])
    const line = (code: string, data: Record<string, unknown>) => ({
      id: 'j1',
      code,
      source: 'travel',
      data,
    })
    expect(
      notableLines([line('CHANGED', { path: 'characters.kael.conditions.down', from: 0, to: 1 })]),
    ).toHaveLength(1)
    expect(
      notableLines([line('CHANGED', { path: 'characters.kael.conditions.down', from: 1, to: 0 })]),
    ).toHaveLength(0)
    expect(notableLines([line('ORACLE_RESULT', { value: { notable: true } })])).toHaveLength(1)
    expect(
      notableLines([line('ORACLE_RESULT', { value: {} }), line('CHECK_PAUSED', {})]),
    ).toHaveLength(1)
    // What a result that isn't important sets off isn't either, up to the next result.
    expect(
      notableLines([
        line('ORACLE_RESULT', { value: { notable: false } }),
        line('CHECK_PAUSED', {}),
        line('ORACLE_RESULT', { value: {} }),
        line('CLOCK_FILLED', {}),
      ]).map((e) => e.code),
    ).toEqual(['CLOCK_FILLED'])
  })
})

describe('the foes’ turns one at a time', () => {
  it('each foe’s turn waits for Next before another foe’s; a turn of the party’s needs none', () => {
    const { options, session } = begin()
    const paced = { ...session, foesAtOnce: undefined }
    let done = stepTrip(options, paced, { type: 'action', id: 'ambush' })
    const strike = (foe: string) =>
      (done = stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe } }))
    strike('goblin')
    strike('goblin-2')
    // The first goblin's turn, read: the fight waits, the second goblin up next.
    expect(codes(done.entries)).toEqual(['turn goblin'])
    expect(done.state.encounter?.stage).toBe('shown')
    expect(encounterView(done.state)).toMatchObject({ next: 'goblin-2', choosing: false })
    expect(encounterView(done.state)!.fighters[2]).toMatchObject({ id: 'goblin', done: true })
    // Nothing else goes on meanwhile.
    expect(
      stepTrip(options, done.state, { type: 'action', id: 'strike', with: { foe: 'goblin' } })
        .state,
    ).toBe(done.state)
    // Next: the second goblin's turn, then round 2 and Kael's, which waits by itself.
    done = stepTrip(options, done.state, { type: 'encounter', what: 'next' })
    expect(codes(done.entries)).toEqual(['turn goblin-2', 'ENCOUNTER_ROUND', 'turn kael'])
    expect(done.state.encounter?.stage).toBe('acting')
    // Next when nothing waits for it does nothing.
    expect(stepTrip(options, done.state, { type: 'encounter', what: 'next' }).state).toBe(
      done.state,
    )
    // Skipping pauses plays them at once too.
    const skipping = stepTrip(
      options,
      { ...paced, skipPauses: true },
      { type: 'action', id: 'ambush' },
    )
    let s = skipping.state
    for (const foe of ['goblin', 'goblin-2'])
      s = stepTrip(options, s, { type: 'action', id: 'strike', with: { foe } }).state
    expect(s.encounter?.stage).toBe('acting')
  })
})

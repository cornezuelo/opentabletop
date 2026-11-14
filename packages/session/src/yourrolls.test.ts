import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { migrateRolls } from './effects'
import { newMember } from './party'
import { partyOf, startTrip, stepTrip, travelSystems } from './trip'

/**
 * The player's rolls (`rollWay`): at dawn the road (a plain table), an omen (a table that
 * can give an important result) and the wind (rolled by weight, always the computer's).
 */
const PACK = [
  { path: 'road/pack.yaml', content: 'id: road\nversion: 0.1.0\nlocale: en\nformat: 15\n' },
  {
    path: 'road/system.yaml',
    content:
      'kind: system\nname: Road\ntravel: travel-rules.default\nbindings: bindings.default\nsheet: sheet.walker\n',
  },
  {
    path: 'road/travel.yaml',
    content: `
kind: sheet
id: walker
values: { charisma: { default: 0 } }
---
kind: travel-rules
travel: { hoursPerDay: 8, start: '07:00' }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks: [{ event: ROAD, at: '07:00' }, { event: OMEN, at: '07:00' }, { event: WIND, at: '07:00' }]
---
kind: bindings
on: { ROAD: { resolve: table.road }, OMEN: { resolve: table.omen }, WIND: { resolve: table.wind } }
---
kind: table
id: road
roll: '1d6 + {{trip.day}}'
entries:
  - { range: 1-3, result: Mud }
  - { range: 4-6, result: Dry }
---
kind: table
id: omen
roll: 1d6
entries:
  - { range: 1-5, result: Nothing }
  - { range: 6, result: A raven, notable: true }
---
kind: table
id: wind
entries:
  - { weight: 1, result: Calm }
`,
  },
]

const { registry } = loadPacks(PACK)
const road = travelSystems(registry).systems.find((s) => s.id === 'road')!
const world: TravelWorld = {
  km: () => 24,
  place: () => ({ terrain: 'plains' }),
  neighbors: () => [],
  distance: () => 0,
  connections: () => [],
}

function dawn(rollWay?: 'matters' | 'all') {
  const oracle = createOracleEngine({ registry, random: seeded(1) })
  const members = [newMember(partyOf(road), { id: 'kael' })]
  const { session } = startTrip({ system: road, location: 'a', members, time: 6 * 60 })
  const options = { system: road, world, oracle }
  const s = rollWay ? { ...session, rollWay } : session
  return { options, done: stepTrip(options, s, { type: 'wait', until: 8 * 60 }) }
}

const results = (entries: { code: string; text?: string }[]) =>
  entries.filter((e) => e.code === 'ORACLE_RESULT').map((e) => e.text)

describe("the player's rolls", () => {
  it('the computer rolls everything by default', () => {
    expect(travelSystems(registry).problems).toEqual([])
    const { done } = dawn()
    expect(done.state.yours).toBeUndefined()
    expect(results(done.entries)).toHaveLength(3)
  })

  it('what matters: a table that can give an important result waits for the total', () => {
    const { options, done } = dawn('matters')
    // The road was rolled; the omen waits (the wind, after it, waits in line).
    expect(results(done.entries)).toHaveLength(1)
    const check = done.state.travel.pendingChecks[0]!
    expect(check.event).toBe('OMEN')
    expect(done.state.yours).toEqual([
      expect.objectContaining({ id: check.id, table: 'road/omen', dice: '1d6' }),
    ])
    expect(done.entries.at(-1)).toMatchObject({
      code: 'CHECK_YOURS',
      data: { event: 'OMEN', id: check.id, dice: '1d6' },
    })
    // The player's 6: the raven; then the wind, by weight, the computer's.
    const rolled = stepTrip(options, done.state, { type: 'rolled', id: check.id, total: 6 })
    expect(results(rolled.entries)).toEqual(['A raven', 'Calm'])
    expect(rolled.state.yours).toBeUndefined()
    expect(rolled.state.travel.pendingChecks).toEqual([])
  })

  it('everything: every table rolled with dice waits, one at a time, in order', () => {
    const { options, done } = dawn('all')
    expect(results(done.entries)).toEqual([])
    const first = done.state.yours![0]!
    expect(first.table).toBe('road/road')
    // Its dice as they're rolled now, the values they read filled in.
    expect(first.dice).toBe('1d6 + 1')
    const road1 = stepTrip(options, done.state, { type: 'rolled', id: first.id, total: 2 })
    expect(results(road1.entries)).toEqual(['Mud'])
    const second = road1.state.yours![0]!
    expect(second.table).toBe('road/omen')
    // Rolled for them: the computer's roll, then the wind.
    const omen = stepTrip(options, road1.state, { type: 'resolveCheck', id: second.id })
    expect(results(omen.entries)).toHaveLength(2)
    expect(omen.state.yours).toBeUndefined()
  })
})

/**
 * Rolls inside a result: an ambush's arrows, dice in its text and a blow at each of the party
 * (`target: party.members.all`), each with its own die.
 */
const AMBUSH = [
  { path: 'wild/pack.yaml', content: 'id: wild\nversion: 0.1.0\nlocale: en\nformat: 15\n' },
  {
    path: 'wild/system.yaml',
    content:
      'kind: system\nname: Wild\ntravel: travel-rules.default\nbindings: bindings.default\nsheet: sheet.walker\n',
  },
  {
    path: 'wild/travel.yaml',
    content: `
kind: sheet
id: walker
values: { health: { default: 5 } }
---
kind: travel-rules
travel: { hoursPerDay: 8, start: '07:00' }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks: [{ event: AMBUSH, at: '07:00' }]
---
kind: bindings
on: { AMBUSH: { resolve: table.ambush } }
---
kind: table
id: ambush
roll: 1d6
entries:
  - { range: 1-3, result: Nothing }
  - range: 4-6
    result: 'Arrows: {{1d2}} volleys'
    notable: true
    set: { target: party.members.all }
    effects: { 'characters[target].values.health': '-{{1d3}}' }
`,
  },
]

describe('rolls inside a result', () => {
  const wild = loadPacks(AMBUSH).registry
  const system = travelSystems(wild).systems.find((s) => s.id === 'wild')!
  const ambush = (rollWay: 'matters' | 'all') => {
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry: wild, random: seeded(2) }),
    }
    const members = [
      newMember(partyOf(system), { id: 'kael' }),
      newMember(partyOf(system), { id: 'mara' }),
    ]
    const { session } = startTrip({ system, location: 'a', members, time: 6 * 60, seed: 's' })
    return {
      options,
      done: stepTrip(options, { ...session, rollWay }, { type: 'wait', until: 8 * 60 }),
    }
  }
  const health = (s: { members?: { id: string; values: Record<string, unknown> }[] }, id: string) =>
    s.members?.find((m) => m.id === id)?.values.health

  it("each is the player's in turn, and nothing of the result happens until the last", () => {
    const { options, done } = ambush('matters')
    const id = done.state.travel.pendingChecks[0]!.id
    expect(done.state.yours?.[0]?.dice).toBe('1d6')
    // The table's 5: the arrows; then their volleys, written in its text.
    let next = stepTrip(options, done.state, { type: 'rolled', id, total: 5 })
    expect(next.state.yours).toEqual([
      expect.objectContaining({ dice: '1d2', given: [5], table: 'wild/ambush' }),
    ])
    next = stepTrip(options, next.state, { type: 'rolled', id, total: 2 })
    // Then each one's harm, whom it's for and what came up said.
    expect(next.state.yours).toEqual([
      expect.objectContaining({
        dice: '1d3',
        target: 'kael',
        said: 'Arrows: 2 volleys',
        given: [5, 2],
      }),
    ])
    expect(next.entries.some((e) => e.code === 'ORACLE_RESULT')).toBe(false)
    expect(health(next.state, 'kael')).toBe(5)
    // Kael's rolled for them (Roll it for me); Mara's is the player's 3.
    next = stepTrip(options, next.state, { type: 'resolveCheck', id })
    expect(next.state.yours?.[0]).toMatchObject({
      dice: '1d3',
      target: 'mara',
      given: [5, 2, null],
    })
    next = stepTrip(options, next.state, { type: 'rolled', id, total: 3 })
    expect(next.state.yours).toBeUndefined()
    expect(next.state.travel.pendingChecks).toEqual([])
    expect(results(next.entries)).toEqual(['Arrows: 2 volleys', 'Arrows: 2 volleys'])
    expect(health(next.state, 'mara')).toBe(2)
    const kael = health(next.state, 'kael') as number
    expect(kael).toBeGreaterThanOrEqual(2)
    expect(kael).toBeLessThanOrEqual(4)
    const rolls = next.entries.find((e) => e.code === 'ROLLED')?.data?.rolls
    expect(rolls).toEqual([expect.objectContaining({ source: 'wild/ambush', byHand: true })])
  })

  it('the computer rolls the rest once the player lets it', () => {
    const { options, done } = ambush('all')
    const id = done.state.travel.pendingChecks[0]!.id
    const next = stepTrip(options, done.state, { type: 'rolled', id, total: 6 })
    expect(next.state.yours?.[0]?.dice).toBe('1d2')
    // Let the computer roll from now on: this one and every roll after it.
    const off = stepTrip(
      options,
      { ...next.state, rollWay: undefined },
      { type: 'resolveCheck', id },
    )
    expect(off.state.yours).toBeUndefined()
    expect(results(off.entries)).toHaveLength(2)
  })
})

describe('older trips', () => {
  it('rolling the foes by hand is rolling what matters; a turn left waiting is done', () => {
    const old = {
      foesByHand: true,
      encounter: { stage: 'rolling', rolling: 'p/wolf-turn', dice: '1d6', round: 1, turn: 2 },
    }
    expect(migrateRolls(old)).toEqual({
      rollWay: 'matters',
      encounter: { stage: 'acted', round: 1, turn: 2 },
    })
    // Already moved: untouched.
    const now = { rollWay: 'all' as const }
    expect(migrateRolls(now)).toBe(now)
    expect(migrateRolls({ foesByHand: false })).toEqual({})
  })
})

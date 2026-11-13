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
    expect(done.state.yours).toEqual([{ id: check.id, table: 'road/omen', dice: '1d6' }])
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

import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { newMember } from './party'
import { partyOf, startTrip, stepTrip, travelSystems, tripFacts } from './trip'

/** A party whose Talk is one character's Charisma: whoever the player chooses, or the best. */
const PACK = [
  { path: 'band/pack.yaml', content: 'id: band\nversion: 0.1.0\nlocale: en\nformat: 7\n' },
  {
    path: 'band/system.yaml',
    content:
      'kind: system\nname: Band\ntravel: travel-rules.default\nbindings: bindings.default\nsheet: sheet.companion\n',
  },
  {
    path: 'band/travel.yaml',
    content: `
kind: sheet
id: companion
values: { charisma: { default: 0 } }
---
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks: [{ event: GATE, at: '07:00' }]
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 7, lt: 19 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }] }
  rest: { do: [{ time: 60 }] }
values: { lost: { blocks: [travel.move] } }
---
kind: bindings
on: { GATE: { resolve: table.gate } }
stats:
  talk: { name: Talk, from: { pick: charisma } }
---
kind: table
id: gate
roll: 1d1
entries:
  - { range: 1, result: 'Talked with {{party.stats.talk}}' }
`,
  },
]

const { registry } = loadPacks(PACK)
const band = travelSystems(registry).systems.find((s) => s.id === 'band')!
const world: TravelWorld = {
  hexKm: 24,
  cell: () => ({ terrain: 'plains' }),
  neighbors: () => [],
  distance: () => 0,
  edges: () => [],
}
const members = () => [
  newMember(partyOf(band), { id: 'kael', values: { charisma: 1 } }),
  newMember(partyOf(band), { id: 'mara', values: { charisma: 3 } }),
]

describe('who rolls: a stat made of one character, chosen by the player', () => {
  it('is the best until someone is chosen, then theirs', () => {
    expect(travelSystems(registry).problems).toEqual([])
    const { session } = startTrip({ system: band, location: 'a', members: members() })
    expect(session.stats.talk).toBe(3)
    expect(tripFacts({ system: band, world }, { ...session, rolls: 'kael' })).toMatchObject({
      party: { stats: { talk: 1 } },
    })
    // Someone no longer in the party: the best again.
    expect(tripFacts({ system: band, world }, { ...session, rolls: 'tobin' })).toMatchObject({
      party: { stats: { talk: 3 } },
    })
  })

  it('asked at every roll, a check waits for the choice and is rolled on going on', () => {
    const oracle = createOracleEngine({ registry, random: seeded(1) })
    const { session } = startTrip({ system: band, location: 'a', members: members(), time: 6 * 60 })
    const options = { system: band, world, oracle }
    const waiting = stepTrip(
      options,
      { ...session, askRolls: true },
      { type: 'wait', until: 8 * 60 },
    )
    const check = waiting.state.travel.pendingChecks[0]
    expect(check?.event).toBe('GATE')
    expect(waiting.state.asking).toEqual([check.id])
    expect(waiting.entries.map((e) => e.code)).toContain('CHECK_ASKS')
    expect(waiting.entries.some((e) => e.code === 'ORACLE_RESULT')).toBe(false)
    // Kael talks: Continue rolls it with his Charisma.
    const done = stepTrip(
      options,
      { ...waiting.state, rolls: 'kael' },
      { type: 'resolveCheck', id: check.id },
    )
    expect(done.entries.find((e) => e.code === 'ORACLE_RESULT')?.text).toBe('Talked with 1')
    expect(done.state.travel.pendingChecks).toEqual([])
    expect(done.state.asking).toBeUndefined()
    // Without asking, it's rolled at once, with the best.
    const quick = stepTrip(options, session, { type: 'wait', until: 8 * 60 })
    expect(quick.entries.find((e) => e.code === 'ORACLE_RESULT')?.text).toBe('Talked with 3')
    // One character alone: nobody to choose, nothing asked.
    const alone = { ...session, members: session.members!.slice(0, 1), askRolls: true }
    const solo = stepTrip(options, alone, { type: 'wait', until: 8 * 60 })
    expect(solo.state.asking).toBeUndefined()
  })
})

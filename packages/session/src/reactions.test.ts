import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { sequence } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { newMember } from './party'
import { partyOf, settleTrip, startTrip, stepTrip, travelSystems } from './trip'
import type { SessionState } from './index'

/** A made-up system whose rules react: to the food running out, to a member falling. */
const pack = (extra = '') => [
  { path: 'r/pack.yaml', content: 'id: r\nversion: 0.1.0\nlocale: en\nformat: 14\n' },
  {
    path: 'r/system.yaml',
    content:
      'kind: system\ntravel: travel-rules.default\nbindings: bindings.default\nsheet: sheet.hero\npartySheet: sheet.band\n',
  },
  {
    path: 'r/sheet.yaml',
    content: `
kind: sheet
id: hero
values:
  health: { default: 3, min: 0, max: 3 }
  grit: { default: 2 }
conditions:
  down: {}
---
kind: sheet
id: band
values:
  food: { default: 6, min: 0 }
`,
  },
  {
    path: 'r/travel.yaml',
    content: `
kind: travel-rules
travel: { hoursPerDay: 8, start: '07:00' }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
actions:
  feast: { do: [{ effects: { party.values.food: '=0' } }] }
  restock: { do: [{ effects: { party.values.food: 3 } }] }
  hurt-mara: { do: [{ effects: { characters.mara.values.health: '=0' } }] }
  starving:
    on: { when: { party.values.food: { lte: 0 } } }
    do: [{ effects: { party.members.values.grit: -1 } }]
  fall:
    on: { when: { acting.values.health: { lte: 0 } }, for: party.members }
    do: [{ effects: { acting.conditions.down: true } }]
${extra}
---
kind: bindings
`,
  },
]

const world: TravelWorld = {
  km: () => 24,
  place: () => ({ terrain: 'plains' }),
  neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
  distance: (x, y) => (x === y ? 0 : 1),
  connections: () => [],
}

const systemOf = (extra = '') => {
  const { registry } = loadPacks(pack(extra))
  const result = travelSystems(registry)
  const system = result.systems.find((s) => s.id === 'r')!
  return { system, registry, problems: result.problems }
}

describe('reactions: moments written as conditions', () => {
  const { system, registry } = systemOf()
  const party = partyOf(system)
  const oracle = createOracleEngine({ registry, random: sequence([0]) })
  const start = (mara = {}) =>
    startTrip({
      system,
      location: 'a',
      members: [
        newMember(party, { id: 'kael' }),
        newMember(party, { id: 'mara', values: { ...mara } }),
      ],
    }).session
  const act = (s: SessionState, id: string) =>
    stepTrip({ system, world, oracle }, s, { type: 'action', id })
  const grit = (s: SessionState) => s.members!.map((m) => m.values.grit)

  it('comes once as its condition turns true, and again only after it stopped holding', () => {
    let s = act(start(), 'feast').state
    expect(grit(s)).toEqual([1, 1])
    // Still out of food: nothing more.
    s = act(s, 'feast').state
    expect(grit(s)).toEqual([1, 1])
    // Food again, then none: it comes again.
    s = act(s, 'restock').state
    expect(grit(s)).toEqual([1, 1])
    const again = act(s, 'feast')
    expect(grit(again.state)).toEqual([0, 0])
    expect(again.entries.map((e) => e.code)).toContain('ACTION_TAKEN')
  })

  it('checked for each member, played with that member acting, then who acted before', () => {
    const hurt = act({ ...start(), acting: 'kael' }, 'hurt-mara')
    const [kael, mara] = hurt.state.members!
    expect(mara.conditions).toHaveProperty('down')
    expect(kael.conditions).not.toHaveProperty('down')
    expect(hurt.state.acting).toBe('kael')
    expect(hurt.entries).toContainEqual(
      expect.objectContaining({ code: 'REACTED', data: { who: 'mara' } }),
    )
  })

  it('what has no memory counts as not holding: a new trip, a member joining', () => {
    // Mara starts at 0: a new trip plays it on its first step.
    const first = act(start({ health: 0 }), 'restock')
    expect(first.state.members![1].conditions).toHaveProperty('down')
    // Someone joins at 0, by hand: settled at once.
    const joined = settleTrip(
      { system, world },
      {
        ...first.state,
        members: [...first.state.members!, newMember(party, { id: 'pip', values: { health: 0 } })],
      },
    )
    expect(joined.state.members![2].conditions).toHaveProperty('down')
  })

  it('a trip saved before reactions takes what holds as its memory, firing nothing', () => {
    const old = { ...start({ health: 0 }) }
    delete old.reactions
    const played = act(old, 'restock').state
    expect(played.members![1].conditions).not.toHaveProperty('down')
    expect(played.reactions).toEqual([expect.stringMatching(/\|mara$/)])
  })

  it('stops a reaction that sets itself off, with a line', () => {
    const looping = systemOf(`
  ping:
    on: { when: { characters.kael.values.grit: { gte: 2 } } }
    do: [{ effects: { characters.kael.values.grit: '=1' } }]
  pong:
    on: { when: { characters.kael.values.grit: { lte: 1 } } }
    do: [{ effects: { characters.kael.values.grit: '=2' } }]
`)
    const s = startTrip({
      system: looping.system,
      location: 'a',
      members: [newMember(partyOf(looping.system), { id: 'kael' })],
    }).session
    const done = stepTrip({ system: looping.system, world, oracle }, s, {
      type: 'action',
      id: 'restock',
    })
    expect(done.entries.filter((e) => e.code === 'REACTIONS_LOOP')).toHaveLength(1)
    expect(done.entries.filter((e) => e.code === 'ACTION_TAKEN').length).toBeLessThanOrEqual(11)
  })

  it('refuses a moment written as a condition that is not one', () => {
    const { problems } = systemOf(`
  bad: { on: { for: party.members }, do: [{ time: 1 }] }
  worse: { on: { when: { a: { gt: [] } } }, do: [{ time: 1 }] }
`)
    expect(problems.map((p) => p.message).join('\n')).toMatch(/needs when or unless/)
    expect(problems.length).toBeGreaterThanOrEqual(2)
  })
})

import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { startTrip, stepTrip, travelSystems } from './trip'

/** Forest follows forest; a hex is empty, or (the 4th one) holds a landmark. */
const { registry } = loadPacks([
  { path: 'x/pack.yaml', content: 'id: x\nname: X\nversion: 0.1.0\nlocale: en\n' },
  {
    path: 'x/travel.yaml',
    content: `
kind: travel-rules
day: { start: '07:00', nightfall: '19:00' }
travel: { hoursPerDay: 8 }
terrains: { forest: { multiplier: 1 }, plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 80 } }
---
kind: bindings
on: {}
discover:
  terrain: { resolve: next-terrain }
  contents: { resolve: contents }
---
kind: table
id: next-terrain
roll: 1d6
entries:
  - { id: same, range: 1-6, result: same, when: { terrain: forest }, set: { terrain: forest } }
  - { id: plains, range: 1-6, result: plains, set: { terrain: plains } }
---
kind: table
id: contents
roll: 1d6
entries:
  - { id: tower, range: 1-6, result: An old tower, when: { hex.id: '4' }, set: { tags: landmark, name: The Tower } }
  - { id: nothing, range: 1-6, result: Nothing, set: { poi: false } }
`,
  },
])

const system = travelSystems(registry).systems.find((s) => s.id === 'x')!
const oracle = () => createOracleEngine({ registry, random: seeded('discovery') })

/** A line of hexes "0"…"9"; only "0" is painted (forest); the rest wait to be discovered. */
function line(painted: Record<string, { terrain: string; tags?: string[]; name?: string }>) {
  const world: TravelWorld = {
    hexKm: 10,
    cell: (hex) => {
      const n = Number(hex)
      if (!(n >= 0 && n < 10)) return null
      return painted[hex] ?? { tags: [] }
    },
    neighbors: (hex) =>
      [Number(hex) - 1, Number(hex) + 1].filter((n) => n >= 0 && n < 10).map(String),
    distance: (a, b) => Math.abs(Number(a) - Number(b)),
    edges: () => [],
  }
  return world
}

function travel(reveal: 'neighbors' | 'entered', to = '3') {
  const painted = { '0': { terrain: 'forest' } }
  const world = line(painted)
  const options = { system, world, oracle: oracle(), locale: 'en', discover: reveal } as const
  let { session } = startTrip({ system, location: '0' })
  const planned = stepTrip(options, session, { type: 'setDestination', hex: to })
  session = planned.state
  const trip = stepTrip(options, session, { type: 'travel' })
  return { planned, trip }
}

describe('discovery', () => {
  it('validates the discover bindings and their tables', () => {
    expect(system.bindings?.discover).toEqual({
      terrain: { resolve: 'x/next-terrain' },
      contents: { resolve: 'x/contents' },
      reveal: 'neighbors',
    })
  })

  it('neighbours: sees around the party, then walks hex by hex deciding contents', () => {
    const { planned, trip } = travel('neighbors')
    // Choosing the destination already reveals hex 1 (seen from the forest).
    expect(planned.discovered).toEqual({ '1': { terrain: 'forest' } })
    expect(trip.state.travel.location).toBe('3')
    // Hexes 1–4 got a terrain; 1–3 were entered, so their contents were rolled.
    expect(Object.keys(trip.discovered).sort()).toEqual(['1', '2', '3', '4'])
    expect(trip.discovered['4']).toEqual({ terrain: 'forest' })
    expect(trip.state.discovery?.pending).toEqual(['4'])
    // Their contents were "nothing": no journal lines for that.
    expect(trip.entries.filter((e) => e.code === 'HEX_DISCOVERED')).toHaveLength(0)
  })

  it('entered: only the hexes walked into are decided', () => {
    const { planned, trip } = travel('entered')
    expect(planned.discovered).toEqual({})
    expect(Object.keys(trip.discovered).sort()).toEqual(['1', '2', '3'])
  })

  it('stops the trip at a point of interest, with its tags and name', () => {
    const { trip } = travel('neighbors', '6')
    expect(trip.state.travel.location).toBe('4')
    expect(trip.discovered['4']).toEqual({
      terrain: 'forest',
      tags: ['landmark'],
      name: 'The Tower',
      poi: 'An old tower',
    })
    expect(trip.entries.at(-1)).toMatchObject({
      code: 'HEX_DISCOVERED',
      text: 'An old tower',
      data: { hex: '4' },
    })
  })

  it('journals a broken discovery table instead of failing the trip', () => {
    const broken = {
      ...system,
      bindings: {
        ...system.bindings!,
        discover: { ...system.bindings!.discover!, terrain: { resolve: 'x/missing' } },
      },
    }
    const world = line({ '0': { terrain: 'forest' } })
    const { session } = startTrip({ system: broken, location: '0' })
    const step = stepTrip(
      { system: broken, world, oracle: oracle(), discover: 'neighbors' },
      session,
      {
        type: 'setDestination',
        hex: '2',
      },
    )
    expect(step.entries.find((e) => e.code === 'DISCOVERY_FAILED')).toMatchObject({
      data: { hex: '0' },
      text: expect.stringMatching(/missing/),
    })
  })

  it('never decides painted hexes, and is off unless asked for', () => {
    const painted = { '0': { terrain: 'forest' }, '1': { terrain: 'plains' } }
    const world = line(painted)
    const { session } = startTrip({ system, location: '0' })
    const on = stepTrip({ system, world, oracle: oracle(), discover: 'neighbors' }, session, {
      type: 'setDestination',
      hex: '2',
    })
    expect(on.discovered).toEqual({})
    const off = stepTrip(
      { system, world: line({ '0': { terrain: 'forest' } }), oracle: oracle() },
      session,
      {
        type: 'travel',
      },
    )
    expect(off.discovered).toEqual({})
  })
})

describe('context suggestions', () => {
  it('gather what tables and checks can read, with known values', async () => {
    const { contextSuggestions } = await import('./suggestions')
    const s = contextSuggestions(registry, { danger: ['1', '2'] })
    expect(s.terrain).toEqual(expect.arrayContaining(['forest', 'plains', 'peaks']))
    expect(s.season).toEqual(['autumn', 'spring', 'summer', 'winter'])
    expect(s.mode).toContain('walk')
    expect(s['hex.id']).toEqual(expect.arrayContaining(['4']))
    expect(s.danger).toEqual(['1', '2'])
    expect(s).toHaveProperty(['party.mode'])
    // Full names too, with the same values.
    expect(s['hex.terrain']).toEqual(s.terrain)
    expect(s['time.season']).toEqual(s.season)
    expect(s['trip.mode']).toEqual(s.mode)
    expect(s).toHaveProperty(['trip.day'])
    expect(s).toHaveProperty(['system.nightfall'])
    expect(s).toHaveProperty(['poi'])
    // Only what tables read: no set values.
    expect(contextSuggestions(registry, {}, { reads: true })).not.toHaveProperty(['poi'])
  })
})

describe('discovering from the land around', () => {
  const { registry: around } = loadPacks([
    { path: 'y/pack.yaml', content: 'id: y\nversion: 0.1.0\nlocale: en\n' },
    {
      path: 'y/t.yaml',
      content: `
kind: travel-rules
day: { start: '07:00', nightfall: '19:00' }
travel: { hoursPerDay: 8 }
terrains: { forest: { multiplier: 1 }, lake: { multiplier: 1 } }
modes: { walk: { kmPerDay: 80 } }
---
kind: bindings
on: {}
discover: { terrain: { resolve: grow }, reveal: neighbors }
---
kind: table
id: grow
roll: 1d6
entries:
  - { range: 1-6, result: '{{common}} ({{commonCount}} of {{aroundCount}})', set: { terrain: '{{common}}' }, when: { around.lake: { gte: 2 } } }
  - { range: 1-6, result: 'like here', set: { terrain: '{{terrain}}' } }
`,
    },
  ])
  const sys = travelSystems(around).systems.find((s) => s.id === 'y')!

  it('sees every known neighbour of the hex being decided', () => {
    // "c" is empty; around it two lakes and the forest the party stands on.
    const cells: Record<string, { terrain?: string; tags: string[] }> = {
      a: { terrain: 'lake', tags: [] },
      b: { terrain: 'lake', tags: [] },
      c: { tags: [] },
      d: { terrain: 'forest', tags: [] },
    }
    const ring: Record<string, string[]> = { a: ['c'], b: ['c'], c: ['a', 'b', 'd'], d: ['c'] }
    const world: TravelWorld = {
      hexKm: 10,
      cell: (hex) => cells[hex] ?? null,
      neighbors: (hex) => ring[hex] ?? [],
      distance: (x, y) => (x === y ? 0 : 1),
      edges: () => [],
    }
    const { session } = startTrip({ system: sys, location: 'd' })
    const step = stepTrip(
      {
        system: sys,
        world,
        oracle: createOracleEngine({ registry: around, random: seeded(1) }),
        discover: 'neighbors',
      },
      session,
      { type: 'setDestination', hex: 'c' },
    )
    expect(step.discovered.c).toEqual({ terrain: 'lake' })
  })
})

describe('waiting while discovering', () => {
  it('waits where the party is: a check on the way never sets it travelling', () => {
    const { registry } = loadPacks([
      { path: 'w/pack.yaml', content: 'id: w\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'w/travel.yaml',
        content: `
kind: travel-rules
day: { start: '07:00', nightfall: '19:00' }
travel: { hoursPerDay: 8 }
terrains: { forest: { multiplier: 1 } }
modes: { walk: { kmPerDay: 80 } }
resources: { food: {} }
checks: [{ event: DAWN, at: day-start, effects: { party.resources.food: 0 } }]
---
kind: bindings
on: {}
discover:
  terrain: { resolve: next }
  contents: { resolve: next }
---
kind: table
id: next
entries: [{ result: forest, set: { terrain: forest, poi: false } }]
`,
      },
    ])
    const system = travelSystems(registry).systems.find((s) => s.id === 'w')!
    const world = line({ '0': { terrain: 'forest' } })
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry, random: seeded('w') }),
      discover: 'neighbors',
    } as const
    let { session } = startTrip({ system, location: '0' })
    session = stepTrip(options, session, { type: 'setDestination', hex: '5' }).state
    const until = session.travel.time + 3 * 1440
    const { state, entries } = stepTrip(options, session, { type: 'wait', until })
    expect(state.travel.location).toBe('0')
    expect(entries.some((e) => e.code === 'HEX_ENTERED')).toBe(false)
    expect(state.travel.time).toBeGreaterThanOrEqual(until)
  })
})

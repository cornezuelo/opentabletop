import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { sequence } from '@open-tabletop/random'
import { defaultCalendar } from '@open-tabletop/time'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { GENERIC_SYSTEM, startTrip, stepTrip, travelSystems } from './trip'

const { registry } = loadPacks([
  { path: 'sys/pack.yaml', content: 'id: sys\nname: Sys\nversion: 0.1.0\nlocale: en\n' },
  {
    path: 'sys/travel.yaml',
    content: `
kind: travel-rules
day: { start: '07:00', nightfall: '19:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
resources: { water: { perDay: 1 } }
checks: [{ event: WEATHER, at: day-start }]
---
kind: bindings
on: { WEATHER: { resolve: weather } }
stats: { luck: { name: Luck, default: 2 } }
---
kind: table
id: weather
roll: 1d2
entries:
  - { range: 1, result: Sun, set: { weather: clear } }
  - { range: 2, result: Rain, set: { weather: rain } }
`,
  },
  { path: 'broken/pack.yaml', content: 'id: broken\nversion: 0.1.0\nlocale: en\n' },
  { path: 'broken/travel.yaml', content: 'kind: travel-rules\nday: {}\n' },
])

/** Two hexes in a row: a → b. */
const world: TravelWorld = {
  hexKm: 24,
  cell: () => ({ terrain: 'plains' }),
  neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
  distance: (x, y) => (x === y ? 0 : 1),
  edges: () => [],
}

describe('trips', () => {
  it('finds the systems packs declare and reports broken ones', () => {
    const { systems, problems } = travelSystems(registry)
    expect(systems.map((s) => s.id)).toEqual(['generic', 'sys'])
    expect(systems[1]).toMatchObject({
      name: 'Sys',
      bindings: { on: { WEATHER: { resolve: 'sys/weather' } } },
    })
    expect(problems.some((p) => p.pack === 'broken' && p.at?.startsWith('@travel-rules'))).toBe(
      true,
    )
  })

  it('starts a trip at dawn of the season, with supplies and declared stats', () => {
    const sys = travelSystems(registry).systems[1]
    const { startDay, session } = startTrip({ system: sys, location: 'a', season: 'summer' })
    expect(startDay).toBe(91)
    expect(session.travel).toMatchObject({
      location: 'a',
      mode: 'walk',
      time: defaultCalendar.at(91, '07:00'),
      resources: { water: 6 },
    })
    expect(session.stats).toEqual({ luck: 2 })
    expect(startTrip({ system: sys, location: 'a', stats: { luck: 5 } }).session.stats).toEqual({
      luck: 5,
    })
    // Stats of another system (kept when switching) don't come along.
    const kept = { luck: 4, survival: 2, morale: 3 }
    expect(startTrip({ system: sys, location: 'a', stats: kept }).session.stats).toEqual({
      luck: 4,
    })
    expect(startTrip({ system: GENERIC_SYSTEM, location: 'a', stats: kept }).session.stats).toEqual(
      {},
    )
    expect(startTrip({ system: GENERIC_SYSTEM, location: 'a' }).session.travel.mode).toBe('foot')
  })

  it('steps through the session, resolving bound checks', () => {
    const sys = travelSystems(registry).systems[1]
    const oracle = createOracleEngine({ registry, random: sequence([0.9]) })
    const { session } = startTrip({ system: sys, location: 'a' })
    const options = { system: sys, world, oracle, locale: 'en' }
    const planned = stepTrip(options, session, { type: 'setDestination', hex: 'b' }).state
    const { state, entries } = stepTrip(options, planned, { type: 'travel' })
    expect(entries.find((e) => e.code === 'ORACLE_RESULT')?.text).toBe('Rain')
    expect(state.travel.location).toBe('b')
  })
  it('waits for days, rolling each dawn’s checks and camping each night', () => {
    const sys = travelSystems(registry).systems[1]
    const oracle = createOracleEngine({ registry, random: sequence([0.1, 0.9, 0.1, 0.9]) })
    const { session } = startTrip({ system: sys, location: 'a' })
    const options = { system: sys, world, oracle, locale: 'en' }
    const until = defaultCalendar.at(4, '12:00')
    const { state, entries } = stepTrip(options, session, { type: 'wait', until })
    expect(state.travel.time).toBe(until)
    expect(entries[0]).toMatchObject({ code: 'WAIT', data: { until } })
    expect(entries.filter((e) => e.code === 'ORACLE_RESULT').map((e) => e.text)).toEqual([
      'Sun',
      'Rain',
      'Sun',
      'Rain',
    ])
    expect(entries.filter((e) => e.code === 'CAMP_STARTED')).toHaveLength(3)
    expect(state.travel.resources.water).toBe(3)
  })

  it('a wait stops at a check nobody answers', () => {
    const sys = travelSystems(registry).systems[1]
    const { session } = startTrip({ system: sys, location: 'a' })
    const until = defaultCalendar.at(3, '12:00')
    const { state, entries } = stepTrip({ system: sys, world }, session, { type: 'wait', until })
    expect(state.travel.time).toBeLessThan(until)
    expect(entries.at(-1)?.code).toBe('CHECK_PENDING')
  })
})

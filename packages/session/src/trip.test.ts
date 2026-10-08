import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { sequence } from '@open-tabletop/random'
import { defaultCalendar } from '@open-tabletop/time'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { GENERIC_SYSTEM, startTrip, stepTrip, systemName, travelSystems } from './trip'

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

  it('reads the systems a pack declares, with parts of its own and of its dependencies', () => {
    const { registry } = loadPacks([
      { path: 'base/pack.yaml', content: 'id: base\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'base/parts.yaml',
        content: `
kind: travel-rules
id: slow
day: { start: '07:00', nightfall: '19:00' }
terrains: { plains: { multiplier: 1 } }
travel: { hoursPerDay: 4 }
modes: { walk: { kmPerDay: 10 } }
---
kind: weather
id: sky
states: { clear: { name: Clear } }
seasons: { spring: { start: clear, next: { clear: { clear: 1 } } } }
---
kind: table
id: omen
entries: [{ range: 1-6, result: Crows }]
`,
      },
      {
        path: 'game/pack.yaml',
        content: 'id: game\nname: Game\nversion: 0.1.0\nlocale: en\ndependencies: { base: "*" }\n',
      },
      {
        path: 'game/system.yaml',
        content: `
kind: system
id: default
name: { en: The game, es: El juego }
travel: fast
bindings: default
weather: [base/sky]
packs: [base]
---
kind: system
id: slow
travel: base/slow
---
kind: system
id: plain
---
kind: travel-rules
id: fast
day: { start: '07:00', nightfall: '19:00' }
terrains: { plains: { multiplier: 1 } }
travel: { hoursPerDay: 10 }
modes: { walk: { kmPerDay: 40 } }
checks: [{ event: SKY, at: day-start }]
---
kind: bindings
on: { SKY: { weather: base/sky } }
`,
      },
      { path: 'other/pack.yaml', content: 'id: other\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'other/system.yaml',
        content: `
kind: system
travel: base/slow
packs: [base]
bindings: missing
colour: red
`,
      },
    ])
    const { systems, problems } = travelSystems(registry)
    // A system with id `default` is named by its pack; the others by pack/id. A pack that
    // declares systems has no implicit one (base has travel rules but declares none: implicit).
    expect(systems.map((s) => s.id)).toEqual(['generic', 'base', 'game', 'game/slow', 'game/plain'])
    const [, base, game, slow, plain] = systems
    expect(base.rules.travel.hoursPerDay).toBe(4)
    expect(Object.keys(base.weather ?? {})).toEqual(['base/sky'])
    expect(game).toMatchObject({
      pack: 'game',
      packs: ['game', 'base'],
      rules: { travel: { hoursPerDay: 10 } },
      sources: { rules: { pack: 'game', id: 'fast' }, bindings: { pack: 'game', id: 'default' } },
    })
    expect(systemName(game, 'es')).toBe('El juego')
    expect(Object.keys(game.weather ?? {})).toEqual(['base/sky'])
    // Parts of a dependency are its own; without travel rules, the generic ones.
    expect(slow.sources?.rules).toMatchObject({ pack: 'base', id: 'slow' })
    expect(systemName(slow, 'en')).toBe('Game')
    expect(plain.rules).toBe(GENERIC_SYSTEM.rules)
    expect(plain.weather).toBeUndefined()
    // A pack can't reach into packs it doesn't depend on, nor name parts that don't exist.
    const of = (pack: string) =>
      problems.filter((p) => p.pack === pack).map((p) => `${p.at}: ${p.message}`)
    expect(of('game')).toEqual([])
    expect(of('other')).toEqual([
      '@system/default.colour: Unknown key "colour" in a system',
      '@system/default.packs.0: "base" isn\'t a dependency of this pack',
      '@system/default.travel: "base" isn\'t a dependency of this pack',
    ])
  })

  it('lists the example maps a system names, OTD bundles of its own pack', () => {
    const { registry, diagnostics } = loadPacks([
      { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'p/system.yaml',
        content: `
kind: system
maps: [maps/coast.otd.json, maps/gone.otd.json, notes.yaml, maps/vale.otd.json]
`,
      },
      // Bundles aren't definitions: the loader lists them and never parses them.
      { path: 'p/maps/coast.otd.json', content: '{"not": "a definition"}' },
      { path: 'p/maps/vale.otd.json', content: 'not even JSON' },
    ])
    expect(diagnostics).toEqual([])
    expect(registry.packs.get('p')?.bundles).toEqual(['maps/coast.otd.json', 'maps/vale.otd.json'])
    const { systems, problems } = travelSystems(registry)
    expect(systems.find((s) => s.id === 'p')?.maps).toEqual([
      'maps/coast.otd.json',
      'maps/vale.otd.json',
    ])
    expect(problems.map((p) => `${p.at}: ${p.message}`)).toEqual([
      '@system/default.maps.1: No map "maps/gone.otd.json" in this pack',
      '@system/default.maps.2: Expected the path of an OTD bundle in this pack (…/name.otd.json)',
    ])
  })

  it("reports a weather model a system's bindings name but the system doesn't bring", () => {
    const { registry } = loadPacks([
      { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'p/system.yaml',
        content: `
kind: system
bindings: default
---
kind: bindings
on: { SKY: { weather: sky } }
---
kind: weather
id: sky
states: { clear: { name: Clear } }
seasons: { spring: { start: clear, next: { clear: { clear: 1 } } } }
`,
      },
    ])
    const { problems } = travelSystems(registry)
    expect(problems.map((p) => p.message)).toEqual(['Unknown weather model "p/sky"'])
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
    expect(
      entries.filter((e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'camp'),
    ).toHaveLength(3)
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

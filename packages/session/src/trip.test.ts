import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { sequence } from '@open-tabletop/random'
import { defaultCalendar } from '@open-tabletop/time'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import {
  GENERIC_SYSTEM,
  startTrip,
  stepTrip,
  systemName,
  systemPackIds,
  travelSystems,
  tripAvailability,
  tripFacts,
} from './trip'

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

  it('gathers every pack a system needs to be taken elsewhere, dependencies included', () => {
    const { registry } = loadPacks([
      { path: 'deep/pack.yaml', content: 'id: deep\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'base/pack.yaml',
        content: 'id: base\nversion: 0.1.0\nlocale: en\ndependencies: { deep: "*" }\n',
      },
      { path: 'lonely/pack.yaml', content: 'id: lonely\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'game/pack.yaml',
        content: 'id: game\nversion: 0.1.0\nlocale: en\ndependencies: { base: "*" }\n',
      },
      { path: 'game/system.yaml', content: 'kind: system\nname: Game\n' },
    ])
    const { systems } = travelSystems(registry)
    const game = systems.find((s) => s.id === 'game')!
    // Its own pack first, then its dependencies as far as they go; unrelated packs stay out.
    expect(systemPackIds(game, registry)).toEqual(['game', 'base', 'deep'])
    expect(systemPackIds(GENERIC_SYSTEM, registry)).toEqual([])
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

  it('reads packs of an older format with their old meaning: tableless checks pause', () => {
    const rules = (format: string) => `
kind: travel-rules
day: { start: '07:00', nightfall: '19:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks:
  - { event: LANDMARK, at: hex-enter }
  - { event: TIRED, at: day-end, effects: { party.stats.fatigue: 1 } }
  - { event: WEATHER, at: day-start }
  - { event: OMEN, at: hex-enter, pause: false }
---
kind: bindings
on: { WEATHER: { resolve: weather } }
stats: { fatigue: { default: 0 } }
---
kind: table
id: weather
roll: 1d2
entries: [{ range: 1-2, result: Sun }]
${format}`
    const registryOf = (format?: number) =>
      loadPacks([
        {
          path: 'old/pack.yaml',
          content: `id: old\nversion: 0.1.0\nlocale: en\n${format ? `format: ${format}\n` : ''}`,
        },
        { path: 'old/travel.yaml', content: rules('') },
      ]).registry
    const load = (format?: number) =>
      travelSystems(registryOf(format)).systems.find((s) => s.id === 'old')!
    const pauses = (system: ReturnType<typeof load>) => system.rules.checks!.map((c) => c.pause)
    // Format 1 (no `format`): only the check with neither a table nor effects (nor a
    // `pause` of its own) stopped the trip, so it pauses.
    expect(pauses(load())).toEqual([true, undefined, undefined, false])
    expect(pauses(load(2))).toEqual([undefined, undefined, undefined, false])
    // Played: entering b stops at the landmark in format 1, and goes on in format 2.
    const play = (format?: number) => {
      const system = load(format)
      const { session } = startTrip({ system, location: 'a' })
      const oracle = createOracleEngine({ registry: registryOf(format), random: sequence([0.1]) })
      const options = { system, world, oracle }
      const planned = stepTrip(options, session, { type: 'setDestination', hex: 'b' }).state
      return stepTrip(options, planned, { type: 'travel' })
    }
    expect(play().state.travel.pendingChecks.map((c) => c.event)).toContain('LANDMARK')
    const newer = play(2)
    expect(newer.state.travel.pendingChecks.map((c) => c.event)).not.toContain('LANDMARK')
    expect(newer.entries.find((e) => e.data?.event === 'LANDMARK')?.code).toBe('CHECK_NOTED')
  })

  it('checks and actions see the host’s facts (the world clock’s clocks and events)', () => {
    const { registry: clocked } = loadPacks([
      { path: 'w/pack.yaml', content: 'id: w\nversion: 0.1.0\nlocale: en\nformat: 2\n' },
      {
        path: 'w/travel.yaml',
        content: `
kind: travel-rules
day: { start: '07:00', nightfall: '19:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks:
  - { event: WYRM, at: hex-enter, when: { clocks.the-wyrm-wakes: { gte: 4 } }, pause: true }
actions:
  shop: { when: { events: market-day }, do: [{ time: 60 }] }
`,
      },
    ])
    const system = travelSystems(clocked).systems.find((s) => s.id === 'w')!
    const { session } = startTrip({ system, location: 'a' })
    const go = (facts: Record<string, unknown>) => {
      const options = { system, world, facts }
      const planned = stepTrip(options, session, { type: 'setDestination', hex: 'b' }).state
      return stepTrip(options, planned, { type: 'travel' }).state
    }
    const calm = { clocks: { 'the-wyrm-wakes': 3 }, events: [] }
    const waking = { clocks: { 'the-wyrm-wakes': 4 }, events: ['market-day'] }
    expect(go(calm).travel.pendingChecks).toEqual([])
    expect(go(waking).travel.pendingChecks.map((c) => c.event)).toEqual(['WYRM'])
    expect(tripAvailability({ system, world, facts: calm }, session).shop).toBeDefined()
    expect(tripAvailability({ system, world, facts: waking }, session).shop).toBeUndefined()
    // Rolls by hand see what a check would: the moment, the trip, the host's facts.
    expect(tripFacts({ system, world, facts: waking }, session)).toMatchObject({
      daylight: true,
      hour: 7,
      tripDay: 1,
      visits: 1,
      clocks: { 'the-wyrm-wakes': 4 },
    })
  })
})

describe('values that name another value ($)', () => {
  const { registry: mouths } = loadPacks([
    { path: 'm/pack.yaml', content: 'id: m\nversion: 0.1.0\nlocale: en\nformat: 2\n' },
    {
      path: 'm/travel.yaml',
      content: `
kind: travel-rules
day: { start: '07:00', nightfall: '19:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
resources: { food: { min: 0 } }
checks:
  - { event: AMBUSH, at: hex-enter, when: { danger: { gt: '{{party.stats.stealth}}' } } }
actions:
  eat: { on: day-end, do: [{ effects: { party.resources.food: '-{{party.stats.mouths}}' } }] }
  feast: { do: [{ effects: { party.stats.morale: '={{party.stats.mouths}}' } }] }
---
kind: bindings
on: { AMBUSH: { resolve: ambush } }
stats:
  mouths: { default: 3 }
  stealth: { default: 1 }
  morale: { default: 0 }
---
kind: table
id: ambush
roll: 1d6
entries:
  - { range: 1-6, result: Ambush!, set: { loss: 2 }, effects: { party.resources.food: '-{{loss}}' } }
`,
    },
  ])
  const system = travelSystems(mouths).systems.find((s) => s.id === 'm')!
  const danger = (d: number): TravelWorld => ({
    ...world,
    cell: () => ({ terrain: 'plains', danger: d }),
  })

  it('in conditions: a check against a stat', () => {
    const go = (d: number) => {
      const { session } = startTrip({ system, location: 'a' })
      const options = {
        system,
        world: danger(d),
        oracle: createOracleEngine({ registry: mouths, random: sequence([0.5]) }),
      }
      const planned = stepTrip(options, session, { type: 'setDestination', hex: 'b' }).state
      return stepTrip(options, planned, { type: 'travel' })
    }
    expect(go(1).entries.some((e) => e.data?.event === 'AMBUSH')).toBe(false)
    const ambushed = go(2)
    const result = ambushed.entries.find((e) => e.data?.event === 'AMBUSH')
    // The table's effect reads its own value: −2 food, said as such in the journal.
    expect(result?.data?.value).toMatchObject({ effects: { 'party.resources.food': -2 } })
  })

  it('what tables and actions spend counts in the trip’s totals (trip.spent)', () => {
    const { session } = startTrip({ system, location: 'a' })
    session.travel.resources.food = 10
    const options = {
      system,
      world: danger(2),
      oracle: createOracleEngine({ registry: mouths, random: sequence([0.5]) }),
    }
    const planned = stepTrip(options, session, { type: 'setDestination', hex: 'b' }).state
    const { state } = stepTrip(options, planned, { type: 'travel' })
    // The ambush's 2, from its table.
    expect(state.travel.totals).toMatchObject({ hexes: 1, checks: 1, spent: { food: 2 } })
    expect(tripFacts(options, state)).toMatchObject({
      trip: { hexes: 1, km: state.travel.totals!.hexes * world.hexKm, spent: { food: 2 } },
    })
    // A day ends: the three mouths eat (an action the system takes by itself).
    const fed = stepTrip(options, state, { type: 'wait', until: state.travel.time + 24 * 60 })
    expect(fed.state.travel.totals).toMatchObject({ spent: { food: 5 }, taken: { eat: 1 } })
  })

  it('in effects: as many as a stat says, or set to it', () => {
    const { session } = startTrip({ system, location: 'a' })
    session.travel.resources.food = 10
    const options = { system, world }
    const fed = stepTrip(options, session, {
      type: 'wait',
      until: session.travel.time + 24 * 60,
    }).state
    expect(fed.travel.resources.food).toBe(7) // three mouths
    const feast = stepTrip(options, session, { type: 'action', id: 'feast' }).state
    expect(feast.stats.morale).toBe(3)
  })
})

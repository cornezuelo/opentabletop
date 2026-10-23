import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded, sequence } from '@open-tabletop/random'
import { defaultCalendar } from '@open-tabletop/time'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import type { CharacterState } from '@open-tabletop/character-engine'
import { describe, expect, it } from 'vitest'
import { corePack, coreSystem } from './core.testing'
import { applyResult } from './index'
import {
  DEFAULT_SYSTEM,
  migrateGenericSheets,
  missingSystem,
  NO_TRAVEL,
  startTrip,
  stepTrip,
  systemName,
  systemOfPack,
  systemIdOf,
  systemPackIds,
  travels,
  travelSystems,
  tripAvailability,
  tripFacts,
  partyOf,
} from './trip'

const { registry } = loadPacks([
  { path: 'sys/pack.yaml', content: 'id: sys\nname: Sys\nversion: 0.1.0\nlocale: en\n' },
  {
    path: 'sys/travel.yaml',
    content: `
kind: system
travel: travel-rules.default
bindings: bindings.default
partySheet: sheet.camp
---
kind: sheet
id: camp
values: { water: { default: 6, min: 0 } }
---
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks: [{ event: WEATHER, at: '07:00' }]
actions:
  drink: { on: time.day-end, do: [{ effects: { party.values.water: -1 } }] }
  march:
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 7, lt: 19 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }] }
  rest: { do: [{ time: 60 }] }
values: { lost: { blocks: [travel.move] } }
---
kind: bindings
on: { WEATHER: { resolve: table.weather } }
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
    expect(systems.map((s) => s.id)).toEqual(['sys'])
    expect(systems[0]).toMatchObject({
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
terrains: { plains: { multiplier: 1 } }
travel:
  hoursPerDay: 4
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
modes: { walk: { kmPerDay: 10 } }
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 7, lt: 19 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }] }
  rest: { do: [{ time: 60 }] }
values: { lost: { blocks: [travel.move] } }
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
travel: travel-rules.fast
bindings: bindings.default
weather: [base/weather.sky]
packs: [base]
---
kind: system
id: slow
travel: base/travel-rules.slow
---
kind: system
id: plain
---
kind: travel-rules
id: fast
terrains: { plains: { multiplier: 1 } }
travel:
  hoursPerDay: 10
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
modes: { walk: { kmPerDay: 40 } }
checks: [{ event: SKY, at: '07:00' }]
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
on: { SKY: { weather: base/weather.sky } }
`,
      },
      { path: 'other/pack.yaml', content: 'id: other\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'other/system.yaml',
        content: `
kind: system
travel: base/travel-rules.slow
packs: [base]
bindings: bindings.missing
colour: red
`,
      },
      { path: 'short/pack.yaml', content: 'id: short\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'short/system.yaml',
        content: `
kind: system
calendar: default
sheet: calendar.default
---
kind: calendar
id: default
`,
      },
    ])
    const { systems, problems } = travelSystems(registry)
    // A system with id `default` is named by its pack; the others by pack/id. A pack that
    // declares systems has no implicit one (base has travel rules but declares none: implicit).
    const named = systems.filter((s) => s.pack !== 'short')
    expect(named.map((s) => s.id)).toEqual(['base', 'game', 'game/slow', 'game/plain'])
    const [base, game, slow, plain] = named
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
    // Parts of a dependency are its own; without travel rules, it doesn't travel.
    expect(slow.sources?.rules).toMatchObject({ pack: 'base', id: 'slow' })
    expect(systemName(slow, 'en')).toBe('Game')
    expect(plain.rules).toBe(NO_TRAVEL)
    expect(travels(plain)).toBe(false)
    expect(travels(slow)).toBe(true)
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
    // Parts are named by their kind: a short name, or the wrong kind, says what was meant.
    expect(of('short').filter((p) => p.startsWith('@system'))).toEqual([
      '@system/default.calendar: "default" doesn\'t say what it names: write calendar.default',
      '@system/default.sheet: "calendar.default" names a calendar, which can\'t be used here (expected sheet)',
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
    expect(systemPackIds(missingSystem('gone'), registry)).toEqual([])
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
bindings: bindings.default
---
kind: bindings
on: { SKY: { weather: weather.sky } }
---
kind: weather
id: sky
states: { clear: { name: Clear } }
seasons: { spring: { start: clear, next: { clear: { clear: 1 } } } }
`,
      },
    ])
    const { problems } = travelSystems(registry)
    expect(problems.map((p) => p.message)).toEqual([
      'The system doesn\'t bring the weather model "weather.sky" (weather: in kind: system)',
    ])
  })

  it('reports a part of the day the rules name but the calendar lacks; starts at a part', () => {
    const { registry } = loadPacks([
      { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'p/system.yaml',
        content: `
kind: system
travel: travel-rules.default
calendar: calendar.shire
---
kind: travel-rules
travel:
  hoursPerDay: 8
  start: time.meal.breakfast
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: time.meal.supper, do: actions.camp }
terrains: {}
modes: { foot: { kmPerDay: 30 } }
checks: [{ event: TEA, at: time.meal.tea }]
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    when: { time.tags: { not: dark }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: time.meal.breakfast }] }
  rest: { do: [{ time: 60 }] }
values: { lost: { blocks: [travel.move] } }
---
kind: calendar
id: shire
months: [{ id: m, days: 30, season: spring }]
divisions:
  meal: { parts: [{ id: breakfast, from: '07:00' }, { id: supper, from: '21:00' }] }
`,
      },
    ])
    const { systems, problems } = travelSystems(registry)
    expect(problems.map((p) => p.message)).toEqual([
      'the calendar has no part of the day "time.meal.tea"',
    ])
    // A new trip starts as the system's day does: at breakfast.
    const system = systems.find((s) => s.id === 'p')!
    const { session } = startTrip({ system, location: 'a' })
    expect(system.calendar!.describe(session.travel.time)).toMatchObject({ hour: 7 })
  })

  it("starts a trip at dawn of the season, with the party sheet's values and declared stats", () => {
    const sys = travelSystems(registry).systems.find((s) => s.id === 'sys')!
    const { startDay, session } = startTrip({ system: sys, location: 'a', season: 'summer' })
    expect(startDay).toBe(91)
    expect(session.travel).toMatchObject({
      location: 'a',
      mode: 'walk',
      time: defaultCalendar.at(91, '07:00'),
    })
    // The party's own values start at their defaults.
    expect(session.party?.values).toEqual({ water: 6 })
    expect(session.stats).toEqual({ luck: 2 })
    expect(startTrip({ system: sys, location: 'a', stats: { luck: 5 } }).session.stats).toEqual({
      luck: 5,
    })
    // Stats of another system (kept when switching) don't come along.
    const kept = { luck: 4, survival: 2, morale: 3 }
    expect(startTrip({ system: sys, location: 'a', stats: kept }).session.stats).toEqual({
      luck: 4,
    })
    expect(startTrip({ system: coreSystem(), location: 'a', stats: kept }).session.stats).toEqual(
      {},
    )
    expect(startTrip({ system: coreSystem(), location: 'a' }).session.travel.mode).toBe('foot')
  })

  it('steps through the session, resolving bound checks', () => {
    const sys = travelSystems(registry).systems.find((s) => s.id === 'sys')!
    const oracle = createOracleEngine({ registry, random: sequence([0.9]) })
    const { session } = startTrip({ system: sys, location: 'a' })
    const options = { system: sys, world, oracle, locale: 'en' }
    const planned = stepTrip(options, session, { type: 'setDestination', hex: 'b' }).state
    const { state, entries } = stepTrip(options, planned, { type: 'travel' })
    expect(entries.find((e) => e.code === 'ORACLE_RESULT')?.text).toBe('Rain')
    expect(state.travel.location).toBe('b')
  })
  it('waits for days, rolling each dawn’s checks and camping each night', () => {
    const sys = travelSystems(registry).systems.find((s) => s.id === 'sys')!
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
    expect(state.party?.values.water).toBe(3)
  })

  it('a wait stops at a check nobody answers', () => {
    const sys = travelSystems(registry).systems.find((s) => s.id === 'sys')!
    const { session } = startTrip({ system: sys, location: 'a' })
    const until = defaultCalendar.at(3, '12:00')
    const { state, entries } = stepTrip({ system: sys, world }, session, { type: 'wait', until })
    expect(state.travel.time).toBeLessThan(until)
    expect(entries.at(-1)?.code).toBe('CHECK_PENDING')
  })

  it('checks and actions see the host’s facts (the world clock’s clocks and events)', () => {
    const { registry: clocked } = loadPacks([
      { path: 'w/pack.yaml', content: 'id: w\nversion: 0.1.0\nlocale: en\nformat: 8\n' },
      {
        path: 'w/travel.yaml',
        content: `
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks:
  - { event: WYRM, at: trip.hex-enter, when: { clocks.the-wyrm-wakes: { gte: 4 } }, pause: true }
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 7, lt: 19 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }] }
  rest: { do: [{ time: 60 }] }
  shop: { when: { events: market-day }, do: [{ time: 60 }] }
values: { lost: { blocks: [travel.move] } }
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
    // A UI's reactive state is a proxy (structuredClone refuses it): read all the same.
    const reactive = <T extends object>(o: T): T =>
      new Proxy(o, {
        get: (t, k) => {
          const v = Reflect.get(t, k)
          return typeof v === 'object' && v !== null ? reactive(v) : v
        },
      })
    expect(() => structuredClone(reactive(session))).toThrow()
    expect(
      tripAvailability({ system, world, facts: waking }, reactive(session)).shop,
    ).toBeUndefined()
    expect(tripFacts({ system, world, facts: waking }, reactive(session))).toMatchObject({
      hour: 7,
    })
    // Rolls by hand see what a check would: the moment, the trip, the host's facts.
    expect(tripFacts({ system, world, facts: waking }, session)).toMatchObject({
      hour: 7,
      tripDay: 1,
      visits: 1,
      clocks: { 'the-wyrm-wakes': 4 },
    })
  })
})

describe('values that name another value ($)', () => {
  const { registry: mouths } = loadPacks([
    { path: 'm/pack.yaml', content: 'id: m\nversion: 0.1.0\nlocale: en\nformat: 8\n' },
    {
      path: 'm/travel.yaml',
      content: `
kind: system
travel: travel-rules.default
bindings: bindings.default
partySheet: sheet.band
---
kind: sheet
id: band
values: { food: { default: 6, min: 0 } }
---
kind: travel-rules
travel:
  hoursPerDay: 8
  start: '07:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '19:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks:
  - { event: AMBUSH, at: trip.hex-enter, when: { danger: { gt: '{{party.stats.stealth}}' } } }
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 7, lt: 19 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '07:00' }] }
  rest: { do: [{ time: 60 }] }
  eat: { on: time.day-end, do: [{ effects: { party.values.food: '-{{party.stats.mouths}}' } }] }
  feast: { do: [{ effects: { party.stats.morale: '={{party.stats.mouths}}' } }] }
values: { lost: { blocks: [travel.move] } }
---
kind: bindings
on: { AMBUSH: { resolve: table.ambush } }
stats:
  mouths: { default: 3 }
  stealth: { default: 1 }
  morale: { default: 0 }
---
kind: table
id: ambush
roll: 1d6
entries:
  - { range: 1-6, result: Ambush!, set: { loss: 2 }, effects: { party.values.food: '-{{loss}}' } }
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
    // Under the stat it doesn't come up: only the journal's detail says so, and why.
    const calm = go(1).entries.filter((e) => e.data?.check === 'AMBUSH')
    expect(calm.map((e) => e.code)).toEqual(['CHECK_SKIPPED'])
    expect(calm[0].data).toMatchObject({ condition: 'when', failed: [{ value: 1 }] })
    const ambushed = go(2)
    const result = ambushed.entries.find((e) => e.data?.event === 'AMBUSH')
    // The table's effect reads its own value: −2 food, said as such in the journal.
    expect(result?.data?.value).toMatchObject({ effects: { 'party.values.food': -2 } })
  })

  it('what tables and actions spend counts in the trip’s totals (trip.spent)', () => {
    const { session } = startTrip({ system, location: 'a' })
    session.party!.values.food = 10
    const options = {
      system,
      world: danger(2),
      oracle: createOracleEngine({ registry: mouths, random: sequence([0.5]) }),
    }
    const planned = stepTrip(options, session, { type: 'setDestination', hex: 'b' }).state
    const { state } = stepTrip(options, planned, { type: 'travel' })
    // The ambush's 2, from its table.
    expect(state.travel.totals).toMatchObject({
      hexes: 1,
      checks: 1,
      spent: { 'party.values.food': 2 },
    })
    // Read by full name (`trip.spent.party.values.food`).
    expect(tripFacts(options, state)).toMatchObject({
      trip: {
        hexes: 1,
        km: state.travel.totals!.hexes * world.hexKm,
        spent: { party: { values: { food: 2 } } },
      },
    })
    // A day ends: the three mouths eat (an action the system takes by itself).
    const fed = stepTrip(options, state, { type: 'wait', until: state.travel.time + 24 * 60 })
    expect(fed.state.travel.totals).toMatchObject({
      spent: { 'party.values.food': 5 },
      taken: { eat: 1 },
    })
  })

  it('in effects: as many as a stat says, or set to it', () => {
    const { session } = startTrip({ system, location: 'a' })
    session.party!.values.food = 10
    const options = { system, world }
    const fed = stepTrip(options, session, {
      type: 'wait',
      until: session.travel.time + 24 * 60,
    }).state
    expect(fed.party!.values.food).toBe(7) // three mouths
    const feast = stepTrip(options, session, { type: 'action', id: 'feast' }).state
    expect(feast.stats.morale).toBe(3)
  })
})

describe('the system of a pack', () => {
  const system = (id: string, pack?: string) => ({ ...coreSystem(), id, pack })
  const systems = [
    coreSystem(),
    system('marches/winter', 'marches'),
    system('marches', 'marches'),
    system('kal', 'kal'),
  ]

  it('keeps the system last chosen when the pack declares it', () => {
    expect(systemOfPack(systems, 'marches', 'marches/winter')?.id).toBe('marches/winter')
  })

  it("otherwise is the pack's default system, or the first it declares", () => {
    expect(systemOfPack(systems, 'marches', 'kal')?.id).toBe('marches')
    expect(systemOfPack(systems.slice(0, 2), 'marches')?.id).toBe('marches/winter')
  })

  it('is none for a pack without a system', () => {
    expect(systemOfPack(systems, 'lonely', 'core')).toBeUndefined()
  })
})

describe("Core's system: the Generic rules as data", () => {
  /** A long road of plains: 0 → 1 → 2 … */
  const road: TravelWorld = {
    hexKm: 10,
    cell: () => ({ terrain: 'plains' }),
    neighbors: (h) => [String(Number(h) - 1), String(Number(h) + 1)],
    distance: (a, b) => Math.abs(Number(a) - Number(b)),
    edges: () => [],
  }

  it('despairs once, as the party’s morale reaches 0, stopping the trip', () => {
    const core = coreSystem()
    const { session } = startTrip({ system: core, location: '0' })
    expect(session.party?.values.morale).toBe(3)
    const low = applyResult(
      session,
      { effects: { 'party.values.morale': '=0' } },
      core.bindings?.stats,
      partyOf(core),
    )
    const step = stepTrip({ system: core, world: road }, low, { type: 'action', id: 'rest' })
    expect(step.state.travel.waiting).toMatchObject({ action: 'despair' })
    expect(step.entries.some((e) => e.code === 'HELD')).toBe(true)
  })

  it('is the default system, with its calendar, sheets and named actions', () => {
    const core = coreSystem()
    expect(core.id).toBe(DEFAULT_SYSTEM)
    expect(travels(core)).toBe(true)
    expect(systemName(core, 'en')).toBe('Generic rules')
    expect(Object.keys(core.rules.actions ?? {})).toEqual([
      'march',
      'camp',
      'rest',
      'eat',
      'explore',
      'despair',
    ])
    expect(core.sheet?.id).toBe('core/character')
    expect(core.partySheet?.id).toBe('core/party')
    expect(core.calendar?.describe(core.calendar.at(1, '21:00'))).toMatchObject({
      divisions: { part: 'night', watch: 6 },
      tags: ['dark'],
    })
  })

  it('explores: a step rolls Core’s Prompt generator, named in the journal', () => {
    const { registry } = loadPacks(corePack())
    const system = travelSystems(registry).systems.find((s) => s.id === 'core')!
    const oracle = createOracleEngine({ registry, random: sequence([0.1, 0.6]) })
    const { session } = startTrip({ system, location: '0' })
    const { state } = stepTrip({ system, world: road, oracle, locale: 'es' }, session, {
      type: 'action',
      id: 'explore',
    })
    const result = state.journal.find((e) => e.code === 'ORACLE_RESULT')!
    expect(result.data).toMatchObject({ event: 'generator.prompt', named: 'Inspiración' })
    expect(result.text).toBeTruthy()
    expect(state.travel.time - session.travel.time).toBe(60)
  })

  it('starts in the morning, marches by day, camps at night and eats as the day ends', () => {
    const system = coreSystem()
    const { session } = startTrip({ system, location: '0' })
    expect(system.calendar!.describe(session.travel.time)).toMatchObject({ hour: 6 })
    expect(session.party?.values).toMatchObject({ morale: 3, food: 6 })
    // The weather check rolls the plain sky each morning (a spring day starts cloudy).
    const { registry } = loadPacks(corePack())
    const oracle = createOracleEngine({ registry, random: seeded(1) })
    const options = { system, world: road, oracle }
    const planned = stepTrip(options, session, { type: 'setDestination', hex: '9' }).state
    const day = stepTrip(options, planned, {
      type: 'action',
      id: 'march',
      with: { until: 'destination' },
    })
    expect(day.state.travel.weather).toBe('cloudy')
    // 30 km in 8 hours on foot: three hexes of 10 km, then the march stops for the day.
    expect(day.state.travel.location).toBe('3')
    expect(tripAvailability(options, day.state).march).toBeDefined()
    // Going on by itself (a wait), the party halts at night (camp) and eats at midnight.
    const until = system.calendar!.at(2, '12:00')
    const next = stepTrip(options, day.state, { type: 'wait', until }).state
    expect(next.party?.values.food).toBe(5)
    expect(next.journal.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'camp')).toBe(
      true,
    )
    // A camp sleeps through the night: a wait into it wakes in the morning…
    const night = stepTrip(options, next, { type: 'wait', until: system.calendar!.at(2, '22:00') })
    expect(system.calendar!.describe(night.state.travel.time)).toMatchObject({ day: 3, hour: 6 })
    // …and at night there's no march and no rest (not `dark` is by day).
    const dark = { ...next, travel: { ...next.travel, time: system.calendar!.at(2, '22:00') } }
    expect(Object.keys(tripAvailability(options, dark))).toEqual(
      expect.arrayContaining(['march', 'rest']),
    )
  })

  it('reads maps and trips of the built-in rules as Core’s', () => {
    expect(systemIdOf('generic')).toBe('core')
    expect(systemIdOf(undefined)).toBe('core')
    expect(systemIdOf('grey-marches')).toBe('grey-marches')
    const made = (id: string, sheet: string): CharacterState => ({
      id,
      sheet,
      values: {},
      conditions: {},
      tags: [],
      cards: [],
      relations: [],
    })
    const old = {
      party: made('party', 'generic/party'),
      members: [made('a', 'generic/character'), made('b', 'game/hero')],
    }
    const read = migrateGenericSheets(old)
    expect(read.party?.sheet).toBe('core/party')
    expect(read.members?.map((m) => m.sheet)).toEqual(['core/character', 'game/hero'])
    const fresh = { members: [] }
    expect(migrateGenericSheets(fresh)).toBe(fresh)
  })
})

describe('what rules roll and hear from the world, checked on load', () => {
  it('a roll of a table that is none, and a full clock the system does not declare (a warning: it may be made by hand)', () => {
    const { registry } = loadPacks([
      { path: 'w/pack.yaml', content: 'id: w\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'w/travel.yaml',
        content: `
kind: travel-rules
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 } }
modes: { walk: { kmPerDay: 24 } }
checks: [{ event: OMEN, at: world.clocks.gone.full }]
actions:
  search: { do: [{ roll: table.ruins }, { roll: table.nowhere }] }
  flee: { on: world.clocks.doom.full, do: [{ time: 60 }] }
---
kind: clocks
id: world
clocks: { doom: { name: Doom, segments: 4 } }
---
kind: system
travel: travel-rules.default
clocks: clocks.world
---
kind: table
id: ruins
entries: [{ result: Bones }]
`,
      },
    ])
    const { systems, problems } = travelSystems(registry)
    expect(systems.map((s) => s.id)).toEqual(['w'])
    expect(problems.map((p) => [p.severity, p.at, p.message])).toEqual([
      ['error', '@travel-rules/default.actions.search.do.1.roll', 'Unknown table "table.nowhere"'],
      [
        'warning',
        '@travel-rules/default.checks.0.at',
        'the system declares no clock "gone": heard only if a clock made by hand has this name (it declares world.clocks.doom.full)',
      ],
    ])
  })
})

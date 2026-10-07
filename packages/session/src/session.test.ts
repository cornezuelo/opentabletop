import { describe, expect, it } from 'vitest'
import {
  distance,
  keyOf,
  neighborCells,
  parseKey,
  toAxial,
  type GridShape,
} from '@open-tabletop/hex'
import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { sequence } from '@open-tabletop/random'
import { defaultCalendar } from '@open-tabletop/time'
import {
  createTravelEngine,
  genericTravelRules,
  initialTravelState,
  type TravelWorld,
} from '@open-tabletop/travel-engine'
import {
  addEntry,
  createSession,
  initialSessionState,
  type SessionState,
  localize,
  parseBindings,
  applyResult,
  applyEffects,
  effectsOf,
  toOutcome,
  tripChanges,
  tripContext,
} from './index'

const shape: GridShape = { orientation: 'flat', width: 6, height: 6 }
const key = (h: string) => parseKey(h as `${number},${number}`)
const world: TravelWorld = {
  hexKm: 30,
  cell: () => ({ terrain: 'steppe' }),
  neighbors: (h) => neighborCells(key(h), shape).map(keyOf),
  distance: (a, b) => distance(toAxial(key(a), 'flat'), toAxial(key(b), 'flat')),
  edges: () => [],
}

const rules = {
  ...genericTravelRules,
  checks: [
    { event: 'WEATHER_CHECK_REQUIRED', at: 'day-start' as const },
    { event: 'NAVIGATION_CHECK_REQUIRED', at: 'day-start' as const },
    { event: 'ENCOUNTER_CHECK_REQUIRED', at: 'day-start' as const },
  ],
}

const { registry, ok, diagnostics } = loadPacks([
  { path: 'sys/pack.yaml', content: 'id: sys\nversion: 0.1.0\nlocale: es\n' },
  {
    path: 'sys/t.yaml',
    content: `
kind: table
id: weather
roll: 1d2
entries:
  - { range: 1, result: Despejado, set: { weather: clear, lostModifier: 1 } }
  - { range: 2, result: Lluvia, set: { weather: heavy-rain, lostModifier: -1 } }
---
kind: table
id: lost-check
roll: '1d6 + {{lostModifier}}'
entries:
  - { range: 1-2, result: Perdidos, set: { lost: true } }
  - { range: 3-7, result: En rumbo }
---
kind: table
id: encounter
roll: 1d6
entries:
  - { range: 1-4, result: Nada }
  - { range: 5-6, result: 'Bandidos (PRE {{pre}})' }
---
kind: bindings
on:
  WEATHER_CHECK_REQUIRED: { resolve: weather }
  NAVIGATION_CHECK_REQUIRED: { resolve: lost-check }
  ENCOUNTER_CHECK_REQUIRED: { resolve: encounter }
`,
  },
])

const start = () =>
  initialSessionState(
    initialTravelState({
      location: '0,0',
      mode: 'foot',
      time: defaultCalendar.at(1, '06:00'),
      resources: { food: 2 },
    }),
    { pre: 1 },
  )

describe('session', () => {
  it('loads the fixture', () => expect([ok, diagnostics]).toEqual([true, []]))

  it('parses bindings and resolves local ids in their pack', () => {
    expect(parseBindings({ on: { X: { resolve: 'weather' } } }, 'sys').bindings).toEqual({
      on: { X: { resolve: 'sys/weather' } },
    })
    expect(parseBindings({ on: { X: {} } }).errors).toEqual([
      'bindings.on.X: needs "resolve" (a table) or "weather" (a model)',
    ])
    expect(parseBindings({ on: { W: { weather: 'sky' } } }, 'sys').bindings).toEqual({
      on: { W: { weather: 'sys/sky' } },
    })
  })

  it("gives tables yesterday: the day before's values and whether the party ended it lost", () => {
    const session = createSession({ travel: createTravelEngine({ world, rules }), now: () => 'T' })
    const today = { ...start(), dayVars: { weather: 'storm', fordModifier: -1 } }
    today.travel = { ...today.travel, lostToday: true }
    const { state } = session.step(today, { type: 'camp' })
    expect(state.dayVars).toEqual({})
    expect(tripContext(state, {}).yesterday).toEqual({
      weather: 'storm',
      fordModifier: -1,
      lost: true,
    })
    // Two nights later, nothing is left of that day.
    const later = session.step(session.step(state, { type: 'camp' }).state, {
      type: 'advanceTime',
      minutes: 2 * 24 * 60,
    }).state
    expect(tripContext(later, {}).yesterday).toEqual({ lost: false })
  })

  it('resolves checks with the oracle and keeps travelling', () => {
    const { bindings } = parseBindings(
      {
        on: {
          WEATHER_CHECK_REQUIRED: { resolve: 'weather' },
          NAVIGATION_CHECK_REQUIRED: { resolve: 'lost-check' },
          ENCOUNTER_CHECK_REQUIRED: { resolve: 'encounter' },
        },
      },
      'sys',
    )
    // weather d2=1 (clear, +1 to navigation), lost d6=4 (+1 → 5, on course), encounter d6=5 (bandits)
    const oracle = createOracleEngine({ registry, random: sequence([0.1, 3.5 / 6, 4.5 / 6]) })
    const session = createSession({
      travel: createTravelEngine({ world, rules }),
      oracle,
      bindings,
      now: () => 'T',
    })
    let { state } = session.step(start(), { type: 'setDestination', hex: '2,0' })
    const result = session.step(state, { type: 'travel' })
    state = result.state
    const texts = result.entries.filter((e) => e.code === 'ORACLE_RESULT').map((e) => e.text)
    expect(texts).toEqual(['Despejado', 'En rumbo', 'Bandidos (PRE 1)'])
    expect(state.travel.weather).toBe('clear')
    expect(state.travel.location).toBe('1,0') // kept travelling after the checks
    expect(state.dayVars).toEqual({ weather: 'clear', lostModifier: 1 })
    const entered = result.entries.filter((e) => e.code === 'HEX_ENTERED')
    expect(entered).toHaveLength(1)
    // Each entry keeps the time of its own event, not the end of the step.
    expect(entered[0].time).toBe(defaultCalendar.at(1, '14:00'))
  })

  it('applies lost outcomes', () => {
    const { bindings } = parseBindings(
      {
        on: {
          WEATHER_CHECK_REQUIRED: { resolve: 'weather' },
          NAVIGATION_CHECK_REQUIRED: { resolve: 'lost-check' },
        },
      },
      'sys',
    )
    // weather d2=2 (rain, -1), lost d6=2 (-1 → 1, lost); encounter check stays pending (no binding)
    const oracle = createOracleEngine({ registry, random: sequence([0.9, 1.5 / 6]) })
    const session = createSession({
      travel: createTravelEngine({ world, rules }),
      oracle,
      bindings,
    })
    const { state } = session.step(
      session.step(start(), { type: 'setDestination', hex: '2,0' }).state,
      { type: 'travel' },
    )
    expect(state.travel.lostToday).toBe(true)
    expect(state.travel.pendingChecks.map((c) => c.event)).toEqual(['ENCOUNTER_CHECK_REQUIRED'])
    expect(state.journal.some((e) => e.code === 'CHECK_PENDING')).toBe(true)
  })

  it('keeps the trip going when a bound table is broken', () => {
    const { bindings } = parseBindings(
      { on: { WEATHER_CHECK_REQUIRED: { resolve: 'nowhere' } } },
      'sys',
    )
    const session = createSession({
      travel: createTravelEngine({ world, rules }),
      oracle: createOracleEngine({ registry, random: sequence([0.5]) }),
      bindings,
    })
    const { state } = session.step(
      session.step(start(), { type: 'setDestination', hex: '2,0' }).state,
      { type: 'travel' },
    )
    const failed = state.journal.find((e) => e.code === 'CHECK_FAILED')
    expect(failed?.data).toMatchObject({ event: 'WEATHER_CHECK_REQUIRED', table: 'sys/nowhere' })
    expect(failed?.text).toMatch(/Unknown definition/)
    expect(state.travel.pendingChecks.map((c) => c.event)).toContain('WEATHER_CHECK_REQUIRED')
  })

  it('tables read the party and change its stats; map facts win over a stat with their name', () => {
    const { registry: party } = loadPacks([
      { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'p/t.yaml',
        content: `
kind: table
id: hunger
entries:
  - { result: 'Starving ({{party.resources.food}} food, {{terrain}})', when: { party.resources.food: { lt: 1 } }, set: { stats: { morale: -1 } } }
  - { result: 'Fed ({{party.resources.food}} food, morale {{party.stats.morale}})', when: { party.resources.food: { gte: 1 } } }
`,
      },
    ])
    const { bindings } = parseBindings(
      { on: { WEATHER_CHECK_REQUIRED: { resolve: 'hunger' } } },
      'p',
    )
    const session = createSession({
      travel: createTravelEngine({
        world,
        rules: { ...rules, checks: [{ event: 'WEATHER_CHECK_REQUIRED', at: 'day-start' }] },
      }),
      oracle: createOracleEngine({ registry: party, random: sequence([0.5, 0.5]) }),
      bindings,
    })
    // A stat called "terrain" must not hide the hex's terrain.
    const hungry = { ...start(), stats: { terrain: 9, morale: 3 } }
    hungry.travel.resources.food = 0
    const planned = session.step(hungry, { type: 'setDestination', hex: '1,0' }).state
    const { state, entries } = session.step(planned, { type: 'travel' })
    expect(entries.find((e) => e.code === 'ORACLE_RESULT')?.text).toBe('Starving (0 food, steppe)')
    expect(state.stats).toEqual({ terrain: 9, morale: 2 })
    expect(tripContext(state, { terrain: 'steppe' })).toMatchObject({
      terrain: 'steppe',
      morale: 2,
      party: { stats: { terrain: 9, morale: 2 }, resources: { food: 0 }, mode: 'foot' },
    })
  })

  it('leaves checks pending without an oracle and records user notes', () => {
    const session = createSession({ travel: createTravelEngine({ world, rules }) })
    let { state } = session.step(
      session.step(start(), { type: 'setDestination', hex: '2,0' }).state,
      { type: 'travel' },
    )
    expect(state.travel.pendingChecks).toHaveLength(3)
    state = session.note(state, 'Acampamos junto al pozo')
    expect(state.journal.at(-1)).toMatchObject({
      source: 'user',
      code: 'NOTE',
      text: 'Acampamos junto al pozo',
    })
  })

  it('adds hand-rolled results to the journal at the current game time', () => {
    const state = addEntry(
      start(),
      { source: 'oracle', code: 'ORACLE_ROLL', text: 'Rain', data: { table: 'core/weather' } },
      '2026-01-01T00:00:00Z',
    )
    expect(state.journal).toEqual([
      {
        id: 'j1',
        time: start().travel.time,
        at: '2026-01-01T00:00:00Z',
        source: 'oracle',
        code: 'ORACLE_ROLL',
        text: 'Rain',
        data: { table: 'core/weather' },
      },
    ])
    expect(state.nextEntry).toBe(2)
    expect(start().journal).toEqual([])
  })

  it('logs a check result at the time the check came up', () => {
    const { bindings } = parseBindings({ on: { NIGHT: { resolve: 'encounter' } } }, 'sys')
    const session = createSession({
      travel: createTravelEngine({
        world,
        rules: { ...genericTravelRules, checks: [{ event: 'NIGHT', at: 'camp' }] },
      }),
      oracle: createOracleEngine({ registry, random: sequence([0.9]) }),
      bindings,
    })
    const evening = {
      ...start(),
      travel: { ...start().travel, time: defaultCalendar.at(1, '18:00') },
    }
    const { entries } = session.step(evening, { type: 'camp' })
    const night = entries.find((e) => e.code === 'ORACLE_RESULT')
    expect(night?.time).toBe(defaultCalendar.at(1, '18:00'))
  })

  it('parses declared party stats and localizes their texts', () => {
    const { bindings } = parseBindings({
      on: {},
      stats: {
        pre: {
          name: { en: 'Presence', es: 'Presencia' },
          description: 'Reaction bonus',
          default: 1,
        },
      },
    })
    expect(bindings?.stats?.pre.default).toBe(1)
    expect(localize(bindings?.stats?.pre.name, 'es')).toBe('Presencia')
    expect(localize(bindings?.stats?.pre.name, 'fr', 'en')).toBe('Presence')
    expect(localize(bindings?.stats?.pre.description, 'es')).toBe('Reaction bonus')
  })

  it('applies the effects of the system’s actions and journals them', () => {
    const praying = {
      ...rules,
      actions: { pray: { minutes: 60, effects: { 'party.stats.morale': 1 } } },
    }
    const session = createSession({
      travel: createTravelEngine({ world, rules: praying }),
      rules: praying,
      bindings: { on: {}, stats: { morale: { default: 3, max: 4 } } },
      now: () => 'T',
    })
    let state: SessionState = { ...start(), stats: { morale: 3 } }
    for (let i = 0; i < 2; i++) state = session.step(state, { type: 'action', id: 'pray' }).state
    expect(state.stats.morale).toBe(4)
    expect(state.journal.at(-1)).toMatchObject({
      code: 'ACTION_TAKEN',
      data: { action: 'pray', effects: { 'party.stats.morale': 1 } },
    })
  })

  it('applies a result rolled by hand to the trip, as effects', () => {
    const value = { resources: { food: -5 }, stats: { morale: 2 }, fatigue: -1, other: 1 }
    expect(tripChanges(value)).toEqual([
      ['party.resources.food', -5],
      ['party.stats.morale', 2],
      ['party.fatigue', -1],
    ])
    const state = applyResult({ ...start(), stats: { pre: 1 } }, value)
    expect(state.travel.resources.food).toBe(0) // never below zero
    expect(state.stats).toEqual({ pre: 1, morale: 2 })
    expect(tripChanges({ result: 'nothing' })).toEqual([])
  })

  it('reads effects and the older ways of writing them, and keeps stats within bounds', () => {
    expect(
      effectsOf({
        stats: { morale: -1 },
        effects: { 'party.stats.morale': '+3', 'party.stats.luck': '=2', 'factions.x.rep': 1 },
      }),
    ).toEqual({ 'party.stats.morale': 2, 'party.stats.luck': '=2', 'factions.x.rep': 1 })
    const target = { stats: { morale: 4 }, travel: { resources: { food: 1 }, fatigue: 0 } }
    const { applied, unknown } = applyEffects(
      target,
      {
        'party.stats.morale': 3,
        'party.stats.luck': '=2',
        'party.resources.food': -3,
        'factions.x.rep': 1,
      },
      { morale: { min: 0, max: 5 } },
    )
    expect(target.stats).toEqual({ morale: 5, luck: 2 })
    expect(target.travel.resources.food).toBe(0)
    expect(applied).toEqual([
      { path: 'party.stats.morale', from: 4, to: 5 },
      { path: 'party.stats.luck', from: 0, to: 2 },
      { path: 'party.resources.food', from: 1, to: 0 },
    ])
    expect(unknown).toEqual(['factions.x.rep'])
  })

  it('maps table values to travel outcomes', () => {
    expect(toOutcome({ lost: true, weather: 'storm', other: 1 })).toEqual({
      lost: true,
      weather: 'storm',
    })
    // Effects on the party are the session's (effectsOf), not the travel engine's.
    expect(toOutcome({ resources: { food: 2 }, fatigue: -1 })).toEqual({})
  })
})

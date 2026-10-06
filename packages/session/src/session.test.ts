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
  localize,
  parseBindings,
  toOutcome,
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
    expect(parseBindings({ on: { X: {} } }).errors).toEqual(['bindings.on.X: needs "resolve"'])
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

  it('maps table values to travel outcomes', () => {
    expect(toOutcome({ lost: true, weather: 'storm', other: 1 })).toEqual({
      lost: true,
      weather: 'storm',
    })
  })
})

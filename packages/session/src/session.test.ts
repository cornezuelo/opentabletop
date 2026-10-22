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
import { coreSystem } from './core.testing'
import { sequence } from '@open-tabletop/random'
import { defaultCalendar } from '@open-tabletop/time'
import {
  createTravelEngine,
  initialTravelState,
  type TravelWorld,
} from '@open-tabletop/travel-engine'
import {
  addEntry,
  createSession,
  lastStepEntries,
  initialSessionState,
  type SessionState,
  localize,
  parseBindings,
  applyResult,
  applyEffects,
  effectsOf,
  migrateTotals,
  toOutcome,
  tripChanges,
  tripContext,
  tripAvailability,
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

const core = coreSystem()
const coreRules = core.rules

const rules = {
  ...coreRules,
  // Being lost is a value this system declares: it blocks travel for the day.
  values: { lost: { blocks: ['travel.move'] } },
  checks: [
    { event: 'WEATHER_CHECK_REQUIRED', at: '06:00' },
    { event: 'NAVIGATION_CHECK_REQUIRED', at: '06:00' },
    { event: 'ENCOUNTER_CHECK_REQUIRED', at: '06:00' },
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
  WEATHER_CHECK_REQUIRED: { resolve: table.weather }
  NAVIGATION_CHECK_REQUIRED: { resolve: table.lost-check }
  ENCOUNTER_CHECK_REQUIRED: { resolve: table.encounter }
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

  it('Core’s Generic rules say when the food ran out: a say step, translated', () => {
    const calendar = core.calendar!
    const session = createSession({
      travel: createTravelEngine({ world, rules: coreRules, calendar }),
    })
    const hungry = initialSessionState(
      initialTravelState({
        location: '0,0',
        mode: 'foot',
        time: calendar.at(1, '06:00'),
        resources: { food: 0 },
        calendar,
      }),
    )
    const { state } = session.step(hungry, { type: 'wait', until: calendar.at(2, '06:00') })
    expect(state.journal.find((e) => e.code === 'SAID')?.data).toMatchObject({
      action: 'eat',
      text: { en: 'There is nothing left to eat.', es: 'No queda nada que comer.' },
    })
  })

  it('parses bindings and resolves local ids in their pack', () => {
    expect(parseBindings({ on: { X: { resolve: 'table.weather' } } }, 'sys').bindings).toEqual({
      on: { X: { resolve: 'sys/weather' } },
    })
    expect(parseBindings({ on: { X: {} } }).errors).toEqual([
      'bindings.on.X: needs "resolve" (a table: table.<id>) or "weather" (a model: weather.<id>)',
    ])
    expect(parseBindings({ on: { W: { weather: 'weather.sky' } } }, 'sys').bindings).toEqual({
      on: { W: { weather: 'sys/sky' } },
    })
  })

  it("gives tables yesterday: the day before's values and whether the party ended it lost", () => {
    const session = createSession({
      travel: createTravelEngine({ world, rules, calendar: core.calendar }),
      now: () => 'T',
    })
    const today = { ...start(), dayVars: { weather: 'storm', fordModifier: -1 } }
    today.travel = { ...today.travel, lostToday: true }
    const { state } = session.step(today, { type: 'action', id: 'camp' })
    expect(state.dayVars).toEqual({})
    expect(tripContext(state, {}).yesterday).toEqual({
      weather: 'storm',
      fordModifier: -1,
      lost: true,
    })
    // Two nights later, nothing is left of that day.
    const later = session.step(session.step(state, { type: 'action', id: 'camp' }).state, {
      type: 'advanceTime',
      minutes: 2 * 24 * 60,
    }).state
    expect(tripContext(later, {}).yesterday).toEqual({ lost: false })
  })

  it('resolves checks with the oracle and keeps travelling', () => {
    const { bindings } = parseBindings(
      {
        on: {
          WEATHER_CHECK_REQUIRED: { resolve: 'table.weather' },
          NAVIGATION_CHECK_REQUIRED: { resolve: 'table.lost-check' },
          ENCOUNTER_CHECK_REQUIRED: { resolve: 'table.encounter' },
        },
      },
      'sys',
    )
    // weather d2=1 (clear, +1 to navigation), lost d6=4 (+1 → 5, on course), encounter d6=5 (bandits)
    const oracle = createOracleEngine({ registry, random: sequence([0.1, 3.5 / 6, 4.5 / 6]) })
    const session = createSession({
      travel: createTravelEngine({ world, rules, calendar: core.calendar }),
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

  it('tells what the last step did, and what was rolled by hand after it', () => {
    const oracle = createOracleEngine({ registry, random: sequence([0.1, 3.5 / 6, 4.5 / 6]) })
    const session = createSession({
      travel: createTravelEngine({ world, rules, calendar: core.calendar }),
      oracle,
      bindings: parseBindings(
        {
          on: {
            WEATHER_CHECK_REQUIRED: { resolve: 'table.weather' },
            NAVIGATION_CHECK_REQUIRED: { resolve: 'table.lost-check' },
            ENCOUNTER_CHECK_REQUIRED: { resolve: 'table.encounter' },
          },
        },
        'sys',
      ).bindings,
      now: () => 'T',
    })
    expect(lastStepEntries(start())).toEqual([])
    const first = session.step(start(), { type: 'setDestination', hex: '2,0' }).state
    const travelled = session.step(first, { type: 'travel' })
    expect(lastStepEntries(travelled.state)).toEqual(travelled.entries)
    expect(travelled.entries.map((e) => e.text).filter(Boolean)).toEqual([
      'Despejado',
      'En rumbo',
      'Bandidos (PRE 1)',
    ])
    // A table rolled by hand after the step is told with it, until the next step.
    const rolled = addEntry(travelled.state, {
      source: 'oracle',
      code: 'ORACLE_ROLL',
      text: 'Rain',
    })
    expect(
      lastStepEntries(rolled)
        .map((e) => e.text)
        .filter(Boolean),
    ).toEqual(['Despejado', 'En rumbo', 'Bandidos (PRE 1)', 'Rain'])
    const next = session.step(rolled, { type: 'travel' })
    expect(lastStepEntries(next.state)).toEqual(next.entries)
  })

  it('pauses after a check that says so, or an entry that comes up with pause', () => {
    const paused = loadPacks([
      { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nlocale: en\n' },
      {
        path: 'p/t.yaml',
        content: `
kind: table
id: omen
roll: 1d2
entries:
  - { range: 1, result: Nothing }
  - { range: 2, result: Lost in the fog, set: { lost: true }, pause: true }
`,
      },
    ]).registry
    const run = (pause: boolean, roll: number) =>
      createSession({
        travel: createTravelEngine({
          world,
          rules: { ...coreRules, checks: [{ event: 'OMEN', at: '06:00', pause }] },
        }),
        rules: { ...coreRules, values: { lost: { blocks: ['travel.move'] } } },
        oracle: createOracleEngine({ registry: paused, random: sequence([roll]) }),
        bindings: parseBindings({ on: { OMEN: { resolve: 'table.omen' } } }, 'p').bindings,
        now: () => 'T',
      })
    const go = (session: ReturnType<typeof run>) =>
      session.step(session.step(start(), { type: 'setDestination', hex: '2,0' }).state, {
        type: 'travel',
      })
    // Neither pauses: the trip goes on.
    expect(go(run(false, 0.1)).state.travel.location).not.toBe('0,0')
    // The check pauses: rolled, it waits for Continue.
    const checkPaused = go(run(true, 0.1))
    expect(checkPaused.state.travel.location).toBe('0,0')
    expect(checkPaused.entries.map((e) => e.code)).toContain('CHECK_PAUSED')
    const [pending] = checkPaused.state.travel.pendingChecks
    expect(pending.rolled).toEqual({})
    // The entry that came up pauses, and Continue applies what it rolled (lost).
    const session = run(false, 0.9)
    const entryPaused = go(session).state
    expect(entryPaused.travel.pendingChecks[0].rolled).toEqual({ values: { lost: true } })
    expect(entryPaused.travel.today).toBeUndefined()
    const continued = session.step(entryPaused, {
      type: 'resolveCheck',
      id: entryPaused.travel.pendingChecks[0].id,
    }).state
    expect(continued.travel.pendingChecks).toEqual([])
    expect(continued.travel.today).toEqual({ lost: true })
  })

  it('journals the actions the system takes, their effects and the bounds they hit', () => {
    const fed = {
      ...coreRules,
      resources: { food: { min: 0 } },
      actions: {
        ...coreRules.actions,
        // Day-end eating, then a meal that takes another action (do:).
        eat: {
          on: 'time.day-end',
          do: [{ effects: { 'party.resources.food': -1 } }, { do: 'actions.grumble' }],
        },
        grumble: {
          when: { below: 'food' },
          do: [{ effects: { 'party.stats.morale': -1 } }],
        },
      },
    }
    const bindings = { on: {}, stats: { morale: { min: 0 } } }
    const session = createSession({
      travel: createTravelEngine({
        world,
        rules: fed,
        stats: bindings.stats,
        calendar: core.calendar,
      }),
      bindings,
      rules: fed,
      now: () => 'T',
    })
    const hungry = { ...start(), stats: { morale: 1 } }
    hungry.travel.resources = { food: 0 }
    const { state, entries } = session.step(hungry, { type: 'action', id: 'camp' })
    const lines = entries.map((e) => [e.code, e.data?.action ?? e.data?.path, e.data?.effects])
    expect(lines).toContainEqual(['ACTION_TAKEN', 'eat', { 'party.resources.food': -1 }])
    expect(lines).toContainEqual(['LIMIT_REACHED', 'party.resources.food', undefined])
    expect(lines).toContainEqual(['ACTION_TAKEN', 'grumble', { 'party.stats.morale': -1 }])
    expect(state.stats.morale).toBe(0)
    expect(state.travel.resources.food).toBe(0)
  })

  it('applies the effects of an action’s steps and tells them on its line', () => {
    const stepped = {
      ...coreRules,
      values: { lost: { blocks: ['travel.move'] } },
      actions: {
        ...coreRules.actions,
        camp: {
          do: [
            { do: 'actions.eat' },
            { time: '06:00' },
            { unless: { below: 'food' }, effects: { 'party.stats.fatigue': -1 } },
            { when: { below: 'food' }, effects: { 'party.stats.fatigue': 1 } },
          ],
        },
        forage: { unless: { forageImpossible: true }, do: [{ time: 60 }] },
      },
    }
    const system = {
      id: 'x',
      name: '',
      packs: [],
      rules: stepped,
      bindings: { on: {}, stats: { fatigue: { min: 0 } } },
    }
    const session = createSession({
      travel: createTravelEngine({ world, rules: stepped }),
      bindings: system.bindings,
      rules: stepped,
      now: () => 'T',
    })
    const tired = { ...start(), stats: { fatigue: 2 } }
    const { state, entries } = session.step(tired, { type: 'action', id: 'camp' })
    expect(state.stats.fatigue).toBe(1)
    expect(entries.find((e) => e.data?.action === 'camp')?.data?.effects).toEqual({
      'party.stats.fatigue': -1,
    })
    // Today's values (set by the weather) make an action unavailable, with the reason.
    expect(
      tripAvailability({ system }, { ...start(), dayVars: { forageImpossible: true } }),
    ).toMatchObject({ forage: { condition: 'unless' } })
    const refused = session.step(
      { ...start(), dayVars: { forageImpossible: true } },
      {
        type: 'action',
        id: 'forage',
      },
    )
    expect(refused.state.travel.time).toBe(start().travel.time)
  })

  it('applies lost outcomes', () => {
    const { bindings } = parseBindings(
      {
        on: {
          WEATHER_CHECK_REQUIRED: { resolve: 'table.weather' },
          NAVIGATION_CHECK_REQUIRED: { resolve: 'table.lost-check' },
        },
      },
      'sys',
    )
    // weather d2=2 (rain, -1), lost d6=2 (-1 → 1, lost); the encounter check has no table
    // and doesn't pause: the journal notes it and the trip goes on
    const oracle = createOracleEngine({ registry, random: sequence([0.9, 1.5 / 6]) })
    const session = createSession({
      travel: createTravelEngine({ world, rules, calendar: core.calendar }),
      rules,
      oracle,
      bindings,
    })
    const { state } = session.step(
      session.step(start(), { type: 'setDestination', hex: '2,0' }).state,
      { type: 'travel' },
    )
    expect(state.travel.today).toEqual({ lost: true })
    expect(state.travel.pendingChecks).toEqual([])
    expect(state.journal.find((e) => e.code === 'CHECK_NOTED')?.data).toEqual({
      event: 'ENCOUNTER_CHECK_REQUIRED',
    })
    expect(state.journal.some((e) => e.code === 'CHECK_PENDING')).toBe(false)
  })

  it('keeps the trip going when a bound table is broken', () => {
    const { bindings } = parseBindings(
      { on: { WEATHER_CHECK_REQUIRED: { resolve: 'table.nowhere' } } },
      'sys',
    )
    const session = createSession({
      travel: createTravelEngine({ world, rules, calendar: core.calendar }),
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
  - { result: 'Starving ({{party.resources.food}} food, {{terrain}})', when: { party.resources.food: { lt: 1 } }, effects: { party.stats.morale: -1 } }
  - { result: 'Fed ({{party.resources.food}} food, morale {{party.stats.morale}})', when: { party.resources.food: { gte: 1 } } }
`,
      },
    ])
    const { bindings } = parseBindings(
      { on: { WEATHER_CHECK_REQUIRED: { resolve: 'table.hunger' } } },
      'p',
    )
    const session = createSession({
      travel: createTravelEngine({
        world,
        rules: { ...rules, checks: [{ event: 'WEATHER_CHECK_REQUIRED', at: '06:00' }] },
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

  it('only stops for checks without a table when they pause, and records user notes', () => {
    const session = createSession({
      travel: createTravelEngine({ world, rules, calendar: core.calendar }),
    })
    const go = (s: ReturnType<typeof session.step>['state']) =>
      session.step(session.step(s, { type: 'setDestination', hex: '2,0' }).state, {
        type: 'travel',
      }).state
    let state = go(start())
    // Nothing rolls them and none says `pause: true`: noted in the journal, the trip goes on.
    expect(state.travel.pendingChecks).toEqual([])
    expect(state.journal.filter((e) => e.code === 'CHECK_NOTED')).toHaveLength(3)
    const pausing = createSession({
      travel: createTravelEngine({
        world,
        rules: { ...rules, checks: [{ event: 'LANDMARK', at: '06:00', pause: true }] },
      }),
    })
    const waiting = pausing.step(
      pausing.step(start(), { type: 'setDestination', hex: '2,0' }).state,
      { type: 'travel' },
    ).state
    expect(waiting.travel.pendingChecks.map((c) => c.event)).toEqual(['LANDMARK'])
    // It says the hex it came up in.
    expect(waiting.journal.at(-1)).toMatchObject({
      code: 'CHECK_PENDING',
      data: { event: 'LANDMARK', hex: waiting.travel.location },
    })
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
    const { bindings } = parseBindings({ on: { NIGHT: { resolve: 'table.encounter' } } }, 'sys')
    const session = createSession({
      travel: createTravelEngine({
        world,
        rules: { ...coreRules, checks: [{ event: 'NIGHT', at: 'actions.camp' }] },
      }),
      oracle: createOracleEngine({ registry, random: sequence([0.9]) }),
      bindings,
    })
    const evening = {
      ...start(),
      travel: { ...start().travel, time: defaultCalendar.at(1, '18:00') },
    }
    const { entries } = session.step(evening, { type: 'action', id: 'camp' })
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
      actions: {
        ...rules.actions,
        pray: { do: [{ time: 60 }, { effects: { 'party.stats.morale': 1 } }] },
      },
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
    const value = {
      effects: { 'party.resources.food': -5, 'party.stats.morale': 2, 'party.stats.fatigue': -1 },
      other: 1,
    }
    expect(tripChanges(value)).toEqual([
      ['party.resources.food', -5],
      ['party.stats.morale', 2],
      ['party.stats.fatigue', -1],
    ])
    // Supplies stop at the bounds the system declares (none: they may go negative).
    expect(applyResult({ ...start(), stats: {} }, value).travel.resources.food).toBeLessThan(0)
    const state = applyResult({ ...start(), stats: { pre: 1 } }, value, {}, { food: { min: 0 } })
    expect(state.travel.resources.food).toBe(0)
    expect(state.travel.reached).toEqual({ below: ['food'] })
    // A stat the system doesn't bound can go anywhere; its min keeps it in place.
    expect(state.stats).toEqual({ pre: 1, morale: 2, fatigue: -1 })
    const bounded = applyResult({ ...start(), stats: {} }, value, { fatigue: { min: 0 } })
    expect(bounded.stats.fatigue).toBe(0)
    expect(tripChanges({ result: 'nothing' })).toEqual([])
  })

  it('reads effects, and keeps stats within bounds', () => {
    expect(
      effectsOf({
        effects: { 'party.stats.morale': '+3', 'party.stats.luck': '=2', 'factions.x.rep': 1 },
      }),
    ).toEqual({ 'party.stats.morale': 3, 'party.stats.luck': '=2', 'factions.x.rep': 1 })
    const target = { stats: { morale: 4 }, travel: { resources: { food: 1 }, fatigue: 0 } }
    const { applied, limits, unknown } = applyEffects(
      target,
      {
        'party.stats.morale': 3,
        'party.stats.luck': '=2',
        'party.resources.food': -3,
        'factions.x.rep': 1,
      },
      { morale: { min: 0, max: 5 } },
      { food: { min: 0 } },
    )
    expect(target.stats).toEqual({ morale: 5, luck: 2 })
    expect(target.travel.resources.food).toBe(0)
    expect(limits).toEqual([
      { path: 'party.stats.morale', limit: 'max', value: 5 },
      { path: 'party.resources.food', limit: 'min', value: 0 },
    ])
    expect(applied).toEqual([
      { path: 'party.stats.morale', from: 4, to: 5 },
      { path: 'party.stats.luck', from: 0, to: 2 },
      { path: 'party.resources.food', from: 1, to: 0 },
    ])
    expect(unknown).toEqual(['factions.x.rep'])
  })

  it('maps table values to travel outcomes', () => {
    expect(toOutcome({ lost: true, weather: 'storm', other: 1 }, { lost: {} })).toEqual({
      values: { lost: true },
      weather: 'storm',
    })
    // The values a system declares, whatever their names (lost isn't built in).
    expect(toOutcome({ lost: true, stranded: true }, { stranded: {} })).toEqual({
      values: { stranded: true },
    })
    // Effects on the party are the session's (effectsOf), not the travel engine's.
    expect(toOutcome({ effects: { 'party.resources.food': 2 } })).toEqual({})
  })
})

describe('older trips without totals', () => {
  it('rebuild hexes and actions from the journal', () => {
    const travel = initialTravelState({ location: 'a', mode: 'walk' })
    delete travel.totals
    const journal = [
      { code: 'HEX_ENTERED', data: { hex: 'b' } },
      { code: 'ACTION_TAKEN', data: { action: 'camp' } },
      { code: 'NOTE' },
    ]
    const migrated = migrateTotals({ travel, journal })
    expect(migrated.travel.totals).toEqual({
      hexes: 1,
      marched: 0,
      taken: { camp: 1 },
      checks: 0,
      spent: {},
      gained: {},
    })
    expect(migrateTotals(migrated)).toBe(migrated)
  })
})

describe('a step that rolls a table of the Oracle', () => {
  const { registry: reg, ok } = loadPacks([
    { path: 'r/pack.yaml', content: 'id: r\nversion: 0.1.0\nlocale: en\n' },
    {
      path: 'r/t.yaml',
      content: `
kind: table
id: ruins
name: Among the ruins
roll: 1d2
entries:
  - { range: 1, result: Old coins, effects: { party.resources.food: 1 }, set: { found: true } }
  - { range: 2, result: Bones, pause: true }
`,
    },
    { path: 'r/locales/es/t.yaml', content: 'ruins:\n  name: Entre las ruinas\n' },
  ])
  const search = {
    ...coreRules,
    values: { found: {} },
    actions: {
      ...coreRules.actions,
      search: { do: [{ time: 60 }, { roll: 'table.ruins' }] },
    },
  }
  const play = (die: number, locale = 'en') =>
    createSession({
      travel: createTravelEngine({ world, rules: search, calendar: core.calendar }),
      oracle: createOracleEngine({ registry: reg, random: sequence([(die - 1) / 2]) }),
      rules: search,
      // No binding names it: the step does, found from the rules' pack.
      pack: 'r',
      locale,
      now: () => 'T',
    }).step(start(), { type: 'action', id: 'search' }).state

  it('loads', () => expect(ok).toBe(true))

  it('rolls it with no check around it: its result, effects and values reach the trip', () => {
    const state = play(1)
    const result = state.journal.find((e) => e.code === 'ORACLE_RESULT')
    expect(result).toMatchObject({
      text: 'Old coins',
      data: { event: 'table.ruins', named: 'Among the ruins', table: 'r/ruins' },
    })
    expect(state.travel.resources.food).toBe(3)
    expect(state.travel.today).toMatchObject({ found: true })
    expect(state.travel.pendingChecks).toEqual([])
  })

  it('names it in the UI language, and pauses when its entry says so', () => {
    const state = play(2, 'es')
    expect(state.journal.find((e) => e.code === 'ORACLE_RESULT')?.data?.named).toBe(
      'Entre las ruinas',
    )
    expect(state.journal.some((e) => e.code === 'CHECK_PAUSED')).toBe(true)
    expect(state.travel.pendingChecks).toHaveLength(1)
  })
})

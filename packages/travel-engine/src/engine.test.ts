import { describe, expect, it } from 'vitest'
import {
  distance,
  keyOf,
  neighborCells,
  parseKey,
  toAxial,
  type GridShape,
} from '@open-tabletop/hex'
import { defaultCalendar } from '@open-tabletop/time'
import {
  availableActions,
  createTravelEngine,
  initialTravelState,
  parseTravelRules,
  type TravelState,
  type TravelWorld,
} from './index'

const shape: GridShape = { orientation: 'flat', width: 10, height: 10 }

/** Steppe everywhere, mountains in column 3 (rows 0–7), sea at 6,6, a road along row 9. */
function makeWorld(): TravelWorld {
  const road = new Set(Array.from({ length: 10 }, (_, c) => `${c},9`))
  const terrain = (hex: string) => {
    const { col, row } = parseKey(hex as `${number},${number}`)
    if (hex === '6,6') return 'sea'
    if (col === 3 && row <= 7) return 'mountains'
    return 'steppe'
  }
  return {
    hexKm: 30,
    cell: (hex) => {
      const c = parseKey(hex as `${number},${number}`)
      return c.col >= 0 && c.row >= 0 && c.col < 10 && c.row < 10 ? { terrain: terrain(hex) } : null
    },
    neighbors: (hex) => neighborCells(parseKey(hex as `${number},${number}`), shape).map(keyOf),
    distance: (a, b) =>
      distance(
        toAxial(parseKey(a as `${number},${number}`), 'flat'),
        toAxial(parseKey(b as `${number},${number}`), 'flat'),
      ),
    edges: (a, b) => (road.has(a) && road.has(b) ? ['road'] : []),
  }
}

/** Kal-Arath-like rules: 1 hex = 30 km = 1 day on foot (8 h of marching). */
const { rules, errors } = parseTravelRules({
  kind: 'travel-rules',
  day: { start: '06:00', nightfall: '20:00' },
  travel: { hoursPerDay: 8 },
  terrains: {
    steppe: { multiplier: 1 },
    mountains: { multiplier: 0.25 },
    sea: { passable: false },
  },
  edges: { road: { multiplier: 1.5 } },
  modes: { foot: { kmPerDay: 30 }, horse: { kmPerDay: 60, consumes: { fodder: 1 } } },
  resources: { food: { perDay: 1 } },
  weather: { storm: { speed: 0 }, 'heavy-rain': { speed: 0.5 } },
  checks: [
    { event: 'WEATHER_CHECK_REQUIRED', at: 'day-start' },
    { event: 'NAVIGATION_CHECK_REQUIRED', at: 'day-start', unless: { edges: ['road', 'river'] } },
    { event: 'ENCOUNTER_CHECK_REQUIRED', at: 'day-start' },
    { event: 'CAMP_ENCOUNTER_CHECK_REQUIRED', at: 'camp' },
  ],
})

const world = makeWorld()
const engine = createTravelEngine({ world, rules: rules! })
const start = (location = '0,0', mode = 'foot'): TravelState =>
  initialTravelState({
    location,
    mode,
    time: defaultCalendar.at(1, '06:00'),
    resources: { food: 3, fodder: 1 },
  })

/** Applies actions in order, resolving every pending check with an empty outcome. */
function run(state: TravelState, ...actions: Parameters<typeof engine.apply>[1][]) {
  const events = []
  for (const action of actions) {
    const result = engine.apply(state, action)
    state = result.state
    events.push(...result.events)
  }
  return { state, events }
}
const resolveAll = (state: TravelState) =>
  run(state, ...state.pendingChecks.map((c) => ({ type: 'resolveCheck' as const, id: c.id })))

describe('rules', () => {
  it('validates rules', () => {
    expect(errors).toEqual([])
    const bad = parseTravelRules({
      day: { start: '6am', nightfall: '20:00' },
      travel: { hoursPerDay: 30 },
      terrains: {},
      modes: {},
    })
    expect(bad.rules).toBeUndefined()
    expect(bad.errors.join('\n')).toContain('day.start')
    expect(bad.errors.join('\n')).toContain('travel.hoursPerDay')
  })
})

describe('routes', () => {
  it('plans around impassable and slow terrain', () => {
    // Next to the end of the range, going around (3,8) beats crossing a mountain hex…
    const around = engine.plan(start('2,7'), '4,7')!
    expect(around.some((h) => world.cell(h)?.terrain === 'mountains')).toBe(false)
    expect(around.at(-1)).toBe('4,7')
    // …but far from it, crossing is faster than a long detour.
    const through = engine.plan(start('2,2'), '4,2')!
    expect(through.some((h) => world.cell(h)?.terrain === 'mountains')).toBe(true)
    expect(engine.plan(start(), '6,6')).toBeNull() // the sea is impassable
  })

  it('shortest counts steps, fastest counts time', () => {
    const shortest = engine.plan(start('2,4'), '4,4', 'shortest')!
    expect(shortest.length - 1).toBe(world.distance('2,4', '4,4'))
  })

  it('uses roads to go faster', () => {
    expect(engine.stepMinutes(start('0,9'), '0,9', '1,9')).toBe(320) // 480 / 1.5
    expect(engine.stepMinutes(start('0,8'), '0,8', '1,8')).toBe(480)
  })
})

describe('travel', () => {
  it('asks for the day-start checks before moving', () => {
    const first = run(start(), { type: 'setDestination', hex: '2,0' }, { type: 'travel' })
    const { state } = first
    let { events } = first
    expect(
      events
        .filter((e) => e.type === 'CHECK_REQUIRED')
        .map((e) => e.type === 'CHECK_REQUIRED' && e.check.event),
    ).toEqual(['WEATHER_CHECK_REQUIRED', 'NAVIGATION_CHECK_REQUIRED', 'ENCOUNTER_CHECK_REQUIRED'])
    expect(events.at(-1)).toMatchObject({ type: 'TRAVEL_STOPPED', reason: 'check' })
    expect(state.location).toBe('0,0')

    ;({ events } = run(resolveAll(state).state, { type: 'travel' }))
    // One hex per day on foot: 8 h of marching from 06:00.
    expect(events.find((e) => e.type === 'HEX_ENTERED')).toMatchObject({
      hex: '1,0',
      time: defaultCalendar.at(1, '14:00'),
    })
    expect(events.at(-1)).toMatchObject({ reason: 'day-limit' })
  })

  it('covers two hexes a day on horseback', () => {
    let { state } = run(
      start('0,0', 'horse'),
      { type: 'setDestination', hex: '2,0' },
      { type: 'travel' },
    )
    ;({ state } = resolveAll(state))
    const { state: after, events } = run(state, { type: 'travel' })
    expect(after.location).toBe('2,0')
    expect(events.filter((e) => e.type === 'HEX_ENTERED')).toHaveLength(2)
    expect(events).toContainEqual({ type: 'DESTINATION_REACHED', hex: '2,0' })
  })

  it('skips the navigation check when following a road', () => {
    const { events } = run(start('0,9'), { type: 'setDestination', hex: '3,9' }, { type: 'travel' })
    const checks = events.flatMap((e) => (e.type === 'CHECK_REQUIRED' ? [e.check.event] : []))
    expect(checks).not.toContain('NAVIGATION_CHECK_REQUIRED')
    expect(checks).toContain('WEATHER_CHECK_REQUIRED')
  })

  it('stays put for the day when lost', () => {
    let { state } = run(start(), { type: 'setDestination', hex: '2,0' }, { type: 'travel' })
    const nav = state.pendingChecks.find((c) => c.event === 'NAVIGATION_CHECK_REQUIRED')!
    ;({ state } = run(state, { type: 'resolveCheck', id: nav.id, outcome: { lost: true } }))
    ;({ state } = resolveAll(state))
    const { events } = run(state, { type: 'travel' })
    // Being lost is a value the system declares (here the older built-in one): it blocks travel.
    expect(events.at(-1)).toMatchObject({ reason: 'value', value: 'lost' })
    expect(engine.availability(state).travel).toEqual({ value: 'lost' })
  })

  it('applies weather: storms stop travel, heavy rain halves speed', () => {
    let { state } = run(start(), { type: 'setDestination', hex: '2,0' }, { type: 'travel' })
    const weather = state.pendingChecks.find((c) => c.event === 'WEATHER_CHECK_REQUIRED')!
    ;({ state } = run(state, {
      type: 'resolveCheck',
      id: weather.id,
      outcome: { weather: 'storm' },
    }))
    ;({ state } = resolveAll(state))
    expect(run(state, { type: 'travel' }).events.at(-1)).toMatchObject({ reason: 'weather' })

    ;({ state } = run(state, { type: 'setWeather', weather: 'heavy-rain' }, { type: 'travel' }))
    expect(state.location).toBe('0,0')
    expect(state.progress).toBe(480) // half a hex: progress carries over to tomorrow
  })

  it('reports blocked routes when the map changes', () => {
    let { state } = run(start(), { type: 'setDestination', hex: '2,0' })
    ;({ state } = resolveAll(run(state, { type: 'travel' }).state))
    state = { ...state, route: ['0,0', '6,6'] }
    const { events } = run(state, { type: 'travel' })
    expect(events).toContainEqual({ type: 'ROUTE_BLOCKED', from: '0,0', to: '6,6' })
  })

  it('never mutates the input state', () => {
    const before = start()
    const snapshot = structuredClone(before)
    run(before, { type: 'setDestination', hex: '2,0' }, { type: 'travel' })
    expect(before).toEqual(snapshot)
  })
})

describe('camp, resources and the end of the day', () => {
  it('consumes resources, schedules camp checks and moves to the next morning', () => {
    const { state, events } = run(start('0,0', 'horse'), { type: 'camp' })
    expect(state.resources).toEqual({ food: 2, fodder: 0 })
    expect(state.time).toBe(defaultCalendar.at(2, '06:00'))
    expect(events).toContainEqual({ type: 'DAY_STARTED', day: 2 })
    expect(
      events.some(
        (e) => e.type === 'CHECK_REQUIRED' && e.check.event === 'CAMP_ENCOUNTER_CHECK_REQUIRED',
      ),
    ).toBe(true)
  })

  it('ends every day with the system’s day-end checks: short of supplies, in camp', () => {
    const tired = createTravelEngine({
      world,
      rules: {
        ...rules!,
        checks: [
          {
            event: 'HUNGER',
            at: 'day-end',
            when: { short: true },
            effects: { 'party.stats.fatigue': 1 },
          },
          {
            event: 'SLEEP',
            at: 'day-end',
            when: { all: [{ short: false }, { camping: true }] },
            effects: { 'party.stats.fatigue': -1 },
          },
        ],
      },
    })
    const hungry = tired.apply({ ...start(), resources: { food: 0 } }, { type: 'camp' })
    expect(hungry.events).toContainEqual({ type: 'RESOURCE_DEPLETED', resource: 'food' })
    expect(hungry.state.pendingChecks).toEqual([
      expect.objectContaining({
        event: 'HUNGER',
        context: expect.objectContaining({ short: true, camping: true }),
        effects: { 'party.stats.fatigue': 1 },
      }),
    ])
    expect(tired.apply(start(), { type: 'camp' }).state.pendingChecks.map((c) => c.event)).toEqual([
      'SLEEP',
    ])
    // Waiting a day out, fed, without camping: no day-end check applies.
    const waited = tired.apply(start(), { type: 'advanceTime', minutes: 24 * 60 }).state
    expect(waited.pendingChecks).toEqual([])
  })

  it('eats supplies for every day that passes, however it passes', () => {
    // Resting through two full days without camping still uses two days of food.
    const { state, events } = run(start(), { type: 'rest', minutes: 48 * 60 })
    expect(state.resources.food).toBe(1)
    expect(events.filter((e) => e.type === 'DAY_STARTED')).toHaveLength(1)
    const waited = run(start(), { type: 'advanceTime', minutes: 30 * 60 }).state
    expect(waited.resources.food).toBe(2)
  })

  it('remembers whether the party ended yesterday lost', () => {
    const lostToday = { ...start(), today: { lost: true } }
    const camped = resolveAll(engine.apply(lostToday, { type: 'camp' }).state).state
    expect(camped.yesterday).toEqual({ lost: true })
    expect(camped.today).toBeUndefined()
    // Older trips kept it as lostToday: read the same way.
    const older = { ...start(), lostToday: true }
    expect(resolveAll(engine.apply(older, { type: 'camp' }).state).state.yesterday).toEqual({
      lost: true,
    })
    // The next dawn's checks see it, so finding the way can be harder.
    const going = engine.apply(camped, { type: 'setDestination', hex: '0,5' }).state
    const dawn = engine.apply(going, { type: 'travel' }).state
    const navigation = dawn.pendingChecks.find((c) => c.event === 'NAVIGATION_CHECK_REQUIRED')
    expect(navigation?.context.yesterday).toEqual({ lost: true })
    // A day not lost clears it.
    expect(resolveAll(engine.apply(start(), { type: 'camp' }).state).state.yesterday).toEqual({
      lost: false,
    })
  })

  it('reports supplies eaten and rests', () => {
    const { events } = run(start(), { type: 'camp' })
    expect(events).toContainEqual({
      type: 'SUPPLIES_USED',
      used: { food: 1 },
      left: { food: 2 },
      time: defaultCalendar.at(2, '00:00'),
    })
    const hungry = run({ ...start(), resources: { food: 0 } }, { type: 'camp' }).events
    expect(hungry.some((e) => e.type === 'SUPPLIES_USED')).toBe(false)
    expect(run(start(), { type: 'rest' }).events[0]).toMatchObject({ type: 'RESTED', minutes: 60 })
  })

  it('applies check outcomes to resources', () => {
    const { state } = run(start(), { type: 'camp' })
    const check = state.pendingChecks[0]
    const after = run(state, {
      type: 'resolveCheck',
      id: check.id,
      outcome: { resources: { food: 3 } },
    }).state
    expect(after.resources.food).toBe(5)
    expect(after.pendingChecks).toHaveLength(0)
  })
})

describe('available actions', () => {
  it('lets systems remove or tune camp and rest', () => {
    const campOnly = createTravelEngine({ world, rules: { ...rules!, actions: { rest: false } } })
    const { state, events } = campOnly.apply(start(), { type: 'rest' })
    expect(events).toEqual([{ type: 'ACTION_UNAVAILABLE', action: 'rest', because: { off: true } }])
    expect(state.time).toBe(start().time)

    const restful = createTravelEngine({
      world,
      rules: { ...rules!, actions: { rest: { minutes: 120 } } },
    })
    const rested = restful.apply(start(), { type: 'rest' }).state
    expect(rested.time - start().time).toBe(120)
  })
})

describe('the system’s own actions', () => {
  const foraging = parseTravelRules({
    ...rules!,
    actions: {
      forage: { name: { en: 'Forage' }, minutes: 240, speed: 0.5, oncePerDay: true },
      pray: { effects: { 'party.stats.morale': 1 } },
    },
    checks: [{ event: 'FORAGE_CHECK_REQUIRED', at: 'forage', when: { terrain: 'steppe' } }],
  }).rules!
  const own = createTravelEngine({ world, rules: foraging })

  it('take time, slow the day and roll their checks', () => {
    const { state, events } = own.apply(start(), { type: 'action', id: 'forage' })
    expect(events.map((e) => e.type)).toEqual(['ACTION_TAKEN', 'CHECK_REQUIRED'])
    expect(state.pendingChecks.map((c) => c.event)).toEqual(['FORAGE_CHECK_REQUIRED'])
    expect(state.time - start().time).toBe(240)
    expect(state.speedToday).toBe(0.5)
    // Once a day: the second time is refused, the next day it's back.
    const again = own.apply(state, { type: 'action', id: 'forage' })
    expect(again.events).toEqual([
      { type: 'ACTION_UNAVAILABLE', action: 'forage', because: { once: true } },
    ])
    const tomorrow = own.apply(own.apply(state, { type: 'camp' }).state, {
      type: 'action',
      id: 'forage',
    })
    expect(tomorrow.events[0]).toMatchObject({ type: 'ACTION_TAKEN', action: 'forage' })
    expect(own.apply(start(), { type: 'action', id: 'dance' }).events).toEqual([
      { type: 'ACTION_UNAVAILABLE', action: 'dance', because: { off: true } },
    ])
  })

  it('say how many of their checks came up', () => {
    const steppe = own.apply(start(), { type: 'action', id: 'forage' }).events[0]
    expect(steppe).toMatchObject({ minutes: 240, checks: 1, hex: '0,0', terrain: 'steppe' })
    // In the mountains nothing applies: the journal can say so.
    const mountains = own.apply(start('3,0'), { type: 'action', id: 'forage' })
    expect(mountains.events).toEqual([
      expect.objectContaining({ type: 'ACTION_TAKEN', checks: 0, terrain: 'mountains' }),
    ])
  })

  it('are listed with camp and rest, and checks can only name existing moments', () => {
    expect(Object.keys(availableActions(foraging).custom)).toEqual(['forage', 'pray'])
    const bad = parseTravelRules({ ...foraging, checks: [{ event: 'X', at: 'fish' }] })
    expect(bad.errors).toEqual([
      'checks.0.at: expected day-start, hex-enter, camp, day-end, forage, pray',
    ])
  })
})

describe('actions as steps, and declared values', () => {
  const stepped = parseTravelRules({
    ...rules!,
    resources: { food: { perDay: 1 } },
    values: {
      stranded: { name: 'Stranded', blocks: ['travel', 'forage'] },
    },
    actions: {
      // The Grey Marches' way of camping: eat, then sleep, with or without enough food.
      camp: {
        do: [
          { eat: 'day' },
          { time: 'dawn' },
          { when: { short: false }, effects: { 'party.stats.fatigue': -1 } },
          { when: { short: true }, effects: { 'party.stats.fatigue': 1 } },
        ],
      },
      rest: { do: [{ time: 90 }] },
      forage: {
        unless: { forageImpossible: true },
        do: [{ time: 180 }, { speed: 0.5 }],
        oncePerDay: true,
      },
      pray: { when: { 'party.stats.faith': { gte: 1 } }, do: [{ time: 'nightfall' }] },
    },
  })
  const own = createTravelEngine({ world, rules: stepped.rules! })

  it('are valid, and steps do one thing', () => {
    expect(stepped.errors).toEqual([])
    const bad = parseTravelRules({
      ...rules!,
      values: { stuck: { blocks: ['fly'] } },
      actions: { nap: { do: [{ time: 30, speed: 0.5 }] } },
    })
    expect(bad.errors).toEqual([
      'actions.nap.do.0: a step does one thing: time, eat, speed or effects',
      'values.stuck.blocks.0: expected travel, camp, rest, nap, mode.foot, mode.horse',
    ])
  })

  it('camp eats once, sleeps until dawn and applies the effects whose condition holds', () => {
    const fed = own.apply(start(), { type: 'camp' })
    expect(fed.state.time).toBe(defaultCalendar.at(2, '06:00'))
    expect(fed.state.resources.food).toBe(2) // eaten once, not again at midnight
    expect(fed.events.filter((e) => e.type === 'SUPPLIES_USED')).toHaveLength(1)
    expect(fed.events.filter((e) => e.type === 'EFFECTS')).toEqual([
      expect.objectContaining({ action: 'camp', effects: { 'party.stats.fatigue': -1 } }),
    ])
    const hungry = own.apply({ ...start(), resources: { food: 0 } }, { type: 'camp' })
    expect(hungry.events.filter((e) => e.type === 'EFFECTS')).toEqual([
      expect.objectContaining({ effects: { 'party.stats.fatigue': 1 } }),
    ])
  })

  it('rests and actions take the time their steps say', () => {
    const rested = own.apply(start(), { type: 'rest' })
    expect(rested.events[0]).toMatchObject({ type: 'RESTED', minutes: 90 })
    expect(own.apply(start(), { type: 'rest', minutes: 30 }).state.time - start().time).toBe(30)
    const foraged = own.apply(start(), { type: 'action', id: 'forage' })
    expect(foraged.events[0]).toMatchObject({ type: 'ACTION_TAKEN', minutes: 180 })
    expect(foraged.state.speedToday).toBe(0.5)
  })

  it('are unavailable on a condition, with the host’s facts, and say why', () => {
    expect(own.availability(start(), { forageImpossible: true }).forage).toEqual({
      condition: 'unless',
    })
    const refused = own.apply(start(), { type: 'action', id: 'forage' }, { forageImpossible: true })
    expect(refused.events).toEqual([
      { type: 'ACTION_UNAVAILABLE', action: 'forage', because: { condition: 'unless' } },
    ])
    expect(own.availability(start()).pray).toEqual({ condition: 'when' })
    const faithful = { party: { stats: { faith: 2 } } }
    expect(own.availability(start(), faithful).pray).toBeUndefined()
    expect(own.apply(start(), { type: 'action', id: 'pray' }, faithful).state.time).toBe(
      defaultCalendar.at(1, '20:00'),
    )
  })

  it('a declared value blocks what it names for the rest of the day', () => {
    let { state } = own.apply(start(), { type: 'setDestination', hex: '2,0' })
    ;({ state } = resolveAll(own.apply(state, { type: 'travel' }).state))
    const check = own.apply(state, { type: 'travel' }).state
    const stuck = { ...check, today: { stranded: true } }
    expect(own.availability(stuck)).toEqual({
      travel: { value: 'stranded' },
      forage: { value: 'stranded' },
      pray: { condition: 'when' },
    })
    expect(own.apply(stuck, { type: 'travel' }).events.at(-1)).toMatchObject({
      reason: 'value',
      value: 'stranded',
    })
    // Set by a result, as a value of the day; gone the next day (yesterday.stranded).
    const pending = { ...start(), pendingChecks: [{ id: 'c9', event: 'X', context: {} }] }
    const set = own.apply(pending, {
      type: 'resolveCheck',
      id: 'c9',
      outcome: { values: { stranded: true } },
    }).state
    expect(set.today).toEqual({ stranded: true })
    const next = own.apply(set, { type: 'camp' }).state
    expect([next.today, next.yesterday]).toEqual([undefined, { stranded: true }])
    // Undeclared now: lost isn't built in when a system declares its values.
    const lost = { ...start(), today: { lost: true } }
    expect(own.availability(lost).travel).toBeUndefined()
  })
})

describe('ways of travelling with conditions', () => {
  const boating = parseTravelRules({
    ...rules!,
    values: { stuck: { blocks: ['mode.horse'] } },
    modes: {
      foot: { kmPerDay: 30 },
      horse: { kmPerDay: 50 },
      // Only boarded at the water's edge (here: the ferry at 2,0).
      boat: { kmPerDay: 40, allowedTerrains: ['water'], when: { hex: '2,0' } },
    },
  })
  const own = createTravelEngine({ world, rules: boating.rules! })

  it('can be chosen only when their condition holds, and a value can block one', () => {
    expect(boating.errors).toEqual([])
    expect(own.availability(start())['mode.boat']).toEqual({ condition: 'when' })
    const refused = own.apply(start(), { type: 'setMode', mode: 'boat' })
    expect(refused.state.mode).toBe('foot')
    expect(refused.events).toEqual([
      { type: 'ACTION_UNAVAILABLE', action: 'mode.boat', because: { condition: 'when' } },
    ])
    expect(own.apply(start('2,0'), { type: 'setMode', mode: 'boat' }).state.mode).toBe('boat')
    const stuck = { ...start(), today: { stuck: true } }
    expect(own.availability(stuck)['mode.horse']).toEqual({ value: 'stuck' })
  })
})

describe('checks that look at the party', () => {
  it('see its supplies', () => {
    const hungry = createTravelEngine({
      world,
      rules: {
        ...rules!,
        checks: [{ event: 'HUNGER', at: 'camp', when: { 'party.resources.food': { lt: 1 } } }],
      },
    })
    expect(hungry.apply(start(), { type: 'camp' }).state.pendingChecks).toEqual([])
    const { state } = hungry.apply({ ...start(), resources: { food: 0 } }, { type: 'camp' })
    expect(state.pendingChecks[0]).toMatchObject({
      event: 'HUNGER',
      context: { party: { resources: { food: 0 }, mode: 'foot' } },
    })
  })
})

describe('generic rules', () => {
  it('are valid travel rules', async () => {
    const { genericTravelRules } = await import('./generic')
    expect(parseTravelRules(genericTravelRules).errors).toEqual([])
  })
})

describe('check context', () => {
  it('carries everything the map knows about the hex (fields, region…)', () => {
    const marches: TravelWorld = {
      ...makeWorld(),
      cell: () => ({ terrain: 'steppe', tags: ['haunted'], region: 'Black Marches', danger: 3 }),
    }
    const { rules: r } = parseTravelRules({
      kind: 'travel-rules',
      day: { start: '06:00', nightfall: '20:00' },
      travel: { hoursPerDay: 8 },
      terrains: {},
      modes: { foot: { kmPerDay: 30 } },
      checks: [
        { event: 'MARCHES_PATROL', at: 'day-start', when: { region: 'Black Marches' } },
        { event: 'ELSEWHERE', at: 'day-start', unless: { region: 'Black Marches' } },
      ],
    })
    const e = createTravelEngine({ world: marches, rules: r! })
    const { events } = e.apply(e.apply(start(), { type: 'setDestination', hex: '1,0' }).state, {
      type: 'travel',
    })
    const checks = events.flatMap((ev) => (ev.type === 'CHECK_REQUIRED' ? [ev.check] : []))
    expect(checks.map((c) => c.event)).toEqual(['MARCHES_PATROL'])
    expect(checks[0].context).toMatchObject({
      region: 'Black Marches',
      danger: 3,
      tags: ['haunted'],
    })
  })
})

describe('check context', () => {
  it('entering a hex sees the edge just walked, also at the destination', () => {
    const { rules: enter } = parseTravelRules({
      kind: 'travel-rules',
      day: { start: '06:00', nightfall: '20:00' },
      travel: { hoursPerDay: 8 },
      terrains: { steppe: { multiplier: 1 } },
      edges: { road: { multiplier: 1.5 } },
      modes: { foot: { kmPerDay: 90 } },
      checks: [{ event: 'ENCOUNTER_CHECK_REQUIRED', at: 'hex-enter', unless: { edges: 'road' } }],
    })
    const engine = createTravelEngine({ world, rules: enter! })
    const checks = (from: string, to: string) => {
      let state = start(from)
      state = engine.apply(state, { type: 'setDestination', hex: to }).state
      return engine
        .apply(state, { type: 'travel' })
        .events.filter((e) => e.type === 'CHECK_REQUIRED')
    }
    expect(checks('0,9', '1,9')).toEqual([]) // along the road, straight to the destination
    expect(checks('1,9', '1,8')).toHaveLength(1) // off the road
  })
})

describe('water', () => {
  /** A row: land, a custom water terrain ("mere"), land. */
  const row: TravelWorld = {
    hexKm: 10,
    cell: (hex) =>
      ({ a: { terrain: 'plains' }, b: { terrain: 'mere', water: true }, c: { terrain: 'plains' } })[
        hex
      ] ?? null,
    neighbors: (hex) => ({ a: ['b'], b: ['a', 'c'], c: ['b'] })[hex] ?? [],
    distance: (x, y) => Math.abs(x.charCodeAt(0) - y.charCodeAt(0)),
    edges: () => [],
  }
  const rulesWith = (extra: object) =>
    parseTravelRules({
      kind: 'travel-rules',
      day: { start: '06:00', nightfall: '20:00' },
      travel: { hoursPerDay: 8 },
      terrains: { plains: { multiplier: 1 } },
      modes: { foot: { kmPerDay: 30 }, boat: { kmPerDay: 40, allowedTerrains: ['water'] } },
      ...extra,
    }).rules!

  it('water hexes follow the water rule when their terrain has none', () => {
    const open = createTravelEngine({ world: row, rules: rulesWith({}) })
    expect(open.plan(start('a'), 'c')).toEqual(['a', 'b', 'c'])
    const closed = createTravelEngine({
      world: row,
      rules: rulesWith({ water: { passable: false } }),
    })
    expect(closed.plan(start('a'), 'c')).toBeNull()
    // A terrain's own rule wins over the water rule.
    const ford = createTravelEngine({
      world: row,
      rules: rulesWith({
        water: { passable: false },
        terrains: { plains: {}, mere: { multiplier: 0.5 } },
      }),
    })
    expect(ford.plan(start('a'), 'c')).toEqual(['a', 'b', 'c'])
  })

  it('a mode allowed only on water sails what is impassable on foot', () => {
    const engine = createTravelEngine({
      world: row,
      rules: rulesWith({ water: { passable: false } }),
    })
    const boat = { ...start('b'), mode: 'boat' }
    expect(engine.stepMinutes(boat, 'b', 'a')).toBe(Infinity) // can't land
    const lake: TravelWorld = {
      ...row,
      cell: () => ({ terrain: 'mere', water: true }),
      neighbors: (h) => (h === 'a' ? ['b'] : ['a']),
    }
    const sailing = createTravelEngine({
      world: lake,
      rules: rulesWith({ water: { passable: false } }),
    })
    expect(sailing.stepMinutes({ ...start('a'), mode: 'boat' }, 'a', 'b')).toBeLessThan(Infinity)
  })
})

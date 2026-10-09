import { describe, expect, it } from 'vitest'
import {
  distance,
  keyOf,
  neighborCells,
  parseKey,
  toAxial,
  type GridShape,
} from '@open-tabletop/hex'
import { calendarFrom, defaultCalendar } from '@open-tabletop/time'
import {
  availableActions,
  createTravelEngine,
  initialTravelState,
  modeThrough,
  olderEatingEdits,
  parseTravelRules,
  type TravelAction,
  type TravelEvent,
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

  it('closes and opens terrains on a condition (passable: { when, unless })', () => {
    const base = rules!
    const season = defaultCalendar.describe(defaultCalendar.at(1, '06:00')).season
    const { rules: seasonal, errors } = parseTravelRules({
      ...base,
      terrains: {
        ...base.terrains,
        // The pass closes in a blizzard and in this season; the sea is crossed only frozen.
        mountains: {
          multiplier: 0.25,
          passable: { unless: { any: [{ weather: 'blizzard' }, { season: 'nope' }] } },
        },
        sea: { passable: { when: { frozen: true } } },
      },
      values: { frozen: { lasts: 'day' } },
    })
    expect(errors).toEqual([])
    const e = createTravelEngine({ world, rules: seasonal! })
    expect(e.stepMinutes(start('2,2'), '2,2', '3,2')).toBe(1920)
    expect(e.stepMinutes({ ...start('2,2'), weather: 'blizzard' }, '2,2', '3,2')).toBe(Infinity)
    expect(e.stepMinutes(start('6,5'), '6,5', '6,6')).toBe(Infinity)
    expect(e.stepMinutes({ ...start('6,5'), today: { frozen: true } }, '6,5', '6,6')).toBe(480)
    // The calendar is seen too.
    const closed = parseTravelRules({
      ...base,
      terrains: { ...base.terrains, mountains: { passable: { unless: { season } } } },
    }).rules!
    expect(createTravelEngine({ world, rules: closed }).plan(start('2,2'), '4,2')).not.toContain(
      '3,2',
    )
    // A wrong condition is a problem of the rules.
    expect(
      parseTravelRules({
        ...base,
        terrains: { sea: { passable: { when: { depth: { gte: 'x' } } } } },
      }).errors,
    ).toHaveLength(1)
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

  it('stays put while a value blocks the way it travels (mode.horse), until it changes', () => {
    const { rules: snowy } = parseTravelRules({
      ...rules!,
      values: { snowbound: { blocks: ['mode.horse'] } },
    })
    const eng = createTravelEngine({ world, rules: snowy! })
    let state: TravelState = { ...start('0,0', 'horse'), today: { snowbound: true } }
    state = eng.apply(state, { type: 'setDestination', hex: '2,0' }).state
    state.dayChecksDone = true
    const { events } = eng.apply(state, { type: 'travel' })
    expect(events.at(-1)).toMatchObject({ reason: 'value', value: 'snowbound' })
    expect(eng.availability(state)).toMatchObject({
      travel: { value: 'snowbound' },
      'mode.horse': { value: 'snowbound' },
    })
    const afoot = eng.apply(state, { type: 'setMode', mode: 'foot' }).state
    expect(eng.availability(afoot).travel).toBeUndefined()
    expect(eng.apply(afoot, { type: 'travel' }).events.some((e) => e.type === 'HEX_ENTERED')).toBe(
      true,
    )
  })

  it("stays put while the host says something blocks it (a member's condition), saying who", () => {
    let state: TravelState = start('0,0')
    state = engine.apply(state, { type: 'setDestination', hex: '2,0' }).state
    state.dayChecksDone = true
    const facts = { party: { blocked: { travel: { value: 'wounded', who: 'kael' } } } }
    const { events } = engine.apply(state, { type: 'travel' }, facts)
    expect(events.at(-1)).toMatchObject({ reason: 'value', value: 'wounded', who: 'kael' })
    expect(engine.availability(state, facts).travel).toEqual({ value: 'wounded', who: 'kael' })
    expect(engine.availability(state).travel).toBeUndefined()
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

describe('the trip’s totals', () => {
  it('counts hexes, hours marched, actions, checks and supplies, read as trip.*', () => {
    let { state } = run(
      start('0,0', 'horse'),
      { type: 'setDestination', hex: '2,0' },
      { type: 'travel' },
    )
    ;({ state } = resolveAll(state))
    ;({ state } = run(state, { type: 'travel' }, { type: 'camp' }))
    ;({ state } = resolveAll(state))
    expect(state.totals).toEqual({
      hexes: 2,
      marched: 8 * 60,
      taken: { camp: 1, eat: 1 },
      checks: 4,
      spent: { food: 1, fodder: 1 },
      gained: {},
    })
    const seen = engine.context(state)
    expect(seen.trip).toMatchObject({
      hexes: 2,
      km: 60,
      hours: 8,
      taken: { camp: 1, eat: 1 },
      checks: 4,
      spent: { food: 1, fodder: 1 },
      day: 2,
    })
    // A check's outcome that gives supplies counts as gained.
    state.pendingChecks.push({ id: 'x', event: 'FORAGE', context: {} })
    ;({ state } = run(state, {
      type: 'resolveCheck',
      id: 'x',
      outcome: { resources: { food: 2 } },
    }))
    expect(state.totals?.gained).toEqual({ food: 2 })
  })

  it('lets conditions read them: an action only after 50 km', () => {
    const { rules: far, errors: farErrors } = parseTravelRules({
      kind: 'travel-rules',
      day: { start: '06:00', nightfall: '20:00' },
      travel: { hoursPerDay: 8 },
      terrains: { steppe: { multiplier: 1 } },
      modes: { horse: { kmPerDay: 60 } },
      actions: { boast: { when: { 'trip.km': { gte: 50 } }, minutes: 10 } },
    })
    expect(farErrors).toEqual([])
    const tripEngine = createTravelEngine({ world, rules: far! })
    let state = initialTravelState({
      location: '0,0',
      mode: 'horse',
      time: defaultCalendar.at(1, '06:00'),
    })
    state = tripEngine.apply(state, { type: 'setDestination', hex: '1,0' }).state
    expect(tripEngine.availability(state).boast).toEqual({ condition: 'when' })
    state = tripEngine.apply(state, { type: 'travel' }).state
    expect(state.location).toBe('1,0')
    expect(tripEngine.availability(state).boast).toEqual({ condition: 'when' })
    state = tripEngine.apply(state, { type: 'setDestination', hex: '2,0' }).state
    state = tripEngine.apply(state, { type: 'travel' }).state
    expect(tripEngine.availability(state).boast).toBeUndefined()
  })

  it('starts counting in older trips without them', () => {
    const older = start('0,0')
    delete older.totals
    const { state } = run(older, { type: 'camp' })
    expect(state.totals).toMatchObject({ taken: { camp: 1, eat: 1 }, spent: { food: 1 } })
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
    expect(hungry.events).toContainEqual(
      expect.objectContaining({
        type: 'LIMIT_REACHED',
        path: 'party.resources.food',
        limit: 'min',
      }),
    )
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

  it('reports supplies eaten (older rules: an action at day-end) and rests', () => {
    const { events } = run(start(), { type: 'camp' })
    const midnight = defaultCalendar.at(2, '00:00')
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'ACTION_TAKEN',
        action: 'eat',
        on: 'day-end',
        time: midnight,
      }),
    )
    expect(events).toContainEqual({
      type: 'EFFECTS',
      action: 'eat',
      effects: { 'party.resources.food': -1 },
      time: midnight,
    })
    const hungry = run({ ...start(), resources: { food: 0 } }, { type: 'camp' })
    expect(hungry.state.resources.food).toBe(0)
    expect(hungry.events).toContainEqual({
      type: 'LIMIT_REACHED',
      path: 'party.resources.food',
      limit: 'min',
      value: 0,
      time: midnight,
    })
    expect(run(start(), { type: 'rest' }).events[0]).toMatchObject({
      type: 'ACTION_TAKEN',
      action: 'rest',
      minutes: 60,
    })
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
    // Paused on its check: nothing moves the trip on until it's resolved (Continue).
    const paused = { pending: 'FORAGE_CHECK_REQUIRED' }
    for (const order of [
      { type: 'action', id: 'pray' },
      { type: 'travel' },
      { type: 'wait', until: state.time + 60 },
      { type: 'camp' },
    ] as const) {
      const refused = own.apply(state, order)
      expect(refused.events).toEqual([
        {
          type: 'ACTION_UNAVAILABLE',
          action: order.type === 'action' ? order.id : order.type,
          because: paused,
        },
      ])
      expect(refused.state).toEqual(state)
    }
    expect(own.availability(state)).toMatchObject({ travel: paused, pray: paused, forage: paused })
    const resolved = own.apply(state, { type: 'resolveCheck', id: state.pendingChecks[0].id }).state
    expect(own.availability(resolved).pray).toBeUndefined()
    // Once a day: the second time is refused, the next day it's back.
    const again = own.apply(resolved, { type: 'action', id: 'forage' })
    expect(again.events).toEqual([
      { type: 'ACTION_UNAVAILABLE', action: 'forage', because: { once: true } },
    ])
    const tomorrow = own.apply(own.apply(resolved, { type: 'camp' }).state, {
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
    // Older rules (perDay) also eat with an action at day-end.
    expect(Object.keys(availableActions(foraging).all)).toEqual([
      'camp',
      'rest',
      'march',
      'forage',
      'pray',
      'eat',
    ])
    const bad = parseTravelRules({ ...foraging, checks: [{ event: 'X', at: 'fish' }] })
    expect(bad.errors).toEqual([
      'checks.0.at: expected day-start, hex-enter, day-end, camp, rest, forage, pray, eat',
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
      'actions.nap.do.0: a step does one thing: time, speed, effects, do, roll, set or advance',
      'values.stuck.blocks.0: expected travel, camp, rest, march, nap, eat, mode.foot, mode.horse',
    ])
  })

  it('camp eats once, sleeps until dawn and applies the effects whose condition holds', () => {
    const fed = own.apply(start(), { type: 'camp' })
    expect(fed.state.time).toBe(defaultCalendar.at(2, '06:00'))
    expect(fed.state.resources.food).toBe(2) // eaten once, not again at midnight
    expect(fed.events.filter((e) => e.type === 'EFFECTS')).toEqual([
      expect.objectContaining({ action: 'eat', effects: { 'party.resources.food': -1 } }),
      expect.objectContaining({ action: 'camp', effects: { 'party.stats.fatigue': -1 } }),
    ])
    const hungry = own.apply({ ...start(), resources: { food: 0 } }, { type: 'camp' })
    expect(hungry.events.filter((e) => e.type === 'EFFECTS').map((e) => e.effects)).toEqual([
      { 'party.resources.food': -1 },
      { 'party.stats.fatigue': 1 },
    ])
  })

  it('rests and actions take the time their steps say', () => {
    const rested = own.apply(start(), { type: 'rest' })
    expect(rested.events[0]).toMatchObject({ type: 'ACTION_TAKEN', action: 'rest', minutes: 90 })
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
      boat: { kmPerDay: 40, allowedTerrains: ['water'], when: { 'hex.id': '2,0' } },
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

describe('only through', () => {
  it('a condition on the hex entered and the step: a cart only by road', () => {
    const { rules: carts, errors } = parseTravelRules({
      kind: 'travel-rules',
      day: { start: '06:00', nightfall: '20:00' },
      travel: { hoursPerDay: 8 },
      terrains: { steppe: {}, mountains: { multiplier: 0.25 }, sea: { passable: false } },
      edges: { road: { multiplier: 1.5 } },
      modes: { foot: { kmPerDay: 30 }, cart: { kmPerDay: 40, through: { edges: 'road' } } },
    })
    expect(errors).toEqual([])
    const eng = createTravelEngine({ world, rules: carts! })
    const cart = start('0,9', 'cart')
    // Along the road (row 9) it goes; off it, it can't.
    expect(eng.plan(cart, '5,9')).toEqual(['0,9', '1,9', '2,9', '3,9', '4,9', '5,9'])
    expect(eng.stepMinutes(cart, '0,9', '0,8')).toBe(Infinity)
    expect(eng.plan(cart, '0,0')).toBeNull()
    // A broken condition is a problem of the pack.
    const bad = parseTravelRules({
      kind: 'travel-rules',
      day: { start: '06:00', nightfall: '20:00' },
      travel: { hoursPerDay: 8 },
      terrains: {},
      modes: { cart: { kmPerDay: 40, through: { edges: { near: 'road' } } } },
    })
    expect(bad.errors.some((e) => e.startsWith('modes.cart.through'))).toBe(true)
  })

  it('reads the older list of terrains as a condition', () => {
    expect(modeThrough({ allowedTerrains: ['water', 'coast'] })).toEqual({
      any: [{ terrain: ['coast'] }, { water: true }],
    })
    expect(modeThrough({ allowedTerrains: ['water'] })).toEqual({ water: true })
    expect(modeThrough({ allowedTerrains: ['space'] })).toEqual({ terrain: ['space'] })
    expect(modeThrough({})).toBeUndefined()
  })
})

describe('waiting', () => {
  /** Waits, resolving every check it stops for, until it stops for something else. */
  function waitAll(eng: typeof engine, state: TravelState, until: number) {
    const events = []
    for (let i = 0; i < 50; i++) {
      const result = eng.apply(state, { type: 'wait', until })
      state = result.state
      events.push(...result.events)
      const stop = result.events.findLast((e) => e.type === 'TRAVEL_STOPPED')
      if (stop?.type !== 'TRAVEL_STOPPED' || stop.reason !== 'check') break
      for (const check of state.pendingChecks)
        state = eng.apply(state, { type: 'resolveCheck', id: check.id }).state
    }
    return { state, events }
  }
  /** How many times an action was taken. */
  const taken = (events: TravelEvent[], action: string) =>
    events.filter((e) => e.type === 'ACTION_TAKEN' && e.action === action).length
  const at = (day: number, clock: string) => defaultCalendar.at(day, clock)

  it('lives every moment: day-start checks, camp at nightfall, a day of supplies a day', () => {
    const { state, events } = waitAll(engine, start(), at(3, '06:00'))
    expect(state.time).toBe(at(3, '06:00'))
    expect(taken(events, 'camp')).toBe(2)
    expect(events.filter((e) => e.type === 'ACTION_TAKEN' && e.action === 'eat')).toHaveLength(2)
    expect(state.resources.food).toBe(1)
    // Dawn of days 1 and 2 (day 3's dawn is where it ends: travelling will roll them).
    const dawnChecks = events.filter(
      (e) => e.type === 'CHECK_REQUIRED' && e.check.event === 'WEATHER_CHECK_REQUIRED',
    )
    expect(dawnChecks).toHaveLength(2)
    expect(events.at(-1)).toMatchObject({ type: 'TRAVEL_STOPPED', reason: 'waited' })
  })

  it('stops for a check and goes on from there', () => {
    const first = engine.apply(start(), { type: 'wait', until: at(1, '12:00') })
    expect(first.state.time).toBe(at(1, '06:00'))
    expect(first.state.pendingChecks.length).toBeGreaterThan(0)
    expect(first.events.at(-1)).toMatchObject({ reason: 'check' })
  })

  it('a short wait before nightfall neither camps nor eats', () => {
    const morning = { ...start(), dayChecksDone: true }
    const { state, events } = waitAll(engine, morning, at(1, '20:00'))
    expect(state.time).toBe(at(1, '20:00'))
    expect(taken(events, 'camp')).toBe(0)
    expect(state.resources.food).toBe(3)
  })

  it('when night falls and the party can’t camp, the night passes without it, saying why', () => {
    const { rules: blocking } = parseTravelRules({
      kind: 'travel-rules',
      day: { start: '06:00', nightfall: '20:00' },
      travel: { hoursPerDay: 8 },
      terrains: {},
      modes: { foot: { kmPerDay: 30 } },
      values: { hunted: { blocks: ['camp'] } },
    })
    const eng = createTravelEngine({ world, rules: blocking! })
    const hunted = { ...start(), dayChecksDone: true, today: { hunted: true } }
    const { state, events } = waitAll(eng, hunted, at(2, '06:00'))
    expect(state.time).toBe(at(2, '06:00'))
    expect(taken(events, 'camp')).toBe(0)
    expect(events.filter((e) => e.type === 'NIGHT_WITHOUT')).toEqual([
      { type: 'NIGHT_WITHOUT', action: 'camp', because: { value: 'hunted' }, time: at(1, '20:00') },
    ])
    expect(events.at(-1)).toMatchObject({ type: 'TRAVEL_STOPPED', reason: 'waited' })
  })

  it('without a camp in the system, the night just passes', () => {
    const { rules: noCamp } = parseTravelRules({
      kind: 'travel-rules',
      day: { start: '06:00', nightfall: '20:00' },
      travel: { hoursPerDay: 8 },
      terrains: {},
      modes: { foot: { kmPerDay: 30 } },
      resources: { food: { perDay: 1 } },
      actions: { camp: false },
    })
    const eng = createTravelEngine({ world, rules: noCamp! })
    const { state, events } = waitAll(eng, start(), at(2, '10:00'))
    expect(state.time).toBe(at(2, '10:00'))
    expect(taken(events, 'camp')).toBe(0)
    expect(state.resources.food).toBe(2)
    expect(state.day).toBe(2)
  })
})

describe('actions the system triggers, and bounded values', () => {
  /** The new way: supplies with bounds, eating as an action at day-end, nothing built in. */
  const { rules: triggered, errors } = parseTravelRules({
    kind: 'travel-rules',
    day: { start: '06:00', nightfall: '20:00' },
    travel: { hoursPerDay: 8 },
    terrains: { steppe: { multiplier: 1 } },
    modes: { foot: { kmPerDay: 30 }, horse: { kmPerDay: 60 } },
    resources: { food: { min: 0 }, water: { min: 0, max: 4 }, gold: {} },
    values: { lost: { blocks: ['travel'] }, weary: {} },
    checks: [
      { event: 'HUNGER', at: 'day-end', when: { below: 'food' } },
      { event: 'OMEN', at: 'pray' },
      // Without `at`: only a step rolls it.
      { event: 'AMBUSH', when: { terrain: 'steppe' } },
    ],
    actions: {
      eat: {
        on: 'day-end',
        do: [
          { effects: { 'party.resources.food': -1 } },
          { when: { mode: 'horse' }, effects: { 'party.resources.food': -1 } },
        ],
      },
      drink: { on: 'hex-enter', do: [{ effects: { 'party.resources.water': -1 } }] },
      pray: {
        do: [
          { time: 60 },
          { do: 'feast' },
          { roll: 'AMBUSH' },
          { set: { weary: true } },
          { when: { weary: true }, effects: { 'party.stats.faith': 5 } },
          { when: { above: 'faith' }, effects: { 'party.resources.gold': -10 } },
        ],
      },
      feast: {
        when: { 'party.resources.food': { gte: 2 } },
        do: [{ effects: { 'party.resources.food': -2 } }],
      },
      // Follows another action (on: its id), before that action's checks.
      chant: { on: 'pray', do: [{ effects: { 'party.resources.water': '=4' } }] },
    },
  })
  const eng = createTravelEngine({ world, rules: triggered!, stats: { faith: { min: 0, max: 3 } } })
  const begin = (resources: Record<string, number> = { food: 3, water: 2, gold: 0 }) =>
    initialTravelState({
      location: '0,0',
      mode: 'foot',
      time: defaultCalendar.at(1, '06:00'),
      resources,
    })

  it('are valid', () => {
    expect(errors).toEqual([])
  })

  it('run by themselves at their moment, before its checks, and aren’t buttons', () => {
    const fed = eng.apply(begin(), { type: 'camp' })
    expect(fed.state.resources.food).toBe(2)
    expect(fed.events).toContainEqual(
      expect.objectContaining({ type: 'ACTION_TAKEN', action: 'eat', on: 'day-end' }),
    )
    expect(fed.state.pendingChecks).toEqual([])
    // Out of food: the effect stops at the minimum, and the day-end check sees it.
    const hungry = eng.apply(begin({ food: 0 }), { type: 'camp' })
    expect(hungry.state.resources.food).toBe(0)
    expect(hungry.events).toContainEqual(
      expect.objectContaining({
        type: 'LIMIT_REACHED',
        path: 'party.resources.food',
        limit: 'min',
      }),
    )
    expect(hungry.state.pendingChecks.map((c) => c.event)).toEqual(['HUNGER'])
    // A new day forgets what hit a bound.
    expect(hungry.state.reached).toBeUndefined()
    // Every day that passes eats, however it passes.
    expect(eng.apply(begin(), { type: 'advanceTime', minutes: 48 * 60 }).state.resources.food).toBe(
      1,
    )
    // Entering a hex drinks.
    const going = eng.apply(begin(), { type: 'setDestination', hex: '0,1' }).state
    expect(eng.apply(going, { type: 'travel' }).state.resources.water).toBe(1)
  })

  it('see the party (its way of travelling) in their steps’ conditions', () => {
    const riding = { ...begin(), mode: 'horse' }
    expect(eng.apply(riding, { type: 'camp' }).state.resources.food).toBe(1)
  })

  it('take other actions, roll checks, set values, and see bounds hit', () => {
    const party = { party: { stats: { faith: 2 } } }
    const { state, events } = eng.apply(begin(), { type: 'action', id: 'pray' }, party)
    // chant (on: pray) first, then pray's own checks, then its steps in order.
    const order = events.flatMap((e) =>
      e.type === 'ACTION_TAKEN' ? [e.action] : e.type === 'CHECK_REQUIRED' ? [e.check.event] : [],
    )
    expect(order).toEqual(['pray', 'chant', 'OMEN', 'feast', 'AMBUSH'])
    expect(state.resources).toEqual({ food: 1, water: 4, gold: -10 })
    expect(state.today).toEqual({ weary: true })
    // Faith 2 + 5 stops at its max (3): later steps see `above: [faith]`.
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'LIMIT_REACHED',
        path: 'party.stats.faith',
        limit: 'max',
        value: 3,
      }),
    )
    expect(state.reached).toEqual({ above: ['faith'] })
    // A `do:` whose conditions don't hold just doesn't happen (no food for a feast).
    const poor = eng.apply(
      begin({ food: 1, water: 0, gold: 0 }),
      { type: 'action', id: 'pray' },
      party,
    )
    expect(poor.events.some((e) => e.type === 'ACTION_TAKEN' && e.action === 'feast')).toBe(false)
    expect(poor.events.some((e) => e.type === 'ACTION_UNAVAILABLE')).toBe(false)
  })

  it('without a min, values may go negative', () => {
    const { state } = eng.apply(begin(), { type: 'action', id: 'pray' }, {})
    expect(state.resources.gold).toBeLessThan(0)
  })

  it('may come at several moments, and their conditions see which one (moment)', () => {
    const sight = { event: 'SIGHT', at: ['day-start', 'hex-enter'], when: { moment: 'hex-enter' } }
    const bad = { event: 'BAD', at: ['day-start', 'nowhere'] }
    expect(parseTravelRules({ ...triggered!, checks: [sight, bad] }).errors).toContain(
      'checks.1.at.1: expected day-start, hex-enter, day-end, camp, rest, eat, drink, pray, feast, chant',
    )
    const { rules: several, errors } = parseTravelRules({
      ...triggered!,
      checks: [sight],
      actions: {
        watch: {
          on: ['day-start', 'hex-enter'],
          do: [
            { when: { moment: 'day-start' }, effects: { 'party.resources.gold': 1 } },
            { when: { moment: 'hex-enter' }, effects: { 'party.resources.gold': 10 } },
          ],
        },
      },
    })
    expect(errors).toEqual([])
    const eng = createTravelEngine({ world, rules: several! })
    let state = begin()
    let all: TravelEvent[] = []
    for (const action of [{ type: 'setDestination', hex: '1,0' }, { type: 'travel' }] as const) {
      const result = eng.apply(state, action)
      state = result.state
      all = [...all, ...result.events]
      for (const c of state.pendingChecks)
        state = eng.apply(state, { type: 'resolveCheck', id: c.id }).state
    }
    // Dawn: +1 and no sighting; entering the hex: +10 and the sighting.
    expect(state.resources.gold).toBe(11)
    const sights = all.filter((e) => e.type === 'CHECK_REQUIRED')
    expect(sights.map((e) => e.type === 'CHECK_REQUIRED' && e.check.context.moment)).toEqual([
      'hex-enter',
    ])
  })

  it('reject unknown targets and loops', () => {
    const bad = parseTravelRules({
      ...triggered!,
      actions: {
        a: { on: 'nowhere', do: [{ do: 'b' }, { roll: 'NOPE' }, { set: { nope: true } }] },
        b: { do: [{ do: 'c' }] },
        c: { on: 'b' },
        d: { do: [{ do: 'e' }] },
        e: { on: 'day-end', do: [{ do: 'd' }] },
      },
    })
    expect(bad.errors).toEqual([
      // (pray is gone, so is the moment of its check)
      'checks.1.at: expected day-start, hex-enter, day-end, camp, rest, a, b, c, d, e',
      'actions.a.on: expected day-start, hex-enter, day-end, camp, rest, a, b, c, d, e',
      'actions.a.do.1.roll: expected HUNGER, OMEN, AMBUSH',
      'actions.a.do.2.set.nope: expected lost, weary',
      'actions.d: actions take each other in a loop: d → e → d',
    ])
  })

  it('an action’s later steps see what hit a bound while it slept past midnight', () => {
    const { rules: camping } = parseTravelRules({
      ...triggered!,
      actions: {
        ...triggered!.actions,
        camp: {
          do: [
            { time: 'dawn' },
            { unless: { below: 'food' }, effects: { 'party.stats.faith': 1 } },
          ],
        },
      },
    })
    const eng = createTravelEngine({ world, rules: camping! })
    const fx = (food: number) =>
      eng
        .apply(begin({ food, water: 2, gold: 0 }), { type: 'camp' }, { party: { stats: {} } })
        .events.filter((e) => e.type === 'EFFECTS' && e.action === 'camp')
    expect(fx(3)).toHaveLength(1)
    expect(fx(0)).toHaveLength(0)
  })

  it('turns older rules’ eating into the new way, doing the same', () => {
    const older = parseTravelRules({
      ...rules!,
      actions: { camp: { do: [{ eat: 'day' }, { time: 'dawn' }] } },
    }).rules!
    const edits = olderEatingEdits(older)
    expect(edits).toEqual([
      { path: ['resources', 'food', 'perDay'], value: undefined },
      { path: ['resources', 'food', 'min'], value: 0 },
      { path: ['modes', 'horse', 'consumes'], value: undefined },
      { path: ['actions', 'camp', 'do'], value: [{ do: 'eat' }, { time: 'dawn' }] },
      {
        path: ['actions', 'eat'],
        value: {
          on: 'day-end',
          oncePerDay: true,
          do: [
            { effects: { 'party.resources.food': -1 } },
            { when: { mode: 'horse' }, effects: { 'party.resources.fodder': -1 } },
          ],
        },
      },
    ])
    // Applied, the rules are the new way and play the same.
    const next = structuredClone(older) as Record<string, unknown>
    for (const { path, value } of edits) {
      let at = next as Record<string | number, unknown>
      for (const key of path.slice(0, -1)) at = (at[key] ??= {}) as typeof at
      if (value === undefined) delete at[path.at(-1)!]
      else at[path.at(-1)!] = value
    }
    const upgraded = parseTravelRules(next)
    expect(upgraded.errors).toEqual([])
    expect(olderEatingEdits(upgraded.rules!)).toEqual([])
    const play = (r: typeof older) =>
      createTravelEngine({ world, rules: r }).apply(start('0,0', 'horse'), { type: 'camp' }).state
        .resources
    expect(play(upgraded.rules!)).toEqual(play(older))
  })

  it('camp and rest are ordinary actions; the night’s action is data', () => {
    const base = {
      kind: 'travel-rules',
      travel: { hoursPerDay: 8 },
      terrains: {},
      modes: { foot: { kmPerDay: 30 } },
      values: {},
    }
    // A system without camp, whose party bivouacs: waiting, night falls and it bivouacs.
    const { rules: own, errors } = parseTravelRules({
      ...base,
      day: { start: '06:00', nightfall: '20:00', night: 'bivouac' },
      actions: {
        camp: false,
        rest: false,
        bivouac: { do: [{ time: 'dawn' }] },
        note: { on: 'day-end', when: { doing: 'bivouac' }, do: [{ set: {} }] },
      },
    })
    expect(errors).toEqual([])
    expect(Object.keys(availableActions(own!).all)).toEqual(['march', 'bivouac', 'note'])
    const eng = createTravelEngine({ world, rules: own! })
    const morning = { ...start(), dayChecksDone: true }
    const { events } = eng.apply(morning, { type: 'wait', until: defaultCalendar.at(2, '12:00') })
    const taken = events.flatMap((e) => (e.type === 'ACTION_TAKEN' ? [e.action] : []))
    // The day ended while bivouacking: `doing` says so.
    expect(taken).toEqual(['bivouac', 'note'])
    // `night: false`: the night just passes.
    const { rules: none } = parseTravelRules({
      ...base,
      day: { start: '06:00', nightfall: '20:00', night: false },
    })
    const passes = createTravelEngine({ world, rules: none! }).apply(morning, {
      type: 'wait',
      until: defaultCalendar.at(2, '12:00'),
    })
    expect(passes.events.some((e) => e.type === 'ACTION_TAKEN')).toBe(false)
    // The night's action must exist.
    expect(
      parseTravelRules({ ...base, day: { start: '06:00', nightfall: '20:00', night: 'nap' } })
        .errors,
    ).toEqual(['day.night: expected camp, rest'])
    // Older systems that named camp or rest without steps keep what they did then.
    const { rules: older } = parseTravelRules({
      ...base,
      day: { start: '06:00', nightfall: '20:00' },
      actions: { camp: { name: 'Camp' }, rest: { name: 'Rest' } },
    })
    expect(availableActions(older!).all).toEqual({
      camp: { name: 'Camp', do: [{ time: 'dawn' }] },
      rest: { name: 'Rest', do: [{ time: 60 }] },
      march: { when: { 'time.daylight': true, 'trip.marched': { lt: '{{system.hoursPerDay}}' } } },
    })
  })

  it('older trips: a day already eaten by `eat: day` isn’t eaten again', () => {
    const older = { ...start(), ate: { day: 1, short: false } }
    const { state } = engine.apply(older, { type: 'camp' })
    expect(state.resources.food).toBe(3)
    expect(state.ate).toBeUndefined()
  })
})

describe('the trip going on by itself (travel by a moment)', () => {
  const at = (day: number, clock: string) => defaultCalendar.at(day, clock)
  /** Applies one action until it stops for something else than a check, resolving those. */
  function go(eng: typeof engine, state: TravelState, action: TravelAction) {
    const events: TravelEvent[] = []
    for (let i = 0; i < 100; i++) {
      const result = eng.apply(state, action)
      state = result.state
      events.push(...result.events)
      const stop = result.events.findLast((e) => e.type === 'TRAVEL_STOPPED')
      if (stop?.type !== 'TRAVEL_STOPPED' || stop.reason !== 'check') break
      for (const check of state.pendingChecks)
        state = eng.apply(state, { type: 'resolveCheck', id: check.id }).state
    }
    return { state, events }
  }
  const taken = (events: TravelEvent[], action: string) =>
    events.filter((e) => e.type === 'ACTION_TAKEN' && e.action === action)
  const entered = (events: TravelEvent[]) =>
    events.flatMap((e) => (e.type === 'HEX_ENTERED' ? [[e.hex, e.time]] : []))
  const stops = (events: TravelEvent[]) =>
    events.flatMap((e) => (e.type === 'TRAVEL_STOPPED' ? [e.reason] : []))
  /** Steppe hexes a day apart on foot (8 h each), south from 0,0. */
  const planned = (eng = engine, hex = '0,3') =>
    run2(eng, start(), { type: 'setDestination', hex }).state
  const run2 = (eng: typeof engine, state: TravelState, action: TravelAction) =>
    eng.apply(state, action)
  /** Camp only with food left (a condition on the party, like a pack writes it). */
  const fedCamp = parseTravelRules({
    kind: 'travel-rules',
    day: { start: '06:00', nightfall: '20:00' },
    travel: { hoursPerDay: 8 },
    terrains: { steppe: { multiplier: 1 } },
    modes: { foot: { kmPerDay: 30 } },
    values: { hunted: { blocks: ['travel'] } },
    actions: {
      camp: {
        when: { 'party.resources.food': { gte: 1 } },
        do: [{ time: 'dawn' }, { effects: { 'party.stats.fatigue': -1 } }],
      },
    },
  }).rules!
  const fed = createTravelEngine({ world, rules: fedCamp })

  it('marches a day at a time, camps each night and waits at the end, until the moment', () => {
    const { state, events } = go(engine, planned(), { type: 'travel', by: at(5, '12:00') })
    expect(entered(events)).toEqual([
      ['0,1', at(1, '14:00')],
      ['0,2', at(2, '14:00')],
      ['0,3', at(3, '14:00')],
    ])
    // Camped the first two nights on the way, and the nights waited at the end.
    expect(taken(events, 'camp').map((e) => e.type === 'ACTION_TAKEN' && e.time)).toEqual([
      at(1, '20:00'),
      at(2, '20:00'),
      at(3, '20:00'),
      at(4, '20:00'),
    ])
    expect(events.some((e) => e.type === 'DESTINATION_REACHED')).toBe(true)
    expect(state.location).toBe('0,3')
    expect(state.time).toBe(at(5, '12:00'))
    // Only the end is said: no "night fell" lines on the way.
    expect(stops(events).filter((r) => r !== 'check')).toEqual(['waited'])
  })

  it('stops at the moment, halfway between hexes, and goes on from there', () => {
    const first = go(engine, planned(), { type: 'travel', by: at(1, '10:00') })
    expect(first.state.location).toBe('0,0')
    expect(first.state.time).toBe(at(1, '10:00'))
    expect(first.state.progress).toBe(240)
    expect(stops(first.events).at(-1)).toBe('waited')
    const second = go(engine, first.state, { type: 'travel', by: at(1, '18:00') })
    expect(entered(second.events)).toEqual([['0,1', at(1, '14:00')]])
    // The day's 8 hours are spent at 14:00: it waits there until the moment.
    expect(second.state.time).toBe(at(1, '18:00'))
    expect(second.state.location).toBe('0,1')
  })

  it('an hour before dawn is an hour of night, not a march', () => {
    const night = { ...planned(), time: at(1, '03:00') }
    const { state, events } = go(engine, night, { type: 'travel', by: at(1, '04:00') })
    expect(state.time).toBe(at(1, '04:00'))
    expect(entered(events)).toEqual([])
  })

  it('with no food to camp, the nights pass without camping and the march goes on', () => {
    const state0 = { ...planned(fed), time: at(1, '06:00'), resources: { food: 0 } }
    const result = fed.apply(state0, { type: 'travel', by: at(4, '06:00') })
    expect(entered(result.events).map(([hex]) => hex)).toEqual(['0,1', '0,2', '0,3'])
    expect(taken(result.events, 'camp')).toEqual([])
    expect(result.events.filter((e) => e.type === 'NIGHT_WITHOUT')).toHaveLength(3)
    expect(result.events.find((e) => e.type === 'NIGHT_WITHOUT')).toMatchObject({
      action: 'camp',
      because: { condition: 'when' },
      time: at(1, '20:00'),
    })
    // With food, it camps every night instead.
    const fedResult = fed.apply(
      { ...state0, resources: { food: 2 } },
      {
        type: 'travel',
        by: at(4, '06:00'),
      },
    )
    expect(taken(fedResult.events, 'camp')).toHaveLength(3)
    expect(fedResult.events.some((e) => e.type === 'NIGHT_WITHOUT')).toBe(false)
  })

  it('a value that blocks travel today costs the day, said, and the march goes on', () => {
    const hunted = { ...planned(fed), dayChecksDone: true, today: { hunted: true } }
    const { state, events } = fed.apply(hunted, { type: 'travel', by: at(3, '06:00') })
    expect(events.find((e) => e.type === 'TRAVEL_STOPPED')).toMatchObject({
      reason: 'value',
      value: 'hunted',
      time: at(1, '06:00'),
    })
    // Day 1 lost; day 2 (no longer hunted) marches a hex.
    expect(entered(events)).toEqual([['0,1', at(2, '14:00')]])
    expect(state.time).toBe(at(3, '06:00'))
  })

  it('a travel order in a storm that can’t be camped out passes to the next day', () => {
    const stormy = parseTravelRules({
      ...{
        kind: 'travel-rules',
        day: { start: '06:00', nightfall: '20:00' },
        travel: { hoursPerDay: 8 },
        terrains: { steppe: { multiplier: 1 } },
        modes: { foot: { kmPerDay: 30 } },
        weather: { storm: { speed: 0 } },
      },
      actions: { camp: { when: { 'party.resources.food': { gte: 1 } }, do: [{ time: 'dawn' }] } },
    }).rules!
    const eng = createTravelEngine({ world, rules: stormy })
    const state = {
      ...run2(eng, start(), { type: 'setDestination', hex: '0,3' }).state,
      weather: 'storm',
      dayChecksDone: true,
      resources: { food: 0 },
    }
    const out = eng.apply(state, { type: 'travel' })
    expect(out.events.some((e) => e.type === 'NIGHT_WITHOUT')).toBe(true)
    expect(out.state.time).toBeGreaterThanOrEqual(at(2, '06:00'))
    // Able to camp, it stops for the player instead.
    const fed = eng.apply({ ...state, resources: { food: 1 } }, { type: 'travel' })
    expect(stops(fed.events)).toEqual(['weather'])
    expect(fed.state.time).toBe(state.time)
  })

  it('a travel order at nightfall passes the night when the party can’t camp', () => {
    const late = {
      ...planned(fed),
      time: at(1, '20:00'),
      dayChecksDone: true,
      resources: { food: 0 },
    }
    const hungry = { party: { resources: { food: 0 } } }
    const { state, events } = fed.apply(late, { type: 'travel', until: 'hex' }, hungry)
    expect(events.find((e) => e.type === 'NIGHT_WITHOUT')).toMatchObject({ action: 'camp' })
    expect(entered(events)).toEqual([['0,1', at(2, '14:00')]])
    expect(state.location).toBe('0,1')
    // Able to camp, it stops at nightfall instead, for the player to camp.
    const able = fed.apply({ ...late, resources: { food: 1 } }, { type: 'travel' })
    expect(stops(able.events)).toEqual(['nightfall'])
    expect(able.state.time).toBe(at(1, '20:00'))
  })
})

describe('day and night, and marching as the system says', () => {
  const nightly = parseTravelRules({
    ...rules!,
    resources: { food: { min: 0 } },
    values: { torchlit: { name: 'By torchlight' } },
    checks: [{ event: 'NIGHT_LOST', at: 'hex-enter', when: { daylight: false } }],
    actions: {
      // By day for the day's hours, or by torchlight until midnight.
      march: {
        when: {
          any: [{ daylight: true, marched: { lt: '{{hoursPerDay}}' } }, { torchlit: true }],
        },
      },
      rest: { when: { daylight: true }, do: [{ time: 120 }] },
      'night-march': {
        when: { daylight: false, hour: { gte: '{{nightfall}}' } },
        hideWhenUnavailable: true,
        oncePerDay: true,
        do: [{ set: { torchlit: true } }],
      },
    },
  })
  const own = createTravelEngine({ world, rules: nightly.rules! })
  const at = (clock: string) => ({ ...start(), time: defaultCalendar.at(1, clock) })

  it('reads daylight between the system’s dawn and nightfall', () => {
    expect(nightly.errors).toEqual([])
    expect(own.availability(at('19:59')).rest).toBeUndefined()
    expect(own.availability(at('20:00')).rest).toEqual({ condition: 'when' })
    expect(own.availability(at('20:00'))['night-march']).toBeUndefined()
    expect(own.availability(at('12:00'))['night-march']).toEqual({ condition: 'when' })
    // After midnight it isn't the evening any more (hour < nightfall).
    expect(
      own.availability({ ...start(), time: defaultCalendar.at(2, '03:00') })['night-march'],
    ).toEqual({
      condition: 'when',
    })
    // Marching is no button.
    expect(own.availability(at('12:00')).march).toBeUndefined()
    expect(own.apply(at('12:00'), { type: 'action', id: 'march' }).events).toEqual([
      { type: 'ACTION_UNAVAILABLE', action: 'march', because: { off: true } },
    ])
  })

  it('marches while the system’s march holds: by torchlight past nightfall, until midnight', () => {
    const planned = own.apply(at('20:00'), { type: 'setDestination', hex: '9,0' }).state
    const stopped = own.apply(planned, { type: 'travel' })
    expect(stopped.state.time).toBe(defaultCalendar.at(1, '20:00'))
    expect(stopped.events.at(-1)).toMatchObject({ reason: 'nightfall' })
    const lit = own.apply(planned, { type: 'action', id: 'night-march' }).state
    expect(lit.today).toMatchObject({ torchlit: true })
    const { state, events } = own.apply(lit, { type: 'travel', until: 'destination' })
    // 30 km hexes at 30 km a day of 8 h: one hex in 8 h, so 4 h is half a hex.
    expect(state.time).toBe(defaultCalendar.at(2, '00:00'))
    expect(state.progress).toBe(240)
    expect(events.at(-1)).toMatchObject({ reason: 'nightfall' })
  })

  it('checks at night see daylight: false', () => {
    const planned = own.apply(at('20:00'), { type: 'setDestination', hex: '1,0' }).state
    const lit = own.apply(planned, { type: 'action', id: 'night-march' }).state
    const { events } = own.apply({ ...lit, progress: 300 }, { type: 'travel' })
    expect(events.find((e) => e.type === 'CHECK_REQUIRED')).toMatchObject({
      check: { event: 'NIGHT_LOST' },
    })
  })

  it('stops for a rule of the system’s own, said as such', () => {
    const tired = parseTravelRules({
      ...rules!,
      actions: {
        march: { unless: { 'party.stats.fatigue': { gte: '{{party.stats.endurance}}' } } },
      },
    })
    const engine = createTravelEngine({ world, rules: tired.rules! })
    const planned = engine.apply(resolveAll(start()).state, {
      type: 'setDestination',
      hex: '2,0',
    }).state
    const ready = { ...planned, dayChecksDone: true }
    const party = (fatigue: number) => ({ party: { stats: { fatigue, endurance: 3 } } })
    expect(engine.apply(ready, { type: 'travel' }, party(3)).events.at(-1)).toMatchObject({
      reason: 'march',
    })
    expect(engine.apply(ready, { type: 'travel' }, party(1)).state.location).toBe('1,0')
  })

  it('validates marching: no steps, no moment, no step that takes it', () => {
    const bad = parseTravelRules({
      ...rules!,
      actions: {
        march: { on: 'day-start', do: [{ time: 60 }] },
        nap: { do: [{ do: 'march' }] },
      },
    })
    expect(bad.errors).toEqual(
      expect.arrayContaining([
        'actions.march.do: marching has no steps: its when / unless say when the party can march',
        'actions.march.on: marching has no steps: its when / unless say when the party can march',
        expect.stringMatching(/^actions\.nap\.do\.0\.do: expected /),
      ]),
    )
  })
})

describe('what conditions read of the moment, the trip and the land around', () => {
  const own = createTravelEngine({ world, rules: rules! })

  it('reads the hour, the watch and the system’s own day as numbers', () => {
    const at = { ...start(), time: defaultCalendar.at(1, '14:30') }
    expect(own.context(at)).toMatchObject({
      hour: 14.5,
      watch: 4, // 4-hour watches: 12:00–16:00 is the fourth
      dawn: 6,
      nightfall: 20,
      hoursPerDay: 8,
      daylight: true,
    })
  })

  it('reads the day of the month with a calendar of the system’s own', () => {
    const calendar = calendarFrom({
      months: [
        { id: 'thaw', days: 10 },
        { id: 'sowing', days: 10 },
      ],
    })
    const engine = createTravelEngine({ world, rules: rules!, calendar })
    const state = initialTravelState({
      location: '0,0',
      mode: 'foot',
      calendar,
      time: calendar.at(13, '08:00'),
    })
    expect(engine.context(state)).toMatchObject({ month: 'sowing', monthDay: 3 })
  })

  it('reads the trip: hours marched, actions done, the way left, days, visits', () => {
    const first = start()
    expect(own.context(first)).toMatchObject({
      marched: 0,
      doneToday: [],
      routeLeft: 0,
      arrived: false,
      tripDay: 1,
      visits: 1,
    })
    const planned = own.apply(first, { type: 'setDestination', hex: '2,0' }).state
    expect(own.context(planned)).toMatchObject({ routeLeft: 2 })
    const rested = own.apply(planned, { type: 'rest' }).state
    expect(own.context(rested).doneToday).toEqual(['rest'])
    // Marching: one hex is a whole day's march (8 h).
    const marched = resolveAll(own.apply(rested, { type: 'travel' }).state).state
    const day = own.apply(marched, { type: 'travel' }).state
    expect(own.context(day).marched).toBeGreaterThan(0)
    /** Travels on (resolving every check) until the party gets to `hex`. */
    const goTo = (from: TravelState, hex: string) => {
      let state = own.apply(from, { type: 'setDestination', hex }).state
      for (let i = 0; i < 40 && state.location !== hex; i++) {
        state = resolveAll(state).state
        state = own.apply(state, {
          type: 'travel',
          until: 'destination',
          by: state.time + 3 * 1440,
        }).state
      }
      return state
    }
    const state = goTo(rested, '2,0')
    expect(state.location).toBe('2,0')
    expect(own.context(state)).toMatchObject({ arrived: true, routeLeft: 0, visits: 1 })
    expect(own.context(state).tripDay).toBeGreaterThan(1)
    // Back where it started: its second visit.
    const home = goTo(state, '0,0')
    expect(home.location).toBe('0,0')
    expect(own.context(home).visits).toBe(2)
  })

  it('reads the hexes around, and the one left when entering a hex', () => {
    // 2,0 is next to the mountains of column 3.
    const at = { ...start('2,0') }
    expect(own.context(at)).toMatchObject({
      around: { terrain: expect.arrayContaining(['steppe', 'mountains']), water: false },
    })
    const leaving = parseTravelRules({
      ...rules!,
      checks: [{ event: 'LEFT_MOUNTAINS', at: 'hex-enter', when: { 'from.terrain': 'mountains' } }],
    })
    const engine = createTravelEngine({ world, rules: leaving.rules! })
    const planned = engine.apply(
      { ...start('3,0'), progress: 0 },
      { type: 'setDestination', hex: '4,0' },
    ).state
    const { events } = engine.apply(planned, { type: 'travel' })
    expect(events.find((e) => e.type === 'CHECK_REQUIRED')).toMatchObject({
      check: { event: 'LEFT_MOUNTAINS', context: { from: { id: '3,0', terrain: 'mountains' } } },
    })
  })
})

describe('variables and rolls in conditions and effects', () => {
  const { rules: own } = parseTravelRules({
    ...rules!,
    actions: {
      // A roll-under against a stat: the same roll however often it's asked, that day there.
      scout: {
        when: { 'party.stats.wits': { gte: '{{1d20}}' } },
        do: [{ effects: { 'party.resources.food': '-{{party.stats.mouths}}' } }],
      },
      hunt: { do: [{ effects: { 'party.resources.food': '+{{1d3}}' } }] },
      feast: { do: [{ effects: { 'party.resources.food': '={{party.stats.mouths}}' } }] },
    },
  })
  const engine = createTravelEngine({ world, rules: own! })
  const party = { party: { stats: { wits: 10, mouths: 2 } } }
  const trip = (seed: string, location = '0,0') => ({
    ...initialTravelState({ location, mode: 'foot', resources: { food: 5 }, seed }),
    dayChecksDone: true,
  })

  it('roll once per day, hex and moment: availability doesn’t flicker', () => {
    const answers = new Set<boolean>()
    const seeds = Array.from({ length: 12 }, (_, i) => `trip-${i}`)
    for (const seed of seeds) {
      const first = engine.availability(trip(seed), party).scout === undefined
      for (let i = 0; i < 5; i++)
        expect(engine.availability(trip(seed), party).scout === undefined).toBe(first)
      answers.add(first)
    }
    // Different trips roll differently: some can scout, some can't.
    expect([...answers].sort()).toEqual([false, true])
  })

  it('take what a variable names, and roll the dice of an effect within them', () => {
    const fed = (action: string, seed = 'a') =>
      engine.apply(trip(seed), { type: 'action', id: action }, party).state.resources.food
    expect(fed('feast')).toBe(2)
    const hunted = Array.from({ length: 10 }, (_, i) => fed('hunt', `s${i}`))
    for (const food of hunted) expect([6, 7, 8]).toContain(food)
    expect(new Set(hunted).size).toBeGreaterThan(1)
    // Hunting again the same day and hex is the same roll.
    expect(fed('hunt', 's1')).toBe(hunted[1])
    const scouts = ['a', 'b', 'c', 'd', 'e', 'f'].map((seed) => {
      const state = trip(seed)
      return engine.availability(state, party).scout === undefined
        ? engine.apply(state, { type: 'action', id: 'scout' }, party).state.resources.food
        : undefined
    })
    expect(scouts.filter((f) => f !== undefined).every((f) => f === 3)).toBe(true)
  })
})

describe('progress made on a slower day', () => {
  it('enters the hex at once when the way got faster, and time never goes back', () => {
    const planned = engine.apply(resolveAll(start()).state, {
      type: 'setDestination',
      hex: '2,0',
    }).state
    // Ten hours towards a hex in heavy rain (half speed: 960 minutes then); the rain is
    // gone and it costs 480 now, already walked.
    const walked = { ...planned, progress: 600, dayChecksDone: true }
    const { state, events } = engine.apply(walked, { type: 'travel', until: 'hex' })
    expect(state.time).toBe(walked.time)
    expect(state.travelledToday).toBe(0)
    expect(events.find((e) => e.type === 'HEX_ENTERED')).toMatchObject({
      hex: '1,0',
      time: walked.time,
    })
  })

  // Minutes towards a hex add up with decimals: a hex can be left a sliver short of its
  // cost, less than the clock can tell apart from now (trips saved by v0.5.0 did). Such a
  // hex is reached, not marched towards for no time at all: at dawn that looped for ever.
  it('a hex walked all but a sliver is entered at once, at dawn or later', () => {
    const planned = engine.apply(resolveAll(start()).state, {
      type: 'setDestination',
      hex: '2,0',
    }).state
    // Late in the year, when the clock's minutes are big numbers.
    const dawn = defaultCalendar.at(200, '06:00')
    for (const time of [dawn, dawn + 120]) {
      const walked = { ...planned, day: 200, time, progress: 480 - 1e-12, dayChecksDone: true }
      expect(walked.time + (480 - walked.progress)).toBe(walked.time)
      const { state, events } = engine.apply(walked, { type: 'travel', until: 'hex' })
      expect(events.find((e) => e.type === 'HEX_ENTERED')).toMatchObject({ hex: '1,0', time })
      expect(state.location).toBe('1,0')
    }
  })
})

describe('full names of facts', () => {
  it('read the same as the short ones, and a stat can’t hide them', () => {
    const state = { ...start('2,9'), today: { lost: true } }
    const host = {
      // A stat called like a fact: the short name is the fact, the stat is party.stats.*.
      season: 'never',
      party: { stats: { season: 3 } },
      clocks: { 'the-flood': 4 },
      events: ['market-day'],
    }
    const seen = engine.context(state, host)
    expect(seen).toMatchObject({
      hex: { id: '2,9', terrain: 'steppe', tags: [] },
      time: { season: 'spring', day: state.day, daylight: true, hour: 6 },
      system: { dawn: 6, nightfall: 20, hoursPerDay: 8 },
      trip: { day: 1, marched: 0, mode: 'foot', visits: 1, edges: [] },
      world: { clocks: { 'the-flood': 4 }, events: ['market-day'] },
      today: { lost: true },
      season: 'spring',
    })
  })

  it('work in conditions wherever short names do', () => {
    const { rules: own } = parseTravelRules({
      ...rules!,
      actions: {
        dawn: {
          when: {
            'time.daylight': true,
            'hex.terrain': 'steppe',
            'trip.day': 1,
            'time.hour': { gte: '{{system.dawn}}' },
          },
          do: [{ time: 60 }],
        },
        flood: { when: { 'world.clocks.the-flood': { gte: 4 } }, do: [{ time: 60 }] },
        roadside: { when: { 'trip.edges': 'road' }, do: [{ time: 60 }] },
      },
    })
    const engine = createTravelEngine({ world, rules: own! })
    const why = (facts = {}) => engine.availability(start(), facts)
    expect(why().dawn).toBeUndefined()
    expect(why().flood).toEqual({ condition: 'when' })
    expect(why({ clocks: { 'the-flood': 4 } }).flood).toBeUndefined()
    // Entering a hex by road: the step's edges.
    expect(engine.availability({ ...start('5,9') }).roadside).toEqual({ condition: 'when' })
  })
})

describe('progress by moves: the advance step', () => {
  // A journey of moves: nobody marches (the march's condition reads a value no one sets);
  // each move takes an hour and moves the party as many legs as its rank.
  const { rules: moves, errors } = parseTravelRules({
    ...rules!,
    actions: {
      march: { when: { 'today.marching': true } },
      undertake: { do: [{ time: 60 }, { advance: '{{party.stats.rank}}' }] },
      leap: { do: [{ advance: 9 }] },
    },
    checks: [{ event: 'ARRIVED', at: 'hex-enter', when: { 'trip.arrived': true } }],
  })
  const journey = createTravelEngine({ world, rules: moves! })
  const planned = () => journey.apply(start('0,0'), { type: 'setDestination', hex: '4,0' }).state

  it('is valid, and moves along the route as many legs as it says, no time passing', () => {
    expect(errors).toEqual([])
    const marched = journey.apply(planned(), { type: 'travel' })
    expect(marched.state.location).toBe('0,0')
    const before = planned()
    const { state, events } = journey.apply(
      before,
      { type: 'action', id: 'undertake' },
      { party: { stats: { rank: 2 } } },
    )
    expect(state.route?.length).toBe(before.route!.length - 2)
    expect(state.location).toBe(before.route![2])
    expect(state.time).toBe(before.time + 60)
    expect(events.filter((e) => e.type === 'HEX_ENTERED')).toHaveLength(2)
    expect(state.totals?.hexes).toBe(2)
    expect(state.visits?.[state.location]).toBe(1)
  })

  it('stops at the destination, and its checks come up there', () => {
    const { state, events } = journey.apply(planned(), { type: 'action', id: 'leap' })
    expect(state.location).toBe('4,0')
    expect(events.some((e) => e.type === 'DESTINATION_REACHED')).toBe(true)
    expect(state.pendingChecks.map((c) => c.event)).toEqual(['ARRIVED'])
  })

  it('without a rank (a variable that isn’t there) it moves nothing', () => {
    const { state } = journey.apply(planned(), { type: 'action', id: 'undertake' })
    expect(state.location).toBe('0,0')
  })
})

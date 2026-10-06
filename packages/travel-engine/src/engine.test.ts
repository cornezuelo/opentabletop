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
    expect(events.at(-1)).toMatchObject({ reason: 'lost' })
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

describe('camp, resources and fatigue', () => {
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

  it('tires the party when supplies run out, and rest recovers', () => {
    const camped = run({ ...start(), resources: { food: 0 } }, { type: 'camp' })
    let state: TravelState = camped.state
    const events = camped.events
    expect(events).toContainEqual({ type: 'RESOURCE_DEPLETED', resource: 'food' })
    expect(state.fatigue).toBe(1)
    ;({ state } = run(state, { type: 'rest', minutes: 8 * 60 }))
    expect(state.fatigue).toBe(0)
  })

  it('applies check outcomes to resources and fatigue', () => {
    const { state } = run(start(), { type: 'camp' })
    const check = state.pendingChecks[0]
    const after = run(state, {
      type: 'resolveCheck',
      id: check.id,
      outcome: { resources: { food: 3 }, fatigue: 2 },
    }).state
    expect(after.resources.food).toBe(5)
    expect(after.fatigue).toBe(2)
    expect(after.pendingChecks).toHaveLength(0)
  })
})

describe('generic rules', () => {
  it('are valid travel rules', async () => {
    const { genericTravelRules } = await import('./generic')
    expect(parseTravelRules(genericTravelRules).errors).toEqual([])
  })
})

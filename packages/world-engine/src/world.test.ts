import { calendarFrom, defaultCalendar } from '@open-tabletop/time'
import { describe, expect, it } from 'vitest'
import {
  isEventId,
  createWorld,
  factId,
  initialWorld,
  readWorld,
  worldFacts,
  type WorldAction,
  type WorldState,
} from './index'

const DAY = 24 * 60

function run(world: ReturnType<typeof createWorld>, state: WorldState, ...actions: WorldAction[]) {
  const events = []
  for (const action of actions) {
    const out = world.apply(state, action)
    state = out.state
    events.push(...out.events)
  }
  return { state, events }
}

describe('the world clock', () => {
  const world = createWorld()

  it('advances by minutes, to dawn, to dusk and to the next day', () => {
    const start = initialWorld(defaultCalendar.at(1, '10:00'))
    expect(run(world, start, { type: 'advance', minutes: 90 }).state.time).toBe(
      defaultCalendar.at(1, '11:30'),
    )
    expect(run(world, start, { type: 'advanceUntil', until: 'dusk' }).state.time).toBe(
      defaultCalendar.at(1, '20:00'),
    )
    expect(run(world, start, { type: 'advanceUntil', until: 'dawn' }).state.time).toBe(
      defaultCalendar.at(2, '06:00'),
    )
    const { state, events } = run(world, start, { type: 'advanceUntil', until: 'next-day' })
    expect(state.time).toBe(defaultCalendar.at(2, 0))
    expect(events.map((e) => e.type)).toEqual(['DAY_STARTED', 'TIME_ADVANCED'])
    // Never backwards.
    expect(run(world, start, { type: 'setTime', time: 0 }).state.time).toBe(start.time)
  })

  it('brings scheduled events due, repeating ones again, in order (ties as scheduled)', () => {
    const { state } = run(
      world,
      initialWorld(),
      { type: 'schedule', event: { name: 'The Iron Clans attack', at: 3 * DAY } },
      { type: 'schedule', event: { name: 'Market', at: DAY, repeat: { days: 2 } } },
    )
    expect(world.upcoming(state).map((e) => e.name)).toEqual(['Market', 'The Iron Clans attack'])
    const { state: later, events } = run(world, state, {
      type: 'advanceUntil',
      until: 'next-event',
    })
    expect(later.time).toBe(DAY)
    expect(
      events
        .filter((e) => e.type === 'EVENT_DUE')
        .map((e) => e.type === 'EVENT_DUE' && e.event.name),
    ).toEqual(['Market'])
    const week = run(world, later, { type: 'advance', minutes: 6 * DAY })
    expect(
      week.events.flatMap((e) =>
        e.type === 'EVENT_DUE' ? [`${e.event.name}@${e.time / DAY}`] : [],
      ),
    ).toEqual(['The Iron Clans attack@3', 'Market@3', 'Market@5', 'Market@7'])
    // The one-off is gone; the market waits for day 9.
    expect(week.state.events.map((e) => [e.name, e.at / DAY])).toEqual([['Market', 9]])
    expect(week.state.timeline.filter((t) => t.code === 'EVENT')).toHaveLength(5)
  })

  it('tells holidays and full and new moons of a calendar of data', () => {
    const calendar = calendarFrom({
      months: [{ id: 'm', days: 10 }],
      moons: [{ id: 'pale', cycle: 4 }],
      holidays: [{ id: 'feast', month: 'm', day: 3 }],
    })
    const own = createWorld({ calendar })
    const { events, state } = run(own, initialWorld(), { type: 'advance', minutes: 4 * DAY })
    expect(events.flatMap((e) => (e.type === 'HOLIDAY' ? [e.id] : []))).toEqual(['feast'])
    expect(events.flatMap((e) => (e.type === 'MOON_PHASE' ? [e.phase] : []))).toEqual([
      'waxing',
      'full',
      'waning',
      'new',
    ])
    expect(state.timeline.map((t) => t.code)).toEqual(['HOLIDAY', 'MOON', 'MOON'])
  })

  it('keeps progress clocks: filling, emptying, and a filled clock is news', () => {
    let { state } = run(world, initialWorld(), {
      type: 'addClock',
      clock: { name: 'The Wyrm wakes', segments: 4 },
    })
    const id = state.clocks[0].id
    const filled = run(
      world,
      state,
      { type: 'tick', id, segments: 3 },
      { type: 'tick', id, segments: 5 },
    )
    state = filled.state
    expect(state.clocks[0].filled).toBe(4)
    expect(filled.events).toEqual([{ type: 'CLOCK_FILLED', clock: state.clocks[0] }])
    state = run(world, state, { type: 'tick', id, segments: -9 }).state
    expect(state.clocks[0].filled).toBe(0)
    state = run(world, state, {
      type: 'updateClock',
      id,
      patch: { segments: 2.6, filled: 9 },
    }).state
    expect(state.clocks[0]).toMatchObject({ segments: 3, filled: 3 })
    expect(run(world, state, { type: 'removeClock', id }).state.clocks).toEqual([])
  })

  it('reads saved state, dropping broken parts', () => {
    expect(
      readWorld({ time: 'x', events: [{ id: 'e1', name: 'A', at: 5 }, { name: 'B' }] }),
    ).toEqual({
      time: 0,
      events: [{ id: 'e1', name: 'A', at: 5 }],
      clocks: [],
      timeline: [],
      nextId: 1,
    })
  })
})

describe('what tables read of the world', () => {
  it('reads clocks by their names as ids, and the events of the current day', () => {
    const world = createWorld({ calendar: defaultCalendar })
    const start = defaultCalendar.at(1, '06:00')
    let { state } = run(
      world,
      initialWorld(start),
      { type: 'addClock', clock: { name: 'The Wyrm wakes', segments: 6, filled: 2 } },
      { type: 'schedule', event: { name: 'Market day', at: defaultCalendar.at(1, '12:00') } },
      { type: 'schedule', event: { name: 'Harvest Feast', at: defaultCalendar.at(3, '12:00') } },
    )
    expect(factId('  Fête de l’Été! ')).toBe('fete-de-l-ete')
    expect(worldFacts(state, defaultCalendar)).toEqual({
      clocks: { 'the-wyrm-wakes': 2 },
      events: ['market-day'],
    })
    // Once come, an event of the day is still today's.
    ;({ state } = run(world, state, { type: 'advance', minutes: 8 * 60 }))
    expect(worldFacts(state, defaultCalendar).events).toEqual(['market-day'])
    ;({ state } = run(world, state, { type: 'advance', minutes: DAY }))
    expect(worldFacts(state, defaultCalendar).events).toEqual([])
  })
})

describe('events with ids, and putting the clock back', () => {
  const world = createWorld({ calendar: defaultCalendar })
  const start = defaultCalendar.at(1, '06:00')
  const at = defaultCalendar.at(2, '12:00')

  it('take the id given, or one made from their name, never twice the same', () => {
    const { state } = run(
      world,
      initialWorld(start),
      { type: 'schedule', event: { name: 'Market day', at } },
      { type: 'schedule', event: { name: 'Market day', at, description: 'In Ashford' } },
      { type: 'schedule', event: { id: 'raid', name: 'The Iron Clans attack', at } },
      { type: 'schedule', event: { id: 'raid', name: 'Another raid', at } },
      { type: 'schedule', event: { id: 'Not An Id', name: '¡!', at } },
    )
    expect(state.events.map((e) => e.id)).toEqual([
      'market-day',
      'market-day-2',
      'raid',
      'another-raid',
      'e5',
    ])
    expect(state.events[1].description).toBe('In Ashford')
    expect(isEventId('market-day')).toBe(true)
    expect(isEventId('Market day')).toBe(false)
  })

  it('change their id only to a free, well written one', () => {
    let { state } = run(
      world,
      initialWorld(start),
      { type: 'schedule', event: { name: 'Market day', at } },
      { type: 'schedule', event: { name: 'Raid', at } },
    )
    ;({ state } = run(world, state, {
      type: 'updateEvent',
      id: 'raid',
      patch: { id: 'market-day' },
    }))
    expect(state.events.map((e) => e.id)).toEqual(['market-day', 'raid'])
    ;({ state } = run(world, state, {
      type: 'updateEvent',
      id: 'raid',
      patch: { id: 'clan-raid', name: 'Clan raid' },
    }))
    expect(state.events[1]).toMatchObject({ id: 'clan-raid', name: 'Clan raid' })
  })

  it('are read by their ids and by their names', () => {
    const { state } = run(world, initialWorld(start), {
      type: 'schedule',
      event: { id: 'fair', name: 'The Great Fair', at: defaultCalendar.at(1, '12:00') },
    })
    expect(worldFacts(state, defaultCalendar).events).toEqual(['fair', 'the-great-fair'])
  })

  it('put back, the clock goes to an earlier moment and the timeline says so', () => {
    let { state } = run(world, initialWorld(start), { type: 'advance', minutes: 3 * DAY })
    const later = state.time
    const out = world.apply(state, { type: 'rewind', time: start })
    state = out.state
    expect(state.time).toBe(start)
    expect(out.events).toEqual([{ type: 'TIME_REWOUND', from: later, to: start }])
    expect(state.timeline.at(-1)).toMatchObject({
      code: 'REWOUND',
      time: start,
      data: { from: later },
    })
    // Forward isn't putting back.
    expect(world.apply(state, { type: 'rewind', time: later }).state.time).toBe(start)
  })
})

import { loadPacks } from '@open-tabletop/oracle-engine'
import type { TravelWorld } from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { corePack } from './core.testing'
import { startTrip, stepTrip, travelSystems, tripFacts } from './trip'

const { registry } = loadPacks(corePack())
const core = travelSystems(registry).systems.find((s) => s.id === 'core')!

/** Two rooms, a and b, and a gate between them, shut on the map. */
const rooms: TravelWorld = {
  km: () => 1,
  place: (id) => (['a', 'b'].includes(id) ? { terrain: 'plains' } : null),
  neighbors: (id) => (id === 'a' ? ['b'] : ['a']),
  distance: () => 0,
  connections: () => ['gate'],
  connectionOf: () => ({ id: 'the-gate', kind: 'gate', tags: [], state: 'shut', uses: 2 }),
}

describe('a connection’s state in play', () => {
  const rules = {
    ...core.rules,
    // No checks to stop for: what's tested is the gate.
    checks: [],
    connections: { gate: { minutes: 5, passable: { unless: { 'connection.state': 'shut' } } } },
    actions: {
      ...core.rules.actions,
      open: {
        when: { 'connection.kind': 'gate', 'connection.state': 'shut' },
        do: [{ time: 10 }, { effects: { 'connection.state': 'open', 'connection.uses': -1 } }],
      },
    },
  }
  const system = { ...core, rules }
  const options = { system, world: rooms }

  it('is read as connection.*, changed by effects, kept in the trip and never on the map', () => {
    let { session } = startTrip({ system, location: 'a', seed: 's' })
    session = stepTrip(options, session, { type: 'setDestination', place: 'b' }).state
    // Shut: the way is blocked; the gate ahead is what an action reads.
    expect(tripFacts(options, session)).toMatchObject({
      connection: { id: 'the-gate', state: 'shut', uses: 2 },
    })
    // Marching stops at it: the route goes up to the gate, which can't be crossed.
    const stopped = stepTrip(options, session, {
      type: 'action',
      id: 'march',
      with: { until: 'place' },
    })
    expect(stopped.state.travel.location).toBe('a')
    expect(stopped.entries.some((e) => e.code === 'ROUTE_BLOCKED')).toBe(true)
    const opened = stepTrip(options, session, { type: 'action', id: 'open' })
    expect(opened.state.travel.connections).toEqual({ 'the-gate': { state: 'open', uses: 1 } })
    // Said in the journal when it happened (the action's line comes first).
    expect(
      opened.entries.flatMap((e) => (e.code === 'CONNECTION_CHANGED' ? [e.data] : [])),
    ).toEqual([
      { id: 'the-gate', name: 'gate', key: 'state', value: 'open', time: 370 },
      { id: 'the-gate', name: 'gate', key: 'uses', value: 1, time: 370 },
    ])
    // Open now: the action no longer applies, and a march crosses it in its 5 minutes.
    expect(tripFacts(options, opened.state)).toMatchObject({ connection: { state: 'open' } })
    const crossed = stepTrip(options, opened.state, {
      type: 'action',
      id: 'march',
      with: { until: 'place' },
    })
    expect(crossed.state.travel.location).toBe('b')
    expect(crossed.state.travel.time - opened.state.travel.time).toBe(5)
  })
})

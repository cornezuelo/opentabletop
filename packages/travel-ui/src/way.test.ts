import { startTrip, stepTrip, tripFacts } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { coreSystem } from '../../session/src/core.testing'
import { wayWorld, type WayHex } from './way'

describe('abstract trips', () => {
  const world = wayWorld(
    [
      { terrain: 'plains', tags: [], connections: ['road'] },
      { terrain: 'forest', tags: ['haunted'], connections: [] },
      { terrain: 'hills', tags: [], connections: [] },
    ],
    10,
  )

  it('is a line of hexes joined by their connections', () => {
    expect(world.place('1')).toEqual({ terrain: 'forest', tags: ['haunted'] })
    expect(world.place('3')).toBeNull()
    expect(world.neighbors('0')).toEqual(['1'])
    expect(world.neighbors('1')).toEqual(['0', '2'])
    expect(world.distance('0', '2')).toBe(20)
    expect(world.connections('0', '1')).toEqual(['road'])
    expect(world.connections('1', '0')).toEqual(['road'])
    expect(world.connections('1', '2')).toEqual([])
  })
})

describe('what lies between two cells, played with Core', () => {
  const core = coreSystem()
  const system = { ...core, rules: { ...core.rules, checks: [] } }
  const cell = (...connections: string[]): WayHex => ({ terrain: 'plains', tags: [], connections })
  const way = (...connections: string[]) => [cell(...connections), cell()]
  const march = { type: 'action', id: 'march', with: { until: 'place' } } as const

  /** A trip of one leg, heading for the second cell. */
  const heading = (world: ReturnType<typeof wayWorld>) => {
    const { session } = startTrip({ system, location: '0', seed: 's' })
    return stepTrip({ system, world }, session, { type: 'setDestination', place: '1' }).state
  }
  const minutes = (connections: string[]) => {
    const world = wayWorld(way(...connections), 10)
    const session = heading(world)
    const done = stepTrip({ system, world }, session, march).state
    expect(done.travel.location).toBe('1')
    return done.travel.time - session.travel.time
  }

  it.each([[['gate']], [['road', 'gate']]])('%j starts shut, until it is opened', (kinds) => {
    const world = wayWorld(way(...kinds), 10)
    const options = { system, world }
    const session = heading(world)
    expect(tripFacts(options, session)).toMatchObject({ connection: { kind: 'gate' } })
    const stopped = stepTrip(options, session, march)
    expect(stopped.state.travel.location).toBe('0')
    expect(stopped.entries.some((e) => e.code === 'ROUTE_BLOCKED')).toBe(true)
    const opened = stepTrip(options, session, { type: 'action', id: 'open-gate' }).state
    expect(opened.travel.connections).toEqual({ 'leg-0': { state: 'open' } })
    expect(stepTrip(options, opened, march).state.travel.location).toBe('1')
  })

  it('a river alone is crossed, an hour more; a road ticked with it takes the party over', () => {
    expect(minutes(['river']) - minutes([])).toBe(60)
    expect(minutes(['road', 'river'])).toBe(minutes(['road']))
    const world = wayWorld(way('river'), 10)
    expect(world.connections('0', '1')).toEqual([])
    expect(world.crossings?.('1', '0')).toEqual(['river'])
    expect(world.connectionOf?.('0', '1')).toBeUndefined()
  })
})

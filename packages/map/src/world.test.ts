import { describe, expect, it } from 'vitest'
import { createMap } from './defaults'
import { mapWorld } from './world'

describe('the map as the travel engine sees it', () => {
  const map = createMap()
  map.scale = { hexKm: 6 }
  map.hexes['1,1'] = { terrain: 'forest', tags: ['haunted'] }
  map.paths = [{ id: 'r', kind: 'road', hexes: ['1,1', '2,1'] }]

  it('is a graph of places: each hex, its neighbours and the roads between them', () => {
    const world = mapWorld(map)
    expect(world.place('1,1')).toMatchObject({ terrain: 'forest', tags: ['haunted'] })
    expect(world.place('-1,0')).toBeNull()
    expect(world.neighbors('1,1')).toContain('2,1')
    expect(world.connections('1,1', '2,1')).toEqual(['road'])
    expect(world.connections('2,1', '1,1')).toEqual(['road'])
  })

  it('measures a step a hex at the map’s scale, and distances in km', () => {
    const world = mapWorld(map)
    expect(world.km('1,1', '2,1')).toBe(6)
    expect(world.distance('1,1', '3,1')).toBe(12)
    expect(mapWorld({ ...map, scale: {} }, 30).km('1,1', '2,1')).toBe(30)
  })
})

describe('connections drawn on the map', () => {
  const map = createMap()
  map.connections = [
    { id: 'b', between: ['1,1', '2,1'], kind: 'bridge' },
    { id: 't', between: ['0,0', '5,5'], kind: 'tunnel', name: 'The Old Way' },
  ]

  it('add their kind to the step, and make far places neighbours', () => {
    const world = mapWorld(map)
    expect(world.connections('2,1', '1,1')).toEqual(['bridge'])
    expect(world.neighbors('0,0')).toContain('5,5')
    expect(world.neighbors('5,5')).toContain('0,0')
    expect(world.connections('0,0', '5,5')).toEqual(['tunnel'])
    // With a shortcut, distance can't promise a lower bound.
    expect(world.distance('0,0', '5,5')).toBe(0)
  })
})

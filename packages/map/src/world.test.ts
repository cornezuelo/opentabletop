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

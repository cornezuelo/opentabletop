import { describe, expect, it } from 'vitest'
import { createMap } from './defaults'
import { mapWorld, parsePlaceOn, placeOn } from './world'

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

  it('a far one measures the hexes between its ends, or its own km', () => {
    const world = mapWorld(map)
    expect(world.far?.('0,0', '5,5')).toBe(true)
    expect(world.far?.('1,1', '2,1')).toBe(false)
    expect(world.km('1,1', '2,1')).toBe(10)
    // Flat-top odd-q: 0,0 to 5,5 is 8 hexes apart.
    expect(world.km('0,0', '5,5')).toBe(80)
    const measured = mapWorld({
      ...map,
      connections: [{ id: 't', between: ['0,0', '5,5'], kind: 'tunnel', km: 12 }],
    })
    expect(measured.km('5,5', '0,0')).toBe(12)
  })
})

describe('ways into sub-maps', () => {
  const parent = createMap()
  parent.meta = { ...parent.meta, id: 'up' }
  const child = createMap()
  child.meta = {
    ...child.meta,
    id: 'down',
    name: 'Below',
    parent: { map: 'up', place: '3,3', entrance: '1,1', kind: 'way-in' },
  }
  child.hexes['1,1'] = { terrain: 'plains', name: 'The stair' }

  it('join the parent place and the entrance, both ways, as a step of the way’s kind', () => {
    const world = mapWorld(parent, undefined, { children: [child] })
    const inside = placeOn('down', '1,1')
    expect(world.neighbors('3,3')).toContain(inside)
    expect(world.neighbors(inside)).toEqual(['3,3'])
    expect(world.connections('3,3', inside)).toEqual(['way-in'])
    expect(world.connectionOf?.(inside, '3,3')).toMatchObject({ kind: 'way-in', name: 'Below' })
    expect(world.km('3,3', inside)).toBe(0)
    expect(world.far?.('3,3', inside)).toBe(true)
    // What the other map knows of its place.
    expect(world.place(inside)).toMatchObject({ terrain: 'plains', name: 'The stair' })
    expect(parsePlaceOn(inside)).toEqual({ map: 'down', place: '1,1' })
    expect(parsePlaceOn('1,1')).toBeUndefined()
    // From inside, the way out.
    const below = mapWorld(child, undefined, { parent })
    expect(below.neighbors('1,1')).toContain(placeOn('up', '3,3'))
    // Without its links, a map has no ways.
    expect(mapWorld(parent).neighbors('3,3')).not.toContain(inside)
  })
})

import { describe, expect, it } from 'vitest'
import { createMap } from './defaults'
import { mapWorld, parsePlaceOn, placeOn } from './world'

describe('the map as the travel engine sees it', () => {
  const map = createMap()
  map.scale = { cellKm: 6 }
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

describe('rivers crossed', () => {
  // A river down column 2 (rows 0–4), a road over it on row 1, a bridge drawn on row 3.
  const map = createMap()
  map.paths = [
    { id: 'r', kind: 'river', hexes: ['2,0', '2,1', '2,2', '2,3', '2,4'] },
    { id: 'w', kind: 'road', hexes: ['1,1', '2,1', '3,1'] },
  ]
  map.connections = [{ id: 'b', between: ['1,3', '2,3'], kind: 'bridge' }]
  const world = mapWorld(map)

  it('a step into its cell from off it crosses it, unless a road or connection takes it over', () => {
    expect(world.crossings?.('1,2', '2,2')).toEqual(['river'])
    // Along it, or out of it, nothing is crossed.
    expect(world.crossings?.('2,1', '2,2')).toEqual([])
    expect(world.crossings?.('2,2', '3,2')).toEqual([])
    // Over the road, or the bridge: it's taken over.
    expect(world.crossings?.('1,1', '2,1')).toEqual([])
    expect(world.crossings?.('1,3', '2,3')).toEqual([])
    // A road is crossed too where a step enters it from off it (the system says whether that matters).
    expect(world.crossings?.('1,0', '1,1')).toEqual(['road'])
  })
})

describe('a map of squares', () => {
  const map = createMap()
  map.grid = { ...map.grid, kind: 'square' }

  it('offers the squares at its corners too, saying which two each passes between', () => {
    const world = mapWorld(map, 1)
    expect(world.neighbors('2,2')).toHaveLength(8)
    expect(world.diagonal?.('2,2', '3,3')).toEqual(['3,2', '2,3'])
    expect(world.diagonal?.('2,2', '3,2')).toBeUndefined()
    // A diagonal as one step: never more than any way there.
    expect(world.distance('0,0', '3,2')).toBe(3)
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
    parent: { map: 'up', ways: [{ place: '3,3', entrance: '1,1', kind: 'way-in' }] },
  }
  child.hexes['1,1'] = { terrain: 'plains', name: 'The stair' }

  it('join the parent place and the entrance, both ways, as a step of the way’s kind', () => {
    const world = mapWorld(parent, undefined, { children: [child] })
    const inside = placeOn('down', '1,1')
    expect(world.neighbors('3,3')).toContain(inside)
    expect(world.neighbors(inside)).toContain('3,3')
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

describe('a sub-map that crosses', () => {
  // A tunnel under a ridge: in at 2,2 of the land, along its gallery, out at 6,2.
  const land = createMap()
  land.meta = { ...land.meta, id: 'land' }
  const tunnel = createMap()
  tunnel.meta = {
    ...tunnel.meta,
    id: 'tunnel',
    name: 'The tunnel',
    parent: {
      map: 'land',
      ways: [
        { place: '2,2', entrance: '0,0', kind: 'way-in' },
        { place: '6,2', entrance: '3,0' },
      ],
    },
  }
  tunnel.scale = { cellKm: 0.5 }

  it('has a way at each of its entrances, each to its own place', () => {
    const world = mapWorld(land, undefined, { children: [tunnel] })
    expect(world.neighbors('2,2')).toContain(placeOn('tunnel', '0,0'))
    expect(world.neighbors('6,2')).toContain(placeOn('tunnel', '3,0'))
    expect(world.connections('2,2', placeOn('tunnel', '0,0'))).toEqual(['way-in'])
    expect(world.connections('6,2', placeOn('tunnel', '3,0'))).toEqual([])
    expect(world.connectionOf?.('2,2', placeOn('tunnel', '0,0'))).toMatchObject({
      id: 'way-tunnel',
    })
    // From inside, out by either.
    const inside = mapWorld(tunnel, undefined, { parent: land })
    expect(inside.neighbors('0,0')).toContain(placeOn('land', '2,2'))
    expect(inside.neighbors('3,0')).toContain(placeOn('land', '6,2'))
  })

  it('is walked as its own map from the other, so a route may go through it', () => {
    const world = mapWorld(land, 10, { children: [tunnel] })
    const gallery = placeOn('tunnel', '1,0')
    expect(world.neighbors(placeOn('tunnel', '0,0'))).toEqual(
      expect.arrayContaining([gallery, '2,2']),
    )
    // At its own scale, with its own steps.
    expect(world.km(placeOn('tunnel', '0,0'), gallery)).toBe(0.5)
    expect(world.place(gallery)).not.toBeNull()
    // And from inside, the land beyond its ways is walked too.
    const inside = mapWorld(tunnel, 10, { parent: land })
    expect(inside.neighbors(placeOn('land', '6,2'))).toEqual(
      expect.arrayContaining([placeOn('land', '7,2'), '3,0']),
    )
    expect(inside.km(placeOn('land', '6,2'), placeOn('land', '7,2'))).toBe(land.scale.cellKm ?? 10)
  })
})

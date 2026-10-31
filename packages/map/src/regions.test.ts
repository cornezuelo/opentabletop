import { matches } from '@open-tabletop/conditions'
import { describe, expect, it } from 'vitest'
import { createMap } from './defaults'
import { possibleParents, regionCells, regionChain, regionTree, roomOfCell } from './regions'
import { deserializeMap, serializeMap } from './serialize'
import { mapWalls } from './walls'
import { mapWorld, placeOfCell } from './world'

describe('regions inside regions', () => {
  const map = createMap()
  map.regions = [
    {
      id: 'greywood1',
      name: 'The Greywood',
      color: '#3d6b35',
      fields: [{ key: 'danger', value: '2' }],
    },
    {
      id: 'heartwood1',
      name: 'The Heart of the Greywood',
      color: '#1b1a17',
      parent: 'greywood1',
      fields: [
        { key: 'danger', value: '5' },
        { key: 'lair', value: 'wyrm' },
      ],
    },
  ]
  map.hexes['1,1'] = { terrain: 'forest', region: 'greywood1' }
  map.hexes['2,1'] = { terrain: 'forest', region: 'heartwood1' }
  map.hexes['3,1'] = {
    terrain: 'forest',
    region: 'heartwood1',
    fields: [{ key: 'danger', value: '6' }],
  }

  it('puts a cell in its region and every region that one lies inside, innermost first', () => {
    expect(regionChain(map.regions, 'heartwood1').map((r) => r.id)).toEqual([
      'heartwood1',
      'greywood1',
    ])
    expect(regionCells(map, 'greywood1').sort()).toEqual(['1,1', '2,1', '3,1'])
    expect(regionCells(map, 'heartwood1').sort()).toEqual(['2,1', '3,1'])
    expect(regionTree(map.regions).map((r) => [r.region.id, r.depth])).toEqual([
      ['greywood1', 0],
      ['heartwood1', 1],
    ])
    // A region can't lie inside itself, nor inside a region inside it.
    expect(possibleParents(map.regions, 'greywood1').map((r) => r.id)).toEqual([])
    expect(possibleParents(map.regions, 'heartwood1').map((r) => r.id)).toEqual(['greywood1'])
  })

  it('reads its values outside in, the innermost region and then the cell winning', () => {
    const world = mapWorld(map)
    expect(world.place('1,1')).toMatchObject({ danger: 2, region: 'The Greywood' })
    const heart = world.place('2,1')!
    expect(heart).toMatchObject({ danger: 5, lair: 'wyrm' })
    expect(heart.region).toEqual(['The Heart of the Greywood', 'The Greywood'])
    expect(world.place('3,1')).toMatchObject({ danger: 6, lair: 'wyrm' })
  })

  it('holds a condition on the outer region in the inner one too', () => {
    const heart = mapWorld(map).place('2,1')!
    const context = { place: { region: heart.region } }
    expect(matches({ 'place.region': 'The Greywood' }, context)).toBe(true)
    expect(matches({ 'place.region': 'The Heart of the Greywood' }, context)).toBe(true)
    expect(matches({ 'place.region': 'Ashford Vale' }, context)).toBe(false)
  })

  it('keeps a region’s parent through a save, and reads a loop of parents without hanging', () => {
    const back = deserializeMap(serializeMap(map))
    expect(back.regions[1].parent).toBe('greywood1')
    const loop = [
      { id: 'a', name: 'A', color: '#000000', parent: 'b' },
      { id: 'b', name: 'B', color: '#000000', parent: 'a' },
    ]
    expect(regionChain(loop, 'a').map((r) => r.id)).toEqual(['a', 'b'])
    expect(regionTree(loop)).toHaveLength(2)
  })
})

describe('rooms inside rooms', () => {
  // A chapel (a room) with an altar inside it (values of its own, the same room) and a crypt
  // inside it that is a room of its own.
  const map = createMap()
  map.grid = { ...map.grid, kind: 'square', width: 6, height: 3 }
  map.terrains = [...map.terrains, { id: 'stone', name: 'Stone', color: '#999999', floor: true }]
  map.regions = [
    { id: 'chapel', name: 'The chapel', color: '#000000', onePlace: true },
    {
      id: 'altar',
      name: 'The altar',
      color: '#000000',
      parent: 'chapel',
      fields: [{ key: 'holy', value: '1' }],
    },
    { id: 'crypt', name: 'The crypt', color: '#000000', parent: 'chapel', onePlace: true },
  ]
  for (const [key, region] of [
    ['0,1', 'chapel'],
    ['1,1', 'chapel'],
    ['2,1', 'altar'],
    ['3,1', 'crypt'],
    ['4,1', 'crypt'],
  ] as const)
    map.hexes[key] = { terrain: 'stone', region }

  it('makes a cell’s room the nearest region up the tree played as one place', () => {
    expect(roomOfCell(map, '2,1')).toBe('chapel')
    expect(roomOfCell(map, '3,1')).toBe('crypt')
    expect(placeOfCell(map, '2,1')).toBe('area:chapel')
    expect(placeOfCell(map, '4,1')).toBe('area:crypt')
  })

  it('stands a wall between a room and a room inside it, none between a room and its altar', () => {
    const walls = mapWalls(map)
    expect(walls.between('1,1', '2,1')).toBe(false)
    expect(walls.between('2,1', '3,1')).toBe(true)
    const world = mapWorld(map, 1)
    expect(world.neighbors('area:chapel')).not.toContain('area:crypt')
    map.connections = [{ id: 'd', between: ['2,1', '3,1'], kind: 'door' }]
    expect(mapWorld(map, 1).neighbors('area:chapel')).toContain('area:crypt')
    map.connections = []
  })

  it('reads the chapel as the chapel, not as its altar', () => {
    const chapel = mapWorld(map, 1).place('area:chapel')!
    expect(chapel.name).toBe('The chapel')
    expect(chapel.holy).toBeUndefined()
    expect(mapWorld(map, 1).place('area:crypt')!.region).toEqual(['The crypt', 'The chapel'])
  })
})

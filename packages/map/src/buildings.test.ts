import type { HexKey } from '@open-tabletop/hex'
import { describe, expect, it } from 'vitest'
import { buildingAt, mapBuildings, rectangles, roofedBuildings } from './buildings'
import { createMap } from './defaults'

/** A square map with a floor and ground, painted from rows of text: `#` floor, `.` ground. */
function village(rows: string[], regions: Record<string, string> = {}) {
  const map = createMap('Village', { template: 'dungeon' })
  map.grid = { ...map.grid, width: rows[0].length, height: rows.length }
  map.terrains = [
    { id: 'floor', color: '#ffffff', floor: true },
    { id: 'grass', color: '#88aa55' },
  ]
  rows.forEach((line, row) =>
    [...line].forEach((ch, col) => {
      const key = `${col},${row}` as HexKey
      map.hexes[key] = { terrain: ch === '.' ? 'grass' : 'floor' }
      // A letter: floor in that region (`a` → region `a`).
      if (/[a-z]/.test(ch)) map.hexes[key]!.region = regions[ch] ?? ch
    }),
  )
  return map
}

describe('buildings: floor seen from outside', () => {
  it('makes each group of floor cells joined side by side a building', () => {
    const map = village(['##..#', '##..#', '.....', '..###'])
    const buildings = mapBuildings(map)
    expect(buildings.map((b) => b.cells.length)).toEqual([4, 2, 3])
    expect(buildingAt(buildings, '1,1')?.id).toBe('0,0')
    expect(buildingAt(buildings, '4,1')?.id).toBe('4,0')
    expect(buildingAt(buildings, '2,0')).toBeUndefined()
  })

  it('opens the building the party stands in, or a cell of is selected', () => {
    const buildings = mapBuildings(village(['##..#', '##..#']))
    expect(roofedBuildings(buildings, [undefined, null]).map((b) => b.id)).toEqual(['0,0', '4,0'])
    expect(roofedBuildings(buildings, ['1,1', '2,0']).map((b) => b.id)).toEqual(['4,0'])
    expect(roofedBuildings(buildings, ['1,0', '4,1'])).toEqual([])
  })

  it('splits two houses side by side, each a room, but not the rooms of one house', () => {
    const map = village(['aabb', 'aabb', 'ccdd'])
    map.regions = [
      { id: 'a', name: 'House A', color: '#000', onePlace: true },
      { id: 'b', name: 'House B', color: '#000', onePlace: true },
      // The other house's two rooms, inside it.
      { id: 'house', name: 'House C', color: '#000', onePlace: true },
      { id: 'c', name: 'Hall', color: '#000', onePlace: true, parent: 'house' },
      { id: 'd', name: 'Kitchen', color: '#000', onePlace: true, parent: 'house' },
    ]
    const buildings = mapBuildings(map)
    expect(buildings.map((b) => [b.id, b.cells.length])).toEqual([
      ['0,0', 4],
      ['2,0', 4],
      ['0,2', 4],
    ])
  })

  it('a region round the whole village (not a room) splits nothing', () => {
    const map = village(['vv', 'vv'])
    map.regions = [{ id: 'v', name: 'The village', color: '#000' }]
    expect(mapBuildings(map)).toHaveLength(1)
  })

  it('cuts a building into rectangles: an L-shaped house is two', () => {
    const map = village(['###.', '###.', '#...'])
    expect(mapBuildings(map)[0].rects).toEqual([
      { col: 0, row: 0, w: 3, h: 2 },
      { col: 0, row: 2, w: 1, h: 1 },
    ])
    const keys = ['0,0', '1,0', '0,1', '1,1', '0,2', '1,2'] as HexKey[]
    expect(rectangles(keys)).toEqual([{ col: 0, row: 0, w: 2, h: 3 }])
  })

  it('has none on a map without floor, and no rectangles on hexes', () => {
    expect(mapBuildings(createMap())).toEqual([])
    const map = village(['##'])
    map.grid = { ...map.grid, kind: undefined }
    expect(mapBuildings(map)[0].rects).toEqual([])
  })
})

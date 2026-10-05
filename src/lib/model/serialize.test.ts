import { describe, expect, it } from 'vitest'
import { CURRENT_VERSION, createMap } from './defaults'
import { MapFormatError } from './migrations'
import { deserializeMap, serializeMap } from './serialize'

describe('serialize', () => {
  it('round-trips a map', () => {
    const map = createMap('Test')
    map.hexes['3,4'] = { terrain: 'forest' }
    map.grid.orientation = 'pointy'
    expect(deserializeMap(serializeMap(map))).toEqual(map)
  })

  it('rejects garbage', () => {
    expect(() => deserializeMap('not json')).toThrow(MapFormatError)
    expect(() => deserializeMap('[]')).toThrow(MapFormatError)
    expect(() => deserializeMap(JSON.stringify({ version: CURRENT_VERSION }))).toThrow(
      MapFormatError,
    )
  })

  it('rejects maps from a newer version', () => {
    const map = { ...createMap(), version: CURRENT_VERSION + 1 }
    expect(() => deserializeMap(JSON.stringify(map))).toThrowError(
      expect.objectContaining({ code: 'newerVersion' }),
    )
  })

  it('drops invalid entries and clamps settings', () => {
    const map = createMap() as unknown as Record<string, unknown>
    map.hexes = { '1,1': { terrain: 'lake' }, 'x,y': { terrain: 'lake' }, '2,2': 5 }
    map.grid = { orientation: 'weird', width: 9999, height: -3, hexSize: 'big' }
    const loaded = deserializeMap(JSON.stringify(map))
    expect(Object.keys(loaded.hexes)).toEqual(['1,1'])
    expect(loaded.grid).toMatchObject({ orientation: 'flat', width: 200, height: 1, hexSize: 40 })
  })
})

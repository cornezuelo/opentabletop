import { describe, expect, it } from 'vitest'
import { CURRENT_VERSION, createMap } from './defaults'
import { MapFormatError } from './migrations'
import { deserializeMap, serializeMap } from './serialize'

describe('serialize', () => {
  it('round-trips a map', () => {
    const map = createMap('Test')
    map.hexes['3,4'] = { terrain: 'forest' }
    map.hexes['5,1'] = {
      name: 'Monasterio',
      notes: '# Notas\n\n- monjes',
      pois: [{ id: 'p1', name: 'Altar', description: 'Manchado de sangre', note: 'Lugares/Altar' }],
      tags: ['santuario'],
      fields: [{ key: 'Peligro', value: '2' }],
    }
    map.grid.orientation = 'pointy'
    map.print = { ...map.print, paper: 'A3', landscape: true, hexMm: 25.4 }
    map.hexes['0,0'] = { note: 'Kal-Arath/Hexes/0101' }
    expect(deserializeMap(serializeMap(map))).toEqual(map)
  })

  it('gives maps without a valid id a fresh one', () => {
    const map = createMap() as unknown as { meta: Record<string, unknown> }
    map.meta.id = '../../etc'
    const loaded = deserializeMap(JSON.stringify(map))
    expect(loaded.meta.id).toMatch(/^[a-z0-9]{12}$/)
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
    map.hexes = {
      '1,1': { terrain: 'lake', pois: [{ name: 'Isla' }, { nope: 1 }], tags: ['a', 3] },
      'x,y': { terrain: 'lake' },
      '2,2': 5,
      '3,3': { name: '  ' },
    }
    map.grid = { orientation: 'weird', width: 9999, height: -3, hexSize: 'big' }
    const loaded = deserializeMap(JSON.stringify(map))
    expect(Object.keys(loaded.hexes)).toEqual(['1,1'])
    expect(loaded.hexes['1,1'].pois).toEqual([{ id: expect.any(String), name: 'Isla' }])
    expect(loaded.hexes['1,1'].tags).toEqual(['a'])
    expect(loaded.grid).toMatchObject({ orientation: 'flat', width: 200, height: 1, hexSize: 40 })
    expect(loaded.print).toEqual(createMap().print)
  })
})

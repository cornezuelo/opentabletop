import { describe, expect, it } from 'vitest'
import { createMap } from './defaults'
import { playChanges } from './play'
import { deserializeMap, serializeMap } from './serialize'

/** The same map as another window would read it back from the library. */
const reread = (map: ReturnType<typeof createMap>) => deserializeMap(serializeMap(map))

describe('playChanges', () => {
  it('finds nothing between a map and itself read back', () => {
    const map = createMap()
    expect(playChanges(map, reread(map))).toEqual([])
  })

  it('names the play parts another app changed, whenever it saved', () => {
    const map = createMap()
    const other = reread(map)
    other.territories = { clans: ['3,4'] }
    other.layers.grid = { ...other.layers.grid, visible: !other.layers.grid.visible }
    other.meta.modified = '2099-01-01T00:00:00.000Z'
    expect(playChanges(map, other)).toEqual(['territories', 'layers'])
  })

  it('says the map itself changed when hexes or settings differ', () => {
    const map = createMap()
    const painted = reread(map)
    painted.hexes['3,4'] = { terrain: map.terrains[0].id }
    expect(playChanges(map, painted)).toBeNull()
    const renamed = reread(map)
    renamed.meta.name = 'Elsewhere'
    expect(playChanges(map, renamed)).toBeNull()
  })

  it("doesn't mind keys written in another order", () => {
    const map = createMap()
    map.hexes['1,1'] = { terrain: map.terrains[0].id, note: 'x' } as (typeof map.hexes)['1,1']
    const other = reread(map)
    other.hexes['1,1'] = { note: 'x', terrain: map.terrains[0].id } as (typeof map.hexes)['1,1']
    expect(playChanges(map, other)).toEqual([])
  })
})

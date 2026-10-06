import { describe, expect, it } from 'vitest'
import { RemoveRegionCommand, regionSizes } from '../commands/regions'
import { bundleToMap, mapToBundle } from '../io/otd'
import { mapWorld } from '../play/world'
import { createMap } from './defaults'

function mapWithRegion() {
  const map = createMap()
  map.regions = [{ id: 'marches0001', name: 'Black Marches', color: '#5b3a6e' }]
  map.hexes['1,1'] = { terrain: 'forest', region: 'marches0001' }
  map.hexes['2,1'] = { region: 'marches0001' }
  return map
}

describe('regions', () => {
  it('are saved in OTD (hex.region plus their look in ext.hexmapper) and read back', () => {
    const map = mapWithRegion()
    const bundle = mapToBundle(map)
    expect(bundle.maps[0].hexes['2,1']).toEqual({ region: 'marches0001' })
    const back = bundleToMap(JSON.parse(JSON.stringify(bundle)))
    expect(back.regions).toEqual(map.regions)
    expect(regionSizes(back).get('marches0001')).toBe(2)
  })

  it('deleting one takes its hexes out of it, and undo puts them back', () => {
    const map = mapWithRegion()
    const command = new RemoveRegionCommand(structuredClone(map.regions[0]))
    command.apply(map)
    expect(map.regions).toEqual([])
    expect(map.hexes['1,1']).toEqual({ terrain: 'forest' })
    expect(map.hexes['2,1']).toBeUndefined()
    command.revert(map)
    expect(regionSizes(map).get('marches0001')).toBe(2)
  })

  it('travel checks see the region by name', () => {
    expect(mapWorld(mapWithRegion()).cell('1,1')).toMatchObject({ region: 'Black Marches' })
  })
})

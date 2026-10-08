import { describe, expect, it } from 'vitest'
import { RemoveRegionCommand, regionSizes } from '../commands/regions'
import { bundleToMap, mapToBundle } from '../io/otd'
import { mapWorld } from '../play/world'
import { SetRegionStyleCommand } from '../commands/settings'
import { createMap, CURRENT_VERSION, DEFAULT_REGION_STYLE } from './defaults'
import { migrate } from './migrations'
import { deserializeMap, serializeMap } from './serialize'

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

  it('have a map-wide style and their own, saved, clamped and undoable', () => {
    const map = mapWithRegion()
    expect(map.regionStyle).toEqual(DEFAULT_REGION_STYLE)
    map.regions[0].style = { fill: 0, dashed: true }
    const command = new SetRegionStyleCommand(map.regionStyle, { ...map.regionStyle, border: 0.2 })
    command.apply(map)
    expect(map.regionStyle.border).toBe(0.2)
    const back = bundleToMap(JSON.parse(JSON.stringify(mapToBundle(map))))
    expect(back.regionStyle.border).toBe(0.2)
    expect(back.regions[0].style).toEqual({ fill: 0, dashed: true })
    command.revert(map)
    expect(map.regionStyle).toEqual(DEFAULT_REGION_STYLE)
    // Broken values are clamped or dropped.
    const raw = JSON.parse(serializeMap(map))
    raw.regionStyle = { fill: 5, border: 'thick', dashed: 'yes' }
    raw.regions[0].style = { borderOpacity: -1 }
    const read = deserializeMap(JSON.stringify(raw))
    expect(read.regionStyle).toEqual({ ...DEFAULT_REGION_STYLE, fill: 0.6 })
    expect(read.regions[0].style).toEqual({ borderOpacity: 0 })
  })

  it('old maps keep the look they had (v7 → v8)', () => {
    expect(migrate({ version: 7 })).toEqual({
      version: CURRENT_VERSION,
      regionStyle: DEFAULT_REGION_STYLE,
    })
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

describe('path kinds and travel', () => {
  it('roads, trails and rivers are travel edges; borders and walls are only drawn', () => {
    const map = createMap()
    map.paths = [
      { id: 'road00000001', kind: 'road', hexes: ['0,0', '1,0'] },
      { id: 'wall00000001', kind: 'wall', hexes: ['0,0', '1,0'] },
      { id: 'border000001', kind: 'border', hexes: ['1,0', '2,0'], closed: true },
    ]
    const world = mapWorld(map)
    expect(world.edges('0,0', '1,0')).toEqual(['road'])
    expect(world.edges('1,0', '2,0')).toEqual([])
  })
})

describe('POI icons', () => {
  it('are kept in OTD (ext.hexmapper of the POI)', () => {
    const map = createMap()
    map.hexes['1,1'] = { pois: [{ id: 'poi000000001', name: 'Old well', icon: 'game:well' }] }
    const bundle = mapToBundle(map)
    expect(bundle.pois[0].ext).toEqual({ hexmapper: { icon: 'game:well' } })
    expect(bundleToMap(JSON.parse(JSON.stringify(bundle))).hexes['1,1'].pois?.[0].icon).toBe(
      'game:well',
    )
  })
})

describe('names per element', () => {
  it('keep their visibility and own style in OTD', () => {
    const map = createMap()
    const own = {
      font: 'cinzel' as const,
      size: 1.5,
      italic: false,
      halo: true,
      haloColor: '#ffffff',
    }
    map.hexes['1,1'] = { name: 'Ravenhold', showName: false }
    map.hexes['2,2'] = { name: 'Old Ford', nameStyle: own }
    map.regions = [{ id: 'marches0001', name: 'Marches', color: '#5b3a6e', nameStyle: own }]
    map.tokens = [
      {
        id: 'ilyana00001',
        name: 'Ilyana',
        kind: 'npc',
        iconId: 'game:cowled',
        showName: true,
        nameStyle: own,
      },
    ]
    const back = bundleToMap(JSON.parse(JSON.stringify(mapToBundle(map))))
    expect(back.hexes['1,1']).toMatchObject({ name: 'Ravenhold', showName: false })
    expect(back.hexes['2,2'].nameStyle).toEqual(own)
    expect(back.regions[0].nameStyle).toEqual(own)
    expect(back.tokens[0]).toMatchObject({ showName: true, nameStyle: own })
  })
})

describe('the scale trips are played at', () => {
  it('is the map’s, else its system’s, else 10 km', () => {
    const map = mapWithRegion()
    expect(mapWorld({ ...map, scale: {} }).hexKm).toBe(10)
    expect(mapWorld({ ...map, scale: {} }, 30).hexKm).toBe(30)
    expect(mapWorld({ ...map, scale: { hexKm: 5 } }, 30).hexKm).toBe(5)
  })
})

import { describe, expect, it } from 'vitest'
import {
  createMap,
  deserializeMap,
  hasMetadata,
  normalizeIcon,
  serializeMap,
} from '@open-tabletop/map'
import { AddAssetCommand, RemoveAssetCommand } from './assets'
import { History } from './history'
import { SetUnderlayCommand } from './settings'

const asset = { id: 'asset0000001', name: 'Torre', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }

describe('assets', () => {
  it('removing an asset clears its icon from hexes, and undo restores both', () => {
    const map = createMap()
    const history = new History()
    history.execute(new AddAssetCommand(asset), map)
    map.hexes['1,1'] = { icon: { id: 'asset:asset0000001' } }
    map.hexes['2,2'] = { icon: { id: 'asset:asset0000001', scale: 1.5 }, terrain: 'forest' }
    map.hexes['3,3'] = { icon: { id: 'game:castle' } }

    history.execute(new RemoveAssetCommand(asset), map)
    expect(map.assets).toEqual([])
    expect(map.hexes).toEqual({
      '2,2': { terrain: 'forest' },
      '3,3': { icon: { id: 'game:castle' } },
    })

    history.undo(map)
    expect(map.assets).toEqual([asset])
    expect(map.hexes['1,1'].icon).toEqual({ id: 'asset:asset0000001' })
    expect(map.hexes['2,2']).toEqual({
      terrain: 'forest',
      icon: { id: 'asset:asset0000001', scale: 1.5 },
    })
  })

  it('serializes assets and rejects non-image data URLs', () => {
    const map = createMap()
    map.assets = [asset, { id: 'asset0000002', name: 'x', dataUrl: 'javascript:alert(1)' }]
    map.hexes['0,0'] = { icon: { id: 'game:castle', color: '#AA0000', rotation: 90, halo: true } }
    const loaded = deserializeMap(serializeMap(map))
    expect(loaded.assets).toEqual([asset])
    expect(loaded.hexes['0,0']).toEqual({
      icon: { id: 'game:castle', color: '#aa0000', rotation: 90, halo: true },
    })
  })

  it('icons alone do not count as hidden metadata', () => {
    expect(hasMetadata({ icon: { id: 'game:castle' }, terrain: 'hills' })).toBe(false)
  })

  it('normalizes icon styles, dropping defaults and clamping', () => {
    expect(
      normalizeIcon({ id: 'game:x', scale: 1, rotation: 360, flip: false, color: 'red' }),
    ).toEqual({ id: 'game:x' })
    expect(normalizeIcon({ id: 'game:x', scale: 9, rotation: -90 })).toEqual({
      id: 'game:x',
      scale: 2,
      rotation: 270,
    })
    expect(normalizeIcon({ id: '' })).toBeUndefined()
    expect(normalizeIcon({ id: 'game:x', offset: [0.001, 0] })).toEqual({ id: 'game:x' })
    expect(normalizeIcon({ id: 'game:x', offset: [3, 4] })?.offset).toEqual([0.42, 0.56])
    // Halo/outline settings only persist while enabled, and only when not default.
    expect(
      normalizeIcon({
        id: 'game:x',
        halo: false,
        haloColor: '#000000',
        outline: true,
        outlineWidth: 0.03,
      }),
    ).toEqual({ id: 'game:x', outline: true })
    expect(
      normalizeIcon({
        id: 'game:x',
        halo: true,
        haloColor: '#FF0000',
        haloSize: 5,
        outline: true,
        outlineColor: '#000000',
      }),
    ).toEqual({
      id: 'game:x',
      halo: true,
      haloColor: '#ff0000',
      haloSize: 0.9,
      outline: true,
      outlineColor: '#000000',
    })
  })
})

describe('the picture under the map', () => {
  it('is chosen with its image, fitted, and undone in steps; it survives saving', () => {
    const map = createMap()
    const history = new History()
    const scan = { ...asset, id: 'scan00000001', name: 'Scan' }
    history.execute(
      new SetUnderlayCommand(
        { assets: [] },
        {
          underlay: { asset: scan.id, x: 0, y: 0, width: 500, cells: 0.5 },
          assets: [scan],
        },
      ),
      map,
    )
    const fitted = { asset: scan.id, x: -3, y: 4, width: 540, cells: 0.2 }
    history.execute(
      new SetUnderlayCommand(
        { underlay: structuredClone(map.underlay), assets: [scan] },
        { underlay: fitted, assets: [scan] },
      ),
      map,
    )
    expect(deserializeMap(serializeMap(map)).underlay).toEqual(fitted)
    history.undo(map)
    expect(map.underlay?.width).toBe(500)
    history.undo(map)
    expect(map.underlay).toBeUndefined()
    expect(map.assets).toEqual([])
  })
})

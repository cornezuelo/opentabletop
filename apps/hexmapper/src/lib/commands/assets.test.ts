import { describe, expect, it } from 'vitest'
import { createMap } from '../model/defaults'
import { hasMetadata, normalizeIcon } from '../model/hex'
import { deserializeMap, serializeMap } from '../model/serialize'
import { AddAssetCommand, RemoveAssetCommand } from './assets'
import { History } from './history'

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
  })

  it('reads icons saved as plain ids', () => {
    const raw = JSON.parse(serializeMap(createMap()))
    raw.hexes['1,1'] = { icon: 'game:castle' }
    expect(deserializeMap(JSON.stringify(raw)).hexes['1,1']).toEqual({
      icon: { id: 'game:castle' },
    })
  })
})

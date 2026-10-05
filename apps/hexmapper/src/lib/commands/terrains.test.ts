import { describe, expect, it } from 'vitest'
import { createMap } from '../model/defaults'
import { History } from './history'
import { SetTerrainsCommand, terrainUsage } from './terrains'

describe('SetTerrainsCommand', () => {
  it('edits the palette and clears hexes of removed terrains, undoably', () => {
    const map = createMap()
    map.hexes['0,0'] = { terrain: 'forest' }
    map.hexes['1,0'] = { terrain: 'forest', name: 'Bosque viejo' }
    map.hexes['2,0'] = { terrain: 'hills' }
    expect(terrainUsage(map).get('forest')).toBe(2)

    const history = new History()
    const palette = map.terrains
      .filter((t) => t.id !== 'forest')
      .map((t) => (t.id === 'hills' ? { ...t, name: 'Colinas rojas', color: '#aa3322' } : t))
    history.execute(
      new SetTerrainsCommand([...palette, { id: 'ash', name: 'Ceniza', color: '#555555' }]),
      map,
    )

    expect(map.terrains.some((t) => t.id === 'forest')).toBe(false)
    expect(map.hexes).toEqual({ '1,0': { name: 'Bosque viejo' }, '2,0': { terrain: 'hills' } })

    history.undo(map)
    expect(map.terrains.find((t) => t.id === 'hills')?.name).toBeUndefined()
    expect(map.hexes['0,0']).toEqual({ terrain: 'forest' })
    expect(map.hexes['1,0']).toEqual({ name: 'Bosque viejo', terrain: 'forest' })
  })
})

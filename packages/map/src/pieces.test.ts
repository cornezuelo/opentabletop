import { describe, expect, it } from 'vitest'
import type { LaidPiece } from '@open-tabletop/session'
import { createMap } from './defaults'
import type { HexKey } from '@open-tabletop/hex'
import { withPieces } from './pieces'
import { mapWorld } from './world'

/** A floor cell with a door north, and a room of two cells laid past it, a crack on its far side. */
function vault() {
  const map = createMap('The vault')
  map.grid = { ...map.grid, kind: 'square', width: 12, height: 12 }
  map.terrains = [...map.terrains, { id: 'slab', name: 'Slab', color: '#cccccc', floor: true }]
  map.hexes['5,5' as HexKey] = { terrain: 'slab' }
  map.connections = [{ id: 'door', between: ['5,5', '5,4'], kind: 'door' }]
  const crypt: LaidPiece = {
    id: 'crypt',
    name: 'Crypt',
    room: true,
    fields: [{ key: 'danger', value: '2' }],
    at: '5,4',
    turn: 0,
    mirror: false,
    cells: { '5,4': 'slab', '5,3': 'slab' },
    connections: [
      {
        between: ['5,3', '5,2'],
        kind: 'crack',
        name: 'A crack',
        fields: [{ key: 'state', value: 'hidden' }],
      },
    ],
  }
  return { map, crypt }
}

describe('pieces laid on a map', () => {
  it('lays a room with its values and its exits, leaving the map given as it was', () => {
    const { map, crypt } = vault()
    const before = JSON.stringify(map)
    const laid = withPieces(map, [crypt])
    expect(JSON.stringify(map)).toBe(before)
    const room = laid.regions.find((r) => r.onePlace)!
    expect(room).toMatchObject({ name: 'Crypt', fields: [{ key: 'danger', value: '2' }] })
    expect(laid.hexes['5,3' as HexKey]).toEqual({ terrain: 'slab', region: room.id })
    expect(laid.connections.at(-1)).toMatchObject({ between: ['5,3', '5,2'], kind: 'crack' })
    expect(laid.pieces).toEqual([{ id: 'crypt', at: '5,4', turn: 0, mirror: false }])
    expect(withPieces(map, [])).toBe(map)
  })

  it('makes the same ids each time, ones a saved map keeps, and never one taken', () => {
    const { map, crypt } = vault()
    const [once, twice] = [withPieces(map, [crypt]), withPieces(map, [crypt])]
    expect(twice.regions.at(-1)!.id).toBe(once.regions.at(-1)!.id)
    expect(twice.connections.at(-1)!.id).toBe(once.connections.at(-1)!.id)
    for (const id of [once.regions.at(-1)!.id, once.connections.at(-1)!.id])
      expect(id).toMatch(/^[a-z0-9]{6,32}$/)
    // Laid again where a room's region was left behind: another id.
    const again = withPieces({ ...once, hexes: map.hexes }, [crypt])
    expect(new Set(again.regions.map((r) => r.id)).size).toBe(again.regions.length)
    expect(new Set(again.connections.map((c) => c.id)).size).toBe(again.connections.length)
  })

  it('a cell of a room stands for the room: its exits are read from the cell come in by', () => {
    const { map, crypt } = vault()
    const world = mapWorld(withPieces(map, [crypt]), 1)
    // The party came in at 5,4; the crack leaves the room from its other cell.
    expect(world.place('5,4')).toMatchObject({ name: 'Crypt', danger: 2 })
    expect(world.neighbors('5,4')).toContain('5,2')
    expect(world.connections('5,4', '5,2')).toEqual(['crack'])
    expect(world.connectionOf?.('5,4', '5,2')).toMatchObject({ name: 'A crack', state: 'hidden' })
    expect(world.connections('5,4', '5,5')).toEqual(['door'])
  })
})

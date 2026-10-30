import { describe, expect, it } from 'vitest'
import { wayWorld } from './way'

describe('abstract trips', () => {
  const world = wayWorld(
    [
      { terrain: 'plains', tags: [], connections: ['road'] },
      { terrain: 'forest', tags: ['haunted'], connections: [] },
      { terrain: 'hills', tags: [], connections: [] },
    ],
    10,
  )

  it('is a line of hexes joined by their connections', () => {
    expect(world.place('1')).toEqual({ terrain: 'forest', tags: ['haunted'] })
    expect(world.place('3')).toBeNull()
    expect(world.neighbors('0')).toEqual(['1'])
    expect(world.neighbors('1')).toEqual(['0', '2'])
    expect(world.distance('0', '2')).toBe(20)
    expect(world.connections('0', '1')).toEqual(['road'])
    expect(world.connections('1', '0')).toEqual(['road'])
    expect(world.connections('1', '2')).toEqual([])
  })
})

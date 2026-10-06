import { describe, expect, it } from 'vitest'
import { wayWorld } from './way'

describe('abstract trips', () => {
  const world = wayWorld(
    [
      { terrain: 'plains', tags: [], edges: ['road'] },
      { terrain: 'forest', tags: ['haunted'], edges: [] },
      { terrain: 'hills', tags: [], edges: [] },
    ],
    10,
  )

  it('is a line of hexes joined by their edges', () => {
    expect(world.cell('1')).toEqual({ terrain: 'forest', tags: ['haunted'] })
    expect(world.cell('3')).toBeNull()
    expect(world.neighbors('0')).toEqual(['1'])
    expect(world.neighbors('1')).toEqual(['0', '2'])
    expect(world.distance('0', '2')).toBe(2)
    expect(world.edges('0', '1')).toEqual(['road'])
    expect(world.edges('1', '0')).toEqual(['road'])
    expect(world.edges('1', '2')).toEqual([])
  })
})

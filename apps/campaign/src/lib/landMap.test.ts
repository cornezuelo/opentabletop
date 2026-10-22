import { createMap } from '@open-tabletop/map'
import { describe, expect, it } from 'vitest'
import { drawLand } from './landMap'

describe('the land minimap', () => {
  it('draws every hex by terrain colour, and each faction’s land hatched with its frontier', () => {
    const map = createMap('m')
    map.grid = { ...map.grid, width: 3, height: 2 }
    const forest = map.terrains[0]
    map.hexes['0,0'] = { terrain: forest.id }
    map.hexes['1,0'] = { terrain: forest.id }
    map.territories = { clans: ['0,0', '2,1'], vale: ['1,1'] }
    const drawn = drawLand(map)
    const hexes = (d: string) => d.split('Z').filter(Boolean).length
    expect(drawn.fills.map((f) => [f.fill, hexes(f.d)])).toEqual([
      [forest.color, 2],
      ['', 4],
    ])
    // Lines of the hatching and edges of the frontier: one move each.
    const lines = (d: string) => d.split('M').filter(Boolean).length
    const [clans, vale] = drawn.land
    expect([clans.faction, vale.faction]).toEqual(['clans', 'vale'])
    expect(lines(clans.hatch)).toBeGreaterThan(lines(vale.hatch))
    // Two hexes apart: each a whole frontier; one hex: six edges.
    expect(lines(clans.frontier)).toBe(12)
    expect(lines(vale.frontier)).toBe(6)
    // The terrain still shows: the land draws no hexes of its own.
    expect(clans.hatch).not.toContain('Z')
    // The box holds every hex, with a hex's radius around.
    const [x, y, w, h] = drawn.box.split(' ').map(Number)
    expect(x).toBeLessThan(0)
    expect(y).toBeLessThan(0)
    expect(w).toBeGreaterThan(0)
    expect(h).toBeGreaterThan(0)
  })
  it('draws no frontier between two hexes of one faction', () => {
    const map = createMap('m')
    map.grid = { ...map.grid, width: 2, height: 1 }
    map.territories = { clans: ['0,0', '1,0'] }
    const [clans] = drawLand(map).land
    expect(clans.frontier.split('M').filter(Boolean)).toHaveLength(10)
  })
})

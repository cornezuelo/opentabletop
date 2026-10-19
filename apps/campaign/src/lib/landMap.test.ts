import { createMap } from '@open-tabletop/map'
import { describe, expect, it } from 'vitest'
import { drawLand } from './landMap'

describe('the land minimap', () => {
  it('draws every hex by terrain colour, and each faction’s land in its own path', () => {
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
    expect(drawn.land.map((l) => [l.faction, hexes(l.d)])).toEqual([
      ['clans', 2],
      ['vale', 1],
    ])
    // The box holds every hex, with a hex's radius around.
    const [x, y, w, h] = drawn.box.split(' ').map(Number)
    expect(x).toBeLessThan(0)
    expect(y).toBeLessThan(0)
    expect(w).toBeGreaterThan(0)
    expect(h).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'
import { distance, line, neighbors, round, spiral } from './axial'
import {
  cellsInRadius,
  floodFill,
  formatCoord,
  keyOf,
  neighborCells,
  parseKey,
  type GridShape,
} from './grid'
import { cornerOffsets, hexToPixel, pixelToHex } from './layout'
import { toAxial, toOffset, type Orientation } from './offset'

const orientations: Orientation[] = ['flat', 'pointy']

describe('axial', () => {
  it('neighbors are at distance 1', () => {
    const h = { q: 2, r: -1 }
    for (const n of neighbors(h)) expect(distance(h, n)).toBe(1)
  })

  it('round snaps to nearest hex and avoids -0', () => {
    expect(round(0.1, -0.1)).toEqual({ q: 0, r: 0 })
    expect(Object.is(round(-0.2, 0.1).q, -0)).toBe(false)
    expect(round(0.9, 0.1)).toEqual({ q: 1, r: 0 })
  })

  it('line is contiguous and includes both ends', () => {
    const a = { q: 0, r: 0 }
    const b = { q: 4, r: -2 }
    const hexes = line(a, b)
    expect(hexes).toHaveLength(5)
    expect(hexes[0]).toEqual(a)
    expect(hexes[4]).toEqual(b)
    for (let i = 1; i < hexes.length; i++) expect(distance(hexes[i - 1], hexes[i])).toBe(1)
  })

  it('spiral has 1 + 3n(n+1) hexes', () => {
    expect(spiral({ q: 0, r: 0 }, 0)).toHaveLength(1)
    expect(spiral({ q: 0, r: 0 }, 2)).toHaveLength(19)
  })
})

describe.each(orientations)('offset and layout (%s)', (orientation) => {
  it('offset <-> axial round-trips', () => {
    for (let col = -3; col < 6; col++)
      for (let row = -3; row < 6; row++)
        expect(toOffset(toAxial({ col, row }, orientation), orientation)).toEqual({ col, row })
  })

  it('pixel <-> hex round-trips at centers and near corners', () => {
    const size = 30
    const corners = cornerOffsets(orientation, size)
    for (const h of spiral({ q: 1, r: 1 }, 3)) {
      const p = hexToPixel(h, orientation, size)
      expect(pixelToHex(p, orientation, size)).toEqual(h)
      for (let i = 0; i < 12; i += 2) {
        const near = { x: p.x + corners[i] * 0.9, y: p.y + corners[i + 1] * 0.9 }
        expect(pixelToHex(near, orientation, size)).toEqual(h)
      }
    }
  })

  it('cell (0,0) is at the origin', () => {
    expect(hexToPixel(toAxial({ col: 0, row: 0 }, orientation), orientation, 10)).toEqual({
      x: 0,
      y: 0,
    })
  })
})

describe('grid', () => {
  const shape: GridShape = { orientation: 'flat', width: 5, height: 4 }

  it('keys round-trip', () => {
    expect(parseKey(keyOf({ col: 3, row: 12 }))).toEqual({ col: 3, row: 12 })
  })

  it('neighbors are clipped to bounds', () => {
    expect(neighborCells({ col: 0, row: 0 }, shape)).toHaveLength(2)
    expect(neighborCells({ col: 2, row: 2 }, shape)).toHaveLength(6)
  })

  it('cellsInRadius is clipped to bounds', () => {
    expect(cellsInRadius({ col: 2, row: 1 }, 1, shape)).toHaveLength(7)
    expect(cellsInRadius({ col: 0, row: 0 }, 1, shape)).toHaveLength(3)
  })

  it('floodFill covers a contiguous region only', () => {
    const wall = new Set(['2,0', '2,1', '2,2', '2,3'])
    const region = floodFill({ col: 0, row: 0 }, shape, (c) => !wall.has(keyOf(c)))
    expect(region).toHaveLength(8)
    expect(region.every((c) => c.col < 2)).toBe(true)
  })

  it('floodFill returns nothing when start does not match', () => {
    expect(floodFill({ col: 0, row: 0 }, shape, () => false)).toEqual([])
  })

  it('formats CCRR coordinates', () => {
    expect(formatCoord({ col: 0, row: 0 }, 'CCRR', shape)).toBe('0101')
    expect(formatCoord({ col: 4, row: 3 }, 'CCRR', shape)).toBe('0504')
    expect(formatCoord({ col: 0, row: 0 }, 'CCRR', { ...shape, width: 120 })).toBe('001001')
  })
})

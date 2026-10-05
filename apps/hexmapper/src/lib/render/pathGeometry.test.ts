import { describe, expect, it } from 'vitest'
import { pathRuns, placeInHex, snapTargets, type PathVertex } from './pathGeometry'

const v = (x: number, water = false): PathVertex => ({
  center: { x, y: 0 },
  point: { x, y: 0 },
  water,
})

describe('pathRuns', () => {
  it('draws land-only paths as a single run', () => {
    expect(pathRuns([v(0), v(10), v(20)])).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
      ],
    ])
  })

  it('ends at the shore when flowing into water', () => {
    expect(pathRuns([v(0), v(10), v(20, true)])).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 15, y: 0 },
      ],
    ])
  })

  it('splits around a lake crossed by the path', () => {
    const runs = pathRuns([v(0), v(10, true), v(20, true), v(30)])
    expect(runs).toEqual([
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
      [
        { x: 25, y: 0 },
        { x: 30, y: 0 },
      ],
    ])
  })

  it('starts at the shore when leaving water and draws nothing fully in water', () => {
    expect(pathRuns([v(0, true), v(10)])[0][0]).toEqual({ x: 5, y: 0 })
    expect(pathRuns([v(0, true), v(10, true)])).toEqual([])
  })
})

describe('snapping', () => {
  it('has the center, six corners and six edge midpoints', () => {
    expect(snapTargets('flat', 10)).toHaveLength(13)
  })

  it('snaps to the nearest target', () => {
    expect(placeInHex({ x: 1, y: -1 }, 'flat', 10, true)).toEqual({ x: 0, y: 0 })
    const corner = placeInHex({ x: 9, y: 0.5 }, 'flat', 10, true)
    expect(corner.x).toBeCloseTo(9.2)
    expect(corner.y).toBeCloseTo(0)
  })

  it('keeps free placement inside the hex', () => {
    const p = placeInHex({ x: 100, y: 0 }, 'pointy', 10, false)
    expect(Math.hypot(p.x, p.y)).toBeLessThan(10 * 0.87)
    expect(placeInHex({ x: 2, y: 3 }, 'pointy', 10, false)).toEqual({ x: 2, y: 3 })
  })
})

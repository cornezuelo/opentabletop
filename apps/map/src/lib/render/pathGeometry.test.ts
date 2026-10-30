import { describe, expect, it } from 'vitest'
import {
  pathRuns,
  placeInHex,
  routePoints,
  snapTargets,
  type FollowedPath,
  type PathVertex,
} from './pathGeometry'

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

describe('nodes', () => {
  it('skips crossed-only land hexes but keeps endpoints and shore cuts', () => {
    const crossed = (x: number, water = false): PathVertex => ({ ...v(x, water), node: false })
    expect(pathRuns([v(0), crossed(10), crossed(20), v(30)])).toEqual([
      [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
      ],
    ])
    expect(pathRuns([v(0), crossed(10), crossed(20, true)])).toEqual([
      [
        { x: 0, y: 0 },
        { x: 15, y: 0 },
      ],
    ])
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

describe('routePoints', () => {
  // Hexes "0".."9" in a row, centres at x = 10 × n.
  const center = (key: string) => ({ x: Number(key) * 10, y: 0 })
  /** A road drawn through `hexes`, its points shifted down by 3 and with only `nodes` drawn. */
  const road = (hexes: string[], nodes?: number[]): FollowedPath => ({
    hexes,
    point: (i) => ({ x: Number(hexes[i]) * 10, y: 3 }),
    node: (i) => !nodes || i === 0 || i === hexes.length - 1 || nodes.includes(i),
  })

  it("takes the road's drawn points where the route follows it, centres elsewhere", () => {
    expect(routePoints(['0', '1', '2', '3', '4'], center, [road(['1', '2', '3'])])).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 3 },
      { x: 20, y: 3 },
      { x: 30, y: 3 },
      { x: 40, y: 0 },
    ])
  })

  it('skips the hexes the road only crosses, so it runs as straight as the road', () => {
    const points = routePoints(['1', '2', '3', '4', '5'], center, [
      road(['1', '2', '3', '4', '5'], [3]),
    ])
    expect(points.map((p) => p.x)).toEqual([10, 40, 50])
  })

  it('follows a road walked against the way it was drawn', () => {
    const points = routePoints(['5', '4', '3', '2'], center, [road(['1', '2', '3', '4', '5'], [])])
    expect(points).toEqual([
      { x: 50, y: 3 },
      { x: 20, y: 3 },
    ])
  })

  it('keeps a crossed-only hex where the route turns off the road', () => {
    // Leaves the road at 3 (only crossed) for 7: 3 must stay, or the route would cut across.
    const points = routePoints(['1', '2', '3', '7'], center, [road(['1', '2', '3', '4', '5'], [])])
    // 3 lies on the road's line (y 3), not at its centre.
    expect(points).toEqual([
      { x: 10, y: 3 },
      { x: 30, y: 3 },
      { x: 70, y: 0 },
    ])
  })

  it('a route ending on a hex the road only crosses ends on the road, not at its centre', () => {
    // As the example map's road out of Ashford: drawn from 1 to 5, the route stops at 3.
    const points = routePoints(['1', '2', '3'], center, [road(['1', '2', '3', '4', '5'], [])])
    expect(points).toEqual([
      { x: 10, y: 3 },
      { x: 30, y: 3 },
    ])
  })

  it('prefers the first path given (roads before rivers)', () => {
    const river: FollowedPath = { ...road(['1', '2']), point: (i) => ({ x: i * 10 + 10, y: -3 }) }
    expect(routePoints(['1', '2'], center, [road(['1', '2']), river])[0].y).toBe(3)
    expect(routePoints(['1', '2'], center, [river, road(['1', '2'])])[0].y).toBe(-3)
  })

  it('a hex with no path, or a route of one hex, is its centre', () => {
    expect(routePoints(['4'], center, [road(['1', '2'])])).toEqual([{ x: 40, y: 0 }])
  })
})

import { describe, expect, it } from 'vitest'
import { hatchSegments } from './hatch'

describe('hatching', () => {
  it('draws the diagonal lines inside a polygon, the same pattern for its neighbours', () => {
    // A 10 × 10 square from the origin: x + y runs from 0 to 20.
    const square = [0, 0, 10, 0, 10, 10, 0, 10]
    const lines = hatchSegments(square, 5)
    expect(lines.map(([p]) => p.x + p.y)).toEqual([5, 10, 15])
    // Every end is on the square's edge, and both ends are on the same line.
    for (const [p, q] of lines) {
      expect(p.x + p.y).toBeCloseTo(q.x + q.y)
      for (const end of [p, q])
        expect([end.x, end.y].some((v) => Math.abs(v) < 1e-9 || Math.abs(v - 10) < 1e-9)).toBe(true)
    }
    // The square beside it continues the same lines.
    const beside = hatchSegments([10, 0, 20, 0, 20, 10, 10, 10], 5).map(([p]) => p.x + p.y)
    expect(beside).toEqual(expect.arrayContaining([15, 20, 25]))
  })

  it('draws nothing for a polygon too small or a spacing of nothing', () => {
    expect(hatchSegments([0, 0, 1, 0, 0, 1], 5)).toEqual([])
    expect(hatchSegments([0, 0, 10, 0, 10, 10], 0)).toEqual([])
  })
})

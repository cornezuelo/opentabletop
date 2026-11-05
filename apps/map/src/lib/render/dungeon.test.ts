import { describe, expect, it } from 'vitest'
import { hatchStrokes, shadowStrips, stippleDots, type WallSide } from './dungeon'

// A wall along the x axis, the floor above it (y < 0), the rock below.
const side: WallSide = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, out: { x: 0, y: 1 }, seed: 7 }
const floorAbove = (p: { y: number }) => p.y < 0

describe('outside a wall', () => {
  it('hatches the band beyond the wall, never on the floor', () => {
    const strokes = hatchStrokes(side, 40, floorAbove)
    expect(strokes.length).toBeGreaterThan(20)
    for (const [p, q] of strokes)
      for (const end of [p, q]) {
        expect(end.y).toBeGreaterThanOrEqual(0)
        // A stroke may reach a little past the band, never far.
        expect(end.y).toBeLessThan(40 * 1.6)
      }
  })

  it('draws the same side the same way every time, and another side otherwise', () => {
    expect(hatchStrokes(side, 40, floorAbove)).toEqual(hatchStrokes(side, 40, floorAbove))
    expect(hatchStrokes({ ...side, seed: 8 }, 40, floorAbove)).not.toEqual(
      hatchStrokes(side, 40, floorAbove),
    )
  })

  it('leaves out strokes ending on floor (the next room)', () => {
    const all = hatchStrokes(side, 40, () => false)
    const kept = hatchStrokes(side, 40, (p) => p.y > 20)
    expect(kept.length).toBeLessThan(all.length)
    for (const [p, q] of kept) expect(Math.max(p.y, q.y)).toBeLessThanOrEqual(20)
  })

  it('stipples thick by the wall and thin away from it, never on floor', () => {
    const dots = stippleDots(side, 40, 1.5, floorAbove)
    expect(dots.length).toBeGreaterThan(50)
    const near = dots.filter((d) => d.y < 10).length
    const far = dots.filter((d) => d.y > 30).length
    expect(near).toBeGreaterThan(far * 2)
    for (const d of dots) expect(d.y).toBeGreaterThanOrEqual(0)
  })

  it('shades the band in strips, darkest by the wall', () => {
    const strips = shadowStrips(side, 40)
    expect(strips).toHaveLength(4)
    expect(strips[0].alpha).toBeGreaterThan(strips[3].alpha)
    expect(Math.max(...strips[3].points.filter((_, i) => i % 2 === 1))).toBeCloseTo(40)
  })

  it('draws nothing with no band', () => {
    expect(hatchStrokes(side, 0, floorAbove)).toEqual([])
    expect(stippleDots(side, 0, 1, floorAbove)).toEqual([])
    expect(shadowStrips(side, 0)).toEqual([])
  })
})

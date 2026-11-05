import { describe, expect, it } from 'vitest'
import { placeBetween, placeOnCell, symbolShapes, type Shape } from './symbols'

const points = (shapes: Shape[]) =>
  shapes.flatMap((s) =>
    'line' in s
      ? s.line
      : 'circle' in s
        ? [s.circle]
        : [0, 2, 4, 6].map((i) => ({ x: s.poly[i], y: s.poly[i + 1] })),
  )

describe('connection symbols', () => {
  it('sits a door on the side two cells share, facing from one to the other', () => {
    // Two squares side by side: the shared side is the vertical line x = 10.
    const place = placeBetween(
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { a: { x: 10, y: 0 }, b: { x: 10, y: 10 } },
      10,
    )
    expect(place.at).toEqual({ x: 10, y: 5 })
    expect(place.length).toBe(10)
    expect(Math.abs(place.along.y)).toBe(1)
    expect(place.across.x).toBe(1)
    // The leaf and the wall to it span the whole side, and stay thin across it.
    const shapes = symbolShapes('door', place, 10)
    const ys = points(shapes).map((p) => p.y)
    expect(Math.min(...ys)).toBeCloseTo(0)
    expect(Math.max(...ys)).toBeCloseTo(10)
    for (const p of points(shapes)) expect(Math.abs(p.x - 10)).toBeLessThanOrEqual(1.1 + 1e-9)
    expect(shapes.filter((s) => 'poly' in s && s.fill === 'light')).toHaveLength(1)
  })

  it('places one between far places midway, across the line joining them', () => {
    const place = placeBetween({ x: 0, y: 0 }, { x: 0, y: 40 }, undefined, 10)
    expect(place.at).toEqual({ x: 0, y: 20 })
    expect(place.across).toEqual({ x: 0, y: 1 })
    // A ford's stones go across, from one bank to the other.
    const stones = symbolShapes('ford', place, 10)
    expect(stones).toHaveLength(4)
    const ys = points(stones).map((p) => p.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(5)
  })

  it("draws a way's stair, ladder or mouth inside its cell; the diamond and badge are the renderer's", () => {
    const place = placeOnCell({ x: 50, y: 50 }, 10)
    for (const symbol of ['stair', 'ladder', 'mouth', 'bridge', 'arch'] as const) {
      const shapes = symbolShapes(symbol, place, 10)
      expect(shapes.length).toBeGreaterThan(0)
      for (const p of points(shapes)) {
        expect(Math.abs(p.x - 50)).toBeLessThanOrEqual(5)
        expect(Math.abs(p.y - 50)).toBeLessThanOrEqual(5)
      }
    }
    expect(symbolShapes('diamond', place, 10)).toEqual([])
    expect(symbolShapes('badge', place, 10)).toEqual([])
    expect(symbolShapes('none', place, 10)).toEqual([])
  })
})

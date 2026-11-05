import { describe, expect, it } from 'vitest'
import { displace, fractalNoise, noiseAt, raggedPolygon, valueNoise } from './noise'

describe('noise', () => {
  it('is smooth, in range and the same for a point', () => {
    for (let i = 0; i < 200; i++) {
      const x = i * 0.137
      const v = noiseAt(x, 2.5, 1)
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1)
      expect(noiseAt(x, 2.5, 1)).toBe(v)
      expect(Math.abs(noiseAt(x + 0.001, 2.5, 1) - v)).toBeLessThan(0.02)
    }
  })

  it('tiles: the left edge follows on from the right one', () => {
    const size = 64
    const n = valueNoise(size, 4, 7)
    for (let y = 0; y < size; y++)
      expect(Math.abs(n[y * size] - n[y * size + size - 1])).toBeLessThan(0.15)
    const f = fractalNoise(size, 4, 3, 7)
    expect(Math.min(...f)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...f)).toBeLessThanOrEqual(1)
  })

  it('moves a shared side the same way for both cells, so ragged borders leave no gap', () => {
    // Two squares side by side share the side from (10, 0) to (10, 10).
    const left = raggedPolygon([0, 0, 10, 0, 10, 10, 0, 10], 4, 3, 20)
    const right = raggedPolygon([10, 0, 20, 0, 20, 10, 10, 10], 4, 3, 20)
    const point = (poly: number[], i: number) => [poly[i * 2], poly[i * 2 + 1]]
    // The left square's side 2 runs (10, 0) → (10, 10); the right's side 4 runs back.
    expect(point(left, 4)).toEqual(point(right, 0))
    expect(point(left, 8)).toEqual(point(right, 12))
    expect(point(left, 6)).toEqual(displace(10, 5, 3, 20))
    expect(point(right, 14)).toEqual(displace(10, 5, 3, 20))
    expect(raggedPolygon([0, 0, 1, 0, 1, 1], 4, 0, 20)).toEqual([0, 0, 1, 0, 1, 1])
  })
})

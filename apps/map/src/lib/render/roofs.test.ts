import { describe, expect, it } from 'vitest'
import { roofPlan } from './roofs'

describe('roofs', () => {
  it('runs the ridge along the longer side, the lit slope up or left', () => {
    const wide = roofPlan(0, 0, 90, 30, 'plain', 30)
    expect(wide.ridge).toEqual([
      { x: 0, y: 15 },
      { x: 90, y: 15 },
    ])
    expect(wide.slopes[0]).toEqual([0, 0, 90, 0, 90, 15, 0, 15])
    const tall = roofPlan(10, 20, 30, 60, 'plain', 30)
    expect(tall.ridge).toEqual([
      { x: 25, y: 20 },
      { x: 25, y: 80 },
    ])
    expect(tall.slopes[0]).toEqual([10, 20, 10, 80, 25, 80, 25, 20])
    expect(tall.lines).toEqual([])
  })

  it('lays tiles in courses on both slopes, inside the roof, slates bigger and fewer', () => {
    const tiles = roofPlan(0, 0, 120, 60, 'tiles', 30)
    const slate = roofPlan(0, 0, 120, 60, 'slate', 30)
    expect(tiles.lines.length).toBeGreaterThan(slate.lines.length)
    for (const [p, q] of [...tiles.lines, ...slate.lines])
      for (const { x, y } of [p, q]) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(120)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(60)
      }
    // Courses along the ridge (level lines the roof's length) on each side of it.
    const courses = tiles.lines.filter(([p, q]) => p.y === q.y && q.x - p.x === 120)
    expect(courses.some(([p]) => p.y < 30)).toBe(true)
    expect(courses.some(([p]) => p.y > 30)).toBe(true)
  })

  it('draws thatch as straws down each slope, the same for the same seed', () => {
    const a = roofPlan(0, 0, 60, 30, 'thatch', 30, 7)
    expect(a.lines.length).toBeGreaterThan(20)
    expect(roofPlan(0, 0, 60, 30, 'thatch', 30, 7)).toEqual(a)
    expect(roofPlan(0, 0, 60, 30, 'thatch', 30, 8)).not.toEqual(a)
  })
})

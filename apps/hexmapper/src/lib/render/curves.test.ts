import { describe, expect, it } from 'vitest'
import { catmullRom, dashes } from './curves'

describe('catmullRom', () => {
  it('passes through every control point', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
      { x: 30, y: 10 },
    ]
    const curve = catmullRom(points, 4)
    expect(curve).toHaveLength(1 + 3 * 4)
    for (const [i, p] of points.entries()) {
      expect(curve[i * 4].x).toBeCloseTo(p.x)
      expect(curve[i * 4].y).toBeCloseTo(p.y)
    }
  })

  it('leaves two-point lines straight', () => {
    expect(
      catmullRom([
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ]),
    ).toHaveLength(2)
  })
})

describe('dashes', () => {
  it('cuts a straight line into dashes and gaps', () => {
    const segments = dashes(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      2,
      2,
    )
    expect(segments.map((s) => [s[0].x, s.at(-1)!.x])).toEqual([
      [0, 2],
      [4, 6],
      [8, 10],
    ])
  })

  it('continues dashes across polyline corners', () => {
    const segments = dashes(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 3 },
      ],
      2,
      1,
    )
    expect(segments[0]).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ])
    expect(segments[1][0]).toEqual({ x: 1, y: 2 })
  })
})

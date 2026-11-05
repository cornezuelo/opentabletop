import { PAINTERS } from '@open-tabletop/map'
import { describe, expect, it } from 'vitest'
import { mix, paint, seedOf, shade, type PaintInput } from './painters'

const input = (over: Partial<PaintInput> = {}): PaintInput => ({
  x: 100,
  y: 50,
  r: 40,
  seed: seedOf('3,7'),
  mode: 'ink',
  ink: 0x2b2118,
  base: 0x4f7a3a,
  density: 1,
  size: 1,
  ...over,
})

describe('painters', () => {
  it.each(PAINTERS)('%s draws the same on a cell every time, unlike the next cell', (painter) => {
    const once = paint(painter, input())
    expect(once.length).toBeGreaterThan(0)
    expect(paint(painter, input())).toEqual(once)
    expect(paint(painter, input({ seed: seedOf('4,7') }))).not.toEqual(once)
    for (const shape of once) {
      expect(shape.points.every(Number.isFinite)).toBe(true)
      expect(shape.points.length % 2).toBe(0)
    }
  })

  it.each(PAINTERS)('%s draws nothing at density 0, more at a higher one', (painter) => {
    expect(paint(painter, input({ density: 0 }))).toEqual([])
    if (painter !== 'volcano')
      expect(paint(painter, input({ density: 2 })).length).toBeGreaterThan(
        paint(painter, input({ density: 0.5 })).length,
      )
  })

  it('draws near its cell: what overlaps the next cell is a big mountain or a tall tree', () => {
    for (const painter of ['grass', 'reeds', 'rocks', 'dots', 'waves'] as const)
      for (const shape of paint(painter, input()))
        for (let i = 0; i < shape.points.length; i += 2)
          expect(Math.hypot(shape.points[i] - 100, shape.points[i + 1] - 50)).toBeLessThan(40)
  })

  it('in ink, bodies take the ground’s colour and ink edges; painted, a lit and a shaded side', () => {
    const ink = paint('mountains', input({ density: 1, base: 0xc8b89a }))
    expect(
      ink.filter((s) => s.closed).every((s) => s.fill === 0xc8b89a && s.stroke === 0x2b2118),
    ).toBe(true)
    const painted = paint('mountains', input({ density: 1, mode: 'painted', base: 0x7d7468 }))
    const fills = new Set(
      painted.filter((s) => s.fill !== undefined && s.fill !== 0).map((s) => s.fill),
    )
    expect(fills.size).toBeGreaterThanOrEqual(3)
  })

  it('mixes and shades colours', () => {
    expect(mix(0x000000, 0xffffff, 0.5)).toBe(0x808080)
    expect(shade(0x808080, 1)).toBe(0xffffff)
    expect(shade(0x808080, -1)).toBe(0x000000)
    expect(seedOf('3,7')).not.toBe(seedOf('7,3'))
  })
})

import { describe, expect, it } from 'vitest'
import { cornerToCorner, fitGrid, mapSizeMm, paperSize, smallestPaper } from './paper'

describe('paper', () => {
  it('orients paper sizes', () => {
    expect(paperSize('A4', false, { width: 0, height: 0 })).toEqual({ width: 210, height: 297 })
    expect(paperSize('A4', true, { width: 0, height: 0 })).toEqual({ width: 297, height: 210 })
    expect(paperSize('custom', false, { width: 500, height: 300 })).toEqual({
      width: 300,
      height: 500,
    })
  })

  it('computes printed map size', () => {
    // Single flat hex: corner-to-corner wide, flat-to-flat tall.
    const one = mapSizeMm(1, 1, 'flat', 25)
    expect(one.width).toBeCloseTo(cornerToCorner(25))
    expect(one.height).toBeCloseTo(25)
    // Pointy is the transpose.
    const p = mapSizeMm(3, 2, 'pointy', 25)
    const f = mapSizeMm(2, 3, 'flat', 25)
    expect(p.width).toBeCloseTo(f.height)
    expect(p.height).toBeCloseTo(f.width)
  })

  it('fits 25 mm hexes on A4 with 10 mm margins', () => {
    const area = { width: 190, height: 277 }
    expect(fitGrid(area, 'flat', 25)).toEqual({ width: 8, height: 10 })
    const fit = fitGrid(area, 'pointy', 25)
    const size = mapSizeMm(fit.width, fit.height, 'pointy', 25)
    expect(size.width).toBeLessThanOrEqual(190)
    expect(size.height).toBeLessThanOrEqual(277)
    expect(mapSizeMm(fit.width + 1, fit.height, 'pointy', 25).width).toBeGreaterThan(190)
    expect(mapSizeMm(fit.width, fit.height + 1, 'pointy', 25).height).toBeGreaterThan(277)
  })

  it('never returns less than 1 × 1', () => {
    expect(fitGrid({ width: 5, height: 5 }, 'flat', 25)).toEqual({ width: 1, height: 1 })
  })
})

describe('smallestPaper', () => {
  it('finds the smallest ISO paper and orientation', () => {
    expect(smallestPaper({ width: 190, height: 277 }, 10)).toEqual({
      paper: 'A4',
      landscape: false,
    })
    expect(smallestPaper({ width: 277, height: 190 }, 10)).toEqual({ paper: 'A4', landscape: true })
    expect(smallestPaper({ width: 2000, height: 2000 }, 10)).toBeNull()
  })
})

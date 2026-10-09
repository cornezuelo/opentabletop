import { describe, expect, it } from 'vitest'
import { DEFAULT_PRINT } from '../model/defaults'
import { pdfLayout, tiles } from './export'

describe('pdfLayout', () => {
  it('sizes the page to the content plus margins in hex-count mode', () => {
    const layout = pdfLayout({ width: 300, height: 200 }, DEFAULT_PRINT)
    expect(layout.page).toEqual({ width: 320, height: 220 })
    expect([layout.x, layout.y]).toEqual([10, 10])
    expect(layout.overflows).toBe(false)
  })

  it('centers on the chosen paper and reports overflow', () => {
    const print = { ...DEFAULT_PRINT, paper: 'A4' as const }
    const fits = pdfLayout({ width: 180, height: 250 }, print)
    expect(fits.page).toEqual({ width: 210, height: 297 })
    expect(fits.x).toBeCloseTo(15)
    expect(fits.overflows).toBe(false)
    expect(pdfLayout({ width: 200, height: 250 }, print).overflows).toBe(true)
    // Blank padding around the content may use the margins.
    expect(pdfLayout({ width: 193, height: 250 }, print, 2).overflows).toBe(false)
  })
})

describe('tiled PDF pages', () => {
  const a4 = { width: 210, height: 297 }

  it('a map that fits takes one page', () => {
    expect(tiles({ width: 150, height: 200 }, a4, 10)).toEqual([
      { column: 0, row: 0, x: 0, y: 0, width: 150, height: 200 },
    ])
  })

  it('a bigger one is split left to right, top to bottom, neighbours overlapping', () => {
    // Printable: 190 × 277 mm; each step moves on 180 × 267 (10 mm overlap).
    const pages = tiles({ width: 400, height: 300 }, a4, 10)
    expect(pages.map((p) => `${p.row}${p.column}`)).toEqual(['00', '01', '02', '10', '11', '12'])
    expect(pages[1]).toMatchObject({ x: 180, width: 190 })
    expect(pages[2]).toMatchObject({ x: 360, width: 40 })
    expect(pages[3]).toMatchObject({ y: 267, height: 33 })
    // Every part of the map is on some page.
    for (let x = 0; x < 400; x += 7)
      for (let y = 0; y < 300; y += 7)
        expect(
          pages.some((p) => x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height),
        ).toBe(true)
  })
})

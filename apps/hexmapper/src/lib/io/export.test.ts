import { describe, expect, it } from 'vitest'
import { DEFAULT_PRINT } from '../model/defaults'
import { pdfLayout } from './export'

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

import type { Orientation } from '../hex/offset'

export const PAPERS = {
  A5: { width: 148, height: 210 },
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  tabloid: { width: 279.4, height: 431.8 },
} as const

export type PaperId = keyof typeof PAPERS | 'custom'

export interface Size {
  width: number
  height: number
}

/** Common hex sizes (flat-to-flat, mm): 25 mm and 1" for minis bases. */
export const HEX_PRESETS_MM = [19.05, 25, 25.4, 30, 38.1] as const

const SQRT3 = Math.sqrt(3)

/** Paper size in mm, oriented. `custom` uses the given size. */
export function paperSize(paper: PaperId, landscape: boolean, custom: Size): Size {
  const base = paper === 'custom' ? custom : PAPERS[paper]
  const [short, long] = [Math.min(base.width, base.height), Math.max(base.width, base.height)]
  return landscape ? { width: long, height: short } : { width: short, height: long }
}

/**
 * Printed size in mm of a cols × rows map whose hexes measure `hexMm` flat-to-flat.
 * Accounts for the half-hex stagger of odd columns (flat) or rows (pointy).
 */
export function mapSizeMm(
  cols: number,
  rows: number,
  orientation: Orientation,
  hexMm: number,
): Size {
  const r = hexMm / SQRT3 // center-to-corner
  if (orientation === 'flat') {
    return { width: r * (1.5 * cols + 0.5), height: hexMm * (rows + (cols > 1 ? 0.5 : 0)) }
  }
  return { width: hexMm * (cols + (rows > 1 ? 0.5 : 0)), height: r * (1.5 * rows + 0.5) }
}

/** Largest cols × rows that fits in `area` (mm). Always at least 1 × 1. */
export function fitGrid(area: Size, orientation: Orientation, hexMm: number): Size {
  let cols = 1
  let rows = 1
  // Grow greedily; sizes are small (≤ a few hundred) so this stays cheap and exact.
  const fits = (c: number, r: number) => {
    const size = mapSizeMm(c, r, orientation, hexMm)
    return size.width <= area.width + 1e-9 && size.height <= area.height + 1e-9
  }
  while (fits(cols + 1, rows)) cols++
  while (fits(cols, rows + 1)) rows++
  // Growing rows can't break the width, but the stagger may now allow one more column check.
  while (fits(cols + 1, rows)) cols++
  return { width: cols, height: rows }
}

/** Hex corner-to-corner size for a given flat-to-flat size. */
export function cornerToCorner(hexMm: number): number {
  return (hexMm * 2) / SQRT3
}

const ISO_SERIES = ['A5', 'A4', 'A3', 'A2', 'A1'] as const

/** Smallest ISO paper (either orientation) that holds `size` mm plus margins, or null. */
export function smallestPaper(
  size: Size,
  marginMm: number,
): { paper: (typeof ISO_SERIES)[number]; landscape: boolean } | null {
  for (const paper of ISO_SERIES) {
    for (const landscape of [false, true]) {
      const p = paperSize(paper, landscape, { width: 0, height: 0 })
      if (size.width + 2 * marginMm <= p.width && size.height + 2 * marginMm <= p.height)
        return { paper, landscape }
    }
  }
  return null
}

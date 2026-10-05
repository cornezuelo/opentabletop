import type { Axial } from './axial'

export type Orientation = 'flat' | 'pointy'

/**
 * Offset coordinates of a rectangular map. Flat-top maps use "odd-q" (odd columns
 * shifted down), pointy-top maps use "odd-r" (odd rows shifted right). Map data is
 * keyed by offset coordinates so it survives an orientation change.
 */
export interface Offset {
  col: number
  row: number
}

export function toAxial({ col, row }: Offset, orientation: Orientation): Axial {
  if (orientation === 'flat') return { q: col, r: row - (col - (col & 1)) / 2 }
  return { q: col - (row - (row & 1)) / 2, r: row }
}

export function toOffset({ q, r }: Axial, orientation: Orientation): Offset {
  if (orientation === 'flat') return { col: q, row: r + (q - (q & 1)) / 2 }
  return { col: q + (r - (r & 1)) / 2, row: r }
}

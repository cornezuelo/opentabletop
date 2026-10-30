import {
  distance as hexDistance,
  line as hexLine,
  neighbors as hexNeighbors,
  spiral,
} from './axial'
import { cornerOffsets, hexToPixel, pixelToHex, spacing, type Point } from './layout'
import { toAxial, toOffset, type Offset, type Orientation } from './offset'

/** The shape of a map's cells: hexes, or squares. */
export type GridKind = 'hex' | 'square'

/**
 * How a grid's cells lie, whatever its size: hexes with an orientation, or squares with 4
 * neighbours (or 8, with `diagonals`). A square measures a hex's flat-to-flat width across,
 * so the same `size` (a hex's centre-to-corner radius) draws and prints both alike.
 */
export interface CellLayout {
  /** Absent: hexes. */
  kind?: GridKind
  /** Hexes only: flat or pointy tops. */
  orientation: Orientation
  /** Squares only: the four corners' squares are neighbours too (8 in all). */
  diagonals?: boolean
}

const SQRT3 = Math.sqrt(3)

const SIDES: readonly Offset[] = [
  { col: 1, row: 0 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
  { col: 0, row: -1 },
]
const CORNERS: readonly Offset[] = [
  { col: 1, row: 1 },
  { col: -1, row: 1 },
  { col: -1, row: -1 },
  { col: 1, row: -1 },
]

const isSquare = (layout: CellLayout) => layout.kind === 'square'

/** A square's side, for a hex `size` (its flat-to-flat width). */
export function squareSide(size: number): number {
  return size * SQRT3
}

/** Pixel position of a cell's centre. */
export function cellCenter(cell: Offset, layout: CellLayout, size: number): Point {
  if (!isSquare(layout))
    return hexToPixel(toAxial(cell, layout.orientation), layout.orientation, size)
  const side = squareSide(size)
  return { x: cell.col * side, y: cell.row * side }
}

/** The cell under a pixel position. */
export function cellAt(point: Point, layout: CellLayout, size: number): Offset {
  if (!isSquare(layout))
    return toOffset(pixelToHex(point, layout.orientation, size), layout.orientation)
  const side = squareSide(size)
  // `+ 0` so -0 never reaches keys.
  return { col: Math.round(point.x / side) + 0, row: Math.round(point.y / side) + 0 }
}

/** Corner offsets from a cell's centre, as [x0, y0, x1, y1, …], each side between two in a row. */
export function cellCorners(layout: CellLayout, size: number): number[] {
  if (!isSquare(layout)) return cornerOffsets(layout.orientation, size)
  const h = squareSide(size) / 2
  return [h, -h, h, h, -h, h, -h, -h]
}

/** Horizontal and vertical distance between neighbouring cells' centres. */
export function cellSpacing(layout: CellLayout, size: number): { x: number; y: number } {
  if (!isSquare(layout)) return spacing(layout.orientation, size)
  const side = squareSide(size)
  return { x: side, y: side }
}

/** The cells next to `cell` (unbounded: callers keep those on the map). */
export function cellNeighbors(cell: Offset, layout: CellLayout): Offset[] {
  if (!isSquare(layout))
    return hexNeighbors(toAxial(cell, layout.orientation)).map((h) =>
      toOffset(h, layout.orientation),
    )
  const steps = layout.diagonals ? [...SIDES, ...CORNERS] : SIDES
  return steps.map((d) => ({ col: cell.col + d.col, row: cell.row + d.row }))
}

/** Steps between two cells, going from neighbour to neighbour. */
export function cellDistance(a: Offset, b: Offset, layout: CellLayout): number {
  if (!isSquare(layout))
    return hexDistance(toAxial(a, layout.orientation), toAxial(b, layout.orientation))
  const dc = Math.abs(a.col - b.col)
  const dr = Math.abs(a.row - b.row)
  return layout.diagonals ? Math.max(dc, dr) : dc + dr
}

/** Cells within `radius` steps of `center` (unbounded), center included. */
export function cellsAround(center: Offset, radius: number, layout: CellLayout): Offset[] {
  if (!isSquare(layout))
    return spiral(toAxial(center, layout.orientation), radius).map((h) =>
      toOffset(h, layout.orientation),
    )
  const result: Offset[] = []
  for (let dr = -radius; dr <= radius; dr++)
    for (let dc = -radius; dc <= radius; dc++) {
      const cell = { col: center.col + dc, row: center.row + dr }
      if (cellDistance(center, cell, layout) <= radius) result.push(cell)
    }
  return result
}

/**
 * Cells on the straight line between two cells, both included (may leave the map; callers
 * filter), each the neighbour of the one before (with four neighbours, the line steps along a side wherever it would cut a corner).
 */
export function cellLine(a: Offset, b: Offset, layout: CellLayout): Offset[] {
  if (!isSquare(layout))
    return hexLine(toAxial(a, layout.orientation), toAxial(b, layout.orientation)).map((h) =>
      toOffset(h, layout.orientation),
    )
  const dc = b.col - a.col
  const dr = b.row - a.row
  const result: Offset[] = [{ ...a }]
  if (layout.diagonals) {
    const n = Math.max(Math.abs(dc), Math.abs(dr))
    for (let i = 1; i <= n; i++)
      result.push({
        col: Math.round(a.col + (dc * i) / n + 1e-6) + 0,
        row: Math.round(a.row + (dr * i) / n + 2e-6) + 0,
      })
    return result
  }
  // Walk the line one side at a time, taking whichever crossing comes first.
  const sc = Math.sign(dc)
  const sr = Math.sign(dr)
  const nc = Math.abs(dc)
  const nr = Math.abs(dr)
  let col = a.col
  let row = a.row
  for (let ic = 0, ir = 0; ic < nc || ir < nr;) {
    // Compare (ic + 0.5) / nc with (ir + 0.5) / nr without dividing; ties go across first.
    if ((1 + 2 * ic) * nr <= (1 + 2 * ir) * nc) {
      col += sc
      ic++
    } else {
      row += sr
      ir++
    }
    result.push({ col, row })
  }
  return result
}

/** One side of a cell: its two ends (in pixels) and the cell across it. */
export interface CellSide {
  a: Point
  b: Point
  across: Offset
}

/** A cell's sides, in the order of its corners (`cellCorners`). */
export function cellSides(cell: Offset, layout: CellLayout, size: number): CellSide[] {
  const c = cellCenter(cell, layout, size)
  const corners = cellCorners(layout, size)
  const n = corners.length / 2
  const sides: CellSide[] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const a = { x: c.x + corners[i * 2], y: c.y + corners[i * 2 + 1] }
    const b = { x: c.x + corners[j * 2], y: c.y + corners[j * 2 + 1] }
    // The centre mirrored over the side's middle is the centre of the cell across.
    const across = cellAt({ x: a.x + b.x - c.x, y: a.y + b.y - c.y }, layout, size)
    sides.push({ a, b, across })
  }
  return sides
}

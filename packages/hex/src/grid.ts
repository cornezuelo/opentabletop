import { cellNeighbors, cellsAround, type CellLayout } from './cells'
import { toAxial, type Offset } from './offset'

/** Bounds and cells of a rectangular map (hexes or squares). */
export interface GridShape extends CellLayout {
  width: number
  height: number
}

export type HexKey = `${number},${number}`

export function keyOf({ col, row }: Offset): HexKey {
  return `${col},${row}`
}

export function parseKey(key: HexKey): Offset {
  const [col, row] = key.split(',').map(Number)
  return { col, row }
}

export function inBounds({ col, row }: Offset, shape: GridShape): boolean {
  return col >= 0 && row >= 0 && col < shape.width && row < shape.height
}

/** The cells of the rectangle of columns and rows between two cells (both corners included). */
export function cellsInRect(a: Offset, b: Offset, shape: GridShape): Offset[] {
  const cells: Offset[] = []
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row++)
    for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col++)
      if (inBounds({ col, row }, shape)) cells.push({ col, row })
  return cells
}

export function* allCells(shape: GridShape): Generator<Offset> {
  for (let row = 0; row < shape.height; row++)
    for (let col = 0; col < shape.width; col++) yield { col, row }
}

export function neighborCells(cell: Offset, shape: GridShape): Offset[] {
  return cellNeighbors(cell, shape).filter((c) => inBounds(c, shape))
}

/** Cells within `radius` steps of `center` that lie inside the map. */
export function cellsInRadius(center: Offset, radius: number, shape: GridShape): Offset[] {
  return cellsAround(center, radius, shape).filter((c) => inBounds(c, shape))
}

/** Contiguous region around `start` whose cells satisfy `matches` (start included if it does). */
export function floodFill(
  start: Offset,
  shape: GridShape,
  matches: (cell: Offset) => boolean,
): Offset[] {
  if (!inBounds(start, shape) || !matches(start)) return []
  const seen = new Set<HexKey>([keyOf(start)])
  const result: Offset[] = []
  const queue: Offset[] = [start]
  while (queue.length > 0) {
    const cell = queue.pop()!
    result.push(cell)
    for (const next of neighborCells(cell, shape)) {
      const key = keyOf(next)
      if (seen.has(key)) continue
      seen.add(key)
      if (matches(next)) queue.push(next)
    }
  }
  return result
}

export type CoordFormat = 'CCRR' | 'axial'

/** Human-facing label: CCRR is 1-based and zero-padded (0101, 0102, ...). */
export function formatCoord(cell: Offset, format: CoordFormat, shape: GridShape): string {
  // Squares have no axial coordinates: their column and row.
  if (format === 'axial' && shape.kind === 'square') return `${cell.col},${cell.row}`
  if (format === 'axial') {
    const { q, r } = toAxial(cell, shape.orientation)
    return `${q},${r}`
  }
  const digits = Math.max(2, String(Math.max(shape.width, shape.height)).length)
  const pad = (n: number) => String(n + 1).padStart(digits, '0')
  return pad(cell.col) + pad(cell.row)
}

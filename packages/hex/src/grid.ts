import { line, neighbors, spiral } from './axial'
import { toAxial, toOffset, type Offset, type Orientation } from './offset'

/** Bounds and orientation of a rectangular hex map. */
export interface GridShape {
  orientation: Orientation
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

export function* allCells(shape: GridShape): Generator<Offset> {
  for (let row = 0; row < shape.height; row++)
    for (let col = 0; col < shape.width; col++) yield { col, row }
}

export function neighborCells(cell: Offset, shape: GridShape): Offset[] {
  return neighbors(toAxial(cell, shape.orientation))
    .map((h) => toOffset(h, shape.orientation))
    .filter((c) => inBounds(c, shape))
}

/** Cells within `radius` steps of `center` that lie inside the map. */
export function cellsInRadius(center: Offset, radius: number, shape: GridShape): Offset[] {
  return spiral(toAxial(center, shape.orientation), radius)
    .map((h) => toOffset(h, shape.orientation))
    .filter((c) => inBounds(c, shape))
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
  if (format === 'axial') {
    const { q, r } = toAxial(cell, shape.orientation)
    return `${q},${r}`
  }
  const digits = Math.max(2, String(Math.max(shape.width, shape.height)).length)
  const pad = (n: number) => String(n + 1).padStart(digits, '0')
  return pad(cell.col) + pad(cell.row)
}

/** Cells on the straight line between two cells (may leave the map; callers filter). */
export function cellLine(a: Offset, b: Offset, orientation: Orientation): Offset[] {
  return line(toAxial(a, orientation), toAxial(b, orientation)).map((h) => toOffset(h, orientation))
}

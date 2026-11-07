import type { CellLayout } from './cells'
import type { Offset } from './offset'
import { toAxial, toOffset } from './offset'

/**
 * A piece's cells, whatever the grid: x and y on squares, axial q and r on hexes. Turning,
 * mirroring and adding are the same there, so a piece is laid the same way on either.
 */
export interface PieceCell {
  x: number
  y: number
}

/** A cell of a drawing with the mark on it. */
export interface DrawnCell extends PieceCell {
  mark: string
}

const isHexes = (layout: Pick<CellLayout, 'kind'>) => layout.kind !== 'square'

/** A cell of the map as a piece's. */
export function pieceCellOf(cell: Offset, layout: CellLayout): PieceCell {
  if (!isHexes(layout)) return { x: cell.col, y: cell.row }
  const { q, r } = toAxial(cell, layout.orientation)
  return { x: q, y: r }
}

/** A piece's cell as a cell of the map. */
export function offsetOfPieceCell({ x, y }: PieceCell, layout: CellLayout): Offset {
  if (!isHexes(layout)) return { col: x, row: y }
  return toOffset({ q: x, r: y }, layout.orientation)
}

/** How many ways a piece can be turned: a quarter at a time on squares, a sixth on hexes. */
export const turnsOf = (layout: Pick<CellLayout, 'kind'>): number => (isHexes(layout) ? 6 : 4)

/** The steps to the cells sharing a side with one. */
export function sidesOf(layout: Pick<CellLayout, 'kind'>): PieceCell[] {
  return isHexes(layout)
    ? [
        { x: 1, y: 0 },
        { x: 1, y: -1 },
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: -1, y: 1 },
        { x: 0, y: 1 },
      ]
    : [
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
      ]
}

/** A cell of a piece turned `turn` steps, mirrored first if asked. */
export function turnCell(
  cell: PieceCell,
  turn: number,
  mirror: boolean,
  layout: Pick<CellLayout, 'kind'>,
): PieceCell {
  const hexes = isHexes(layout)
  let { x, y } = cell
  if (mirror) [x, y] = hexes ? [y, x] : [-x, y]
  for (let i = 0; i < turn; i++) [x, y] = hexes ? [-y, x + y] : [-y, x]
  return { x: x + 0, y: y + 0 }
}

/**
 * Reads a piece drawn in text, a mark a cell and spaces for nothing: squares as they are;
 * hexes with each row half a cell from the next, so marks stand two characters apart.
 */
export function readDrawing(
  text: string,
  layout: Pick<CellLayout, 'kind'>,
): { cells: DrawnCell[]; errors: string[] } {
  const cells: DrawnCell[] = []
  const errors: string[] = []
  const hexes = isHexes(layout)
  let parity: number | undefined
  text.split('\n').forEach((line, row) => {
    ;[...line].forEach((mark, column) => {
      if (mark === ' ' || mark === '\t') return
      if (!hexes) return void cells.push({ x: column, y: row, mark })
      parity ??= (column + row) & 1
      if (((column + row) & 1) !== parity)
        return void errors.push(`row ${row + 1}: on hexes, marks stand two characters apart`)
      cells.push({ x: (column - row - parity) / 2, y: row, mark })
    })
  })
  return { cells, errors }
}

import { describe, expect, it } from 'vitest'
import {
  offsetOfPieceCell,
  pieceCellOf,
  readDrawing,
  sidesOf,
  turnCell,
  turnsOf,
  type PieceCell,
} from './pieces'

const square = { kind: 'square', orientation: 'flat' } as const
const hexes = { kind: undefined, orientation: 'flat' } as const
const pointy = { kind: undefined, orientation: 'pointy' } as const

describe('pieces', () => {
  it('reads a drawing on squares as it stands', () => {
    const { cells, errors } = readDrawing(' A\n..\n', square)
    expect(errors).toEqual([])
    expect(cells).toEqual([
      { x: 1, y: 0, mark: 'A' },
      { x: 0, y: 1, mark: '.' },
      { x: 1, y: 1, mark: '.' },
    ])
  })

  it('reads hexes with rows half a cell apart, as neighbours', () => {
    const { cells, errors } = readDrawing(' . .\n. . .', hexes)
    expect(errors).toEqual([])
    const [a, , , b] = cells
    // Each row half a cell along: the first of the row above touches the first two below.
    expect(sidesOf(hexes)).toContainEqual({ x: b.x - a.x, y: b.y - a.y })
    expect(readDrawing('..', hexes).errors).toHaveLength(1)
  })

  it('turns round to where it started, keeping cells side by side', () => {
    for (const layout of [square, hexes]) {
      const cell: PieceCell = { x: 2, y: 1 }
      let turned = cell
      for (let i = 0; i < turnsOf(layout); i++) {
        turned = turnCell(turned, 1, false, layout)
        if (i < turnsOf(layout) - 1) expect(turned).not.toEqual(cell)
      }
      expect(turned).toEqual(cell)
      const sides = sidesOf(layout)
      for (const side of sides) {
        expect(sides).toContainEqual(turnCell(side, 1, false, layout))
        expect(sides).toContainEqual(turnCell(side, 0, true, layout))
      }
    }
  })

  it('goes between a map’s cells and a piece’s on every grid', () => {
    for (const layout of [square, hexes, pointy])
      for (const cell of [
        { col: 3, row: 4 },
        { col: 4, row: 3 },
      ])
        expect(offsetOfPieceCell(pieceCellOf(cell, layout), layout)).toEqual(cell)
  })
})

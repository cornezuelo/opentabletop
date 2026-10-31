import { describe, expect, it } from 'vitest'
import {
  cellAt,
  cellCenter,
  cellCorners,
  cellDistance,
  cellLine,
  cellNeighbors,
  cellSides,
  cellsAround,
  type CellLayout,
} from './cells'
import {
  cellsInRadius,
  cellsInRect,
  floodFill,
  formatCoord,
  neighborCells,
  type GridShape,
} from './grid'

const square: CellLayout = { kind: 'square', orientation: 'flat' }
const kings: CellLayout = { ...square, diagonals: true }
const layouts: CellLayout[] = [{ orientation: 'flat' }, { orientation: 'pointy' }, square, kings]

describe('cells', () => {
  it('a cell centre maps back to its cell, on every layout', () => {
    for (const layout of layouts)
      for (const cell of [
        { col: 0, row: 0 },
        { col: 3, row: 5 },
        { col: 6, row: 1 },
      ])
        expect(cellAt(cellCenter(cell, layout, 20), layout, 20)).toEqual(cell)
  })

  it('squares have four or eight neighbours, each one step away', () => {
    const at = { col: 4, row: 4 }
    expect(cellNeighbors(at, square)).toHaveLength(4)
    expect(cellNeighbors(at, kings)).toHaveLength(8)
    for (const layout of layouts)
      for (const n of cellNeighbors(at, layout)) expect(cellDistance(at, n, layout)).toBe(1)
  })

  it('square distance: sides only, or diagonals too', () => {
    const a = { col: 0, row: 0 }
    const b = { col: 3, row: 2 }
    expect(cellDistance(a, b, square)).toBe(5)
    expect(cellDistance(a, b, kings)).toBe(3)
  })

  it('lines step from neighbour to neighbour and end where asked', () => {
    for (const layout of layouts) {
      const a = { col: 1, row: 1 }
      const b = { col: 7, row: 4 }
      const cells = cellLine(a, b, layout)
      expect(cells[0]).toEqual(a)
      expect(cells.at(-1)).toEqual(b)
      expect(cells).toHaveLength(cellDistance(a, b, layout) + 1)
      for (let i = 1; i < cells.length; i++)
        expect(cellDistance(cells[i - 1], cells[i], layout)).toBe(1)
    }
  })

  it('a square has four sides, each across from a neighbour', () => {
    expect(cellCorners(square, 10)).toHaveLength(8)
    const at = { col: 2, row: 3 }
    const across = cellSides(at, square, 10).map((s) => s.across)
    expect(across).toEqual(expect.arrayContaining(cellNeighbors(at, square)))
    expect(across).toHaveLength(4)
  })

  it("hexes' sides are across from their six neighbours", () => {
    const at = { col: 3, row: 3 }
    for (const layout of layouts.slice(0, 2)) {
      const across = cellSides(at, layout, 10).map((s) => s.across)
      expect(across).toEqual(expect.arrayContaining(cellNeighbors(at, layout)))
    }
  })

  it('around a square: a diamond, or a square with diagonals', () => {
    expect(cellsAround({ col: 0, row: 0 }, 2, square)).toHaveLength(13)
    expect(cellsAround({ col: 0, row: 0 }, 2, kings)).toHaveLength(25)
  })

  it('grid helpers follow the kind of cell', () => {
    const shape: GridShape = { ...square, width: 5, height: 5 }
    expect(neighborCells({ col: 0, row: 0 }, shape)).toHaveLength(2)
    expect(cellsInRadius({ col: 0, row: 0 }, 1, shape)).toHaveLength(3)
    expect(floodFill({ col: 0, row: 0 }, shape, () => true)).toHaveLength(25)
    expect(formatCoord({ col: 2, row: 4 }, 'axial', shape)).toBe('2,4')
    expect(formatCoord({ col: 2, row: 4 }, 'CCRR', shape)).toBe('0305')
    expect(cellsInRect({ col: 3, row: 1 }, { col: 1, row: 2 }, shape)).toHaveLength(6)
    expect(cellsInRect({ col: 3, row: 3 }, { col: 9, row: 9 }, shape)).toHaveLength(4)
  })
})

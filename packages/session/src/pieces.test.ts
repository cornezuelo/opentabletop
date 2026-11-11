import { describe, expect, it } from 'vitest'
import { seeded } from '@open-tabletop/random'
import { layPiece, lookupPieces, parsePieces, type Piece } from './pieces'

const catalogue = (pieces: unknown, extra: Record<string, unknown> = {}) => ({
  kind: 'pieces',
  id: 'test',
  marks: { '.': 'floor' },
  pieces,
  ...extra,
})

const parsed = (raw: unknown) => parsePieces(raw, 'pack')

const passage = {
  name: 'Passage',
  cells: 'A\n.\n.\nB\n',
  exits: { A: { kind: 'door', entry: true }, B: { kind: 'door' } },
}

const layout = { kind: 'square', orientation: 'flat' } as const

/** A ground of `size` squares, every cell free but those listed. */
const ground = (size: number, taken: string[] = [], floor: string[] = []) => ({
  layout,
  free: (cell: string) => {
    const [x, y] = cell.split(',').map(Number)
    return x >= 0 && y >= 0 && x < size && y < size && !taken.includes(cell)
  },
  floor: (cell: string) => floor.includes(cell),
})

describe('parsePieces', () => {
  it('reads a piece: its terrains, and each exit with the cell it stands by', () => {
    const { pieces, errors } = parsed(catalogue({ passage }))
    expect(errors).toEqual([])
    const piece = pieces!.pieces.passage
    expect(piece.cells).toHaveLength(2)
    expect(piece.cells[0].terrain).toBe('floor')
    expect(piece.exits[1]).toMatchObject({ letter: 'B', at: { x: 0, y: 3 }, floor: { x: 0, y: 2 } })
    expect(pieces!.grid).toBe('square')
  })

  it('says what’s wrong with a drawing', () => {
    const errors = (cells: string, exits: unknown = {}) =>
      parsed(catalogue({ p: { name: 'P', cells, exits } })).errors.join('\n')
    expect(errors('#')).toMatch(/no terrain for «#»/)
    expect(errors('A\n.')).toMatch(/drawn but not declared/)
    expect(errors('.', { A: { kind: 'door' } })).toMatch(/must be drawn once/)
    // Between two cells of the piece, a letter says nothing of its direction.
    expect(errors('.A\n ..', { A: { kind: 'door' } })).toMatch(/beside one cell/)
    expect(errors('A\n.', { A: {} })).toMatch(/its kind of connection/)
    expect(parsed(catalogue({}, { grid: 'triangle' })).errors.join()).toMatch(/square or hex/)
    expect(parsed(catalogue({}, { marks: { A: 'floor' } })).errors.join()).toMatch(/upper-case/)
  })

  it('finds a piece for the map’s grid: two catalogues may share ids', () => {
    const squares = parsed(catalogue({ passage })).pieces!
    const hexes = parsed(
      catalogue({ passage: { name: 'Hex', cells: '.' } }, { id: 'hex', grid: 'hex' }),
    ).pieces!
    const find = lookupPieces([{ def: squares }, { def: hexes }])
    expect(find('passage', { kind: 'square' })?.name).toBe('Passage')
    expect(find('passage', {})?.name).toBe('Hex')
    expect(find('nothing', {})).toBeUndefined()
  })
})

describe('layPiece', () => {
  const piece = parsed(catalogue({ passage })).pieces!.pieces.passage as Piece

  it('turns a piece so its way in meets the door crossed, the other exit waiting', () => {
    // Going east from 4,5 into 5,5: the passage runs on east.
    const laid = layPiece('passage', piece, ground(12), '5,5', '4,5', seeded(1))!
    expect(Object.keys(laid.cells).sort()).toEqual(['5,5', '6,5'])
    expect(laid.connections).toEqual([{ between: ['6,5', '7,5'], kind: 'door' }])
  })

  it('is the same on any seed: the way in always meets where the party came from', () => {
    for (let seed = 0; seed < 20; seed++) {
      const laid = layPiece('passage', piece, ground(12), '5,5', '5,6', seeded(seed))!
      expect(Object.keys(laid.cells).sort()).toEqual(['5,4', '5,5'])
    }
  })

  it('doesn’t fit off the map or over what’s drawn', () => {
    expect(layPiece('passage', piece, ground(6), '5,5', '4,5', seeded(1))).toBeNull()
    expect(layPiece('passage', piece, ground(12, ['6,5']), '5,5', '4,5', seeded(1))).toBeNull()
  })

  it('an exit beyond is left on nothing, opened on floor, dropped against the rest', () => {
    const at = ['5,5', '4,5', seeded(1)] as const
    const onFloor = layPiece('passage', piece, ground(12, ['7,5'], ['7,5']), ...at)!
    expect(onFloor.connections).toEqual([{ between: ['6,5', '7,5'], kind: 'door' }])
    const onRock = layPiece('passage', piece, ground(12, ['7,5']), ...at)!
    expect(onRock.connections).toEqual([])
    // Off the map: as rock.
    const atEdge = layPiece('passage', piece, ground(7), '5,5', '4,5', seeded(1))!
    expect(atEdge.connections).toEqual([])
  })

  it('a piece that may not turn fits as drawn or not at all', () => {
    const fixed = { ...piece, turns: false }
    expect(layPiece('passage', fixed, ground(12), '5,5', '4,5', seeded(1))).toBeNull()
    expect(layPiece('passage', fixed, ground(12), '5,5', '5,4', seeded(1))).not.toBeNull()
  })

  it('a piece with no exits is laid from any side, as a tile', () => {
    const tile = parsed(catalogue({ tile: { name: 'Tile', cells: '..\n..' } })).pieces!.pieces.tile
    const laid = layPiece('tile', tile, ground(12), '5,5', '4,5', seeded(2))!
    expect(Object.keys(laid.cells)).toContain('5,5')
    expect(Object.keys(laid.cells)).toHaveLength(4)
    expect(laid.connections).toEqual([])
  })

  it('an exit into a new map is a way from the piece, never a door beyond, nor the way in', () => {
    const stairs = {
      name: 'Stairs',
      cells: 'A\n.\nB\n',
      exits: {
        A: { kind: 'door' },
        B: { kind: 'way-in', newMap: { name: { en: 'Below', es: 'Abajo' } } },
      },
    }
    const piece = parsed(catalogue({ stairs })).pieces!.pieces.stairs
    for (let seed = 1; seed < 8; seed++) {
      const laid = layPiece('stairs', piece, ground(12), '5,5', '4,5', seeded(seed), 'es')!
      // Always in by A: the stair down leads elsewhere.
      expect(laid.connections).toEqual([])
      expect(laid.ways).toEqual([{ at: '5,5', kind: 'way-in', name: 'Abajo' }])
    }
    const plain = { ...stairs, exits: { A: { kind: 'door' }, B: { kind: 'way-in', newMap: true } } }
    const laid = layPiece(
      's',
      parsed(catalogue({ s: plain })).pieces!.pieces.s,
      ground(12),
      '5,5',
      '4,5',
      seeded(1),
    )!
    expect(laid.ways).toEqual([{ at: '5,5', kind: 'way-in' }])
    const errors = (exit: unknown) =>
      parsed(catalogue({ s: { ...stairs, exits: { A: { kind: 'door' }, B: exit } } })).errors.join()
    expect(errors({ kind: 'way-in', newMap: 3 })).toMatch(/newMap: expected true/)
    expect(errors({ kind: 'way-in', newMap: true, entry: true })).toMatch(/can't be the way in/)
  })
})

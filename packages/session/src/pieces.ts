import {
  keyOf,
  offsetOfPieceCell,
  parseKey,
  pieceCellOf,
  readDrawing,
  sidesOf,
  turnCell,
  turnsOf,
  type CellLayout,
  type HexKey,
  type PieceCell,
} from '@open-tabletop/hex'
import type { LocalizedText } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import { localize } from './index'
import { definitionId } from './refs'

/**
 * Pieces (`kind: pieces`, docs/places.md §18): shapes of cells drawn in text, laid on an empty
 * cell as the party comes to it, so a map grows where the party goes. One mechanism on any
 * grid: what's written says which, and a piece is turned and fitted the same way on all.
 */

/** A way out of a piece: on the cell beyond it, next to `floor`, its one cell of the piece. */
export interface PieceExit {
  letter: string
  /** The connection's kind, as the system names it. */
  kind: string
  name?: LocalizedText
  tags?: string[]
  fields?: Record<string, string | number>
  /** It may be the way in. */
  entry: boolean
  /**
   * It leads into a map of its own, made when the piece is laid (`newMap`): a way from the
   * piece's cell beside it, not a connection to the cell beyond. Its name, if it says one.
   */
  newMap?: { name?: LocalizedText }
  at: PieceCell
  floor: PieceCell
}

export interface Piece {
  name: LocalizedText
  /** Played as one place. */
  room: boolean
  tags?: string[]
  fields?: Record<string, string | number>
  /** What's rolled on entering it instead of `discover.contents`, by `pack/id`. */
  contents?: string
  /** It may be turned and mirrored. */
  turns: boolean
  cells: (PieceCell & { terrain: string })[]
  exits: PieceExit[]
}

export interface PiecesCatalogue {
  kind: 'pieces'
  id: string
  name?: LocalizedText
  description?: LocalizedText
  /** The grid its pieces are drawn for. */
  grid: 'square' | 'hex'
  pieces: Record<string, Piece>
}

const CATALOGUE_KEYS = ['kind', 'id', 'name', 'description', 'grid', 'marks', 'pieces']
const PIECE_KEYS = ['name', 'room', 'tags', 'fields', 'cells', 'exits', 'contents', 'turn']
const EXIT_KEYS = ['kind', 'name', 'tags', 'fields', 'entry', 'newMap']

const isText = (v: unknown): v is LocalizedText =>
  (typeof v === 'string' && v !== '') ||
  (typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === 'string'))

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const tagsOf = (v: unknown): string[] | undefined =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.map(String) : undefined

const isValues = (v: unknown): v is Record<string, string | number> =>
  isRecord(v) && Object.values(v).every((x) => typeof x === 'string' || typeof x === 'number')

const EXIT_MARK = /^[A-Z]$/

/** Reads a `kind: pieces` definition: the catalogue, or the problems found (`path: message`). */
export function parsePieces(
  raw: unknown,
  pack?: string,
): { pieces?: PiecesCatalogue; errors: string[] } {
  const errors: string[] = []
  if (!isRecord(raw)) return { errors: ['pieces: expected a definition'] }
  if (raw.kind !== 'pieces') errors.push('kind: expected "pieces"')
  if (typeof raw.id !== 'string' || !raw.id) errors.push('id: expected an id')
  for (const key of Object.keys(raw))
    if (!CATALOGUE_KEYS.includes(key)) errors.push(`${key}: unknown key in a catalogue of pieces`)
  for (const key of ['name', 'description'])
    if (raw[key] !== undefined && !isText(raw[key])) errors.push(`${key}: expected a text`)
  const grid = raw.grid ?? 'square'
  if (grid !== 'square' && grid !== 'hex') errors.push('grid: expected square or hex')
  const layout = { kind: grid === 'hex' ? undefined : ('square' as const) }
  const sides = sidesOf(layout)
  const marks = isRecord(raw.marks) ? raw.marks : {}
  if (!isRecord(raw.marks)) errors.push('marks: expected what each mark lays (`.: stone-floor`)')
  for (const [mark, terrain] of Object.entries(marks)) {
    if ([...mark].length !== 1 || EXIT_MARK.test(mark))
      errors.push(`marks.${mark}: a mark is one character, not an upper-case letter`)
    if (typeof terrain !== 'string' || !terrain) errors.push(`marks.${mark}: expected a terrain`)
  }
  const pieces: Record<string, Piece> = {}
  if (!isRecord(raw.pieces)) errors.push('pieces: expected pieces by id')
  for (const [id, value] of Object.entries(isRecord(raw.pieces) ? raw.pieces : {})) {
    const at = `pieces.${id}`
    if (id.includes('.')) errors.push(`${at}: an id without dots`)
    if (!isRecord(value)) {
      errors.push(`${at}: expected a piece (name, cells, exits…)`)
      continue
    }
    for (const key of Object.keys(value))
      if (!PIECE_KEYS.includes(key)) errors.push(`${at}.${key}: unknown key in a piece`)
    if (!isText(value.name)) errors.push(`${at}.name: expected a text`)
    if (typeof value.cells !== 'string' || !value.cells.trim()) {
      errors.push(`${at}.cells: expected the piece drawn in text`)
      continue
    }
    const drawn = readDrawing(value.cells, layout)
    for (const e of drawn.errors) errors.push(`${at}.cells: ${e}`)
    const floor = drawn.cells.filter((c) => !EXIT_MARK.test(c.mark))
    const letters = drawn.cells.filter((c) => EXIT_MARK.test(c.mark))
    for (const c of floor)
      if (typeof marks[c.mark] !== 'string') errors.push(`${at}.cells: no terrain for «${c.mark}»`)
    if (!floor.length) errors.push(`${at}.cells: a piece lays one cell at least`)
    const declared = value.exits ?? {}
    if (!isRecord(declared)) errors.push(`${at}.exits: expected exits by letter`)
    const exits: PieceExit[] = []
    for (const [letter, exit] of Object.entries(isRecord(declared) ? declared : {})) {
      const where = `${at}.exits.${letter}`
      const cell = letters.filter((c) => c.mark === letter)
      if (cell.length !== 1) {
        errors.push(`${where}: its letter must be drawn once`)
        continue
      }
      if (!isRecord(exit) || typeof exit.kind !== 'string' || !exit.kind) {
        errors.push(`${where}: expected its kind of connection`)
        continue
      }
      for (const key of Object.keys(exit))
        if (!EXIT_KEYS.includes(key)) errors.push(`${where}.${key}: unknown key in an exit`)
      const [{ x, y }] = cell
      const beside = floor.filter((c) => sides.some((s) => c.x === x + s.x && c.y === y + s.y))
      if (beside.length !== 1) {
        errors.push(`${where}: its letter stands beyond the piece, beside one cell of it`)
        continue
      }
      const tags = tagsOf(exit.tags)
      if (exit.fields !== undefined && !isValues(exit.fields))
        errors.push(`${where}.fields: expected values by key`)
      if (exit.name !== undefined && !isText(exit.name))
        errors.push(`${where}.name: expected a text`)
      const newMap = exit.newMap
      const made = newMap === true || (isRecord(newMap) && isText(newMap.name))
      if (newMap !== undefined && newMap !== false && !made)
        errors.push(`${where}.newMap: expected true, or the new map's name (\`{ name: … }\`)`)
      if (made && exit.entry === true)
        errors.push(`${where}: an exit into a new map can't be the way in`)
      exits.push({
        letter,
        kind: exit.kind,
        ...(isText(exit.name) && { name: exit.name }),
        ...(made && {
          newMap: isRecord(newMap) ? { name: newMap.name as LocalizedText } : {},
        }),
        ...(tags?.length && { tags }),
        ...(isValues(exit.fields) && { fields: exit.fields }),
        entry: exit.entry === true,
        at: { x, y },
        floor: { x: beside[0].x, y: beside[0].y },
      })
    }
    for (const { mark } of letters)
      if (!isRecord(declared) || declared[mark] === undefined)
        errors.push(`${at}.exits: «${mark}» is drawn but not declared`)
    if (value.fields !== undefined && !isValues(value.fields))
      errors.push(`${at}.fields: expected values by key (\`danger: 2\`)`)
    if (value.contents !== undefined && (typeof value.contents !== 'string' || !value.contents))
      errors.push(`${at}.contents: expected what's rolled (table.<id>)`)
    if (!isText(value.name)) continue
    const tags = tagsOf(value.tags)
    pieces[id] = {
      name: value.name,
      room: value.room === true,
      ...(tags?.length && { tags }),
      ...(isValues(value.fields) && { fields: value.fields }),
      ...(typeof value.contents === 'string' &&
        value.contents && { contents: definitionId(value.contents, pack) }),
      turns: value.turn !== false,
      cells: floor.map(({ x, y, mark }) => ({ x, y, terrain: String(marks[mark]) })),
      exits,
    }
  }
  if (errors.length) return { errors }
  return {
    pieces: {
      kind: 'pieces',
      id: raw.id as string,
      ...(isText(raw.name) && { name: raw.name }),
      ...(isText(raw.description) && { description: raw.description }),
      grid: grid as PiecesCatalogue['grid'],
      pieces,
    },
    errors,
  }
}

/** Finds a piece for a grid among the system's catalogues, by id. */
export type PieceLookup = (id: string, layout: Pick<CellLayout, 'kind'>) => Piece | undefined

export function lookupPieces(catalogues: { def: PiecesCatalogue }[]): PieceLookup {
  return (id, layout) => {
    const grid = layout.kind === 'square' ? 'square' : 'hex'
    return catalogues.find((c) => c.def.grid === grid && c.def.pieces[id])?.def.pieces[id]
  }
}

/** The connection a piece's exit leaves on the map. */
export interface LaidConnection {
  between: [string, string]
  kind: string
  name?: string
  tags?: string[]
  fields?: { key: string; value: string }[]
}

/** A piece as it was laid, for the host to write on its map. */
export interface LaidPiece {
  /** Its id in its catalogue. */
  id: string
  /** Its name, in the language played. */
  name: string
  /** It's played as one place. */
  room: boolean
  /** Its values, for its cells or its room. */
  fields?: { key: string; value: string }[]
  /** The cell the party entered. */
  at: string
  turn: number
  mirror: boolean
  /** The terrain of each cell it lays, by cell. */
  cells: Record<string, string>
  connections: LaidConnection[]
  /** Ways into maps made with it (exits with `newMap`), for the host to make. */
  ways?: LaidWay[]
}

/** A way from a laid piece into a new map, for the host to make: the map and the way into it. */
export interface LaidWay {
  /** The piece's cell it leads from. */
  at: string
  /** The connection's kind the way is. */
  kind: string
  /** The new map's name, in the language played, if the exit says one. */
  name?: string
}

/** What fitting needs of the map. */
export interface PieceGround {
  layout: CellLayout
  /** A cell inside the map with nothing on it. */
  free(cell: string): boolean
  /** Whether a cell is another piece's or drawn floor an exit can open on. */
  floor(cell: string): boolean
}

/** A piece's values as a map keeps them. */
function valuesOf(fields: Record<string, string | number> | undefined) {
  const list = Object.entries(fields ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  return list.length ? list : undefined
}

const shuffled = <T>(list: T[], random: RandomSource): T[] => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Lays a piece so that the party's cell `at` is one of its cells: the exit it came through
 * meets `from` when `from` is next to it, and every cell falls inside the map and free.
 * Each way of laying it is tried in an order drawn from `random`; null if none fits. The
 * piece's other exits are left waiting on free cells, opened on floor beyond them, and
 * dropped against anything else.
 */
export function layPiece(
  id: string,
  piece: Piece,
  ground: PieceGround,
  at: string,
  from: string,
  random: RandomSource,
  locale = 'en',
): LaidPiece | null {
  const { layout } = ground
  const here = pieceCellOf(parseKey(at as HexKey), layout)
  const there = pieceCellOf(parseKey(from as HexKey), layout)
  const beside = sidesOf(layout).some((s) => here.x + s.x === there.x && here.y + s.y === there.y)
  const anyEntry = piece.exits.some((e) => e.entry)
  // An exit into a new map is never the way in: it leads elsewhere.
  const entries = piece.exits.filter((e) => !e.newMap && (e.entry || !anyEntry))
  // With no exits, a piece is laid from any side, any of its cells where the party stands.
  const anchors = entries.length
    ? entries.map((exit) => ({ exit, floor: exit.floor }))
    : piece.cells.map((floor) => ({ exit: undefined, floor }))
  const turns = piece.turns ? turnsOf(layout) : 1
  const ways = anchors.flatMap((anchor) =>
    Array.from({ length: turns }, (_, turn) =>
      (piece.turns ? [false, true] : [false]).map((mirror) => ({ ...anchor, turn, mirror })),
    ).flat(),
  )
  for (const { exit, floor, turn, mirror } of shuffled(ways, random)) {
    const turned = (c: PieceCell) => turnCell(c, turn, mirror, layout)
    const anchor = turned(floor)
    const placed = (c: PieceCell) => {
      const t = turned(c)
      return keyOf(
        offsetOfPieceCell({ x: t.x - anchor.x + here.x, y: t.y - anchor.y + here.y }, layout),
      )
    }
    if (exit && beside && from !== at && placed(exit.at) !== from) continue
    const cells = Object.fromEntries(piece.cells.map((c) => [placed(c), c.terrain]))
    if (!Object.keys(cells).every((cell) => ground.free(cell))) continue
    const connections = piece.exits.flatMap((other): LaidConnection[] => {
      if (other === exit || other.newMap) return []
      const beyond = placed(other.at)
      if (cells[beyond] || !(ground.free(beyond) || ground.floor(beyond))) return []
      const { kind, tags } = other
      const name = other.name && localize(other.name, locale, 'en')
      const fields = valuesOf(other.fields)
      return [
        {
          between: [placed(other.floor), beyond],
          kind,
          ...(name && { name }),
          ...(tags && { tags }),
          ...(fields && { fields }),
        },
      ]
    })
    const ways = piece.exits.flatMap((other): LaidWay[] => {
      if (!other.newMap) return []
      const name = other.newMap.name && localize(other.newMap.name, locale, 'en')
      return [{ at: placed(other.floor), kind: other.kind, ...(name && { name }) }]
    })
    const fields = valuesOf(piece.fields)
    return {
      id,
      name: localize(piece.name, locale, 'en') ?? id,
      room: piece.room,
      ...(fields && { fields }),
      at,
      turn,
      mirror,
      cells,
      connections,
      ...(ways.length && { ways }),
    }
  }
  return null
}

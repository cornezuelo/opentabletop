import { cellNeighbors, inBounds, keyOf, parseKey, type HexKey } from '@open-tabletop/hex'
import { regionChain } from './regions'
import type { HexMap } from './types'

/**
 * Buildings (docs/map-styles.md §6b): what a style with roofs covers from outside. A building
 * is floor seen from above: floor cells joined side by side, split where they lie in
 * different outermost rooms (regions played as one place): two houses in a row, each a room,
 * are two buildings; the rooms inside a house are one, and a village's region round them all
 * (not a room) splits nothing. On squares, each is cut into rectangles, a roof each
 * (an L-shaped house gets two gables).
 */
export interface Building {
  /** Its first cell's key, as an id. */
  id: HexKey
  cells: HexKey[]
  /** Squares only: its cells as rectangles, by their top-left cell and size in cells. */
  rects: { col: number; row: number; w: number; h: number }[]
}

export function mapBuildings(
  map: Pick<HexMap, 'grid' | 'terrains' | 'hexes' | 'regions'>,
): Building[] {
  const floors = new Set(map.terrains.filter((t) => t.floor).map((t) => t.id))
  if (!floors.size) return []
  const isFloor = (key: HexKey) => {
    const terrain = map.hexes[key]?.terrain
    return !!terrain && floors.has(terrain) && inBounds(parseKey(key), map.grid)
  }
  /** The outermost room a cell lies in ('' for none): buildings never cross one's edge. */
  const house = (key: HexKey) =>
    regionChain(map.regions, map.hexes[key]?.region)
      .filter((r) => r.onePlace)
      .at(-1)?.id ?? ''
  // Sides only: a corner touching is no way through.
  const layout = { ...map.grid, diagonals: false }
  const seen = new Set<HexKey>()
  const out: Building[] = []
  const keys = (Object.keys(map.hexes) as HexKey[]).filter(isFloor).sort(byPlace)
  for (const start of keys) {
    if (seen.has(start)) continue
    const own = house(start)
    const cells: HexKey[] = []
    const queue = [start]
    seen.add(start)
    while (queue.length) {
      const key = queue.pop()!
      cells.push(key)
      for (const next of cellNeighbors(parseKey(key), layout)) {
        const there = keyOf(next)
        if (seen.has(there) || !isFloor(there) || house(there) !== own) continue
        seen.add(there)
        queue.push(there)
      }
    }
    cells.sort(byPlace)
    out.push({
      id: cells[0],
      cells,
      rects: map.grid.kind === 'square' ? rectangles(cells) : [],
    })
  }
  return out
}

/** Top to bottom, then left to right. */
function byPlace(a: HexKey, b: HexKey): number {
  const p = parseKey(a)
  const q = parseKey(b)
  return p.row - q.row || p.col - q.col
}

/**
 * Cells cut into rectangles, greedily: from the first cell left (top, then left), as wide as
 * its row runs, then as deep as every row below runs as wide.
 */
export function rectangles(cells: readonly HexKey[]): Building['rects'] {
  const left = new Set(cells)
  const out: Building['rects'] = []
  for (const key of [...cells].sort(byPlace)) {
    if (!left.has(key)) continue
    const { col, row } = parseKey(key)
    const has = (c: number, r: number) => left.has(keyOf({ col: c, row: r }))
    let w = 1
    while (has(col + w, row)) w++
    let h = 1
    while (Array.from({ length: w }, (_, i) => has(col + i, row + h)).every(Boolean)) h++
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++) left.delete(keyOf({ col: c, row: r }))
    out.push({ col, row, w, h })
  }
  return out
}

/** The building a cell is in, if any. */
export function buildingAt(buildings: readonly Building[], key: string): Building | undefined {
  return buildings.find((b) => b.cells.includes(key as HexKey))
}

/**
 * The buildings seen under their roofs: all but those one of `open` lies in (the cell the
 * party stands on, the cell selected): a building opens while the party is in it.
 */
export function roofedBuildings(
  buildings: readonly Building[],
  open: readonly (string | null | undefined)[],
): Building[] {
  const opened = new Set(open.map((key) => key && buildingAt(buildings, key)?.id))
  return buildings.filter((b) => !opened.has(b.id))
}

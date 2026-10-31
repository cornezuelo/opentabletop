import { inBounds, parseKey, type HexKey } from '@open-tabletop/hex'
import { roomOfCell } from './regions'
import type { HexMap } from './types'

/**
 * Floor and walls (§9 of docs/places.md): a terrain the palette marks as floor (`floor`) is a
 * structure's inside, a room or a corridor. A wall stands, drawn by itself and never crossed,
 * wherever floor meets a cell that isn't floor, and between two rooms (regions played as one
 * place, `onePlace`) that touch; a corridor's floor (in no room) joins any floor openly.
 * Walls drawn by hand on cells' sides (`walls`, on any map) stand too. A connection drawn
 * across a wall opens it (a door, an arch). The map keeps the floor, the rooms, the walls
 * drawn and the connections.
 */
export interface Walls {
  /** Whether a cell is floor. */
  floor(key: string): boolean
  /** Whether a wall stands between two neighbouring cells (none where a connection is drawn). */
  between(a: string, b: string): boolean
  /** Whether a wall drawn by hand stands there (whether or not a connection opens it). */
  drawn(a: string, b: string): boolean
}

export function mapWalls(
  map: Pick<HexMap, 'grid' | 'terrains' | 'hexes' | 'connections' | 'regions'> &
    Partial<Pick<HexMap, 'walls'>>,
): Walls {
  const floors = new Set(map.terrains.filter((t) => t.floor).map((t) => t.id))
  const floor = (key: string) => {
    if (!floors.size || !inBounds(parseKey(key as HexKey), map.grid)) return false
    const terrain = map.hexes[key as HexKey]?.terrain
    return !!terrain && floors.has(terrain)
  }
  // A cell's room: its nearest region up the tree played as one place.
  const room = (key: string) => roomOfCell(map, key)
  const open = new Set<string>()
  for (const {
    between: [a, b],
  } of map.connections ?? [])
    open.add(`${a}|${b}`).add(`${b}|${a}`)
  const drawn = new Set<string>()
  for (const [a, b] of map.walls ?? []) drawn.add(`${a}|${b}`).add(`${b}|${a}`)
  return {
    floor,
    drawn: (a, b) => drawn.has(`${a}|${b}`),
    between(a, b) {
      if (open.has(`${a}|${b}`)) return false
      if (drawn.has(`${a}|${b}`)) return true
      if (!floors.size) return false
      if (floor(a) !== floor(b)) return true
      const [ra, rb] = [room(a), room(b)]
      return floor(a) && !!ra && !!rb && ra !== rb
    },
  }
}

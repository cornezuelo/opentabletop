import type { HexKey } from '@open-tabletop/hex'
import type { LaidPiece } from '@open-tabletop/session'
import type { HexMap } from './types'

/** The colour of a room a piece lays. */
const ROOM_COLOR = '#6e4f2c'

/** An id made of what it is and its cells (`room16x13`), with a number after it if taken. */
function idAt(kind: string, cells: string[], taken: Set<string>): string {
  const base = kind + cells.join('x').replaceAll(',', 'x')
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}n${n}`
  taken.add(id)
  return id
}

/**
 * The map with pieces a trip laid on it: their cells' terrain where there was none, a room's
 * region, their values, the exits left waiting, and the list `pieces.<id>` counts. The map
 * given is left as it was. The ids of what is made come from its cells, so laying the same
 * pieces on the same map twice (to read them during a step, then to keep them) makes the same.
 */
export function withPieces(map: HexMap, laid: LaidPiece[]): HexMap {
  if (!laid.length) return map
  const hexes = { ...map.hexes }
  const regions = [...map.regions]
  const connections = [...map.connections]
  const pieces = [...(map.pieces ?? [])]
  const regionIds = new Set(regions.map((r) => r.id))
  const connectionIds = new Set(connections.map((c) => c.id))
  for (const piece of laid) {
    const cells = Object.keys(piece.cells) as HexKey[]
    for (const key of cells)
      hexes[key] = { ...hexes[key], terrain: hexes[key]?.terrain ?? piece.cells[key] }
    if (piece.room) {
      const id = idAt('room', [piece.at], regionIds)
      regions.push({
        id,
        name: piece.name,
        color: ROOM_COLOR,
        onePlace: true,
        ...(piece.fields && { fields: piece.fields }),
      })
      for (const key of cells) hexes[key] = { ...hexes[key], region: id }
    } else if (piece.fields)
      for (const key of cells) hexes[key] = { ...hexes[key], fields: piece.fields }
    for (const { between, fields, ...rest } of piece.connections)
      connections.push({
        ...rest,
        id: idAt('exit', between, connectionIds),
        between: between as [HexKey, HexKey],
        ...(fields && { fields }),
      })
    pieces.push({ id: piece.id, at: piece.at as HexKey, turn: piece.turn, mirror: piece.mirror })
  }
  return { ...map, hexes, regions, connections, pieces }
}

import {
  allCells,
  cornerOffsets,
  hexToPixel,
  keyOf,
  toAxial,
  type HexKey,
} from '@open-tabletop/hex'
import type { HexMap } from '@open-tabletop/map'

/** A map drawn small: its view box, one path per terrain colour and one per faction's land. */
export interface LandDrawing {
  box: string
  /** Hexes by terrain colour (`''`: no terrain). */
  fills: { fill: string; d: string }[]
  land: { faction: string; d: string }[]
}

/**
 * Draws a map at a glance: each hex in its terrain's colour and the land each faction holds
 * on it, as one SVG path per colour, so a big map stays light. `size` is a hex's radius.
 */
export function drawLand(map: HexMap, size = 10): LandDrawing {
  const { orientation } = map.grid
  const corners = cornerOffsets(orientation, size)
  const terrainColor = new Map(map.terrains.map((t) => [t.id, t.color]))
  const holder = new Map<string, string>()
  for (const [faction, hexes] of Object.entries(map.territories ?? {}))
    for (const hex of hexes) holder.set(hex, faction)
  const fills = new Map<string, string[]>()
  const land = new Map<string, string[]>()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const cell of allCells(map.grid)) {
    const { x, y } = hexToPixel(toAxial(cell, orientation), orientation, size)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    let d = ''
    for (let i = 0; i < 12; i += 2)
      d += `${i ? 'L' : 'M'}${(x + corners[i]).toFixed(1)} ${(y + corners[i + 1]).toFixed(1)}`
    d += 'Z'
    const key: HexKey = keyOf(cell)
    const fill = terrainColor.get(map.hexes[key]?.terrain ?? '') ?? ''
    fills.set(fill, [...(fills.get(fill) ?? []), d])
    const faction = holder.get(key)
    if (faction) land.set(faction, [...(land.get(faction) ?? []), d])
  }
  if (minX === Infinity) return { box: '0 0 0 0', fills: [], land: [] }
  return {
    box: `${minX - size} ${minY - size} ${maxX - minX + 2 * size} ${maxY - minY + 2 * size}`,
    fills: [...fills].map(([fill, d]) => ({ fill, d: d.join('') })),
    land: [...land].map(([faction, d]) => ({ faction, d: d.join('') })),
  }
}

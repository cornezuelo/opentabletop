import {
  allCells,
  cellCenter,
  cellCorners,
  cellSides,
  hatchSegments,
  keyOf,
  type HexKey,
} from '@open-tabletop/hex'
import type { HexMap } from '@open-tabletop/map'

/** A map drawn small: its view box, one path per terrain colour and two per faction's land. */
export interface LandDrawing {
  box: string
  /** Hexes by terrain colour (`''`: no terrain). */
  fills: { fill: string; d: string }[]
  /**
   * Each faction's land as Map draws it: diagonal `hatch` lines over its hexes
   * and its `frontier`, the edges where its land ends, just inside them (to be dashed).
   */
  land: { faction: string; hatch: string; frontier: string }[]
}

/** The hatching's spacing, as a fraction of a hex's radius: wider than Map's, as hexes are small here. */
const HATCH_SPACING = 0.5
/** How far inside its hexes a frontier runs, so two factions side by side both show. */
const FRONTIER_INSET = 0.08

/**
 * Draws a map at a glance: each hex in its terrain's colour and, over it, the land each
 * faction holds, hatched with a frontier as on Map, so terrain and faction don't
 * mix. One SVG path per colour, so a big map stays light. `size` is a hex's radius.
 */
export function drawLand(map: HexMap, size = 10): LandDrawing {
  const { grid } = map
  const corners = cellCorners(grid, size)
  const terrainColor = new Map(map.terrains.map((t) => [t.id, t.color]))
  const holder = new Map<string, string>()
  for (const [faction, hexes] of Object.entries(map.territories ?? {}))
    for (const hex of hexes) holder.set(hex, faction)
  const fills = new Map<string, string[]>()
  const land = new Map<string, { hatch: string[]; frontier: string[] }>()
  const at = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const cell of allCells(map.grid)) {
    const { x, y } = cellCenter(cell, grid, size)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    const around = corners.map((v, i) => v + (i % 2 ? y : x))
    let d = ''
    for (let i = 0; i < around.length; i += 2)
      d += `${i ? 'L' : 'M'}${at(around[i], around[i + 1])}`
    d += 'Z'
    const key: HexKey = keyOf(cell)
    const fill = terrainColor.get(map.hexes[key]?.terrain ?? '') ?? ''
    fills.set(fill, [...(fills.get(fill) ?? []), d])
    const faction = holder.get(key)
    if (!faction) continue
    const drawn = land.get(faction) ?? { hatch: [], frontier: [] }
    land.set(faction, drawn)
    for (const [p, q] of hatchSegments(around, size * HATCH_SPACING))
      drawn.hatch.push(`M${at(p.x, p.y)}L${at(q.x, q.y)}`)
    for (const { a, b, across } of cellSides(cell, grid, size)) {
      if (holder.get(keyOf(across)) === faction) continue
      const inset = (px: number, py: number) =>
        at(px + (x - px) * FRONTIER_INSET, py + (y - py) * FRONTIER_INSET)
      drawn.frontier.push(`M${inset(a.x, a.y)}L${inset(b.x, b.y)}`)
    }
  }
  if (minX === Infinity) return { box: '0 0 0 0', fills: [], land: [] }
  return {
    box: `${minX - size} ${minY - size} ${maxX - minX + 2 * size} ${maxY - minY + 2 * size}`,
    fills: [...fills].map(([fill, d]) => ({ fill, d: d.join('') })),
    land: [...land].map(([faction, { hatch, frontier }]) => ({
      faction,
      hatch: hatch.join(''),
      frontier: frontier.join(''),
    })),
  }
}

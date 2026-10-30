import { allCells, keyOf, neighborCells, parseKey, type HexKey } from '@open-tabletop/hex'
import { generateLand, type LandModel } from '@open-tabletop/land-engine'
import type { HexMap } from '@open-tabletop/map'
import { seeded } from '@open-tabletop/random'
import type { Command } from './commands/command'
import { HexEditBatch } from './commands/hexes'

/** Where Generate fills empty hexes: the whole map, or one region's hexes. */
export type GenerateArea = { region?: string }

/** The empty hexes of an area, in coordinate order (ties grow from the top-left). */
export function emptyHexes(map: HexMap, area: GenerateArea = {}): HexKey[] {
  const out: HexKey[] = []
  for (const cell of allCells(map.grid)) {
    const key = keyOf(cell)
    const hex = map.hexes[key]
    if (hex?.terrain) continue
    if (area.region !== undefined && hex?.region !== area.region) continue
    out.push(key)
  }
  return out
}

/**
 * Fills the empty hexes of an area with a land model (`kind: land`), from the painted land
 * outwards, seeded: the same seed draws the same land. Painted hexes never change. The
 * hexes are changed at once; the command undoes them in one step (null: nothing filled).
 */
export function generateEmpty(
  map: HexMap,
  model: LandModel,
  area: GenerateArea,
  seed: string,
): { command: Command | null; keys: HexKey[]; terrains: string[] } {
  const land = generateLand(model, {
    area: emptyHexes(map, area),
    terrain: (hex) => map.hexes[hex as HexKey]?.terrain || undefined,
    neighbors: (hex) => neighborCells(parseKey(hex as HexKey), map.grid).map(keyOf),
    random: seeded(seed),
  })
  const batch = new HexEditBatch(map)
  const keys: HexKey[] = []
  for (const [hex, terrain] of land)
    if (batch.edit(hex as HexKey, (data) => ({ ...data, terrain }))) keys.push(hex as HexKey)
  return { command: batch.finish(), keys, terrains: [...new Set(land.values())] }
}

/** A new seed to draw other land with (short, easy to note and type again). */
export const newSeed = (): string => Math.random().toString(36).slice(2, 8)

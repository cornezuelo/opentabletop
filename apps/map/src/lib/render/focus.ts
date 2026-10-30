import type { HexKey } from '@open-tabletop/hex'

/** What the map is being worked on: which of its political and geographic layers. */
export interface MapFocusInput {
  tool: string
  panelView: string
  /** The region the Regions tool paints. */
  regionId: string | null
  /** The faction whose land a click paints (the World panel's brush). */
  factionBrush: string | null
  /** Each hex's region, by hex. */
  regionOf: (key: HexKey) => string | undefined
  hexes: readonly HexKey[]
  /** The factions' land on this map, by faction. */
  territories: Readonly<Record<string, readonly string[]>>
}

export interface MapFocus {
  /** How strongly each layer is drawn: the one worked on in full, the other faded. */
  regionsAlpha: number
  factionsAlpha: number
  /** The land of the region or faction chosen, outlined while the rest is dimmed. */
  selected: HexKey[]
}

/** How faint the layer not worked on is drawn. */
export const FADED = 0.35

/**
 * What the map brings forward: with the Regions tool, the regions (the factions faded)
 * and the region it paints; with the World panel open, the factions (the regions faded)
 * and the faction its brush paints. Otherwise both in full and nothing chosen.
 */
export function mapFocus(input: MapFocusInput): MapFocus {
  if (input.tool === 'region' && input.panelView === 'tool') {
    const id = input.regionId
    return {
      regionsAlpha: 1,
      factionsAlpha: FADED,
      selected: id ? input.hexes.filter((k) => input.regionOf(k) === id) : [],
    }
  }
  if (input.panelView === 'world') {
    const brush = input.factionBrush
    return {
      regionsAlpha: FADED,
      factionsAlpha: 1,
      selected: brush ? ((input.territories[brush] ?? []) as HexKey[]) : [],
    }
  }
  return { regionsAlpha: 1, factionsAlpha: 1, selected: [] }
}

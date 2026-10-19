import { inBounds, keyOf, neighborCells, parseKey, type HexKey } from '@open-tabletop/hex'
import { claim, type TerritoryWorld } from '@open-tabletop/faction-engine'
import type { HexMap } from '@open-tabletop/map'
import { emptyState } from '@open-tabletop/oracle-engine'
import { startFactions, worldTurn, type SystemFactions } from '@open-tabletop/session'
import type { Campaign, CampaignFactions, FactionsOnMap } from './types'

/**
 * The campaign's factions as a map sees them: their sheets and turns (the campaign's) and
 * the land each holds on this map. None when the campaign has no factions.
 */
export function factionsOn(campaign: Campaign, map: HexMap): FactionsOnMap | undefined {
  const own = campaign.factions
  if (!own) return undefined
  const land = map.territories ?? {}
  const territories: Record<string, string[]> = {}
  for (const f of own.factions) if (land[f.id]) territories[f.id] = land[f.id]
  return { ...own, territories }
}

/** The campaign's factions as the map being played sees them (no land without a map). */
export function factionsHere(campaign: Campaign, map?: HexMap): FactionsOnMap | undefined {
  if (map) return factionsOn(campaign, map)
  return campaign.factions && { ...campaign.factions, territories: {} }
}

/**
 * The factions as a map changed them, split back into what the campaign keeps (their sheets,
 * the last turn) and what the map keeps (the land on it). `undefined` takes them away.
 */
export function splitFactions(factions: FactionsOnMap | undefined): {
  factions?: CampaignFactions
  territories?: Record<string, string[]>
} {
  if (!factions) return {}
  const { territories, ...own } = factions
  return { factions: own, territories }
}

/** A map as territory sees it: hexes on the map, water left to nobody. */
export function territoryWorld(map: HexMap): TerritoryWorld {
  const { grid, hexes, terrains } = map
  const water = new Set(terrains.filter((t) => t.water).map((t) => t.id))
  return {
    neighbors: (hex) => neighborCells(parseKey(hex as HexKey), grid).map(keyOf),
    holdable: (hex) => {
      if (!inBounds(parseKey(hex as HexKey), grid)) return false
      const terrain = hexes[hex as HexKey]?.terrain
      return !terrain || !water.has(terrain)
    },
  }
}

/**
 * Brings a system's factions to a map of the campaign: the campaign gets their sheets as
 * they start (unless it has them already, from this system), and the map the land each
 * starts with on it (every hex of its regions, by name, and, when the map is the one of the
 * factions' pack they're on (`from`: the map's path in that pack, if it's one of its example
 * maps), the hexes it lists). `time` is the moment they come (their last turn).
 */
export function bringFactions(
  campaign: Campaign,
  map: HexMap,
  system: SystemFactions,
  systemId: string,
  time: number,
  from?: { pack: string; path: string },
): FactionsOnMap {
  const { regions, hexes, grid } = map
  const start = startFactions(
    system,
    {
      regionHexes: (name) => {
        const region = regions.find((r) => r.name === name)
        return region
          ? (Object.keys(hexes) as HexKey[]).filter((k) => hexes[k]?.region === region.id)
          : []
      },
      exists: (hex) => /^\d+,\d+$/.test(hex) && inBounds(parseKey(hex as HexKey), grid),
      is: (path) => from?.pack === system.pack && from.path === path,
    },
    time,
  )
  const own = campaign.factions
  if (!own || own.system !== systemId) return { system: systemId, ...start }
  // The campaign has them (another map brought them): only their land comes to this map,
  // for the factions it doesn't have land of yet.
  let territories = { ...(factionsOn(campaign, map)?.territories ?? {}) }
  for (const f of own.factions)
    if (!territories[f.id]?.length && start.territories[f.id]?.length)
      territories = claim(territories, f.id, start.territories[f.id])
  return { ...own, territories }
}

/** Where no map is played: no land to hold. */
const NO_LAND: TerritoryWorld = { neighbors: () => [], holdable: () => false }

/**
 * A world turn on a map of the campaign: every faction rolls its turn (`worldTurn`), with
 * the campaign's Oracle; their sheets and the Oracle change in the campaign, the land on
 * this map (without a map, played elsewhere, no land changes). Returns both, the timeline
 * lines and the progress clocks the turns ticked (the host writes them on the world clock).
 */
export function worldTurnOn<M extends HexMap | undefined>(
  { campaign, map }: { campaign: Campaign; map: M },
  options: Omit<Parameters<typeof worldTurn>[0], 'world'>,
): {
  campaign: Campaign
  map: M
  lines: ReturnType<typeof worldTurn>['lines']
  ticks: Record<string, number>
} {
  const here = factionsHere(campaign, map)
  if (!here) return { campaign, map, lines: [], ticks: {} }
  const done = worldTurn(
    { ...options, world: map ? territoryWorld(map) : NO_LAND },
    here,
    campaign.oracle?.state ?? emptyState(),
  )
  const split = splitFactions({ ...here, ...done.state })
  return {
    campaign: {
      ...campaign,
      factions: split.factions,
      oracle: { state: done.oracle, history: campaign.oracle?.history ?? [] },
    },
    map: (map && { ...map, territories: split.territories }) as M,
    lines: done.lines,
    ticks: done.ticks,
  }
}

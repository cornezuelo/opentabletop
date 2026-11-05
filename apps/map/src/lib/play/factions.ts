import { claim, release, type TerritoryWorld } from '@open-tabletop/faction-engine'
import type { SystemFactions } from '@open-tabletop/session'
import { bringFactions as bring, territoryWorld as worldOf } from '@open-tabletop/campaign'
import { editor } from '../store/editor.svelte'
import { getSystem, mapSystemId } from './systems'

/**
 * The factions of the map's campaign: brought from its system (`kind: factions`), their
 * sheets and turns kept with the campaign and their land with the map, outside the undo
 * history (like the world clock), taking their turns by hand (**World turn**) or by
 * themselves as the world clock moves (every so many days, as the system says). What they
 * did goes to the world clock's timeline.
 */

/** The factions the map's system declares, if any. */
export const systemFactions = (): SystemFactions | undefined => getSystem(mapSystemId()).factions

/** The system the map's factions came from (their names and turn tables), if still loaded. */
export function factionsSystem(): SystemFactions | undefined {
  const own = editor.factionsOnMap
  return own ? getSystem(own.system).factions : undefined
}

/** The map as territory sees it: hexes on the map, water left to nobody. */
export const territoryWorld = (): TerritoryWorld => worldOf(editor.map)

/**
 * Brings the system's factions to the map: to its campaign, unless it has them, and their
 * starting land to this map (every cell whose place holds its `territory`).
 */
export function bringFactions(): void {
  const system = systemFactions()
  if (!system) return
  editor.setFactions(
    bring(
      editor.campaign,
      editor.map,
      system,
      getSystem(mapSystemId()).id,
      editor.campaign.world?.time ?? 0,
    ),
  )
}

/**
 * Paints a faction's land by hand: `claim` gives it these hexes (taken from whoever held
 * them; water and hexes off the map stay nobody's), otherwise it gives them up. Play
 * state, like a world turn: outside the undo history.
 */
export function paintTerritory(faction: string, hexes: string[], claimIt: boolean): void {
  const own = editor.factionsOnMap
  if (!own || !own.factions.some((f) => f.id === faction)) return
  const world = territoryWorld()
  const ok = hexes.filter((h) => world.holdable?.(h) ?? true)
  const next = claimIt
    ? claim(own.territories, faction, ok)
    : release(own.territories, faction, hexes)
  if (JSON.stringify(next) !== JSON.stringify(own.territories))
    editor.setFactions({ ...own, territories: next })
}

/** Takes the factions away (their sheets in the campaign and their land here are forgotten). */
export function removeFactions(): void {
  editor.setFactions(undefined)
}

/** The faction that holds a hex, if any. */
export function hexFaction(hex: string): string | undefined {
  const own = editor.factionsOnMap
  if (!own) return undefined
  return Object.keys(own.territories).find((id) => own.territories[id].includes(hex))
}

import { inBounds, keyOf, neighborCells, parseKey, type HexKey } from '@open-tabletop/hex'
import { turnsDue, type TerritoryWorld } from '@open-tabletop/faction-engine'
import { mathRandom } from '@open-tabletop/random'
import {
  factionFacts,
  factionName,
  startFactions,
  worldTurn,
  type FactionLine,
  type SystemFactions,
} from '@open-tabletop/session'
import { emptyState } from '@open-tabletop/oracle-engine'
import { getLocale, t } from '../i18n/index.svelte'
import type { MapFactions } from '../model/types'
import { editor } from '../store/editor.svelte'
import { getSystem, mapSystemId, oracle } from './systems'

/**
 * The factions on the map: brought from its system (`kind: factions`), kept with the map
 * outside the undo history (like the world clock), taking their turns by hand (**World
 * turn**) or by themselves as the world clock moves (every so many days, as the system
 * says). What they did goes to the world clock's timeline.
 */

/** The factions the map's system declares, if any. */
export const systemFactions = (): SystemFactions | undefined => getSystem(mapSystemId()).factions

/** The system the map's factions came from (their names and turn tables), if still loaded. */
export function factionsSystem(): SystemFactions | undefined {
  const own = editor.map.factions
  return own ? getSystem(own.system).factions : undefined
}

/** The map as territory sees it: hexes on the map, water left to nobody. */
export function territoryWorld(): TerritoryWorld {
  const { grid, hexes, terrains } = editor.map
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

/** Brings the system's factions onto the map, each holding its starting territory. */
export function bringFactions(): void {
  const system = systemFactions()
  if (!system) return
  const { regions, hexes, grid } = editor.map
  const state = startFactions(
    system,
    {
      regionHexes: (name) => {
        const region = regions.find((r) => r.name === name)
        return region
          ? (Object.keys(hexes) as HexKey[]).filter((k) => hexes[k]?.region === region.id)
          : []
      },
      exists: (hex) => /^\d+,\d+$/.test(hex) && inBounds(parseKey(hex as HexKey), grid),
    },
    editor.map.world?.time ?? 0,
  )
  editor.setFactions({ system: getSystem(mapSystemId()).id, ...state })
}

/** Takes the factions off the map (their sheets and territory are forgotten). */
export function removeFactions(): void {
  editor.setFactions(undefined)
}

/** What tables and conditions read of the factions (`factions.<id>.*`), if the map has them. */
export function factionFactsNow(): Record<string, unknown> | undefined {
  const own = editor.map.factions
  return own ? factionFacts(own, factionsSystem(), getLocale()) : undefined
}

/** The faction that holds a hex, if any. */
export function hexFaction(hex: string): string | undefined {
  const own = editor.map.factions
  if (!own) return undefined
  return Object.keys(own.territories).find((id) => own.territories[id].includes(hex))
}

/**
 * A world turn now: every faction rolls its turn; their sheets, territory, the map's
 * Oracle and the world clock (its timeline and the progress clocks the turns tick) follow.
 * `time` is the turn's moment (the world clock's, by default). Returns the timeline lines.
 */
export function takeWorldTurn(
  hooks: {
    facts?: Record<string, unknown>
    log: (text: string, data: Record<string, unknown>, time: number) => void
    tick: (clock: string, segments: number) => void
  },
  time = editor.map.world?.time ?? 0,
): FactionLine[] {
  const own = editor.map.factions
  const system = factionsSystem()
  if (!own || !system) return []
  const shared = editor.map.oracle
  const done = worldTurn(
    {
      system,
      oracle: oracle(),
      world: territoryWorld(),
      random: mathRandom(),
      facts: hooks.facts,
      locale: getLocale(),
      time,
    },
    own,
    shared?.state ?? emptyState(),
  )
  editor.setFactions({ ...own, ...done.state } as MapFactions)
  editor.setOracle({ state: done.oracle, history: shared?.history ?? [] })
  for (const line of done.lines) hooks.log(lineText(system, line), { ...line }, time)
  for (const [clock, n] of Object.entries(done.ticks)) if (n) hooks.tick(clock, n)
  return done.lines
}

/**
 * The world turns due by `now` (every so many days of the world clock, since the last one),
 * if the factions take them by themselves; their moments, oldest first.
 */
export function dueTurns(now: number, minutesPerDay: number): number[] {
  const own = editor.map.factions
  const system = factionsSystem()
  if (!own || !system || own.auto === false) return []
  return turnsDue(own.lastTurn, now, system.def.every, minutesPerDay)
}

/** A faction's turn as one line of the timeline: "The Iron Clans: raid the Vale (+1 hex)". */
export function lineText(system: SystemFactions, line: FactionLine): string {
  const name = factionName(system, line.faction, getLocale())
  if (line.error) return t('factions.failed', { name, error: line.error })
  const gained = line.territory?.filter((e) => e.type === 'TERRITORY_GAINED').length ?? 0
  const lost = line.territory?.filter((e) => e.type === 'TERRITORY_LOST').length ?? 0
  const land = [
    gained ? t('factions.gained', { n: gained }) : '',
    lost ? t('factions.lost', { n: lost }) : '',
  ]
    .filter(Boolean)
    .join(', ')
  return t('factions.line', { name, text: line.text ?? '' }) + (land ? ` (${land})` : '')
}

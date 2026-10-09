import {
  applyCharacter,
  characterFacts,
  createCharacter,
  type CharacterState,
  type Sheet,
} from '@open-tabletop/character-engine'
import {
  changeTerritory,
  claim,
  type FactionsDef,
  type Territories,
  type TerritoryEvent,
  type TerritoryWorld,
} from '@open-tabletop/faction-engine'
import { OracleError, type OracleEngine, type OracleState } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import { onceRoller, resolveChange } from '@open-tabletop/variables'
import { effectsOf } from './effects'
import { localize, type LocalizedText } from './index'

/** A system's factions: what its pack declares (`kind: factions`) and the sheet they're made with. */
export interface SystemFactions {
  /** `pack/id` of the definition. */
  id: string
  pack: string
  def: FactionsDef
  sheet: { id: string; def: Sheet }
}

/** The factions of a world: each one's sheet, the hexes each holds, and the last turn. */
export interface FactionsState {
  /** Each faction as a character of the factions' sheet, in the pack's order. */
  factions: CharacterState[]
  territories: Territories
  /** When the last world turn came (game minutes); the next ones follow it. */
  lastTurn: number
}

/** A faction's name in a language (its id when it has none). */
export function factionName(
  system: SystemFactions,
  id: string,
  locale: string,
  fallback?: string,
): string {
  return (
    localize(system.def.factions[id]?.name as LocalizedText | undefined, locale, fallback) ?? id
  )
}

/**
 * The factions as they start: each with the sheet's defaults and its starting values and
 * tags, holding its starting territory on this map (every hex of its regions, by name,
 * and the hexes it lists that `exists` says the map has).
 */
export function startFactions(
  system: SystemFactions,
  map: { regionHexes(name: string): string[]; exists?(hex: string): boolean },
  time: number,
): FactionsState {
  let territories: Territories = {}
  const factions = Object.entries(system.def.factions).map(([id, f]) => {
    const hexes = [
      ...(f.territory?.regions ?? []).flatMap((r) => map.regionHexes(r)),
      ...(f.territory?.hexes ?? []).filter((h) => map.exists?.(h) ?? true),
    ]
    territories = claim(territories, id, hexes)
    return createCharacter(system.sheet.def, system.sheet.id, {
      id,
      values: { ...f.values },
      tags: [...(f.tags ?? [])],
    })
  })
  return { factions, territories, lastTurn: time }
}

/**
 * What conditions and tables read of the factions: `factions.<id>.*` (each one's values,
 * conditions, tags and relations as a character's, its `name` and `territory`: how many
 * hexes it holds).
 */
export function factionFacts(
  state: FactionsState,
  system?: SystemFactions,
  locale = 'en',
): Record<string, unknown> {
  return {
    factions: Object.fromEntries(
      state.factions.map((f) => [
        f.id,
        {
          ...characterFacts(f),
          name: system ? factionName(system, f.id, locale) : f.id,
          territory: state.territories[f.id]?.length ?? 0,
        },
      ]),
    ),
  }
}

/** One line of what a world turn did, for the world clock's timeline. */
export interface FactionLine {
  faction: string
  /** The result's text, in the pack's language. */
  text?: string
  /** What it changed: the effects as written (`faction.values.strength: 1`). */
  effects?: Record<string, number | string>
  /** What happened to the territory, hex by hex. */
  territory?: TerritoryEvent[]
  /** The table it rolled, and why it failed if it did. */
  table?: string
  error?: string
}

/**
 * One faction's turn: it rolls its table (its own `turn`, or the definition's) with its
 * facts as `faction.*` and every faction as `factions.*`, then applies what came up:
 * `faction.…` and `factions.<id>.…` (values and conditions within its sheet, `territory`
 * grown or lost hex by hex), and `world.clocks.<id>` (returned as `ticks`, for the host's
 * world clock). Other effects are left alone.
 */
export function factionTurn(
  options: {
    system: SystemFactions
    oracle: OracleEngine
    world: TerritoryWorld
    random: RandomSource
    /** The host's facts (the world clock's, the calendar's moment). */
    facts?: Record<string, unknown>
    locale?: string
    time?: number
  },
  input: FactionsState,
  oracleState: OracleState,
  faction: string,
): {
  state: FactionsState
  oracle: OracleState
  line: FactionLine
  ticks: Record<string, number>
} {
  const { system } = options
  const state = structuredClone(input)
  const ticks: Record<string, number> = {}
  const self = state.factions.find((f) => f.id === faction)
  const table = system.def.factions[faction]?.turn ?? system.def.turn
  const line: FactionLine = { faction, ...(table && { table }) }
  if (!self || !table) return { state, oracle: oracleState, line, ticks }
  const qualify = (ref: string) => (ref.includes('/') ? ref : `${system.pack}/${ref}`)
  const facts = factionFacts(state, system, options.locale)
  const context = {
    ...options.facts,
    ...facts,
    faction: (facts.factions as Record<string, unknown>)[faction],
  }
  let value: Record<string, unknown>
  let oracle = oracleState
  try {
    const out = options.oracle.resolve(qualify(table), context, oracleState, {
      locale: options.locale,
    })
    oracle = out.state
    value = out.resolution.value
    line.text = out.resolution.text
  } catch (error) {
    if (!(error instanceof OracleError)) throw error
    return { state, oracle, line: { ...line, error: error.message }, ticks }
  }
  const effects = effectsOf(value)
  const roller = onceRoller(options.random)
  const seen = { ...context, ...value }
  const territory: TerritoryEvent[] = []
  for (const [path, written] of Object.entries(effects)) {
    const change = resolveChange(written, seen, roller)
    const clock = /^world\.clocks\.(.+)$/.exec(path)
    if (clock) {
      ticks[clock[1]] = (ticks[clock[1]] ?? 0) + (typeof change === 'number' ? change : 0)
      continue
    }
    const [, who, rest] = /^(faction|factions\.[^.]+)\.(.+)$/.exec(path) ?? []
    if (!who) continue
    const id = who === 'faction' ? faction : who.slice('factions.'.length)
    if (rest === 'territory') {
      const by = typeof change === 'number' ? change : 0
      const done = changeTerritory(state.territories, id, by, options.world, options.random)
      state.territories = done.territories
      territory.push(...done.events)
      continue
    }
    const target = state.factions.findIndex((f) => f.id === id)
    if (target < 0 || !/^(values|conditions)\./.test(rest)) continue
    state.factions[target] = applyCharacter(
      system.sheet.def,
      state.factions[target],
      {
        type: 'change',
        effects: { [rest]: change },
        ...(options.time !== undefined && { time: options.time }),
      },
      { roller, context: seen },
    ).state
  }
  if (Object.keys(effects).length) line.effects = effects
  if (territory.length) line.territory = territory
  return { state, oracle, line, ticks }
}

/**
 * A world turn: every faction's turn, in order (each sees what the ones before it did).
 * Its moment becomes the last turn's.
 */
export function worldTurn(
  options: Parameters<typeof factionTurn>[0] & { time: number },
  input: FactionsState,
  oracleState: OracleState,
): {
  state: FactionsState
  oracle: OracleState
  lines: FactionLine[]
  ticks: Record<string, number>
} {
  let state = input
  let oracle = oracleState
  const lines: FactionLine[] = []
  const ticks: Record<string, number> = {}
  for (const f of input.factions) {
    const done = factionTurn(options, state, oracle, f.id)
    state = done.state
    oracle = done.oracle
    lines.push(done.line)
    for (const [id, n] of Object.entries(done.ticks)) ticks[id] = (ticks[id] ?? 0) + n
  }
  return { state: { ...state, lastTurn: options.time }, oracle, lines, ticks }
}

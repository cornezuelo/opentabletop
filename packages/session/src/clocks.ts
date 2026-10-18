import { OracleError, type OracleEngine, type OracleState } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import { qualify } from '@open-tabletop/travel-engine'
import { onceRoller, resolveChange } from '@open-tabletop/variables'
import type { ClockDef, ClocksDef, ClockThen } from '@open-tabletop/world-engine'
import { effectsOf } from './effects'
import { localize } from './index'

/** A system's progress clocks: what its pack declares (`kind: clocks`). */
export interface SystemClocks {
  /** `pack/id` of the definition. */
  id: string
  pack: string
  def: ClocksDef
}

/** A declared clock as the world clock starts it: its name in a language, its segments. */
export interface StartingClock {
  ref: string
  name: string
  segments: number
  filled: number
  noteRef?: string
}

/** The clocks a world starts with, in the pack's order (named in `locale`). */
export function startClocks(
  system: SystemClocks,
  locale: string,
  fallback?: string,
): StartingClock[] {
  return Object.entries(system.def.clocks).map(([ref, c]) => ({
    ref,
    name: clockName(ref, c, locale, fallback),
    segments: c.segments,
    filled: Math.min(c.filled ?? 0, c.segments),
    ...(c.noteRef && { noteRef: c.noteRef }),
  }))
}

/** A declared clock's name in a language (its id, as words, when it has none). */
export const clockName = (ref: string, c: ClockDef, locale: string, fallback?: string): string =>
  localize(c.name, locale, fallback) ?? ref.replaceAll('-', ' ')

/** What a full clock did: its words, the table rolled and what came up, its effects, then. */
export interface ClockFull {
  ref: string
  /** Its `onFull.description`, in the language asked. */
  description?: string
  /** The table it rolled, what came up, and why it failed if it did. */
  table?: string
  text?: string
  error?: string
  /** Changes to the world, read: `onFull.effects` and the result's own, numbers or `'=N'`. */
  effects: Record<string, number | string>
  then: ClockThen
}

/**
 * What happens when a declared clock fills: its `onFull` description, the table it rolls
 * (with the host's facts, as a world turn's), and the effects of both, with their
 * variables and dice read (`'{{1d3}}'`). Applying them (other clocks, factions) and keeping,
 * resetting or removing the clock is the host's. Undefined for a clock not declared.
 */
export function clockFull(
  options: {
    system: SystemClocks
    oracle: OracleEngine
    random: RandomSource
    facts?: Record<string, unknown>
    locale?: string
    fallback?: string
  },
  oracleState: OracleState,
  ref: string,
): { full: ClockFull; oracle: OracleState } | undefined {
  const def = options.system.def.clocks[ref]
  if (!def) return undefined
  const on = def.onFull ?? {}
  const locale = options.locale ?? 'en'
  const description = localize(on.description, locale, options.fallback)
  const full: ClockFull = {
    ref,
    ...(description && { description }),
    effects: {},
    then: on.then ?? 'keep',
  }
  // The host's facts by their short and full names (`clocks.x`, `world.clocks.x`).
  const facts = qualify(options.facts ?? {})
  let oracle = oracleState
  let value: Record<string, unknown> = {}
  if (on.resolve) {
    const table = on.resolve.includes('/') ? on.resolve : `${options.system.pack}/${on.resolve}`
    full.table = table
    try {
      const out = options.oracle.resolve(table, facts, oracleState, { locale })
      oracle = out.state
      value = out.resolution.value
      full.text = out.resolution.text
    } catch (error) {
      if (!(error instanceof OracleError)) throw error
      full.error = error.message
    }
  }
  const roller = onceRoller(options.random)
  const seen = { ...facts, ...value }
  // Its own effects, then the result's: numbers on the same value add up.
  for (const source of [on.effects ?? {}, effectsOf(value)])
    for (const [path, written] of Object.entries(source)) {
      const change = resolveChange(
        typeof written === 'boolean' ? String(written) : written,
        seen,
        roller,
      )
      const before = full.effects[path]
      full.effects[path] =
        typeof change === 'number' && typeof before === 'number' ? before + change : change
    }
  return { full, oracle }
}

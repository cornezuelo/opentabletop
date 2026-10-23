import { matches, type Condition } from '@open-tabletop/conditions'
import { OracleError, type OracleEngine, type OracleState } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import { qualify } from '@open-tabletop/travel-engine'
import { lookupIn, onceRoller, render, resolveChange } from '@open-tabletop/variables'
import type { WorldRules, WorldStep } from '@open-tabletop/world-engine'
import { effectsOf } from './effects'
import { definitionId } from './refs'
import { localize } from './index'

/** A system's world rules: what its pack declares (`kind: world`, `world:` in `kind: system`). */
export interface SystemWorld {
  /** `pack/id` of the definition. */
  id: string
  pack: string
  def: WorldRules
}

/** What the world reads and rolls with: its rules, the Oracle, randomness and language. */
export interface WorldReading {
  system: SystemWorld
  oracle: OracleEngine
  random: RandomSource
  locale?: string
  fallback?: string
}

/** A line a reaction's step writes on the timeline: its words, or what a roll came up with. */
export type ReactionLine = { say: string } | { table: string; text?: string; error?: string }

/** What one step of a reaction does: a line, changes to the world, another reaction or a turn. */
export interface StepDone {
  line?: ReactionLine
  /** Changes to the world, read: numbers or `'=N'` and texts, its own and its result's. */
  effects: Record<string, number | string>
  /** What it brings: `world.turn`, or `world.reactions.<id>`. */
  do?: string
  oracle: OracleState
}

/** Whether a `when` holds and an `unless` doesn't, seen by the world's facts. */
export function worldHolds(
  facts: Record<string, unknown>,
  on: { when?: Record<string, unknown>; unless?: Record<string, unknown> },
): boolean {
  const seen = qualify(facts)
  return (
    (on.when === undefined || matches(on.when as Condition, seen)) &&
    !(on.unless !== undefined && matches(on.unless as Condition, seen))
  )
}

/**
 * What one step of a world reaction does, seen by the world's facts (by their short and
 * full names): nothing if its `when` / `unless` don't hold; else its words with their
 * variables written, the table it rolls (its text and effects), its effects with their
 * variables and dice read (`'{{1d3}}'`), or what it brings. Applying it is the host's.
 */
export function worldStep(
  options: WorldReading,
  oracleState: OracleState,
  step: WorldStep,
  facts: Record<string, unknown> = {},
): StepDone | undefined {
  if (!worldHolds(facts, step)) return undefined
  const seen = qualify(facts)
  const roller = onceRoller(options.random)
  const locale = options.locale ?? 'en'
  const done: StepDone = { effects: {}, oracle: oracleState }
  if (step.say !== undefined) {
    const said = localize(step.say, locale, options.fallback) ?? ''
    done.line = { say: render(said, lookupIn(seen, roller)) }
  }
  if (step.do !== undefined) done.do = step.do
  let value: Record<string, unknown> = {}
  if (step.roll !== undefined) {
    const table = definitionId(step.roll, options.system.pack)
    const line: ReactionLine = { table }
    try {
      const out = options.oracle.resolve(table, seen, oracleState, { locale })
      done.oracle = out.state
      value = out.resolution.value
      line.text = out.resolution.text
    } catch (error) {
      if (!(error instanceof OracleError)) throw error
      line.error = error.message
    }
    done.line = line
  }
  const read = { ...seen, ...value }
  // Its own effects, then the result's: numbers on the same value add up.
  for (const source of [step.effects ?? {}, effectsOf(value)])
    for (const [path, written] of Object.entries(source)) {
      const change = resolveChange(
        typeof written === 'boolean' ? String(written) : written,
        read,
        roller,
      )
      const before = done.effects[path]
      done.effects[path] =
        typeof change === 'number' && typeof before === 'number' ? before + change : change
    }
  return done
}

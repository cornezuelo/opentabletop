import { matches, type Condition } from '@open-tabletop/conditions'
import { OracleError, type OracleEngine, type OracleState } from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import { qualify } from '@open-tabletop/travel-engine'
import { lookupIn, onceRoller, render, resolveChange } from '@open-tabletop/variables'
import { choiceIds, paramOf, type WorldRules, type WorldStep } from '@open-tabletop/world-engine'
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

/**
 * What a step waits for: the player to go on (a pause, with its words written, if any), or
 * to choose a parameter's value (`ask`, the parameter's id).
 */
export type WorldHold = { pause: true; text?: string } | { ask: string }

/**
 * What one step of a reaction does: a line, changes to the world, another reaction or a
 * turn, or the world waiting for the player.
 */
export interface StepDone {
  line?: ReactionLine
  /** Changes to the world, read: numbers or `'=N'` and texts, its own and its result's. */
  effects: Record<string, number | string>
  /** What it brings: `world.turn`, or `world.reactions.<id>`. */
  do?: string
  hold?: WorldHold
  oracle: OracleState
}

/** A question of a reaction: its parameter's name, and its choices by value and name. */
export interface WorldQuestion {
  question: string
  description?: string
  choices: { id: string; name: string; description?: string }[]
}

/**
 * What a reaction's `ask:` asks (`param`, its id), in a language: the parameter's name (its
 * id if it has none) and each choice's (its value if it has none); undefined if the reaction
 * declares no such parameter.
 */
export function worldQuestion(
  system: SystemWorld,
  reaction: string,
  param: string,
  locale: string,
  fallback?: string,
): WorldQuestion | undefined {
  const p = system.def.reactions[reaction]?.params?.[param]
  if (!p) return undefined
  const ids = choiceIds(p)
  const description = localize(p.description, locale, fallback)
  return {
    question: localize(p.name, locale, fallback) ?? param,
    ...(description && { description }),
    choices: p.choices.map((c, i) => {
      const about = typeof c === 'object' ? localize(c.description, locale, fallback) : undefined
      return {
        id: ids[i],
        name: (typeof c === 'object' && localize(c.name, locale, fallback)) || ids[i],
        ...(about && { description: about }),
      }
    }),
  }
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
  if (step.pause !== undefined) {
    const said = step.pause === true ? undefined : localize(step.pause, locale, options.fallback)
    done.hold = { pause: true, ...(said && { text: render(said, lookupIn(seen, roller)) }) }
  }
  const asked = paramOf(step.ask)
  if (asked !== undefined) done.hold = { ask: asked }
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

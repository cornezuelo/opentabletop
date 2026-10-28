import { validateCondition } from '@open-tabletop/conditions'
import { z } from 'zod'

/**
 * The world's rules as data (`kind: world`, named by `world:` in `kind: system`): what the
 * world does by itself, without a trip, when something happens in it. Each reaction is
 * written as a trip's action is: the moments it comes at (`on:`), conditions on it, and
 * steps that say a line on the timeline, roll a table, change clocks and factions, bring
 * another reaction or a world turn, or wait for the player (a pause, a question). This
 * engine reads and checks them; playing them (facts, the Oracle, the campaign) is the
 * integration layer's.
 */

const text = z.union([z.string(), z.record(z.string(), z.string())])
const condition = z.record(z.string(), z.unknown())

/** The moment after every world turn (every faction took its turn). */
export const WORLD_TURN = 'world.turn'
/** The moment a clock fills: `world.clocks.<id>.full`, by its declared id or its name as an id. */
export const clockFullMoment = (id: string): string => `world.clocks.${id}.full`
const FULL = /^world\.clocks\.([a-z0-9]+(?:-[a-z0-9]+)*)\.full$/
/** The clock a moment names filling (`world.clocks.<id>.full` → `<id>`), if it's one. */
export const fullClockOf = (moment: string): string | undefined => FULL.exec(moment)?.[1]
/** How a step names another reaction of the world: `world.reactions.<id>`. */
export const reactionRef = (id: string): string => `world.reactions.${id}`
const REACTION_REF = /^world\.reactions\.(.+)$/
/** The reaction a `do:` names (`world.reactions.<id>` → `<id>`), if it names one. */
export const reactionOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? REACTION_REF.exec(value)?.[1] : undefined

/**
 * A moment written as a condition: it comes once as the condition turns true, and again
 * only after it stopped holding.
 */
const whenMoment = z
  .object({ when: condition.optional(), unless: condition.optional() })
  .strict()
  .refine((r) => r.when !== undefined || r.unless !== undefined, {
    message: 'a moment written as a condition needs when or unless',
  })
const moment = z.union([z.string().min(1), whenMoment])
const moments = z.union([moment, z.array(moment).min(1)])
export type WorldMoment = z.infer<typeof moment>
export type WorldMoments = z.infer<typeof moments>

/** What a step of the world can do: one of these, and only one. */
export const WORLD_STEP_KINDS = ['say', 'roll', 'effects', 'do', 'pause', 'ask'] as const
export type WorldStepKind = (typeof WORLD_STEP_KINDS)[number]
/** Steps of a trip's actions that need a party or a trip: never the world's. */
const TRIP_STEPS = [
  'time',
  'travel.move',
  'travel.speed',
  'travel.advance',
  'travel.mode',
  'set',
  'wait',
  'limit',
  'with',
]

/** How a step names one of its reaction's parameters: `params.<id>`. */
const PARAM_REF = /^params\.(.+)$/
/** The parameter an `ask:` names (`params.<id>` → `<id>`), if it names one. */
export const paramOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? PARAM_REF.exec(value)?.[1] : undefined

const step = z
  .object({
    /** Names the step for its translations (`say:` in `locales/`). */
    id: z.string().min(1).optional(),
    when: condition.optional(),
    unless: condition.optional(),
    /** A line on the timeline. */
    say: text.optional(),
    /** A table, oracle, generator or deck rolled: its text on the timeline, its effects applied. */
    roll: z.string().min(1).optional(),
    /** Changes to the world: clocks (`world.clocks.<id>`) and factions (`factions.<id>.…`). */
    effects: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
    /** Another reaction of the world (`world.reactions.<id>`), or a world turn (`world.turn`). */
    do: z.string().min(1).optional(),
    /** The world waits for the player to go on, saying this (or nothing: `true`). */
    pause: z.union([z.literal(true), text]).optional(),
    /** The world waits for the player to choose one of a parameter's choices (`params.<id>`). */
    ask: z.string().min(1).optional(),
  })
  .strict()
  .refine((s) => WORLD_STEP_KINDS.filter((k) => s[k] !== undefined).length === 1, {
    message: `a step does one thing: ${WORLD_STEP_KINDS.join(', ')}`,
  })
export type WorldStep = z.infer<typeof step>

/** A choice of a parameter: a value, or one with a name and a description. */
const choice = z.union([
  z.string().min(1),
  z.number(),
  z
    .object({
      id: z.union([z.string().min(1), z.number()]),
      name: text.optional(),
      description: text.optional(),
    })
    .strict(),
])
/** A parameter of a reaction, asked of the player (`ask: params.<id>`), read as `params.<id>`. */
const param = z
  .object({
    name: text.optional(),
    description: text.optional(),
    choices: z.array(choice).min(1),
  })
  .strict()
export type WorldParam = z.infer<typeof param>

/** A parameter's choices by their values, as text (`['clans', 'vale']`). */
export const choiceIds = (p: WorldParam): string[] =>
  p.choices.map((c) => String(typeof c === 'object' ? c.id : c))

const reaction = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /** What it may ask the player (`ask: params.<id>`), its steps reading the answer. */
    params: z.record(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), param).optional(),
    /** When it comes: `world.turn`, `world.clocks.<id>.full`, or a condition (`{ when: … }`). */
    on: moments,
    /** Only while this holds (and `unless` doesn't), seen as it comes. */
    when: condition.optional(),
    unless: condition.optional(),
    do: z.array(step).min(1),
  })
  .strict()
export type WorldReaction = z.infer<typeof reaction>

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const worldRulesSchema = z
  .object({
    kind: z.literal('world'),
    id: z.string().min(1),
    name: text.optional(),
    description: text.optional(),
    reactions: z.record(z.string().regex(ID), reaction).default({}),
  })
  .strict()
export type WorldRules = z.infer<typeof worldRulesSchema>

/** The moments a reaction's `on:` names, as written: a name, or a condition. */
export function momentList(on: WorldMoments | undefined): WorldMoment[] {
  return on === undefined ? [] : Array.isArray(on) ? on : [on]
}

/**
 * The reactions that come at a named moment (`world.turn`, `world.clocks.x.full`, any of
 * `names`), in the order the rules declare them.
 */
export function reactionsAt(rules: WorldRules | undefined, ...names: string[]): string[] {
  return Object.entries(rules?.reactions ?? {})
    .filter(([, r]) => momentList(r.on).some((m) => typeof m === 'string' && names.includes(m)))
    .map(([id]) => id)
}

/** A moment written as a condition, and the key its memory goes by (`<reaction>:<index>`). */
export interface WorldCondition {
  key: string
  reaction: string
  when?: Record<string, unknown>
  unless?: Record<string, unknown>
}

/** Every moment written as a condition, in declared order. */
export function worldConditions(rules: WorldRules | undefined): WorldCondition[] {
  return Object.entries(rules?.reactions ?? {}).flatMap(([id, r]) =>
    momentList(r.on).flatMap((m, i): WorldCondition[] =>
      typeof m === 'object' ? [{ key: `${id}:${i}`, reaction: id, ...m }] : [],
    ),
  )
}

/** Reads a `kind: world` definition: it, or the problems found (`path: message`). */
export function parseWorldRules(raw: unknown): { rules?: WorldRules; errors: string[] } {
  const errors: string[] = []
  // Steps a trip has and the world doesn't, said plainly before the schema refuses them.
  const reactions = (raw as { reactions?: unknown } | null)?.reactions
  if (reactions && typeof reactions === 'object')
    for (const [id, r] of Object.entries(reactions as Record<string, { do?: unknown }>))
      if (Array.isArray(r?.do))
        r.do.forEach((s: unknown, i) => {
          if (!s || typeof s !== 'object') return
          for (const key of Object.keys(s))
            if (TRIP_STEPS.includes(key))
              errors.push(
                `reactions.${id}.do.${i}.${key}: a step of a trip, not of the world (it does ${WORLD_STEP_KINDS.join(', ')})`,
              )
        })
  if (errors.length) return { errors }
  const parsed = worldRulesSchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'world'}: ${i.message}`),
    }
  const rules = parsed.data
  const ids = Object.keys(rules.reactions)
  for (const [id, r] of Object.entries(rules.reactions)) {
    const at = `reactions.${id}`
    const list = momentList(r.on)
    list.forEach((m, i) => {
      const where = Array.isArray(r.on) ? `${at}.on.${i}` : `${at}.on`
      if (typeof m === 'object') {
        for (const key of ['when', 'unless'] as const)
          if (m[key] !== undefined)
            for (const problem of validateCondition(m[key], key))
              errors.push(`${where}: ${problem}`)
      } else if (m !== WORLD_TURN && !fullClockOf(m))
        errors.push(`${where}: expected ${WORLD_TURN}, world.clocks.<id>.full or { when: … }`)
    })
    for (const key of ['when', 'unless'] as const)
      if (r[key] !== undefined)
        for (const problem of validateCondition(r[key], key)) errors.push(`${at}: ${problem}`)
    r.do.forEach((s, i) => {
      for (const key of ['when', 'unless'] as const)
        if (s[key] !== undefined)
          for (const problem of validateCondition(s[key], key))
            errors.push(`${at}.do.${i}: ${problem}`)
      if (s.ask !== undefined) {
        const declared = Object.keys(r.params ?? {})
        if (!declared.includes(paramOf(s.ask) ?? ''))
          errors.push(
            `${at}.do.${i}.ask: expected ${declared.length ? declared.map((p) => `params.${p}`).join(', ') : 'params.<id>, a parameter the reaction declares (params:)'}`,
          )
      }
      if (s.do === undefined || s.do === WORLD_TURN) return
      const other = reactionOf(s.do)
      if (!other || !ids.includes(other))
        errors.push(
          `${at}.do.${i}.do: expected ${[WORLD_TURN, ...ids.map(reactionRef)].join(', ')}`,
        )
    })
  }
  if (errors.length) return { errors }
  const loop = worldLoop(rules)
  if (loop)
    return {
      errors: [`reactions.${loop[0]}: reactions bring each other in a loop: ${loop.join(' → ')}`],
    }
  return { rules, errors }
}

/**
 * The named moments a reaction's own steps bring: a world turn, a clock it fills (a
 * positive change, or `'=N'`). Those of the reactions it does are theirs.
 */
function bringsOf(rules: WorldRules, id: string): Set<string> {
  const out = new Set<string>()
  for (const s of rules.reactions[id]?.do ?? []) {
    if (s.do === WORLD_TURN) out.add(WORLD_TURN)
    for (const [path, change] of Object.entries(s.effects ?? {})) {
      const clock = /^world\.clocks\.(.+)$/.exec(path)?.[1]
      const written = typeof change === 'string' ? /^\s*=?\s*\+?\s*(\d+)\s*$/.exec(change) : null
      const fills = (typeof change === 'number' && change > 0) || Number(written?.[1]) > 0
      if (clock && fills) out.add(clockFullMoment(clock))
    }
  }
  return out
}

/**
 * A loop of reactions bringing each other (one's steps bring a moment another comes at, or
 * a `do:` takes it), as the reactions along it, the first again at the end; undefined when
 * there is none. Moments written as conditions can't be followed (what makes one true
 * depends on the numbers): those are bounded while playing.
 */
export function worldLoop(rules: WorldRules): string[] | undefined {
  const ids = Object.keys(rules.reactions)
  const next = (id: string): string[] => {
    const brings = bringsOf(rules, id)
    const done = (rules.reactions[id]?.do ?? []).flatMap((s) => reactionOf(s.do) ?? [])
    return ids.filter(
      (other) =>
        done.includes(other) ||
        momentList(rules.reactions[other].on).some((m) => typeof m === 'string' && brings.has(m)),
    )
  }
  const state = new Map<string, 'open' | 'done'>()
  const path: string[] = []
  const visit = (id: string): string[] | undefined => {
    if (state.get(id) === 'open') return [...path.slice(path.indexOf(id)), id]
    if (state.get(id) === 'done') return undefined
    state.set(id, 'open')
    path.push(id)
    for (const other of next(id)) {
      const found = visit(other)
      if (found) return found
    }
    path.pop()
    state.set(id, 'done')
    return undefined
  }
  for (const id of ids) {
    const found = visit(id)
    if (found) return found
  }
  return undefined
}

import { dayClock, PART_REF } from './day'
import type { Calendar } from '@open-tabletop/time'
import { matches, validateCondition, type Condition } from '@open-tabletop/conditions'
import type { Bounds, Roller } from '@open-tabletop/variables'
import { z } from 'zod'

const clock = z.string().regex(/^\d{1,2}:\d{2}$/, 'times look like "06:00"')
/** A part of the calendar's day: `<division>.<part>` (`meal.supper`). */
const partRef = z.string().regex(PART_REF, 'a part of the day looks like "meal.supper"')
/** A moment of the day: a clock, or when a part of the calendar's day starts. */
const dayMoment = z.union([clock, partRef])
const condition = z.record(z.string(), z.unknown())
/** Text in one or several languages: "Forage" or { en: Forage for food, es: Buscar comida }. */
const text = z.union([z.string(), z.record(z.string(), z.string())])

/**
 * Moments of the trip for checks and triggered actions (`at:` / `on:`), besides a clock
 * (`'06:00'`), a part of the calendar's day (`part.morning`) and the system's actions
 * (`at: camp`).
 */
export const CHECK_MOMENTS = ['hex-enter', 'day-end'] as const
/** A moment that's a clock (`'06:00'`): when it strikes. */
export const CLOCK = /^\d{1,2}:\d{2}$/
/** Whether a moment or a time is a clock (`'06:00'`). */
export const isClock = (value: unknown): value is string =>
  typeof value === 'string' && CLOCK.test(value)
/** One moment (`hex-enter`, an action's id…) or several (`[part.morning, hex-enter]`). */
const moments = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])

/** The moments an action's `on:` or a check's `at:` names, as a list (none: empty). */
export function momentsOf(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

/**
 * Marching: the Travel buttons, not a button of its own. Its `when` / `unless` say when
 * the party can march, checked as it marches (it stops when they no longer hold); it has
 * no steps. Without it, the party marches whenever nothing else stops it (a value of the
 * day, the weather, the way).
 */
export const MARCH = 'march'
/** What a declared value can block besides actions: going on with the trip. */
export const BLOCKABLE = ['travel'] as const

// `true` / `false` set and clear a character's condition (`acting.conditions.wounded: true`);
// read as text, like every other change.
const effects = z.record(
  z.string(),
  z.union([z.number(), z.string(), z.boolean().transform((b) => String(b))]),
)

/**
 * Whether a terrain can be entered: `false` never, `true` (or missing) always, or `{ when,
 * unless }`: only while `when` holds and `unless` doesn't, seen from the hex entered (its
 * terrain, tags, region, fields, the roads or rivers of the step, the mode, the weather,
 * the season and calendar, today's values), e.g. a pass closed `unless: { season: winter }`.
 */
const passable = z.union([
  z.boolean(),
  z.object({ when: condition.optional(), unless: condition.optional() }).strict(),
])

/**
 * One step of an action (`do:`), doing one thing, optionally only `when` (or `unless`) a
 * condition holds: pass time (`time: 180`, until a clock: `time: '14:00'`, or until a part
 * of the calendar's day starts: `time: meal.luncheon`), change the rest of today's march (`speed: 0.5`), apply effects (`effects: {
 * party.stats.fatigue: -1 }`; a change past a value's `min` / `max` stops there, and later
 * steps see `below` / `above`), take another action (`do: forage`, with its conditions),
 * roll a check now (`roll: <its event>`) or set values of the day (`set: { lost: true }`).
 */
const step = z
  .object({
    when: condition.optional(),
    unless: condition.optional(),
    time: z.union([z.number().nonnegative(), clock, partRef]).optional(),
    speed: z.number().nonnegative().optional(),
    effects: effects.optional(),
    do: z.string().min(1).optional(),
    roll: z.string().min(1).optional(),
    set: z.record(z.string(), z.unknown()).optional(),
    /**
     * Moves the party along its route this many hexes (legs of a way) at once, without
     * time passing: progress made by a move, not by marching. A number or a variable
     * (`'{{party.stats.rank}}'`).
     */
    advance: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
  })
  .strict()
  .refine(
    (s) =>
      [s.time, s.speed, s.effects, s.do, s.roll, s.set, s.advance].filter((x) => x !== undefined)
        .length === 1,
    'a step does one thing: time, speed, effects, do, roll, set or advance',
  )

/** What a step does: the one key it has besides `when` / `unless`. */
export const STEP_KINDS = ['time', 'speed', 'effects', 'do', 'roll', 'set', 'advance'] as const

/**
 * An action of the party (`actions.forage`, and camp and rest too): what it does as steps
 * (`do`), when it can be taken (`when` / `unless`, `oncePerDay`); its checks are the ones
 * with `at: <its id>`.
 */
const action = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /**
     * What the journal says when none of its checks come up where the party is, e.g.
     * "Nothing to forage on {terrain}" (`{terrain}` is the hex's terrain).
     */
    nothing: text.optional(),
    /** What it does, in order. */
    do: z.array(step).optional(),
    /**
     * The system takes it by itself at this moment (`hex-enter`, `day-end`, a clock, a part
     * of the calendar's day, or when one of its actions is taken), or at each of several
     * (`[part.morning, hex-enter]`), if its conditions hold; it isn't a button then. It runs before that
     * moment's checks, and its conditions see which moment it is (`moment`).
     */
    on: moments.optional(),
    /** Only available when this holds (the trip's facts, today's values, the party). */
    when: condition.optional(),
    /** Not available when this holds, e.g. `{ forageImpossible: true }`. */
    unless: condition.optional(),
    /** Only once a day. */
    oncePerDay: z.boolean().optional(),
    /** Its button is hidden while it can't be taken (instead of shown disabled). */
    hideWhenUnavailable: z.boolean().optional(),
  })
  .strict()

/**
 * A value the system declares for the day (`lost`, `stranded`…): results set it (`set: {
 * lost: true }`), it lasts until the day ends (tables read it the day after as
 * `yesterday.<id>`), and while it holds (any value but false) it `blocks` what it names:
 * `travel`, or actions by id.
 */
const dayValue = z
  .object({
    name: text.optional(),
    description: text.optional(),
    lasts: z.literal('day').optional(),
    blocks: z.array(z.string().min(1)).optional(),
  })
  .strict()

const checkRule = z
  .object({
    /** Event name emitted as CHECK_REQUIRED, e.g. ENCOUNTER_CHECK_REQUIRED. */
    event: z.string().min(1),
    /** What players read instead of the event name: "Getting lost", in one or several languages. */
    name: text.optional(),
    /** What it is about, shown as its tooltip. */
    description: text.optional(),
    /**
     * hex-enter, day-end, a clock (`'06:00'`), a part of the calendar's day (`part.morning`)
     * or the id of one of the system's actions, or several of them (`[hex-enter, camp]`;
     * its conditions see which one it is: `moment`).
     * Without it, only an action's step rolls it (`roll: <event>`).
     */
    at: moments.optional(),
    /** Skip the check when this matches the check context (terrain, edges, weather, mode…). */
    unless: condition.optional(),
    /** Only check when this matches. */
    when: condition.optional(),
    /**
     * Effects of the check itself (`party.stats.fatigue: 1`): applied when it comes up,
     * without a table (or besides the table's).
     */
    effects: effects.optional(),
    /** Stop the trip after it comes up (rolled or not), until the player presses Continue. */
    pause: z.boolean().optional(),
  })
  .strict()

/** Travel rules as data (`kind: travel-rules` in a pack). Nothing system-specific in code. */
export const travelRulesSchema = z
  .object({
    kind: z.literal('travel-rules').optional(),
    id: z.string().optional(),
    travel: z
      .object({
        /** The hours a way of travelling's `kmPerDay` is marched in (its speed's scale). */
        hoursPerDay: z.number().positive().max(24),
        /** The scale the system is played at: km a hex measures (maps may set their own). */
        hexKm: z.number().positive().optional(),
        /** When a new trip starts on its first day: a clock or a part (default: midnight). */
        start: dayMoment.optional(),
        /**
         * What the party does when it can't march and the trip goes on by itself: from the
         * moment `at` (a clock or a part) until the day ends, a party that isn't marching
         * takes the action `do`, once a day; when it can't, the journal says so and the
         * time passes until it can march. Without it, the trip just waits.
         */
        halt: z
          .object({ at: dayMoment, do: z.string().min(1) })
          .strict()
          .optional(),
      })
      .strict(),
    terrains: z.record(
      z.string(),
      z
        .object({
          multiplier: z.number().nonnegative().optional(),
          passable: passable.optional(),
        })
        .strict(),
    ),
    /**
     * Water hexes (the map marks their terrain as water) whose terrain isn't listed above,
     * e.g. `{ passable: false }`; a mode whose `through` holds on water still sails them.
     */
    water: z
      .object({
        multiplier: z.number().nonnegative().optional(),
        passable: passable.optional(),
      })
      .strict()
      .optional(),
    /** Multiplier for terrains not listed (default 1). */
    defaultTerrain: z.object({ multiplier: z.number().nonnegative() }).strict().optional(),
    /** Edge kinds (road, river…); an edge with a multiplier replaces the terrain's. */
    edges: z
      .record(z.string(), z.object({ multiplier: z.number().positive().optional() }).strict())
      .optional(),
    modes: z.record(
      z.string(),
      z
        .object({
          /** What players read: "On horseback" (translated in locales/). */
          name: text.optional(),
          description: text.optional(),
          kmPerDay: z.number().positive(),
          /**
           * Where it can go: a condition on each hex it enters (its terrain, water, tags,
           * region, fields, the roads or rivers of the step…), e.g. a boat on water or coast.
           * Where it holds, the terrain's own `passable: false` doesn't stop it.
           */
          through: condition.optional(),
          /** It can only be chosen when this holds, e.g. a boat at the water's edge. */
          when: condition.optional(),
          /** It can't be chosen when this holds. */
          unless: condition.optional(),
        })
        .strict(),
    ),
    resources: z
      .record(
        z.string(),
        z
          .object({
            /** What players read: "Food", "Rations" (translated in locales/). */
            name: text.optional(),
            description: text.optional(),
            /** Effects never take it below / above these (none: it may go negative). */
            min: z.number().optional(),
            max: z.number().optional(),
          })
          .strict(),
      )
      .optional(),
    /** Effect of weather states on movement (0 = no travel). */
    weather: z
      .record(z.string(), z.object({ speed: z.number().nonnegative().optional() }).strict())
      .optional(),
    checks: z.array(checkRule).optional(),
    /** Values of the day the system declares (`lost`), with what they block. */
    values: z.record(z.string(), dayValue).optional(),
    /**
     * The party's actions, only the ones the system declares (camp, forage…); `march` says
     * when the party can march.
     */
    actions: z.record(z.string(), action).optional(),
  })
  .strict()
  .superRefine((rules, ctx) => {
    const actionIds = Object.keys(availableActions(rules as TravelRules).all)
    // Marching is no moment and no step: the Travel buttons and their conditions.
    const taken = actionIds.filter((id) => id !== MARCH)
    const moments = [...CHECK_MOMENTS, ...taken]
    const badMoments = (value: string | string[] | undefined, path: (string | number)[]) =>
      momentsOf(value).forEach((moment, j) => {
        // A part of the calendar's day (`meal.elevenses`): checked against the calendar.
        if (!moments.includes(moment) && !PART_REF.test(moment) && !CLOCK.test(moment))
          ctx.addIssue({
            code: 'custom',
            path: Array.isArray(value) ? [...path, j] : path,
            message: `expected ${moments.join(', ')}, a clock (06:00) or a part of the day (meal.supper)`,
          })
      })
    rules.checks?.forEach((check, i) => badMoments(check.at, ['checks', i, 'at']))
    const blockable = [
      ...BLOCKABLE,
      ...actionIds,
      ...Object.keys(rules.modes).map((m) => `mode.${m}`),
    ]
    for (const [id, value] of Object.entries(rules.values ?? {}))
      value.blocks?.forEach((what, i) => {
        if (!blockable.includes(what))
          ctx.addIssue({
            code: 'custom',
            path: ['values', id, 'blocks', i],
            message: `expected ${blockable.join(', ')}`,
          })
      })
    const events = [...new Set((rules.checks ?? []).map((c) => c.event))]
    const values = Object.keys(declaredValues(rules as TravelRules))
    for (const [id, a] of Object.entries(rules.actions ?? {})) {
      badMoments(a.on, ['actions', id, 'on'])
      if (id === MARCH)
        for (const key of ['do', 'on', 'oncePerDay', 'hideWhenUnavailable'] as const)
          if (a[key] !== undefined)
            ctx.addIssue({
              code: 'custom',
              path: ['actions', id, key],
              message: 'marching has no steps: its when / unless say when the party can march',
            })
      a.do?.forEach((st, i) => {
        if (st.do !== undefined && !taken.includes(st.do))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'do'],
            message: `expected ${taken.join(', ')}`,
          })
        if (st.roll !== undefined && !events.includes(st.roll))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'roll'],
            message: events.length ? `expected ${events.join(', ')}` : 'the system has no checks',
          })
        for (const key of Object.keys(st.set ?? {}))
          if (!values.includes(key))
            ctx.addIssue({
              code: 'custom',
              path: ['actions', id, 'do', i, 'set', key],
              message: values.length
                ? `expected ${values.join(', ')}`
                : 'the system declares no values of the day',
            })
      })
    }
    const halt = rules.travel.halt?.do
    if (halt !== undefined && !taken.includes(halt))
      ctx.addIssue({
        code: 'custom',
        path: ['travel', 'halt', 'do'],
        message: `expected ${taken.join(', ') || 'an action'}`,
      })
    const loop = actionLoop(rules as TravelRules)
    if (loop)
      ctx.addIssue({
        code: 'custom',
        path: ['actions', loop[0]],
        message: `actions take each other in a loop: ${loop.join(' → ')}`,
      })
  })

export type ActionDefinition = z.infer<typeof action>
export type ActionStep = z.infer<typeof step> & { when?: Condition; unless?: Condition }
export type DayValue = z.infer<typeof dayValue>

export type TravelRules = z.infer<typeof travelRulesSchema>

/** The values of the day a system declares (none if it declares none). */
export function declaredValues(rules: TravelRules): Record<string, DayValue> {
  return rules.values ?? {}
}

/**
 * When a new trip starts on its first day, as minutes of the day: the rules'
 * `travel.start`, or midnight.
 */
export function tripStart(rules: TravelRules, calendar: Calendar): number {
  const start = rules.travel.start
  return start === undefined ? 0 : dayClock(start, calendar, '00:00')
}

/** The system's actions, by id, in the order the rules list them. */
export function availableActions(rules: TravelRules): {
  all: Record<string, ActionDefinition>
} {
  return { all: { ...rules.actions } }
}

/**
 * How long an action lasts when only fixed times pass (`time: 120`), in minutes;
 * undefined when it waits for a moment (dawn) or passes no time.
 */
export function actionMinutes(def: ActionDefinition): number | undefined {
  const steps = actionSteps(def)
  if (steps.some((s) => s.time !== undefined && typeof s.time !== 'number')) return undefined
  const minutes = steps.reduce((n, s) => n + (typeof s.time === 'number' ? s.time : 0), 0)
  return minutes || undefined
}

/** The bounds of a value: effects never take it past them. */
export type { Bounds }
/** Moved to `@open-tabletop/variables`, shared with the other engines. */
export { changeValue, resolveChange } from '@open-tabletop/variables'

/** The bounds of each supply: the `min` / `max` it declares, or none. */
export function resourceBounds(rules: TravelRules): Record<string, Bounds> {
  return Object.fromEntries(
    Object.entries(rules.resources ?? {}).map(([id, r]) => [
      id,
      {
        ...(r.min !== undefined && { min: r.min }),
        ...(r.max !== undefined && { max: r.max }),
      },
    ]),
  )
}

/**
 * A loop of actions taking each other (`do:` steps, or `on:` another action), as the ids
 * along it; undefined when there is none.
 */
export function actionLoop(rules: TravelRules): string[] | undefined {
  const all = availableActions(rules).all
  const next = (id: string): string[] => [
    ...(all[id]?.do ?? []).flatMap((s) => (s.do ? [s.do] : [])),
    ...Object.entries(all).flatMap(([other, def]) =>
      momentsOf(def.on).includes(id) ? [other] : [],
    ),
  ]
  const state = new Map<string, 'open' | 'done'>()
  const visit = (id: string, path: string[]): string[] | undefined => {
    if (state.get(id) === 'done') return undefined
    if (state.get(id) === 'open') return [...path.slice(path.indexOf(id)), id]
    state.set(id, 'open')
    for (const n of next(id)) {
      const loop = visit(n, [...path, id])
      if (loop) return loop
    }
    state.set(id, 'done')
    return undefined
  }
  for (const id of Object.keys(all)) {
    const loop = visit(id, [])
    if (loop) return loop
  }
  return undefined
}

/** An action's steps, its `do`. */
export function actionSteps(def: ActionDefinition): ActionStep[] {
  return (def.do ?? []) as ActionStep[]
}

export type CheckRule = z.infer<typeof checkRule> & { unless?: Condition; when?: Condition }

/** Name and description of a check event, from the first check with that event that has them. */
export function checkInfo(
  rules: TravelRules,
  event: string,
): { name?: string | Record<string, string>; description?: string | Record<string, string> } {
  const checks = rules.checks ?? []
  return {
    name: checks.find((c) => c.event === event && c.name !== undefined)?.name,
    description: checks.find((c) => c.event === event && c.description !== undefined)?.description,
  }
}

/** Where a way of travelling can go, as a condition (`through`); undefined: wherever terrains allow. */
export function modeThrough(mode: { through?: unknown }): Condition | undefined {
  return mode.through as Condition | undefined
}

export type Passable = z.infer<typeof passable>

/** Whether a terrain's `passable` lets the party in, given what it sees of the hex entered. */
export function isPassable(
  rule: Passable | undefined,
  context: () => Record<string, unknown>,
  /** Rolls the dice its conditions name (the engine's, fixed for the moment). */
  roller?: Roller,
): boolean {
  if (rule === undefined || rule === true) return true
  if (rule === false) return false
  const seen = context()
  return (
    (!rule.when || matches(rule.when as Condition, seen, { roller })) &&
    !(rule.unless && matches(rule.unless as Condition, seen, { roller }))
  )
}

/** Validates raw rules (YAML/JSON) and returns readable problems. */
export function parseTravelRules(raw: unknown): { rules?: TravelRules; errors: string[] } {
  const parsed = travelRulesSchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map(
        (i) => `${i.path.map(String).join('.') || 'rules'}: ${i.message}`,
      ),
    }
  const conditions = (c: { when?: unknown; unless?: unknown }, at: string) => [
    ...(c.unless ? validateCondition(c.unless as Condition, `${at}.unless`) : []),
    ...(c.when ? validateCondition(c.when as Condition, `${at}.when`) : []),
  ]
  const errors = [
    ...(parsed.data.checks ?? []).flatMap((check, i) => conditions(check, `checks[${i}]`)),
    ...[
      ...Object.entries(parsed.data.terrains).map(([id, t]) => [`terrains.${id}`, t] as const),
      ...(parsed.data.water ? [['water', parsed.data.water] as const] : []),
    ].flatMap(([at, t]) =>
      typeof t.passable === 'object' ? conditions(t.passable, `${at}.passable`) : [],
    ),
    ...Object.entries(parsed.data.modes).flatMap(([id, m]) => [
      ...conditions(m, `modes.${id}`),
      ...(m.through ? validateCondition(m.through as Condition, `modes.${id}.through`) : []),
    ]),
    ...Object.entries(parsed.data.actions ?? {}).flatMap(([id, a]) => [
      ...conditions(a, `actions.${id}`),
      ...(a.do ?? []).flatMap((st, i) => conditions(st, `actions.${id}.do[${i}]`)),
    ]),
  ]
  return errors.length ? { errors } : { rules: parsed.data, errors: [] }
}

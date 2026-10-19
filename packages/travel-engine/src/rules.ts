import { dayClock, PART_REF } from './day'
import type { Calendar } from '@open-tabletop/time'
import { matches, validateCondition, type Condition } from '@open-tabletop/conditions'
import { hasVariables, type Bounds, type Roller } from '@open-tabletop/variables'
import { z } from 'zod'

/**
 * Whether a moment of the day is a clock or a part of the calendar's day (`time.meal.supper`);
 * a part without `time.` says what it meant.
 */
const checkDayMoment = (value: unknown, ctx: z.RefinementCtx) => {
  if (typeof value !== 'string' || /^\d{1,2}:\d{2}$/.test(value) || PART_REF.test(value)) return
  const meant = PART_REF.test(`time.${value}`) ? ` (did you mean time.${value}?)` : ''
  ctx.addIssue({
    code: 'custom',
    message: `expected a clock (06:00) or a part of the day (time.meal.supper)${meant}`,
  })
}
/** A moment of the day: a clock, or when a part of the calendar's day starts. */
const dayMoment = z.string().superRefine(checkDayMoment)
const condition = z.record(z.string(), z.unknown())
/** Text in one or several languages: "Forage" or { en: Forage for food, es: Buscar comida }. */
const text = z.union([z.string(), z.record(z.string(), z.string())])

/** The moment the party enters a hex. */
export const HEX_ENTER = 'trip.hex-enter'
/** The moment each day ends. */
export const DAY_END = 'time.day-end'
/**
 * Moments of the trip for checks and triggered actions (`at:` / `on:`), besides a clock
 * (`'06:00'`), a part of the calendar's day (`time.part.morning`) and the system's actions
 * (`at: actions.camp`).
 */
export const CHECK_MOMENTS = [HEX_ENTER, DAY_END] as const

/** The kinds of definitions rules refer to by their full name (`actions.march`). */
export type RefKind = 'actions' | 'modes' | 'checks' | 'params'
/** A definition's full name: `ref('actions', 'march')` is `actions.march`. */
export const ref = (kind: RefKind, id: string): string => `${kind}.${id}`
/** The id a full name refers to, if it's of that kind: `refId('actions', 'actions.march')` is `march`. */
export function refId(kind: RefKind, value: unknown): string | undefined {
  return typeof value === 'string' && value.startsWith(`${kind}.`) && value.length > kind.length + 1
    ? value.slice(kind.length + 1)
    : undefined
}
/** The ids of a list of full names of a kind (the rest left out). */
const refIds = (kind: RefKind, values: string[]): string[] =>
  values.flatMap((v) => refId(kind, v) ?? [])
/** A moment that's a clock (`'06:00'`): when it strikes. */
export const CLOCK = /^\d{1,2}:\d{2}$/
/** Whether a moment or a time is a clock (`'06:00'`). */
export const isClock = (value: unknown): value is string =>
  typeof value === 'string' && CLOCK.test(value)
/** One moment (`trip.hex-enter`, `actions.camp`…) or several (`[time.part.morning, trip.hex-enter]`). */
const moments = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])

/** The moments an action's `on:` or a check's `at:` names, as a list (none: empty). */
export function momentsOf(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

/** What a declared value can block besides actions and ways of travelling: moving on. */
export const BLOCKABLE = ['travel.move'] as const

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

/** A parameter's value: a word or a number (`destination`, `3`). */
const paramValue = z.union([z.string().min(1), z.number()])
/** Values given to an action's parameters (`with: { until: hex }`), or variables. */
const given = z.record(z.string(), paramValue)

/** Where a `travel.move` step goes: the destination, the next hex, or a number of hexes. */
export const MOVE_TARGETS = ['destination', 'hex'] as const

/** A moment a step waits for: minutes from now, a clock (`'14:00'`) or a part (`time.meal.luncheon`). */
const until = z.union([z.number().nonnegative(), z.string()]).superRefine(checkDayMoment)

/**
 * One step of an action (`do:`), doing one thing, optionally only `when` (or `unless`) a
 * condition holds: pass time (`time: 180`, until a clock: `time: '14:00'`, or until a part
 * of the calendar's day starts: `time: time.meal.luncheon`), move along the route while time
 * passes (`travel.move: destination`), change the rest of today's moving (`travel.speed:
 * 0.5`), move at once (`travel.advance: 1`), change the way of travelling (`travel.mode:
 * modes.boat`), apply effects (`effects: { party.stats.fatigue: -1 }`; a change past a value's
 * `min` / `max` stops there, and later steps see `below` / `above`), take another action
 * (`do: actions.forage`, with its conditions, and `with:` its parameters), roll a check now
 * (`roll: checks.<its event>`), set values of the day (`set: { lost: true }`), write a line in
 * the journal (`say: The porters sing`), stop the trip until the player goes on (`pause:
 * true`, or what it says), ask the player to choose a parameter (`ask: params.how`), or let
 * time pass until a condition holds (`wait: { today.ferry: true }`, at most until `limit`).
 */
const step = z
  .object({
    /** Names the step for its translations (`say:`, `pause:` in `locales/`). */
    id: z.string().min(1).optional(),
    when: condition.optional(),
    unless: condition.optional(),
    time: until.optional(),
    /**
     * Moves the party along its route while time passes and the action's `when` / `unless`
     * hold: to the `destination`, to the next `hex`, or that many hexes (a number, or a
     * variable: `'{{params.until}}'`).
     */
    'travel.move': z.union([z.number().int().positive(), z.string().min(1)]).optional(),
    /** Multiplies the speed of the rest of today's moving (`0.5`: half as fast). */
    'travel.speed': z.number().nonnegative().optional(),
    /**
     * Moves the party along its route this many hexes (legs of a way) at once, without
     * time passing: progress made by a move, not by marching. A number or a variable
     * (`'{{party.stats.rank}}'`).
     */
    'travel.advance': z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
    /**
     * Changes the way of travelling (`modes.boat`, or a variable: `'{{params.by}}'`), if it can be
     * chosen now (its `when` / `unless`, what blocks it); the route is planned again for it.
     */
    'travel.mode': z.string().min(1).optional(),
    effects: effects.optional(),
    do: z.string().min(1).optional(),
    /** With `do:`, the values of that action's parameters (`with: { until: hex }`). */
    with: given.optional(),
    roll: z.string().min(1).optional(),
    set: z.record(z.string(), z.unknown()).optional(),
    /** A line of the system's own in the journal; `{{…}}` in it read at that moment. */
    say: text.optional(),
    /**
     * Stops the trip here until the player goes on (**Continue**): `true`, or what the
     * waiting box says (`{{…}}` read at that moment). Then the rest goes on.
     */
    pause: z.union([z.literal(true), text]).optional(),
    /**
     * Stops the trip and asks the player to choose one of this action's parameter's choices
     * (`ask: params.how`); later steps read it as `{{params.how}}`.
     */
    ask: z.string().min(1).optional(),
    /** Time passes until this condition holds, at most until `limit`. */
    wait: condition.optional(),
    /** With `wait:`, the most it waits: minutes, a clock or a part of the day (as `time:`). */
    limit: until.optional(),
  })
  .strict()
  .refine(
    (s) => STEP_KINDS.filter((kind) => s[kind] !== undefined).length === 1,
    'a step does one thing: time, travel.move, travel.speed, travel.advance, travel.mode, effects, do, roll, set, say, pause, ask or wait',
  )
  .refine((s) => s.with === undefined || s.do !== undefined, {
    message: 'with: gives the parameters of the action a do: step takes',
    path: ['with'],
  })
  .refine((s) => (s.limit !== undefined) === (s.wait !== undefined), {
    message: 'wait: needs a limit: (the most it waits), and limit: goes with wait:',
    path: ['limit'],
  })

/**
 * What a step does: the one key it has besides `id`, `when` / `unless` (and a `do:`'s
 * `with:`, a `wait:`'s `limit:`).
 */
export const STEP_KINDS = [
  'time',
  'travel.move',
  'travel.speed',
  'travel.advance',
  'travel.mode',
  'effects',
  'do',
  'roll',
  'set',
  'say',
  'pause',
  'ask',
  'wait',
] as const

/** One choice of a parameter: its value, or its value with a name (`{ id: hex, name: One hex }`). */
const choice = z.union([
  paramValue,
  z
    .object({
      id: paramValue,
      name: text.optional(),
      description: text.optional(),
    })
    .strict(),
])

/**
 * A parameter of an action (`params.until`): the choices it offers (the first is its
 * default, unless `default` says another), read by its steps as `{{params.<id>}}`.
 */
const param = z
  .object({
    name: text.optional(),
    description: text.optional(),
    choices: z.array(choice).min(1),
    default: paramValue.optional(),
  })
  .strict()

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
    /**
     * What a button, `do:` or the system may choose when taking it, read by its steps and
     * conditions as `{{params.<id>}}` (`params: { until: { choices: [destination, hex] } }`).
     */
    params: z.record(z.string(), param).optional(),
    /** What it does, in order. */
    do: z.array(step).optional(),
    /**
     * The system takes it by itself at this moment (`trip.hex-enter`, `time.day-end`, a clock,
     * a part of the calendar's day, or when one of its actions is taken: `actions.camp`), or at
     * each of several (`[time.part.morning, trip.hex-enter]`), if its conditions hold; it isn't a button then. It runs before that
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
 * `travel.move`, actions (`actions.forage`) or ways of travelling (`modes.horse`).
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
     * `trip.hex-enter`, `time.day-end`, a clock (`'06:00'`), a part of the calendar's day
     * (`time.part.morning`) or one of the system's actions (`actions.camp`), or several of
     * them (`[trip.hex-enter, actions.camp]`; its conditions see which one it is: `moment`).
     * Without it, only an action's step rolls it (`roll: checks.<event>`).
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
         * takes the action `do` (`actions.camp`), once a day; when it can't, the journal says so and the
         * time passes until it can march. Without it, the trip just waits.
         */
        halt: z
          .object({ at: dayMoment, do: z.string().min(1) })
          .strict()
          .optional(),
        /**
         * How the trip goes on by itself (the world clock, a travel order): it takes this
         * action (`actions.march`), with these parameters, whenever it can. Without it, the trip only waits.
         */
        onward: z
          .object({ do: z.string().min(1), with: given.optional() })
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
     * The party's actions, only the ones the system declares (march, camp, forage…); the
     * ones with a `travel.move` step move the party.
     */
    actions: z.record(z.string(), action).optional(),
  })
  .strict()
  .superRefine((rules, ctx) => {
    const all = availableActions(rules as TravelRules).all
    const actionIds = Object.keys(all)
    const taken = actionIds.map((a) => ref('actions', a))
    const moments = [...CHECK_MOMENTS, ...taken]
    /** The full name of what a short one may have meant, said with the problem. */
    const meant = (value: string, among: string[]) => {
      if (/^(trip|time|actions|modes|checks|params|travel)\./.test(value)) return ''
      const full =
        among.find((m) => m.endsWith(`.${value}`)) ??
        (PART_REF.test(`time.${value}`) ? `time.${value}` : undefined)
      return full ? ` (did you mean ${full}?)` : ''
    }
    /** An action taken with parameters: they're its own, and a value written out is a choice. */
    const badWith = (
      target: string,
      values: Record<string, unknown> | undefined,
      path: (string | number)[],
    ) => {
      const params = all[target]?.params ?? {}
      for (const [key, value] of Object.entries(values ?? {})) {
        const param = params[key]
        if (!param)
          ctx.addIssue({
            code: 'custom',
            path: [...path, key],
            message: Object.keys(params).length
              ? `expected ${Object.keys(params).join(', ')}`
              : `${target} has no parameters`,
          })
        else if (!hasVariables(value) && !choiceIds(param).includes(String(value)))
          ctx.addIssue({
            code: 'custom',
            path: [...path, key],
            message: `expected ${choiceIds(param).join(', ')}`,
          })
      }
    }
    const badMoments = (value: string | string[] | undefined, path: (string | number)[]) =>
      momentsOf(value).forEach((moment, j) => {
        // A part of the calendar's day (`meal.elevenses`): checked against the calendar.
        if (!moments.includes(moment) && !PART_REF.test(moment) && !CLOCK.test(moment))
          ctx.addIssue({
            code: 'custom',
            path: Array.isArray(value) ? [...path, j] : path,
            message: `expected ${moments.join(', ')}, a clock (06:00) or a part of the day (time.meal.supper)${meant(moment, moments)}`,
          })
      })
    rules.checks?.forEach((check, i) => badMoments(check.at, ['checks', i, 'at']))
    const blockable = [
      ...BLOCKABLE,
      ...taken,
      ...Object.keys(rules.modes).map((m) => ref('modes', m)),
    ]
    for (const [id, value] of Object.entries(rules.values ?? {}))
      value.blocks?.forEach((what, i) => {
        if (!blockable.includes(what))
          ctx.addIssue({
            code: 'custom',
            path: ['values', id, 'blocks', i],
            message: `expected ${blockable.join(', ')}${meant(what, blockable)}`,
          })
      })
    const events = [...new Set((rules.checks ?? []).map((c) => ref('checks', c.event)))]
    const values = Object.keys(declaredValues(rules as TravelRules))
    for (const [id, a] of Object.entries(rules.actions ?? {})) {
      badMoments(a.on, ['actions', id, 'on'])
      for (const [key, p] of Object.entries(a.params ?? {}))
        if (p.default !== undefined && !choiceIds(p).includes(String(p.default)))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'params', key, 'default'],
            message: `expected ${choiceIds(p).join(', ')}`,
          })
      a.do?.forEach((st, i) => {
        if (st.do !== undefined && !taken.includes(st.do))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'do'],
            message: `expected ${taken.join(', ')}${meant(st.do, taken)}`,
          })
        else if (st.do !== undefined)
          badWith(refId('actions', st.do)!, st.with, ['actions', id, 'do', i, 'with'])
        const target = st['travel.move']
        if (
          typeof target === 'string' &&
          !hasVariables(target) &&
          !(MOVE_TARGETS as readonly string[]).includes(target) &&
          !/^[1-9]\d*$/.test(target)
        )
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'travel.move'],
            message: 'expected destination, hex, a number of hexes or a variable',
          })
        if (st.roll !== undefined && !events.includes(st.roll))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'roll'],
            message: events.length
              ? `expected ${events.join(', ')}${meant(st.roll, events)}`
              : 'the system has no checks',
          })
        const mode = st['travel.mode']
        const modes = Object.keys(rules.modes).map((m) => ref('modes', m))
        if (mode !== undefined && !hasVariables(mode) && !modes.includes(mode))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'travel.mode'],
            message: `expected ${modes.join(', ')} or a variable${meant(mode, modes)}`,
          })
        const asked = refId('params', st.ask)
        if (st.ask !== undefined && !(asked && a.params?.[asked])) {
          const params = Object.keys(a.params ?? {}).map((p) => ref('params', p))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'ask'],
            message: a.params
              ? `expected one of its parameters: ${params.join(', ')}${meant(st.ask, params)}`
              : `${id} has no parameters to ask`,
          })
        }
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
        message: `expected ${taken.join(', ') || 'an action'}${meant(halt, taken)}`,
      })
    const onward = rules.travel.onward
    if (onward && !taken.includes(onward.do))
      ctx.addIssue({
        code: 'custom',
        path: ['travel', 'onward', 'do'],
        message: `expected ${taken.join(', ') || 'an action'}${meant(onward.do, taken)}`,
      })
    else if (onward)
      badWith(refId('actions', onward.do)!, onward.with, ['travel', 'onward', 'with'])
    const loop = actionLoop(rules as TravelRules)
    if (loop)
      ctx.addIssue({
        code: 'custom',
        path: ['actions', loop[0]],
        message: `actions take each other in a loop: ${loop.join(' → ')}`,
      })
  })

export type ActionDefinition = z.infer<typeof action>
export type ActionParam = z.infer<typeof param>
export type ParamChoice = z.infer<typeof choice>

/** A parameter's choices by their values, as text (`['destination', 'hex', '3']`). */
export function choiceIds(param: ActionParam): string[] {
  return param.choices.map((c) => String(typeof c === 'object' ? c.id : c))
}

/** A parameter's default: its `default`, or its first choice. */
export function paramDefault(param: ActionParam): string | number {
  const first = param.choices[0]
  return param.default ?? (typeof first === 'object' ? first.id : first)
}

/**
 * An action's parameters as its steps read them (`params.until`): each one's default,
 * then what it was given.
 */
export function paramsOf(
  def: ActionDefinition | undefined,
  given: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...Object.fromEntries(Object.entries(def?.params ?? {}).map(([k, p]) => [k, paramDefault(p)])),
    ...given,
  }
}

/**
 * The actions that move the party: a `travel.move` step of their own, or a `do:` that takes
 * one that does (whatever their steps' conditions).
 */
export function movingActions(rules: TravelRules): string[] {
  const all = availableActions(rules).all
  const moves = (id: string, seen: Set<string>): boolean => {
    if (seen.has(id)) return false
    seen.add(id)
    return actionSteps(all[id] ?? {}).some((s) => {
      const next = refId('actions', s.do)
      return s['travel.move'] !== undefined || (next !== undefined && moves(next, seen))
    })
  }
  return Object.keys(all).filter((id) => moves(id, new Set()))
}
export type ActionStep = z.infer<typeof step> & {
  when?: Condition
  unless?: Condition
  wait?: Condition
}

/** The parameters an action asks the player for (`ask:` steps), by id: its buttons don't offer them. */
export function askedParams(def: ActionDefinition | undefined): string[] {
  return [
    ...new Set(
      refIds(
        'params',
        actionSteps(def ?? {}).flatMap((s) => s.ask ?? []),
      ),
    ),
  ]
}
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
  if (steps.some((s) => (s.time !== undefined && typeof s.time !== 'number') || s.wait))
    return undefined
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
    ...refIds(
      'actions',
      (all[id]?.do ?? []).flatMap((s) => s.do ?? []),
    ),
    ...Object.entries(all).flatMap(([other, def]) =>
      momentsOf(def.on).includes(ref('actions', id)) ? [other] : [],
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
      ...(a.do ?? []).flatMap((st, i) => [
        ...conditions(st, `actions.${id}.do[${i}]`),
        ...(st.wait ? validateCondition(st.wait as Condition, `actions.${id}.do[${i}].wait`) : []),
      ]),
    ]),
  ]
  return errors.length ? { errors } : { rules: parsed.data, errors: [] }
}

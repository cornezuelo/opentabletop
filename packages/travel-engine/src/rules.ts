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
/**
 * The older moment the system's day started at (formats 1–2, with `day:`): read as its
 * `day.start` (see `olderDay`).
 */
export const OLDER_DAY_START = 'day-start'
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
 * Actions older systems (formats 1–2, with `day:`) had without declaring them: rules that
 * don't name them get the usual ones (camp sleeps until dawn, a rest is an hour, marching
 * by day for the day's marching hours); `camp: false` leaves one out. Today's systems
 * have only the actions they declare.
 */
export const OLDER_ACTIONS = ['camp', 'rest', 'march'] as const
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
 * of the calendar's day starts: `time: meal.luncheon`; older rules' `dawn` / `nightfall`
 * are their `day:`), change the rest of today's march (`speed: 0.5`), apply effects (`effects: {
 * party.stats.fatigue: -1 }`; a change past a value's `min` / `max` stops there, and later
 * steps see `below` / `above`), take another action (`do: forage`, with its conditions),
 * roll a check now (`roll: <its event>`) or set values of the day (`set: { lost: true }`).
 * `eat: day` is the older way of eating: read as `do:` the day's supplies.
 */
const step = z
  .object({
    when: condition.optional(),
    unless: condition.optional(),
    time: z
      .union([z.number().nonnegative(), z.enum(['dawn', 'nightfall']), clock, partRef])
      .optional(),
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
    /** Older form: eat a day of supplies (read as `do:` the generated day-end action). */
    eat: z.literal('day').optional(),
  })
  .strict()
  .refine(
    (s) =>
      [s.time, s.eat, s.speed, s.effects, s.do, s.roll, s.set, s.advance].filter(
        (x) => x !== undefined,
      ).length === 1,
    'a step does one thing: time, speed, effects, do, roll, set or advance',
  )

/** What a step does: the one key it has besides `when` / `unless`. */
export const STEP_KINDS = ['time', 'speed', 'effects', 'do', 'roll', 'set', 'advance'] as const

/**
 * An action of the party (`actions.forage`, and camp and rest too): what it does as steps
 * (`do`), when it can be taken (`when` / `unless`, `oncePerDay`); its checks are the ones
 * with `at: <its id>`. The older columns (`minutes`, `speed`, `fatigue`, `effects`) still
 * work: they're read as steps.
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
    /** Time it takes (older form of `time: <minutes>`; default 0). */
    minutes: z.number().nonnegative().optional(),
    /** Multiplies the rest of today's march (older form of a `speed` step). */
    speed: z.number().nonnegative().optional(),
    /** Fatigue recovered (older form: write it as an effect, `party.stats.fatigue: -1`). */
    fatigue: z.number().nonnegative().optional(),
    /** What the action changes, applied when it's taken (older form of an `effects` step). */
    effects: effects.optional(),
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
    /**
     * Older systems' day (pack formats 1–2): dawn, nightfall and the night's action, read
     * as today's moments, halt and facts by `olderDay`. Format 3 has no `day:`.
     */
    day: z
      .object({
        /** When the day started: a clock, or a part of the calendar's day. */
        start: dayMoment,
        nightfall: dayMoment,
        /** The action taken at nightfall while waiting (default: camp); `false`: none. */
        night: z.union([z.string().min(1), z.literal(false)]).optional(),
      })
      .strict()
      .optional(),
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
     * e.g. `{ passable: false }`; a mode with `allowedTerrains: [water]` still sails them.
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
          /** Older form: supplies it uses per day (read as a step of the day-end action). */
          consumes: z.record(z.string(), z.number().nonnegative()).optional(),
          /**
           * Where it can go: a condition on each hex it enters (its terrain, water, tags,
           * region, fields, the roads or rivers of the step…), e.g. a boat on water or coast.
           * Where it holds, the terrain's own `passable: false` doesn't stop it.
           */
          through: condition.optional(),
          /** Older form of `through`: only these terrains (`water`: any water hex). */
          allowedTerrains: z.array(z.string()).optional(),
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
            /** Older form: used per day (read as a step of the day-end action, with `min: 0`). */
            perDay: z.number().nonnegative().optional(),
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
     * The party's actions, the system's own (camp, forage…); `march` says when the party
     * can march. `false` leaves out one older systems had by default (see `OLDER_ACTIONS`).
     */
    actions: z.record(z.string(), z.union([z.literal(false), action])).optional(),
  })
  .strict()
  .superRefine((rules, ctx) => {
    const actionIds = Object.keys(availableActions(rules as TravelRules).all)
    // Marching is no moment and no step: the Travel buttons and their conditions.
    const taken = actionIds.filter((id) => id !== MARCH)
    // Older rules (`day:`) still start their day at `day-start`.
    const moments = [...(rules.day ? [OLDER_DAY_START] : []), ...CHECK_MOMENTS, ...taken]
    const badMoments = (value: string | string[] | undefined, path: (string | number)[]) =>
      momentsOf(value).forEach((moment, j) => {
        // A part of the calendar's day (`meal.elevenses`): checked against the calendar.
        if (!moments.includes(moment) && !PART_REF.test(moment) && !CLOCK.test(moment))
          ctx.addIssue({
            code: 'custom',
            path: Array.isArray(value) ? [...path, j] : path,
            message:
              moment === OLDER_DAY_START
                ? 'day-start is gone: name a part of the day (part.morning) or a clock (06:00)'
                : `expected ${moments.join(', ')}, a clock (06:00) or a part of the day (meal.supper)`,
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
      if (a === false) continue
      badMoments(a.on, ['actions', id, 'on'])
      if (id === MARCH)
        for (const key of [
          'do',
          'on',
          'oncePerDay',
          'hideWhenUnavailable',
          'minutes',
          'speed',
          'fatigue',
          'effects',
        ] as const)
          if (a[key] !== undefined)
            ctx.addIssue({
              code: 'custom',
              path: ['actions', id, key],
              message: 'marching has no steps: its when / unless say when the party can march',
            })
      a.do?.forEach((st, i) => {
        if (!rules.day && (st.time === 'dawn' || st.time === 'nightfall'))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'time'],
            message: `${st.time} is gone: name a part of the day (part.morning) or a clock (06:00)`,
          })
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
    const night = rules.day?.night
    if (night && !taken.includes(night))
      ctx.addIssue({
        code: 'custom',
        path: ['day', 'night'],
        message: `expected ${taken.join(', ') || 'an action'}`,
      })
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
/** Older name of an action's definition. */
export type CustomAction = ActionDefinition
export type ActionStep = z.infer<typeof step> & { when?: Condition; unless?: Condition }
export type DayValue = z.infer<typeof dayValue>

export type TravelRules = z.infer<typeof travelRulesSchema>

/**
 * Before systems declared their values, being `lost` was built in: older rules (`day:`)
 * that declare no `values` still have it (it blocks travel for the rest of the day).
 */
const LEGACY_VALUES: Record<string, DayValue> = { lost: { lasts: 'day', blocks: ['travel'] } }

/** The values of the day a system declares (older rules' built-in `lost` if they declare none). */
export function declaredValues(rules: TravelRules): Record<string, DayValue> {
  return rules.values ?? (rules.day ? LEGACY_VALUES : {})
}

/** What older systems got for camp and rest without describing them. */
const OLDER_CAMP: ActionDefinition = { do: [{ time: 'dawn' }] }
const OLDER_REST: ActionDefinition = { do: [{ time: 60 }] }
/** Marching as the engine did before systems declared it: by day, the day's hours. */
const OLDER_MARCH: ActionDefinition = {
  when: { 'time.daylight': true, 'trip.marched': { lt: '{{system.hoursPerDay}}' } },
}

/**
 * Older rules (pack formats 1–2, with `day:`) in today's terms, keeping what they meant:
 * `day-start` is their `day.start`, `time: dawn` / `nightfall` go to theirs, camp, rest and
 * march are there unless declared (or `false`), and their night's action (`day.night`,
 * camp by default) is the halt at nightfall. `day:` stays, for the facts they read
 * (`daylight`, `dawn`, `nightfall`, `camping`). Rules without `day:` are returned as they are.
 */
export function olderDay(rules: TravelRules): TravelRules {
  const day = rules.day
  if (!day) return rules
  const moment = (m: string) => (m === OLDER_DAY_START ? day.start : m)
  const moments = <T extends string | string[] | undefined>(v: T): T =>
    (v === undefined ? v : Array.isArray(v) ? v.map(moment) : moment(v)) as T
  const time = (t: ActionStep['time']) =>
    t === 'dawn' ? day.start : t === 'nightfall' ? day.nightfall : t
  const steps = (def: ActionDefinition): ActionDefinition => ({
    ...def,
    ...(def.on !== undefined && { on: moments(def.on) }),
    ...(def.do && {
      do: def.do.map((st) => (st.time === undefined ? st : { ...st, time: time(st.time) })),
    }),
  })
  const defaults: Record<string, ActionDefinition> = {
    camp: OLDER_CAMP,
    rest: OLDER_REST,
    march: OLDER_MARCH,
  }
  const declared = rules.actions ?? {}
  // `false` stays, so reading them again leaves them out.
  const actions: Record<string, ActionDefinition | false> = {}
  for (const id of OLDER_ACTIONS) if (declared[id] === undefined) actions[id] = defaults[id]
  for (const [id, def] of Object.entries(declared)) {
    if (def === false) {
      actions[id] = false
      continue
    }
    // Marching without its own `when` marches when it used to (by day, the day's hours);
    // its `unless` adds to that.
    if (id === MARCH) actions[id] = { ...def, when: def.when ?? OLDER_MARCH.when }
    else actions[id] = id in defaults && describesNothing(def) ? { ...def, ...defaults[id] } : def
  }
  const night = day.night === false ? undefined : (day.night ?? (actions.camp ? 'camp' : undefined))
  return {
    ...rules,
    travel: {
      ...rules.travel,
      start: rules.travel.start ?? day.start,
      ...(night && !rules.travel.halt && { halt: { at: day.nightfall, do: night } }),
    },
    values: declaredValues(rules),
    checks: rules.checks?.map((c) => (c.at === undefined ? c : { ...c, at: moments(c.at) })),
    actions: Object.fromEntries(
      Object.entries(actions).map(([id, def]) => [id, def && steps(def)]),
    ),
  }
}

/**
 * When a new trip starts on its first day, as minutes of the day: the rules'
 * `travel.start` (older rules: their dawn), or midnight.
 */
export function tripStart(rules: TravelRules, calendar: Calendar): number {
  const start = olderDay(rules).travel.start
  return start === undefined ? 0 : dayClock(start, calendar, '00:00')
}

/** What the party does when it can't march and the trip goes on by itself (see `halt`). */
export function haltOf(rules: TravelRules): { at: string; do: string } | undefined {
  return olderDay(rules).travel.halt
}

/**
 * Whether the rules eat the older way: supplies with `perDay`, ways of travelling that
 * `consume`, or `eat: day` steps.
 */
export function eatsTheOlderWay(rules: TravelRules): boolean {
  return (
    Object.values(rules.resources ?? {}).some((r) => r.perDay !== undefined) ||
    Object.values(rules.modes).some((m) => m.consumes !== undefined) ||
    Object.values(rules.actions ?? {}).some((a) => a !== false && !!a.do?.some((s) => s.eat))
  )
}

/** The id of the day-end action older rules eat with (`eat`, unless the system has one). */
export function olderEatingId(rules: TravelRules): string {
  const taken = (id: string) =>
    (!!rules.day && (OLDER_ACTIONS as readonly string[]).includes(id)) || !!rules.actions?.[id]
  return ['eat', 'eat-day', 'day-supplies'].find((id) => !taken(id)) ?? 'eat-day-supplies'
}

/**
 * The older way of eating as an action: each supply's `perDay` and the way of travelling's
 * `consumes` as effects, once a day, at day-end (`eat: day` steps take it earlier).
 */
function olderEating(rules: TravelRules): ActionDefinition {
  const perDay = Object.fromEntries(
    Object.entries(rules.resources ?? {}).flatMap(([id, r]) =>
      r.perDay ? [[`party.resources.${id}`, -r.perDay]] : [],
    ),
  )
  const steps: ActionStep[] = Object.keys(perDay).length ? [{ effects: perDay }] : []
  for (const [mode, m] of Object.entries(rules.modes)) {
    const uses = Object.entries(m.consumes ?? {}).filter(([, n]) => n > 0)
    if (uses.length)
      steps.push({
        when: { mode },
        effects: Object.fromEntries(uses.map(([id, n]) => [`party.resources.${id}`, -n])),
      })
  }
  return { on: 'day-end', oncePerDay: true, do: steps }
}

/** An action with its older `eat: day` steps read as `do:` the day's supplies. */
const withoutEat = (def: ActionDefinition, eat: string): ActionDefinition =>
  def.do?.some((s) => s.eat)
    ? { ...def, do: def.do.map(({ eat: older, ...st }) => (older ? { ...st, do: eat } : st)) }
    : def

/**
 * Whether an older form describes nothing for camp or rest (`camp: { name: Camp }`):
 * read with what it did then.
 */
const describesNothing = (def: ActionDefinition) =>
  def.do === undefined &&
  def.minutes === undefined &&
  def.speed === undefined &&
  def.fatigue === undefined &&
  def.effects === undefined

/**
 * The system's actions, by id, in the order the rules list them: what each one does, read
 * from older forms too (`eat: day`, the generated day-end eating, and older rules' `day:`:
 * see `olderDay`).
 */
export function availableActions(rules: TravelRules): {
  all: Record<string, ActionDefinition>
} {
  const older = eatsTheOlderWay(rules)
  const eat = older ? olderEatingId(rules) : ''
  const read = (def: ActionDefinition) => (older ? withoutEat(def, eat) : def)
  const all: Record<string, ActionDefinition> = {}
  for (const [id, def] of Object.entries(olderDay(rules).actions ?? {}))
    if (def !== false) all[id] = read(def)
  if (older) all[eat] = olderEating(rules)
  return { all }
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

/**
 * The edits that turn older rules' eating into the new way, keeping what they do: each
 * supply loses `perDay` and gets `min: 0` (they never went below 0), ways of travelling
 * lose `consumes`, and an action at day-end (`olderEatingId`) uses them; `eat: day` steps
 * become `do:` that action, which then happens once a day. Each edit is a path in the
 * rules and its new value (undefined: removed).
 */
export function olderEatingEdits(
  rules: TravelRules,
): { path: (string | number)[]; value: unknown }[] {
  if (!eatsTheOlderWay(rules)) return []
  const eat = olderEatingId(rules)
  const edits: { path: (string | number)[]; value: unknown }[] = []
  for (const [id, r] of Object.entries(rules.resources ?? {})) {
    if (r.perDay !== undefined) edits.push({ path: ['resources', id, 'perDay'], value: undefined })
    if (r.min === undefined) edits.push({ path: ['resources', id, 'min'], value: 0 })
  }
  for (const [id, m] of Object.entries(rules.modes))
    if (m.consumes !== undefined) edits.push({ path: ['modes', id, 'consumes'], value: undefined })
  let ateEarlier = false
  for (const [id, a] of Object.entries(rules.actions ?? {}))
    if (a !== false && a.do?.some((st) => st.eat)) {
      ateEarlier = true
      edits.push({ path: ['actions', id, 'do'], value: withoutEat(a, eat).do })
    }
  const action = olderEating(rules)
  if (!ateEarlier) delete action.oncePerDay
  edits.push({ path: ['actions', eat], value: action })
  return edits
}

/** The bounds of a value: effects never take it past them. */
export type { Bounds }
/** Moved to `@open-tabletop/variables`, shared with the other engines. */
export { changeValue, resolveChange } from '@open-tabletop/variables'

/**
 * The bounds of each supply: the `min` / `max` it declares, or none. Older rules (see
 * `eatsTheOlderWay`) never went below 0: their supplies keep `min: 0` unless they say.
 */
export function resourceBounds(rules: TravelRules): Record<string, Bounds> {
  const older = eatsTheOlderWay(rules)
  return Object.fromEntries(
    Object.entries(rules.resources ?? {}).map(([id, r]) => [
      id,
      {
        ...((r.min !== undefined || older) && { min: r.min ?? 0 }),
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

/** An action's steps: its `do`, or the older columns read as steps (time, speed, effects). */
export function actionSteps(def: ActionDefinition): ActionStep[] {
  const older: ActionStep[] = []
  if (def.minutes) older.push({ time: def.minutes })
  if (def.speed !== undefined) older.push({ speed: def.speed })
  const fx = { ...(def.fatigue ? { 'party.stats.fatigue': -def.fatigue } : {}), ...def.effects }
  if (Object.keys(fx).length) older.push({ effects: fx })
  return [...older, ...((def.do ?? []) as ActionStep[])]
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

/**
 * Where a way of travelling can go, as a condition (`through`, or the older
 * `allowedTerrains` list read as one); undefined: wherever terrains allow.
 */
export function modeThrough(mode: {
  through?: unknown
  allowedTerrains?: string[]
}): Condition | undefined {
  if (mode.through) return mode.through as Condition
  const list = mode.allowedTerrains
  if (!list) return undefined
  const terrains = list.filter((t) => t !== 'water')
  const water = list.includes('water')
  const byTerrain: Condition = { terrain: terrains }
  if (!water) return byTerrain
  return terrains.length ? { any: [byTerrain, { water: true }] } : { water: true }
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
    ...Object.entries(parsed.data.actions ?? {}).flatMap(([id, a]) =>
      a === false
        ? []
        : [
            ...conditions(a, `actions.${id}`),
            ...(a.do ?? []).flatMap((st, i) => conditions(st, `actions.${id}.do[${i}]`)),
          ],
    ),
  ]
  return errors.length ? { errors } : { rules: parsed.data, errors: [] }
}

import { validateCondition, type Condition } from '@open-tabletop/conditions'
import { z } from 'zod'

const clock = z.string().regex(/^\d{1,2}:\d{2}$/, 'times look like "06:00"')
const condition = z.record(z.string(), z.unknown())
/** Text in one or several languages: "Forage" or { en: Forage for food, es: Buscar comida }. */
const text = z.union([z.string(), z.record(z.string(), z.string())])

/**
 * Built-in moments for checks and triggered actions (`at:` / `on:`); any other value names
 * one of the system's actions.
 */
export const CHECK_MOMENTS = ['day-start', 'hex-enter', 'camp', 'day-end'] as const
/** Actions every system has unless it turns them off (`camp: false`). */
export const BUILT_IN_ACTIONS = ['camp', 'rest'] as const
/** What a declared value can block besides actions: going on with the trip. */
export const BLOCKABLE = ['travel'] as const

const effects = z.record(z.string(), z.union([z.number(), z.string()]))

/**
 * One step of an action (`do:`), doing one thing, optionally only `when` (or `unless`) a
 * condition holds: pass time (`time: 180`, `time: dawn`, `time: nightfall`, `time:
 * '14:00'`), change the rest of today's march (`speed: 0.5`), apply effects (`effects: {
 * party.stats.fatigue: -1 }`; a change past a value's `min` / `max` stops there, and later
 * steps see `below` / `above`), take another action (`do: forage`, with its conditions),
 * roll a check now (`roll: <its event>`) or set values of the day (`set: { lost: true }`).
 * `eat: day` is the older way of eating: read as `do:` the day's supplies.
 */
const step = z
  .object({
    when: condition.optional(),
    unless: condition.optional(),
    time: z.union([z.number().nonnegative(), z.enum(['dawn', 'nightfall']), clock]).optional(),
    speed: z.number().nonnegative().optional(),
    effects: effects.optional(),
    do: z.string().min(1).optional(),
    roll: z.string().min(1).optional(),
    set: z.record(z.string(), z.unknown()).optional(),
    /** Older form: eat a day of supplies (read as `do:` the generated day-end action). */
    eat: z.literal('day').optional(),
  })
  .strict()
  .refine(
    (s) =>
      [s.time, s.eat, s.speed, s.effects, s.do, s.roll, s.set].filter((x) => x !== undefined)
        .length === 1,
    'a step does one thing: time, speed, effects, do, roll or set',
  )

/** What a step does: the one key it has besides `when` / `unless`. */
export const STEP_KINDS = ['time', 'speed', 'effects', 'do', 'roll', 'set'] as const

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
     * The system takes it by itself at this moment (`day-start`, `hex-enter`, `camp`,
     * `day-end`, or when one of its actions is taken), if its conditions hold; it isn't a
     * button then. It runs before that moment's checks.
     */
    on: z.string().min(1).optional(),
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
     * day-start, hex-enter, camp, day-end, or the id of one of the system's actions. Without
     * it, only an action's step rolls it (`roll: <event>`).
     */
    at: z.string().min(1).optional(),
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
    day: z.object({ start: clock, nightfall: clock }).strict(),
    travel: z.object({ hoursPerDay: z.number().positive().max(24) }).strict(),
    terrains: z.record(
      z.string(),
      z
        .object({
          multiplier: z.number().nonnegative().optional(),
          passable: z.boolean().optional(),
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
        passable: z.boolean().optional(),
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
     * The party's actions. Camp and rest exist unless turned off (`false`; e.g. Kal-Arath
     * only camps); any other key is one of the system's own (forage…).
     */
    actions: z.record(z.string(), z.union([z.literal(false), action])).optional(),
  })
  .strict()
  .superRefine((rules, ctx) => {
    const own = Object.entries(rules.actions ?? {})
      .filter(([id, a]) => !(BUILT_IN_ACTIONS as readonly string[]).includes(id) && a !== false)
      .map(([id]) => id)
    const actionIds = Object.keys(availableActions(rules as TravelRules).all)
    const moments = [...CHECK_MOMENTS, ...own]
    rules.checks?.forEach((check, i) => {
      if (check.at !== undefined && !moments.includes(check.at))
        ctx.addIssue({
          code: 'custom',
          path: ['checks', i, 'at'],
          message: `expected ${moments.join(', ')}`,
        })
    })
    const blockable = [
      ...BLOCKABLE,
      ...BUILT_IN_ACTIONS,
      ...own,
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
      if (a.on !== undefined && !(CHECK_MOMENTS as readonly string[]).includes(a.on))
        if (!actionIds.includes(a.on))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'on'],
            message: `expected ${[...new Set([...CHECK_MOMENTS, ...actionIds])].join(', ')}`,
          })
      a.do?.forEach((st, i) => {
        if (st.do !== undefined && !actionIds.includes(st.do))
          ctx.addIssue({
            code: 'custom',
            path: ['actions', id, 'do', i, 'do'],
            message: `expected ${actionIds.join(', ')}`,
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
 * Before systems declared their values, being `lost` was built in: rules that declare no
 * `values` still have it (it blocks travel for the rest of the day).
 */
const LEGACY_VALUES: Record<string, DayValue> = { lost: { lasts: 'day', blocks: ['travel'] } }

/** The values of the day a system declares (the older built-in `lost` if it declares none). */
export function declaredValues(rules: TravelRules): Record<string, DayValue> {
  return rules.values ?? LEGACY_VALUES
}

/** Defaults of camp and rest when the rules don't describe them. */
const DEFAULT_CAMP: ActionDefinition = { do: [{ time: 'dawn' }] }
const DEFAULT_REST: ActionDefinition = { minutes: 60 }

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
    (BUILT_IN_ACTIONS as readonly string[]).includes(id) || !!rules.actions?.[id]
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

/** Actions available under some rules, with their effective settings. */
export function availableActions(rules: TravelRules): {
  /** Camp and rest, null when the system turns them off. */
  camp: ActionDefinition | null
  rest: ActionDefinition | null
  /** How long a rest lasts, in minutes (0 without rest). */
  restMinutes: number
  /**
   * The system's own actions, in the order the rules list them (older rules: then the
   * day-end action they eat with).
   */
  custom: Record<string, ActionDefinition>
  /** Every action, by id: camp and rest first. */
  all: Record<string, ActionDefinition>
} {
  const older = eatsTheOlderWay(rules)
  const eat = older ? olderEatingId(rules) : ''
  const read = (def: ActionDefinition) => (older ? withoutEat(def, eat) : def)
  const { camp, rest, ...others } = rules.actions ?? {}
  const custom = Object.fromEntries([
    ...Object.entries(others)
      .filter((e): e is [string, ActionDefinition] => e[1] !== false)
      .map(([id, def]) => [id, read(def)] as const),
    ...(older ? [[eat, olderEating(rules)] as const] : []),
  ])
  const campDef = camp === false ? null : read(camp ?? DEFAULT_CAMP)
  const restDef = rest === false ? null : read(rest ?? DEFAULT_REST)
  return {
    camp: campDef,
    rest: restDef,
    restMinutes: restDef ? restMinutes(restDef) : 0,
    custom,
    all: {
      ...(campDef && { camp: campDef }),
      ...(restDef && { rest: restDef }),
      ...custom,
    },
  }
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
export interface Bounds {
  min?: number
  max?: number
}

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
 * A value changed by an effect: a number adds (also as text, '+2'), '=3' sets; the result
 * stops at the bounds, and `limit` says which one it was cut by.
 */
export function changeValue(
  from: number,
  change: number | string,
  bounds: Bounds = {},
): { to: number; limit?: 'min' | 'max' } {
  const number = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && /^[+-]?\d+(\.\d+)?$/.test(v.trim())
        ? Number(v)
        : undefined
  const set =
    typeof change === 'string' && change.startsWith('=') ? number(change.slice(1)) : undefined
  const wanted = set !== undefined ? set : from + (number(change) ?? 0)
  if (bounds.min !== undefined && wanted < bounds.min) return { to: bounds.min, limit: 'min' }
  if (bounds.max !== undefined && wanted > bounds.max) return { to: bounds.max, limit: 'max' }
  return { to: wanted }
}

/**
 * A loop of actions taking each other (`do:` steps, or `on:` another action), as the ids
 * along it; undefined when there is none.
 */
export function actionLoop(rules: TravelRules): string[] | undefined {
  const all = availableActions(rules).all
  const next = (id: string): string[] => [
    ...(all[id]?.do ?? []).flatMap((s) => (s.do ? [s.do] : [])),
    ...Object.entries(all).flatMap(([other, def]) => (def.on === id ? [other] : [])),
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

/** How long a rest lasts: its time steps in minutes (60 if it says none). */
function restMinutes(rest: ActionDefinition): number {
  const steps = rest.do?.filter((s) => typeof s.time === 'number') ?? []
  if (steps.length) return steps.reduce((n, s) => n + (s.time as number), 0)
  return rest.minutes ?? 60
}

/**
 * An action's steps: its `do`, or the older columns read as steps (time, speed, then
 * effects). Camp without steps sleeps until dawn.
 */
export function actionSteps(id: string, def: ActionDefinition): ActionStep[] {
  const older: ActionStep[] = []
  const minutes = def.minutes ?? (id === 'rest' && !def.do ? 60 : undefined)
  if (minutes) older.push({ time: minutes })
  if (def.speed !== undefined) older.push({ speed: def.speed })
  const fx = { ...(def.fatigue ? { 'party.stats.fatigue': -def.fatigue } : {}), ...def.effects }
  if (Object.keys(fx).length) older.push({ effects: fx })
  const steps = [...older, ...((def.do ?? []) as ActionStep[])]
  if (id === 'camp' && !steps.some((s) => s.time !== undefined)) steps.push({ time: 'dawn' })
  return steps
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

import { validateCondition, type Condition } from '@open-tabletop/conditions'
import { z } from 'zod'

const clock = z.string().regex(/^\d{1,2}:\d{2}$/, 'times look like "06:00"')
const condition = z.record(z.string(), z.unknown())
/** Text in one or several languages: "Forage" or { en: Forage for food, es: Buscar comida }. */
const text = z.union([z.string(), z.record(z.string(), z.string())])

/** Built-in moments for checks; any other value names one of the system's own actions. */
export const CHECK_MOMENTS = ['day-start', 'hex-enter', 'camp', 'day-end'] as const
/** Actions every system has unless it turns them off (`camp: false`). */
export const BUILT_IN_ACTIONS = ['camp', 'rest'] as const
/** What a declared value can block besides actions: going on with the trip. */
export const BLOCKABLE = ['travel'] as const

const effects = z.record(z.string(), z.union([z.number(), z.string()]))

/**
 * One step of an action (`do:`), doing one thing, optionally only `when` (or `unless`) a
 * condition holds: pass time (`time: 180`, `time: dawn`, `time: nightfall`, `time:
 * '14:00'`), eat a day of supplies (`eat: day`; later steps see `short`), change the rest
 * of today's march (`speed: 0.5`) or apply effects (`effects: { party.stats.fatigue: -1 }`).
 */
const step = z
  .object({
    when: condition.optional(),
    unless: condition.optional(),
    time: z.union([z.number().nonnegative(), z.enum(['dawn', 'nightfall']), clock]).optional(),
    eat: z.literal('day').optional(),
    speed: z.number().nonnegative().optional(),
    effects: effects.optional(),
  })
  .strict()
  .refine(
    (s) => [s.time, s.eat, s.speed, s.effects].filter((x) => x !== undefined).length === 1,
    'a step does one thing: time, eat, speed or effects',
  )

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
    /** day-start, hex-enter, camp, or the id of one of the system's own actions. */
    at: z.string().min(1),
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
    rules.checks?.forEach((check, i) => {
      if (!(CHECK_MOMENTS as readonly string[]).includes(check.at) && !own.includes(check.at))
        ctx.addIssue({
          code: 'custom',
          path: ['checks', i, 'at'],
          message: `expected ${[...CHECK_MOMENTS, ...own].join(', ')}`,
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

/** Actions available under some rules, with their effective settings. */
export function availableActions(rules: TravelRules): {
  /** Camp and rest, null when the system turns them off. */
  camp: ActionDefinition | null
  rest: ActionDefinition | null
  /** How long a rest lasts, in minutes (0 without rest). */
  restMinutes: number
  /** The system's own actions, in the order the rules list them. */
  custom: Record<string, ActionDefinition>
  /** Every action, by id: camp and rest first. */
  all: Record<string, ActionDefinition>
} {
  const { camp, rest, ...others } = rules.actions ?? {}
  const custom = Object.fromEntries(
    Object.entries(others).filter((e): e is [string, ActionDefinition] => e[1] !== false),
  )
  const campDef = camp === false ? null : (camp ?? DEFAULT_CAMP)
  const restDef = rest === false ? null : (rest ?? DEFAULT_REST)
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

import { validateCondition, type Condition } from '@open-tabletop/conditions'
import { z } from 'zod'

const clock = z.string().regex(/^\d{1,2}:\d{2}$/, 'times look like "06:00"')
const condition = z.record(z.string(), z.unknown())
/** Text in one or several languages: "Forage" or { en: Forage for food, es: Buscar comida }. */
const text = z.union([z.string(), z.record(z.string(), z.string())])

/** Built-in moments for checks; any other value names one of the system's own actions. */
export const CHECK_MOMENTS = ['day-start', 'hex-enter', 'camp', 'day-end'] as const
const BUILT_IN_ACTIONS = ['camp', 'rest']

/**
 * An action of the system's own (`actions.forage`…): time passes, today's march may slow
 * down and fatigue may ease; its checks are the ones with `at: <its id>`.
 */
const customAction = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /**
     * What the journal says when none of its checks come up where the party is, e.g.
     * "Nothing to forage on {terrain}" (`{terrain}` is the hex's terrain).
     */
    nothing: text.optional(),
    /** Time it takes (default 0). */
    minutes: z.number().nonnegative().optional(),
    /** Multiplies the rest of today's march, e.g. 0.5: foraging halves it. */
    speed: z.number().nonnegative().optional(),
    /** Fatigue recovered (older form: write it as an effect, `party.stats.fatigue: -1`). */
    fatigue: z.number().nonnegative().optional(),
    /** What the action changes, as effects (`party.stats.fatigue: -1`), applied when it's taken. */
    effects: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
    /** Only once a day. */
    oncePerDay: z.boolean().optional(),
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
    effects: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
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
          allowedTerrains: z.array(z.string()).optional(),
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
    /**
     * Which party actions this system has. Absent = both, with defaults. `false` removes
     * an action (e.g. Kal-Arath only camps).
     */
    actions: z
      .object({
        camp: z.union([z.literal(false), z.object({}).strict()]).optional(),
        rest: z
          .union([
            z.literal(false),
            z
              .object({
                /** Length of one rest (default 60). */
                minutes: z.number().positive().optional(),
                /** Fatigue recovered per rest (default 0: a pause, not a night's sleep). */
                fatigue: z.number().nonnegative().optional(),
                /** What a rest changes, as effects (`party.stats.fatigue: -1`). */
                effects: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
              })
              .strict(),
          ])
          .optional(),
      })
      // Any other key is one of the system's own actions (false turns it off, like camp).
      .catchall(z.union([z.literal(false), customAction]))
      .optional(),
  })
  .strict()
  .superRefine((rules, ctx) => {
    const own = Object.entries(rules.actions ?? {})
      .filter(([id, action]) => !BUILT_IN_ACTIONS.includes(id) && action !== false)
      .map(([id]) => id)
    rules.checks?.forEach((check, i) => {
      if (!(CHECK_MOMENTS as readonly string[]).includes(check.at) && !own.includes(check.at))
        ctx.addIssue({
          code: 'custom',
          path: ['checks', i, 'at'],
          message: `expected ${[...CHECK_MOMENTS, ...own].join(', ')}`,
        })
    })
  })

export type CustomAction = z.infer<typeof customAction>

export type TravelRules = z.infer<typeof travelRulesSchema>

/** Actions available under some rules, with their effective settings. */
export function availableActions(rules: TravelRules): {
  camp: boolean
  rest: { minutes: number; fatigue: number } | null
  /** The system's own actions, in the order the rules list them. */
  custom: Record<string, CustomAction>
} {
  const { camp, rest, ...custom } = rules.actions ?? {}
  return {
    camp: camp !== false,
    rest: rest === false ? null : { minutes: rest?.minutes ?? 60, fatigue: rest?.fatigue ?? 0 },
    custom: Object.fromEntries(
      Object.entries(custom).filter((e): e is [string, CustomAction] => e[1] !== false),
    ),
  }
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

/** Validates raw rules (YAML/JSON) and returns readable problems. */
export function parseTravelRules(raw: unknown): { rules?: TravelRules; errors: string[] } {
  const parsed = travelRulesSchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map(
        (i) => `${i.path.map(String).join('.') || 'rules'}: ${i.message}`,
      ),
    }
  const errors = (parsed.data.checks ?? []).flatMap((check, i) => [
    ...(check.unless ? validateCondition(check.unless, `checks[${i}].unless`) : []),
    ...(check.when ? validateCondition(check.when, `checks[${i}].when`) : []),
  ])
  return errors.length ? { errors } : { rules: parsed.data, errors: [] }
}

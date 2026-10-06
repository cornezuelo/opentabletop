import { validateCondition, type Condition } from '@open-tabletop/conditions'
import { z } from 'zod'

const clock = z.string().regex(/^\d{1,2}:\d{2}$/, 'times look like "06:00"')
const condition = z.record(z.string(), z.unknown())

const checkRule = z
  .object({
    /** Event name emitted as CHECK_REQUIRED, e.g. ENCOUNTER_CHECK_REQUIRED. */
    event: z.string().min(1),
    at: z.enum(['day-start', 'hex-enter', 'camp']),
    /** Skip the check when this matches the check context (terrain, edges, weather, mode…). */
    unless: condition.optional(),
    /** Only check when this matches. */
    when: condition.optional(),
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
          kmPerDay: z.number().positive(),
          consumes: z.record(z.string(), z.number().nonnegative()).optional(),
          allowedTerrains: z.array(z.string()).optional(),
        })
        .strict(),
    ),
    resources: z
      .record(z.string(), z.object({ perDay: z.number().nonnegative().optional() }).strict())
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
              })
              .strict(),
          ])
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export type TravelRules = z.infer<typeof travelRulesSchema>

/** Actions available under some rules, with their effective settings. */
export function availableActions(rules: TravelRules): {
  camp: boolean
  rest: { minutes: number; fatigue: number } | null
} {
  const rest = rules.actions?.rest
  return {
    camp: rules.actions?.camp !== false,
    rest: rest === false ? null : { minutes: rest?.minutes ?? 60, fatigue: rest?.fatigue ?? 0 },
  }
}
export type CheckRule = z.infer<typeof checkRule> & { unless?: Condition; when?: Condition }

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

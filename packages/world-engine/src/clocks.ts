import { z } from 'zod'

/**
 * Progress clocks as data. A pack declares them (`kind: clocks`), and a system names the
 * definition its world starts with (`clocks:` in `kind: system`): each clock's name, its
 * segments, where it starts and what happens when it fills (a line for the timeline, a
 * table to roll, effects, and whether it then stays full, starts over or goes away). This
 * engine keeps the clocks and says when one fills (`CLOCK_FILLED`); rolling the table and
 * applying the effects is the integration layer's.
 */

const text = z.union([z.string(), z.record(z.string(), z.string())])

/** What a clock does once full: stays full, starts over empty, or is taken off. */
export const CLOCK_THEN = ['keep', 'reset', 'remove'] as const
export type ClockThen = (typeof CLOCK_THEN)[number]

const onFull = z
  .object({
    /** What happens, in words: a line on the timeline. */
    description: text.optional(),
    /** A table, oracle, generator or deck rolled (`id` of the pack, or `pack/id`). */
    resolve: z.string().min(1).optional(),
    /** Changes to the world: other clocks (`world.clocks.<id>`), factions (`factions.<id>.…`). */
    effects: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
    /** After it fills: `keep` it full (the default), `reset` it to empty, or `remove` it. */
    then: z.enum(CLOCK_THEN).optional(),
  })
  .strict()

const clock = z
  .object({
    name: text.optional(),
    description: text.optional(),
    segments: z.number().int().min(1),
    /** Segments filled when it starts (absent: none). */
    filled: z.number().int().min(0).optional(),
    noteRef: z.string().optional(),
    onFull: onFull.optional(),
  })
  .strict()

export const clocksSchema = z
  .object({
    kind: z.literal('clocks'),
    id: z.string().min(1),
    name: text.optional(),
    description: text.optional(),
    clocks: z.record(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), clock).default({}),
  })
  .strict()

export type ClocksDef = z.infer<typeof clocksSchema>
export type ClockDef = z.infer<typeof clock>
export type ClockOnFull = z.infer<typeof onFull>

/** Reads a `kind: clocks` definition: it, or the problems found (`path: message`). */
export function parseClocks(raw: unknown): { clocks?: ClocksDef; errors: string[] } {
  const parsed = clocksSchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'clocks'}: ${i.message}`),
    }
  const errors: string[] = []
  for (const [id, c] of Object.entries(parsed.data.clocks))
    if ((c.filled ?? 0) > c.segments)
      errors.push(`clocks.${id}.filled: more than its ${c.segments} segments`)
  return errors.length ? { errors } : { clocks: parsed.data, errors }
}

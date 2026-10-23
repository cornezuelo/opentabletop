import { z } from 'zod'

/**
 * Progress clocks as data. A pack declares them (`kind: clocks`), and a system names the
 * definition its world starts with (`clocks:` in `kind: system`): each clock's name, its
 * segments, where it starts and what becomes of it once full (it stays full, starts over
 * or goes away). What happens when it fills is the world's reactions'
 * (`world.clocks.<id>.full` in `kind: world`). This engine keeps the clocks and says when
 * one fills (`CLOCK_FILLED`).
 */

const text = z.union([z.string(), z.record(z.string(), z.string())])

/** What a clock does once full: stays full, starts over empty, or is taken off. */
export const CLOCK_THEN = ['keep', 'reset', 'remove'] as const
export type ClockThen = (typeof CLOCK_THEN)[number]

const clock = z
  .object({
    name: text.optional(),
    description: text.optional(),
    segments: z.number().int().min(1),
    /** Segments filled when it starts (absent: none). */
    filled: z.number().int().min(0).optional(),
    noteRef: z.string().optional(),
    /** Once full: `keep` it full (the default), `reset` it to empty, or `remove` it. */
    then: z.enum(CLOCK_THEN).optional(),
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

/** Reads a `kind: clocks` definition: it, or the problems found (`path: message`). */
export function parseClocks(raw: unknown): { clocks?: ClocksDef; errors: string[] } {
  // What a full clock does moved to the world's reactions (pack format 9).
  const moved = Object.entries(
    ((raw as { clocks?: unknown } | null)?.clocks ?? {}) as Record<string, unknown>,
  ).flatMap(([id, c]) =>
    c && typeof c === 'object' && 'onFull' in c
      ? [
          `clocks.${id}.onFull: what happens when a clock fills is a reaction of the world now (on: world.clocks.${id}.full in kind: world); the clock keeps then:`,
        ]
      : [],
  )
  if (moved.length) return { errors: moved }
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

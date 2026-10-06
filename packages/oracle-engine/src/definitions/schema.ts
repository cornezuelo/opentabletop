import { z } from 'zod'

/**
 * Raw pack definitions as authors write them (YAML/JSON). Structural validation only;
 * cross-references, ranges and cycles are checked by the compiler.
 */

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids use lowercase letters, digits and dashes')
/** A definition reference: local id, `pack/id`, or a template like `weather-{{season}}`. */
const ref = z.string().min(1)
const condition = z.record(z.string(), z.unknown())
const setValues = z.record(z.string(), z.unknown())

/** Single number or "a-b". */
const range = z.union([
  z.number().int(),
  z.string().regex(/^\s*-?\d+\s*(-\s*-?\d+\s*)?$/, 'ranges look like "3" or "2-5"'),
])

const entry = z
  .object({
    id: id.optional(),
    range: range.optional(),
    weight: z.number().positive().optional(),
    when: condition.optional(),
    result: z.string().optional(),
    table: ref.optional(),
    generator: ref.optional(),
    set: setValues.optional(),
    once: z.boolean().optional(),
    maxOccurrences: z.number().int().positive().optional(),
  })
  .strict()
  .refine((e) => !(e.range !== undefined && e.weight !== undefined), {
    message: 'an entry has either a range or a weight, not both',
  })
  .refine((e) => !(e.table && e.generator), {
    message: 'an entry delegates to a table or a generator, not both',
  })

const common = {
  id,
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
}

const tableBody = {
  roll: z.string().optional(),
  clamp: z.boolean().optional(),
  onExhausted: z.enum(['reroll', 'next', 'none']).optional(),
  entries: z.array(entry).min(1, 'a table needs at least one entry'),
}

export const tableSchema = z.object({ kind: z.literal('table'), ...common, ...tableBody }).strict()

export const oracleSchema = z
  .object({
    kind: z.literal('oracle'),
    ...common,
    inputs: z.record(
      z.string(),
      z
        .object({
          options: z.array(z.string()).min(1),
          default: z.string().optional(),
          /** Shown instead of the input id, e.g. "Odds". */
          label: z.string().optional(),
          /** Shown instead of option ids, e.g. { very-unlikely: Very unlikely }. */
          labels: z.record(z.string(), z.string()).optional(),
        })
        .strict(),
    ),
    roll: z.string().optional(),
    clamp: z.boolean().optional(),
    onExhausted: z.enum(['reroll', 'next', 'none']).optional(),
    variants: z.record(
      z.string(),
      z.object({ entries: z.array(entry).min(1), roll: z.string().optional() }).strict(),
    ),
  })
  .strict()

const field = z
  .object({
    table: ref.optional(),
    generator: ref.optional(),
    roll: z.string().optional(),
    value: z.unknown().optional(),
    when: condition.optional(),
    context: setValues.optional(),
  })
  .strict()
  .refine(
    (f) => [f.table, f.generator, f.roll, f.value].filter((x) => x !== undefined).length === 1,
    {
      message: 'a field needs exactly one of table, generator, roll or value',
    },
  )

export const generatorSchema = z
  .object({
    kind: z.literal('generator'),
    ...common,
    fields: z.record(z.string(), field),
    template: z.string().optional(),
  })
  .strict()

const card = z
  .object({
    id,
    result: z.string().optional(),
    table: ref.optional(),
    generator: ref.optional(),
    set: setValues.optional(),
    count: z.number().int().positive().optional(),
  })
  .strict()

export const deckSchema = z
  .object({
    kind: z.literal('deck'),
    ...common,
    cards: z.array(card).min(1, 'a deck needs at least one card'),
    reshuffle: z.enum(['when-empty', 'manual', 'after-draw']).optional(),
  })
  .strict()

export const definitionSchema = z.discriminatedUnion('kind', [
  tableSchema,
  oracleSchema,
  generatorSchema,
  deckSchema,
])

export const manifestSchema = z
  .object({
    id,
    name: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+/, 'versions use semver, e.g. 1.0.0'),
    locale: z.string().min(2),
    license: z.string().optional(),
    attribution: z.string().optional(),
    dependencies: z.record(z.string(), z.string()).optional(),
    aliases: z.record(z.string(), z.string()).optional(),
  })
  .strict()

/** Translation overlay: per definition id, only text. Structure always comes from the base locale. */
export const overlaySchema = z.record(
  z.string(),
  z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      template: z.string().optional(),
      entries: z.record(z.string(), z.string()).optional(),
      cards: z.record(z.string(), z.string()).optional(),
      /** Oracle input labels: { odds: { label: Probabilidad, labels: { even: Igualada } } }. */
      inputs: z
        .record(
          z.string(),
          z
            .object({
              label: z.string().optional(),
              labels: z.record(z.string(), z.string()).optional(),
            })
            .strict(),
        )
        .optional(),
    })
    .strict(),
)

export type Entry = z.infer<typeof entry>
export type TableDef = z.infer<typeof tableSchema>
export type OracleDef = z.infer<typeof oracleSchema>
export type GeneratorDef = z.infer<typeof generatorSchema>
export type FieldDef = z.infer<typeof field>
export type DeckDef = z.infer<typeof deckSchema>
export type CardDef = z.infer<typeof card>
export type Definition = z.infer<typeof definitionSchema>
export type Manifest = z.infer<typeof manifestSchema>
export type Overlay = z.infer<typeof overlaySchema>

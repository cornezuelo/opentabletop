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
/**
 * Changes to the values a system declares, by their path as tables read them:
 * `{ party.stats.morale: -1, party.resources.food: '{{1d3}}', party.stats.fatigue: '=0' }`
 * (a number adds or subtracts, '=value' sets). The engine only fills in templates and
 * passes them on (`effects` in the result); the host applies them.
 */
const effects = z.record(z.string(), z.union([z.number(), z.string()]))

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
    unless: condition.optional(),
    result: z.string().optional(),
    table: ref.optional(),
    generator: ref.optional(),
    set: setValues.optional(),
    effects: effects.optional(),
    /** Stop the trip (or whatever rolled it) when this comes up, to let the player act. */
    pause: z.boolean().optional(),
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

/**
 * Ways of rolling a table that a system declares (`kind: roll-modes`): `modes` are offered
 * when rolling by hand; those in `modeWhen` / `modeUnless` apply by themselves when their
 * `when` condition holds and their `unless` one doesn't (a mode only in `modeUnless`
 * applies always but then).
 */
const rollModes = {
  modes: z.array(ref).optional(),
  modeWhen: z.record(ref, condition).optional(),
  modeUnless: z.record(ref, condition).optional(),
  /** Replaced by roll modes: kept only to tell authors what to write instead. */
  advantage: z.boolean().optional(),
}

const tableBody = {
  roll: z.string().optional(),
  ...rollModes,
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
    ...rollModes,
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
    unless: condition.optional(),
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
    effects: effects.optional(),
    pause: z.boolean().optional(),
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
      /** Generator fields' fixed texts: { trap: ' Una trampa guarda la entrada.' }. */
      fields: z.record(z.string(), z.string()).optional(),
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

/** Text in one or several languages: "Advantage" or { en: Advantage, es: Ventaja }. */
const text = z.union([z.string(), z.record(z.string(), z.string())])

/**
 * `kind: roll-modes`: a system's ways of rolling a table's whole roll several times and
 * keeping one total, e.g. advantage (2, the highest) or "steady" (3, the middle one).
 */
export const rollModesSchema = z
  .object({
    kind: z.literal('roll-modes'),
    id: id.optional(),
    modes: z.record(
      id,
      z
        .object({
          name: text.optional(),
          description: text.optional(),
          /** How many times the roll is made (2 or more). */
          repeat: z.number().int().min(2),
          /** Which total is kept. */
          keep: z.enum(['highest', 'lowest', 'middle']),
          /** Modes that, when both apply, cancel each other out (e.g. advantage and disadvantage). */
          cancels: z.union([ref, z.array(ref)]).optional(),
        })
        .strict(),
    ),
  })
  .strict()

export type RollModesDefinition = z.infer<typeof rollModesSchema>

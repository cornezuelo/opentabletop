import { z } from 'zod'

/**
 * Raw pack definitions as authors write them (YAML/JSON). Structural validation only;
 * cross-references, ranges and cycles are checked by the compiler.
 */

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids use lowercase letters, digits and dashes')
/** A definition reference: `kind.id`, `pack/kind.id`, or a template like `table.weather-{{season}}`. */
const ref = z.string().min(1)
const condition = z.record(z.string(), z.unknown())
const setValues = z.record(z.string(), z.unknown())
/**
 * Changes to the values a system declares, by their path as tables read them:
 * `{ party.stats.morale: -1, party.items.ration: '{{1d3}}', party.stats.fatigue: '=0' }`
 * (a number adds or subtracts, '=value' sets). The engine only fills in templates and
 * passes them on (`effects` in the result); the host applies them.
 */
// `true` / `false` set and clear a character's condition (`acting.conditions.wounded: true`);
// read as text, like every other change.
const effects = z.record(
  z.string(),
  z.union([z.number(), z.string(), z.boolean().transform((b) => String(b))]),
)

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

/**
 * The pack format the apps read today: what a pack's syntax means. A pack says which one
 * it was written for (`format` in pack.yaml; absent: today's); a pack of an older format
 * isn't read (for now: nobody else writes packs yet). Bump it whenever
 * the same syntax would mean something else.
 *
 * 1. The first one.
 * 2. A check that no table resolves stops the trip only with `pause: true` (in 1, a
 *    check with neither a table nor effects always stopped it).
 * 3. Travel rules have no built-in day: no `day:` (dawn, nightfall, the night's action),
 *    no `day-start`, `daylight`, `time: dawn`, no camp, rest or march nobody declares and
 *    no `lost` (in 2, rules had them all); `travel.start` and `travel.halt` instead.
 * 4. Marching is an action like the rest: actions move the party with a `travel.move`
 *    step, take parameters (`params`, `do:` with `with:`), and the trip goes on by itself
 *    with `travel.onward`; `speed` and `advance` steps are `travel.speed` and
 *    `travel.advance` (in 3, `actions.march` only said when the built-in march held).
 * 5. Every reference names what it is: moments, blocks and what actions name by their
 *    full name (`trip.hex-enter`, `actions.march`, `modes.horse`), a sheet's own values as
 *    `{{self.values.<id>}}`, and references to a pack's definitions by their kind, the
 *    pack first (`table.ruins`, `core/table.twists`, `roll-modes.advantage`,
 *    `sheet.companion`); in 4 they were bare ids.
 * 6. The checks of a moment are decided one by one, in the rules' order, each seeing what
 *    the ones before it set (in 5, all at once as the moment came).
 * 7. A step's `roll:` holds the rest of its action until it's resolved, so the steps after
 *    it see its result (in 6, it was resolved once the action ended); only the values a
 *    system declares last the day (in 6, any name ending in `Modifier` or `Impossible` too).
 * 8. The party's supplies are its sheet's values or items (`party.values.food`,
 *    `party.items.ration`): the travel rules' `resources` and the bindings' `resources`
 *    (`carried`) are gone, and what hit a bound today is named in full (`trip.below:
 *    party.values.food`; in 7, by its id: `trip.below: food`).
 * 9. What happens when a progress clock fills is the world's reactions'
 *    (`on: world.clocks.<id>.full` in `kind: world`); a clock keeps only `then` (in 8,
 *    `onFull` with its words, table, effects and `then`).
 * 10. What an effect gives with no room left for it, where a sheet refuses more, is left
 *    behind, or waits for the player to make room (`items.full: ask`); in 9, it was kept
 *    in no place.
 * 11. Where the party is is a place, whatever the map: `place.*` (`place.terrain`,
 *    `place.tags`, `place.pois.<id>`, `{{place.danger}}`), the moment `trip.place-enter`, a
 *    `travel.move` to the next `place`, the total `trip.places` (in 10: `hex.*`,
 *    `trip.hex-enter`, `hex`, `trip.hexes`).
 * 12. What joins two places is a connection: travel rules' `connections:` (road, river,
 *    door…) and `trip.connections` (in 11: `edges:` and `trip.edges`).
 */
export const PACK_FORMAT = 12

export const manifestSchema = z
  .object({
    id,
    /** The pack format it was written for (see PACK_FORMAT); absent: today's. Older ones aren't read. */
    format: z.number().int().positive().optional(),
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

# Oracle Engine — design

`@open-tabletop/oracle-engine`: a generic engine for **tables, oracles, generators and decks** for solo RPGs, hexcrawls, TTRPGs and narrative wargames. It takes definitions and context and returns structured results. It knows nothing about hexes, notes or any particular game system.

## 1. Starting point

- **Existing pieces:** `@open-tabletop/hex` and `@open-tabletop/note-refs` (not used here), the hexmapper's immutable command pattern, and the hand-written validator in `model/serialize.ts` (to be replaced by Zod).
- **Extracted into shared packages**, because the Travel and Weather engines need them too:
  - `@open-tabletop/random`: `RandomSource`, seeded PRNG.
  - `@open-tabletop/dice`: dice expressions with breakdown.
  - `@open-tabletop/conditions`: safe condition evaluator.
- **First real client:** Kal-Arath. Its daily procedure (1d6 check → d66 table → 2d6+PRE reaction, with advantage/disadvantage) is the design's test bench.

## 2. Module boundaries

Does:

- Load, validate and compile packs (including translations).
- Resolve tables (ranges and weights), oracles with variants, declarative generators, templates and decks.
- Apply context modifiers and conditions.
- Track once-only / limited results.
- Produce a record of every resolution.

Doesn't:

- UI or persistence: it returns the new state and the record; the caller decides where to keep them.
- Read files directly: it receives `{ path, content }` from an adapter (browser, Node, CLI).
- Implement any system's rules: those live in packs.
- Know other engines: the Travel Engine never calls it; `session` does.

## 3. Architecture

Composition of small pieces:

```
PackLoader ──► parsers (json, yaml)  ──► raw definitions (+ locale overlays)
     │
     ▼
Validator + Compiler  ──►  Registry (compiled, immutable definitions indexed by namespaced id)
                                │
OracleEngine (thin facade) ─────┤
  ├─ TableResolver      (ranges/weights, conditions, once/max, sub-tables, max depth)
  ├─ OracleResolver     (variants chosen by an input: likelihood…)
  ├─ GeneratorResolver  (ordered fields, variables, templates)
  ├─ DeckManager        (shuffle/draw/discard/reset over DeckState)
  ├─ TemplateRenderer   ({{field}}, {{1d6}}, no logic)
  └─ DiceRoller         (@open-tabletop/dice) ◄── RandomSource (@open-tabletop/random)
```

- **Load/validate/compile happens once.** Resolution only works on the compiled `Registry`: normalized ranges, resolved references, detected cycles, pre-parsed dice expressions.
- **State doesn't live in the engine**: every operation takes `OracleState` and returns a new one. `OracleSession` is an optional convenience wrapper that holds the state.

## 4. Definition model

Files are YAML or JSON, one or more definitions each (`kind` is required). Ids are local to the pack; the registry exposes them as `<pack>/<id>`.

### Table

```yaml
kind: table
id: weather-spring
name: Spring weather
roll: 1d6 # omit for a weighted table
clamp: true # modified rolls outside the range use the first/last entry (default true)
entries:
  - id: clear # optional stable id (recommended for translations and once/max state)
    range: 1 # single number or "a-b"
    result: Clear skies
    set: { lost: 1, forage: 1 } # structured values merged into the result
  - range: 6
    result: Storm
    set: { travel: none, forage: impossible, lost: -2 }
```

- `result` is text (a template) or an object. `table:` / `generator:` delegate to another definition. `set:` adds fields.
- **Roll modes:** a system declares its ways of rolling in `kind: roll-modes` (`repeat`, `keep: highest | lowest | middle`, `cancels`); a table or oracle lists the ones it offers by hand (`modes`) and the ones that apply by themselves on a condition (`modeWhen`, and `modeUnless` for when they don't). Modes that cancel each other drop out; the engine knows no "advantage" of its own.
- **Weighted:** `weight: 3` instead of `range`. The selection method is pluggable (`selector: range | weight`).
- **Conditions:** `when:` on an entry enables/disables it based on context; only enabled entries are candidates.
- **Pause:** `pause: true` on an entry or card puts `pause: true` in the result; a host that plays (a trip) stops there until the player goes on.
- **Limits:** `once: true` or `maxOccurrences: 3`. An exhausted entry is re-rolled (up to N tries) or skipped to the next available one, per `onExhausted: reroll | next | none`.

### Oracle

An oracle is a table whose **variant is picked by a context input**. Nothing Mythic-specific in the core.

```yaml
kind: oracle
id: yes-no
inputs:
  likelihood: { options: [unlikely, even, likely], default: even }
roll: d100
variants:
  likely:
    entries:
      - { range: 1-5, result: Exceptional yes, set: { answer: yes, exceptional: true } }
      - { range: 6-75, result: 'Yes', set: { answer: yes } }
      - { range: 76-95, result: 'No', set: { answer: no } }
      - { range: 96-100, result: Exceptional no, set: { answer: no, exceptional: true } }
  even: { … }
  unlikely: { … }
```

The question ("Is the gate guarded?") goes into the context and the record, not the definition.

The input is the oracle's own data: its id, options and default are whatever the pack needs (odds for a yes/no oracle, an NPC's attitude, a distance…); nothing in the engine or the apps assumes `odds`. Optional `label` and `labels` are what UIs show instead of the ids, and they are translatable:

```yaml
inputs:
  odds:
    label: Odds
    options: [unlikely, even, likely]
    labels: { unlikely: Unlikely, even: Even, likely: Likely }
    default: even
```

### Generator

Fields resolve in order; each may use earlier ones as context and in conditions:

```yaml
kind: generator
id: settlement
fields:
  size: { table: settlement-size }
  faction: { table: settlement-faction }
  npc: { generator: npc } # composition
  conflict: { table: settlement-conflict, context: { size: '{{size.value}}' } }
template: '{{size}} ruled by {{faction}}. {{npc}}'
```

### Deck

```yaml
kind: deck
id: event-deck
cards:
  - { id: storm, result: A storm is coming, count: 2 }
  - { id: ambush, table: ambushes }
reshuffle: when-empty # when-empty | manual | after-draw
```

### Dice (`@open-tabletop/dice`)

- **MVP:** `NdM`, `dM`, `d100`, `d66` (tens and units), `NdF`, `+`/`-` constants, `kh`/`kl` (keep highest/lowest: `2d6kh1`), and **repeat-and-keep** (`roll(expr, random, { repeat, keep })`), which rolls the whole expression several times and keeps the highest, lowest or middle total: what roll modes use.
- `roll: "2d6 + {{pre}}"`: the template is substituted from context **before** parsing, and only numbers are accepted, so nothing else can be injected.
- The grammar is extensible with new term types.
- Breakdown result:

```ts
{ expression: '2d6+1', terms: [{ kind: 'dice', sides: 6, rolls: [4, 5], kept: [4, 5] }, { kind: 'const', value: 1 }], total: 10 }
```

### Conditions (`@open-tabletop/conditions`)

- **MVP:** object matchers that can be checked without evaluating code:

```yaml
when: { terrain: forest } # equality
when: { terrain: [forest, swamp] } # membership
when: { danger: { gte: 4 }, season: { not: winter } }
when: { any: [{ weather: storm }, { lost: true }] } # all/any/not
```

- **Later:** a string DSL (`danger >= 4 and season == "winter"`) compiled to the same tree by our own parser. Never `eval` or `Function`.

## 5. Localization of packs

- A pack has **exactly one required base locale** (`locale` in `pack.yaml`). It contains complete definitions.
- **Translations are optional overlays**, one folder per locale, mirroring only the translatable strings:

```
packs/kal-arath/
  pack.yaml            # locale: es
  tables/encounters.yaml
  locales/
    en/encounters.yaml
```

```yaml
# locales/en/encounters.yaml — keyed by definition id, then entry id
encounters:
  name: Encounters on the Kal-Arath plains
  entries:
    nomad-scouts: '{{1d6}} nomad scouts'
    pilgrims: '{{3d6}} monastic pilgrims'
```

- Overlays can also translate `description`, a generator's `template` and its fields' fixed texts (`fields: { trap: ' Una trampa…' }`, by field name; only string `value`s), deck `cards` (by card id) and oracle input labels (`inputs: { odds: { label: Probabilidad, labels: { even: Igualada } } }`).
- Resolution takes a `locale`; **every string falls back to the base locale** when that locale has no translation for it (missing definitions, entries or fields are fine).
- Translations only replace text (names, descriptions, result templates, generator templates, deck card texts). Structure (ranges, weights, dice, `set` values, conditions) always comes from the base, so translations can never change mechanics.
- Entries are matched by **explicit entry ids**; entries without an id can't be translated (the validator warns). Translators therefore never depend on entry order.
- The validator reports translations pointing at unknown definitions or entries, and lists untranslated strings per locale (useful for translators).

## 6. Runtime state

```ts
interface OracleState {
  decks: Record<string, { draw: string[]; discard: string[] }> // explicit order: reproducible
  occurrences: Record<string, number> // '<pack>/<table>#<entryId>' → times rolled
  vars: Record<string, unknown> // persistent session variables
}
```

It is serializable and goes into the OTD bundle (`state.oracle`). Definitions never change. Entries are identified by their explicit `id` or, failing that, their index (fine for stable packs; explicit ids are recommended for evolving ones). In an oracle, an entry without an id is counted per variant (`#likely.0`), while an explicit id counts across variants (a `once` dragon appears once whatever the odds). Saved decks are reconciled with the deck as it is now: cards that no longer exist are dropped and new copies are shuffled into the draw pile, so editing a deck never breaks a session; shuffling always gathers every card.

## 7. Result model

```ts
interface Resolution {
  source: string // 'kal-arath/encounters'
  kind: 'table' | 'oracle' | 'generator' | 'deck'
  value: Record<string, unknown> // structured: { creature: 'wolves', count: 6, … }
  text?: string // rendered template, in the requested locale
  entry?: string // chosen entry
  rolls: DiceResult[] // breakdown of every roll at this node
  children: Resolution[] // sub-tables and fields: the full tree, for UI and debugging
  context: Record<string, unknown> // effective context used
}

interface ResolveOutcome {
  resolution: Resolution
  state: OracleState // new state (or the same one if unchanged)
  record: HistoryRecord // { at, source, input, rolls, value, text, seed? }: persisted by the caller
}
```

**Not everything ends up as a string:** `value` always carries usable data; `text` is an optional presentation.

## 8. Public API

```ts
const registry = await loadPacks(files, { parsers: [json, yaml] }) // validates and compiles; errors with path and position
const engine = createOracleEngine({
  registry,
  random: seeded(42),
  maxDepth: 16,
  locale: 'en',
  onEvent,
})

engine.resolve('kal-arath/encounters', ctx, state) // table or oracle
engine.generate('kal-arath/settlement', ctx, state)
engine.draw('core/event-deck', state)
engine.shuffle('core/event-deck', state) / engine.reset(id, state)
engine.list({ kind: 'table', tag: 'encounter' }) // for UI browsers

validatePack(files) // without compiling, for editors and the CLI (`oracle validate ./packs/kal-arath`)
```

- `onEvent` is an optional callback (`TABLE_RESOLVED`, `DECK_DRAWN`, `ORACLE_RESOLVED`…). No dedicated event bus.
- The context is a plain object of values (`{ terrain, weather, danger, pre }`), so the engine never knows what a hex is.

## 9. Directory layout

```
packages/oracle-engine/src/
  index.ts             # public API
  definitions/         # definition types and Zod schemas
  loader/              # PackLoader, json/yaml parsers, dependency and alias resolution, locale overlays
  compile/             # Validator + Compiler → Registry
  resolve/             # table.ts, oracle.ts, generator.ts, deck.ts, template.ts
  state.ts             # OracleState and immutable helpers
  history.ts
packages/dice/src/        parser.ts, roll.ts, types.ts
packages/random/src/      index.ts (RandomSource, seeded, mathRandom)
packages/conditions/src/  index.ts (match(cond, ctx), validate(cond))
packs/core/               pack.yaml, oracles/yes-no.yaml, …
packs/kal-arath/          pack.yaml (in git) + tables in the private packs repo
```

## 10. Risks

| Risk                                                           | Mitigation                                                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The condition DSL grows into a language                        | MVP uses objects with a closed operator list; the future string DSL compiles to the same tree.            |
| Templates with logic (loops, ifs)                              | Value and dice substitution only. Logic goes in `when` or generators.                                     |
| Entry ids change when a pack is edited, breaking `occurrences` | Optional explicit entry ids; the validator warns when a pack with state changes incompatibly.             |
| Infinite recursion (A → B → A)                                 | The compiler detects static cycles; `maxDepth` at runtime catches dynamic ones (conditions).              |
| Translations changing mechanics                                | Overlays can only replace text; structure always comes from the base locale.                              |
| Copyright of third-party packs                                 | The engine ships no content; personal-use packs live in the private repo; `core` is our own FOSS content. |
| Reproducibility                                                | Injected `RandomSource`; every record keeps raw rolls; decks keep explicit order in state.                |
| Large, slow packs                                              | Compiled once; resolution is O(entries) without reparsing.                                                |

## 11. MVP

- `random` (seeded mulberry32 and `Math.random`), `dice` (MVP grammar with breakdown), `conditions` (object matcher).
- JSON + YAML loader, packs with `pack.yaml`, namespaces and simple dependencies, locale overlays with fallback.
- Validation: syntax, unknown references, overlapping or gapped ranges, cycles, missing dependencies, empty decks, translation keys that don't exist.
- Range and weighted tables, sub-tables, oracles with variants, simple generators, templates, context and modifiers.
- `once` / `maxOccurrences`, `OracleState`, history, structured results.
- Tests with deterministic RNG for all of the above.
- **Not in the MVP:** complex UI, visual editor, string DSL, CSV/Markdown, importers, CLI, scripting, sync, network.

## 12. Examples with Kal-Arath's structure

The real rulebook content lives in the private pack; these examples use placeholder text to show the shape.

**Daily encounter check** (1d6, encounter on 5–6; then a d66 table and a 2d6+PRE reaction):

```yaml
kind: generator
id: encounter-check
fields:
  check: { roll: 1d6 }
  encounter:
    when: { check: { gte: 5 } }
    table: encounters
  reaction:
    when: { check: { gte: 5 } }
    table: reaction
template: '{{encounter}} — reaction: {{reaction}}'
---
kind: table
id: encounters
roll: d66
entries:
  - { id: scouts, range: 11, result: '{{1d6}} nomad scouts', set: { kind: humans } }
  - { id: pilgrims, range: 12, result: '{{3d6}} pilgrims', set: { kind: humans } }
  - {
      id: beasts,
      range: 13,
      result: '{{count}} steppe beasts',
      set: { count: '{{2d6}}', kind: beast },
    }
  # … up to 66
---
kind: table
id: reaction
roll: '2d6 + {{pre}}' # party PRE, from context
entries:
  - { id: kill, range: 2-3, result: Kill, set: { hostile: true } }
  - { id: hostile, range: 4-6, result: Hostile, set: { hostile: true } }
  - { id: neutral, range: 7-8, result: Neutral }
  - { id: friendly, range: 9-10, result: Friendly }
  - { id: helpful, range: 11-12, result: Helpful }
```

Used by the integration layer when the Travel Engine emits `ENCOUNTER_CHECK_REQUIRED`:

```ts
engine.generate('kal-arath/encounter-check', { pre: party.stats.pre }, state)
// → value: { check: 5, encounter: { kind: 'humans', … }, reaction: { hostile: true } }, text: '4 nomad scouts — reaction: Hostile'
```

**Weather by season:** one table per season with modifiers in `set`, selected through a dynamic reference `table: 'weather-{{season}}'` validated against the seasons declared in `inputs`. Weather with inertia (Markov) belongs to `weather-engine`, not to a table.

**Getting lost** isn't a table but a Travel Engine **navigation rule** (1–2 on 1d6, no roll when following a road or river). The Oracle would only resolve it if the pack declares it as a table and the bindings map it to `NAVIGATION_CHECK_REQUIRED`.

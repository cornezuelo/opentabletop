# Syntax

Everything a pack can write, in one place: each piece of syntax, where it goes, every form it takes and an example that works, with a link to the page that explains it at length. Packs are plain data: nothing here runs code, so a pack from anyone is safe to load.

In the apps this page is one click away: **Syntax** at the top of the help column. Click an example in `code` there and it goes into the text box or YAML editor you were in, where the cursor was.

## Values: `key: value`

Most boxes and most of the YAML are `key: value` pairs.

| Write                      | Means                                                   |
| -------------------------- | ------------------------------------------------------- |
| `terrain: forest`          | a word                                                  |
| `danger: 3`, `lost: true`  | a number, a yes/no                                      |
| `terrain: [forest, hills]` | a list                                                  |
| `danger: { gte: 3 }`       | a value inside another (here, a comparison)             |
| `count: '{{2d6}}'`         | a [variable or roll](#variables), in quotes (see below) |

- **In a form's box**, write the pairs without braces, separated by commas: `terrain: forest, danger: { gte: 3 }`. A box that can't be read turns red and isn't saved.
- **In YAML**, the same between braces on one line (`when: { terrain: forest }`) or one pair per indented line.
- **Quotes** (`'…'`) keep a text as text. YAML gives a few characters a meaning of their own, so a text that has them must go in quotes, or YAML reads something else:
  - **starting with `{`**: YAML opens a value inside another, so every variable or roll needs quotes: `count: '{{2d6}}'`, not `count: {{2d6}}`; `gte: '{{nightfall}}'`, not `gte: {{nightfall}}`;
  - **`: ` inside** (a colon and a space): YAML takes it for a new key: `result: 'Ambush: two wolves'`;
  - **` #` inside** (a space and a hash): YAML takes the rest for a comment and drops it: `result: 'Door #3'`;
  - **starting with `- `** (a dash and a space): YAML takes it for an item of a list: `result: '- nothing -'`.

  A quote inside a quoted text is written twice: `'The guard''s dog'`. When in doubt, quote: it never hurts. Forms do it for you.

- **Dotted names** reach inside a value: `party.stats.morale`, `party.resources.food`, `yesterday.lost`, `moons.ember`, `icon.guards`, `token.might`, `around.lake`. Every name a table can read: [What tables see](04-what-tables-see.md).
- **Full names and short names**: each fact of the map, the trip and the world has a full name by where it comes from, and most a short one: `hex.terrain` / `terrain`, `time.season` / `season`, `system.nightfall` / `nightfall`, `trip.day` / `tripDay`, `world.events` / `events`; the trip so far only by its full names (`trip.km`, `trip.hours`, `trip.taken.camp`, `trip.spent.food`…); also `party.*`, `today.*`, `yesterday.*`, `from.*`, `around.*`. Both read the same value; a full name can't be hidden by a stat with the same name. The list: [Full names and short names](04-what-tables-see.md#full-names-and-short-names).

## Ids and references

- **Ids** use lowercase letters, digits and dashes: `getting-lost`, `npc-roles`.
- **References** to a definition: `weather` (the same pack), `core/weather` (another pack, by its id), or one a variable picks: `'weather-{{season}}'`.
- Entries and cards have ids too, for translations and once-only entries.

## Dice

In a table's or oracle's `roll`, a generator field's `roll`, and inside texts as `{{…}}`. More: [Dice, variables and context](../oracle/08-dice-and-templates.md).

| Write                        | Rolls                                    |
| ---------------------------- | ---------------------------------------- |
| `1d6`, `3d8`, `d20`          | N dice of M sides, added (`dM` is `1dM`) |
| `d%`, `d100`                 | 1 to 100                                 |
| `d66`                        | two d6 as tens and units: 11 … 66        |
| `4dF`                        | Fudge dice, −4 to +4                     |
| `2d6+1`, `1d6+1d4`, `1d20-2` | sums and differences                     |
| `4d6kh3`, `2d20kl1`          | keep the highest 3, keep the lowest 1    |
| `1d6 + {{danger}}`           | plus a value (missing counts as 0)       |

Without `roll`, a table picks by `weight` (1 if none): `{ weight: 3, result: pilgrim }`.

## Ranges

An entry's `range` is the totals it covers: `3`, `2-5`, `-1` (a total below zero), `11-16` with `d66`. Ranges can't overlap; with **clamp** (`clamp: true`, the default) a total below the lowest takes the first entry and above the highest the last.

## Variables

`{{name}}` is a **variable**: the value with that name. `{{2d6}}` is a **roll**. Inside a text, each is written in its place; a value that is a whole `'{{…}}'` is what it names (a number stays a number, a list a list). More: [Dice, variables and context](../oracle/08-dice-and-templates.md#variables-in-texts).

| Write          | Is                                                    |
| -------------- | ----------------------------------------------------- |
| `{{2d6}}`      | a roll: `'{{2d6}} wolves'` → "7 wolves"               |
| `{{season}}`   | a variable: a value of the context                    |
| `{{npc.role}}` | a part of a value                                     |
| `{{result}}`   | the text of the table an entry rolled next (`table:`) |
| `{{field}}`    | a generator's field, in its template                  |

A missing value shows as nothing. Variables work in results, generator templates and fixed fields, card texts, `set` and `effects` values, references, [conditions](08-conditions.md#variables-and-rolls) (`gte: '{{party.stats.stealth}}'`, `gte: '{{1d20}}'`: a roll is the same all through a moment), and a check action's **When nothing applies** (`{terrain}`, with single braces there).

## Conditions

When something applies. The same syntax everywhere: `when` (must hold) and `unless` (must not). Full reference: [Conditions](08-conditions.md).

| Write                                       | Holds when                                  |
| ------------------------------------------- | ------------------------------------------- |
| `terrain: forest`                           | it's exactly that                           |
| `terrain: [forest, hills]`                  | it's any of them                            |
| `tags: landmark`                            | a list (tags, holidays) contains it         |
| `season: { not: summer }`                   | it's anything else (or missing)             |
| `danger: { gte: 3 }`                        | `gt`, `gte`, `lt`, `lte`: a number compared |
| `danger: { gte: 2, lte: 4 }`                | every comparison holds                      |
| `weather: { in: [rain, storm] }`            | the same as a list                          |
| `region: { exists: false }`                 | it's missing (`true`: it's there)           |
| `danger: { gt: '{{party.stats.stealth}}' }` | a variable: compared with another value     |
| `party.stats.wits: { gte: '{{1d20}}' }`     | a roll: under the wits (once a moment)      |
| `{ terrain: forest, timeOfDay: night }`     | every pair holds                            |
| `any: [{ edges: road }, { mode: boat }]`    | one of them holds                           |
| `all: [{ tags: ford }, { tags: toll }]`     | all of them (one name twice)                |
| `not: { timeOfDay: night }`                 | the condition inside doesn't                |

**Where they go:**

| Where                            | Keys                                                 |
| -------------------------------- | ---------------------------------------------------- |
| table and oracle entries         | `when`, `unless`                                     |
| generator fields                 | `when`, `unless`                                     |
| roll modes used by themselves    | `modeWhen`, `modeUnless` (by mode id)                |
| travel checks                    | `when`, `unless`                                     |
| actions, and each of their steps | `when`, `unless`                                     |
| ways of travelling               | `when`, `unless` (chosen), `through` (where it goes) |
| terrains and water               | `passable: { when, unless }`                         |

## Setting values: `set`

On a table entry or deck card: values the result gives, read by the result's text, by the table it rolls next, by later generator fields and by the trip. Any name: `set: { weather: storm, lostModifier: -1, count: '{{2d6}}' }`.

What a trip does with them ([Connecting](../oracle/07-connecting.md#4-results-the-trip-understands)):

- `weather: <id>`: today's weather.
- A **value of the day** the system declares (`lost: true`): it holds for the rest of the day and **blocks** what it lists. `false` clears it (`set: { refusing: false }`).
- Names ending in `…Modifier` or `…Impossible`, and `weather`: kept for the rest of the day too, for later tables.
- The next day, today's values are read as `yesterday.<name>`.

An action's step takes `set` too: `{ set: { lost: true } }`.

## Changing the party: `effects`

On entries, cards, checks and action steps. Each key is a value the system declares, by its path; each value says how it changes:

| Write                                             | Does                                                           |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `party.resources.food: -1`                        | takes 1 away                                                   |
| `party.stats.morale: 2`                           | adds 2                                                         |
| `party.stats.fatigue: '=0'`                       | sets it to 0                                                   |
| `party.resources.food: '{{1d3+1}}'`               | adds a roll                                                    |
| `party.resources.food: '-{{party.stats.mouths}}'` | takes away as many as another value says                       |
| `party.stats.morale: '={{party.stats.charisma}}'` | sets it to another value                                       |
| `party.resources.food: '-{{1d3}}'`                | takes away a roll (in a trip, the same all through the moment) |

A change stops at the value's `min` / `max`; what hit one is seen afterwards as `below: [ids]` / `above: [ids]`. Without bounds a value may go anywhere, negative too.

## Moments

When a check is rolled (`at:`) or an action is taken by the system itself (`on:`). One moment, or several as a list (`[hex-enter, rest]`); conditions and tables see which one as `moment`.

| Moment                            | When                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| `day-start`                       | at dawn, before marching                                      |
| `hex-enter`                       | entering each hex                                             |
| `day-end`                         | as each day ends, camping or not (actions first, then checks) |
| an action's id (`camp`, `forage`) | when the party takes that action                              |

A check without `at` is rolled only by a step (`roll:`); an action without `on` is a button.

## Steps of an action

An action's `do:` is a list of steps, in order; each does one thing and may have its own `when` / `unless`.

| Step                                             | Does                                         |
| ------------------------------------------------ | -------------------------------------------- |
| `time: 120`                                      | 120 minutes pass                             |
| `time: dawn`, `time: nightfall`, `time: '14:00'` | until then                                   |
| `speed: 0.5`                                     | the rest of today's march at half speed      |
| `effects: { party.stats.fatigue: -1 }`           | changes the party                            |
| `set: { lost: true }`                            | gives a value of the day                     |
| `do: forage`                                     | takes another action, if its conditions hold |
| `roll: ENCOUNTER_CHECK_REQUIRED`                 | rolls a check now                            |
| `{ unless: { below: food }, effects: { … } }`    | only when its condition holds                |

`march` is the system's marching (the Travel buttons): only `when` / `unless`, checked as the party marches (default: `when: { time.daylight: true, trip.marched: { lt: '{{system.hoursPerDay}}' } }`). Besides `do`, an action has `name`, `description`, `when` / `unless`, `on`, `oncePerDay: true`, `hideWhenUnavailable: true` (its button hides while it can't be taken) and `nothing` (what the journal says when none of its checks apply). Full: [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).

## What blocks: `blocks`

A value of the day lists what can't be done while it holds: `travel` (no more marching), an action's id (`camp`, `forage`) or a way of travelling as `mode.<id>` (`mode.horse`). `values: { snowbound: { blocks: [mode.horse] } }`.

## Speeds

Travel rules multiply speeds: a terrain's or road's `multiplier` (`0.5` half, `1` normal, `1.5` faster), a weather's `speed` (`0` no travel), a way of travelling's `kmPerDay`, and `defaultTerrain` for terrains not listed. Clock times are written `'06:00'` (quoted), durations in minutes.

## Limits and stops

| Write                                         | On                     | Does                            |
| --------------------------------------------- | ---------------------- | ------------------------------- |
| `once: true`                                  | entries                | comes up once a session         |
| `maxOccurrences: 3`                           | entries                | at most 3 times a session       |
| `onExhausted: reroll / next / none`           | tables, oracles        | what an exhausted entry does    |
| `pause: true`                                 | entries, cards, checks | the trip stops for **Continue** |
| `oncePerDay: true`                            | actions                | once a day                      |
| `reshuffle: when-empty / manual / after-draw` | decks                  | when cards go back              |

## Descriptions

Descriptions take basic Markdown: a blank line between paragraphs, `**bold**`, `_italics_`, `` `code` ``, lists (`- item`), quotes (`> …`) and web links (`[text](https://…)`); nothing else, HTML included, is shown as text. In YAML, a long one goes as a block: `description: |-` and the text indented below.

## Translations

Never inline: a pack's texts are written once in its base language, and translations go in `locales/<lang>/<file>` overlays, keyed by id. See [Translations](../oracle/05-translations.md).

Every kind of definition, with a whole example: [Kinds of definition](07-kinds.md).

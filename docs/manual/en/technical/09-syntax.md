# Syntax

Everything a pack can write, in one place: each piece of syntax, where it goes, every form it takes and an example that works, with a link to the page that explains it at length. Packs are plain data: nothing here runs code, so a pack from anyone is safe to load.

In the apps this page is one click away: **Syntax** at the top of the help column. Click an example in `code` there and it goes into the text box or YAML editor you were in, where the cursor was.

## Values: `key: value`

Most boxes and most of the YAML are `key: value` pairs.

| Write                               | Means                                                   |
| ----------------------------------- | ------------------------------------------------------- |
| `hex.terrain: forest`               | a word                                                  |
| `hex.danger: 3`, `today.lost: true` | a number, a yes/no                                      |
| `hex.terrain: [forest, hills]`      | a list                                                  |
| `hex.danger: { gte: 3 }`            | a value inside another (here, a comparison)             |
| `count: '{{2d6}}'`                  | a [variable or roll](#variables), in quotes (see below) |

- **In a form's box**, write the pairs without braces, separated by commas: `hex.terrain: forest, hex.danger: { gte: 3 }`. A box that can't be read turns red and isn't saved. Where a form builds a condition as rows, its **YAML** button shows this box.
- **In YAML**, the same between braces on one line (`when: { hex.terrain: forest }`) or one pair per indented line.
- **Quotes** (`'…'`) keep a text as text. YAML gives a few characters a meaning of their own, so a text that has them must go in quotes, or YAML reads something else:
  - **starting with `{`**: YAML opens a value inside another, so every variable or roll needs quotes: `count: '{{2d6}}'`, not `count: {{2d6}}`; `gte: '{{system.hoursPerDay}}'`, not `gte: {{system.hoursPerDay}}`;
  - **`: ` inside** (a colon and a space): YAML takes it for a new key: `result: 'Ambush: two wolves'`;
  - **` #` inside** (a space and a hash): YAML takes the rest for a comment and drops it: `result: 'Door #3'`;
  - **starting with `- `** (a dash and a space): YAML takes it for an item of a list: `result: '- nothing -'`.

  A quote inside a quoted text is written twice: `'The guard''s dog'`. When in doubt, quote: it never hurts. Forms do it for you.

- **Dotted names** reach inside a value: `party.stats.morale`, `party.values.food`, `party.items.ration.count`, `yesterday.lost`, `time.moons.ember`, `hex.icon.guards`, `token.might`, `around.lake`. Every name a table can read: [What tables see](04-what-tables-see.md).
- **Full names and short names**: each fact of the map, the trip and the world has a full name by where it comes from, and most a short one: `hex.terrain` / `terrain`, `time.season` / `season`, `system.hoursPerDay` / `hoursPerDay`, `trip.day` / `tripDay`, `world.events` / `events`; the trip so far only by its full names (`trip.km`, `trip.hours`, `trip.taken.camp`, `trip.spent.food`…); also `party.*`, `today.*`, `yesterday.*`, `from.*`, `around.*`. Both read the same value; a full name can't be hidden by a stat with the same name. The list: [Full names and short names](04-what-tables-see.md#how-to-read-this-page).

## Ids and references

- **Ids** use lowercase letters, digits and dashes: `getting-lost`, `npc-roles`.
- **References** to a definition say what it is: its `kind`, as the definition writes it, then its id: `table.weather`, `oracle.ford`, `generator.npc`, `deck.omens`, `roll-modes.advantage`, `sheet.companion`, `calendar.marcher-reckoning`, `weather.sky`, `travel-rules.default`, `bindings.default`, `factions.default`, `clocks.default`. Another pack's goes after its id and a slash: `core/table.twists` (the pack must be one of its `dependencies`). One a variable picks keeps its kind first: `'table.weather-{{time.season}}'`. A reference without its kind (`weather`) isn't read: the problem says which one was meant (`write table.weather`).
- Where a field rolls something (an entry's or card's `table:` / `generator:`, a binding's `resolve:`, a faction's `turn:`, a step's `roll:` in an action or a world reaction), it may be a table, an oracle, a generator or a deck: the kind says which (`table: generator.npc`, `resolve: oracle.ford`).
- A pack's `aliases` give another name to a reference: `aliases: { table.twist: core/table.twists }`, then `table: table.twist`.
- Entries and cards have ids too, for translations and once-only entries.
- **Inside a system**, what its rules name is written by its full name, `subsystem.id`, so it always says what it is: a moment (`trip.hex-enter`, `time.day-end`, a part of the day `time.part.morning`, a clock of the world filling `world.clocks.<id>.full`), an action (`actions.camp`), a check (`checks.ENCOUNTER`), a way of travelling (`modes.horse`), moving on (`travel.move`), a parameter of the action (`params.how`). The values a condition compares stay short, since its key already says what they are: `trip.edges: road`, `hex.terrain: forest`.

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
| `1d6 + {{hex.danger}}`       | plus a value (missing counts as 0)       |

Without `roll`, a table picks by `weight` (1 if none): `{ weight: 3, result: pilgrim }`.

## Ranges

An entry's `range` is the totals it covers: `3`, `2-5`, `-1` (a total below zero), `11-16` with `d66`. Ranges can't overlap; with **clamp** (`clamp: true`, the default) a total below the lowest takes the first entry and above the highest the last.

## Variables

`{{name}}` is a **variable**: the value with that name. `{{2d6}}` is a **roll**. Inside a text, each is written in its place; a value that is a whole `'{{…}}'` is what it names (a number stays a number, a list a list). More: [Dice, variables and context](../oracle/08-dice-and-templates.md#variables-in-texts).

| Write             | Is                                                    |
| ----------------- | ----------------------------------------------------- |
| `{{2d6}}`         | a roll: `'{{2d6}} wolves'` → "7 wolves"               |
| `{{time.season}}` | a variable: a value of the context                    |
| `{{npc.role}}`    | a part of a value                                     |
| `{{result}}`      | the text of the table an entry rolled next (`table:`) |
| `{{roll}}`        | in a table's entries, the total of its own roll       |
| `{{field}}`       | a generator's field, in its template                  |

**Arithmetic.** Inside the braces, numbers, values and dice can be added, taken away, multiplied and divided, with brackets and the functions `floor`, `ceil`, `round` (to a whole number down, up, nearest), `min`, `max` (the smallest or largest of several) and `abs`. Ids may hold a hyphen (`night-march`), so a minus between two names takes spaces: `a - b`. A value that isn't a number, or a division by 0, gives nothing. Arithmetic, never logic: for _if_, write a [condition](08-conditions.md).

| Write                                              | Is                                           |
| -------------------------------------------------- | -------------------------------------------- |
| `'{{self.values.might * 2 + 4}}'`                  | twice a value, plus 4                        |
| `'{{self.values.maxHealth - self.values.health}}'` | one value minus another (spaces around −)    |
| `'{{floor(party.stats.mouths / 2)}}'`              | half, rounded down                           |
| `'{{max(party.stats.survival, 1)}}'`               | at least 1                                   |
| `'-{{1d6 + hex.danger}}'`                          | in an effect: takes away a roll plus a value |

A missing value shows as nothing. Variables work in results, generator templates and fixed fields, card texts, `set` and `effects` values, references, [conditions](08-conditions.md#variables-and-rolls) (`gte: '{{party.stats.stealth}}'`, `gte: '{{1d20}}'`: a roll is the same all through a moment), and a check action's **When nothing applies** (`{terrain}`, with single braces there).

## Conditions

When something applies. The same syntax everywhere: `when` (must hold) and `unless` (must not). Full reference: [Conditions](08-conditions.md).

| Write                                              | Holds when                                  |
| -------------------------------------------------- | ------------------------------------------- |
| `hex.terrain: forest`                              | it's exactly that                           |
| `hex.terrain: [forest, hills]`                     | it's any of them                            |
| `hex.tags: landmark`                               | a list (tags, holidays) contains it         |
| `time.season: { not: summer }`                     | it's anything else (or missing)             |
| `hex.danger: { gte: 3 }`                           | `gt`, `gte`, `lt`, `lte`: a number compared |
| `hex.danger: { gte: 2, lte: 4 }`                   | every comparison holds                      |
| `trip.weather: { in: [rain, storm] }`              | the same as a list                          |
| `hex.region: { exists: false }`                    | it's missing (`true`: it's there)           |
| `hex.danger: { gt: '{{party.stats.stealth}}' }`    | a variable: compared with another value     |
| `party.stats.wits: { gte: '{{1d20}}' }`            | a roll: under the wits (once a moment)      |
| `{ hex.terrain: forest, timeOfDay: night }`        | every pair holds                            |
| `any: [{ trip.edges: road }, { trip.mode: boat }]` | one of them holds                           |
| `all: [{ hex.tags: ford }, { hex.tags: toll }]`    | all of them (one name twice)                |
| `not: { timeOfDay: night }`                        | the condition inside doesn't                |

**Where they go:**

| Where                                    | Keys                                                 |
| ---------------------------------------- | ---------------------------------------------------- |
| table and oracle entries                 | `when`, `unless`                                     |
| generator fields                         | `when`, `unless`                                     |
| roll modes used by themselves            | `modeWhen`, `modeUnless` (by mode id)                |
| party stats from the characters (`from`) | `when`, `unless` (read for each character)           |
| a step that waits                        | `wait` (with `limit`)                                |
| travel checks                            | `when`, `unless`                                     |
| actions, and each of their steps         | `when`, `unless`                                     |
| ways of travelling                       | `when`, `unless` (chosen), `through` (where it goes) |
| terrains and water                       | `passable: { when, unless }`                         |

## Setting values: `set`

On a table entry or deck card: values the result gives, read by the result's text, by the table it rolls next, by later generator fields and by the trip. Any name: `set: { weather: storm, lostModifier: -1, count: '{{2d6}}' }`.

What a trip does with them ([Connecting](../oracle/07-connecting.md#4-results-the-trip-understands)):

- `weather: <id>`: today's weather.
- A **value of the day** the system declares (`lost: true`, `lostModifier: -1`): it holds for the rest of the day and **blocks** what it lists, if anything. `false` clears it (`set: { refusing: false }`).
- Any other name lasts only for that roll (its text, the table it rolls next).
- The next day, today's values are read as `yesterday.<name>`.

An action's step takes `set` too: `{ set: { lost: true } }`.

## Changing the party: `effects`

On entries, cards, checks and action steps. Each key is a value the system declares, by its path; each value says how it changes:

| Write                                                      | Does                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `party.values.food: -1`                                    | takes 1 away                                                                                                                                      |
| `party.stats.morale: 2`                                    | adds 2                                                                                                                                            |
| `party.stats.fatigue: '=0'`                                | sets it to 0                                                                                                                                      |
| `party.values.food: '{{1d3+1}}'`                           | adds a roll                                                                                                                                       |
| `party.items.ration: '-{{party.stats.mouths}}'`            | takes away as many as another value says: of the party's items, its own first, then its characters' as their sheet shares them out                |
| `party.stats.morale: '={{party.stats.charisma}}'`          | sets it to another value                                                                                                                          |
| `party.values.food: '-{{1d3}}'`                            | takes away a roll (in a trip, the same all through the moment)                                                                                    |
| `party.members.values.health: 1`                           | adds 1 to every character of the party                                                                                                            |
| `party.values.morale: -1`, `party.conditions.shaken: true` | the party's own sheet (its `partySheet`)                                                                                                          |
| `characters.kael.values.health: -1`                        | takes 1 from one character, by id                                                                                                                 |
| `acting.conditions.wounded: true`                          | the character acting now gets a condition (`false` clears it)                                                                                     |
| `roles.lookout.values.health: -1`                          | whoever holds a journey role                                                                                                                      |
| `acting.items.torch: -1`, `characters.kael.items.rope: 2`  | one item fewer (from the last ones first; at 0 it's gone), or more (from the system's [catalogues](07-kinds.md#item-catalogues) when it has none) |
| `party.members.items.torch.uses: -1`                       | a field of each one's first torch (nothing for whoever has none); a field that runs out uses one up at its min                                    |
| `faction.territory: 1`, `faction.values.strength: -1`      | in a faction's turn table: its land, its values                                                                                                   |
| `world.clocks.the-siege: 1`                                | ticks a progress clock (a faction's turn, a world reaction, or a trip's result on a map); `'=0'` sets it                                          |

A change stops at the value's `min` / `max`; what hit one that day is seen afterwards as `trip.below` / `trip.above` (lists of full names: `trip.below: party.values.food`). Without bounds a value may go anywhere, negative too. Characters' values stop at their sheet's bounds; effects on characters do nothing while the party has none, and `acting.…` nothing while nobody acts (the journal says so). See [Characters](04-what-tables-see.md#characters).

## Moments

When a check is rolled (`at:`) or an action is taken by the system itself (`on:`). One moment, or several as a list (`[trip.hex-enter, actions.rest]`); conditions and tables see which one as `trip.moment`.

| Moment                                                                     | When                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| a clock (`'06:00'`)                                                        | as it strikes, marching, waiting or asleep in camp                                                 |
| a part of the day (`time.part.morning`)                                    | as the calendar's part begins, the same way                                                        |
| `trip.hex-enter`                                                           | entering each hex                                                                                  |
| `time.day-end`                                                             | as each day ends, camping or not (actions first, then checks)                                      |
| an action (`actions.camp`)                                                 | when the party takes that action, before its steps (a check that waits holds them)                 |
| an action's end (`actions.forage.done`)                                    | once its steps are done                                                                            |
| a check (`checks.WEATHER_CHECK_REQUIRED`)                                  | right after it's resolved (after **Continue**, if it paused), before the next checks of its moment |
| a clock of the world filling (`world.clocks.<id>.full`)                    | as one of the campaign's progress clocks fills, whatever fills it                                  |
| a world turn (`world.turn`)                                                | after a world turn of the campaign, whatever brought it (time, a hand, a step's `do: world.turn`)  |
| a condition turning true (`{ when: { party.values.morale: { lte: 0 } } }`) | once, as it turns true, whatever changed it; again only after it stopped holding                   |

A check without `at` is rolled only by a step (`roll:`); an action without `on` is a button.

**The world's reactions** ([The world's rules](07-kinds.md#the-world-s-rules)) come at moments of their own: `world.turn` (after every world turn), `world.clocks.<id>.full` (a clock filling) and conditions turning true (`{ when: { world.events: market-day } }`), looked at after anything that changes the world and at each day's start on the way.

**A moment written as a condition** (a reaction): `on: { when: …, unless: … }` (or `at:`), alone or in a list beside named moments. It's looked at after every change of a trip (a step, an effect, a result, a change by hand), reading what tables see, and comes there and then. What already holds when a trip starts comes on its first step; a trip saved before reactions existed takes what holds then as already seen. With `for: party.members` it's looked at for each member, read and played with that member as `acting`. Reactions that keep setting each other off stop after 10 in a row. More: [Moments written as conditions](../oracle/07-connecting.md#5-your-own-travel-system).

## Steps of an action

An action's `do:` is a list of steps, in order; each does one thing and may have its own `when` / `unless`.

| Step                                                            | Does                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `time: 120`                                                     | 120 minutes pass                                                  |
| `time: '14:00'`                                                 | until it next strikes                                             |
| `time: time.meal.luncheon`                                      | until a part of the calendar's day next starts                    |
| `travel.move: destination`                                      | moves along the route while its conditions hold                   |
| `travel.move: '{{params.until}}'`                               | as far as its parameter says (`hex`, `3`…)                        |
| `travel.speed: 0.5`                                             | the rest of today's moving at half speed                          |
| `effects: { party.stats.fatigue: -1 }`                          | changes the party                                                 |
| `set: { lost: true }`                                           | gives a value of the day                                          |
| `do: actions.forage`                                            | takes another action, if its conditions hold                      |
| `{ do: actions.march, with: { until: hex } }`                   | another action, with its parameters                               |
| `roll: checks.ENCOUNTER_CHECK_REQUIRED`                         | rolls a check now (or `roll: table.ruins`: a table of the Oracle) |
| `travel.advance: 1`                                             | moves one hex along the route, no time passing                    |
| `travel.mode: modes.boat`                                       | travels another way, if it can be chosen now                      |
| `say: The porters sing`                                         | a line of the system's own in the journal                         |
| `pause: true`                                                   | the trip waits for **Continue** (or a text)                       |
| `ask: params.how`                                               | the player chooses the parameter `how` now                        |
| `{ wait: { today.ferry: true }, limit: '18:00' }`               | time passes until it holds, at most the limit                     |
| `{ id: song, say: … }`                                          | names a step for its translations                                 |
| `{ unless: { trip.below: party.values.food }, effects: { … } }` | only when its condition holds                                     |

Marching is an action with a `travel.move` step, checked as the party moves: its `when` / `unless` (none: whenever nothing else stops it; by day for 8 hours: `when: { time.hour: { gte: 6, lt: 20 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }`). An action's `params` are what is chosen when taking it: `params: { until: { choices: [destination, hex, 3] } }`, read as `{{params.until}}`. How the trip goes on by itself, `travel: { onward: { do: actions.march, with: { until: destination } } }`. The halt, `travel: { halt: { at: '20:00', do: actions.camp } }`, is what a party that can't march does while the time moves on by itself. Every step, with examples: [Actions and steps](10-actions-and-steps.md). Besides `do`, an action has `name`, `description`, `params`, `when` / `unless`, `on`, `oncePerDay: true`, `hideWhenUnavailable: true` (its button hides while it can't be taken) and `nothing` (what the journal says when none of its checks apply). Full: [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).

## What blocks: `blocks`

A value of the day lists what can't be done while it holds: `travel.move` (no more moving on), an action (`actions.camp`, `actions.forage`) or a way of travelling (`modes.horse`). Each by its full name: what it is, then its id. `values: { snowbound: { blocks: [modes.horse] } }`. A character's condition on a [sheet](07-kinds.md#sheets) blocks the same way while any character of the party has it: `conditions: { sprained: { blocks: [travel.move] } }`; the trip says who.

## The party's characters: `from` and `share`

In bindings, when the system has a sheet: a stat made of the characters' values, `from: { max: survival }` (also `min`, `sum`, or `count: true`, with `when` / `unless` on each character and `none` for when none counts), only while the party has characters. On the sheet, how what the party spends or gains of an item is shared out among them, `items: { share: even }` (or `order`), and what a new character carries, `items: { start: { ration: 2 } }`. Journey roles: `roles: { guide: { name: Guide } }`, read as `roles.guide.…`. See [Bindings](07-kinds.md#bindings).

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

**Tags** sort what is rolled: `tags: [people, names]` on a table, oracle, generator or deck, any words the pack chooses, which the Oracle's and the Hexmapper's **Filter** show or hide (`rules`, in our packs, for what a system rolls itself).

## Translations

Never inline: a pack's texts are written once in its base language, and translations go in `locales/<lang>/<file>` overlays, keyed by id. See [Translations](../oracle/05-translations.md).

Every kind of definition, with a whole example: [Kinds of definition](07-kinds.md).

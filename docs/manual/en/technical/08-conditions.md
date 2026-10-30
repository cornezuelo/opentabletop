# Conditions

A **condition** says when something applies: an entry that only comes up in forests, a check rolled only off roads, an action available only in good weather, a roll mode used by itself the day after getting lost. The same conditions are written everywhere they appear: `when` and `unless` on table entries, generator fields, checks, actions and their steps, ways of travelling and terrains (`passable`), `through` (where a way of travelling can go), `modeWhen` / `modeUnless` on tables and oracles, and `when` / `unless` on a party stat made of its characters (`from`), read with each character's values.

A condition is a set of `name: what it must be` pairs about the values the roll sees (see [What tables see](04-what-tables-see.md)). Every pair must hold. In a form's box you write the pairs without braces (`place.terrain: forest, place.danger: { gte: 3 }`); in YAML, inside braces (`when: { place.terrain: forest, place.danger: { gte: 3 } }`). Most forms (Systems' and the Oracle's) build them as rows of _what it reads · comparison · value_ instead, writing these same pairs: see _Conditions as rows_ in [Rules → Actions](../systems/05-rules.md#actions).

Nothing in a condition is run as code: packs from anyone are safe to load.

## Comparing one value

| Write                     | Holds when                                              | Example                                                    |
| ------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `name: value`             | the value is exactly that                               | `place.terrain: forest`, `today.lost: true`, `time.day: 1` |
| `name: [a, b, c]`         | the value is any of them                                | `place.terrain: [forest, dense-forest, heath]`             |
| `name: { eq: value }`     | the value is exactly that (the same as `name: value`)   | `time.season: { eq: winter }`                              |
| `name: { not: value }`    | the value is anything but that (also when it's missing) | `time.season: { not: summer }`                             |
| `name: { not: [a, b] }`   | the value is none of them                               | `trip.mode: { not: [boat, cart] }`                         |
| `name: { in: [a, b] }`    | the value is any of them (the same as a list)           | `trip.weather: { in: [rain, storm] }`                      |
| `name: { gt: n }`         | the value is a number **greater than** n                | `party.stats.morale: { gt: 0 }`                            |
| `name: { gte: n }`        | a number **greater than or equal to** n                 | `place.danger: { gte: 3 }`                                 |
| `name: { lt: n }`         | a number **less than** n                                | `party.values.food: { lt: 1 }`                             |
| `name: { lte: n }`        | a number **less than or equal to** n                    | `aroundCount: { lte: 2 }`                                  |
| `name: { exists: true }`  | the value is there (whatever it is)                     | `place.icon.id: { exists: true }`                          |
| `name: { exists: false }` | the value is missing                                    | `place.region: { exists: false }`                          |

Several comparisons on the same value must all hold: `place.danger: { gte: 2, lte: 4 }` is 2, 3 or 4.

- **Numbers** only compare with numbers: `place.danger: { gte: 3 }` doesn't hold where there's no danger, or where it was written as text.
- **Lists** in the context, like a hex's `tags` or the day's `holidays`, hold when they **contain** the value: `place.tags: landmark` holds for a hex tagged `ford, landmark`; `place.tags: [ford, toll]` for one with either.
- **Missing values** don't match, except with `not` and `exists: false`.
- **Dotted names** read inside a value: `party.stats.survival`, `icon.guards`, `time.moons.pale`, `yesterday.lost`.
- **Full names** say where a value comes from, and can't be hidden by a stat with the same name: `place.terrain: forest` is `terrain: forest`, `time.part: night` is `part: night`, `trip.mode: boat` is `mode: boat`. Every one, with its short name: [What tables see](04-what-tables-see.md#how-to-read-this-page).

## Variables and rolls: `{{…}}`

A value written as `'{{name}}'` is a **variable**: another value of the context, read when the condition is checked, instead of a fixed one. Written as `'{{dice}}'` it's a **roll**. Either goes wherever a value goes: after `gte`, `lt`…, in a list, after `not`. In YAML, **quote them** (`'{{system.hoursPerDay}}'`): without quotes, braces start a list of pairs (see [Syntax](09-syntax.md#values-key-value)).

| Write                                                       | Holds when                                          |
| ----------------------------------------------------------- | --------------------------------------------------- |
| `place.danger: { gt: '{{party.stats.stealth}}' }`           | the danger is over the party's stealth              |
| `time.hour: { gte: '{{system.part.night}}' }`               | it's when the calendar's night starts, or later     |
| `party.stats.fatigue: { gte: '{{party.stats.endurance}}' }` | fatigue has reached endurance                       |
| `place.faction: '{{rival}}'`                                | the hex's faction is the one in the value `rival`   |
| `place.tags: '{{wanted}}'`                                  | the hex has any of the tags the list `wanted` holds |
| `party.stats.wits: { gte: '{{1d20}}' }`                     | a d20 rolls the party's wits or under               |
| `place.danger: { gt: '{{1d6}}' }`                           | a d6 rolls under the danger                         |

A variable that isn't there (or isn't a number, after `gte`…) never holds. Only a whole value is a variable: `'the {{rival}}'` is that text, as written.

**A roll is the same all through a moment.** Wherever it's read again in the same moment, the same dice give the same total, so what it decides doesn't change when you look again:

- In a **trip** (checks, actions and their steps, marching, ways of travelling, terrains and `through`), a moment is the day, the hex and what's happening: a moment like `trip.place-enter` or `time.day-end`, or the action being taken (`march` for marching). An action whose `when` rolls `'{{1d20}}'` is available or not for the whole day in that hex, the route doesn't change as you plan it, and the action's effects see the same roll. Each trip rolls its own.
- In a **table** (entries, generator fields, `modeWhen` / `modeUnless`), a moment is one roll of the table, with what it rolls next: an entry with `when` and another with `unless` on the same `'{{1d20}}'` see the same d20, so one of them comes up (a roll-under). The result card shows the roll. A table with a roll of its own also gives its entries that total as `'{{roll}}'`: `party.stats.survival: { gte: '{{roll}}' }` is a roll-under on the table's own die (see [Dice and variables](../oracle/08-dice-and-templates.md)).

**A check's conditions are read just before it's rolled.** The checks of one moment come one by one, in the order the rules list them: each one's `when` / `unless` see what the ones before it set (the weather just rolled, a value of the day, their `effects`). At dawn, after the weather's, `when: { trip.weather: storm }` reads today's storm.

Everything a condition can read is in [What tables see](04-what-tables-see.md); dice are in [Dice and variables](../oracle/08-dice-and-templates.md).

## Joining conditions

| Write         | Holds when                   | Example                                                                               |
| ------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| several pairs | all of them hold             | `{ place.terrain: forest, timeOfDay: night }`                                         |
| `all: [ … ]`  | every condition in the list  | `all: [{ place.terrain: [forest, dense-forest] }, { place.danger: { gte: 5 } }]`      |
| `any: [ … ]`  | at least one of them         | `any: [{ trip.connections: road }, { trip.connections: river }, { trip.mode: boat }]` |
| `not: { … }`  | the condition inside doesn't | `not: { timeOfDay: night }`                                                           |

`all`, `any` and `not` count as one more pair beside the others: `{ place.tags: market, any: [{ time.weekday: marketday }, { world.events: market-day }] }` is a market town on either day. They nest: `{ all: [{ time.moons.ember: full }, { not: { place.tags: haunted } }] }`. `all` is needed when one value appears twice, since a pair can only be written once (`{ all: [{ place.tags: ford }, { place.tags: toll }] }`: a hex with both tags).

`not` has two meanings by what follows it: `time.season: { not: summer }` compares one value; `not: { time.season: summer }`, at the top, turns a whole condition around. Both hold in the same cases here; with more pairs inside, the second says "not all of these".

## `when` and `unless`

- `when` must hold for the thing to apply; without it, it always applies.
- `unless` must **not** hold; without it, nothing stops it.
- With both, both are checked: `when: { place.terrain: forest }, unless: { trip.connections: road }` is a forest not reached by road.
- **When one stops an action or a march, the trip says why**: the pairs that failed, with what they read and what they asked (every failing branch of an `any`; for an `unless`, the pairs that held). On a button's tooltip and in the journal: _the hour is 21:00: it needs under 20:00_, _By torchlight doesn’t hold_, _the weather is storm_ (an `unless`). Facts are named for players when the trip knows them (the hour, the day's march, the weather, the terrain, a stat or a value of the day by the system's name), the rest as written.

## Where you'll find them, in the Grey Marches

- Entries: the encounter table's Wyrm, `when: { all: [{ place.terrain: [forest, dense-forest] }, { place.danger: { gte: 5 } }] }`; the hunt, `when: { all: [{ time.moons.ember: full }, { timeOfDay: night }] }`; the Vale's patrol, `when: { place.region: { eq: Ashford Vale } }, unless: { timeOfDay: night }`.
- Generator fields: _Delving a ruin_'s trap, `when: { danger: { lte: 2 } }`, and its untouched ruin, `unless: { untouched: { lt: 90 } }`.
- Checks: encounters `at: [trip.place-enter, actions.rest]`, `when: { any: [{ trip.moment: trip.place-enter, time.tags: { not: dark }, place.danger: { gt: '{{party.stats.stealth}}' } }, { trip.moment: actions.rest, place.danger: { gte: 3 } }] }`, `unless: { trip.connections: road }`; getting lost, `unless: { any: [{ trip.connections: [road, river] }, { trip.mode: boat }] }`; the ford, `when: { all: [{ place.tags: ford }, { not: { trip.mode: boat } }] }`.
- Actions and steps: foraging, `unless: { trip.weather: storm }`; camp's fed night, `unless: { trip.below: party.items.ration }`; eating fodder, `when: { trip.mode: horse }`; the ferry's steps after it asks, `when: { params.fare: wait }`, and its wait for Brenna, `wait: { time.part: [afternoon, evening] }` (a step that waits until its condition holds: see [Actions and steps](10-actions-and-steps.md#waiting-for-something-wait-and-limit)).
- Ways of travelling: the boat goes `through: { any: [{ place.water: true }, { place.terrain: coast }] }` and is boarded `when: { any: [{ place.water: true }, { place.terrain: coast }, { place.tags: ferry }] }` (chosen only at the water's edge or the ferry; otherwise disabled in the trip panel, saying why).
- Terrains: the peaks are `passable: { when: { time.season: summer }, unless: { trip.weather: [snow, storm] } }`; lakes, `passable: { when: { time.month: [deepwinter, wolfmoon] } }` (frozen). They see the hex entered and the moment, like `through`.
- Sheets: a condition that holds by itself while its `when` does, never set by effects. A companion is _Terrified_ `when: { self.values.dread: { gte: 6 } }` (the character's own, as `self.*`) and _Seasick_ `when: { trip.mode: boat, self.values.nerve: { lte: 1 } }` (the world too, on a trip); a faction is _Broken_ `when: { self.values.strength: { lte: 0 } }`. See [Sheets](07-kinds.md#sheets).
- Items: where an item **fits**, a condition on the place (the mail shirt `fits: { place.tags: worn }`), and which items a value made of them counts (`where`: the armour worn, `{ max: items.armour, where: { place.tags: worn } }`, reading `item.*` and `place.*`); a companion is _Burdened_ `when: { self.values.load: { gt: '{{self.values.capacity}}' } }`, and the ford counts who carries a rope, `when: { items.tags: climbing }`. See [Items](../systems/08-items.md).

A value of the day isn't a condition but works like one: while it holds, it **blocks** what it lists (`blocks: [travel.move]`, an action, `actions.forage`, a way of travelling, `modes.horse`). See [Connecting tables to maps and trips](../oracle/07-connecting.md).

- Roll modes: getting lost with disadvantage the day after, `modeWhen: { roll-modes.disadvantage: { yesterday.lost: true } }`; the gates' own _Talking your way in_ when Charisma beats the guards, `modeWhen: { roll-modes.charm: { party.stats.charisma: { gt: '{{icon.guards}}' } } }`.
- Variables and rolls: camping and resting while `party.stats.fatigue: { lt: '{{party.stats.endurance}}' }`; encounters only where `place.danger: { gt: '{{party.stats.stealth}}' }`; the toll's d6 under Charisma, `party.stats.charisma: { gte: '{{1d6}}' }`; _Fishing_'s d6 under Survival on the table's own roll, `party.stats.survival: { gte: '{{roll}}' }`; a long day, `trip.marched: { gt: '{{system.hoursPerDay}}' }`.
- The trip and the world: the shrine only the first time, `trip.visits: 1`; homesick on `trip.day: [10, 20, 30]`; out of the Greywood, `from.region: The Greywood`; fishing next to water, `around.water: true`; market day, `any: [{ time.weekday: marketday }, { world.events: market-day }]`; the Wyrm once `world.clocks.the-greywood-wyrm-wakes: { gte: 6 }`.
- Characters: Survival from the best of those not wounded, `from: { max: survival, unless: { conditions: wounded } }`; tending the wounded only while someone is, `party.stats.wounded: { gte: 1 }`, and only by whoever acts with `acting.values.survival: { gte: 2 }`.

When a condition is written wrong (an unknown operator, a list where a number goes), the pack shows a problem at that line when it loads.

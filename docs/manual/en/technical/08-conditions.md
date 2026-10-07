# Conditions

A **condition** says when something applies: an entry that only comes up in forests, a check rolled only off roads, an action available only in good weather, a roll mode used by itself the day after getting lost. The same conditions are written everywhere they appear: `when` and `unless` on table entries, checks, actions and their steps, and ways of travelling, `through` (where a way of travelling can go), and `modeWhen` / `modeUnless` on tables and oracles.

A condition is a set of `name: what it must be` pairs about the values the roll sees (see [What tables see](04-what-tables-see.md)). Every pair must hold. In a form's box you write the pairs without braces (`terrain: forest, danger: { gte: 3 }`); in YAML, inside braces (`when: { terrain: forest, danger: { gte: 3 } }`).

Nothing in a condition is run as code: packs from anyone are safe to load.

## Comparing one value

| Write                     | Holds when                                              | Example                                   |
| ------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| `name: value`             | the value is exactly that                               | `terrain: forest`, `lost: true`, `day: 1` |
| `name: [a, b, c]`         | the value is any of them                                | `terrain: [forest, dense-forest, heath]`  |
| `name: { eq: value }`     | the value is exactly that (the same as `name: value`)   | `season: { eq: winter }`                  |
| `name: { not: value }`    | the value is anything but that (also when it's missing) | `season: { not: summer }`                 |
| `name: { not: [a, b] }`   | the value is none of them                               | `mode: { not: [boat, cart] }`             |
| `name: { in: [a, b] }`    | the value is any of them (the same as a list)           | `weather: { in: [rain, storm] }`          |
| `name: { gt: n }`         | the value is a number **greater than** n                | `party.stats.morale: { gt: 0 }`           |
| `name: { gte: n }`        | a number **greater than or equal to** n                 | `danger: { gte: 3 }`                      |
| `name: { lt: n }`         | a number **less than** n                                | `party.resources.food: { lt: 1 }`         |
| `name: { lte: n }`        | a number **less than or equal to** n                    | `aroundCount: { lte: 2 }`                 |
| `name: { exists: true }`  | the value is there (whatever it is)                     | `icon.id: { exists: true }`               |
| `name: { exists: false }` | the value is missing                                    | `region: { exists: false }`               |

Several comparisons on the same value must all hold: `danger: { gte: 2, lte: 4 }` is 2, 3 or 4.

- **Numbers** only compare with numbers: `danger: { gte: 3 }` doesn't hold where there's no danger, or where it was written as text.
- **Lists** in the context, like a hex's `tags` or the day's `holidays`, hold when they **contain** the value: `tags: landmark` holds for a hex tagged `ford, landmark`; `tags: [ford, toll]` for one with either.
- **Missing values** don't match, except with `not` and `exists: false`.
- **Dotted names** read inside a value: `party.stats.survival`, `icon.guards`, `moons.pale`, `yesterday.lost`.

## Joining conditions

| Write         | Holds when                   | Example                                                              |
| ------------- | ---------------------------- | -------------------------------------------------------------------- |
| several pairs | all of them hold             | `{ terrain: forest, timeOfDay: night }`                              |
| `all: [ … ]`  | every condition in the list  | `all: [{ terrain: [forest, dense-forest] }, { danger: { gte: 5 } }]` |
| `any: [ … ]`  | at least one of them         | `any: [{ edges: road }, { edges: river }, { mode: boat }]`           |
| `not: { … }`  | the condition inside doesn't | `not: { timeOfDay: night }`                                          |

They nest: `{ all: [{ moons.ember: full }, { not: { tags: haunted } }] }`. `all` is needed when one value appears twice, since a pair can only be written once (`{ all: [{ tags: ford }, { tags: toll }] }`: a hex with both tags).

`not` has two meanings by what follows it: `season: { not: summer }` compares one value; `not: { season: summer }`, at the top, turns a whole condition around. Both hold in the same cases here; with more pairs inside, the second says "not all of these".

## `when` and `unless`

- `when` must hold for the thing to apply; without it, it always applies.
- `unless` must **not** hold; without it, nothing stops it.
- With both, both are checked: `when: { terrain: forest }, unless: { edges: road }` is a forest not reached by road.

## Where you'll find them, in the Grey Marches

- Entries: the encounter table's Wyrm, `when: { all: [{ terrain: [forest, dense-forest] }, { danger: { gte: 5 } }] }`; the hunt, `when: { all: [{ moons.ember: full }, { timeOfDay: night }] }`.
- Checks: getting lost, `unless: { any: [{ edges: [road, river] }, { mode: boat }] }`; the ford, `when: { all: [{ tags: ford }, { not: { mode: boat } }] }`.
- Actions and steps: foraging, `unless: { weather: storm }`; camp's fed night, `unless: { below: food }`; eating fodder, `when: { mode: horse }`.
- Ways of travelling: the boat goes `through: { any: [{ water: true }, { terrain: coast }] }` and is boarded `when: { any: [{ water: true }, { terrain: coast }, { tags: ferry }] }` (chosen only at the water's edge or the ferry; otherwise disabled in the trip panel, saying why).

A value of the day isn't a condition but works like one: while it holds, it **blocks** what it lists (`blocks: [travel]`, an action's id, `mode.horse`). See [Connecting tables to maps and trips](../oracle/07-connecting.md).

- Roll modes: getting lost with disadvantage the day after, `modeWhen: { disadvantage: { yesterday.lost: true } }`.

When a condition is written wrong (an unknown operator, a list where a number goes), the pack shows a problem at that line when it loads.

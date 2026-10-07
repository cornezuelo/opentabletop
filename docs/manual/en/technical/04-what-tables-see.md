# What tables see

Every roll gets a **context**: values a table can use in its dice (`{{danger}}`), its texts and its conditions (`when: { danger: { gte: 2 } }`). This page lists every value, where it comes from, and which one wins when two have the same name.

## From the map (Hexmapper)

For the selected hex (or the party's), and on a trip for each hex a check is about:

| Name         | What it is                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `hex`        | The hex (`"5,7"`: column, row).                                                                                   |
| `terrain`    | The terrain's id (`forest`, `hills`…). Missing on a blank hex.                                                    |
| `water`      | `true` when the terrain is marked as water (Edit palette → Water).                                                |
| `tags`       | The hex's tags, a list: `when: { tags: landmark }` holds if the list has it.                                      |
| `region`     | The region's **name** (`Ashford Vale`).                                                                           |
| _each value_ | The values of the hex's **region**, then the **hex's own** (the hex wins on the same key): `danger`, `elevation`… |
| `icon`       | The hex's icon: `icon.id` (`game:castle`) and each of its values: `{{icon.guards}}`.                              |
| `name`       | The hex's name, when it has one.                                                                                  |

From the Oracle panel, the **selected token** too:

| Name    | What it is                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------- |
| `token` | `token.name`, `token.kind` (`pc`, `npc`, `enemy`, `party`) and each of its values (`{{token.fare}}`). |

Points of interest keep their values in the map and its file, but tables don't read them: a hex can have several.

## From a trip (Hexmapper Play, Travel app)

| Name                                            | What it is                                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `season`                                        | `spring`, `summer`, `autumn`, `winter`.                                                                                                                                                                                                                                                 |
| `weather`                                       | Today's weather, once a table has set it.                                                                                                                                                                                                                                               |
| `mode`                                          | The way of travelling (`foot`, `horse`, `boat`…).                                                                                                                                                                                                                                       |
| `day`                                           | The day number.                                                                                                                                                                                                                                                                         |
| `yesterday`                                     | The day before: that day's values (`yesterday.weather`, `yesterday.fordModifier`…) and the values of the day the system declares (`yesterday.lost`: the party ended it lost; false if not). E.g. finding the way again with disadvantage: `disadvantageWhen: { yesterday.lost: true }`. |
| `month`, `year`, `weekday`, `moons`, `holidays` | With a calendar of the system's own: the month's id, the year, the weekday, each moon's phase (`moons.pale: full`) and the day's holidays (a list).                                                                                                                                     |
| `edges`                                         | The roads, trails or rivers of the stretch: the one just walked when entering a hex, the one ahead at dawn and in camp.                                                                                                                                                                 |
| _each party stat_                               | The system's stats with their current value, by name: `{{charisma}}`. Shorthand: a map or trip fact with the same name wins (see below).                                                                                                                                                |
| `party`                                         | The party, always unambiguous: `party.stats.charisma`, `party.resources.food`, `party.mode`. Also in hand rolls during a trip.                                                                                                                                                          |
| _today's values_                                | Set earlier the same day by a table: `weather`, any name ending in `Modifier` or `Impossible` (`fordModifier`, `fordImpossible`) and the values of the day the system declares (`lost`). They clear at dawn and become `yesterday.*`.                                                   |
| _the binding's context_                         | What the bindings add for that check: `context: { timeOfDay: night }`; for an oracle, its input (`odds: even`).                                                                                                                                                                         |

## Discovering the map

- The **terrain** table sees the hex the party is on (its terrain, tags, values and region), plus `hex` (the hex being decided), `from` (the one it's seen from) and the land around the hex being decided: `around` counts its known neighbours' terrains (`around.lake: 2`), `aroundCount` how many are known, `common` the most frequent terrain (a tie goes to the one it's seen from) and `commonCount` how many have it.
- The **contents** table sees the hex being entered.
- Both see the party stats, `party` and today's values.

## Which value wins

When two sources give the same name, the later one wins:

1. **Checks:** party stats by name → today's values → the map and trip facts → `party` → the binding's context. So a stat or a value of the day called `terrain` or `weather` can't hide the real one; `party.stats.terrain` still reaches it. Reserved names a stat shouldn't use: `hex`, `terrain`, `water`, `tags`, `region`, `name`, `icon`, `token`, `season`, `weather`, `mode`, `day`, `edges`, `party`.
2. **Hand rolls** (Oracle panel): during a trip, the same order as checks; then the token → what you type in the roll panel's **Context**. A typed `token.fare` changes only that value of the token.
3. **Inside a table:** values an entry sets (`set`) reach the table it then rolls; a generator's fields see the fields before them, and a field's `context` adds values for that field only.

Some collisions, and what happens:

- **A region value and a hex value** with the same name (`danger: 2` on the Greywood, `danger: 5` on one of its hexes): the hex's wins there, the region's everywhere else. That's how the Grey Marches make the forest more dangerous towards its heart.
- **A stat called like a fact** (a stat `weather`, or `terrain`): `{{weather}}` and `when: { weather: storm }` read the day's weather, never the stat; the stat is still `party.stats.weather`. Better not to use those names (the list above).
- **A value of an icon or token called `terrain`**: it's read as `icon.terrain` / `token.terrain`, inside its own name, so it can't hide the hex's terrain.
- **A value an entry sets with a stat's name** (`set: { morale: 1 }` with a stat `morale`): the result's text and the tables it rolls read `{{morale}}` as 1, but it doesn't change the stat, and it doesn't stay for the day (only `weather`, `…Modifier`, `…Impossible` and the declared values do). To change the stat, use `effects: { party.stats.morale: 1 }`.
- **A binding's context** (`context: { timeOfDay: night }`) wins over everything for its check: it's how the same table answers day and night encounters.

## Kinds of value

- Values typed as numbers (`3`, `-1`, `2.5`) are **numbers**: they add up in dice and compare with `gt`/`gte`/`lt`/`lte`. `true` and `false` are yes/no. Anything else is text.
- In dice, a missing value counts as **0**: `1d6 + {{danger}}` works where there's no danger.
- In conditions, a missing value doesn't match, except with `exists: false` or `not`. Every operator, with examples: [Conditions](08-conditions.md).
- Names with dots read inside a value: `token.fare`, `icon.guards`, `npc.role` (a generator's field).

The Grey Marches use every one of these; [The Grey Marches](../packs/02-grey-marches.md) says where.

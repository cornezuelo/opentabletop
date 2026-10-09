# What tables see

Every roll gets a **context**: values a table can use in its dice (`{{danger}}`), its texts and its conditions (`when: { danger: { gte: 2 } }`). This page lists every value, where it comes from, and which one wins when two have the same name.

## Full names and short names

Every fact the map, the trip and the world give has a **full name** that says where it comes from, and most a **short name** too:

| Full names           | What they are about                                                                                                       | Example                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `hex.*`              | the hex: its id, terrain, tags, region and its own values                                                                 | `hex.terrain`, `hex.danger`, `hex.id`    |
| `time.*`             | the moment: season, day, hour, daylight, and the calendar                                                                 | `time.daylight`, `time.moons.pale`       |
| `system.*`           | the system's own day, as numbers                                                                                          | `system.nightfall`                       |
| `trip.*`             | the trip: its day, the way of travelling, the weather, what was marched and done, the moment, and what it has done so far | `trip.day`, `trip.mode`, `trip.moment`   |
| `world.*`            | the world clock (Hexmapper)                                                                                               | `world.clocks.the-flood`, `world.events` |
| `party.*`            | the party: its stats and supplies                                                                                         | `party.stats.charisma`                   |
| `today.*`            | the values of the day (set by tables and by the system's own values)                                                      | `today.lost`, `today.fordModifier`       |
| `yesterday.*`        | the day before's                                                                                                          | `yesterday.lost`                         |
| `from.*`, `around.*` | the hex left when entering one, the hexes around                                                                          | `from.terrain`, `around.terrain`         |

The short name and the full name read the same value: `terrain: forest` and `hex.terrain: forest` hold in the same hexes, and `{{season}}` writes the same as `{{time.season}}`. Use whichever reads better:

- **Short names** are quicker to write, and are what you type in the Oracle's **Context** box: `terrain: forest` there fills `hex.terrain` too.
- **Full names** can't be hidden: a party stat, a value of the day or a binding's context called `weather` or `day` takes the short name (see [Which value wins](#which-value-wins)), never the full one. They also say at a glance where a value comes from. The Grey Marches' travel rules use them; Core and the Generic rules use short names.

A hex's own values (`danger`, `elevation`…) are `hex.danger`, `hex.elevation`, and `danger` for short. `hex` alone is no longer the hex's id: that's `hex.id`.

## From the map (Hexmapper)

For the selected hex (or the party's), and on a trip for each hex a check is about:

| Full name     | Short name   | What it is                                                                                                        |
| ------------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `hex.id`      |              | The hex (`"5,7"`: column, row).                                                                                   |
| `hex.terrain` | `terrain`    | The terrain's id (`forest`, `hills`…). Missing on a blank hex.                                                    |
| `hex.water`   | `water`      | `true` when the terrain is marked as water (Edit palette → Water).                                                |
| `hex.tags`    | `tags`       | The hex's tags, a list: `when: { hex.tags: landmark }` holds if the list has it.                                  |
| `hex.region`  | `region`     | The region's **name** (`Ashford Vale`).                                                                           |
| `hex.<value>` | _each value_ | The values of the hex's **region**, then the **hex's own** (the hex wins on the same key): `danger`, `elevation`… |
| `hex.icon`    | `icon`       | The hex's icon: `icon.id` (`game:castle`) and each of its values: `{{icon.guards}}`.                              |
| `hex.name`    | `name`       | The hex's name, when it has one.                                                                                  |

From the Oracle panel, the **selected token** too:

| Name    | What it is                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------- |
| `token` | `token.name`, `token.kind` (`pc`, `npc`, `enemy`, `party`) and each of its values (`{{token.fare}}`). |

Points of interest keep their values in the map and its file, but tables don't read them: a hex can have several.

## From a trip (Hexmapper Play, Travel app)

**The moment**, `time.*`:

| Full name                                                  | Short name                             | What it is                                                                                                                                 |
| ---------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `time.season`                                              | `season`                               | `spring`, `summer`, `autumn`, `winter` (or the seasons of the system's calendar).                                                          |
| `time.day`                                                 | `day`                                  | The day number of the calendar.                                                                                                            |
| `time.daylight`                                            | `daylight`                             | `true` between the system's dawn and nightfall, `false` at night (in camp, on a night march).                                              |
| `time.hour`                                                | `hour`                                 | The hour as a number: `14.5` is 14:30. `time.hour: { gte: 18 }`: from six in the evening.                                                  |
| `time.watch`                                               | `watch`                                | The watch of the day (1, 2…), when the calendar divides the day into watches (the default one: six of four hours).                         |
| `time.month`, `time.monthDay`, `time.year`, `time.weekday` | `month`, `monthDay`, `year`, `weekday` | With a calendar of the system's own: the month's id, the day of the month (`monthDay: 1`: the first of each month), the year, the weekday. |
| `time.moons`, `time.holidays`                              | `moons`, `holidays`                    | With a calendar of the system's own: each moon's phase (`time.moons.pale: full`) and the day's holidays (a list).                          |

**The system's own day**, `system.*`, as numbers: `system.dawn` and `system.nightfall` (its dawn and nightfall as hours, `6`, `20`), `system.hoursPerDay` (its marching hours a day). Short: `dawn`, `nightfall`, `hoursPerDay`. Compare with them as variables: `time.hour: { gte: '{{system.nightfall}}' }`.

**The trip**, `trip.*`:

| Full name                                     | Short name             | What it is                                                                                                                                                                              |
| --------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trip.day`                                    | `tripDay`              | The day of this trip: 1 the day it started.                                                                                                                                             |
| `trip.mode`                                   | `mode`                 | The way of travelling (`foot`, `horse`, `boat`…).                                                                                                                                       |
| `trip.weather`                                | `weather`              | Today's weather, once a table has set it.                                                                                                                                               |
| `trip.edges`                                  | `edges`                | The roads, trails or rivers of the stretch: the one just walked when entering a hex, otherwise the one ahead on the route (at dawn, in camp, for an action).                            |
| `trip.marched`                                | `marched`              | Hours marched today.                                                                                                                                                                    |
| `trip.doneToday`                              | `doneToday`            | The actions taken today, by id (a list): `trip.doneToday: forage`.                                                                                                                      |
| `trip.routeLeft`, `trip.arrived`              | `routeLeft`, `arrived` | Hexes left to the destination, and whether the party is there.                                                                                                                          |
| `trip.visits`                                 | `visits`               | Times the party has been in this hex during the trip: `1` the first time.                                                                                                               |
| `trip.moment`                                 | `moment`               | For a system's actions and checks: the moment that brought them: `day-start`, `hex-enter`, `day-end` or an action's id (for an action with `on:` or a check with `at:` naming several). |
| `trip.below`, `trip.above`                    | `below`, `above`       | The ids of the values (supplies, stats) an effect tried to take past their `min` (`trip.below: food`) or `max` that day. Older packs' `short` is true when something is in `below`.     |
| `trip.doing`                                  | `doing`                | The action under way (`camp`; at `day-end`, the one the day ended in). Older packs' `camping` is true while the night's action is under way.                                            |
| `trip.hexes`, `trip.km`                       | —                      | The trip so far: hexes entered, and their km at the map's scale (the system's, without a map). `trip.km: { gte: 100 }`: once the party has covered 100 km.                              |
| `trip.hours`                                  | —                      | Hours marched since the trip started (`trip.marched` is today's).                                                                                                                       |
| `trip.taken.<action>`                         | —                      | Times each action was taken during the trip, by the player or by the system itself: `trip.taken.camp: { gte: 7 }`, from the seventh camp on.                                            |
| `trip.checks`                                 | —                      | Checks that have come up during the trip.                                                                                                                                               |
| `trip.spent.<supply>`, `trip.gained.<supply>` | —                      | How much the system's actions, checks and tables have taken from a supply, and added to it (hand edits of the amounts don't count): `trip.spent.food: { gte: 10 }`.                     |

**Around the party:**

| Name     | What it is                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`   | Entering a hex, the one left: `from.id`, `from.terrain`, `from.tags`, `from.region` and its values.                                                                                   |
| `around` | The hexes next to the party's, together: `around.terrain` and `around.tags` (lists of every one among them), `around.region`, `around.water`. `around.terrain: lake`: next to a lake. |

**The party and its days:**

| Name                    | What it is                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `party`                 | The party, always unambiguous: `party.stats.charisma`, `party.resources.food`, `party.mode`, and its characters' ids, `party.members` (when it has any). Also in hand rolls during a trip.                                                                                                                  |
| _each party stat_       | The system's stats with their current value, by name: `{{charisma}}`. Shorthand: a map or trip fact with the same name wins (see below).                                                                                                                                                                    |
| `today`                 | Today's values: set earlier the same day by a table (`weather`, any name ending in `Modifier` or `Impossible`: `today.fordModifier`) and the values of the day the system declares (`today.lost`). They clear at dawn and become `yesterday.*`. Each is also there by its own name: `lost`, `fordModifier`. |
| `yesterday`             | The day before: that day's values (`yesterday.weather`, `yesterday.fordModifier`…) and the values of the day the system declares (`yesterday.lost`: the party ended it lost; false if not). E.g. finding the way again with disadvantage: `modeWhen: { disadvantage: { yesterday.lost: true } }`.           |
| _the binding's context_ | What the bindings add for that check: `context: { timeOfDay: night }`; for an oracle, its input (`odds: even`).                                                                                                                                                                                             |

## Characters

When the system has a [sheet](07-kinds.md#sheets) and the party has characters (the trip's **Characters** section):

| Name                                                               | What it is                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `party.members`                                                    | The characters' ids, a list: `party.members: kael` holds while Kael travels with the party.                                                                                                                                                              |
| `characters.<id>.*`                                                | One character: `characters.kael.values.health` (each value, also by its own name: `characters.kael.health`), `characters.kael.conditions` (a list: `characters.kael.conditions: wounded`), `characters.kael.tags`, `characters.kael.name`.               |
| `roles.<id>.*`                                                     | Whoever holds one of the system's journey roles, with the same names: `roles.guide.values.pathfinding: { gte: 2 }`. Nobody in it: there is no `roles.<id>`.                                                                                              |
| `hex.related`, `hex.relations.<kind>`                              | Who is tied to the hex (it, its region or a place in it, as their relations say): `hex.related: mara`; by kind of relation, `hex.relations.home: mara`. Also `from.related` for the hex left. On a map, `hex.pois` lists the ids of the places in a hex. |
| `characters.<id>.relations.<kind>`, `characters.<id>.bonds.<kind>` | A character's relations by kind (`characters.mara.relations.home: region:Ashford Vale`) and the number each one carries.                                                                                                                                 |
| `acting.*`                                                         | The character acting now, chosen in the trip, with the same names: `acting.values.survival: { gte: 2 }`, `acting.conditions: wounded`. Nobody acting: there is no `acting`, and a condition on it doesn't hold.                                          |

Effects reach them with the same names ([Syntax](09-syntax.md#changing-the-party-effects)): `party.members.values.health: -1` (every character), `characters.kael.conditions.wounded: true` (one), `acting.values.health: 1` (the one acting; with nobody acting it changes nothing, and the journal says so), `roles.lookout.values.health: -1` (whoever holds a role). A party with no characters ignores them: the same system plays with or without characters.

The party's stats a system makes of its characters (`from` in its bindings) and the supplies they carry (`carried`) are read as any other stat or supply: `party.stats.navigation`, `party.resources.food`.

## From the world clock (Hexmapper)

With the world clock running: `world.clocks.<name>`, each progress clock's filled segments by its name in lowercase with dashes (`world.clocks.the-flood: { gte: 4 }`), and `world.events`, today's events by their ids (`world.events: market-day`; their names written that way too). Short: `clocks`, `events`. Also in hand rolls.

## Discovering the map

- The **terrain** table sees the hex the party is on (its terrain, tags, values and region), plus `hex.id` (the hex being decided), `from` (the one it's seen from: `from.id`, `from.terrain`…) and the land around the hex being decided: `around` counts its known neighbours' terrains (`around.lake: 2`), `aroundCount` how many are known, `common` the most frequent terrain (a tie goes to the one it's seen from) and `commonCount` how many have it.
- The **contents** table sees the hex being entered (`hex.terrain`, `hex.tags`… and `terrain` for short).
- Both see the party stats, `party` and today's values.

## Which value wins

When two sources give the same name, the later one wins:

1. **Checks:** party stats by name → today's values → the map and trip facts → `party` → the binding's context. So a stat or a value of the day called `terrain` or `weather` can't hide the real one; `party.stats.terrain` still reaches it. **Full names never collide**: `hex.terrain`, `trip.weather`, `party.stats.weather` are always what they say; only short names are shared. Reserved names a stat shouldn't use: the short names in the tables above, and the groups `hex`, `time`, `system`, `trip`, `world`, `party`, `today`, `yesterday`, `from`, `around`, `characters`, `acting`, `roles`, `icon`, `token`, `name`; in a table with a roll, `roll` and `result`.
2. **Hand rolls** (Oracle panel): during a trip, the same order as checks; then the token → what you type in the roll panel's **Context**. A typed `token.fare` changes only that value of the token.
3. **Inside a table:** a table with a roll of its own gives its entries the total as `roll` (their conditions, texts, `set` and effects: `when: { party.stats.survival: { gte: '{{roll}}' } }`, a roll-under); values an entry sets (`set`) reach the table it then rolls; a generator's fields see the fields before them, and a field's `context` adds values for that field only.

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

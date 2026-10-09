# What tables see

Every roll gets a **context**: values a table can use in its dice (`{{danger}}`), its texts and its conditions (`when: { danger: { gte: 2 } }`). This page is the reference of every value: its name, what kind of value it is, the values it can take, and where they come from (and where to see them in the apps). At the end: which one wins when two have the same name.

## How to read this page

Each value has a **full name** that says where it comes from (`hex.terrain`) and most a **short name** too (`terrain`). Both read the same value: `terrain: forest` and `hex.terrain: forest` hold in the same hexes, and `{{season}}` writes the same as `{{time.season}}`.

| Full names           | What they are about                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `hex.*`              | [the hex](#the-hex-hex): its id, terrain, tags, region, icon and its own values                |
| `time.*`             | [the moment](#the-moment-time): season, day, hour, daylight, and the calendar                  |
| `system.*`           | [the system's own day](#the-system-s-day-system), as numbers                                   |
| `trip.*`             | [the trip](#the-trip-trip): its day, way of travelling, weather, what it has done              |
| `world.*`            | [the world clock](#the-world-world-and-factions) (Hexmapper)                                   |
| `party.*`            | [the party](#the-party-party): its stats, supplies and characters                              |
| `today.*`            | [the values of the day](#the-day-s-values-today-yesterday), and `yesterday.*` the day before's |
| `from.*`, `around.*` | [the hex left and the hexes around](#around-the-party-from-around)                             |

- **Short names** are quicker to write, and are what you type in the Oracle's **Context** box: `terrain: forest` there fills `hex.terrain` too.
- **Full names** can't be hidden: a party stat, a value of the day or a binding's context called `weather` or `day` takes the short name (see [Which value wins](#which-value-wins)), never the full one. The Grey Marches' travel rules use them; Core and the Generic rules use short names.

**Kinds of value** in the tables below: a **number** (`3`, `14.5`: adds up in dice, compares with `gt` / `gte` / `lt` / `lte`), **yes/no** (`true` / `false`), **text**, an **id** (a text the system or the map declares: `forest`, `market-day`), a **list** (several ids at once: a condition holds if the list has the one asked for, `hex.tags: landmark`) or a **group** (names inside: `hex.icon.guards`). A value that isn't there reads as **0** in dice and **doesn't match** in conditions (except `exists: false` or `not`): see [Conditions](08-conditions.md).

**Where** says which apps give it: **Hexmapper** (a map: the selected hex, or the party's on a trip), **Travel** (a trip without a map: a line of hexes, each with a terrain, tags and roads to the next), **trip** (a trip in either), **hand rolls** (the Oracle panel or app).

## The hex, `hex.*`

For the selected hex, the party's on a trip, or the hex a check is about (the one entered, the one where an action is taken).

| Full name                             | Short     | Kind                   | Values, and where they come from                                                                                                                                                                                                                                                     |
| ------------------------------------- | --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hex.id`                              | —         | id                     | The hex's key: column and row counted from 0 (`"4,2"`), whatever the map's coordinate labels (`0503`). Shown beside the coordinates in the hex's panel. In Travel, its place on the way (`"0"`, `"1"`…).                                                                             |
| `hex.terrain`                         | `terrain` | id                     | The terrain's id (`forest`, `dense-forest`, `lake`…), never its name, in any language. The map's palette decides which exist: **Edit palette** shows each id, and the hex's panel the hex's. Missing on a blank hex.                                                                 |
| `hex.water`                           | `water`   | yes/no                 | `true` when the terrain is marked **Water** in the palette (Travel: `lake`, `sea`, `deep-sea`). `false` otherwise.                                                                                                                                                                   |
| `hex.tags`                            | `tags`    | list of texts          | The hex's tags (`landmark`, `ford`, `shrine`…): whatever you write in the hex's **Tags** (it suggests those used on the map). Empty list when it has none.                                                                                                                           |
| `hex.region`                          | `region`  | text                   | The region's **name** as written (`Ashford Vale`), not its id. Hexmapper only. The **Regions** tool lists them.                                                                                                                                                                      |
| `hex.<value>`                         | `<value>` | number, yes/no or text | Each value of the hex's **region**, then the **hex's own** (the hex wins on the same name): `danger`, `elevation`… Typed as `3` it's a number, `true` / `false` yes/no, anything else text. The hex's panel lists its own and, below, those it gets from its region. Hexmapper only. |
| `hex.name`                            | `name`    | text                   | The hex's name, when it has one. Hexmapper only.                                                                                                                                                                                                                                     |
| `hex.icon`                            | `icon`    | group                  | The hex's icon: `icon.id`, its id (`game:castle`; imported images `asset:<id>`: shown under the Icons tool's palette, in its tooltips and in the hex's panel), and each of its values by name (`icon.guards`), kinds as above. Missing when the hex has no icon. Hexmapper only.     |
| `hex.faction`                         | —         | id                     | The id of the faction that holds the hex (`iron-clans`), with factions on the map. Hexmapper only.                                                                                                                                                                                   |
| `hex.pois`                            | —         | list of ids            | The ids of the places (POIs) in the hex: what characters' relations point at (`poi:<id>`). Hexmapper only.                                                                                                                                                                           |
| `hex.related`, `hex.relations.<kind>` | —         | list of ids            | The characters tied to the hex, it, its region or a place in it, as their relations say (`hex.related: mara`); by kind of relation (`hex.relations.home: mara`). See [Characters](#characters).                                                                                      |

Examples: `when: { hex.terrain: [forest, dense-forest] }` (either), `when: { hex.tags: ford }`, `when: { hex.danger: { gte: 3 } }`, `when: { hex.icon.id: game:castle }`, `'1d6 + {{icon.guards}}'`, `when: { hex.region: Ashford Vale }`.

Points of interest keep their values in the map and its file, but tables don't read them: a hex can have several.

**The selected token** (hand rolls from the Hexmapper's Oracle panel), `token.*`:

| Name                              | Kind        | Values, and where they come from                                                                                                                   |
| --------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token.name`                      | text        | Its name.                                                                                                                                          |
| `token.kind`                      | id          | `pc`, `npc`, `enemy` or `party` (its panel's **Kind**).                                                                                            |
| `token.<value>`                   | as `hex.*`  | Each value written in its panel (`token.fare`).                                                                                                    |
| `token.values.<id>`, `token.<id>` | number      | With a **sheet** (Give it a sheet): each value of the sheet (`token.values.health`, also `token.health`); ids as the system's sheet declares them. |
| `token.conditions`, `token.tags`  | list of ids | Its sheet's conditions it has now (`token.conditions: wounded`), and its tags.                                                                     |
| `token.relations.<kind>`          | list        | Its relations by kind, as a character's.                                                                                                           |

## The moment, `time.*`

On a trip, and in hand rolls while a trip or the world clock runs.

| Full name         | Short        | Kind        | Values, and where they come from                                                                                                                                     |
| ----------------- | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `time.season`     | `season`     | id          | `spring`, `summer`, `autumn`, `winter`; with a calendar of the system's own, the seasons its months name (Systems → **Calendar**).                                   |
| `time.day`        | `day`        | number      | The day number since the calendar's start (1, 2…).                                                                                                                   |
| `time.daylight`   | `daylight`   | yes/no      | `true` between the system's dawn and nightfall (Systems → **Rules** → The day), `false` at night (in camp, on a night march).                                        |
| `time.hour`       | `hour`       | number      | The hour with minutes as a fraction: `14.5` is 14:30, `0` midnight, up to `23.98…`. `time.hour: { gte: 18 }`: from six in the evening.                               |
| `time.watch`      | `watch`      | number      | The watch of the day, 1 to the number of watches, when the calendar divides the day into watches (the default calendar: six of four hours, 1 from midnight to 4:00). |
| `time.month`      | `month`      | id          | With a calendar of the system's own: the month's id (Systems → **Calendar**: each month's id).                                                                       |
| `time.monthDay`   | `monthDay`   | number      | With a calendar of the system's own: the day of the month, from 1.                                                                                                   |
| `time.year`       | `year`       | number      | With a calendar of the system's own: the year.                                                                                                                       |
| `time.weekday`    | `weekday`    | id          | With a calendar that has weekdays: today's id.                                                                                                                       |
| `time.moons.<id>` | `moons.<id>` | id          | With moons in the calendar: each moon's phase by the moon's id: `new`, `waxing`, `full` or `waning` (`time.moons.pale: full`).                                       |
| `time.holidays`   | `holidays`   | list of ids | With holidays in the calendar: the ids of today's (empty most days).                                                                                                 |

## The system's day, `system.*`

Numbers from the system's own rules (Systems → **Rules**), to compare with without writing them twice: `time.hour: { gte: '{{system.nightfall}}' }`.

| Full name            | Short         | Kind   | Values                                      |
| -------------------- | ------------- | ------ | ------------------------------------------- |
| `system.dawn`        | `dawn`        | number | Its dawn as an hour (`6`; `6.5` for 06:30). |
| `system.nightfall`   | `nightfall`   | number | Its nightfall as an hour (`20`).            |
| `system.hoursPerDay` | `hoursPerDay` | number | Its marching hours a day (`8`).             |

## The trip, `trip.*`

On a trip (Hexmapper Play, Travel), for its checks and actions, and in hand rolls during it.

| Full name                                     | Short            | Kind        | Values, and where they come from                                                                                                                                                                                                      |
| --------------------------------------------- | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trip.day`                                    | `tripDay`        | number      | The day of this trip: 1 the day it started.                                                                                                                                                                                           |
| `trip.mode`                                   | `mode`           | id          | The way of travelling's id (`foot`, `horse`, `boat`…): the system's ways (Systems → **Rules** → Ways of travelling); the trip's selector shows their names.                                                                           |
| `trip.weather`                                | `weather`        | id          | Today's weather once a table or weather model has set it: the ids the system's weather declares (Systems → **Rules** → Weather, or **Weather** models). Missing until then.                                                           |
| `trip.edges`                                  | `edges`          | list of ids | The roads, trails or rivers of the stretch: `road`, `trail`, `river` (or the edges the system declares). Entering a hex, the one just walked; otherwise the one ahead on the route (at dawn, in camp, for an action). Empty off them. |
| `trip.marched`                                | `marched`        | number      | Hours marched today (`2.5`).                                                                                                                                                                                                          |
| `trip.doneToday`                              | `doneToday`      | list of ids | The ids of the actions taken today (`trip.doneToday: forage`): the system's actions (Systems → **Rules** → Actions).                                                                                                                  |
| `trip.routeLeft`                              | `routeLeft`      | number      | Hexes left to the destination (0 without a route).                                                                                                                                                                                    |
| `trip.arrived`                                | `arrived`        | yes/no      | Whether the party is at its destination.                                                                                                                                                                                              |
| `trip.visits`                                 | `visits`         | number      | Times the party has been in this hex during the trip: `1` the first time.                                                                                                                                                             |
| `trip.moment`                                 | `moment`         | id          | For a system's actions and checks: the moment that brought them: `day-start`, `hex-enter`, `day-end`, or an action's id (for an action with `on:` or a check with `at:` naming several).                                              |
| `trip.doing`                                  | `doing`          | id          | The action under way (`camp`; at `day-end`, the one the day ended in). Missing when none.                                                                                                                                             |
| `trip.below`, `trip.above`                    | `below`, `above` | list of ids | The supplies and stats an effect tried to take past their `min` (`trip.below: food`) or `max` today. Older packs' `short` is true when something is in `below`.                                                                       |
| `trip.hexes`                                  | —                | number      | Hexes entered during the trip.                                                                                                                                                                                                        |
| `trip.km`                                     | —                | number      | Those hexes in km, at the map's scale (Map settings), else the system's (`travel.hexKm`).                                                                                                                                             |
| `trip.hours`                                  | —                | number      | Hours marched since the trip started.                                                                                                                                                                                                 |
| `trip.checks`                                 | —                | number      | Checks that have come up during the trip.                                                                                                                                                                                             |
| `trip.taken.<action>`                         | —                | number      | Times each action was taken during the trip, by the player or the system itself; every action the system declares is there, 0 until taken (`trip.taken.camp: { gte: 7 }`).                                                            |
| `trip.spent.<supply>`, `trip.gained.<supply>` | —                | number      | How much the system's actions, checks and tables took from each supply and added to it (hand edits don't count); every supply the system declares is there, from 0.                                                                   |

The trip panel's **So far** line (open it for the rest) shows these counts as they stand.

## Around the party, `from.*`, `around.*`

| Name                           | Kind        | Values                                                                                                                                           |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `from.*`                       | group       | Entering a hex, the one left, with the same names as `hex.*`: `from.id`, `from.terrain`, `from.tags`, `from.region`, its values, `from.related`. |
| `around.terrain`               | list of ids | Every terrain among the hexes next to the party's (`around.terrain: lake`: next to a lake).                                                      |
| `around.tags`, `around.region` | list        | Every tag, and every region name, among them.                                                                                                    |
| `around.water`                 | yes/no      | Whether any of them is water.                                                                                                                    |

In Travel, a hex's neighbours are the ones before and after it on the way.

## The party, `party.*`

| Name                       | Kind        | Values, and where they come from                                                                                                                                                                                   |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `party.stats.<stat>`       | number      | Each stat the system's bindings declare (Systems → **Checks** → Party stats), with its current value, as the trip panel shows them. Also by its own name, `{{charisma}}`, unless a fact has that name (see below). |
| `party.resources.<supply>` | number      | Each supply the system's rules declare (Systems → **Rules** → Supplies), as the trip panel shows them. May go below 0 unless the system sets a `min`.                                                              |
| `party.mode`               | id          | The way of travelling, as `trip.mode`.                                                                                                                                                                             |
| `party.members`            | list of ids | The characters' ids, when the party has characters.                                                                                                                                                                |
| _each party stat_          | number      | `{{charisma}}`: the stat by its own name (the short way).                                                                                                                                                          |

Also in hand rolls during a trip.

## The day's values, `today.*`, `yesterday.*`

| Name                | Kind                 | Values, and where they come from                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `today.<value>`     | yes/no, number, text | The values of the day the system declares (Systems → **Rules** → Values of the day: `today.lost`, set by a table's `set`, an action's `set:` step or a check's outcome), and what a table set earlier today: `weather` and any name ending in `Modifier` or `Impossible` (`today.fordModifier`). They clear at dawn. Each is also there by its own name: `lost`, `fordModifier`. The journal says when each is set. |
| `yesterday.<value>` | as `today`           | The day before's: `yesterday.lost` (the party ended it lost; `false` if not), `yesterday.weather`… E.g. finding the way again with disadvantage: `modeWhen: { disadvantage: { yesterday.lost: true } }`.                                                                                                                                                                                                            |

## Characters

When the system has a [sheet](07-kinds.md#sheets) and the party has characters (the trip's **Characters** section). Ids are the characters' (each card says how it's read: `characters.kael.values.health`); values and conditions are the ones the system's sheet declares (Systems → **Sheet**).

| Name                                                               | Kind         | Values                                                                                                                                                                                               |
| ------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `party.members`                                                    | list of ids  | The characters' ids: `party.members: kael` holds while Kael travels with the party.                                                                                                                  |
| `characters.<id>.values.<value>` (also `characters.<id>.<value>`)  | number       | One character's value, within the bounds the sheet gives it.                                                                                                                                         |
| `characters.<id>.conditions`                                       | list of ids  | The conditions it has now (`characters.kael.conditions: wounded`).                                                                                                                                   |
| `characters.<id>.tags`, `characters.<id>.name`                     | list, text   | Its tags and its name.                                                                                                                                                                               |
| `characters.<id>.relations.<kind>`, `characters.<id>.bonds.<kind>` | list, number | Its relations by kind (`characters.mara.relations.home: region:Ashford Vale`: `region:<name>`, `hex:<id>`, `poi:<id>` or `character:<id>`) and the number each one carries.                          |
| `roles.<role>.*`                                                   | group        | Whoever holds one of the system's journey roles (Systems → **Checks** → Journey roles), with the same names: `roles.guide.values.pathfinding: { gte: 2 }`. Nobody in it: there is no `roles.<role>`. |
| `acting.*`                                                         | group        | The character acting now (chosen in the trip), with the same names: `acting.values.survival: { gte: 2 }`. Nobody acting: there is no `acting`, and a condition on it doesn't hold.                   |
| `hex.related`, `hex.relations.<kind>`, `from.related`              | list of ids  | Who is tied to the hex (it, its region or a place in it) and by which kind of relation; `from.related` for the hex left.                                                                             |

Effects reach them with the same names ([Syntax](09-syntax.md#changing-the-party-effects)): `party.members.values.health: -1` (every character), `characters.kael.conditions.wounded: true` (one), `acting.values.health: 1` (the one acting; with nobody acting it changes nothing, and the journal says so), `roles.lookout.values.health: -1` (whoever holds a role). A party with no characters ignores them: the same system plays with or without characters.

The party's stats a system makes of its characters (`from` in its bindings) and the supplies they carry (`carried`) are read as any other stat or supply: `party.stats.navigation`, `party.resources.food`.

## The world, `world.*`, and factions

Hexmapper, with the World panel's clock running; also in hand rolls.

| Name                                                     | Short            | Kind         | Values, and where they come from                                                                                                                                                                        |
| -------------------------------------------------------- | ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world.clocks.<clock>`                                   | `clocks.<clock>` | number       | Each progress clock's filled segments, by its name in lowercase with dashes (“The Wyrm wakes” is `the-wyrm-wakes`): the World panel shows that name beside each clock. From 0 to its segments.          |
| `world.events`                                           | `events`         | list of ids  | The ids of today's events (`market-day`; their names written as ids work too): each event's **Id** in the World panel.                                                                                  |
| `factions.<id>.values.<value>`                           | —                | number       | With factions on the map (the World view's **Factions**): each faction's values, as its sheet declares them (`factions.the-vale.values.strength`). Faction ids: each faction's card says how it's read. |
| `factions.<id>.conditions`, `.tags`, `.relations.<kind>` | —                | list         | Its conditions, tags and relations, as a character's.                                                                                                                                                   |
| `factions.<id>.name`, `factions.<id>.territory`          | —                | text, number | Its name, and how many hexes it holds.                                                                                                                                                                  |
| `faction.*`                                              | —                | group        | In a faction's turn table: the faction whose turn it is, with the same names.                                                                                                                           |
| `hex.faction`                                            | —                | id           | Who holds a hex (see [The hex](#the-hex-hex)).                                                                                                                                                          |

## What the bindings add

| Name                    | Kind         | Values                                                                                                                                                                                              |
| ----------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _the binding's context_ | any          | What the bindings add for that check only (Systems → **Checks** → each check's Context): `context: { timeOfDay: night }`; for an oracle, its input (`odds: even`, one of the oracle's own options). |
| `roll`, `result`        | number, text | Inside a table with a roll of its own: `roll` is its total, for its entries' conditions, texts, `set` and effects (`when: { party.stats.survival: { gte: '{{roll}}' } }`, a roll-under).            |

## Discovering the map

- The **terrain** table sees the hex the party is on (its terrain, tags, values and region), plus `hex.id` (the hex being decided), `from` (the one it's seen from: `from.id`, `from.terrain`…) and the land around the hex being decided: `around` counts its known neighbours' terrains (`around.lake: 2`), `aroundCount` how many are known, `common` the most frequent terrain (a tie goes to the one it's seen from) and `commonCount` how many have it.
- The **contents** table sees the hex being entered (`hex.terrain`, `hex.tags`… and `terrain` for short).
- Both see the party stats, `party` and today's values.

## Which value wins

When two sources give the same name, the later one wins:

1. **Checks:** party stats by name → today's values → the map and trip facts → `party` → the binding's context. So a stat or a value of the day called `terrain` or `weather` can't hide the real one; `party.stats.terrain` still reaches it. **Full names never collide**: `hex.terrain`, `trip.weather`, `party.stats.weather` are always what they say; only short names are shared. Reserved names a stat shouldn't use: the short names in the tables above, and the groups `hex`, `time`, `system`, `trip`, `world`, `party`, `today`, `yesterday`, `from`, `around`, `characters`, `acting`, `roles`, `factions`, `faction`, `icon`, `token`, `name`; in a table with a roll, `roll` and `result`.
2. **Hand rolls** (Oracle panel): during a trip, the same order as checks; then the token → what you type in the roll panel's **Context**. A typed `token.fare` changes only that value of the token.
3. **Inside a table:** values an entry sets (`set`) reach the table it then rolls; a generator's fields see the fields before them, and a field's `context` adds values for that field only.

Some collisions, and what happens:

- **A region value and a hex value** with the same name (`danger: 2` on the Greywood, `danger: 5` on one of its hexes): the hex's wins there, the region's everywhere else. That's how the Grey Marches make the forest more dangerous towards its heart.
- **A stat called like a fact** (a stat `weather`, or `terrain`): `{{weather}}` and `when: { weather: storm }` read the day's weather, never the stat; the stat is still `party.stats.weather`. Better not to use those names (the list above).
- **A value of an icon or token called `terrain`**: it's read as `icon.terrain` / `token.terrain`, inside its own name, so it can't hide the hex's terrain.
- **A value an entry sets with a stat's name** (`set: { morale: 1 }` with a stat `morale`): the result's text and the tables it rolls read `{{morale}}` as 1, but it doesn't change the stat, and it doesn't stay for the day (only `weather`, `…Modifier`, `…Impossible` and the declared values do). To change the stat, use `effects: { party.stats.morale: 1 }`.
- **A binding's context** (`context: { timeOfDay: night }`) wins over everything for its check: it's how the same table answers day and night encounters.

## Kinds of value, in detail

- Values written on the map (a hex's, a region's, an icon's, a token's) are read as in YAML: `3`, `-1`, `2.5` are **numbers** (they add up in dice and compare with `gt` / `gte` / `lt` / `lte`), `true` and `false` are **yes/no**, anything else is **text** (`Brenna`, `3 silver`).
- In dice, a missing value counts as **0**: `1d6 + {{danger}}` works where there's no danger.
- In conditions, a missing value doesn't match, except with `exists: false` or `not`; a comparison with a value that isn't a number never holds. Every operator, with examples: [Conditions](08-conditions.md).
- A **list** matches when it has the value asked for (`hex.tags: ford`), or any of several (`hex.tags: [ford, bridge]`).
- Names with dots read inside a group: `token.fare`, `icon.guards`, `npc.role` (a generator's field).

The Grey Marches use every one of these; [The Grey Marches](../packs/02-grey-marches.md) says where.

# Connecting tables to maps and trips

You don't need to program to make tables that react to the map, or a whole travel system the Hexmapper plays for you. Everything is written in the pack's YAML files. This page builds it up step by step; each step works on its own.

> **A complete example to copy from:** the bundled pack **The Grey Marches** uses every feature on this page, and has an example map to play it on (Hexmapper: Maps → Example maps). Open its files in the Oracle app, or make a copy (**Edit a copy**) to change them. [The Grey Marches](../packs/02-grey-marches.md) says where each feature is.

## 1. A table that depends on the terrain

When you roll from the Hexmapper (the Oracle panel, or a trip), the table receives what the map knows about the hex. `when` keeps an entry only if it matches:

```yaml
kind: table
id: what-do-we-find
name: What do we find here?
roll: 1d6
entries:
  - { id: forest, range: 1-6, when: { terrain: forest }, result: 'Fallen timber and mushrooms' }
  - {
      id: rocks,
      range: 1-6,
      when: { terrain: [hills, mountains] },
      result: 'A cave mouth in the rock',
    }
  - { id: nothing, range: 1-6, result: 'Nothing special' }
```

All the entries cover 1–6: the **first one whose condition holds** wins, and the last one, without a condition, catches the rest. Terrains are written by their id (`forest`, `hills`, `swamp`…), as in the Hexmapper's palette.

What a table can read from the map: `terrain`, `tags` (the hex's tags), `region` (the region's name), each **field** of the hex by its key (a hex with the field `danger: 3` gives `danger`), and `hex`. During a trip also `season`, `weather`, `mode` (on foot, on horseback…), `day` and the party stats.

## 2. Tags and fields

Tag hexes in the Hexmapper (`haunted`, `ruins`…) and give them fields (`danger: 3`). Then:

```yaml
entries:
  - { id: ghost, range: 1-2, when: { tags: haunted }, result: 'A pale figure watches you' }
  - { id: ambush, range: 1-6, when: { danger: { gte: 3 } }, result: 'Ambush!' }
```

`tags: haunted` holds when the hex has that tag among others. `{ gte: 3 }` means "3 or more"; also `gt`, `lt`, `lte`, `not`.

A field can also change the dice: `roll: '1d6 + {{danger}}'`.

## 3. One table per season

A table can point to another by name, filling in a value from the context. With one weather table per season (`weather-spring`, `weather-summer`…):

```yaml
kind: table
id: weather
name: Today's weather
roll: 1d2
entries:
  - { id: today, range: 1-2, table: 'weather-{{season}}' }
```

## 4. Results the trip understands

An entry (or a deck's card) changes the party with **effects**: each one is a value the system declares, by the path tables read it with. A number adds or subtracts; `'=value'` sets it; dice and values work inside (`'{{1d3+1}}'`). Stats stay within their `min` and `max`; supplies never go below 0.

```yaml
- { id: berries, range: 6, result: 'Berries: +2 food', effects: { party.resources.food: 2 } }
- { id: wolves, range: 5, result: Wolves, effects: { party.stats.morale: -1 } }
- { id: cordial, range: 1, result: A cordial, effects: { party.stats.fatigue: '=0' } }
```

Two other values of the day change the trip when an entry **sets** them:

| Set              | Effect on the trip                                           |
| ---------------- | ------------------------------------------------------------ |
| `weather: storm` | Today's weather; the travel rules say how it slows you down. |
| `lost: true`     | No more travel today, if the system declares `lost` (below). |

The journal says what each result changed ("Foraging: Berries (Food +2)"). The older way of writing effects (`set: { resources: { food: 2 }, stats: { morale: -1 }, fatigue: 1 }`) still works, read as the same effects. An effect on a value the system doesn't declare still applies, but the pack gets a warning.

Tables read the party back as `party.resources.food`, `party.stats.morale`: `when: { party.resources.food: { lt: 1 } }` for an entry that only comes up when the food has run out.

**Values of the day.** Values named `weather`, `…Modifier` or `…Impossible`, and the values the system declares (`lost`), stay for the rest of the day, so later checks can use them; the next day they become `yesterday.<name>`. They're plain values with a naming habit, for the tables that read them:

- `…Modifier` is a number to add to a later roll. A weather entry with `set: { lostModifier: -1 }` makes `roll: '1d6 + {{lostModifier}}'` harder in the getting-lost table that comes after it; with no weather rolled yet, the table reads 0.
- `…Impossible` is a yes/no for something that can't happen today. The Grey Marches' storm sets `fordImpossible: true`, and the ford's first entry `when: { fordImpossible: true }` says nobody crosses. An action can use one too: `unless: { forageImpossible: true }` disables the button (Kal-Arath's foraging in a storm).
- A **declared value** is one the system names in its rules, with what it **blocks** while it holds (below): `lost` blocks travel. Unlike `…Impossible`, the apps enforce it: the button is disabled and says why.

## 5. Your own travel system

A pack becomes a **system** you can pick in Play → Rules when it has two more definitions: the **travel rules** (how fast, which checks and when) and the **bindings** (which table answers each check). Put them in any file of the pack, e.g. `travel.yaml`:

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00' }
travel: { hoursPerDay: 8 } # marching hours per day
terrains:
  forest: { multiplier: 0.5 } # half speed
  mountains: { multiplier: 0.33 }
  sea: { passable: false }
edges:
  road: { multiplier: 1.5 } # faster on roads
modes:
  foot: { name: On foot, kmPerDay: 30 }
  horse: { name: On horseback, kmPerDay: 60 }
resources:
  food: { name: Rations, perDay: 1 }
weather:
  storm: { speed: 0 } # no travel in a storm
values:
  lost: { name: Lost, blocks: [travel] } # set by the getting-lost table: no more travel today
actions:
  camp: # eat, sleep until dawn, and a fed night eases fatigue
    do:
      - { eat: day }
      - { time: dawn }
      - { when: { short: false }, effects: { party.stats.fatigue: -1 } }
  rest: { do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }] }
  forage: # an action of this system: a Forage for food button
    name: Forage for food
    unless: { weather: storm }
    do: [{ time: 180 }, { speed: 0.5 }]
    oncePerDay: true
checks:
  - { event: WEATHER, at: day-start }
  - { event: LOST, at: day-start, unless: { edges: [road, river] } }
  - { event: ENCOUNTER, at: hex-enter, when: { terrain: [forest, swamp] } }
  - { event: NIGHT, at: camp }
  - { event: FORAGE, at: forage, when: { terrain: [forest, plains] } }
  - { event: HUNGRY, at: day-end, when: { short: true }, effects: { party.stats.fatigue: 1 } }
---
kind: bindings
id: default
on:
  WEATHER: { resolve: weather }
  LOST: { resolve: lost-check }
  ENCOUNTER: { resolve: forest-encounters }
  NIGHT: { resolve: night-encounters }
  FORAGE: { resolve: forage }
stats:
  luck: { name: Luck, description: 'Added to encounter rolls', default: 0 }
  fatigue: { name: Fatigue, default: 0, min: 0 }
```

- **terrains** set the speed on each terrain (`multiplier`; 0.5 is half speed) or close it (`passable: false`). **water** does the same for water hexes whose terrain isn't listed (the map's Edit palette → Water), and a way of travelling with `through: { water: true }` is a boat: it only sails water, even where walking can't go. Tables see `water: true` on water hexes.
- **modes** can have `through`, where they can go: a [condition](../technical/08-conditions.md) on each hex they enter, which sees the hex (everything the map knows of it: `terrain`, `water`, `tags`, `region`, its fields), `edges` (the roads or rivers of that step), `mode`, `weather` and today's values. Where it holds the mode goes, even over closed terrains; elsewhere it can't, and routes go around. The Grey Marches' boat: `through: { any: [{ water: true }, { terrain: coast }] }`; a cart only by road: `through: { edges: road }`. The older `allowedTerrains: [water, coast]` (a list of terrains, `water` for any water hex) still works.
- **modes** can have `when` / `unless`: the way of travelling can only be chosen when it holds (the Grey Marches' boat: `when: { any: [{ water: true }, { terrain: coast }, { tags: ferry }] }`); otherwise it's disabled in the trip panel, saying why. A value of the day can block one too (`blocks: [mode.horse]`).
- **modes** and **resources** have a `name` (and a `description`) for players, shown in the trip panel and the journal instead of their id (`horse` → _On horseback_), translated in `locales/` like the rest. Without one, the Generic rules' usual ids (foot, horse, food…) get the app's names and any other shows its id.
- **values** are the values of the day this system declares: a result sets one (`set: { lost: true }`), it holds until the day ends and, while it does, it **blocks** what it names: `travel`, `camp`, `rest`, an action's id or a way of travelling (`mode.horse`). Blocked buttons stay visible, disabled, and say why in the value's `name` ("Lost: not possible for the rest of the day"). The next day tables read it as `yesterday.lost`. A system that declares no `values` still has the older built-in `lost` (blocks travel); one that declares `values: {}` has none.
- **actions** are the party's buttons: `camp` and `rest` exist unless turned off (`false`), and any other key is an **action of the system's own**, a button next to Travel, Camp and Rest. Each has a `name` and `description` for players, `oncePerDay`, and `when` / `unless`: conditions (like a table's) on the trip's facts, today's values and the party, deciding whether the button can be pressed now. What it does is a list of **steps** (`do`), done in order, each one only when its own `when` / `unless` holds:
  - `time: 180` passes three hours; `time: dawn`, `time: nightfall` or `time: '14:00'` until the next one. Supplies are eaten for every day that ends on the way.
  - `eat: day` eats today's supplies now (once a day: not again at midnight). Later steps see `short`: true if something ran out.
  - `speed: 0.5` multiplies the rest of today's march.
  - `effects: { party.stats.fatigue: -1 }` changes the party, like a table's effects.

  Camp without steps sleeps until dawn; rest without steps lasts an hour. What an action rolls are the checks with `at: <its id>` (camp's: `at: camp`), rolled before its steps. `nothing` is what the journal says when none of them apply where the party is (`nothing: 'nothing to forage on {terrain}'`, with `{terrain}` the hex's terrain); without it the journal says that none of its rolls apply there. The older way (`minutes: 180, speed: 0.5, effects: …` on the action) still works, read as those steps. The Grey Marches use all of it: see [their camp, rest and foraging](../packs/02-grey-marches.md).

- **checks** say when something is rolled: `day-start` (at dawn, before marching), `hex-enter` (entering each hex), `camp` (when camping), `day-end` (as each day ends, after its supplies are eaten: checks see `short`, true if some supply ran short, and `camping`, true if the day ended in camp) or the id of one of the system's own actions (`at: forage`). A check can have `effects` of its own: without a table it just applies them, which is how a system writes its rules as data ("a day without enough food: fatigue +1"). Give each one a `name` (and a `description`) for players (`name: Getting lost`; its translations go in `locales/`, see [Translations](05-translations.md#rules-calendars-weather-and-roll-modes)), or the trip panel and journal show its event id. `when` / `unless` use the same [conditions](../technical/08-conditions.md) as tables, with `edges` being the roads or rivers of the stretch: the one just walked when entering a hex, the one ahead at dawn and in camp. Waiting with the world clock (Hexmapper → [World clock](../hexmapper/12-world.md#with-a-trip-going-on)) rolls them too: `day-start` at each dawn, the camp's at each nightfall, `day-end` as each day ends.
- **bindings** connect each check (by its event name, any name you like) to a table of the pack.
- **stats** are numbers of the party that appear in the trip panel, where you set them when the trip starts and change them as you play. Nothing in the apps makes them up: each system declares its own, with a `name`, a `description` (the trip panel's **i**) and a starting value (`default`), and tables read them by key: `{{charisma}}`, or always unambiguously `party.stats.charisma`. The Grey Marches declare Charisma, Survival, Navigation and Morale; the Generic rules have none. A table can also change one nobody declared (`effects: { party.stats.hirelings: 1 }`): it works and appears in the panel by its key, but the pack gets a warning, so declare every stat its tables change. `min` and `max` keep a stat within bounds (fatigue never below 0).
- **reads** names the other values the system's tables read that nobody else names: a value of the map (`danger`, `icon.guards`, `token.fare`), the bindings' context (`timeOfDay`) or today's values tables set (`fordModifier`). With a `name` and a `description` each, the roll panel shows them by name instead of their key, with what they are in the **i**: `reads: { icon.guards: { name: Guards, description: How many guards watch the gates. } }`. The values maps and trips give (terrain, season, holidays…) already have names in the apps.

Checks without a binding wait in the journal for you to resolve them yourself.

## 6. A calendar of your own

Trips count days with a plain calendar (four seasons of 90 days) unless the system's pack has its own: a `kind: calendar` definition, in any file of the pack.

```yaml
kind: calendar
id: reckoning
name: The Marcher reckoning
startYear: 412
watchHours: 4
months:
  - { id: thaw, name: Thaw, days: 30, season: spring }
  - { id: highsun, name: Highsun, days: 30, season: summer }
  # …
weekdays: [{ id: moonday, name: Moonday }, { id: ironday, name: Ironday }]
moons: [{ id: pale, name: the Pale Moon, cycle: 28 }]
holidays: [{ id: midsummer, name: Midsummer, month: highsun, day: 15 }]
```

- **months** in order, with their days and **season** (the seasons a trip can start in come from here); **weekdays**, **moons** (a cycle in days and an optional `offset`), **holidays** (a month and a day), the **startYear** and, optionally, `start: { month, day }` for the first day.
- The trip panel shows the date (“Moonday, 1 Thaw, year 412”), the moons' phases and the day's holidays.
- Tables and checks see `month`, `year`, `weekday`, `moons.<id>` (`new`, `waxing`, `full` or `waning`) and `holidays` (a list): `when: { moons.ember: full }`, `when: { holidays: midsummer }`.

The Grey Marches' `calendar.yaml` is a full example.

### Weather with inertia

A weather table rolls each day afresh. For weather that lasts — rain that sets in, storms that blow over — a pack can have a **weather model** (`kind: weather`) and bind the weather check to it with `weather:` instead of `resolve:`:

```yaml
kind: weather
id: sky
states:
  clear: { name: Clear skies }
  rain: { name: Steady rain, set: { fordModifier: -1 } }
  storm: { name: 'Storm: nobody travels', set: { fordImpossible: true } }
seasons:
  spring:
    start: clear # or weights: { clear: 2, rain: 1 }
    next: # from today's weather, how likely tomorrow is to be each kind
      clear: { clear: 3, rain: 1 }
      rain: { rain: 3, clear: 1, storm: 1 }
      storm: { rain: 1 }
---
kind: bindings
on:
  WEATHER_CHECK_REQUIRED: { weather: sky }
```

- **states**: each kind of weather, with its name and the values it gives the day (like a table's `set`); its id is what the travel rules' `weather` reads.
- **seasons**: per season, where the weather starts and, from each kind, the weights of the next day's. Yesterday's weather the season has no row for starts over from `start`.
- The journal shows the day's weather by its name. In the Travel app's **Checks**, pick the model under _Weather with inertia_.

The Grey Marches' `sky.yaml` is the full example (their tables in `weather.yaml` still roll weather by hand, without memory).

## 7. Discovering the map

Bindings can also say how empty hexes are decided while travelling (the Hexmapper's **Discover the map as you travel**):

```yaml
kind: bindings
discover:
  terrain: { resolve: next-terrain } # an empty hex's terrain
  contents: { resolve: hex-contents } # what a hex holds, the first time you enter it
  reveal: neighbors # or: entered (only the hex you walk into)
on: { … }
```

- The **terrain** table sees the hex you stand on: `terrain`, its tags, fields and region, plus `hex` (the hex being decided) and the land around it: `around.<terrain>` (how many of its known neighbours have it), `common` (the most frequent). It answers with `set: { terrain: hills }`; `set: { terrain: '{{common}}' }` makes the land around grow, so lakes, forests and ranges come out whole instead of a patchwork; `when: { around.lake: { gte: 2 } }` gathers water.
- The **contents** table sees the entered hex. Its text becomes a point of interest; `set: { poi: false }` means nothing worth noting, `set: { poi: 'A name' }` names it differently. `tags` (one or a list) and `name` are written on the hex too.
- Party stats and today's values are in the context of both, as in checks.

The Grey Marches' `discovery.yaml` is a full example: terrain that tends to go on, families of land, a landmark found only once.

## 8. Trying it

1. In the Oracle app, roll each table with values typed in **Context** (terrain, season…) to check the results.
2. Serve both apps from the same site (`make serve`), open the Hexmapper, Play → **With rules**, pick your pack as the rules, place the party and travel: the journal shows each check and its result.
3. Problems in the travel rules or bindings appear in the pack page, like any other.

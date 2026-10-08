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

What a table can read from the map: `terrain`, `tags` (the hex's tags), `region` (the region's name), each **field** of the hex by its key (a hex with the field `danger: 3` gives `danger`), and `hex`. During a trip also `season`, `weather`, `mode` (on foot, on horseback…), `day` and the party stats. Every value, and which one wins when two share a name: [What tables see](../technical/04-what-tables-see.md).

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

An entry (or a deck's card) changes the party with **effects**: each one is a value the system declares, by the path tables read it with. A number adds or subtracts; `'=value'` sets it; dice and values work inside (`'{{1d3+1}}'`). A value stops at the `min` and `max` its system declares (stats and supplies alike); without them it may go anywhere, negative too.

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

A pack becomes a **system** a map can play (Hexmapper: **Map settings → Map → System**) and the Systems and Travel apps list when it has two more definitions: the **travel rules** (how fast, which checks and when) and the **bindings** (which table answers each check). Put them in any file of the pack, e.g. `travel.yaml`; a `kind: system` can name them, with the calendar, weather and packs that go with them (see [Naming the system](#naming-the-system)):

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
  food: { name: Rations, min: 0 } # never below 0
weather:
  storm: { speed: 0 } # no travel in a storm
values:
  lost: { name: Lost, blocks: [travel] } # set by the getting-lost table: no more travel today
actions:
  camp: # sleep until dawn; a fed night (food didn't run out) eases fatigue
    do:
      - { time: dawn }
      - { unless: { below: food }, effects: { party.stats.fatigue: -1 } }
  rest: { do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }] }
  forage: # an action of this system: a Forage for food button
    name: Forage for food
    unless: { weather: storm }
    do: [{ time: 180 }, { speed: 0.5 }]
    oncePerDay: true
  eat: # not a button: the system takes it as each day ends, camping or not
    on: day-end
    do: [{ effects: { party.resources.food: -1 } }]
checks:
  - { event: WEATHER, at: day-start }
  - { event: LOST, at: day-start, unless: { edges: [road, river] } }
  - { event: ENCOUNTER, at: hex-enter, when: { terrain: [forest, swamp] } }
  - { event: NIGHT, at: camp }
  - { event: FORAGE, at: forage, when: { terrain: [forest, plains] } }
  - { event: HUNGRY, at: day-end, when: { below: food }, effects: { party.stats.fatigue: 1 } }
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

The rest of this section goes over each part of that example: what it's for, what it can say, and a few lines that work. To build a system with the forms instead, step by step, see the Systems app's [Your first system](../systems/02-making-a-system.md#your-first-system-step-by-step); [A day, step by step](../travel/02-playing.md#a-day-step-by-step) says in which order a trip does it all.

### The day and the speed

**day** says when the party wakes (`start`, the dawn) and when it must stop (`nightfall`): nobody marches after dark. **travel** says how many hours of the day are for marching (`hoursPerDay`); actions spend hours too. A way of travelling's `kmPerDay` is what it covers in those hours on easy ground, and everything else multiplies it:

- **terrains**: the speed on each terrain (`multiplier`: 0.5 is half speed, 2 double), by the ids of the Hexmapper's palette. `defaultTerrain: { multiplier: 1 }` covers the terrains the map uses and the list doesn't name.
- **edges**: roads, trails and rivers the party follows (`road: { multiplier: 1.5 }`). Following one, its multiplier replaces the terrain's.
- **weather**: today's weather (by the id a table or weather model sets) slows everyone down: `storm: { speed: 0 }` (nobody travels), `heavy-rain: { speed: 0.5 }`.

A terrain can be **closed**: `passable: false`, always, or on a [condition](../technical/08-conditions.md) about the hex entered and the moment. Routes go around what's closed.

```yaml
terrains:
  swamp: { multiplier: 0.33 }
  peaks: { multiplier: 0.25, passable: { when: { season: summer } } } # open only in summer
  pass: { multiplier: 0.5, passable: { unless: { weather: [snow, storm] } } } # closed in snow
  lake: { passable: { when: { month: [deepwinter, wolfmoon] } } } # crossed on the ice
water: { passable: false } # water hexes whose terrain isn't listed
```

**water** does the same for water hexes whose terrain isn't listed (the map's Edit palette → Water). Tables see `water: true` on water hexes.

### Ways of travelling

**modes** are the ways of travelling the player chooses from in the trip panel, each with its `kmPerDay` and a `name` (and `description`) for players: the panel and the journal show _On horseback_ instead of `horse`, translated in `locales/` like the rest. Without a name, the Generic rules' usual ids (foot, horse…) get the app's names and any other shows its id. Two conditions shape each one:

- `through`: **where it can go**, a [condition](../technical/08-conditions.md) on each hex it enters. It sees the hex (`terrain`, `water`, `tags`, `region`, its fields), `edges` (the roads or rivers of that step), `mode`, `weather` and today's values. Where it holds the mode goes, even over closed terrains; elsewhere it can't, and routes go around. A boat: `through: { water: true }` (it sails water where walking can't go); the Grey Marches' boat also hugs the coast, `through: { any: [{ water: true }, { terrain: coast }] }`; a cart only by road: `through: { edges: road }`. The older `allowedTerrains: [water, coast]` still works.
- `when` / `unless` (**Only when** / **Not when** in the Systems app): **when it can be chosen**, seen where the party stands. Otherwise it's disabled in the trip panel, saying why. The Grey Marches' boat is only taken at the water's edge or a ferry: `when: { any: [{ water: true }, { terrain: coast }, { tags: ferry }] }`; a horse not in snow: `unless: { weather: snow }`.

A value of the day can block one too (`blocks: [mode.horse]`, below): it can't be chosen, and a party already travelling that way stops until it changes.

### Supplies

**resources** are what the party carries: food, water, torches, fodder… Each one shows in the trip panel, where the player can also change it by hand. **Nothing uses them by itself**: the system's actions, checks and tables do, with effects (`party.resources.food: -1`). That's how a system says how its game eats: once a day, at camp, only on horseback, never.

`min` and `max` bound a supply. A change that would go past one stops there, the journal says so ("Rations can't go lower than 0"), and what comes after in that moment sees the supply's id in `below` (or `above`): the later steps of the same action and that day's `day-end` checks. That's how "a day without food tires the party" is written:

```yaml
resources:
  food: { name: Rations, min: 0 }
  water: { name: Waterskins, min: 0, max: 6 } # can't carry more than 6
checks:
  - { event: HUNGRY, at: day-end, when: { below: food }, effects: { party.stats.fatigue: 1 } }
```

Without `min`, a supply may go negative (a debt, say). Older packs that wrote `perDay` on a supply, `consumes` on a way of travelling or `eat: day` steps keep working, read as an action at day-end with `min: 0` (the Travel editor's **Convert** writes it that way).

### Values of the day

**values** are the values of the day this system declares, each with a `name` for players and what it **blocks** while it holds: `travel`, one of the system's actions by its id (`camp`, `rest`, `forage`…) or a way of travelling (`mode.horse`). A table's result (`set: { lost: true }`), a weather state or an action's step sets one; it holds until the day ends, and the next day tables read it as `yesterday.lost`.

```yaml
values:
  lost: { name: Lost, blocks: [travel] } # the getting-lost table sets it
  snowbound: { name: Deep snow, blocks: [mode.horse] } # set by the snow
  mutiny: { name: The hirelings refuse to march, blocks: [travel, forage] }
```

Blocked buttons stay visible, disabled, and say why with the value's name ("Lost: not possible for the rest of the day"). A system that declares no `values` still has the older built-in `lost` (blocks travel); one that declares `values: {}` has none. Values that block nothing are still useful: conditions read them (`unless: { mutiny: true }`), as they read the `…Modifier` and `…Impossible` values of [section 4](#4-results-the-trip-understands).

### Actions

**actions** are what the party does. Camp and rest are actions like any other: an id, conditions, steps; the trip panel shows each one as a button next to **Travel**, by its `name` (and its `description` as help). Rules that don't declare `camp` or `rest` still get the usual ones (sleep until dawn, rest an hour), and `camp: false` leaves one out.

When the button can be pressed:

- `when` / `unless`: conditions (like a table's) on the trip's facts, today's values and the party. The Grey Marches forage `unless: { weather: storm }` and camp only `when: { party.resources.food: { gte: 1 }, party.stats.fatigue: { lt: 10 } }`. When they don't hold, the button is disabled and says why.
- `oncePerDay: true`: once a day.
- A value of the day that `blocks` it (above).

**Actions the system takes by itself.** With `on:` an action isn't a button: the system takes it at that moment, when its `when` / `unless` hold. The moments are `day-start` (at dawn), `hex-enter` (entering each hex), `day-end` (as each day ends, camping or not) or another action's id (right after that action starts: `on: camp`), or several as a list (`on: [day-start, hex-enter]`). It comes before that moment's checks, so they see what it changed; its conditions see which moment it is as `moment`, and at `day-end` the action under way as `doing` (`doing: camp`).

```yaml
actions:
  eat: { on: day-end, do: [{ effects: { party.resources.food: -1 } }] }
  feed-horses: # only riding
    on: day-end
    when: { mode: horse }
    do: [{ effects: { party.resources.fodder: -1 } }]
```

**What an action does** is a list of **steps** (`do`), done in order. Each step does one thing, and only when its own `when` / `unless` holds:

| Step                                  | What it does                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `time: 180`                           | Three hours pass. `time: dawn`, `time: nightfall` or `time: '14:00'`: until the next one. Every day that ends on the way ends with its `day-end` actions and checks.     |
| `speed: 0.5`                          | The rest of today's march goes at half speed (`1.5`: faster).                                                                                                            |
| `effects: { party.stats.fatigue: 1 }` | Changes the party, like a table's effects. A change past a value's `min` / `max` stops there, and later steps see its id in `below` / `above`.                           |
| `set: { lost: true }`                 | Sets values of the day the system declares (`values`).                                                                                                                   |
| `do: forage`                          | Takes another action, if its conditions hold (otherwise nothing happens).                                                                                                |
| `roll: ENCOUNTER`                     | Rolls a check now: every check with that event whose `when` / `unless` hold, whatever its `at`. It's resolved when the action ends, so later steps don't see its result. |

```yaml
actions:
  camp: # sleep until dawn; a fed night eases fatigue
    do:
      - { time: dawn }
      - { unless: { below: food }, effects: { party.stats.fatigue: -1 } }
  forced-march:
    name: Forced march
    when: { party.stats.fatigue: { lt: 2 } } # only while fresh
    do: [{ speed: 1.5 }, { effects: { party.stats.fatigue: 1 } }]
  keep-watch: # a step that rolls, then a step on a condition
    do: [{ roll: NIGHT_WATCH }, { unless: { party.stats.morale: { gte: 1 } }, time: 60 }]
```

What an action **rolls** are the checks with `at: <its id>` (camp's: `at: camp`), rolled before its steps. `nothing` is what the journal says when none of them apply where the party is (`nothing: 'nothing to forage on {terrain}'`, with `{terrain}` the hex's terrain); without it the journal says that none of its rolls apply there. In the Systems app's forms each step is written the same way, one box per step, with suggestions. The older way (`minutes: 180, speed: 0.5, effects: …` on the action, or an `eat: day` step) still works, read as those steps. The Grey Marches use all of it: see [their camp, rest and foraging](../packs/02-grey-marches.md).

**At nightfall.** `day: { night: camp }` says what the party does when night falls while it waits with the world clock: camp (the default, if the system has camp), another action, or `false` (the night just passes). When the action can't be taken (a value blocks it, or its `when` / `unless` don't hold), the night passes without it and the journal says why; a travel order at nightfall does the same and marches on at dawn.

### Checks

**checks** are what the trip rolls, and when. Each one has an `event` (any name you like: the bindings use it to pick its table), a `name` and `description` for players (shown in the trip panel and the journal instead of the event; translated in `locales/`, see [Translations](05-translations.md#rules-calendars-weather-and-roll-modes)) and an `at`:

- `day-start`: at dawn, before marching (the weather, getting lost);
- `hex-enter`: entering each hex (encounters, a toll, a landmark);
- `day-end`: as each day ends, after the system's `day-end` actions (hunger). They see `below` / `above`, what hit a bound that day, and `doing`, the action under way when it ended;
- an action's id: with that action, before its steps (`at: camp`, `at: forage`);
- several, as a list: the Grey Marches roll encounters `at: [hex-enter, rest]`, and their condition tells the two apart with `moment` (the table sees `moment` too);
- none: only a step's `roll:` rolls it.

`when` / `unless` decide where and when it applies, with the same [conditions](../technical/08-conditions.md) as tables; `edges` are the roads or rivers of the stretch (the one just walked when entering a hex, the one ahead at dawn and in camp).

```yaml
checks:
  - { event: LOST, name: Getting lost, at: day-start, unless: { edges: [road, river] } }
  - event: ENCOUNTER
    at: [hex-enter, rest]
    when: { any: [{ moment: hex-enter, danger: { gte: 1 } }, { moment: rest, danger: { gte: 3 } }] }
  - { event: SHRINE, at: hex-enter, when: { tags: shrine }, pause: true } # waits for Continue
  - { event: HUNGRY, at: day-end, when: { below: food }, effects: { party.stats.fatigue: 1 } }
```

A check can have **effects of its own**: without a table it just applies them, which is how a system writes its rules as data ("a day without enough food: fatigue +1"). `pause: true` rolls it and then stops the trip until **Continue**, so you can describe the place or decide something. Waiting with the world clock (Hexmapper → [World clock](../hexmapper/12-world.md#with-a-trip-going-on)) rolls them too (and takes the actions with `on:`): `day-start` at each dawn, the camp's at each nightfall, `day-end` as each day ends. Older packs' `short` means something hit its minimum, and `camping` that the night's action was under way.

### Bindings, stats and reads

The **bindings** (`kind: bindings`) are the other half of the system:

- `on` connects each check, by its event, to what answers it: `resolve:` a table, oracle, generator or deck of the pack (or another pack's, by full id: `core/weather`), or `weather:` a [weather model](#weather-with-inertia). `context` adds values for that check only, and wins over everything else: the same encounter table answers day and night with `context: { timeOfDay: night }` on the camp's check, and an oracle gets its input as `context: { odds: likely }`. **Checks with no binding** (and no effects) wait in the journal for you to resolve them yourself, and the trip stops until **Continue**: the Grey Marches' landmarks.
- `stats` are the party's numbers, shown in the trip panel, where you set them when the trip starts and change them as you play. Nothing in the apps makes them up: each system declares its own, with a `name`, a `description` (its help in the trip panel), a starting value (`default`) and, if it has them, `min` and `max` (fatigue never below 0). Tables read them by key, `{{charisma}}`, or always unambiguously `party.stats.charisma`. The Grey Marches declare Charisma, Survival, Navigation and Morale; the Generic rules have none. A table can change one nobody declared (`effects: { party.stats.hirelings: 1 }`): it works and shows by its key, but the pack gets a warning, so declare every stat its tables change.
- `reads` names the other values the system's tables read that nobody else names: a value of the map (`danger`, `icon.guards`, `token.fare`), the bindings' context (`timeOfDay`) or today's values tables set (`fordModifier`). With a `name` and `description` each, the roll panel shows them by name, with what they are in their help: `reads: { icon.guards: { name: Guards, description: How many guards watch the gates. } }`. The values maps and trips give (terrain, season, holidays…) already have names in the apps.

```yaml
kind: bindings
id: default
on:
  NIGHT: { resolve: encounters, context: { timeOfDay: night } }
  FORD: { resolve: ford, context: { odds: even } } # an oracle and its input
stats:
  morale:
    { name: Morale, description: Falls with hunger and bad news., default: 2, min: -3, max: 3 }
reads:
  danger: { name: Danger, description: How dangerous the hex is. }
```

### Naming the system

Travel rules and bindings are enough for a system named after its pack. A `kind: system` says it in one place, with what else it brings: its calendar, the weather models its bindings use and other packs' tables (packs it depends on). A pack may declare several, e.g. a winter variant with its own travel rules:

```yaml
kind: system
id: default # chosen by the pack's id
name: Dark Woods
travel: default
bindings: default
---
kind: system
id: winter # chosen as <pack>/winter
name: Dark Woods in winter
travel: winter # another kind: travel-rules, with id: winter
bindings: default
```

Every key is in [Systems](../technical/07-kinds.md#systems).

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
- The journal shows the day's weather by its name. In the Systems app's **Checks**, pick the model under _Weather with inertia_.

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
2. In the Travel app, pick your system and open **Play**: build a short way with the terrains and tags your checks look for, and travel. The journal shows each check and its result.
3. On a map: in the Hexmapper, Play → **With rules**, pick your pack as the rules, place the party and travel.
4. Problems in the travel rules or bindings appear in the pack page, like any other.

# Kinds of definition

A pack is a folder of YAML (or JSON) files. Each file holds one or more **definitions**, separated by a line with `---`, and every definition says what it is with `kind:`. This page lists every kind, what it's for, who reads it and what it looks like. Each one is validated when the pack loads: a mistake shows in the Oracle app's **Problems**, with its file and line.

The kinds are a **fixed set**: each one is read by an engine that knows it, and a pack can't add kinds of its own (one the apps don't know is kept but nothing reads it). What a pack chooses freely is the content: its own tables, calendar, weather, roll modes, travel rules and stats, with the names and rules of its game.

| Kind           | What it is                                                                 | Read by                                                                         | How many per pack |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------- |
| `table`        | A list of results picked by dice or weight                                 | The Oracle; anything that rolls, when it names it (below)                       | Any               |
| `oracle`       | A table whose answers depend on a question (an input)                      | The Oracle; anything that rolls, when it names it (below)                       | Any               |
| `generator`    | Several rolls joined in one text                                           | The Oracle; anything that rolls, when it names it (below)                       | Any               |
| `deck`         | Cards drawn without putting them back                                      | The Oracle; anything that rolls, when it names it (it draws a card)             | Any               |
| `roll-modes`   | Ways of rolling a table several times and keeping one total                | The Oracle (every roll)                                                         | One               |
| `travel-rules` | How a trip works: speeds, terrains, actions, checks                        | Map Play, the Travel app                                                        | One per system    |
| `bindings`     | Which table answers each check of a trip, the party's stats                | Map Play, the Travel app                                                        | One per system    |
| `calendar`     | Months, seasons, weekdays, moons and holidays                              | Trips, the world clock (Map's World panel, the Campaign app)                    | One per system    |
| `weather`      | Weather with memory: today's follows from yesterday's, per season          | Trips (a binding with `weather:`)                                               | Any               |
| `land`         | Terrain with memory: an empty cell's follows from the land around it       | Discovery (a binding with `land:`), Map's **Generate**                          | Any               |
| `sheet`        | What each of the party's characters has: values, conditions                | Trips (the party's characters), the Systems app                                 | One per system    |
| `factions`     | The powers of its world: their land and their world turns                  | The world clock (Map's World panel, the Campaign app), the Systems app          | One per system    |
| `clocks`       | The progress clocks its world starts with, and what each does when full    | The world clock (Map's World panel, the Campaign app), the Systems app          | One per system    |
| `items`        | What its characters may carry: items with tags, numbers, places            | Characters' cards (trips, tokens, the Characters app), effects, the Systems app | Any               |
| `bestiary`     | Templates of characters (creatures, NPC types) that results make copies of | Trips (those present: effects `present.<template>`)                             | Any               |
| `places`       | Templates of points of interest that results make on the party's cell      | Trips (effects `place.pois.<place>`), written on the map by Map                 | Any               |
| `system`       | A game system: which of the above it uses, and which packs                 | Every app that plays with a system: Map, Travel, Campaign, Characters, Systems  | Any               |

**Who reads what.** Tables, oracles, generators and decks are all things you can roll, and anything that rolls can roll any of them: the Oracle by hand, a trip's check or discovery when a binding names it (`resolve: deck.omens` draws a card), an action's `roll:` step (`roll: table.ruins`), an entry or card that rolls another (`table:`), a generator's field, a progress clock as it fills (`resolve:`) and a faction's world turn (`turn:`). **How many:** one of a kind that describes the whole system (its roll modes, travel rules, bindings, calendar, sheet: a system has one way of doing each), any number of the rest. A pack with several [systems](#systems) has one set for each, told apart by their ids. Weather models are many because a system may have several climates (the coast and the mountains, each bound to its own check).

Translations of names and texts go in `locales/<language>/` files with the same name, for every kind; the ones that aren't tables are keyed by kind and id (`calendar/marcher-reckoning:`): see [Translations](../oracle/05-translations.md#rules-calendars-weather-and-roll-modes). The examples below are in the base language only.

## Tables

```yaml
kind: table
id: weather
name: Weather
roll: 1d6 # empty: pick by weight
modes: [roll-modes.advantage, roll-modes.disadvantage] # roll modes offered by hand
entries:
  - { id: clear, range: 1-3, result: Clear skies, set: { weather: clear } }
  - { id: storm, range: 4-6, result: Storm, table: table.storm-damage }
```

Entries have a `range` of totals (or a `weight`), a `result` text, and optionally `when` / `unless` (conditions), `set` (values the result gives), `table` / `generator` (roll another one), `once` / `maxOccurrences` (limits per session), `effects` (changes to the party's values) and `pause` (stop the trip when it comes up). The table may also have `clamp`, `onExhausted`, `modes`, `modeWhen` and `modeUnless`, and, as every table, oracle, generator and deck, `tags`: words that sort it (`tags: [people, names]`), which the Oracle's and Map's **Filter** read; they mean nothing else, and `rules` is only our packs' habit for what their systems roll. Everything about them: [Editing](../oracle/04-editing.md) and [YAML](../oracle/06-yaml.md).

**What other tables see:** a table rolled from another (`table:`) gives its text as `{{result}}` and its `set` values to the trip and to later checks of the day (see [What tables see](04-what-tables-see.md)).

## Oracles

A table with one **input** (a question: the odds, the stakes…) and one list of entries per option of the input. The input can be chosen when rolling or come from a trip's bindings (`context: { odds: even }`). Each variant may have its own `roll`.

```yaml
kind: oracle
id: yes-no
inputs:
  odds: { options: [unlikely, even, likely], default: even }
roll: 1d6
variants:
  unlikely:
    { entries: [{ id: yes, range: 1, result: 'Yes' }, { id: no, range: 2-6, result: 'No' }] }
  even: { entries: [{ id: yes, range: 1-3, result: 'Yes' }, { id: no, range: 4-6, result: 'No' }] }
  likely: { entries: [{ id: yes, range: 1-5, result: 'Yes' }, { id: no, range: 6, result: 'No' }] }
```

## Generators

Fields rolled in order (each sees the ones before it), joined by a `template`. A field is a `table`, a `generator`, dice (`roll`) or a fixed `value`, and may have `when` / `unless` (rolled only then; otherwise empty) and its own `context`.

```yaml
kind: generator
id: npc
fields:
  name: { table: table.npc-names }
  might: { roll: 4d6kh3 }
template: '{{name}} (might {{might}})'
```

**What other tables see:** each field by its name, inside the generator (`{{name}}`), and from a generator that rolls this one, as `{{npc.name}}`. What its tables set, change and pause reaches a trip (or whatever rolled it) as a table's does: their `set` values (its own fields win a name they share), their `effects` added up, and a `pause` in any of them stops the trip.

## Decks

Cards drawn without replacement until the deck is reshuffled (`reshuffle: when-empty`, `manual` or `after-draw`). A card can come in copies (`count`), roll a table, set values, have `effects` and `pause`, like an entry.

```yaml
kind: deck
id: omens
reshuffle: when-empty # when-empty, manual or after-draw
cards:
  - { id: crows, result: Crows follow you all day, count: 3 } # three copies
  - { id: stranger, result: 'A stranger on the road: {{result}}', table: generator.npc }
  - { id: cache, result: 'A hunter’s cache', effects: { party.items.ration: 2 } }
  - { id: wyrm-sign, result: Scorched trees, set: { omen: wyrm }, pause: true }
```

Each card needs an `id` (translations and the drawn-cards record use it). **What tables see:** a card's `set` values, like an entry's; a table rolled by a card gives its text as `{{result}}`.

## Oracle inputs

An oracle's input can have a `label` and `labels` for its options, shown instead of the ids and translated in `locales/`:

```yaml
inputs:
  odds:
    label: The odds
    options: [unlikely, even, likely]
    labels: { unlikely: Unlikely, even: Even, likely: Likely }
    default: even
```

## Roll modes

The ways a system rolls a table **several times and keeps one total**: advantage, disadvantage, or anything else (three rolls keeping the middle one…). The apps know none of them: a pack declares them, with their names, and its tables list the ones they use. One `roll-modes` definition per pack, with any number of modes. In the Systems app, a system's **Roll modes** tab edits its packs' with a form.

```yaml
kind: roll-modes
id: default
modes:
  advantage:
    name: Advantage
    description: Roll twice and keep the higher total.
    repeat: 2 # how many times the whole roll is made
    keep: highest # highest, lowest or middle (of an even count, the lower middle one)
    cancels: roll-modes.disadvantage # together, neither applies: a normal roll
  disadvantage: { name: Disadvantage, repeat: 2, keep: lowest }
```

A table or oracle uses them with:

- `modes: [roll-modes.advantage, roll-modes.disadvantage]`: offered when rolling by hand (the choice next to **Roll**).
- `modeWhen: { roll-modes.advantage: { party.stats.explorer: { gte: 1 } } }`: used by itself when the condition holds, also on a trip. A mode can be in `modeWhen` without being in `modes`.
- `modeUnless: { roll-modes.disadvantage: { place.tags: lit } }`: not used by itself when the condition holds. With `modeWhen` for the same mode, it applies when the first holds and this one doesn't (`modeWhen: { roll-modes.disadvantage: { timeOfDay: night } }` + this: at night, except where it's lit); alone, the mode is used always but then (a cursed table rolled with disadvantage `unless: { blessed: true }`).

When several apply (one chosen by hand plus some on their own), the ones that cancel each other drop out and the first of the rest is used (the one chosen by hand, then `modeWhen`'s order, then `modeUnless`'). Modes are referenced like tables, by their kind and id (`roll-modes.advantage`): the pack's own first, then its dependencies' (the Grey Marches use Core's `roll-modes.advantage`), or with the pack in front (`core/roll-modes.advantage`). Core declares advantage and disadvantage and the Grey Marches add _Carefully_ (three rolls, the middle one). The old `advantage: true` does nothing now and warns.

**What tables see:** nothing: modes aren't values; a table uses them through `modes`, `modeWhen` and `modeUnless`.

## Travel rules

How a trip works: when trips start, the scale of their speeds (`hoursPerDay`), how the trip goes on by itself (`travel.onward`: an action and its parameters) and what the party does when it can't march (`travel.halt`), terrains and their speeds and whether they can be entered (`passable`: `false`, or `{ when, unless }` for a pass closed in winter or a lake crossed on the ice), water (the same), roads and rivers, ways of travelling (km per day, where they can go: `through`, and when they can be chosen: `when` / `unless`), weather that slows you down, its **values of the day** (`values`: `lost` with what it `blocks`: `travel.move`, one of its actions (`actions.forage`) or `modes.<id>`), the party's **actions** (only the ones it declares, all alike: march, camp, rest, foraging…; `when` / `unless`, `oncePerDay`, `params` (what is chosen when taking it, read as `{{params.<id>}}`), `on:` for those the system takes by itself at a moment or after another action (or several: a list), and their steps, `do`: `time`, `travel.move`, `travel.speed`, `travel.advance`, `effects`, `set`, `do` (with `with:`), `roll`) and the **checks**: what is rolled at a clock or a part of the calendar's day (the morning), on entering a cell, at the end of the day, with an action (camping, for example) or only by a step's `roll:`, and when (`when` / `unless`); a check may have `effects` of its own and `pause: true` (stop after it until **Continue**). A pack with travel rules is a **system** you can play in Map (Play → With rules) and the Travel app. In detail: [Connecting tables to maps and trips](../oracle/07-connecting.md) and the Systems app's [Rules](../systems/05-rules.md) and [Checks](../systems/06-checks.md) tabs.

Every key, in a small system (the comments say what each does):

```yaml
kind: travel-rules
id: default
travel:
  hoursPerDay: 8 # the hours a way's kmPerDay is marched in (the speed's scale)
  cellKm: 10 # km a cell, a hex or a square (the scale)
  diagonals: 1.5 # on squares, a step across a corner costs 1.5 steps (empty: none)
  cutCorners: false # a diagonal step never passes a corner it can't enter (the default)
  start: '06:00' # when a new trip starts (a clock or a part of the day; empty: midnight)
  onward: { do: actions.march, with: { until: destination } } # how the trip goes on by itself
  halt: { at: '20:00', do: actions.camp } # from then on, a party that can't march camps by itself
modes: # ways of travelling
  foot: { name: On foot, kmPerDay: 24 }
  horse: { name: On horseback, kmPerDay: 40, unless: { trip.weather: snow } }
  boat:
    {
      kmPerDay: 50,
      through: { place.water: true },
      when: { any: [{ place.water: true }, { place.tags: ferry }] },
    }
terrains:
  plains: { multiplier: 1 }
  forest: { multiplier: 0.5 }
  peaks: { multiplier: 0.25, passable: { when: { time.season: summer } } }
  lake: { multiplier: 0.5, passable: { when: { time.month: [1, 12] } } } # frozen in deep winter
defaultTerrain: { multiplier: 1 } # speed × for terrains not listed
water: { passable: false } # water cells without a rule of their own
connections: # along a road or river; through a door drawn on the map
  road: { multiplier: 1.5 }
  river: { multiplier: 1 }
  door: { name: Door, extra: 10, passable: { unless: { connection.state: locked } } }
weather: { storm: { speed: 0 }, heavy-rain: { speed: 0.5 } }
values: # values of the day tables and actions set
  lost: { name: Lost, blocks: [travel.move] }
  snowbound: { blocks: [modes.horse] }
  torchlit: { name: By torchlight }
actions:
  camp:
    when: { party.values.food: { gte: 1 } } # otherwise the halt passes without it
    do:
      - { time: '06:00' }
      - { unless: { trip.below: party.values.food }, effects: { party.stats.fatigue: -1 } }
  rest:
    when: { time.hour: { gte: 6, lt: 20 } }
    do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }]
  march: # moves while it holds (by day for 8 h, or by torchlight), as far as chosen
    params:
      until: { name: How far, choices: [destination, place, { id: 3, name: Three cells }] }
    when:
      {
        any:
          [
            { time.hour: { gte: 6, lt: 20 }, trip.marched: { lt: '{{system.hoursPerDay}}' } },
            { today.torchlit: true },
          ],
      }
    do: [{ travel.move: '{{params.until}}' }]
  night-march: # from 20:00, lights the torches and marches; its button hides by day
    when: { time.hour: { gte: 20 } }
    hideWhenUnavailable: true
    do:
      - { set: { torchlit: true } }
      - { effects: { party.stats.fatigue: 1 } }
      - { do: actions.march, with: { until: destination } }
  forage:
    oncePerDay: true
    unless: { trip.weather: storm }
    nothing: 'nothing to forage on {terrain}' # the journal when no check applies
    do: [{ time: 180 }, { travel.speed: 0.5 }]
  # not a button; the food is a value of the party's sheet (`partySheet` in its system)
  eat: { on: time.day-end, do: [{ effects: { party.values.food: -1 } }] }
checks:
  - { event: WEATHER_CHECK_REQUIRED, at: '06:00' }
  - {
      event: NAVIGATION_CHECK_REQUIRED,
      name: Getting lost,
      at: '06:00',
      unless: { trip.connections: road },
    }
  - {
      event: ENCOUNTER_CHECK_REQUIRED,
      at: [trip.place-enter, actions.rest],
      when: { place.danger: { gte: 2 } },
    }
  - { event: FORAGE_CHECK_REQUIRED, at: actions.forage }
  - {
      event: HUNGRY_DAY,
      at: time.day-end,
      when: { trip.below: party.values.food },
      effects: { party.stats.fatigue: 1 },
    }
  - {
      event: SHRINE_CHECK_REQUIRED,
      at: trip.place-enter,
      when: { place.tags: shrine },
      pause: true,
    }
```

A step does one thing: `time` (minutes, a clock, `'14:00'`, or a part of the calendar's day, `time.meal.luncheon`: until it next comes), `travel.move` (along the route while time passes and the action's `when` / `unless` hold: `destination`, `hex`, a number of cells or a variable), `travel.speed` (the rest of today's moving), `travel.advance` (that many cells along the route at once, a number or a variable), `travel.mode` (another way of travelling, if it can be chosen), `effects`, `set`, `do` (another action, with `with:` its parameters, or a world turn of the campaign, `do: world.turn`, played by the app), `roll` (a check, or something of the Oracle: `table.<id>`…), `say` (a line in the journal), `pause` (`true` or a text: the trip waits for **Continue**), `ask` (one of the action's parameters, chosen by the player as the action goes) or `wait` (a condition, with `limit:` the most it waits); each step may have `when` / `unless`, and an `id` its translations name it by. Every step, with examples: [Actions and steps](10-actions-and-steps.md). An action's `params` each have `choices` (values, or `{ id, name, description }`) and maybe a `default` (else the first); a `with:` gives a choice or a variable (`'{{params.until}}'`). An action's `on:` is `trip.place-enter`, `time.day-end`, a clock (`'06:00'`: as it strikes) or a part of the calendar's day (`time.meal.elevenses`: as it begins), while marching, waiting or asleep in camp (see [Divisions of the day](#calendars)), another action, `actions.camp`, or its end, `actions.camp.done`, one of its checks right after it's resolved, `checks.WEATHER_CHECK_REQUIRED`, one of the system's progress clocks filling, `world.clocks.<id>.full`, or a world turn of the campaign, `world.turn` (or a list). `travel.start` and the halt's `at` take a clock or a part (`halt: { at: time.meal.supper, do: actions.camp }`). A check's `at:` takes the same moments (or a list); without `at`, only a step's `roll:` rolls it. The checks of one moment are decided one by one, in the list's order, each just before it's rolled: its `when` / `unless` see what the ones before it set (the weather, values of the day, `effects`); one that pauses holds the rest of its moment until the player goes on. Values of the day last until the day ends (`lasts: day`, the only choice for now).

**Nothing the system doesn't declare.** There are no supplies in the rules: what the party carries is its sheet's values (`party.values.food`) or items (`party.items.ration`, its own and its characters' together), with their bounds; an action's later steps see what earlier ones changed of them. Without an action with a `travel.move` step, the party never moves along its route (a march without `when` moves whenever nothing else stops it: a value of the day, the weather, the way, day and night); without `onward`, the trip going on by itself only waits; without `halt`, a party that can't march just waits; without actions, there are none (no march, camp or rest of the engine's own); without `values`, there are none. What blocks `travel.move` blocks the actions that move too. A move a check stops on the way stays under way: going on (**Go on**) finishes it, then the steps after it. The **halt** (`travel.halt`): from its moment until the day ends, a party that isn't marching while the time moves on by itself (the world clock, a travel order while its way on can't be taken, **Wait to go on**) takes its action, once a day; when it can't (its `when` / `unless`, a value that blocks it), the journal says so and the time passes until the trip can go on.

Packs written for an older pack format aren't read (see [File formats](02-file-formats.md#packs)).

**What tables see:** the trip's facts (`place.terrain`, `trip.connections`, `trip.mode`, `time.day`, `time.season`, `trip.weather`, `yesterday.<value>`…) and the party (`party.stats.fatigue`, `party.values.food`, `party.items.ration.count`): the full list is in [What tables see](04-what-tables-see.md).

## Bindings

The other half of a system: which table (`resolve:`) or weather model (`weather:`) answers each check, with extra `context`; the party's **stats** (name, description, starting value) that tables read (`{{party.stats.charisma}}`), and which of them come from its characters (`from`); **reads**, names for the other values its tables read (`icon.guards`, `fordModifier`…); and **discovery** (which tables decide empty cells). In detail: [Connecting tables to maps and trips](../oracle/07-connecting.md).

```yaml
kind: bindings
id: default
stats: # the party's numbers, edited during the trip
  survival: { name: Survival, description: Added to foraging., default: 1 }
  hirelings: { name: Hirelings, default: 0, min: 0 }
  fatigue: { name: Fatigue, default: 0, min: 0 }
  # With characters in the party, made of theirs (the system's sheet): the best Pathfinding,
  navigation: { name: Navigation, default: 0, from: { max: pathfinding } }
  # or how many eat, leaving none out (without characters: 1, its default).
  mouths: { name: Mouths, default: 1, from: { count: true } }
roles: # journey roles the player gives the characters (read as roles.<id>)
  guide: { name: Guide, description: Leads the way. }
reads: # names for other values its tables read (shown in the roll panel and on the map)
  danger: { name: Danger, description: How dangerous the cell is. }
  icon.guards: { name: Guards }
discover: # tables that decide empty cells as the party travels
  terrain: { resolve: table.next-terrain } # or a land model: { land: land.default }
  contents: { resolve: table.hex-contents }
  reveal: neighbors # or entered
on: # per check event: what answers it
  WEATHER_CHECK_REQUIRED: { weather: weather.sky } # a weather model
  NAVIGATION_CHECK_REQUIRED: { resolve: table.getting-lost } # a table, oracle, generator or deck
  ENCOUNTER_CHECK_REQUIRED: { resolve: table.encounter, context: { timeOfDay: day } }
  FORD_CHECK_REQUIRED: { resolve: oracle.ford, context: { odds: even } } # an oracle's input
```

A check with no binding is written in the journal (with its `effects`, if it has any) and only stops the trip when it says `pause: true`.

**Stats from the characters** (`from`, when the system has a [sheet](#sheets)): while the party has characters, the stat is made of theirs, and effects on it are overwritten; while it has none, it's kept like any other, so the same system plays with or without characters. One of:

- `max: <value>` — the best among them; `min: <value>` — the worst; `sum: <value>` — all together; `count: true` — how many they are.
- `pick: <value>` — one character's: whoever the player chooses in the trip (**Rolls with**), the best when nobody is chosen. With **Ask at every roll** ticked in the trip, each check rolled on a table waits for the choice before rolling (the Grey Marches' Charisma: whoever does the talking).
- `party: <value>` — not the characters' but a value of the party's own sheet (`partySheet`), always: see [Sheets](#sheets).
- `when` / `unless` — only the characters this [condition](08-conditions.md) holds for, read with each one's values (`unless: { conditions: wounded }`, `when: { values.health: { gt: 0 } }`).
- `none` — what it is when no character counts (default 0).

**Journey roles** (`roles`): jobs the player gives the characters in a trip (lead the way, keep watch, forage…), each with a `name` and `description` for players. Checks, tables and actions read whoever holds one as `roles.<id>.…` (`roles.guide.values.pathfinding: { gte: 2 }`) and their effects reach them (`roles.lookout.values.health: -1`); with nobody in the role, what reads it doesn't hold and its effects change nothing.

**What tables see:** each stat by name (`{{party.stats.charisma}}`, `when: { party.stats.morale: { lte: 0 } }`) and the binding's `context` (`timeOfDay: night`).

## Calendars

The months of the year (with their days and seasons), weekdays, moons (cycle and phase) and holidays, and the year of day 1. Trips with that system date their journal with it, and tables see `time.month`, `time.year`, `time.weekday`, `time.moons.<moon>` (new, waxing, full, waning) and `time.holidays`. The world clock (Map's [World](../map/12-world.md) panel, the Campaign app) uses the calendar of the campaign's system. Without one, a plain calendar of days and four seasons is used (the Generic rules name Core's, `core/calendar.default`, which adds its parts of the day). In the Systems app, a system's **Calendar** tab edits it with a form (renaming a month carries its holidays and translations along).

```yaml
kind: calendar
id: marcher-reckoning
name: The Marcher reckoning
startYear: 412
months:
  - { id: thaw, name: Thaw, days: 30, season: spring }
  - { id: highsun, name: Highsun, days: 30, season: summer }
weekdays: [{ id: moonday, name: Moonday }]
moons: [{ id: pale, name: The Pale Moon, cycle: 28 }]
holidays: [{ id: midsummer, name: Midsummer, month: highsun, day: 15 }]
```

**What tables see:** `{{time.month}}` (the month's id), `{{time.year}}`, `{{time.weekday}}`, each moon's phase as `time.moons.<moon>` (`when: { time.moons.pale: full }`) and today's holidays as a list (`when: { time.holidays: midsummer }`), plus `time.season` from the month. Ids, not names: conditions compare ids, and the journal shows the names.

**Divisions of the day** (`divisions`): the ways the calendar divides the day, as many as the system wants (meals, watches, bells, prayers…), none if it declares none. Each one is keyed by its id and has either `parts` (each with an `id`, a `from` and optionally `until`, `name`, `description` and `tags`) or `every` (hours: numbered parts of equal length from midnight, 1, 2, 3…). Numbered parts read as numbers (`time.watch: 2`), whether written with `every` or as `parts` all named by whole numbers (`id: '2'`): the Systems app's **Split into equal parts…** writes them that way. A part lasts until the next one of its division starts, in the order of the day whatever order they're written in (the last one until the first, past midnight); `until` ends it earlier, leaving a gap with none of the division's parts. Tags mean only what a system's rules make of them. An id can't be a name the moment already has (`day`, `hour`, `minute`, `season`, `year`, `month`, `weekday`, `moons`, `holidays`, `tags`…). Map's [World](../map/12-world.md) panel moves time on to the next part of each division, or to a part chosen. Names are translated keyed by the ids (`divisions: { meal: { name: …, parts: { elevenses: { name: … } } } }`).

```yaml
kind: calendar
id: hearth-reckoning
months: [{ id: first, days: 30 }]
divisions:
  meal:
    name: Meals
    parts:
      - { id: breakfast, name: breakfast, from: '07:00' }
      - { id: elevenses, name: elevenses, from: '11:00', tags: [meal] }
      - { id: supper, name: supper, from: '21:00', tags: [meal, dark] }
  watch:
    name: Watches
    parts: # only at night: the last one ends at 07:00
      - { id: first, from: '21:00' }
      - { id: middle, from: '01:00' }
      - { id: morning, from: '04:00', until: '07:00' }
  bell: { name: Bells, every: 0.5 }
```

## Weather models

Weather with memory (a Markov chain): per season, for each kind of weather, how likely each kind is tomorrow, so rain sets in for days and storms blow over. Each kind of weather has a name and the values it gives the day (`set: { fordModifier: -1 }`), like a table's result. A trip uses one when a binding says `weather: <model>` instead of `resolve:`; today's weather becomes `trip.weather` for later checks and the travel rules' speeds. In the Systems app, a system's **Weather** tab edits its models with a form: the kinds of weather, and per season a grid of weights from yesterday's weather to today's, with how often each kind comes up over many days.

```yaml
kind: weather
id: sky
states:
  clear: { name: Clear skies }
  rain: { name: Steady rain, set: { fordModifier: -1 } }
seasons:
  spring:
    start: clear # or weights: { clear: 2, rain: 1 }
    next:
      clear: { clear: 3, rain: 1 }
      rain: { rain: 2, clear: 1 }
```

A season can be a **hex flower** instead: 19 cells, five rows of 3, 4, 5, 4 and 3 kinds of weather, top to bottom. Each day 2d6 moves the weather one cell (by default 2–3 north-east, 4–5 east, 6–7 south-east, 8–9 south-west, 10–11 west, 12 north-west; `moves` changes it), so weather drifts to its neighbours; off the edge it comes back in on the far side (`edge: wrap`) or stays (`edge: stay`). A model may mix both, season by season.

```yaml
kind: weather
id: highland-skies
states:
  clear: { name: Clear }
  grey: { name: Overcast }
  snow: { name: Snow, set: { snowed-in: true } }
  storm: { name: Blizzard }
seasons:
  winter:
    flower:
      start: snow # the first day: the cell with it nearest the middle (absent: the middle)
      rows:
        - [storm, storm, snow]
        - [storm, snow, snow, snow]
        - [snow, snow, grey, grey, grey]
        - [grey, grey, clear, clear]
        - [clear, clear, clear]
      moves: { ne: '2-3', e: '4-5', se: '6-7', sw: '8-9', w: '10-11', nw: '12' } # the default
      edge: wrap
```

A campaign's world clock also rolls its own weather each day on its system's model while no trip is going on ([The world clock](../map/12-world.md#moving-time-on)).

**What tables see:** `{{trip.weather}}`, the id of today's weather (`rain`), and each value its state sets, by name (`{{today.fordModifier}}`, `when: { today.fordImpossible: true }`); the day after, the same values as `yesterday.weather`, `yesterday.fordModifier`. There's no `{{trip.weather.value}}`: the weather is its id, and its values are values of the day like any table's `set`.

The Grey Marches use every kind: see [The Grey Marches](../packs/02-grey-marches.md#where-each-feature-is).

## Land models

Terrain with memory: for each terrain, how likely a cell **next to it** is to be each terrain, so land that's decided or generated grows coherent (forests stay forests, hills gather into ranges, water into lakes) instead of a patchwork. They're the weather models' chance tables, laid in space instead of time.

```yaml
kind: land
id: default
name: The lie of the land
next: # for each terrain, the weights of a neighbouring cell's terrain
  forest: { forest: 6, hills: 2, plains: 2 }
  hills: { hills: 4, mountains: 2, forest: 1 }
  mountains: { mountains: 5, hills: 3 }
  plains: { plains: 5, forest: 1, hills: 1 }
  lake: { lake: 5, plains: 1 }
start: { plains: 3, forest: 2 } # with no known neighbour
weights: { from: 2 } # the cell it's seen from counts twice (absent: as any other)
```

- **How a cell is decided:** the rows of all its **known neighbours** (painted, or decided already) are added up, and one terrain is picked by those weights. Two forest neighbours count the forest row twice; a cell between forest and hills leans to both. A terrain the model has no row for adds nothing. With no known neighbour it has a row for, `start`; if every weight is 0, the cell stays empty.
- **`weights: { from: N }`**: the cell it's seen from (the land the party stands on, in discovery) counts `N` times instead of once, so a trip into the unknown tends to follow its own land. Absent, every neighbour counts the same. Generating land has no such cell.
- Ids are the system's terrains (`place.terrain`); a model naming a terrain its system's travel rules don't list is a warning.
- **Where it's used**, once its system lists it (`land: [land.default]`): by **discovery**, when the bindings say `discover: { terrain: { land: land.default } }` instead of a table, or when the terrain table **hands over** to it (an entry with `set: { land: land.default }`: the table decides first, and the model the rest, see [Discovering the map](../oracle/07-connecting.md#7-discovering-the-map)); and by Map's **Generate**, which fills empty cells with it.
- It decides only the terrain: what a cell holds is still the contents table's job.

Translations: `name` and `description` in `locales/<language>/`, keyed `land/<id>`. Core's _The plain land_ is the smallest; the Grey Marches' _The lie of the Marches_ counts the land you come from twice.

## Sheets

What each of the party's characters has, when a system plays them one by one (`sheet:` in its [system](#systems)). Trips then have a **Characters** section where you add them, choose who is acting and change their values; the party's stats can come from them ([bindings](#bindings): `from`), and the party's items are theirs together (`items.share`, below). PCs, companions, hirelings or enemies are all characters of a sheet.

```yaml
kind: sheet
id: companion
name: Companion
values: # numbers each character has, with the bounds the system gives them (none: no bound)
  survival: { name: Survival, default: 1, min: 0, max: 5, display: pips, group: skills } # 5 dots
  pathfinding: { name: Pathfinding, default: 0, min: 0, max: 3, group: skills }
  maxHealth: { name: Max health, default: 3, min: 1, max: 6, group: body }
  health: # another value as its bound; a bar, red under half its max, amber from half, green from three quarters
    {
      name: Health,
      default: 3,
      min: 0,
      max: '{{self.values.maxHealth}}',
      display: bar,
      tones: { 0: danger, 50%: warning, 75%: good },
      group: body,
    }
  water: { name: Water, default: 2, min: 0, max: 6, display: of } # 2 / 6
  dread: { name: Dread, default: 0, min: 0, max: 6, display: boxes } # 6 boxes
  harm: # a name for each value, from its min: 0 is Unhurt, 3 is Dying
    display: levels
    min: 0
    max: 3
    levels:
      [
        { id: unhurt, name: Unhurt },
        { id: bruised, name: Bruised },
        { id: wounded, name: Wounded },
        { id: dying, name: Dying },
      ]
  wounds: # made of other values, never set: it follows them
    { name: Wounds, from: '{{self.values.maxHealth - self.values.health}}', min: 0, group: body }
groups: # the cards values are shown in, in this order
  skills: { name: Skills }
  body: { name: Body }
conditions: # states a character has or not, and what the party can't do while someone has one
  wounded: { name: Wounded, blocks: [actions.forced-march] } # an action of the system
  sprained: { name: Sprained ankle, blocks: [travel.move] } # marching
  saddle-sore: { name: Saddle-sore, blocks: [modes.horse] } # a way of travelling
  terrified: # holds by itself while dread is full
    { name: Terrified, when: { self.values.dread: { gte: 6 } }, blocks: [actions.night-march] }
  seasick: { name: Seasick, when: { trip.mode: boat } } # holds by itself, reading the world
relations: # kinds of relation a character may hold to anything with a reference
  bond: { name: Bond, value: { min: 0, max: 3, display: pips } } # with a number, as dots
  home: { name: Home }
```

- `values`: `default` (what a new character has, 0 if missing), `min` / `max` (a number, or the sheet's other values in braces, `'{{self.values.<id>}}'` or with [arithmetic](09-syntax.md#variables), `'{{self.values.might * 2}}'`: the value falls when that one does), `from` (a value **made of others**, `'{{self.values.maxHealth - self.values.health}}'`: never set by hand nor by effects, it follows them after every change, within its own `min` / `max`; only the sheet's values, no dice, no `default`, never made of itself; an effect on it changes nothing and the journal says so), `display` (how it's drawn: `number`, the default; `of`, the number and its max; `bar`; `boxes`; `pips`, round dots; `dial`, a round clock; `levels`, a name from `levels`; all but `number` and `levels` need a `max`, and draw as many boxes, dots or segments as it; `of` and `bar` may take an `of` instead), `of` (what `of` and `bar` draw it against when that isn't its max, a number or the sheet's values in braces, `of: '{{self.values.capacity}}'`: never a bound, the value goes past it, and shares in `tones` are shares of it), `levels` (with `display: levels`: names in order, each an id or `{ id, name, description }`, the first for the value's `min` or 0; beyond them the number shows), `tones` (a colour from a value up, `{ 0: danger, 2: warning, 4: good }`, or from a share of its max as it is now, `{ 0: danger, 50%: warning, 75%: good }` (it needs a `max`), among `good`, `warning`, `danger` and `accent`; a threshold may also be the sheet's values in braces, `'{{self.values.capacity}}': danger`), `group` (one of `groups`, each a card). `track: true`, the older form, is `display: boxes`. How a value is shown changes nothing of how it plays. See [Sheet](../systems/07-sheet.md#how-values-are-shown).
- `conditions`: `blocks` lists what the whole party can't do while any of its characters has it: an action (`actions.<id>`), `travel.move`, or a way of travelling (`modes.<id>`). The trip says who has it. `when` makes it **hold by itself** while a [condition](08-conditions.md) does, never set or cleared by hand nor by effects (an effect on it changes nothing, and the journal says so): it reads the character as `self.*` (`self.values.dread: { gte: 6 }`, `self.conditions: wounded`, `self.tags`) and, on a trip, the world as tables see it (`trip.mode: boat`, `time.season: winter`, `place.terrain`…). It's settled after every change (an effect, a result, a hand edit on the card, a step of the trip, a world turn); one that reads the world follows it on the trip, and stays as last seen away from one (the Characters app). A state is a condition with `when`; something that happens once (a line, an effect) is an [action](10-actions-and-steps.md). `leaves: true` takes a copy of a [template](#bestiaries) off those present as soon as it has the condition (by itself or by an effect); it does nothing to the party's own characters.
- `items` (optional): what every item has and where it goes. `fields`: numbers each item has, like values (`default`, `min`, `max`, `display`, `levels`, `tones`), and `spent: true` for one that runs out (reaching its `min` uses one item up: the count goes down and the next starts again; it needs a `min`); never named like an item's own keys (`name`, `tags`, `count`, `place`…). `places`: where items may be, each with `tags` (what `fits` reads), `room` (a number, or the sheet's values in braces) and `over` (as the sheet's, for this place). `size`: the field that fills a place's room (× how many; missing: one per item). `over`: whether places (and `room`) take more than their room: `allow` (the default: the room is only shown) or `refuse` (nothing goes in that hasn't room left: a move there is refused, and what an effect gives goes to the first place it fits with room, then a container with room, then a place that allows more; what still has none is as `full` says); a room that shrinks later leaves what's there. `room`: how much a character carries in all (a number, or the sheet's values in braces, `room: '{{self.values.capacity * 2}}'`), measured by `size` over every item, inside containers and in no place too; refused past it with `over: refuse`, while each place keeps its own `over`. `full`: what becomes of what an effect gives with no room left for it, once as many as fit went in: `leave` (the default: left behind, with a journal line) or `ask` (it waits on the character's card in no place, and a trip waits until the player drops something or moves it to a place); a card never adds by hand what has no room. A gain of the party's goes to characters with room first, and to one whose sheet asks when nobody has any. `share`: how what the party spends or gains of an item is shared out among characters of this sheet: `even` (the default: taken from whoever carries most, given to whoever carries least, one at a time) or `order` (the first character first); a trip's **Ask who gives** lets the player change it each time. `start`: what a new character of this sheet carries, from the system's catalogues (`start: { ration: 2 }`); on the party's own sheet, what a new trip starts with. A value can be **made of the items**: `from: { sum: items.slots }`, `{ max: items.armour, where: … }`, `{ min: … }`, `{ count: items }` (how many), `where` a condition on each item (`item.id`, `item.tags`, `item.place`, `item.within`, the place at the top, `item.inside`, in a container, its fields) and its place (`place.tags`). Tables read a character's items as `characters.<id>.items.<item>.count` (and the first one's fields, `….items.torch.uses`), `….items.tags` (every tag) `….places.<place>.used` / `.room` and `….carried.used` / `.room` (all it carries, against `room`); effects change them, `acting.items.torch: -1`, `party.members.items.torch.uses: -1`. See [Items](../systems/08-items.md) and the [catalogues](#item-catalogues).
- `relations`: what a character may be tied to, by reference (`character:mara`, `poi:<id>`, `region:<name>`, `hex:<col,row>`, a note…), each relation of one of these kinds, with a number when the kind has bounds (`value: { min, max }`, drawn with its own `display` and `tones`, all but `levels`). A trip reads them where the party is: `place.related` (who is tied to this cell, its region or a place in it) and `place.relations.<kind>`; Map draws them as threads from the party (**Play → Show relations**).
- Conditions and tables read each character as `characters.<id>.…`, the one acting now as `acting.…`, and the party's ids as `party.members`; effects change them (`party.members.values.health: 1`, `acting.conditions.wounded: true`). See [What tables see](04-what-tables-see.md#characters).
- Translated like any other kind, keyed `sheet/<id>`, by value, group, condition and relation (`values: { health: { name: Salud } }`), and levels by id (`values: { harm: { levels: { unhurt: Ileso } } }`).
- **The party's own sheet** (`partySheet:` in its [system](#systems)) is a sheet like this one for the party itself: what belongs to the whole party (morale, fatigue, hirelings…), in every trip whoever travels, while characters join and leave. Tables read it as `party.values.<id>`, `party.conditions` and `party.tags`; effects change it (`party.values.morale: -1`, `party.conditions.shaken: true`), within its bounds; a new trip starts with each value's `default`. What the party carries is a value of it (`party.values.food`), or items: `party.items.<item>` are its own and its characters' together (`party.items.ration.count`, every item of the catalogues there from 0), an effect on them (`party.items.ration: -3`) takes from its own first, then from the characters by their sheet's `share`, and a gain goes to the characters so (to its own when it has none); its conditions' `blocks` stop the whole party. A party stat can be one of its values (`stats: { morale: { from: { party: morale } } }`): the stat is that value, takes its bounds, and effects on `party.stats.morale` change the sheet. The trip shows its card above the characters.

## Item catalogues

What a system's characters may carry (`items:` in its [system](#systems), a list: as many catalogues as it wants). On a character's card, **Add an item** offers them by name; effects give an item from them when a character has none yet. What every item has (its fields) and where it goes (places) are the [sheet](#sheets)'s `items:`.

```yaml
kind: items
id: gear
name: Gear
items:
  rope: { name: Rope, description: Fifty feet of hemp., tags: [climbing] }
  torch: { name: Torch, uses: 3, tags: [light] } # a number for a field of the sheet
  mail: { name: Mail shirt, slots: 2, armour: 2, fits: { place.tags: worn } } # only worn
  backpack: { name: Backpack, fits: { place.tags: back }, holds: { room: 6, tags: [pack] } }
```

- Each item, by an id effects and tables name it with (never `tags`, no dots): `name`, `description`, `tags`, a number for each field the sheet declares (missing: the field's `default`; a field the sheet doesn't declare is a warning), `fits` (a [condition](08-conditions.md) on the place, `place.id` and `place.tags`; missing: any place) and `holds` (a container: `room`, how much fits inside, `tags`, what it is as a place, and `over`, `allow` or `refuse` as a sheet's place; missing: the sheet's).
- A character keeps a copy of what an item had when it was taken, so it reads the same whatever packs are loaded; an item written by hand has a name, how many, its tags and the sheet's defaults.
- Two catalogues with the same id: the first listed wins.
- Translated keyed `items/<id>`, by item (`items: { rope: { name: Cuerda } }`).
- How it plays, with an example to follow: [Items](../systems/08-items.md).

## Bestiaries

Templates of characters that a system's results make copies of (`bestiary:` in its [system](#systems), a list: as many as it wants): creatures and NPC types (a guard, a bandit) alike. An effect `present.<template>: 3` makes three copies where the party is, each a character of the template's sheet rolling its own numbers; a trip keeps them as **those present**, beside the party, until they leave. Unique NPCs aren't templates: they're characters of the roster.

```yaml
kind: bestiary
id: beasts
name: Beasts
sheet: sheet.beast # every template's sheet, unless one names its own
behind: leave # copies the party leaves behind are gone (missing: they stay)
templates:
  wolf:
    name: Wolf
    tags: [beast, pack]
    values: { health: '{{1d4+1}}', bite: 1 } # each copy rolls its own
    token: { icon: 'game:wolf-head', kind: enemy } # how it's drawn on a map
  leader:
    like: wolf # a variant: the wolf's, and what changes
    name: Pack leader
    tags: [leader]
    values: { health: '{{2d4+2}}' }
  bandit:
    sheet: sheet.companion # an NPC type on the characters' own sheet
    name: Bandit
    names: table.names # each copy named from a table (missing: Bandit, Bandit 2 and so on)
    items: { knife: 1, ration: '{{1d2}}' } # from the system's catalogues
    conditions: [outlaw]
    behind: stay # this one stays where it was met
```

- Each template, by an id effects and tables name it with (never `all`, `count`, `tags` or `ids`, no dots): `name`, `description`, `sheet` (a [sheet](#sheets) of this pack or a dependency's; missing: the bestiary's), `values` (numbers, or `{{…}}` rolled for each copy; missing: the sheet's `default`), `conditions` and `tags` it starts with, `cards`, `items` (how many of each, from the system's [catalogues](#item-catalogues), numbers or rolls; missing: the sheet's `items.start`), `names` (a table, oracle or generator rolled for each copy's name), `token` (how it's drawn on a map: `icon`, `kind`, one of `pc`, `npc` or `enemy`, and `color`), `behind` and `like`.
- `like`: a variant of another template of this bestiary: it takes that one's sheet, values, items, texts and token, and adds its tags, conditions and cards; what it writes wins. A template that's a variant of itself is refused.
- `behind`: what becomes of copies once the party leaves their place: `stay` (the default: still there, and present again when the party comes back) or `leave` (gone, with a line in the journal, so the next visit rolls its encounter afresh). The bestiary's, unless a template says otherwise. A copy the player drags to another place on a map isn't left behind: it stays there.
- A copy is made once: later changes to the template don't touch copies already made. Its id is the template's (`wolf`, `wolf-2`, `wolf-3`), its name the template's, numbered (_Wolf 2_), or rolled on `names`.
- A [sheet](#sheets) condition with `leaves: true` takes a copy off those present as soon as it has it: one that holds by itself (`down` with `when: { self.values.health: { lte: 0 } }`) or one an effect sets (`routed`).
- Tables, conditions and effects reach them as `present.*` and `characters.<id>.*`: [What tables see](04-what-tables-see.md#those-present-present), [Syntax](09-syntax.md#changing-the-party-effects).
- A template whose sheet isn't found is a problem; values and conditions its sheet doesn't declare, and items no catalogue of the system has, are warnings.
- A pack a map or campaign adds brings its bestiaries too, after the system's own.
- Translated keyed `bestiary/<id>`, by template (`templates: { wolf: { name: Lobo } }`).

## Places

Templates of points of interest that a system's results make on the party's cell (`places:` in its [system](#systems), a list: as many as it wants): ruins, shrines, camps, lairs. An effect `place.pois.<place>: 1` makes one there; on a map in the Map app it's written into the map as a point of interest that remembers what it was made from (**Made from**), with the template's tags added to its cell, as discovery writes what it finds; in a trip without a map (the Travel app) the journal notes it.

```yaml
kind: places
id: sites
name: Sites
places:
  ruins:
    name: Ruins
    description: '{{result}}' # the text of the result that makes it
    icon: game:castle-ruins # an icon of the map's
    tags: [ruins] # given to its cell: rules read them (place.tags: ruins)
  camp:
    name: Camp
    description: A camp of {{1d6+2}} travellers # rolled as it's made
    icon: game:campfire
    tags: [camp]
    fields: { fires: '{{1d3}}', kind: travellers } # the point of interest's fields
```

- Each place, by an id effects name it with (no dots): `name` (required), `description`, `icon` (a map icon's id, `game:<name>`, as Map's icon picker lists them), `tags` and `fields`.
- `description` and the `fields`' values may hold `{{…}}`: read from the result that makes the place (`{{result}}`, its `set` values, the trip's facts) and rolled (`{{1d6}}`), once, as it's made.
- `tags` go on the **cell**, not the point of interest: they're what conditions read (`place.tags: shrine`), as discovery's `set: { tags }`.
- A place is made once: later changes to its template don't touch places already made, and on the map it's yours to edit or remove like any other point of interest.
- Results make them with an effect: an entry's `effects: { place.pois.ruins: 1 }`, an action's step, a deck's card, or **discovery**'s contents (`discover.contents`), whose entry then makes the place instead of a plain point of interest from its text ([Discovering the map](../oracle/07-connecting.md#7-discovering-the-map)). The number says how many (`2`, `'{{1d2}}'`); a place nobody's catalogue has makes nothing, and the journal says so.
- A pack a map or campaign adds brings its catalogues of places too, after the system's own.
- Translated keyed `places/<id>`, by place (`places: { ruins: { name: Ruinas } }`).

## Factions

The powers of a system's world (`factions:` in its [system](#systems)): each a character of a [sheet](#sheets) (its values, conditions and relations) holding cells of a map, taking a turn on every **world turn**. In Map's World view they're brought onto a map, drawn and played ([Factions](../map/12-world.md#factions)).

```yaml
kind: factions
id: default
name: The powers of the realm
sheet: sheet.faction # the kind: sheet every faction is made with (this pack's, or pack/kind.id)
turn: table.faction-turn # what each one rolls on its turn: a table, oracle, generator or deck
every: 7 # days of the world clock between turns (absent or 0: only by hand)
factions:
  the-crown:
    name: The Crown
    color: '#c9a227' # its land on the map
    values: { strength: 4 } # starting values (the rest: the sheet's defaults)
    # Where it starts: the regions on any map that has them; the cells only on this map of
    # the pack (its path in it, one of its system's `maps:`).
    territory: { regions: [The Royal Vale], map: maps/realm.otd.json, hexes: ['12,4'] }
  the-rebels:
    name: The Rebels
    color: '#8b1e1e'
    turn: core/table.faction-turn # a turn table of its own (here, Core's)
```

- A **turn table** sees the faction whose turn it is as `faction.*` (`faction.values.strength`, `faction.territory`: how many cells it holds, `faction.id`) and every faction as `factions.<id>.*`, besides the world clock's facts. Its entries' **effects** change the world: `faction.values.strength: 1`, `faction.conditions.at-war: true`, `factions.the-rebels.values.strength: -1` (another faction), `faction.territory: 1` (a cell more, from its border: nobody's land first, then a neighbour's) or `-1`, `world.clocks.the-siege: 1` (a [progress clock](#progress-clocks), by its id).
- Everywhere else (trips, hand rolls, discovery), `factions.<id>.*` and `place.faction` (the id of the faction that holds the cell) read them: [What tables see](04-what-tables-see.md). On a map with them, a trip's results change them too, and tick the world clock's progress clocks: `factions.fort-keld.values.reputation: 1`, `world.clocks.the-wyrm-wakes: 1` (the Grey Marches' toll and haunted lights).
- Translated keyed `factions/<id>`, by faction (`factions: { the-crown: { name: La Corona } }`). Core's `core/table.faction-turn` is a turn table for any game (it grows, holds, schemes or loses ground).

## Progress clocks

The progress clocks a system's world starts with (`clocks:` in its [system](#systems)): segments that fill as something advances (a threat, a plan, a season of raids), each with what becomes of it once full. What happens when one fills is the [world's rules'](#the-world-s-rules). They come with the world clock when it starts (Map's World panel, the Campaign app) ([Progress clocks](../map/12-world.md#progress-clocks)); trips, tables and faction turns fill them with effects, and conditions read them.

```yaml
kind: clocks
id: default
name: Threats of the realm
clocks:
  the-siege: # its id: how rules name it (world.clocks.the-siege)
    name: The siege of the capital
    description: The rebels dig in around the walls.
    segments: 8 # any number from 1
    filled: 2 # already filled when the world clock starts (absent: none)
    then: reset # once full: keep (the default), it stays full; reset, it starts over; remove, it goes away
  the-reprisals:
    name: Reprisals
    segments: 4
```

- **Filled by effects**, anywhere effects go: a trip's results and actions, a table rolled by hand on a map, a faction's turn, a world reaction. `world.clocks.the-siege: 1` fills a segment, `-2` empties two, `'=0'` sets it (empty), `'{{1d3}}'` rolls. **Read by conditions** and tables: `world.clocks.the-siege: { gte: 8 }` (full), `{{world.clocks.the-siege}}` in a text.
- Rules name a declared clock by **its id**, whatever the player renames it on the map; a clock made by hand on the map is named by its name in lowercase with dashes (_The Wyrm wakes_ is `the-wyrm-wakes`).
- **When it fills**, once, it's the moment `world.clocks.<id>.full`: the world's reactions on it happen (words on the timeline, a table rolled, effects on clocks and factions), then it stays full, starts over empty or goes away, as `then` says. The trip going on hears it too ([Moments of the world](../oracle/07-connecting.md#5-your-own-travel-system)).
- Translated keyed `clocks/<id>`, by clock (`clocks: { the-siege: { name: El asedio } }`). Core's `core/clocks.threat` is a clock for any game: the threat grows and starts over once full; Core's `core/world.threat` makes it strike with one of Core's twists.
- Pack format 8 wrote what happens when it fills in the clock (`onFull`); since format 9 it's a world reaction.

## The world's rules

What a system's world does by itself (`world:` in its [system](#systems)), with or without a trip going on: reactions written as a trip's actions are, each with the moments it comes at, its conditions and its steps. Played wherever the world moves (Map's World panel, the Campaign app, time moving under a trip). In the Systems app: its **World** tab ([World](../systems/11-world.md)). Every moment and the order they are played in: [What reacts to what](11-what-reacts-to-what.md).

```yaml
kind: world
id: default
name: How the realm moves
reactions:
  the-capital-falls: # its id: how another reaction brings it (world.reactions.the-capital-falls)
    name: The capital falls
    on: world.clocks.the-siege.full # as a clock fills
    do:
      - say: The capital falls. # a line on the timeline
      - roll: table.the-fall # a table, oracle, generator or deck: its text on the timeline, its effects applied
      - effects: { factions.the-crown.territory: -1, world.clocks.the-reprisals: 2 }
  news:
    on: world.turn # after every world turn
    do:
      - say: 'News of the realm (the siege: {{world.clocks.the-siege}}).'
  the-crown-breaks:
    on: { when: { factions.the-crown.values.strength: { lte: 0 } } } # once, as it turns true
    unless: { world.events: truce-day } # only while this doesn't hold (`when:` too)
    do:
      - effects: { factions.the-rebels.values.strength: 1 }
      - do: world.turn # a world turn at once
        when: { factions.the-rebels.conditions: at-war } # this step only while this holds
      - do: world.reactions.news # another reaction (with its own conditions)
  the-bridge:
    on: { when: { factions.the-crown.values.strength: { lte: 0 } } }
    params: # what it may ask the player
      who:
        name: Who takes the bridge?
        choices: [{ id: rebels, name: The Rebels }, { id: nobody, name: Nobody }]
    do:
      - pause: The bridge stands empty. # the world waits for Go on (or `pause: true`)
      - ask: params.who # the world waits for a choice
      - when: { params.who: rebels } # later steps read the answer
        effects: { factions.the-rebels.territory: 1 }
```

- **Moments** (`on:`, one or a list): `world.turn` (after every world turn), `world.clocks.<id>.full` (a clock filling, by its declared id or its name as an id), or a condition `{ when, unless }` on what the world shows (`world.clocks.*`, `world.events`, `factions.<id>.*`, `time.*`), coming once as it turns true and again only after it stopped holding.
- **Steps** (`do:`, in order, each one thing, each with its own `when` / `unless`): `say` (with `{{…}}`), `roll`, `effects` (clocks and factions; a faction's `territory` changes land on the map being played), `do` (`world.reactions.<id>` or `world.turn`), `pause` (`true` or a text: the world waits for **Go on**) and `ask` (`params.<id>`, one of the reaction's `params`, each with `name`, `description` and `choices` as an action's, without a `default`: the world waits for a choice, and later steps read it as `params.<id>`). A trip's steps (`time`, `travel.*`, `set`, `wait`, `with`) are refused: the world has no party.
- **Waiting**: a `pause` or an `ask` stops the world; the campaign keeps what waits and what was left (`waiting`), and nothing moves the world until the player answers; then what was left goes on, in order (the reaction's other steps, the moment's other reactions, a full clock's `then`, the turns that came due, the days still to move). A trip that skips pauses passes the world's too.
- **Order**: after anything that changes the world, its moments in the order they happened (each one's reactions in the order declared), then the conditions, checked again until nothing new turns true; moving time over several days looks at each day's start. The campaign keeps which conditions held (a campaign that kept nothing takes what holds as seen).
- **Loops**: reactions bringing each other through named moments or `do:` (a reaction on `world.turn` doing `world.turn`, two clocks' reactions filling each other) are refused when the pack loads; those that conditions make stop after 10 in a row, with a line on the timeline.
- Translated keyed `world/<id>`, by reaction, its steps by their `id` (`reactions: { the-capital-falls: { name: Cae la capital, do: { falls: { say: Cae la capital. } } } }`, with `id: falls` on the step: `say` and `pause`), its questions by theirs (`params: { who: { name: ¿Quién toma el puente?, choices: { rebels: Los rebeldes } } }`).

## Systems

A system names, in one place, what a game played with it uses: its travel rules, bindings, calendar, weather models, land models, sheets, item catalogues, bestiaries, places, factions, progress clocks and world rules, and the packs whose tables, oracles and decks it brings along. A campaign is played with one system, shared by its maps and trips: chosen for a Map map's campaign in **Map settings → Campaign → System** (its trips, its World panel's calendar and its Oracle panel use what the system brings), and by a trip in the Travel app on the system's page (a trip keeps the system it started with); both list them by name.

```yaml
kind: system
id: default
name: The Grey Marches
description: A haunted frontier, travelled on foot, on horseback or by cart.
travel: travel-rules.default # its travel rules (kind: travel-rules, id: default)
bindings: bindings.default # its bindings
calendar: calendar.marcher-reckoning # its calendar
sheet: sheet.companion # its characters' sheet
partySheet: sheet.company # the party's own sheet
factions: factions.default # the powers of its world
clocks: clocks.default # the progress clocks its world starts with
world: world.default # what its world does by itself
items: [items.gear] # what its characters may carry (item catalogues)
bestiary: [bestiary.marches] # the templates its results make copies of
places: [places.default] # the places its results make on the party's cell
weather: [weather.sky] # the weather models its bindings may use
land: [land.default] # its land models: discovery's and Generate's
packs: [core] # packs whose tables it brings
maps: [maps/grey-marches.otd.json] # example maps, files of this pack
```

- Every part is optional. Without `travel`, the system doesn't travel (Play and Travel say so; its world, oracle and factions still play), and any system can name Core's, `travel: core/travel-rules.default`, the **Generic rules** (with `calendar: core/calendar.default`, whose parts of the day they name, and `bindings: core/bindings.default` with `weather: [core/weather.default]`, which roll their weather check); without `bindings`, no table answers its checks (they're only written in the journal, and stop the trip only with `pause: true`) and the party has no stats; without `calendar`, the default one; without `weather`, its bindings can't name a weather model; without `land`, it has no land model to discover or generate with; without `clocks`, its world starts with no progress clocks (they can still be made by hand); without `partySheet`, the party has no sheet of its own; without `sheet`, its party is played as a whole; without `bestiary`, its results make no copies of templates; without `places`, they make no places from templates. Core's own system, `core`, is the one a map plays when it chooses none: [the Generic rules](../packs/01-core.md#the-generic-rules).
- Each part is a definition of this pack, by its kind and id (`travel: travel-rules.default`), or of a pack it depends on (`travel: core/travel-rules.slow`, with `core` in its `dependencies`). `packs` lists dependencies too; the system's own pack is always included.
- **Its id:** a system with `id: default` is chosen by its pack's id (`grey-marches`), any other by pack and id (`grey-marches/winter`). A pack may declare several, e.g. the same land in summer and in winter with other travel rules.
- `name` and `description` are what players read (the name is the pack's when missing); translate them in `locales/<language>/` keyed `system/<id>`, like the other kinds.
- `maps` lists **example maps** to play the system on: map files (`.otd.json`, what Map's **Save** writes) kept in this pack, by their path in it (usually a `maps/` folder). Map offers them under **Maps → Example maps**, and the system's **Overview** in the Systems app adds and removes them. Example maps whose files name the same campaign (`campaign` in the file) open in one campaign, sharing its world clock and factions: the Grey Marches' two maps. Map files in a pack aren't definitions: nothing else reads them.
- **Older packs** that have travel rules but no `kind: system` keep working: they're a system named after the pack, with its travel rules, bindings and calendar, and every pack's weather and land models. Once a pack declares a system, only what it declares counts.
- A system travels as a whole: the Systems app's **Overview → Export as .zip** writes its pack with every pack it needs (the ones in `packs`, those its parts come from and their dependencies), and **Import a system (.zip)…** reads it back ([Taking it elsewhere](../systems/04-overview.md#taking-it-elsewhere)).

The Systems app writes one for every new system, edits it in the system's **Overview**, and declares an older pack's (**Declare it**). The Grey Marches declare theirs in `system.yaml`.

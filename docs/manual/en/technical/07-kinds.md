# Kinds of definition

A pack is a folder of YAML (or JSON) files. Each file holds one or more **definitions**, separated by a line with `---`, and every definition says what it is with `kind:`. This page lists every kind, what it's for, who reads it and what it looks like. Each one is validated when the pack loads: a mistake shows in the Oracle app's **Problems**, with its file and line.

The kinds are a **fixed set**: each one is read by an engine that knows it, and a pack can't add kinds of its own (one the apps don't know is kept but nothing reads it). What a pack chooses freely is the content: its own tables, calendar, weather, roll modes, travel rules and stats, with the names and rules of its game.

| Kind           | What it is                                                              | Read by                                                                    | How many per pack |
| -------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------- |
| `table`        | A list of results picked by dice or weight                              | The Oracle; trips and discovery, when a binding names it                   | Any               |
| `oracle`       | A table whose answers depend on a question (an input)                   | The Oracle; trips and discovery, when a binding names it                   | Any               |
| `generator`    | Several rolls joined in one text                                        | The Oracle; trips and discovery, when a binding names it                   | Any               |
| `deck`         | Cards drawn without putting them back                                   | The Oracle; trips and discovery, when a binding names it (it draws a card) | Any               |
| `roll-modes`   | Ways of rolling a table several times and keeping one total             | The Oracle (every roll)                                                    | One               |
| `travel-rules` | How a trip works: speeds, terrains, supplies, actions, checks           | Hexmapper Play, the Travel app                                             | One per system    |
| `bindings`     | Which table answers each check of a trip, the party's stats             | Hexmapper Play, the Travel app                                             | One per system    |
| `calendar`     | Months, seasons, weekdays, moons and holidays                           | Trips, the Hexmapper's World panel                                         | One per system    |
| `weather`      | Weather with memory: today's follows from yesterday's, per season       | Trips (a binding with `weather:`)                                          | Any               |
| `sheet`        | What each of the party's characters has: values, conditions             | Trips (the party's characters), the Systems app                            | One per system    |
| `factions`     | The powers of its world: their land and their world turns               | The Hexmapper's World view, the Systems app                                | One per system    |
| `clocks`       | The progress clocks its world starts with, and what each does when full | The Hexmapper's World view, the Systems app                                | One per system    |
| `system`       | A game system: which of the above it uses, and which packs              | Hexmapper Play and World, the Travel app                                   | Any               |

**Who reads what.** Tables, oracles, generators and decks are all things you can roll, and anything that rolls can roll any of them: the Oracle by hand, a trip's check or discovery when a binding names it (`resolve: deck.omens` draws a card). **How many:** one of a kind that describes the whole system (its roll modes, travel rules, bindings, calendar, sheet: a system has one way of doing each), any number of the rest. A pack with several [systems](#systems) has one set for each, told apart by their ids. Weather models are many because a system may have several climates (the coast and the mountains, each bound to its own check).

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

Entries have a `range` of totals (or a `weight`), a `result` text, and optionally `when` / `unless` (conditions), `set` (values the result gives), `table` / `generator` (roll another one), `once` / `maxOccurrences` (limits per session), `effects` (changes to the party's values) and `pause` (stop the trip when it comes up). The table may also have `clamp`, `onExhausted`, `modes`, `modeWhen` and `modeUnless`. Everything about them: [Editing](../oracle/04-editing.md) and [YAML](../oracle/06-yaml.md).

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

**What other tables see:** each field by its name, inside the generator (`{{name}}`), and from a generator that rolls this one, as `{{npc.name}}`.

## Decks

Cards drawn without replacement until the deck is reshuffled (`reshuffle: when-empty`, `manual` or `after-draw`). A card can come in copies (`count`), roll a table, set values, have `effects` and `pause`, like an entry.

```yaml
kind: deck
id: omens
reshuffle: when-empty # when-empty, manual or after-draw
cards:
  - { id: crows, result: Crows follow you all day, count: 3 } # three copies
  - { id: stranger, result: 'A stranger on the road: {{result}}', table: generator.npc }
  - { id: cache, result: 'A hunter’s cache', effects: { party.resources.food: 2 } }
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

- `modes: [advantage, disadvantage]`: offered when rolling by hand (the choice next to **Roll**).
- `modeWhen: { advantage: { explorer: { gte: 1 } } }`: used by itself when the condition holds, also on a trip. A mode can be in `modeWhen` without being in `modes`.
- `modeUnless: { disadvantage: { hex.tags: lit } }`: not used by itself when the condition holds. With `modeWhen` for the same mode, it applies when the first holds and this one doesn't (`modeWhen: { disadvantage: { timeOfDay: night } }` + this: at night, except where it's lit); alone, the mode is used always but then (a cursed table rolled with disadvantage `unless: { blessed: true }`).

When several apply (one chosen by hand plus some on their own), the ones that cancel each other drop out and the first of the rest is used (the one chosen by hand, then `modeWhen`'s order, then `modeUnless`'). Modes are referenced like tables: the pack's own first, then its dependencies' (the Grey Marches use Core's `advantage`), or by full id (`core/advantage`). Core declares advantage and disadvantage and the Grey Marches add _Carefully_ (three rolls, the middle one). The old `advantage: true` does nothing now and warns.

**What tables see:** nothing: modes aren't values; a table uses them through `modes`, `modeWhen` and `modeUnless`.

## Travel rules

How a trip works: when trips start, the scale of their speeds (`hoursPerDay`), how the trip goes on by itself (`travel.onward`: an action and its parameters) and what the party does when it can't march (`travel.halt`), terrains and their speeds and whether they can be entered (`passable`: `false`, or `{ when, unless }` for a pass closed in winter or a lake crossed on the ice), water (the same), roads and rivers, ways of travelling (km per day, where they can go: `through`, and when they can be chosen: `when` / `unless`), supplies (with their `min` / `max`), weather that slows you down, its **values of the day** (`values`: `lost` with what it `blocks`: `travel.move`, one of its actions (`actions.forage`) or `modes.<id>`), the party's **actions** (only the ones it declares, all alike: march, camp, rest, foraging…; `when` / `unless`, `oncePerDay`, `params` (what is chosen when taking it, read as `{{params.<id>}}`), `on:` for those the system takes by itself at a moment or after another action (or several: a list), and their steps, `do`: `time`, `travel.move`, `travel.speed`, `travel.advance`, `effects`, `set`, `do` (with `with:`), `roll`) and the **checks**: what is rolled at a clock or a part of the calendar's day (the morning), on entering a hex, at the end of the day, with an action (camping, for example) or only by a step's `roll:`, and when (`when` / `unless`); a check may have `effects` of its own and `pause: true` (stop after it until **Continue**). A pack with travel rules is a **system** you can play in the Hexmapper (Play → With rules) and the Travel app. In detail: [Connecting tables to maps and trips](../oracle/07-connecting.md) and the Systems app's [Rules](../systems/05-rules.md) and [Checks](../systems/06-checks.md) tabs.

Every key, in a small system (the comments say what each does):

```yaml
kind: travel-rules
id: default
travel:
  hoursPerDay: 8 # the hours a way's kmPerDay is marched in (the speed's scale)
  hexKm: 10 # km a hex (the scale)
  start: '06:00' # when a new trip starts (a clock or a part of the day; empty: midnight)
  onward: { do: actions.march, with: { until: destination } } # how the trip goes on by itself
  halt: { at: '20:00', do: actions.camp } # from then on, a party that can't march camps by itself
modes: # ways of travelling
  foot: { name: On foot, kmPerDay: 24 }
  horse: { name: On horseback, kmPerDay: 40, unless: { trip.weather: snow } }
  boat:
    {
      kmPerDay: 50,
      through: { hex.water: true },
      when: { any: [{ hex.water: true }, { hex.tags: ferry }] },
    }
terrains:
  plains: { multiplier: 1 }
  forest: { multiplier: 0.5 }
  peaks: { multiplier: 0.25, passable: { when: { time.season: summer } } }
  lake: { multiplier: 0.5, passable: { when: { time.month: [1, 12] } } } # frozen in deep winter
defaultTerrain: { multiplier: 1 } # speed × for terrains not listed
water: { passable: false } # water hexes without a rule of their own
edges: { road: { multiplier: 1.5 }, river: { multiplier: 1 } } # along a road or river
resources: # supplies, with their bounds (a new trip starts with 6, within them)
  food: { name: Rations, min: 0 }
weather: { storm: { speed: 0 }, heavy-rain: { speed: 0.5 } }
values: # values of the day tables and actions set
  lost: { name: Lost, blocks: [travel.move] }
  snowbound: { blocks: [modes.horse] }
  torchlit: { name: By torchlight }
actions:
  camp:
    when: { party.resources.food: { gte: 1 } } # otherwise the halt passes without it
    do:
      - { time: '06:00' }
      - { unless: { trip.below: food }, effects: { party.stats.fatigue: -1 } }
  rest:
    when: { time.hour: { gte: 6, lt: 20 } }
    do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }]
  march: # moves while it holds (by day for 8 h, or by torchlight), as far as chosen
    params:
      until: { name: How far, choices: [destination, hex, { id: 3, name: Three hexes }] }
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
  eat: { on: time.day-end, do: [{ effects: { party.resources.food: -1 } }] } # not a button
checks:
  - { event: WEATHER_CHECK_REQUIRED, at: '06:00' }
  - {
      event: NAVIGATION_CHECK_REQUIRED,
      name: Getting lost,
      at: '06:00',
      unless: { trip.edges: road },
    }
  - {
      event: ENCOUNTER_CHECK_REQUIRED,
      at: [trip.hex-enter, actions.rest],
      when: { danger: { gte: 2 } },
    }
  - { event: FORAGE_CHECK_REQUIRED, at: actions.forage }
  - {
      event: HUNGRY_DAY,
      at: time.day-end,
      when: { trip.below: food },
      effects: { party.stats.fatigue: 1 },
    }
  - { event: SHRINE_CHECK_REQUIRED, at: trip.hex-enter, when: { hex.tags: shrine }, pause: true }
```

A step does one thing: `time` (minutes, a clock, `'14:00'`, or a part of the calendar's day, `time.meal.luncheon`: until it next comes), `travel.move` (along the route while time passes and the action's `when` / `unless` hold: `destination`, `hex`, a number of hexes or a variable), `travel.speed` (the rest of today's moving), `travel.advance` (that many hexes along the route at once, a number or a variable), `travel.mode` (another way of travelling, if it can be chosen), `effects`, `set`, `do` (another action, with `with:` its parameters), `roll` (a check, or something of the Oracle: `table.<id>`…), `say` (a line in the journal), `pause` (`true` or a text: the trip waits for **Continue**), `ask` (one of the action's parameters, chosen by the player as the action goes) or `wait` (a condition, with `limit:` the most it waits); each step may have `when` / `unless`, and an `id` its translations name it by. Every step, with examples: [Actions and steps](10-actions-and-steps.md). An action's `params` each have `choices` (values, or `{ id, name, description }`) and maybe a `default` (else the first); a `with:` gives a choice or a variable (`'{{params.until}}'`). An action's `on:` is `trip.hex-enter`, `time.day-end`, a clock (`'06:00'`: as it strikes) or a part of the calendar's day (`time.meal.elevenses`: as it begins), while marching, waiting or asleep in camp (see [Divisions of the day](#calendars)), another action, `actions.camp`, or one of the system's progress clocks filling, `world.clocks.<id>.full` (or a list). `travel.start` and the halt's `at` take a clock or a part (`halt: { at: time.meal.supper, do: actions.camp }`). A check's `at:` takes the same moments (or a list); without `at`, only a step's `roll:` rolls it. The checks of one moment are decided one by one, in the list's order, each just before it's rolled: its `when` / `unless` see what the ones before it set (the weather, values of the day, `effects`); one that pauses holds the rest of its moment until the player goes on. Values of the day last until the day ends (`lasts: day`, the only choice for now).

**Nothing the system doesn't declare.** Without an action with a `travel.move` step, the party never moves along its route (a march without `when` moves whenever nothing else stops it: a value of the day, the weather, the way, day and night); without `onward`, the trip going on by itself only waits; without `halt`, a party that can't march just waits; without actions, there are none (no march, camp or rest of the engine's own); without `values`, there are none. What blocks `travel.move` blocks the actions that move too. A move a check stops on the way stays under way: going on (**Go on**) finishes it, then the steps after it. The **halt** (`travel.halt`): from its moment until the day ends, a party that isn't marching while the time moves on by itself (the world clock, a travel order while its way on can't be taken, **Wait to go on**) takes its action, once a day; when it can't (its `when` / `unless`, a value that blocks it), the journal says so and the time passes until the trip can go on.

Packs written for an older pack format aren't read (see [File formats](02-file-formats.md#packs)).

**What tables see:** the trip's facts (`terrain`, `edges`, `mode`, `day`, `season`, `weather`, `yesterday.<value>`…) and the party (`party.resources.food`, `party.stats.fatigue`): the full list is in [What tables see](04-what-tables-see.md).

## Bindings

The other half of a system: which table (`resolve:`) or weather model (`weather:`) answers each check, with extra `context`; the party's **stats** (name, description, starting value) that tables read (`{{party.stats.charisma}}`), and which of them come from its characters (`from`); the supplies its characters **carry** (`resources`); **reads**, names for the other values its tables read (`icon.guards`, `fordModifier`…); and **discovery** (which tables decide empty hexes). In detail: [Connecting tables to maps and trips](../oracle/07-connecting.md).

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
resources: # with characters, the food is what they carry between them (their rations)
  food: { carried: rations, share: even }
roles: # journey roles the player gives the characters (read as roles.<id>)
  guide: { name: Guide, description: Leads the way. }
reads: # names for other values its tables read (shown in the roll panel and on the map)
  danger: { name: Danger, description: How dangerous the hex is. }
  icon.guards: { name: Guards }
discover: # tables that decide empty hexes as the party travels
  terrain: { resolve: table.next-terrain }
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

**Carried supplies** (`resources`): with characters, the supply named (an id of the travel rules' `resources`) is what they carry in a value of their sheet (`carried: rations`): the trip shows their sum, its bounds are the sums of theirs, and whatever the trip spends or gains is shared out among them: `share: even` (the default: taken from whoever has most, given to whoever has least, one at a time) or `share: order` (the first character first). Without characters, the party keeps it as a whole.

**Journey roles** (`roles`): jobs the player gives the characters in a trip (lead the way, keep watch, forage…), each with a `name` and `description` for players. Checks, tables and actions read whoever holds one as `roles.<id>.…` (`roles.guide.values.pathfinding: { gte: 2 }`) and their effects reach them (`roles.lookout.values.health: -1`); with nobody in the role, what reads it doesn't hold and its effects change nothing.

**What tables see:** each stat by name (`{{party.stats.charisma}}`, `when: { party.stats.morale: { lte: 0 } }`) and the binding's `context` (`timeOfDay: night`).

## Calendars

The months of the year (with their days and seasons), weekdays, moons (cycle and phase) and holidays, and the year of day 1. Trips with that system date their journal with it, and tables see `month`, `year`, `weekday`, `moons.<moon>` (new, waxing, full, waning) and `holidays`. The Hexmapper's [World](../hexmapper/12-world.md) panel uses the calendar of the map's system. Without one, a plain calendar of days and four seasons is used (the Generic rules name Core's, `core/default`, which adds its parts of the day). In the Systems app, a system's **Calendar** tab edits it with a form (renaming a month carries its holidays and translations along).

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

**What tables see:** `{{time.month}}` (the month's id), `{{time.year}}`, `{{time.weekday}}`, each moon's phase as `moons.<moon>` (`when: { time.moons.pale: full }`) and today's holidays as a list (`when: { time.holidays: midsummer }`), plus `season` from the month. Ids, not names: conditions compare ids, and the journal shows the names.

**Divisions of the day** (`divisions`): the ways the calendar divides the day, as many as the system wants (meals, watches, bells, prayers…), none if it declares none. Each one is keyed by its id and has either `parts` (each with an `id`, a `from` and optionally `until`, `name`, `description` and `tags`) or `every` (hours: numbered parts of equal length from midnight, 1, 2, 3…). Numbered parts read as numbers (`time.watch: 2`), whether written with `every` or as `parts` all named by whole numbers (`id: '2'`): the Systems app's **Split into equal parts…** writes them that way. A part lasts until the next one of its division starts, in the order of the day whatever order they're written in (the last one until the first, past midnight); `until` ends it earlier, leaving a gap with none of the division's parts. Tags mean only what a system's rules make of them. An id can't be a name the moment already has (`day`, `hour`, `minute`, `season`, `year`, `month`, `weekday`, `moons`, `holidays`, `tags`…). The Hexmapper's [World](../hexmapper/12-world.md) panel moves time on to the next part of each division, or to a part chosen. Names are translated keyed by the ids (`divisions: { meal: { name: …, parts: { elevenses: { name: … } } } }`).

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

Weather with memory (a Markov chain): per season, for each kind of weather, how likely each kind is tomorrow, so rain sets in for days and storms blow over. Each kind of weather has a name and the values it gives the day (`set: { fordModifier: -1 }`), like a table's result. A trip uses one when a binding says `weather: <model>` instead of `resolve:`; today's weather becomes `weather` for later checks and the travel rules' speeds. In the Systems app, a system's **Weather** tab edits its models with a form: the kinds of weather, and per season a grid of weights from yesterday's weather to today's, with how often each kind comes up over many days.

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

The Hexmapper's world clock also rolls its own weather each day on the map system's model while no trip is going on ([The world clock](../hexmapper/12-world.md#moving-time-on)).

**What tables see:** `{{trip.weather}}`, the id of today's weather (`rain`), and each value its state sets, by name (`{{fordModifier}}`, `when: { fordImpossible: true }`); the day after, the same values as `yesterday.weather`, `yesterday.fordModifier`. There's no `{{trip.weather.value}}`: the weather is its id, and its values are values of the day like any table's `set`.

The Grey Marches use every kind: see [The Grey Marches](../packs/02-grey-marches.md#where-each-feature-is).

## Sheets

What each of the party's characters has, when a system plays them one by one (`sheet:` in its [system](#systems)). Trips then have a **Characters** section where you add them, choose who is acting and change their values; the party's stats and supplies can come from them ([bindings](#bindings): `from`, `resources`). PCs, companions, hirelings or enemies are all characters of a sheet.

```yaml
kind: sheet
id: companion
name: Companion
values: # numbers each character has, with the bounds the system gives them (none: no bound)
  survival: { name: Survival, default: 1, min: 0, max: 5, display: pips, group: skills } # 5 dots
  pathfinding: { name: Pathfinding, default: 0, min: 0, max: 3, group: skills }
  maxHealth: { name: Max health, default: 3, min: 1, max: 6, group: body }
  health: # another value as its bound; a bar, red at 0, amber at 1, green from 2
    {
      name: Health,
      default: 3,
      min: 0,
      max: '{{self.values.maxHealth}}',
      display: bar,
      tones: { 0: danger, 1: warning, 2: good },
      group: body,
    }
  rations: { name: Rations, default: 2, min: 0, max: 6, display: of } # 2 / 6
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
groups: # the cards values are shown in, in this order
  skills: { name: Skills }
  body: { name: Body }
conditions: # states a character has or not, and what the party can't do while someone has one
  wounded: { name: Wounded, blocks: [actions.forced-march] } # an action of the system
  sprained: { name: Sprained ankle, blocks: [travel.move] } # marching
  saddle-sore: { name: Saddle-sore, blocks: [modes.horse] } # a way of travelling
relations: # kinds of relation a character may hold to anything with a reference
  bond: { name: Bond, value: { min: 0, max: 3, display: pips } } # with a number, as dots
  home: { name: Home }
```

- `values`: `default` (what a new character has, 0 if missing), `min` / `max` (a number, or another value of the sheet as `'{{self.values.<id>}}'`: the value falls when that one does), `display` (how it's drawn: `number`, the default; `of`, the number and its max; `bar`; `boxes`; `pips`, round dots; `dial`, a round clock; `levels`, a name from `levels`; all but `number` and `levels` need a `max`, and draw as many boxes, dots or segments as it), `levels` (with `display: levels`: names in order, each an id or `{ id, name, description }`, the first for the value's `min` or 0; beyond them the number shows), `tones` (a colour from a value up, `{ 0: danger, 2: warning, 4: good }`, among `good`, `warning`, `danger` and `accent`), `group` (one of `groups`, each a card). `track: true`, the older form, is `display: boxes`. How a value is shown changes nothing of how it plays. See [Sheet](../systems/07-sheet.md#how-values-are-shown).
- `conditions`: `blocks` lists what the whole party can't do while any of its characters has it: an action (`actions.<id>`), `travel.move`, or a way of travelling (`modes.<id>`). The trip says who has it.
- `relations`: what a character may be tied to, by reference (`character:mara`, `poi:<id>`, `region:<name>`, `hex:<col,row>`, a note…), each relation of one of these kinds, with a number when the kind has bounds (`value: { min, max }`, drawn with its own `display` and `tones`, all but `levels`). A trip reads them where the party is: `hex.related` (who is tied to this hex, its region or a place in it) and `hex.relations.<kind>`; the Hexmapper draws them as threads from the party (**Play → Show relations**).
- Conditions and tables read each character as `characters.<id>.…`, the one acting now as `acting.…`, and the party's ids as `party.members`; effects change them (`party.members.values.health: 1`, `acting.conditions.wounded: true`). See [What tables see](04-what-tables-see.md#characters).
- Translated like any other kind, keyed `sheet/<id>`, by value, group, condition and relation (`values: { health: { name: Salud } }`), and levels by id (`values: { harm: { levels: { unhurt: Ileso } } }`).
- **The party's own sheet** (`partySheet:` in its [system](#systems)) is a sheet like this one for the party itself: what belongs to the whole party (morale, fatigue, hirelings…), in every trip whoever travels, while characters join and leave. Tables read it as `party.values.<id>`, `party.conditions` and `party.tags`; effects change it (`party.values.morale: -1`, `party.conditions.shaken: true`), within its bounds; its conditions' `blocks` stop the whole party. A party stat can be one of its values (`stats: { morale: { from: { party: morale } } }`): the stat is that value, takes its bounds, and effects on `party.stats.morale` change the sheet. The trip shows its card above the characters.

## Factions

The powers of a system's world (`factions:` in its [system](#systems)): each a character of a [sheet](#sheets) (its values, conditions and relations) holding hexes of a map, taking a turn on every **world turn**. In the Hexmapper's World view they're brought onto a map, drawn and played ([Factions](../hexmapper/12-world.md#factions)).

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
    # Where it starts: the regions on any map that has them; the hexes only on this map of
    # the pack (its path in it, one of its system's `maps:`).
    territory: { regions: [The Royal Vale], map: maps/realm.otd.json, hexes: ['12,4'] }
  the-rebels:
    name: The Rebels
    color: '#8b1e1e'
    turn: core/table.faction-turn # a turn table of its own (here, Core's)
```

- A **turn table** sees the faction whose turn it is as `faction.*` (`faction.values.strength`, `faction.territory`: how many hexes it holds, `faction.id`) and every faction as `factions.<id>.*`, besides the world clock's facts. Its entries' **effects** change the world: `faction.values.strength: 1`, `faction.conditions.at-war: true`, `factions.the-rebels.values.strength: -1` (another faction), `faction.territory: 1` (a hex more, from its border: nobody's land first, then a neighbour's) or `-1`, `world.clocks.the-siege: 1` (a [progress clock](#progress-clocks), by its id).
- Everywhere else (trips, hand rolls, discovery), `factions.<id>.*` and `hex.faction` (the id of the faction that holds the hex) read them: [What tables see](04-what-tables-see.md). On a map with them, a trip's results change them too, and tick the world clock's progress clocks: `factions.fort-keld.values.reputation: 1`, `world.clocks.the-wyrm-wakes: 1` (the Grey Marches' toll and haunted lights).
- Translated keyed `factions/<id>`, by faction (`factions: { the-crown: { name: La Corona } }`). Core's `core/table.faction-turn` is a turn table for any game (it grows, holds, schemes or loses ground).

## Progress clocks

The progress clocks a system's world starts with (`clocks:` in its [system](#systems)): segments that fill as something advances (a threat, a plan, a season of raids), each with what happens when it fills. In the Hexmapper they come with the world clock when it starts ([Progress clocks](../hexmapper/12-world.md#progress-clocks)); trips, tables and faction turns fill them with effects, and conditions read them.

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
    onFull: # what happens when it fills (all optional)
      description: The capital falls. # a line on the timeline, and a notice
      resolve: table.the-fall # a table, oracle, generator or deck rolled (this pack's, or pack/kind.id)
      effects: { factions.the-crown.territory: -1, world.clocks.the-reprisals: 2 }
      then: reset # keep (the default): it stays full; reset: it starts over; remove: it goes away
  the-reprisals:
    name: Reprisals
    segments: 4
```

- **Filled by effects**, anywhere effects go: a trip's results and actions, a table rolled by hand on a map, a faction's turn. `world.clocks.the-siege: 1` fills a segment, `-2` empties two, `'=0'` sets it (empty), `'{{1d3}}'` rolls. **Read by conditions** and tables: `world.clocks.the-siege: { gte: 8 }` (full), `{{world.clocks.the-siege}}` in a text.
- Rules name a declared clock by **its id**, whatever the player renames it on the map; a clock made by hand on the map is named by its name in lowercase with dashes (_The Wyrm wakes_ is `the-wyrm-wakes`).
- **When it fills**, its `onFull` happens once: its description and what the table rolled go to the timeline, the effects of both apply (other clocks and the factions: a trip's party isn't the world's), and then it stays full, starts over empty or goes away. The table sees the world as conditions do (`world.clocks.*`, `factions.<id>.*`, the date). One full clock may fill another (up to ten in a row). Any clock filling, declared or made by hand, is also a moment the trip going on hears (`world.clocks.<id>.full`: [Moments of the world](../oracle/07-connecting.md#5-your-own-travel-system)).
- Translated keyed `clocks/<id>`, by clock (`clocks: { the-siege: { name: El asedio, onFull: { description: La capital cae. } } }`). Core's `core/threat` is a clock for any game: the threat grows and, when full, strikes with one of Core's twists and starts over.

## Systems

A system names, in one place, what a game played with it uses: its travel rules, bindings, calendar and weather models, and the packs whose tables, oracles and decks it brings along. A campaign is played with one system, shared by its maps and trips: chosen for a Hexmapper map's campaign in **Map settings → Campaign → System** (its trips, its World panel's calendar and its Oracle panel use what the system brings), and by a trip in the Travel app on the system's page (a trip keeps the system it started with); both list them by name.

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
weather: [weather.sky] # the weather models its bindings may use
packs: [core] # packs whose tables it brings
maps: [maps/grey-marches.otd.json] # example maps, files of this pack
```

- Every part is optional. Without `travel`, the system doesn't travel (Play and Travel say so; its world, oracle and factions still play), and any system can name Core's, `travel: core/travel-rules.default`, the **Generic rules** (with `calendar: core/calendar.default`, whose parts of the day they name); without `bindings`, no table answers its checks (they're only written in the journal, and stop the trip only with `pause: true`) and the party has no stats; without `calendar`, the default one; without `weather`, its bindings can't name a weather model; without `clocks`, its world starts with no progress clocks (they can still be made by hand); without `partySheet`, the party has no sheet of its own; without `sheet`, its party is played as a whole. Core's own system, `core`, is the one a map plays when it chooses none: [the Generic rules](../packs/01-core.md#the-generic-rules).
- Each part is a definition of this pack, by its kind and id (`travel: travel-rules.default`), or of a pack it depends on (`travel: core/travel-rules.slow`, with `core` in its `dependencies`). `packs` lists dependencies too; the system's own pack is always included.
- **Its id:** a system with `id: default` is chosen by its pack's id (`grey-marches`), any other by pack and id (`grey-marches/winter`). A pack may declare several, e.g. the same land in summer and in winter with other travel rules.
- `name` and `description` are what players read (the name is the pack's when missing); translate them in `locales/<language>/` keyed `system/<id>`, like the other kinds.
- `maps` lists **example maps** to play the system on: map files (`.otd.json`, what the Hexmapper's **Save** writes) kept in this pack, by their path in it (usually a `maps/` folder). The Hexmapper offers them under **Maps → Example maps**, and the system's **Overview** in the Systems app adds and removes them. Example maps whose files name the same campaign (`campaign` in the file) open in one campaign, sharing its world clock and factions: the Grey Marches' two maps. Map files in a pack aren't definitions: nothing else reads them.
- **Older packs** that have travel rules but no `kind: system` keep working: they're a system named after the pack, with its travel rules, bindings and calendar, and every pack's weather models. Once a pack declares a system, only what it declares counts.
- A system travels as a whole: the Systems app's **Overview → Export as .zip** writes its pack with every pack it needs (the ones in `packs`, those its parts come from and their dependencies), and **Import a system (.zip)…** reads it back ([Taking it elsewhere](../systems/04-overview.md#taking-it-elsewhere)).

The Systems app writes one for every new system, edits it in the system's **Overview**, and declares an older pack's (**Declare it**). The Grey Marches declare theirs in `system.yaml`.

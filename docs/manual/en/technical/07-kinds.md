# Kinds of definition

A pack is a folder of YAML (or JSON) files. Each file holds one or more **definitions**, separated by a line with `---`, and every definition says what it is with `kind:`. This page lists every kind, what it's for, who reads it and what it looks like. Each one is validated when the pack loads: a mistake shows in the Oracle app's **Problems**, with its file and line.

The kinds are a **fixed set**: each one is read by an engine that knows it, and a pack can't add kinds of its own (one the apps don't know is kept but nothing reads it). What a pack chooses freely is the content: its own tables, calendar, weather, roll modes, travel rules and stats, with the names and rules of its game.

| Kind           | What it is                                                        | Read by                                                                    | How many per pack |
| -------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------- |
| `table`        | A list of results picked by dice or weight                        | The Oracle; trips and discovery, when a binding names it                   | Any               |
| `oracle`       | A table whose answers depend on a question (an input)             | The Oracle; trips and discovery, when a binding names it                   | Any               |
| `generator`    | Several rolls joined in one text                                  | The Oracle; trips and discovery, when a binding names it                   | Any               |
| `deck`         | Cards drawn without putting them back                             | The Oracle; trips and discovery, when a binding names it (it draws a card) | Any               |
| `roll-modes`   | Ways of rolling a table several times and keeping one total       | The Oracle (every roll)                                                    | One               |
| `travel-rules` | How a trip works: speeds, terrains, supplies, actions, checks     | Hexmapper Play, the Travel app                                             | One               |
| `bindings`     | Which table answers each check of a trip, the party's stats       | Hexmapper Play, the Travel app                                             | One               |
| `calendar`     | Months, seasons, weekdays, moons and holidays                     | Trips, the Hexmapper's World panel                                         | One               |
| `weather`      | Weather with memory: today's follows from yesterday's, per season | Trips (a binding with `weather:`)                                          | Any               |

**Who reads what.** Tables, oracles, generators and decks are all things you can roll, and anything that rolls can roll any of them: the Oracle by hand, a trip's check or discovery when a binding names it (`resolve: omens` draws a card). **How many:** one of a kind that describes the whole system (its roll modes, travel rules, bindings, calendar: a system has one way of doing each), any number of the rest. Weather models are many because a system may have several climates (the coast and the mountains, each bound to its own check).

Translations of names and texts go in `locales/<language>/` files with the same name, for every kind; the ones that aren't tables are keyed by kind and id (`calendar/marcher-reckoning:`): see [Translations](../oracle/05-translations.md#rules-calendars-weather-and-roll-modes). The examples below are in the base language only.

## Tables

```yaml
kind: table
id: weather
name: Weather
roll: 1d6 # empty: pick by weight
modes: [advantage, disadvantage] # roll modes offered by hand
entries:
  - { id: clear, range: 1-3, result: Clear skies, set: { weather: clear } }
  - { id: storm, range: 4-6, result: Storm, table: storm-damage }
```

Entries have a `range` of totals (or a `weight`), a `result` text, and optionally `when` (a condition), `set` (values the result gives), `table` / `generator` (roll another one), `once` / `maxOccurrences` (limits per session), `effects` (changes to the party's values) and `pause` (stop the trip when it comes up). The table may also have `clamp`, `onExhausted`, `modes` and `modeWhen`. Everything about them: [Editing](../oracle/04-editing.md) and [YAML](../oracle/06-yaml.md).

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

Fields rolled in order (each sees the ones before it), joined by a `template`. A field is a `table`, a `generator`, dice (`roll`) or a fixed `value`, and may have `when` and its own `context`.

```yaml
kind: generator
id: npc
fields:
  name: { table: npc-names }
  might: { roll: 4d6kh3 }
template: '{{name}} (might {{might}})'
```

**What other tables see:** each field by its name, inside the generator (`{{name}}`), and from a generator that rolls this one, as `{{npc.name}}`.

## Decks

Cards drawn without replacement until the deck is reshuffled (`reshuffle: when-empty`, `manual` or `after-draw`). A card can come in copies (`count`), roll a table, set values, have `effects` and `pause`, like an entry.

## Roll modes

The ways a system rolls a table **several times and keeps one total**: advantage, disadvantage, or anything else (three rolls keeping the middle one…). The apps know none of them: a pack declares them, with their names, and its tables list the ones they use. One `roll-modes` definition per pack, with any number of modes.

```yaml
kind: roll-modes
id: default
modes:
  advantage:
    name: Advantage
    description: Roll twice and keep the higher total.
    repeat: 2 # how many times the whole roll is made
    keep: highest # highest, lowest or middle (of an even count, the lower middle one)
    cancels: disadvantage # together, neither applies: a normal roll
  disadvantage: { name: Disadvantage, repeat: 2, keep: lowest }
```

A table or oracle uses them with:

- `modes: [advantage, disadvantage]`: offered when rolling by hand (the choice next to **Roll**).
- `modeWhen: { advantage: { explorer: { gte: 1 } } }`: used by itself when the condition holds, also on a trip. A mode can be in `modeWhen` without being in `modes`.

When several apply (one chosen by hand plus some on their own), the ones that cancel each other drop out and the first of the rest is used (the one chosen by hand, then `modeWhen`'s order). Modes are referenced like tables: the pack's own first, then its dependencies' (the Grey Marches use Core's `advantage`), or by full id (`core/advantage`). Core declares advantage and disadvantage and the Grey Marches add _Carefully_ (three rolls, the middle one). The old `advantage: true` does nothing now and warns.

**What tables see:** nothing: modes aren't values; a table uses them through `modes` and `modeWhen`.

## Travel rules

How a trip works: the day (dawn, nightfall, marching hours), terrains and their speeds, water, roads and rivers, ways of travelling (km per day, where they can go: `through`, and when they can be chosen: `when` / `unless`), what the party does at nightfall while waiting (`day.night`), supplies (with their `min` / `max`), weather that slows you down, its **values of the day** (`values`: `lost` with what it `blocks`: `travel`, `camp`, `rest`, an action's id or `mode.<id>`), the party's **actions** (all alike: camp, rest, foraging…: `when` / `unless`, `oncePerDay`, `on:` for those the system takes by itself at a moment or after another action, and their steps, `do`: `time`, `speed`, `effects`, `set`, `do`, `roll`) and the **checks**: what is rolled at dawn, on entering a hex, at the end of the day, with an action (camping, for example) or only by a step's `roll:`, and when (`when` / `unless`); a check may have `effects` of its own and `pause: true` (stop after it until **Continue**). A pack with travel rules is a **system** you can play in the Hexmapper (Play → With rules) and the Travel app. In detail: [Connecting tables to maps and trips](../oracle/07-connecting.md) and the Travel app's [Systems](../travel/03-systems.md).

**What tables see:** the trip's facts (`terrain`, `edges`, `mode`, `day`, `season`, `weather`, `yesterday.<value>`…) and the party (`party.resources.food`, `party.stats.fatigue`): the full list is in [What tables see](04-what-tables-see.md).

## Bindings

The other half of a system: which table (`resolve:`) or weather model (`weather:`) answers each check, with extra `context`; the party's **stats** (name, description, starting value) that tables read (`{{charisma}}`); **reads**, names for the other values its tables read (`icon.guards`, `fordModifier`…); and **discovery** (which tables decide empty hexes). In detail: [Connecting tables to maps and trips](../oracle/07-connecting.md).

**What tables see:** each stat by name (`{{charisma}}`, `when: { party.stats.morale: { lte: 0 } }`) and the binding's `context` (`timeOfDay: night`).

## Calendars

The months of the year (with their days and seasons), weekdays, moons (cycle and phase) and holidays, and the year of day 1. Trips with that system date their journal with it, and tables see `month`, `year`, `weekday`, `moons.<moon>` (new, waxing, full, waning) and `holidays`. The Hexmapper's [World](../hexmapper/12-world.md) panel uses the calendar of the map's system. Without one, a plain calendar of days and four seasons is used.

```yaml
kind: calendar
id: marcher-reckoning
name: The Marcher reckoning
watchHours: 4
startYear: 412
months:
  - { id: thaw, name: Thaw, days: 30, season: spring }
  - { id: highsun, name: Highsun, days: 30, season: summer }
weekdays: [{ id: moonday, name: Moonday }]
moons: [{ id: pale, name: The Pale Moon, cycle: 28 }]
holidays: [{ id: midsummer, name: Midsummer, month: highsun, day: 15 }]
```

**What tables see:** `{{month}}` (the month's id), `{{year}}`, `{{weekday}}`, each moon's phase as `moons.<moon>` (`when: { moons.pale: full }`) and today's holidays as a list (`when: { holidays: midsummer }`), plus `season` from the month. Ids, not names: conditions compare ids, and the journal shows the names.

## Weather models

Weather with memory (a Markov chain): per season, for each kind of weather, how likely each kind is tomorrow, so rain sets in for days and storms blow over. Each kind of weather has a name and the values it gives the day (`set: { fordModifier: -1 }`), like a table's result. A trip uses one when a binding says `weather: <model>` instead of `resolve:`; today's weather becomes `weather` for later checks and the travel rules' speeds.

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

**What tables see:** `{{weather}}`, the id of today's weather (`rain`), and each value its state sets, by name (`{{fordModifier}}`, `when: { fordImpossible: true }`); the day after, the same values as `yesterday.weather`, `yesterday.fordModifier`. There's no `{{weather.value}}`: the weather is its id, and its values are values of the day like any table's `set`.

The Grey Marches use every kind: see [The Grey Marches](../packs/02-grey-marches.md#where-each-feature-is).

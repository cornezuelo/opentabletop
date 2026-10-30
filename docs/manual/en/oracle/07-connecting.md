# Connecting tables to maps and trips

You don't need to program to make tables that react to the map, or a whole travel system Map plays for you. Everything is written in the pack's YAML files. This page builds it up step by step; each step works on its own.

> **A complete example to copy from:** the bundled pack **The Grey Marches** uses every feature on this page, and has an example map to play it on (Map: Maps → Example maps). Open its files in the Oracle app, or make a copy (**Edit a copy**) to change them. [The Grey Marches](../packs/02-grey-marches.md) says where each feature is.

## 1. A table that depends on the terrain

When you roll from Map (the Oracle panel, or a trip), the table receives what the map knows about the hex. `when` keeps an entry only if it matches:

```yaml
kind: table
id: what-do-we-find
name: What do we find here?
roll: 1d6
entries:
  - {
      id: forest,
      range: 1-6,
      when: { place.terrain: forest },
      result: 'Fallen timber and mushrooms',
    }
  - {
      id: rocks,
      range: 1-6,
      when: { place.terrain: [hills, mountains] },
      result: 'A cave mouth in the rock',
    }
  - { id: nothing, range: 1-6, result: 'Nothing special' }
```

All the entries cover 1–6: the **first one whose condition holds** wins, and the last one, without a condition, catches the rest. Terrains are written by their id (`forest`, `hills`, `swamp`…), as in Map's palette.

What a table can read from the map: `terrain`, `tags` (the hex's tags), `region` (the region's name), each **field** of the hex by its key (a hex with the field `danger: 3` gives `danger`), and `hex`. During a trip also `season`, `weather`, `mode` (on foot, on horseback…), `day` and the party stats. Every value, and which one wins when two share a name: [What tables see](../technical/04-what-tables-see.md).

## 2. Tags and fields

Tag hexes in Map (`haunted`, `ruins`…) and give them fields (`danger: 3`). Then:

```yaml
entries:
  - { id: ghost, range: 1-2, when: { place.tags: haunted }, result: 'A pale figure watches you' }
  - { id: ambush, range: 1-6, when: { place.danger: { gte: 3 } }, result: 'Ambush!' }
```

`place.tags: haunted` holds when the hex has that tag among others. `{ gte: 3 }` means "3 or more"; also `gt`, `lt`, `lte`, `not`.

A field can also change the dice: `roll: '1d6 + {{place.danger}}'`.

## 3. One table per season

A table can point to another by name, filling in a value from the context. With one weather table per season (`weather-spring`, `weather-summer`…):

```yaml
kind: table
id: weather
name: Today's weather
roll: 1d2
entries:
  - { id: today, range: 1-2, table: 'table.weather-{{time.season}}' }
```

## 4. Results the trip understands

An entry (or a deck's card) changes the party with **effects**: each one is a value the system declares, by the path tables read it with. A number adds or subtracts; `'=value'` sets it; a roll or a variable works inside (`'{{1d3+1}}'`; `'-{{party.stats.mouths}}'` takes away as many as another value, `'={{party.stats.endurance}}'` sets it to it, `'-{{loss}}'` reads a value the entry sets). A value stops at the `min` and `max` its system declares (stats and the party's sheet alike); without them it may go anywhere, negative too.

```yaml
- { id: berries, range: 6, result: 'Berries: +2 food', effects: { party.values.food: 2 } }
- { id: wolves, range: 5, result: Wolves, effects: { party.stats.morale: -1 } }
- { id: cordial, range: 1, result: A cordial, effects: { party.stats.fatigue: '=0' } }
```

Two other values of the day change the trip when an entry **sets** them:

| Set              | Effect on the trip                                           |
| ---------------- | ------------------------------------------------------------ |
| `weather: storm` | Today's weather; the travel rules say how it slows you down. |
| `lost: true`     | No more travel today, if the system declares `lost` (below). |

The journal says what each result changed ("Foraging: Berries (Food +2)"). An effect on a value the system doesn't declare still applies, but the pack gets a warning.

Tables read the party back as `party.values.food`, `party.stats.morale`, `party.items.ration.count`: `when: { party.values.food: { lt: 1 } }` for an entry that only comes up when the food has run out.

**Values of the day.** The values the system declares (in its rules' `values`: `lost`, a modifier…) and the day's `weather` stay for the rest of the day, so later checks can use them (also those of the same moment further down the list); the next day they become `yesterday.<name>`. Any other value a result sets lasts only for that roll (its text, the table it rolls next), whatever its name. Some kinds of declared value, for the tables that read them:

- A number to add to a later roll. With `lostModifier` declared, a weather entry with `set: { lostModifier: -1 }` makes `roll: '1d6 + {{today.lostModifier}}'` harder in the getting-lost table that comes after it; with no weather rolled yet, the table reads 0.
- A yes/no for something that can't happen today. The Grey Marches declare `fordImpossible`; their storm sets it, and the ford's first entry `when: { today.fordImpossible: true }` says nobody crosses. An action can use one too: `unless: { today.forageImpossible: true }` disables the button.
- One that **blocks** something while it holds (below): `lost` blocks travel. The apps enforce it: the button is disabled and says why.

## 5. Your own travel system

A pack becomes a **system** a map can play (Map: **Map settings → Campaign → System**) and the Systems and Travel apps list when it has two more definitions: the **travel rules** (how fast, which checks and when) and the **bindings** (which table answers each check). Put them in any file of the pack, e.g. `travel.yaml`; a `kind: system` can name them, with the calendar, weather and packs that go with them (see [Naming the system](#naming-the-system)):

```yaml
kind: travel-rules
id: default
travel:
  hoursPerDay: 8 # the hours a way's kmPerDay is marched in; km a hex below
  hexKm: 10
  start: '06:00' # new trips start at 06:00
  onward: { do: actions.march, with: { until: destination } } # going on by itself, it marches
  halt: { at: '20:00', do: actions.camp } # from 20:00, a party that can't march camps
terrains:
  forest: { multiplier: 0.5 } # half speed
  mountains: { multiplier: 0.33 }
  sea: { passable: false }
connections:
  road: { multiplier: 1.5 } # faster on roads
modes:
  foot: { name: On foot, kmPerDay: 30 }
  horse: { name: On horseback, kmPerDay: 60 }
weather:
  storm: { speed: 0 } # no travel in a storm
values:
  lost: { name: Lost, blocks: [travel.move] } # set by the getting-lost table: no more travel today
actions:
  march: # by day, for the day's 8 hours: to the destination or one hex
    params: { until: { choices: [destination, place] } }
    when: { time.hour: { gte: 6, lt: 20 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: # sleep until 06:00; a fed night (food didn't run out) eases fatigue
    do:
      - { time: '06:00' }
      - { unless: { trip.below: party.values.food }, effects: { party.stats.fatigue: -1 } }
  rest: { do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }] }
  forage: # an action of this system: a Forage for food button
    name: Forage for food
    unless: { trip.weather: storm }
    do: [{ time: 180 }, { travel.speed: 0.5 }]
    oncePerDay: true
  eat: # not a button: the system takes it as each day ends, camping or not
    on: time.day-end
    do: [{ effects: { party.values.food: -1 } }] # the party's food (its sheet, below)
checks:
  - { event: WEATHER, at: '06:00' }
  - { event: LOST, at: '06:00', unless: { trip.connections: [road, river] } }
  - { event: ENCOUNTER, at: trip.place-enter, when: { place.terrain: [forest, swamp] } }
  - { event: NIGHT, at: actions.camp }
  - { event: FORAGE, at: actions.forage, when: { place.terrain: [forest, plains] } }
  - {
      event: HUNGRY,
      at: time.day-end,
      when: { trip.below: party.values.food },
      effects: { party.stats.fatigue: 1 },
    }
---
kind: bindings
id: default
on:
  WEATHER: { resolve: table.weather }
  LOST: { resolve: table.lost-check }
  ENCOUNTER: { resolve: table.forest-encounters }
  NIGHT: { resolve: table.night-encounters }
  FORAGE: { resolve: table.forage }
stats:
  luck: { name: Luck, description: 'Added to encounter rolls', default: 0 }
  fatigue: { name: Fatigue, default: 0, min: 0 }
---
kind: sheet # the party's own: what it carries (food) is one of its values
id: party
values:
  food: { name: Rations, default: 6, min: 0 } # a new trip starts with 6, never below 0
---
kind: system # names them all
id: default
travel: travel-rules.default
bindings: bindings.default
partySheet: sheet.party
```

The rest of this section goes over each part of that example: what it's for, what it can say, and a few lines that work. To build a system with the forms instead, step by step, see the Systems app's [Your first system](../systems/03-your-first-system.md); [A day, step by step](../travel/02-playing.md#a-day-step-by-step) says in which order a trip does it all.

### The day and the speed

There's no built-in day and no built-in march: the party moves with the actions that have a `travel.move` step (its **march**, below), the trip goes on by itself with the one its `onward` names, and what it does when it can't move is its **halt**. **travel** says when new trips start (`start`: a clock or a part of the calendar's day; empty, midnight) and how many hours a way's day of marching takes (`hoursPerDay`, the scale of its speed); actions spend hours too. Its `hexKm` is the scale the system is played at, how many km a hex measures (`hexKm: 30`: a hex is a day's march at 30 km a day): trips without a map use it, and so does a map with the system unless the map sets its own scale (Map: Map settings → Map). Without it, the map's or the Travel way's, 10 by default. A way of travelling's `kmPerDay` is what it covers in those hours on easy ground, and everything else multiplies it:

- **terrains**: the speed on each terrain (`multiplier`: 0.5 is half speed, 2 double), by the ids of Map's palette. `defaultTerrain: { multiplier: 1 }` covers the terrains the map uses and the list doesn't name.
- **connections**: the kinds of connection between places: the roads, trails and rivers the party follows, and those drawn with Map's **Connections** (a bridge, a door, a tunnel). Following one, its `multiplier` replaces the terrain's (`road: { multiplier: 1.5 }`); with `extra`, a step through it takes those minutes on top of its usual time (`door: { extra: 10 }`); one drawn between far places goes at its kind's `multiplier` (1 if it has none) over its length, never the terrain's; `passable`, as a terrain's, says when it can be crossed, seeing the connection itself (`passable: { unless: { connection.state: locked } }`). A connection that can't be crossed is gone round; with no other way, the route leads up to it and the party stops there, where actions read it as `connection.*` and their effects change it (`connection.state: open`): [What tables see](../technical/04-what-tables-see.md#the-connection-of-the-step-connection).
- **weather**: today's weather (by the id a table or weather model sets) slows everyone down: `storm: { speed: 0 }` (nobody travels), `heavy-rain: { speed: 0.5 }`.

A terrain can be **closed**: `passable: false`, always, or on a [condition](../technical/08-conditions.md) about the hex entered and the moment. Routes go around what's closed.

```yaml
terrains:
  swamp: { multiplier: 0.33 }
  peaks: { multiplier: 0.25, passable: { when: { time.season: summer } } } # open only in summer
  pass: { multiplier: 0.5, passable: { unless: { trip.weather: [snow, storm] } } } # closed in snow
  lake: { passable: { when: { time.month: [deepwinter, wolfmoon] } } } # crossed on the ice
water: { passable: false } # water hexes whose terrain isn't listed
```

**water** does the same for water hexes whose terrain isn't listed (the map's Edit palette → Water). Tables see `water: true` on water hexes.

### Ways of travelling

**modes** are the ways of travelling the player chooses from in the trip panel, each with its `kmPerDay` (or, for rooms and points, `minutes` a step: `turn: { minutes: 10 }`) and a `name` (and `description`) for players: the panel and the journal show _On horseback_ instead of `horse`, translated in `locales/` like the rest. Without a name, the id is shown, made readable (`on-foot`: on foot). Two conditions shape each one:

- `through`: **where it can go**, a [condition](../technical/08-conditions.md) on each hex it enters. It sees the hex (`terrain`, `water`, `tags`, `region`, its fields), `connections` (the roads or rivers of that step), `mode`, `weather` and today's values. Where it holds the mode goes, even over closed terrains; elsewhere it can't, and routes go around. A boat: `through: { place.water: true }` (it sails water where walking can't go); the Grey Marches' boat also hugs the coast, `through: { any: [{ place.water: true }, { place.terrain: coast }] }`; a cart only by road: `through: { trip.connections: road }`.
- `when` / `unless` (**Only when** / **Not when** in the Systems app): **when it can be chosen**, seen where the party stands. Otherwise it's disabled in the trip panel, saying why. The Grey Marches' boat is only taken at the water's edge or a ferry: `when: { any: [{ place.water: true }, { place.terrain: coast }, { place.tags: ferry }] }`; a horse not in snow: `unless: { trip.weather: snow }`.

A value of the day can block one too (`blocks: [modes.horse]`, below): it can't be chosen, and a party already travelling that way stops until it changes.

### What the party carries

There are no supplies in the rules: food, water, torches, fodder… are the system's own, as it plays them. A game that counts them as plain numbers makes them **values of the party's sheet** (`partySheet:`, a `kind: sheet` whose values belong to the whole party), with the `default` a new trip starts with and their bounds; one where each character carries their share makes them **items** ([Characters](#characters), below). Either way they show in the trip (the party's card, each character's), where the player can also change them by hand. **Nothing uses them by itself**: the system's actions, checks and tables do, with effects (`party.values.food: -1`, `party.items.ration: -1`). That's how a system says how its game eats: once a day, at camp, only on horseback, never.

`min` and `max` bound a value. A change that would go past one stops there, the journal says so ("Rations can't go lower than 0"), and what comes after in that moment sees it in `trip.below` (or `trip.above`), by its full name: the later steps of the same action and that day's `time.day-end` checks. That's how "a day without food tires the party" is written:

```yaml
kind: sheet # the party's own
id: party
values:
  food: { name: Rations, default: 6, min: 0 }
  water: { name: Waterskins, default: 3, min: 0, max: 6 } # can't carry more than 6
# … and in the travel rules:
# checks:
#   - { event: HUNGRY, at: time.day-end, when: { trip.below: party.values.food }, effects: { party.stats.fatigue: 1 } }
```

Without `min`, a value may go negative (a debt, say).

### Values of the day

**values** are the values of the day this system declares, each with a `name` for players and what it **blocks** while it holds: `travel.move` (moving on), one of the system's actions (`actions.camp`, `actions.forage`…) or a way of travelling (`modes.horse`). A table's result (`set: { lost: true }`), a weather state or an action's step sets one; it holds until the day ends, and the next day tables read it as `yesterday.lost`.

```yaml
values:
  lost: { name: Lost, blocks: [travel.move] } # the getting-lost table sets it
  snowbound: { name: Deep snow, blocks: [modes.horse] } # set by the snow
  mutiny: { name: The hirelings refuse to march, blocks: [travel.move, actions.forage] }
```

Blocked buttons stay visible, disabled, and say why with the value's name ("Lost: not possible for the rest of the day"). A system that declares no `values` has none. Values that block nothing are still useful: conditions read them (`unless: { mutiny: true }`), as they read the `…Modifier` and `…Impossible` values of [section 4](#4-results-the-trip-understands).

### Actions

**actions** are what the party does, only the ones the system declares. March, camp and rest are actions like any other: an id, conditions, steps; the trip panel shows each one as a button, by its `name` (and its `description` as help). A system without `camp` has no camp, and **a system without an action that moves doesn't move**: nothing is built in.

**Marching is an action too.** What moves the party is the step `travel.move`: along the route while time passes, minute by minute, **while the action's `when` / `unless` hold** (checked as it goes: it stops the moment they don't, said in the journal), up to the destination (`travel.move: destination`), the next hex (`hex`) or a number of hexes (`3`). A march without `when` marches whenever nothing else stops it, day and night; by day for 8 hours is `when: { time.hour: { gte: 6, lt: 20 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }`, or with the parts of the calendar's day, `time.tags: { not: dark }`. Its id is the system's own: a ship may `sail`, a caravan `ride`.

**How far is a parameter.** An action may declare `params`, each with its `choices` (the first is the default, unless `default` says another); its steps and conditions read the one chosen as `{{params.<id>}}`. Its button offers the choices beside it (_March_ · to the destination / one hex), a `do:` step gives them with `with:`, and so does `travel.onward`. A choice may have a name to show (`{ id: 3, name: Three hexes }`, translated in the pack's `locales/`).

**When the trip goes on by itself** (the world clock moving with a trip on, a travel order), it takes the action `travel.onward` names, with its parameters, whenever it can, and waits (with the halt) while it can't: `onward: { do: actions.march, with: { until: destination } }`. Without it, the trip only waits.

**A check stops a move on the way** when it needs the player: the move stays **under way**, and **Go on** (in the trip panel) goes on with it: the rest of the move, then the steps after it. Taking another action or waiting leaves it.

A system may march by day or, after a night march, by torchlight until midnight; the night march lights the torches and takes the march itself:

```yaml
values:
  torchlit: { name: By torchlight }
actions:
  march:
    params: { until: { choices: [destination, place, 3] } }
    when:
      {
        any:
          [
            { time.hour: { gte: 6, lt: 20 }, trip.marched: { lt: '{{system.hoursPerDay}}' } },
            { today.torchlit: true },
          ],
      }
    do: [{ travel.move: '{{params.until}}' }]
  night-march:
    when: { time.hour: { gte: 20 } }
    do: [{ set: { torchlit: true } }, { effects: { party.stats.fatigue: 1 } }, { do: actions.march }]
… # the rest of the travel rules
```

When the button can be pressed:

- `when` / `unless`: conditions (like a table's) on the trip's facts, today's values and the party. The Grey Marches forage `unless: { trip.weather: storm }` and camp only `when: { party.items.ration.count: { gte: 1 }, party.stats.fatigue: { lt: 10 } }`. When they don't hold, the button is disabled and says why.
- Day and night in those conditions are the system's: the hour (`time.hour: { gte: 6, lt: 20 }`) or the parts of its calendar's day (`time.part: night`, `time.tags: dark`). A system may rest, forage and force the march only by day, so the night can't be skipped resting, and march at night only after a night march.
- `oncePerDay: true`: once a day.
- A value of the day that `blocks` it (above).

A button that can't be pressed stays visible, disabled, saying why, so the buttons don't move around. `hideWhenUnavailable: true` hides it instead while it can't be taken: for actions that only make sense now and then, like the Grey Marches' rite (at a shrine under the full Ember Moon), talking round the hirelings (only while they refuse) or the night march (only at night).

**Actions the system takes by itself.** With `on:` an action isn't a button: the system takes it at that moment, when its `when` / `unless` hold. The moments are a clock (`on: '06:00'`, as it strikes) or a part of the calendar's day (`on: time.part.morning`, as it begins), marching, waiting or asleep in camp, `trip.place-enter` (entering each hex), `time.day-end` (as each day ends, camping or not), another action (right after that action starts: `on: actions.camp`), an action's end (once its steps are done: `on: actions.forage.done`), a check (right after it's resolved, after **Continue** if it paused: `on: checks.WEATHER_CHECK_REQUIRED`; the Grey Marches' _A stormy dawn_ reads the weather just rolled, and the next checks of that dawn see what it changed) or a moment of the world (below: `on: world.turn`, `on: world.clocks.<id>.full`), or several as a list (`on: [time.part.morning, trip.place-enter]`). It comes before that moment's checks, so they see what it changed; its conditions see which moment it is as `trip.moment`, and at `time.day-end` the action under way as `trip.doing` (`trip.doing: camp`).

```yaml
actions:
  eat: { on: time.day-end, do: [{ effects: { party.values.food: -1 } }] }
  feed-horses: # only riding
    on: time.day-end
    when: { trip.mode: horse }
    do: [{ effects: { party.values.fodder: -1 } }]
```

**What an action does** is a list of **steps** (`do`), done in order. Each step does one thing, and only when its own `when` / `unless` holds:

| Step                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `time: 180`                           | Three hours pass. `time: '14:00'` or a part of the calendar's day (`time: time.meal.luncheon`): until it next comes. The moments on the way happen, and every day that ends on the way ends with its `time.day-end` actions and checks.                                                                                                                                                                                              |
| `travel.move: destination`            | Moves the party along its route while time passes and the action's `when` / `unless` hold: to the destination, the next `hex` or a number of hexes (`3`), or as a variable says (`'{{params.until}}'`). A check that needs the player stops it under way (**Go on** goes on with it).                                                                                                                                                |
| `travel.speed: 0.5`                   | The rest of today's moving goes at half speed (`1.5`: faster).                                                                                                                                                                                                                                                                                                                                                                       |
| `effects: { party.stats.fatigue: 1 }` | Changes the party, like a table's effects. A change past a value's `min` / `max` stops there, and later steps see it in `trip.below` / `trip.above` by its full name, and the new values (the party's stats, sheet and items).                                                                                                                                                                                                       |
| `set: { lost: true }`                 | Sets values of the day the system declares (`values`).                                                                                                                                                                                                                                                                                                                                                                               |
| `do: actions.forage`                  | Takes another action, if its conditions hold (otherwise nothing happens). With `with:`, its parameters: `{ do: actions.march, with: { until: place } }`.                                                                                                                                                                                                                                                                             |
| `roll: checks.ENCOUNTER`              | Rolls a check now: every check with that event whose `when` / `unless` hold, whatever its `at`. The steps after it wait until it's resolved, and see its result. `roll: table.ruins` (or `generator.`, `oracle.`, `deck.`, another pack's `core/table.twists`) rolls that instead, with no check or binding: its result goes to the journal by its name, its `set` and `effects` reach the trip, and an entry with `pause` stops it. |
| `travel.advance: 1`                   | Moves the party that many hexes along its route at once, no time passing: each hex is entered as by marching (its `trip.place-enter` checks, its visit, the trip's totals); it stops at the destination, at a way it can't take or at a check. A variable too: `'{{party.stats.rank}}'`.                                                                                                                                             |
| `travel.mode: modes.boat`             | Travels another way from now on, if that way can be chosen now (its `when` / `unless`, what blocks it); the route is planned again for it.                                                                                                                                                                                                                                                                                           |
| `say: The porters sing`               | Writes a line of the system's own in the journal; `{{…}}` in it read then.                                                                                                                                                                                                                                                                                                                                                           |
| `pause: true`                         | The trip waits there until the player presses **Continue** (with a text, it says it); then the rest goes on.                                                                                                                                                                                                                                                                                                                         |
| `ask: params.how`                     | The trip waits for the player to choose one of the action's parameter's choices; later steps read it (`when: { params.how: swim }`).                                                                                                                                                                                                                                                                                                 |
| `wait: { today.ferry: true }`         | Time passes until the condition holds, at most until `limit:` (required: minutes, a clock or a part of the day).                                                                                                                                                                                                                                                                                                                     |

```yaml
actions:
  camp: # sleep until 06:00; a fed night eases fatigue
    do:
      - { time: '06:00' }
      - { unless: { trip.below: party.values.food }, effects: { party.stats.fatigue: -1 } }
  forced-march: # faster, tiring, and off at once: it takes the march
    name: Forced march
    when: { party.stats.fatigue: { lt: 2 } } # only while fresh
    do:
      - { travel.speed: 1.5 }
      - { effects: { party.stats.fatigue: 1 } }
      - { do: actions.march, with: { until: destination } }
  keep-watch: # a step that rolls, then a step on a condition
    do: [{ roll: checks.NIGHT_WATCH }, { unless: { party.stats.morale: { gte: 1 } }, time: 60 }]
```

What an action **rolls** are the checks with `at: actions.<its id>` (camp's: `at: actions.camp`), rolled before its steps. `nothing` is what the journal says when none of them apply where the party is (`nothing: 'nothing to forage on {terrain}'`, with `{terrain}` the hex's terrain); without it the journal says that none of its rolls apply there. In the Systems app's forms each step is written the same way, one box per step, with suggestions. Every step, with examples and a whole system that uses them: [Actions and steps](../technical/10-actions-and-steps.md). The Grey Marches use all of it: see [their camp, rest and foraging](../packs/02-grey-marches.md).

**The halt.** `travel: { halt: { at: '20:00', do: actions.camp } }` says what the party does when it can't march while the time moves on by itself (the world clock, **Wait to go on**, a travel order while its way on can't be taken): from that moment (a clock or a part of the day, `at: time.part.night`) until the day ends, a party that isn't marching takes that action, once a day. When the action can't be taken (a value blocks it, or its `when` / `unless` don't hold), the journal says why and the time passes without it, until the trip can go on. Without a halt, the party just waits.

### Journeys by moves

Some games don't march hour by hour: a journey is made of **moves**, each one bringing the party closer by some progress, and arriving may need a roll. The `travel.advance` step is that progress: the party moves along its route as many hexes (or legs of a way, in the Travel app) as it says, at once.

- **No marching**: declare no action with a `travel.move` step, and only the moves bring the party forward.
- **A move**: an action whose steps pass time, spend what the party carries and advance (`do: [{ time: 240 }, { effects: { party.values.food: -1 } }, { travel.advance: 1 }]`); with a check (`roll:` or `at:` its id) whose table decides how it went.
- **Progress that depends on something**: `travel.advance: '{{party.stats.rank}}'` moves as many legs as a stat; a step with `when` advances only on a good result of the day (`when: { today.made-way: true }`, set by the move's table).
- **Arriving as a roll**: the last leg is a terrain that's only `passable` with a value of the day (`passable: { when: { reached: true } }`), set by an action whose table rolls for it; then that action's `travel.advance: 1` takes the party in.

```yaml
actions: # no action moves along the route: only the moves bring the party forward
  press-on:
    name: Press on
    description: 'Half a day on the way: a ration, and one leg closer.'
    do:
      - { time: 360 }
      - { effects: { party.items.ration: -1 } }
      - { travel.advance: 1 }
… # the rest of the travel rules
```

The Grey Marches' **Ride with a carter** uses it on the road.

### Checks

**checks** are what the trip rolls, and when. Each one has an `event` (any name you like: the bindings use it to pick its table), a `name` and `description` for players (shown in the trip panel and the journal instead of the event; translated in `locales/`, see [Translations](05-translations.md#rules-calendars-weather-and-roll-modes)) and an `at`:

- a clock or a part of the calendar's day: `at: '06:00'`, `at: time.part.morning`, as it comes, marching, waiting or asleep in camp (the weather, getting lost each morning); a new trip has the moments of its first minute as it first marches or waits;
- `trip.place-enter`: entering each hex (encounters, a toll, a landmark);
- `time.day-end`: as each day ends, after the system's `time.day-end` actions (hunger). They see `trip.below` / `trip.above`, what hit a bound that day, and `trip.doing`, the action under way when it ended;
- an action (`actions.<id>`): with that action, before its steps, which wait for it (`at: actions.camp`, `at: actions.rest`);
- an action's end (`actions.<id>.done`): once its steps are done (the Grey Marches' foraging, `at: actions.forage.done`, after its three hours);
- another check (`checks.<event>`): right after it's resolved (`at: checks.WEATHER_CHECK_REQUIRED`);
- several, as a list: the Grey Marches roll encounters `at: [trip.place-enter, actions.rest]`, and their condition tells the two apart with `trip.moment` (the table sees it too);
- a moment of the world (below): `at: world.turn`, `at: world.clocks.<id>.full`;
- a condition turning true (below): `at: { when: { world.clocks.the-siege: { gte: 6 } } }`, once as it does;
- none: only a step's `roll:` rolls it.

**Moments of the world.** A progress clock of the campaign filling is a moment the trip going on in it hears: `world.clocks.<id>.full`, for an action's `on:` or a check's `at:`. A clock the system declares (`clocks:` in `kind: system`) is named by the id it declares; one made by hand on the World panel by its name in lowercase with dashes (_The Wyrm wakes_ is `world.clocks.the-wyrm-wakes.full`), which the Systems app can't check (it warns that the system declares no such clock). Whatever fills it, the trip hears it:

- what the trip did (a check's or a table's `effects`, a faction's turn that came due on the way): as soon as the step that filled it is done (a long wait or a night in camp first ends, then the moment comes);
- a hand on the World panel, a table rolled by hand, a world turn, in the app the trip plays in: at once;
- the same in another app (the Campaign app, another map of the campaign while the trip plays in Travel): on the trip's next step, before what it does.

The journal says it first (**In the world: The Wyrm wakes filled**), and then its actions and checks happen, where the party is, seeing `trip.moment: world.clocks.<id>.full`; one that fills another clock is heard too (ten in a row at most). Only the trip going on in the campaign hears it (one at a time); a clock that fills while no trip is going on is heard by none. The Grey Marches' _The Wyrm wakes_ (`on: world.clocks.the-greywood-wyrm-wakes.full`) raises every companion's dread when the haunted lights fill the Wyrm's clock, and stops the trip inside the Greywood.

**World turns.** A world turn of the campaign (every faction's turn, then the world's reactions to it) is a moment of the world too: `world.turn`, for an action's `on:` or a check's `at:`, heard as a clock filling is, whatever brought it (a turn due as time moves on, **World turn** by hand, another app, the trip itself). The trip's journal tells each turn played while it goes on: **World turn:** and what each faction did. A step brings one: `do: world.turn` (it takes no `with:`). The travel rules don't know the world, so the app the trip plays in plays the turn on the campaign's world, as one due with time; without a campaign whose system declares factions there's no turn to play, and the journal says **World turn: nothing happens**. A turn heard that brings another (`on: world.turn` doing `do: world.turn`) is refused when the pack loads, and the Systems app warns of `on: world.turn` in a system without factions. The Grey Marches' _Carry the news_ (in a market town, once a trip) brings one; their _Word on the road_ hears every one.

**Moments written as conditions** (reactions). Some things happen once, when something becomes true, whatever made it true: _when morale reaches 0, the hirelings desert_. Write the moment as a condition, `on: { when: { party.values.morale: { lte: 0 } } }` (with `unless` too), for an action's `on:` or a check's `at:`, alone or in a list beside named moments (`at: [time.part.morning, { when: … }]`). It comes **once, as the condition turns true**, and again only after it has stopped holding: a table that lowers morale, an action, a hand on the party's card, a faction's turn all count. It's looked at after every change of the trip, reading what tables see (the trip, the hex, the time, the party, the characters, the world's clocks), and what comes is played there and then, as any moment's actions and checks (a pause stops the trip). What already holds when a trip starts comes on its first step (a trip that starts with morale 0 sees its hirelings desert); a trip saved before reactions existed takes what holds when it's next played as already seen. With `for: party.members`, it's looked at for each member, read with that member as `acting` (`on: { when: { acting.values.health: { lte: 0 } }, for: party.members }`), and played with them acting (the journal says _For Mara, a rule of the system comes into play_), each member once. Reactions that set each other off (directly or in a chain) stop after 10 in a row, with a line in the journal. A clock filling (`world.clocks.<id>.full`, above) is one case of it, heard even when filled away from the trip. **A state is not a reaction**: what should hold all the while (encumbered, weary) is a sheet's condition with `when:` ([Sheets](../technical/07-kinds.md#sheets)); a reaction is for something that happens. The Grey Marches: the hirelings desert as morale reaches 0, a companion falls as their health does (`for: party.members`), and an omen is drawn as the Wyrm's clock reaches 4 (`at: [time.part.morning, { when: { world.clocks.the-greywood-wyrm-wakes: { gte: 4 } } }]`); Core's _Despair_ stops the trip as morale reaches 0.

`when` / `unless` decide where and when it applies, with the same [conditions](../technical/08-conditions.md) as tables; `connections` are the roads or rivers of the stretch (the one just walked when entering a hex, the one ahead at a moment of the day and in camp).

```yaml
checks:
  - {
      event: LOST,
      name: Getting lost,
      at: time.part.morning,
      unless: { trip.connections: [road, river] },
    }
  - event: ENCOUNTER
    at: [trip.place-enter, actions.rest]
    when:
      {
        any:
          [
            { trip.moment: trip.place-enter, danger: { gte: 1 } },
            { trip.moment: actions.rest, danger: { gte: 3 } },
          ],
      }
  - { event: SHRINE, at: trip.place-enter, when: { place.tags: shrine }, pause: true } # waits for Continue
  - {
      event: HUNGRY,
      at: time.day-end,
      when: { trip.below: party.values.food },
      effects: { party.stats.fatigue: 1 },
    }
```

A check can have **effects of its own**: without a table it just applies them, which is how a system writes its rules as data ("a day without enough food: fatigue +1"). A check with no table and no effects is just written in the journal. `pause: true` rolls it (if a table resolves it) and then stops the trip until **Continue**, so you can describe the place, resolve it yourself or decide something: **only `pause: true` stops the trip**, with a table or without (a landmark to describe: `pause: true` and no table). Waiting with the world clock (Map → [World clock](../map/12-world.md#with-a-trip-going-on)) rolls them too (and takes the actions with `on:`): each moment as it comes, the halt's action's from its moment, `time.day-end` as each day ends.

### Bindings, stats and reads

The **bindings** (`kind: bindings`) are the other half of the system:

- `on` connects each check, by its event, to what answers it: `resolve:` a table, oracle, generator or deck of the pack (or another pack's, by full id: `core/weather`), or `weather:` a [weather model](#weather-with-inertia). `context` adds values for that check only, and wins over everything else: the same encounter table answers day and night with `context: { timeOfDay: night }` on the camp's check, and an oracle gets its input as `context: { odds: likely }`. **Checks with no binding** are written in the journal (with their effects, if they have any), and stop the trip until **Continue** only when they say `pause: true`: the Grey Marches' landmarks.
- `stats` are the party's numbers, shown in the trip panel, where you set them when the trip starts and change them as you play. Nothing in the apps makes them up: each system declares its own, with a `name`, a `description` (its help in the trip panel), a starting value (`default`) and, if it has them, `min` and `max` (fatigue never below 0). Tables read them by their full name, `{{party.stats.charisma}}` (the bare key, `{{charisma}}`, is read too, but a fact with the same name hides it). The Grey Marches declare Charisma, Survival, Navigation and Morale; the Generic rules have none (their party's Morale is a value of its party sheet). A table can change one nobody declared (`effects: { party.stats.hirelings: 1 }`): it works and shows by its key, but the pack gets a warning, so declare every stat its tables change.
- `reads` names the other values the system's tables read that nobody else names: a value of the map (`danger`, `icon.guards`, `token.fare`), the bindings' context (`timeOfDay`) or today's values tables set (`fordModifier`). With a `name` and `description` each, the roll panel shows them by name, with what they are in their help: `reads: { icon.guards: { name: Guards, description: How many guards watch the gates. } }`. The values maps and trips give (terrain, season, holidays…) already have names in the apps.

```yaml
kind: bindings
id: default
on:
  NIGHT: { resolve: table.encounters, context: { timeOfDay: night } }
  FORD: { resolve: oracle.ford, context: { odds: even } } # an oracle and its input
stats:
  morale:
    { name: Morale, description: Falls with hunger and bad news., default: 2, min: -3, max: 3 }
reads:
  danger: { name: Danger, description: How dangerous the hex is. }
```

### Naming the system

Travel rules and bindings are enough for a system named after its pack. A `kind: system` says it in one place, with what else it brings: its calendar, the weather models its bindings use, other packs' tables (packs it depends on) and example maps to play it on (`maps:`, map files in the pack, listed in Map's **Maps → Example maps**). A pack may declare several, e.g. a winter variant with its own travel rules: In the Systems app, the system's **Overview** writes it with a form.

```yaml
kind: system
id: default # chosen by the pack's id
name: Dark Woods
travel: travel-rules.default
bindings: bindings.default
---
kind: system
id: winter # chosen as <pack>/winter
name: Dark Woods in winter
travel: travel-rules.winter # another kind: travel-rules, with id: winter
bindings: bindings.default
```

Every key is in [Systems](../technical/07-kinds.md#systems).

### Characters

A system may play its party as a whole (its stats and its sheet are the party's) or one character at a time, or both. For characters, it declares a **sheet** (`kind: sheet`: their values with bounds, their conditions and what each blocks, the kinds of relation they hold) and names it in its system (`sheet: sheet.companion`). Trips then have a **Characters** section: add them, choose who acts, change their values.

Then the bindings say what the party takes from them:

- **Stats made of theirs:** `navigation: { name: Navigation, from: { max: pathfinding } }` is the best Pathfinding among them; `min` the worst, `sum` all together, `count: true` how many; `when` / `unless` leave some out (`count: true, unless: { conditions: wounded }`: those not wounded). Without characters the stat is kept as usual, so the same system plays both ways.
- **Whoever the player chooses:** `charisma: { from: { pick: charisma } }` is one character's Charisma, the one chosen in the trip's **Rolls with** (the best by default); **Ask at every roll** makes each check on a table wait for the choice.
- **Values of the party's own sheet:** with `partySheet:` in the system, a sheet for the party itself (morale, fatigue…, whoever travels), `morale: { from: { party: morale } }` is that value: effects on the stat change the sheet, within its bounds.
- **What they carry:** items ([Items](../systems/08-items.md)): `party.items.ration` are the party's own and its characters' together; what the trip eats (`party.items.ration: -3`) is taken from the party's own first, then from them, and what it finds is given to them, shared out as their sheet says (`items: { share: even }`, the default: from whoever carries most; `share: order` for the first one first). A new character carries what their sheet's `items.start` says (`start: { ration: 2 }`).

- **Journey roles:** `roles: { guide: { name: Guide }, lookout: { name: Lookout } }`: in a trip the player gives each to a character, and checks and tables read the holder, `roles.guide.values.pathfinding: { gte: 2 }`.

Effects reach them: `party.members.values.health: 1` (every character), `acting.conditions.wounded: true` (whoever acts), `roles.lookout.values.health: -1` (a role's holder), `characters.kael.values.health: -1` (one). Conditions read `party.members: kael`, `acting.values.survival: { gte: 2 }`, `characters.kael.conditions: wounded`.

**Relations** tie a character to another, a place, a region or a hex (the sheet's kinds: a bond, a home…). Where the party goes, `place.related` says who is tied to the hex (it, its region or a place in it) and `place.relations.home` who has it as home: a check `when: { place.relations.home: { exists: true } }, unless: { from.relations.home: { exists: true } }` comes up when the party comes home.

```yaml
kind: sheet
id: companion
name: Companion
values:
  survival: { name: Survival, default: 1, min: 0, max: 5 }
  health: { name: Health, default: 3, min: 0, max: 3 }
  rations: { name: Rations, default: 2, min: 0, max: 6 }
conditions:
  wounded: { name: Wounded, blocks: [actions.forced-march] }
```

The Grey Marches play their Company this way: Survival from the best of those not wounded, Stealth from the clumsiest, a ration per mouth from what they carry, a fed night healing everyone, a ford that sprains the ankle of whoever leads the crossing, **Tend the wounded** for whoever acts with Survival 2 or more, a guide and a lookout, and Home ground when the party comes into a companion's home ([The Grey Marches](../packs/02-grey-marches.md)). Every key is in [Sheets](../technical/07-kinds.md#sheets).

### Factions

The powers of the system's world are **factions** (`kind: factions`, named by `factions:` in its system): each a character of a sheet (strength, reputation…) holding land on a map. On every world turn (by hand, or every few days of the world clock) each one rolls a turn table whose effects change it (`faction.values.strength: 1`, `faction.territory: 1`), another (`factions.the-vale.values.strength: -1`) or a progress clock (`world.clocks.the-iron-clans-march: 1`). Any table reads them: `factions.iron-clans.values.strength`, `place.faction: the-vale` (the Grey Marches' patrol rides where the Vale holds the land). Every key: [Factions](../technical/07-kinds.md#factions).

### Progress clocks

A system can declare the **progress clocks** its world starts with (`kind: clocks`, named by `clocks:` in its system): each with its segments, where it starts and what becomes of it once full. Effects fill them from anywhere (a trip's encounter, a faction's turn: `world.clocks.the-greywood-wyrm-wakes: 1`), conditions read them (`world.clocks.the-greywood-wyrm-wakes: { gte: 6 }`), and once full each stays full, starts over or goes away (`then`). Every key: [Progress clocks](../technical/07-kinds.md#progress-clocks).

### The world's rules

What the world does by itself is its **reactions** (`kind: world`, named by `world:` in its system), written as a trip's actions are: at a moment of the world (`world.turn`, after every world turn; `world.clocks.<id>.full`, a clock filling) or as a condition turns true (`{ when: { factions.fort-keld.values.strength: { lte: 0 } } }`, `{ when: { world.events: market-day } }`), with steps that say a line on the timeline, roll a table (`roll: table.wyrm-wakes`), change factions and clocks (the Iron Clans' march brings Fort Keld's mutiny closer), or bring another reaction or a world turn (`do: world.turn`). They play wherever the world moves, a trip going on or not; the trip hears a clock filling too. Every key: [The world's rules](../technical/07-kinds.md#the-world-s-rules); the Systems app's [World](../systems/11-world.md).

## 6. A calendar of your own

Trips count days with a plain calendar (four seasons of 90 days) unless the system names its own (`calendar:` in its `kind: system`, its pack's or a dependency's, like the Generic rules' `core/default`).

```yaml
kind: calendar
id: reckoning
name: The Marcher reckoning
startYear: 412
divisions: { watch: { every: 4 } }
months:
  - { id: thaw, name: Thaw, days: 30, season: spring }
  - { id: highsun, name: Highsun, days: 30, season: summer }
  # …
weekdays: [{ id: moonday, name: Moonday }, { id: ironday, name: Ironday }]
moons: [{ id: pale, name: the Pale Moon, cycle: 28 }]
holidays: [{ id: midsummer, name: Midsummer, month: highsun, day: 15 }]
```

- **divisions** of the day, if the system wants any (meals, watches…, each with its parts or `every` N hours): see [Calendars](../technical/07-kinds.md#calendars).
- **months** in order, with their days and **season** (the seasons a trip can start in come from here); **weekdays**, **moons** (a cycle in days and an optional `offset`), **holidays** (a month and a day), the **startYear** and, optionally, `start: { month, day }` for the first day.
- The trip panel shows the date (“Moonday, 1 Thaw, year 412”), the moons' phases and the day's holidays.
- Tables and checks see `month`, `year`, `weekday`, `moons.<id>` (`new`, `waxing`, `full` or `waning`) and `holidays` (a list): `when: { time.moons.ember: full }`, `when: { time.holidays: midsummer }`.

The Grey Marches' `calendar.yaml` is a full example.

### Weather with inertia

_A season may also be a hex flower: 19 cells the weather drifts across by 2d6, see [Weather models](../technical/07-kinds.md#weather-models)._

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
  WEATHER_CHECK_REQUIRED: { weather: weather.sky }
```

- **states**: each kind of weather, with its name and the values it gives the day (like a table's `set`); its id is what the travel rules' `weather` reads.
- **seasons**: per season, where the weather starts and, from each kind, the weights of the next day's. Yesterday's weather the season has no row for starts over from `start`.
- The journal shows the day's weather by its name. In the Systems app's **Checks**, pick the model under _Weather with inertia_.

The Grey Marches' `sky.yaml` is the full example (their tables in `weather.yaml` still roll weather by hand, without memory).

## 7. Discovering the map

Bindings can also say how empty hexes are decided while travelling (Map's **Discover the map as you travel**):

```yaml
kind: bindings
discover:
  terrain: { resolve: table.next-terrain } # an empty hex's terrain
  contents: { resolve: table.hex-contents } # what a hex holds, the first time you enter it
  reveal: neighbors # or: entered (only the hex you walk into)
on: { … }
```

- The **terrain** table sees the hex you stand on: `terrain`, its tags, fields and region, plus `place` (the hex being decided) and the land around it: `around.<terrain>` (how many of its known neighbours have it), `common` (the most frequent). It answers with `set: { terrain: hills }`; `set: { terrain: '{{common}}' }` makes the land around grow, so lakes, forests and ranges come out whole instead of a patchwork; `when: { around.lake: { gte: 2 } }` gathers water.
- **A land model instead** (`kind: land`, [Land models](../technical/07-kinds.md#land-models)): `terrain: { land: land.default }` decides each empty hex from the rows of all its known neighbours added up, with no table. The system must list it (`land: [land.default]` in its `kind: system`).
- **A table that hands over to a model:** an entry with `set: { land: land.<id> }` (and no `terrain`) lets the model decide that hex. The table keeps the special cases and the model the rest; an entry whose `when` reads the region gives a region its own land: `{ id: north, range: 1-6, when: { from.region: The North }, set: { land: land.north } }`. A model the system doesn't list decides nothing.
- The **contents** table sees the entered hex. Its text becomes a point of interest; `set: { poi: false }` means nothing worth noting, `set: { poi: 'A name' }` names it differently. `tags` (one or a list) and `name` are written on the hex too. An entry may make a **place from a template** instead (`effects: { place.pois.ruins: 1 }`, from the system's [catalogues of places](../technical/07-kinds.md#places)): the point of interest is the template's (its name, text, icon and fields, `{{result}}` reading the entry's text) and its tags go on the hex, in place of one made of the text.
- Party stats and today's values are in the context of both, as in checks.

The Grey Marches' `discovery.yaml` is a full example: terrain that tends to go on, families of land, a landmark found only once, and east of the Hollow Hills a hand-over to their land model (`land.yaml`).

## 8. Trying it

1. In the Oracle app, roll each table with values typed in **Context** (terrain, season…) to check the results.
2. In the Travel app, pick your system and open **Play**: build a short way with the terrains and tags your checks look for, and travel. The journal shows each check and its result.
3. On a map: in Map, Play → **With rules**, pick your pack as the rules, place the party and travel.
4. Problems in the travel rules or bindings appear in the pack page, like any other.

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

An entry can **set** values. The Travel Engine reads some of them when the table resolves a travel check:

| Set                      | Effect on the trip                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `lost: true`             | No more travel today.                                                                                    |
| `weather: storm`         | Today's weather; the travel rules say how it slows you down.                                             |
| `fatigue: 1`             | Adds fatigue (negative recovers).                                                                        |
| `resources: { food: 2 }` | Adds supplies (negative uses them up).                                                                   |
| `stats: { morale: -1 }`  | Adds to party stats (negative lowers them); a stat the system doesn't declare appears in the trip panel. |

```yaml
- { id: storm, range: 6, result: 'A storm: no travel today', set: { weather: storm } }
- { id: lost, range: 1-2, result: 'You are lost', set: { lost: true } }
- { id: berries, range: 6, result: 'Berries: +2 food', set: { resources: { food: 2 } } }
```

Tables read the party back as `party.resources.food`, `party.stats.morale`, `party.fatigue`: `when: { party.resources.food: { lt: 1 } }` for an entry that only comes up when the food has run out.

Values named `weather`, `…Modifier` or `…Impossible` also stay for the rest of the day, so later checks can use them: a weather entry with `set: { lostModifier: -1 }` makes `roll: '1d6 + {{lostModifier}}'` harder in the getting-lost table that comes after it.

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
  foot: { kmPerDay: 30 }
  horse: { kmPerDay: 60 }
resources:
  food: { perDay: 1 }
weather:
  storm: { speed: 0 } # no travel in a storm
actions:
  rest: { minutes: 120, fatigue: 1 }
  forage: { name: { en: Forage, es: Forrajear }, minutes: 180, speed: 0.5, oncePerDay: true } # an action of this system: a Forage button
checks:
  - { event: WEATHER, at: day-start }
  - { event: LOST, at: day-start, unless: { edges: [road, river] } }
  - { event: ENCOUNTER, at: hex-enter, when: { terrain: [forest, swamp] } }
  - { event: NIGHT, at: camp }
  - { event: FORAGE, at: forage, when: { terrain: [forest, plains] } }
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
  luck: { name: { en: Luck, es: Suerte }, description: 'Added to encounter rolls', default: 0 }
```

- **terrains** set the speed on each terrain (`multiplier`; 0.5 is half speed) or close it (`passable: false`). **water** does the same for water hexes whose terrain isn't listed (the map's Edit palette → Water), and a way of travelling with `allowedTerrains: [water]` is a boat: it only sails water, even where walking can't go. Tables see `water: true` on water hexes.
- **actions**: `camp` and `rest` are built in (`false` removes one; `rest` takes `minutes` and the `fatigue` it recovers). Any other key is an **action of the system's own**, a button next to Travel, Camp and Rest: `name` and `description` (in one or several languages), the `minutes` it takes, `speed` (multiplies the rest of the day's march: 0.5 halves it), `fatigue` recovered, and `oncePerDay`. What it rolls are the checks with `at: <its id>`.
- **checks** say when something is rolled: `day-start` (at dawn, before marching), `hex-enter` (entering each hex), `camp` (when camping) or the id of one of the system's own actions (`at: forage`). Give each one a `name` (and a `description`) for players, in one or several languages — `name: { en: Getting lost, es: Perderse }` — or the trip panel and journal show its event id. `when` / `unless` use the same conditions as tables, with `edges` being the roads or rivers of the stretch: the one just walked when entering a hex, the one ahead at dawn and in camp.
- **bindings** connect each check (by its event name, any name you like) to a table of the pack.
- **stats** are numbers of the party that appear in the trip panel (e.g. Kal-Arath's Presence); tables read them by key: `roll: '2d6 + {{luck}}'`.

Checks without a binding wait in the journal for you to resolve them yourself.

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

- The **terrain** table sees the hex you stand on: `terrain`, its tags, fields and region, plus `hex` (the hex being decided). It answers with `set: { terrain: hills }`; `set: { terrain: '{{terrain}}' }` copies the current one.
- The **contents** table sees the entered hex. Its text becomes a point of interest; `set: { poi: false }` means nothing worth noting, `set: { poi: 'A name' }` names it differently. `tags` (one or a list) and `name` are written on the hex too.
- Party stats and today's values are in the context of both, as in checks.

The Grey Marches' `discovery.yaml` is a full example: terrain that tends to go on, families of land, a landmark found only once.

## 8. Trying it

1. In the Oracle app, roll each table with values typed in **Context** (terrain, season…) to check the results.
2. Serve both apps from the same site (`make serve`), open the Hexmapper, Play → **With rules**, pick your pack as the rules, place the party and travel: the journal shows each check and its result.
3. Problems in the travel rules or bindings appear in the pack page, like any other.

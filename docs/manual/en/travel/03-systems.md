# Making a system

A travel system is two definitions in a pack, usually in one file: **travel rules** (`kind: travel-rules`) and **bindings** (`kind: bindings`); its pack may also bring a calendar (`kind: calendar`), weather models (`kind: weather`) and roll modes (`kind: roll-modes`). A **system** definition (`kind: system`, in `system.yaml`) names which of them it uses and which packs' tables it brings; a pack can declare several systems: see [Systems](../technical/07-kinds.md#systems). Every kind is in [Kinds of definition](../technical/07-kinds.md). [Connecting tables to maps and trips](../oracle/07-connecting.md) explains every part of both, step by step, with examples.

## A new system

Write a name in the box at the bottom of the system list and press **+**. It creates one of your packs with the Generic rules to start from and empty bindings (in `travel.yaml`) and the system that names them (in `system.yaml`), and opens its **YAML** tab. The system is ready to play right away in this app and in the Hexmapper (in the same browser).

## Your first system, step by step

A small system for a game where the party carries torches, can get lost in the woods and must rest when tired. Each step is done in the forms (or the same in YAML), and **Play** tries it at once.

1. **Create it**: type _Dark Woods_ under the system list and press **+**. It starts from the Generic rules: walking 30 km a day, eating 1 food as each day ends.
2. **A supply**: in **Rules → Supplies**, add `torches` with **Min** `0`. Now the trip panel shows Torches, and the player can change them by hand.
3. **Spend it**: open the action **eat** (it runs by itself at `day-end`) and add a step `effects: { party.resources.torches: -1 }`. Each day now burns a torch too.
4. **Being lost**: in **Values of the day**, add `lost` and, in **Blocks**, `travel`. A table that sets `lost: true` will stop the party for the rest of the day.
5. **A check**: in **Checks**, **Add a check**: event `LOST_CHECK`, **When** `day-start`, **Only if** `terrain: forest`. In **Rolled on**, pick a table of yours whose bad result has **Sets** `lost: true` (make it in the Oracle app: _1d6_, 1–2 sets `lost: true`).
6. **Fatigue**: in **Checks → Party stats**, add `fatigue`, starting at `0` (its minimum, `min: 0`, is written in YAML). Then a check **When** `day-end`, **Only if** `below: torches`, **Changes** `party.stats.fatigue: 1`: a day without torches tires the party.
7. **Resting only when tired**: open **rest**: **Only when** `party.stats.fatigue: { gte: 1 }`; steps `time: 120` and `effects: { party.stats.fatigue: -1 }`. The button is off while the party is fresh, and says why.
8. **Try it**: **Play** → a way of three hexes, the middle one `forest`; travel and read the journal: the lost check at dawn in the forest, the torches going down each night, the rest button turning on once tired.

The same system in YAML (the **YAML** tab shows it like this):

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 }, forest: { multiplier: 0.5 } }
modes: { foot: { kmPerDay: 30 } }
resources:
  food: { min: 0 }
  torches: { min: 0 } # step 2
values:
  lost: { blocks: [travel] } # step 4
actions:
  camp: { do: [{ time: dawn }] }
  rest: # step 7
    when: { party.stats.fatigue: { gte: 1 } }
    do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }]
  eat:
    on: day-end
    do:
      - { effects: { party.resources.food: -1 } }
      - { effects: { party.resources.torches: -1 } } # step 3
checks:
  - { event: LOST_CHECK, at: day-start, when: { terrain: forest } } # step 5
  - {
      event: NO_TORCHES,
      at: day-end,
      when: { below: torches },
      effects: { party.stats.fatigue: 1 },
    } # step 6
---
kind: bindings
id: default
stats:
  fatigue: { name: Fatigue, default: 0, min: 0 } # step 6
on:
  LOST_CHECK: { resolve: dark-lost }
---
kind: table # step 5, made in the Oracle app
id: dark-lost
roll: 1d6
entries:
  - { range: 1-2, result: Lost among the trees, set: { lost: true } }
  - { range: 3-6, result: The path holds }
```

The Grey Marches do all of this and much more; their [page](../packs/02-grey-marches.md) says where each part is.

## Changing it with forms

- **Rules**: the day (dawn, nightfall, marching hours, and **At nightfall, while waiting**: the action the party takes when night falls while the world clock moves, camp by default; when its conditions don't hold, the night passes without it), the ways of travelling (km per day, **Only through**: where it can go, a condition on each hex it enters, e.g. the Grey Marches' boat on water or coast, `any: [{ water: true }, { terrain: coast }]`, or a cart only by road, `edges: road`; and **Only when**: where and when it can be chosen, e.g. the Grey Marches' boat only at the water's edge or the ferry, `any: [{ water: true }, { terrain: coast }, { tags: ferry }]`; **Not when**: when it can't), how each terrain and each road or river changes the speed and whether a terrain can be entered (**Passable**, and **Open when** / **Closed when**; **Speed × for terrains not listed** covers any terrain the map uses that isn't in the list: conditions on the hex entered and the moment, e.g. the Grey Marches' peaks, open only in summer and closed in snow or storm, `season: summer` / `weather: [snow, storm]`; water hexes have the same), the supplies (with their **Min** and **Max**), how each weather slows you down, the **values of the day** and the **actions**. Help next to each part explains it. Supplies are used by the system's own actions, checks and tables, never by the app: the Grey Marches eat with an action the system takes at the end of each day (1 food, and 1 fodder on horseback). **Min** and **Max** bound a supply: a change past one stops there, the journal says so, and the system's rules can react (the Grey Marches: a day-end check, fatigue +1, when food hit its minimum). Older systems that used supplies **per day** show a note with **Convert**, which writes the same as such an action. Grey text in an empty box is only the default or a hint, not a value.
  - **Values of the day**: values tables can set for the rest of the day, each with a name and what it **blocks** while it holds (travel, one of the system's actions, or a way of travelling as `mode.<id>`; the box suggests what the system declares: `mode.horse` leaves the horses behind while it holds). The Grey Marches declare **Lost**, which blocks travel: the getting-lost table sets it, and the trip's Travel buttons stay disabled until the next day, saying why.
  - **Actions**: all alike, camp and rest too (**Add an action**; × removes one; the arrows move a step up or down), as cards: an id, a name and description for players, **Only when** / **Not when** (when the button can be pressed: e.g. the Grey Marches' Forage for food, not in a storm), **Once a day**, **By itself at** (empty: the player takes it, with a button; or the moments the system takes it by itself, written like in the YAML with suggestions: `day-start`, `hex-enter`, `day-end` or another action's id, several separated by commas, e.g. the Grey Marches' Eat, `day-end`; the words below the box say it back), what the journal says when none of its checks apply, and **What it does**, step by step, each written like in the YAML with suggestions: `time: 180` (or `dawn`, `nightfall`, `14:00`), `speed: 0.5`, `effects: { party.stats.fatigue: -1 }`, `set: { lost: true }`, `do: forage` (another action, if its conditions hold) and `roll: <check>` (a check, now). A step can have its own condition: the Grey Marches' camp sleeps until dawn and, **unless** `below: food` (food ran out at the end of the day), takes off 1 fatigue. The actions that follow it and its checks (in Checks, at this action) come first. All of it, with the YAML: [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).
- **Checks**: each check with its **name** and **description** for players (shown in the trip panel and the journal instead of the event id), when it happens (**When**, written like in the YAML with suggestions: `day-start`, `hex-enter`, `day-end`, one of the system's actions such as `camp`, or several separated by commas, e.g. the Grey Marches' encounters, `hex-enter, rest`; empty: only when a step rolls it), its conditions (**Only if** / **Skip if**, e.g. the Grey Marches' getting lost, skipped on roads and rivers: `edges: [road, river]`), what resolves it (any table, oracle, generator or deck, grouped by kind, or a weather model, under _Weather with inertia_; e.g. the Grey Marches' ford is rolled on an oracle), **Extra context** (values its table sees only for this check, e.g. `timeOfDay: night` to roll a night encounter on the day's table, or `danger: 3` as if the hex were more dangerous), **Changes** (its own effects, e.g. the Grey Marches' Not enough to eat: `party.stats.fatigue: 1`) and **Pause after it**. Below them, the **Party stats**: each with an id, a **Name** and **Description** for players and the value it **Starts at** (**Add a stat**; its `min` / `max` are written in YAML). The trip panel shows them and lets the player change them; tables read them in rolls (`1d6 + {{survival}}`) and conditions (`party.stats.morale: { lte: 1 }`), and effects change them (`party.stats.fatigue: 1`). When the bindings still name tables for checks the rules no longer have (a check removed in the YAML), a note lists them and **Remove them** clears them. This tab writes both the travel rules and the bindings, so you don't have to keep them in step: renaming a check takes its table along.

Conditions and context are written as `key: value` pairs, like in tables: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }` (every operator: [Conditions](../technical/08-conditions.md); every piece of syntax at a glance: [Syntax](../technical/09-syntax.md)). Choosing **nothing: wait for me** as the table makes the trip stop and wait for **Continue**; **Pause after it** rolls it and then waits too (see [what makes Continue appear](02-playing.md#the-trip)).

The forms change the YAML file, keeping your comments and order; the **YAML** tab shows the result and marks any problem at its line. Anything the forms don't cover can be written there.

The tables its bindings name go in the same pack: add them in the Oracle app (your new pack is listed there too), or refer to tables of other packs with their full id (`core/weather`).

## Changing a bundled system

Bundled systems are read-only. Under the system's name (on every tab), **Edit a copy** makes a copy of the whole pack you can change; it replaces the bundled one in this browser. Copies of personal-use packs stay personal use. On your edited copy, the same place shows **Revert to bundled**, which discards your changes and goes back to the bundled system (it asks first; ↶ undoes it). When a new version changes the bundled system, your copy says so in the same place and lets you take or keep each change: see [Updates of bundled packs](../oracle/03-packs.md).

**↶ ↷** in the header (or <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> outside text boxes) undo and redo changes to your systems, while the page is open.

## Trying it out

The **Play** tab is the fastest way to check a system: build a short way with the terrains, roads and tags your rules care about, and watch the journal. For example, to test a check with `when: { tags: landmark }`, tag the last hex `landmark` and travel.

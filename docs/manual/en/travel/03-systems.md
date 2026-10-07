# Making a system

A travel system is two definitions in a pack, usually in one file: **travel rules** (`kind: travel-rules`) and **bindings** (`kind: bindings`); its pack may also bring a calendar (`kind: calendar`), weather models (`kind: weather`) and roll modes (`kind: roll-modes`). Every kind is in [Kinds of definition](../technical/07-kinds.md). [Connecting tables to maps and trips](../oracle/07-connecting.md) explains every part of both, step by step, with examples.

## A new system

Write a name in the box at the bottom of the system list and press **+**. It creates one of your packs with the Generic rules to start from and empty bindings, and opens its **YAML** tab. The system is ready to play right away in this app and in the Hexmapper (in the same browser).

## Changing it with forms

- **Rules**: the day (dawn, nightfall, marching hours), the ways of travelling (km per day, what each uses daily, which terrains it can cross), how each terrain and each road or river changes the speed, the supplies used per day, how each weather slows you down, the **values of the day** and the **actions**. Help next to each part explains it. Supplies used: **Supplies → Per day** is what everyone uses daily (the Grey Marches: food 1, fodder 0), and a way of travelling adds its own in **Uses per day** (their horses: `fodder: 1`, so riding uses food and fodder, walking only food); what running short does is the system's own rule (the Grey Marches: a day-end check, fatigue +1). Grey text in an empty box is only the default or a hint, not a value.
  - **Values of the day**: values tables can set for the rest of the day, each with a name and what it **blocks** while it holds (travel, camp, rest or an action). The Grey Marches declare **Lost**, which blocks travel: the getting-lost table sets it, and the trip's Travel buttons stay disabled until the next day, saying why.
  - **Actions**: camp, rest (each can be turned off) and the system's own (**Add an action**), as cards: a name and description for players, **Only when** / **Not when** (when the button can be pressed: e.g. the Grey Marches' Forage for food, not in a storm), **Once a day**, what the journal says when none of its checks apply, and **What it does**, step by step: **Time passes** (minutes, dawn, nightfall or a time like 14:00), **Eat the day's supplies**, **Today's march ×**, **Changes** (effects on the party). A step can have its own condition: the Grey Marches' camp eats, sleeps until dawn and, **only when** `short: false` (nothing ran out), takes off 1 fatigue. Its checks (in Checks, at this action) are rolled first. All of it, with the YAML: [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).
- **Checks**: each check with its **name** and **description** for players (shown in the trip panel and the journal instead of the event id), when it happens (at dawn, entering a hex, in camp, or one of the system's own actions), its conditions, what resolves it (any table, oracle, generator or deck, grouped by kind, or a weather model; e.g. the Grey Marches' ford is rolled on an oracle), any extra context, **Changes** (its own effects, e.g. the Grey Marches' Not enough to eat: `party.stats.fatigue: 1`) and **Pause after it**; then the party stats. This tab writes both the travel rules and the bindings, so you don't have to keep them in step: renaming a check takes its table along.

Conditions and context are written as `key: value` pairs, like in tables: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }`. Choosing **nothing: wait for me** as the table makes the trip stop and wait for **Continue**; **Pause after it** rolls it and then waits too (see [what makes Continue appear](02-playing.md#the-trip)).

The forms change the YAML file, keeping your comments and order; the **YAML** tab shows the result and marks any problem at its line. Anything the forms don't cover can be written there.

The tables its bindings name go in the same pack: add them in the Oracle app (your new pack is listed there too), or refer to tables of other packs with their full id (`core/weather`).

## Changing a bundled system

Bundled systems are read-only. Under the system's name (on every tab), **Edit a copy** makes a copy of the whole pack you can change; it replaces the bundled one in this browser. Copies of personal-use packs stay personal use. On your edited copy, the same place shows **Revert to bundled**, which discards your changes and goes back to the bundled system (it asks first; ↶ undoes it). When a new version changes the bundled system, your copy says so in the same place and lets you take or keep each change: see [Updates of bundled packs](../oracle/03-packs.md).

**↶ ↷** in the header (or <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> outside text boxes) undo and redo changes to your systems, while the page is open.

## Trying it out

The **Play** tab is the fastest way to check a system: build a short way with the terrains, roads and tags your rules care about, and watch the journal. For example, to test a check with `when: { tags: landmark }`, tag the last hex `landmark` and travel.

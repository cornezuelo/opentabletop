# Making a system

A travel system is two definitions in a pack, usually in one file: **travel rules** (`kind: travel-rules`) and **bindings** (`kind: bindings`). [Connecting tables to maps and trips](../oracle/07-connecting.md) explains every part of both, step by step, with examples.

## A new system

Write a name in the box at the bottom of the system list and press **+**. It creates one of your packs with the Generic rules to start from and empty bindings, and opens its **YAML** tab. The system is ready to play right away in this app and in the Hexmapper (in the same browser).

## Changing it with forms

- **Rules**: the day (dawn, nightfall, marching hours), the ways of travelling (km per day, what each uses daily, which terrains it can cross), how each terrain and each road or river changes the speed, the supplies used per day, how each weather slows you down, whether the party can camp and rest, and **actions of this system** (buttons of its own, like the Grey Marches' **Forage**: time, today's speed, fatigue, once a day). The **i** next to each part explains it.
- **Checks**: each check with when it happens (at dawn, entering a hex, in camp, or one of the system's own actions), its conditions, the table that resolves it and any extra context; then the party stats. This tab writes both the travel rules and the bindings, so you don't have to keep them in step: renaming a check takes its table along.

Conditions and context are written as `key: value` pairs, like in tables: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }`. Choosing **nothing: wait for me** as the table makes the trip stop and wait for **Continue**.

The forms change the YAML file, keeping your comments and order; the **YAML** tab shows the result and marks any problem at its line. Anything the forms don't cover can be written there.

The tables its bindings name go in the same pack: add them in the Oracle app (your new pack is listed there too), or refer to tables of other packs with their full id (`core/weather`).

## Changing a bundled system

Bundled systems are read-only. In their **Rules**, **Checks** or **YAML** tab, **Edit a copy** makes a copy of the whole pack you can change; it replaces the bundled one in this browser. Copies of personal-use packs stay personal use.

**↶ ↷** in the header (or <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> outside text boxes) undo and redo changes to your systems, while the page is open.

## Trying it out

The **Play** tab is the fastest way to check a system: build a short way with the terrains, roads and tags your rules care about, and watch the journal. For example, to test a check with `when: { tags: landmark }`, tag the last hex `landmark` and travel.

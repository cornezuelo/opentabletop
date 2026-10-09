# Making a system

A system is a few definitions in a pack: **travel rules** (`kind: travel-rules`: the day, speeds, supplies, actions, checks) and **bindings** (`kind: bindings`: which table answers each check), and, if it wants them, a characters' **sheet**, **factions**, a **calendar**, **weather** models and **roll modes**. A **system** definition (`kind: system`, in `system.yaml`) names which of them it plays with and which packs' tables it brings. You don't need to write any of it by hand: each tab of the app edits one part with forms. Every kind is in [Kinds of definition](../technical/07-kinds.md); [Connecting tables to maps and trips](../oracle/07-connecting.md) explains the travel rules and bindings in YAML, with examples.

## A new system

Write a name in the box at the bottom of the system list and press **+**. It creates one of your packs with the Generic rules to start from and empty bindings (in `travel.yaml`) and the system that names them (in `system.yaml`), and opens its **Overview**. The system is ready to play right away in the Travel app and in the Hexmapper (in the same browser): **Play it in Travel →**, under its name, opens its trip in Travel.

To learn by doing, [Your first system](03-your-first-system.md) builds a small one step by step.

## The tabs

Each tab has its own page:

- [**Overview**](04-overview.md): its name, the parts it plays with, the packs it brings, its example maps, and exporting it as a file.
- [**Rules**](05-rules.md): the day, ways of travelling, terrains, roads and rivers, supplies, weather's speed, values of the day and actions.
- [**Checks**](06-checks.md): what is rolled on the way and when, the party's stats, journey roles and supplies the characters carry.
- [**Sheet**](07-sheet.md): what each character has.
- [**Factions**](08-factions.md): the powers of its world and their turns.
- [**Calendar**](09-calendar.md): months, weekdays, moons and holidays.
- [**Weather**](10-weather.md): weather with inertia, season by season.
- [**Roll modes**](11-roll-modes.md): advantage, disadvantage and the like.
- [**Try it**](12-try-it.md): a trip without a map, to test it as you make it.
- [**YAML**](13-yaml.md): the files the forms write, for anything they don't cover.

## Changing a bundled system

Bundled systems are read-only. Under the system's name (on every tab), **Edit a copy** makes a copy of the whole pack you can change; it replaces the bundled one in this browser. Copies of personal-use packs stay personal use. On your edited copy, the same place shows **Revert to bundled**, which discards your changes and goes back to the bundled system (it asks first; ↶ undoes it). When a new version changes the bundled system, your copy says so in the same place and lets you take or keep each change: see [Updates of bundled packs](../oracle/03-packs.md).

**↶ ↷** in the header (or <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> outside text boxes) undo and redo changes to your systems, while the page is open.

Read on: [Your first system](03-your-first-system.md).

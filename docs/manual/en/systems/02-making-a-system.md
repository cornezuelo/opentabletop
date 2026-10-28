# Making a system

A system is a few definitions in a pack: **travel rules** (`kind: travel-rules`: the day, speeds, actions, checks) and **bindings** (`kind: bindings`: which table answers each check), and, if it wants them, a characters' **sheet** and the party's own (what the party carries: food, water…), **factions**, a **calendar**, **weather** models and **roll modes**. A **system** definition (`kind: system`, in `system.yaml`) names which of them it plays with and which packs' tables it brings. You don't need to write any of it by hand: each tab of the app edits one part with forms. Every kind is in [Kinds of definition](../technical/07-kinds.md); [Connecting tables to maps and trips](../oracle/07-connecting.md) explains the travel rules and bindings in YAML, with examples.

## A new system

Write a name in the box at the bottom of the system list and press **+**. It creates one of your packs with a copy of the Generic rules (Core's) to start from and empty bindings (in `travel.yaml`) and the system that names them and Core's calendar, whose parts of the day those rules name (in `system.yaml`; the pack depends on Core), and opens its **Overview**. The system is ready to play right away in the Travel app and in the Hexmapper (in the same browser): **Play it in Travel →**, under its name, opens its trip in Travel.

To learn by doing, [Your first system](03-your-first-system.md) builds a small one step by step.

## The tabs

Each tab has its own page:

- [**Overview**](04-overview.md): its name, the parts it plays with, the packs it brings, its example maps, and exporting it as a file.
- [**Rules**](05-rules.md): the day, ways of travelling, terrains, roads and rivers, weather's speed, values of the day and actions.
- [**Checks**](06-checks.md): what is rolled on the way and when, the party's stats and journey roles.
- [**Sheet**](07-sheet.md): what each character has, and the party itself.
- [**Items**](08-items.md): what its characters may carry, in catalogues.
- [**Factions**](09-factions.md): the powers of its world and their turns.
- [**Clocks**](10-clocks.md): the progress clocks its world starts with, and what becomes of each once full.
- [**World**](11-world.md): what its world does by itself: when a clock fills, after every world turn, as something turns true.
- [**Calendar**](12-calendar.md): months, weekdays, moons and holidays.
- [**Weather**](13-weather.md): weather with inertia, season by season.
- [**Land**](14-land.md): terrain with memory, to generate and discover land.
- [**Roll modes**](15-roll-modes.md): advantage, disadvantage and the like.
- [**Try it**](16-try-it.md): a trip without a map, to test it as you make it.
- [**YAML**](17-yaml.md): the files the forms write, for anything they don't cover.

## Changing a bundled system

Bundled systems are read-only. Under the system's name (on every tab), **Edit a copy** makes a copy of the whole pack you can change; it replaces the bundled one in this browser. Copies of personal-use packs stay personal use. What a tab shows from another pack the system brings (Core's roll modes) is that pack's: read-only, with no copy, since every system that brings it shares it. On your edited copy, the same place shows **Revert to bundled**, which discards your changes and goes back to the bundled system (it asks first; ↶ undoes it). When a new version changes the bundled system, your copy says so in the same place and lets you take or keep each change: see [Updates of bundled packs](../oracle/03-packs.md).

**Long lists are folded cards.** Actions, checks, ways of travelling, terrains, a sheet's values and relations, factions, clocks… come as cards, each saying in one line what it is (its name, its id and its fields that say something: _Peaks_ `peaks`: _Speed ×: 0.25 · Open when: time.season is summer_). Click one to unfold it: its fields in two columns, conditions and changes as rows. **Unfold all** / **Fold all** do every card, and with many, a search box finds those holding every word you type. Short lists (roads and rivers, values of the day, a sheet's conditions) stay a table.

**↶ ↷** in the header (or <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> outside text boxes) undo and redo changes to your systems, while the page is open.

Read on: [Your first system](03-your-first-system.md).

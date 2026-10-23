# Getting started

The Systems app is where game systems are made and edited. A **system** is what a game is played with: its travel rules (how fast you go, what you carry, what the party can do, what is rolled on the way), the bindings that say which table answers each check, and the calendar, weather and packs it brings. Every app plays the same systems: the [Travel app](../travel/01-getting-started.md) without a map, the Hexmapper on one (**Map settings → Campaign → System**).

## The screen

- **Header**: the app switcher (nine dots), **↶ ↷** (undo and redo changes to your packs), the gear (**Preferences**: language and notes app, shared by every app) and **?** for this manual. The small tabs on the edges of the middle column (‹ ›) fold the systems list and the help column away, and bring them back.
- **Systems** (left): every system of your packs, the **Generic rules** (Core's) first, with the same badges as in the Oracle app (_bundled_, _edited_, _yours_, _personal use_, _update_) and a red number when its files have problems. The box at the bottom creates a new system, and **Import a system (.zip)…** adds one exported from another browser (see [Taking it elsewhere](04-overview.md#taking-it-elsewhere)). The app opens on the system you last chose here, in Travel or in the Oracle (this browser remembers it).
- **System** (center): under its name, **Play it in Travel →** opens it in the Travel app, and on a bundled system **Edit a copy**; then its tabs, each with its page: [**Overview**](04-overview.md) (its name, its parts and the packs it brings), [**Rules**](05-rules.md), [**Checks**](06-checks.md), [**Sheet**](07-sheet.md) (what its characters have), [**Items**](08-items.md) (what they may carry), [**Factions**](09-factions.md) (the powers of its world), [**Clocks**](10-clocks.md) (its world's progress clocks), [**Calendar**](11-calendar.md), [**Weather**](12-weather.md) and [**Roll modes**](13-roll-modes.md) change it with forms, [**Try it**](14-try-it.md) plays a trip without a map with it as it is now, [**YAML**](15-yaml.md) shows the files of its parts.

**Help where you are**: a label underlined with dots has an explanation, often with examples of what to write. Click it and the help column (**?**) opens on it, in place of this manual: what the field does, examples that work and, under **In the manual**, the manual's sections about it (the Syntax page first); **← The manual** goes back to the manual. From a field, <kbd>F1</kbd> shows its help. Moving to another field doesn't change what the column shows, so a click on an example there inserts it into the field you're writing in.

**Examples go in with a click**: after you've been in a text box or the YAML editor, click an example in `code` in the help column (in a field's help, on the **Syntax** page or anywhere in the manual) and it goes in where the cursor was; **Ctrl+Z** takes it back. **Syntax**, next to the column's search box, opens the page with everything a pack can write. The search looks in this app's pages, the technical ones and the packs', and shows the words found in bold. Buttons with only an icon say their name when you hover them.

## Systems you have

- **Generic rules**: Core's system, the one a map plays when it chooses none: plain travel whose one check rolls the weather each morning (rain, a storm or snow slow the march); the party eats 1 food as each day ends. Read-only here, as every system may bring Core (its tabs and its **YAML** show what it is); a new system starts from a copy of its rules. What each part does: [Core](../packs/01-core.md#the-generic-rules).
- **The Grey Marches**: the bundled example, a small frontier with its own rules, using every feature. See [The Grey Marches](../packs/02-grey-marches.md).
- Systems from your packs, personal-use ones included (see [Packs](../oracle/03-packs.md)).

Read on: [Making a system](02-making-a-system.md), with a page for each tab.

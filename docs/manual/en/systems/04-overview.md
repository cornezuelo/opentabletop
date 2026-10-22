# Overview

The **Overview** tab is the system's own definition (`kind: system`, in `system.yaml`): what it's called, what it plays with and what it brings. A system of an older pack (travel rules and no `kind: system`) shows **Declare it** instead: it writes `system.yaml` naming what the system uses today, and plays the same.

## Name and description

Its **Name** and **Description**, as every app shows them (in the interface's language: the pack's own, or its translation).

## Its parts

- **Travel rules**, **Bindings** and **Calendar**: the ones it plays with, each chosen among this pack's (by id) and its dependencies' (`core/default`), listed by name when they have one (_The Royal Reckoning (royal-reckoning)_). **Open** goes to the tab that edits them; **Create** makes new travel rules (a copy of the Generic ones, naming Core's calendar too when the system has none and depends on Core) or empty bindings and names them.
- **Weather models**: the ones its bindings can name (`weather: weather.highland-skies`), each with its name and id. They're edited in [Weather](11-weather.md).

## Packs it brings

Its own always, and the dependencies you tick, whose tables come with it: a map playing it shows them in its Oracle panel. To bring another pack, add it to the dependencies in `pack.yaml`.

## Example maps

Maps to play the system on, kept in its pack (`maps:`):

- **Open in the Hexmapper →** opens one there as its **Maps → Example maps** would.
- **Add a map file…** copies a map file the Hexmapper's **Save** wrote into the pack's `maps/` folder.
- **Remove** takes it out of the pack.

Maps whose files name the same campaign (saved from maps of one campaign) open in it together, sharing its world clock and factions.

## Find a name

A system names things in one place and uses them in many: a stat declared in Checks is read by tables, changed by actions and made of the characters' values. **Find a name** lists every place in the system's packs that uses a name, tables, oracles, generators and decks included, which no other tab shows. Type it as written (`pathfinding`) or by its full name (`party.stats.morale`, which also finds it where it's written short, `morale`); the box suggests every name the packs use.

Each line says how the place uses it, then which place it is and the part of it:

- **reads it**: a condition or a `{{…}}` (`when`, `modeWhen.advantage`, a table's `roll`);
- **changes it**: effects (`entries.bandits.effects`);
- **sets it**: `set`, a value of the day (`do[3].set`);
- **is made of it**: a party stat's **From the sheets**, or a supply the characters carry.

An action or a check opens its tab here; a table, oracle, generator or deck opens in the Oracle (↗). A name that nothing in the system declares, and that the apps don't give either (`hex.…`, `trip.…`, `time.…`), says so, with the names it looks like: often a typo (`pathfindng` for `pathfinding`).

What it doesn't see: what a map gives (a hex's or an icon's own values), what the apps read by themselves (the hours marched, for the day's march), and the ids of actions, ways of travelling or terrains used as values.

## Used by

The rows of what a system declares have a **Used by** column with the same lists: party stats and journey roles in [Checks](06-checks.md); ways of travelling, terrains, roads and rivers, supplies, kinds of weather, values of the day and each action in [Rules](05-rules.md); each [sheet](07-sheet.md)'s values and conditions; [factions](08-factions.md); and [clocks](09-clocks.md). Besides reading, changing, setting or being made of something, a place may **name** it: an action taken by another's step (`do: actions.march`), a way of travelling a value blocks (`blocks: [modes.horse]`), a table another rolls (`roll: table.ruins`, a table entry's next table). A check has none: its moments take it, and its card says them. Its number is how many places use the row; press it to see them under the row. **–** means nothing uses it yet: often fine (a value only the player reads), sometimes a slip (a stat no table reads, a name written differently).

In the Grey Marches, the companions' **Pathfinding** (Sheet) shows two places: the party stat Navigation is made of it (the best among them), and the table _Do we get lost?_ reads the guide's (`roles.guide.values.pathfinding`, in its roll mode by itself: advantage).

## Taking it elsewhere

Your systems live only in this browser. To keep one safe, take it to another browser or give it to someone, the Overview ends with **Take it elsewhere**: it lists what the file holds and **Export as .zip** downloads it. The .zip holds every pack the system needs, each in its own folder: its own pack, the packs it brings, those its parts are written in and their dependencies, as far as they go. The Grey Marches' file, for instance, holds the Grey Marches and Core.

**Import a system (.zip)…**, under the systems list, reads such a file back and opens the system it brought (the Oracle's **Import .zip** reads it too):

- packs you don't have are added to yours;
- packs already here and unchanged (a bundled Core, say) are left as they are;
- a pack you have in a different version is replaced only after asking: a user pack is overwritten, a bundled one gets your imported copy over it (**Revert to bundled** brings it back). **↶** undoes the whole import in one step.

A system that uses personal-use packs says so next to the button: keep that file for yourself. The file's layout is in [File formats](../technical/02-file-formats.md#packs).

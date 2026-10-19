# The Factions app — design

Backlog item 11, phase (c). **Agreed with the author 2026-10-19** (§6).

## 1. Where we are

- Factions are declared by a system (`kind: factions`, see [faction-engine.md](faction-engine.md)) and **live in a map**: `map.factions` (`MapFactions`: the system they came from, each faction as a `CharacterState` of the factions' sheet, `territories` as hex keys of that map, `lastTurn`, `auto`).
- Everything about them is in the Hexmapper's **World** view (`FactionsPanel`): bring them from the system, each one's land (count, painting), its sheet as a full `CharacterCard`, **World turn**, turns by themselves as the world clock moves, and what they did in the world clock's timeline.
- Travel has no world clock and no factions.
- The map model (types, migrations, serializing) lives in `apps/hexmapper/src/lib/model`, so no other app can read a map. The Hexmapper saves the open map with every change and never reads it back while open.

## 2. Factions stay in each map

Decided (§6.1): the app works on **the maps of the library**. A faction's land is hexes of one map, and its turns use that map's world clock, Oracle state and timeline, so no new storage, format or syncing. A faction that should appear on several maps is declared once by the system and brought onto each map.

## 3. The Factions app

`apps/factions`, the sixth app in the switcher, with its manual (`docs/manual/<locale>/factions/`) and help column like the rest.

- **Maps** (left column, folds): the library's maps that have factions, or whose system declares them, with a search box. A map whose system declares factions but has none yet offers **Bring the system's factions** (as the World view does).
- **The map's factions** (middle):
  - a **minimap** (SVG, read-only): the map's hexes in grey, each faction's land in its colour; hovering a faction in the list lights its land. **Paint in the Hexmapper ↗** opens the map in the World view with that faction's brush (§6.2).
  - each faction as a card: colour, name, what the system says it is, the size of its land, its full `CharacterCard` (values, tracks, conditions, tags, relations), **Notes** (`noteRef`).
  - **World turn**, with **Turns by themselves** (`auto`) and when the next is due; a turn is played at the map's world clock as it is now. The app doesn't move time: the clock moves in the Hexmapper (or a trip), and turns that fall due then are played there.
  - **What they did**: the timeline's world-turn lines, newest first.
- **Edit the factions in Systems →** beside the system's name (definitions stay in Systems, as sheets do for Characters).
- Deep links: `#/map/<mapId>` and `#/map/<mapId>/<faction>`.

## 4. The Hexmapper's World view, compacted

Decided (§6.4): a line per faction (colour, name, size of its land), its brush, **World turn** and **Turns by themselves**, **Open in Factions ↗** (the map, or one faction). The full sheets move to the app. The World view keeps **Bring the system's factions** and **Remove**. Its deep link gains the brush: `#/<mapId>?brush=<faction>` opens the World view painting it.

## 5. Two apps, one map

- **The map model goes to a package**, `@open-tabletop/map` (types, defaults, migrations, serializing, hexes, tokens), so the Hexmapper and Factions read and write the same maps with the same migrations. The world turn on a map (`takeWorldTurn`, the territory world from the grid and its water, bringing factions) becomes plain functions there that take a map and return it, tested headless; the Hexmapper's `play/factions.ts` wraps them with its editor.
- **Changes are announced**: the map library posts on a `BroadcastChannel` (`opentabletop.maps`) when a map is written. An app holding that map open, with no unsaved change, reads it again; the Hexmapper does so too (outside the undo history, like any play change), so a turn played in Factions shows on the open map at once. If both changed it, the last write wins, and the one that loses says so with a toast.

## 6. Decided with the author (2026-10-19)

1. **Factions stay in each map**, not in a shared library like the roster.
2. **Territory**: a read-only minimap in the app, painted in the Hexmapper (a link opens it with the brush).
3. **World turns** are played from the app too, with their timeline.
4. **The Hexmapper's World view is compacted**: a line per faction, painting, turns, and a link to the app; the full sheets live in the app.

## 7. Phases

1. **The map package**: `@open-tabletop/map` out of the Hexmapper (no format change; `old-maps` still pass), the world turn on a map as plain functions with tests, the library's `BroadcastChannel` and the Hexmapper reloading a map changed elsewhere.
2. **The Factions app**: maps, minimap, cards, notes, world turn and timeline, links; the switcher, Makefile, `make serve`; manual en/es.
3. **The Hexmapper's World view** compacted, **Open in Factions**, the brush deep link; Hexmapper's World page en/es.
4. **The bundled packs**: the Grey Marches' and Core's pages say where their factions are played; a test that plays a world turn on the example map through the app layer and sees it in the Hexmapper.

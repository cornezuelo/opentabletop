# Getting started

Hexmapper draws hex maps for hexcrawls and sandbox campaigns, and lets you play trips on them. Everything stays in your browser: no account, no server. It can be installed and works offline: see [Installing and playing offline](../technical/06-install-and-offline.md).

## The screen

- **Toolbar** (left): the tools at the top — Select, Terrain, Regions, Roads and rivers, Icons, Text, Tokens, Play and the Oracle — and at the bottom: Settings, Layers, Help (?), Undo, Redo, Fit, New, Maps, Save and Export.
- **Map** (center): drag with the middle button or <kbd>Space</kbd> + drag to pan, use the wheel to zoom, <kbd>F</kbd> fits the whole map.
- **Side panel** (right): what the active tool edits — the selected hex with Select, the palette with Terrain, the selected token with Tokens… — or Settings, Layers, Help, the Oracle and the other views of the bottom buttons. Changing tools deselects what the previous one had selected. The button with nine dots next to the map name opens the other OpenTabletop apps.

Every tool has a key: hover a toolbar button to see it, or read [Keyboard shortcuts](11-shortcuts.md).

## Your maps

Maps are kept in this browser's library and saved automatically while you work. **Maps** (the folder button) lists them: open one, delete it from this browser or copy its link; **Import file…** opens a saved file. Under **Example maps**, _The Grey Marches_ is a ready map to play and to learn from (see [The Grey Marches](../packs/02-grey-marches.md)).

**Save** writes the map to a file (`.otd.json`, OpenTabletop Data) to back it up or share it; **Maps → Import file…** (or <kbd>Ctrl</kbd>+<kbd>O</kbd>) opens one again. If the file is a map this browser already has (say, an older backup) and they differ, Hexmapper asks whether to **replace** your copy with the file or **keep both** (the file opens as a separate map).

> Clearing the browser's data deletes its library: save files of the maps you care about, or a [backup of everything](../technical/05-backups.md) (app switcher → **Save a backup**).

## Undo and settings

<kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes and <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redoes every edit (a whole brush stroke is one step). Playing a trip is not part of undo: it has its own journal.

**Settings** (gear) holds the map name, the grid (flat or pointy hexes, coordinates), its size (by number of hexes or by paper), the world scale (km per hex, used for travel) and your preferences: language and the notes app you link to.

## Links to hexes

Every hex has a link (the chain icon next to its coordinate). Paste it in your notes: opening it shows the map with that hex selected.

The link carries the map's id. If this browser doesn't have the map (another device, or its data was cleared), Hexmapper tells you which file it needs — `<map id>.otd.json`, the name **Save** gives it — and offers to open it; once it's loaded you land on the hex.

# Getting started

Hexmapper draws hex maps for hexcrawls and sandbox campaigns, and lets you play trips on them. Everything stays in your browser: no account, no server. It can be installed and works offline: see [Installing and playing offline](../technical/06-install-and-offline.md).

## The screen

- **Top bar**, like in every app: on the left the app (the open map's name is in the window's title, "Hexmapper - The Grey Marches") and the button with nine dots that opens the other OpenTabletop apps; on the right Undo, Redo and Fit, then New, Maps, Save and Export, then Layers, Map settings, the gear (**Preferences**, shared by every app: language and notes app) and Help (?).
- **Toolbar** (left): the tools — Select, Terrain, Regions, Roads and rivers, Icons, Text, Tokens, Play, the World clock and the Oracle. The small tab on the map's left edge folds it away for more room (the tools' keys still work) and brings it back.
- **Map** (center): drag with the middle button or <kbd>Space</kbd> + drag to pan, use the wheel to zoom, <kbd>F</kbd> fits the whole map.
- **Side panel** (right): what the active tool edits — the selected hex with Select, the palette with Terrain, the selected token with Tokens… — or Settings, Layers, the Oracle and the other views of the top bar's buttons. Changing tools deselects what the previous one had selected. The tab on the map's right edge folds it away and brings it back.
- **Help column** (far right, opened with **?**): this manual, or the explanation of a field, beside the side panel so you see both.

Every tool has a key: hover a toolbar button to see it, or read [Keyboard shortcuts](11-shortcuts.md).

**Help where you are**: a label underlined with dots has an explanation, often with examples of what to write. Click it and the help column (**?**, on the far right) opens on it, in place of this manual: what the field does, examples that work and, under **In the manual**, the manual's sections about it (the Syntax page first); **← The manual** goes back to the manual. From a field, <kbd>F1</kbd> shows its help. Moving to another field doesn't change what the column shows, so a click on an example there inserts it into the field you're writing in.

**Examples go in with a click**: after you've been in a text box or the YAML editor, click an example in `code` in the help column (in a field's help, on the **Syntax** page or anywhere in the manual) and it goes in where the cursor was; **Ctrl+Z** takes it back. **Syntax**, next to the column's search box, opens the page with everything a pack can write. The search looks in this app's pages, the technical ones and the packs', and shows the words found in bold. Buttons with only an icon say their name when you hover them.

## Your maps

Maps are kept in this browser's library and saved automatically while you work. A map open in two windows (or changed by another app) stays the same in both: what was played elsewhere (a trip, the world clock, factions, the Oracle) just shows up, and Undo keeps working; if the map itself was edited elsewhere, the window shows that version, says so, and Undo starts again. **Maps** (the folder button) lists them: open one, delete it from this browser or copy its link; **Import file…** opens a saved file. Under **Example maps** are the maps the loaded systems bring (`maps:` in their definition, see [Kinds of definition](../technical/07-kinds.md#systems)), each with the system it's played with: _The Grey Marches_ is a ready map to play and to learn from (see [The Grey Marches](../packs/02-grey-marches.md)).

An example you open becomes **your map**: your changes and your trip are kept in it. Opening the example again asks whether to **go on with yours**, **open it beside yours** (a fresh copy as another map, yours kept) or **start fresh** in its place (yours is lost, and so is its campaign's world, unless another of your maps or trips is in it). Examples whose files name the same campaign (the Grey Marches' two maps) open in it: the second one joins the campaign the first started, with its world clock and factions. If this browser doesn't have the example's campaign but has others with the same name or played with the same system (a map of that game you started before), it asks whether to **Join** one of them (the example's own world clock and factions are left out) or **Start its own**. When a newer version of the app brings a changed example, the list marks it **new version** and the question says so: your map keeps playing as it was, and you choose when to try the new one.

**Save** writes the map to a file (`.otd.json`, OpenTabletop Data) to back it up or share it; **Maps → Import file…** (or <kbd>Ctrl</kbd>+<kbd>O</kbd>) opens one again. If the file is a map this browser already has (say, an older backup) and they differ, Hexmapper asks whether to **replace** your copy with the file or **keep both** (the file opens as a separate map, with a campaign of its own). A file carries its map's [campaign](#campaigns); if this browser already has that campaign (another map of it, a friend's map of your game) and it differs, Hexmapper asks too: **Join it** (the map opens in the campaign kept here, and the file's world clock, factions and Oracle are left out), **Replace mine** (the file's campaign takes the place of the one here, for every map and trip in it) or **Keep apart** (the file's campaign is kept as a new one of its own).

> Clearing the browser's data deletes its library: save files of the maps you care about, or a [backup of everything](../technical/05-backups.md) (app switcher → **Save a backup**), or an [export](../technical/05-backups.md#exporting-and-importing-some-of-it) of the maps and campaigns you choose (app switcher → **Export…**).

## Undo and settings

<kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes and <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redoes every edit (a whole brush stroke is one step). Playing a trip is not part of undo: it has its own journal.

**Map settings** (the folded map) holds the map name, the grid (flat or pointy hexes, coordinates), its size (by number of hexes or by paper), the world scale (km per hex, used for travel; empty, the map is played at its system's scale, and you only write one for a map drawn at another) and its [campaign](#campaigns), with the system it's played with. Your own preferences (language, the notes app you link to) are under the gear, in **Preferences**: they belong to this browser, not to the map.

## Campaigns

A map is the **place**; the world it's played in is its **campaign**: the game system, the world clock (the [World](12-world.md) panel), its weather, the factions and the Oracle (decks drawn, once-only results, hand rolls). Every map and every trip of the Travel app is in one campaign, and the maps and trips of the same campaign share all of that: one date, the same factions (each map keeps the land they hold on it), the same decks. A new map starts in a campaign of its own, named after it, so a map played alone works as it always did. Two campaigns never share a name: a new one whose name is taken gets a number (_North (2)_). Opening a map says, for a moment, which campaign it's in and which maps and trips are in it too. How campaigns come to be, and how to merge two: [Campaign](../campaign/01-getting-started.md#how-campaigns-come-to-be). The [Campaign](../campaign/01-getting-started.md) app shows every campaign this browser keeps, with its world clock, timeline, maps and trips.

**Map settings → Campaign**:

- **The map is in**: **Its own**, or another campaign kept in this browser (a map's, or a Travel trip's). Choosing one moves the map to it. If the map's campaign has a world of its own (a world clock, factions or Oracle rolls), Hexmapper asks which one stays: **Keep the campaign's** (the map's world is left behind, and the map keeps the land of the factions the campaign has) or **Bring this one's** (it takes the place of the campaign's world, system included, for every map and trip in it). When the other campaign has no world yet, the choice is to bring it or **Leave it behind**. The campaign the map leaves is deleted if nothing else is in it; under the choice, **Also in it** names the other maps and trips of the campaign.
- **Campaign name**: how the campaign is called wherever it is chosen (here, Travel, the Oracle).
- **System** and **Packs**: the campaign's, so every map and trip in it plays them. Changing the system asks first if other maps or trips are in the campaign; a trip going on keeps the system it started with until a new one ([Play](08-play.md)).

Moving a map to another campaign, renaming the campaign and changing its system are not part of Undo. One trip goes on in a campaign at a time ([With a trip going on](12-world.md#with-a-trip-going-on)).

## Links to hexes

Every hex has a link (the chain icon next to its coordinate). Paste it in your notes: opening it shows the map with that hex selected.

The link carries the map's id. If this browser doesn't have the map (another device, or its data was cleared), Hexmapper tells you which file it needs — `<map id>.otd.json`, the name **Save** gives it — and offers to open it; once it's loaded you land on the hex.

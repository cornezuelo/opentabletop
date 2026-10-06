# Playing a trip

The **Play** tool (<kbd>P</kbd>) moves your party around the map.

## Simple mode

Just the party token and its trail: click a hex to place the party, click another to move it there. No time, no rolls. **Show trail** draws where it has been; **Clear trail** and **Remove party** reset it.

## With rules

The Travel Engine runs the trip and the Oracle rolls the checks. The [Travel app](../travel/01-getting-started.md) plays the same systems without a map and edits them.

1. Choose the **rules**: Generic, or a system whose pack has travel rules (e.g. Kal-Arath), and the season to **start in**. **New trip** restarts time, supplies and journal, keeping the party where it is.
2. Click a hex to place the party, then click the **destination**: the route is drawn.
3. **Travel** goes on until you arrive, night falls, the day's marching hours run out or a check needs you. **1 hex** moves one hex. **Camp** ends the day; **Rest** is a short pause (each system declares which actions it has).

The panel shows the day, time and season, where the party is, the weather, the marching hours used, the travel mode (on foot, on horseback…), supplies, fatigue and the system's party stats (e.g. Kal-Arath's Presence).

## Checks and the journal

Systems declare their checks (weather at dawn, getting lost, encounters…) and which table resolves each one; the results go to the **journal**, grouped by day. Checks without a table wait for you: **Continue** when you've resolved them yourself.

The bundled **Core** system shows all of it: weather by season, getting lost off roads, encounters that depend on the terrain and the time of day, and a check with no table — tag a hex `landmark` and the trip stops there until you describe the place and press **Continue**.

Terrain, roads and rivers, the hex's tags, fields and region, the season and today's weather all reach the travel rules and the tables, so a system can make forests slower or roads safe from getting lost. What each system does is in its pack: see [Roads, rivers, walls and borders](04-roads-and-rivers.md#what-roads-and-rivers-do-when-you-travel).

## Moving by hand

Drag the party token to put it somewhere else: the trail follows, and during a trip it's a jump (no time passes).

## Discovering the map

With a system that can discover (Core can), tick **Discover the map as you travel**. Start with a blank map: paint only the hex where the party begins and click a destination anywhere. As the party travels, the system's tables decide the **empty** hexes:

- **Terrain**, seen from the land you're on (forest tends to go on as forest).
- **What is there**, the first time you enter a hex: a point of interest, tags (a `landmark` stops Core's trips there), a name. The trip stops when you find something, so you can play it.

**What is discovered**: _the hexes around the party_ (what it sees: their terrain is known before you step in, so routes and speeds are real) or _only the hex the party enters_. The system chooses one; you can change it for your game.

Hexes you painted are never changed, so you can prepare part of the map and leave the rest unknown. Discoveries are part of the game, like the journal: <kbd>Ctrl</kbd>+<kbd>Z</kbd> doesn't undo them; repaint or delete by hand. Only noteworthy finds go in the journal.

To make your own system discover, see [Connecting tables to maps and trips](../oracle/07-connecting.md#7-discovering-the-map).

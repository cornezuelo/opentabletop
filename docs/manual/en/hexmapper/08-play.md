# Playing a trip

The **Play** tool (<kbd>P</kbd>) moves your party around the map. Choosing it selects the party token (switching to the Tokens tool keeps it selected).

## Simple mode

Just the party token and its trail: click a hex to place the party, click another and it jumps straight there: no route, no travel time, nothing happens on the way. No rolls. To walk hex by hex with time, terrain and checks, use **With rules**. **Show trail** draws where it has been, curving like the map's roads and trails (**Straight lines** draws it, and the planned route, from hex centre to hex centre). Both run a little to one side of the hexes' centres, the trail on the left of its way and the route on the right, so they never sit on a road or river they follow, nor on each other; **Clear trail** and **Remove party** reset it.

## With rules

The Travel Engine runs the trip and the Oracle rolls the checks. The [Travel app](../travel/01-getting-started.md) plays the same systems without a map, and the [Systems app](../systems/01-getting-started.md) edits them.

1. Check the **system**: the map's own (**Map settings → Map → System**, the same choice): Generic, or a system of a pack (e.g. the Grey Marches). It brings the travel rules, the tables they roll, the calendar and the weather. Choose the season to **start in**. **New trip** restarts time, supplies and journal, keeping the party where it is; choosing another system here starts a new trip with it and makes it the map's.
2. Click a hex to place the party, then click the **destination**: the route is drawn.
3. **Travel** goes on until you arrive, night falls, the day's marching hours run out or a check needs you. **1 hex** moves one hex. **Camp** sleeps until dawn; **Rest** is a short pause (each system declares which actions it has, and when they can be taken). When the party can't take the night's action (the Grey Marches camp only with food left and fatigue under 10), **Travel** at nightfall (or in a storm that keeps it in) passes the night without it and marches on at dawn. **Wait until dawn** always lets time pass where the party is, living the night: for a day nothing else can be done (lost, no food to camp). The [World clock](12-world.md#with-a-trip-going-on) moves the trip on too: with a route planned, **Next day** travels along it.

The panel shows the day, time and season, where the party is, the weather, the marching hours used, the travel mode (on foot, on horseback…), supplies, fatigue and the system's party stats (e.g. the Grey Marches' Survival).

A trip keeps the system it started with. If the map's system changes later (in **Map settings**, or undoing a change), the panel says so and the trip plays on with its own; **New trip** starts one with the map's.

## Checks and the journal

Systems declare their checks (weather at dawn, getting lost, encounters…) and which table resolves each one; the results go to the **journal**, grouped by day. Checks without a table wait for you: **Continue** when you've resolved them yourself. A check or a result can also pause the trip after rolling ([what makes Continue appear](../travel/02-playing.md#the-trip)). Results show what they changed (Food +1, Morale −1…), and actions, supplies eaten and fatigue are journaled too, also when nothing happens: see [what the journal says](../travel/02-playing.md#the-trip). With the [world clock](12-world.md#with-a-trip-going-on) running, the trip and the world share one time: moving the clock on is waiting where the party is (dawn's checks, eating, camping at night).

The bundled **Grey Marches** show all of it, on their example map (**Maps → Example maps**): weather by season, getting lost off roads, encounters by terrain, region, danger and time of day, a toll on the bridge, a ford rolled on an oracle, a boat on the lake, and checks with no table — the trip stops at the standing stones (`landmark`) until you describe the place and press **Continue**. See [The Grey Marches](../packs/02-grey-marches.md).

Terrain, roads and rivers, the hex's tags, fields and region, the season and today's weather all reach the travel rules and the tables, so a system can make forests slower or roads safe from getting lost. What each system does is in its pack: see [Roads, rivers, walls and borders](04-roads-and-rivers.md#what-roads-and-rivers-do-when-you-travel).

## Moving by hand

Drag the party token to put it somewhere else: the trail follows, and during a trip it's a jump (no time passes).

## Discovering the map

With a system that can discover (the Grey Marches can; their example map leaves its east blank), tick **Discover the map as you travel**. Start with a blank map: paint only the hex where the party begins and click a destination anywhere. As the party travels, the system's tables decide the **empty** hexes:

- **Terrain**, seen from the land you're on (forest tends to go on as forest).
- **What is there**, the first time you enter a hex: a point of interest, tags (a `landmark` stops the Grey Marches' trips there), a name. The trip stops when you find something, so you can play it.

**What is discovered**: _the hexes around the party_ (what it sees: their terrain is known before you step in, so routes and speeds are real) or _only the hex the party enters_. The system chooses one; you can change it for your game.

Hexes you painted are never changed, so you can prepare part of the map and leave the rest unknown. Discoveries are part of the game, like the journal: <kbd>Ctrl</kbd>+<kbd>Z</kbd> doesn't undo them; repaint or delete by hand. Only noteworthy finds go in the journal.

To make your own system discover, see [Connecting tables to maps and trips](../oracle/07-connecting.md#7-discovering-the-map).

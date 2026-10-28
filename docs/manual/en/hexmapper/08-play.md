# Playing a trip

The **Play** tool (<kbd>P</kbd>) moves your party around the map, in one of two modes (**Play mode**, whose help sums them up). Choosing it selects the party token (switching to the Tokens tool keeps it selected, and there you change its icon, color and halo).

## Simple mode

Just the party token and its trail: click a hex to place the party, click another and it jumps straight there: no route, no travel time, nothing happens on the way. No rolls. To walk hex by hex with time, terrain and checks, use **With rules**. **Show trail** draws where it has been, curving like the map's roads and trails (**Straight lines** draws it, and the planned route, from hex centre to hex centre). Both run a little to one side of the hexes' centres, the trail on the left of its way and the route on the right, so they never sit on a road or river they follow, nor on each other; **Clear trail** and **Remove party** reset it.

## With rules

The Travel Engine runs the trip and the Oracle rolls the checks. The [Travel app](../travel/01-getting-started.md) plays the same systems without a map, and the [Systems app](../systems/01-getting-started.md) edits them.

1. Check the **system**: its campaign's (shared by the maps and trips in it), shown here and chosen in **Map settings → Campaign → System**: the Generic rules (Core's, when the campaign chooses none), or another pack's system (e.g. the Grey Marches). A system without travel rules plays no trips: Play says so, and its world, oracle and factions still play. It brings the travel rules, the tables they roll, the calendar and the weather. On one line, the system's name, the season to start in (or, with the world clock running, its date: no season to choose) and **New trip**, which restarts time, the party's sheet and journal, keeping the party where it is.
2. Click a hex to place the party, then click the **destination**: the route is drawn.
3. The buttons are the system's actions, such as **March**, **Camp** or **Rest** (each system declares which actions it has, and when they can be taken). Its march goes along the route as far as you choose beside it (to the destination, one hex…), until the system's rule for marching stops the party (at night, when the day's hours are spent…, as the system says) or a check needs you; then **Go on** goes on with it. **Wait to go on** lets time pass where the party is until it can march again, living it, with the system's halt (camp…) if it can be taken: for a day nothing else can be done (lost, no food to camp). The [World clock](12-world.md#with-a-trip-going-on) moves the trip on too: with a route planned, **Next day** travels along it.

The panel shows the day, time and season, where the party is, the weather, the marching hours used, the buttons and the travel mode (on foot, on horseback…). Right under them, **What just happened** shows the journal lines of your last step (the hexes it entered, the checks it rolled, what an action changed), newest first, replaced at each step. The rest is a tab at a time: **Party** (everything about the party in one place: its sheet with the system's party stats, each saying where it comes from, such as _Kael’s Pathfinding, the highest_; its characters, with what they carry; the party token itself keeps nothing, see [The party](../travel/02-playing.md#the-party); the help of a stat, a value or a role says what reads and changes it), **Journal** (the whole trip: the story, the rules too, or everything that happened behind, such as each roll's dice and why a check didn't come up; see [the journal's filter](../travel/02-playing.md#the-journal-everything-or-the-story)) and **So far** (hexes, km, hours marched, checks, actions, the party's values and items spent and gained). See [Playing a trip](../travel/02-playing.md#the-trip).

**Characters**: when the map's system has a sheet, the panel's **Party** tab has a **Characters** section, the same as in Travel ([Characters](../travel/02-playing.md#characters)): add the party's characters, choose who acts, change their values and conditions; the stats the system makes of theirs follow them, and what the party eats is taken from what they carry. They're saved in the map file (as OTD characters of the party), and a map can bring its company before any trip starts: the Grey Marches' example map comes with Kael, Mara and Old Tobin, who start the first trip. A new trip with the same system keeps them. Like Travel's, they can come from the roster and be kept in it ([the roster](../travel/02-playing.md#characters)): the map is the place they travel in. Their relations to the map's places, regions and hexes are drawn as thin threads from the party, in their own layer: **Layers → Relations**, hidden until you show it ([Layers](10-layers-and-export.md)).

A trip keeps the system it started with. If its campaign's system changes later (in **Map settings → Campaign**, or by joining another campaign), the panel says so and the trip plays on with its own; **New trip** starts one with the campaign's. Choosing another system in **New trip** makes it the campaign's, asking first if other maps or trips are in it.

## Checks and the journal

Systems declare their checks (the weather each morning, getting lost, encounters…) and which table resolves each one; the results go to the **journal**, grouped by day. A check without a table is only written in the journal, unless it pauses: then it waits for you to resolve it and press **Continue**. A check or a result can also pause the trip after rolling, and an action can stop it to tell you something or ask you how to go on (the Grey Marches' ferry: [what makes Continue appear](../travel/02-playing.md#the-trip)). Results show what they changed (Food +1, Morale −1…), and actions, what was eaten and fatigue are journaled too, also when nothing happens: see [what the journal says](../travel/02-playing.md#the-trip). With the [world clock](12-world.md#with-a-trip-going-on) running, the trip and the world share one time: moving the clock on is waiting where the party is (dawn's checks, eating, camping at night).

The bundled **Grey Marches** show all of it, on their example map (**Maps → Example maps**): weather by season, getting lost off roads, encounters by terrain, region, danger and time of day, a toll on the bridge, a ford rolled on an oracle, a boat on the lake, and checks with no table — the trip stops at the standing stones (`landmark`) until you describe the place and press **Continue**. See [The Grey Marches](../packs/02-grey-marches.md).

Terrain, roads and rivers, the hex's tags, fields and region, the season and today's weather all reach the travel rules and the tables, so a system can make forests slower or roads safe from getting lost. What each system does is in its pack: see [Roads, rivers, walls and borders](04-roads-and-rivers.md#what-roads-and-rivers-do-when-you-travel).

## Moving by hand

Drag the party token to put it somewhere else: the trail follows, and during a trip it's a jump (no time passes). Clicking a token (without dragging it) selects it and is a click on its hex too: to travel to the dragon, click the dragon.

## Discovering the map

With a system that can discover (the Grey Marches can; their example map leaves its east blank), tick **Discover the map as you travel**. Start with a blank map: paint only the hex where the party begins and click a destination anywhere. As the party travels, the system's tables decide the **empty** hexes:

- **Terrain**, seen from the land you're on (forest tends to go on as forest): by a table, or by a [land model](../technical/07-kinds.md#land-models) that adds up the land all around the hex.
- **What is there**, the first time you enter a hex: a point of interest, tags (a `landmark` stops the Grey Marches' trips there), a name. The trip stops when you find something, so you can play it.

**What is discovered**: _the hexes around the party_ (what it sees: their terrain is known before you step in, so routes and speeds are real) or _only the hex the party enters_. The system chooses one; you can change it for your game.

Hexes you painted are never changed, so you can prepare part of the map and leave the rest unknown. Discoveries are part of the game, like the journal: <kbd>Ctrl</kbd>+<kbd>Z</kbd> doesn't undo them; repaint or delete by hand. Only noteworthy finds go in the journal.

To make your own system discover, see [Connecting tables to maps and trips](../oracle/07-connecting.md#7-discovering-the-map).

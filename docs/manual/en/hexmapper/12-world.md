# The world clock

The **World** panel (☾ in the toolbar, under Play) keeps the campaign's date for this map: time moves on, scheduled events come due on their day, and progress clocks fill up. A map belongs to a **campaign**, the world it's played in, which keeps the world clock, its weather, the factions and the Oracle; for now each map has a campaign of its own, made with it (a map saved before campaigns gets one with its clock, factions and Oracle), and maps sharing one campaign come later. It's saved with the campaign, beside the map, and in the map's `.otd.json`. Its months, moons and holidays come from the calendar of the map's system (`kind: calendar` in its pack, see [Kinds of definition](../technical/07-kinds.md#calendars)); without one, days and four seasons.

## Starting it

**Starting on** chooses its date in the calendar's terms: the day of the month, the month and the year, and the time (with the default calendar, the day number and the time); it starts at 06:00 of the first day unless you change it. **Start the world clock** sets it there — or, during a trip, at the trip's time (they share one time). A date the calendar doesn't have (the 31st of a 30-day month, or before its first day) is said under the boxes. It names time with the calendar of the system the map plays (**Map settings → Map → System**; during a trip, the one the trip plays): the Grey Marches show “Wellday, 3 Thaw, year 412” with their moons and holidays; the Generic rules' plain calendar counts the days of its seasons and seasons.

**Stop the world clock** forgets it (it asks first).

## Setting the date

**Set the date**, under the date, moves the clock to a day and time you choose:

- **Later**: it's moving time on, the same as the buttons below (with a trip going on the party travels or waits until then, asking before days pass); events, holidays and moons on the way come due.
- **Earlier**: it asks first, and only without a trip going on (a trip's time never goes back). Nothing that happened is undone: the timeline keeps it and says "The clock went back (from …)"; repeating events don't come back.

## Moving time on

**+1 hour**, **Next day** (to midnight) and **Next event**, and a **Next: …** button for each division of the day the calendar declares (**Next: Watches**, **Next: Meals**: to when its next part begins); **Until…** chooses a part of any division and **Go** moves time on to when it next begins. Under the date, what the moment is in each division (“Part of the day: evening · Watches: 5”); a calendar without divisions shows none (the calendar used when a system has none has watches of 4 hours; the Generic rules' plain calendar adds its parts of the day). What a calendar's divisions are: [Calendars](../technical/07-kinds.md#calendars). Whatever comes due on the way is written in the **timeline** (and, during a trip, in its journal): events, holidays, full and new moons.

**The weather** of the day shows under the date. With a trip going on it's the trip's (its weather check); without one, the world clock rolls its own each day that passes, on the map system's weather model, each day following the day before's (the Grey Marches' sky, a hex flower in winter). Hand rolls read it as `weather`.

## With a trip going on

The world and a trip with rules share **one time**. New trips start on the clock's date instead of a season, travelling and camping move the clock, and moving the clock moves the trip on, living every moment as if you played it:

- **With a route planned**, the party **travels on** along it: the buttons are under **Travel on**, and a note below them says the hex it's heading for (the help of **Travel on** explains what passing time does then). It goes on the way the system says (`travel.onward`: its march to the destination, as the **March** button in Play does), takes the system's **halt** when it can't (camp, for example), marches on when it can again, and once it arrives it waits there for the rest of the time. With a system that marches by day, **+1 hour** at 08:00 is an hour of marching.
- **Without a route**, the party **waits where it is**: the buttons are under **Wait here**, and the note below them says the hex where it waits. A waiting party eats, but doesn't march.

Either way:

- Each moment the system names comes as it's reached: the checks and actions at a clock or a part of the day (the weather and getting lost each morning…), as when setting off.
- From the moment of its **halt**, a party that isn't marching takes the system's halt action, once a day: camp, for example (`travel.halt` in its rules: see [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system)). When it can't take it (a value of the day blocks it, or its conditions don't hold: the Grey Marches camp only with food left), the time passes without it, and the journal says why: "“Camp” isn't possible (…): the time passes without it." A system without a halt just lets the time pass.
- Each day that ends takes the system's end-of-day actions (eating, for example) and rolls its end-of-day checks (hunger, for example).
- A day the party can't march (a storm, a value that blocks travel, like being lost) is a day lost, said in the journal; it marches on when it can again.

**Moving time into another day asks first**: "The party will travel on towards 0808 for 1 day(s), marching when the system lets it; when it can’t march: Camp. Go on?" (or "will wait here"). Saying no leaves everything as it was. The journal starts with "Wait here until day 3, 06:00" when waiting, and then tells all of it.

It **stops early**, and the clock with it, when something needs you, and **a message at the bottom says why**: a check that pauses, with a table or without ("“Encounter” needs you": see the journal, press **Continue**, then move the clock on again), a place found on the way (discovery), a way blocked for good (choose another destination). Arriving says so too: "The party reached its destination."

A camp lasts as long as its steps say even if you asked for less: if the halt is at 20:00 and camp sleeps until 06:00, **+1 hour** at 19:30 reaches the halt, so the party camps and the clock ends at 06:00.

Example with the Grey Marches: start the clock, place the party in Ashford (0608) and click 0808 in Play to plan the way there; then press **Next day**: it asks, the weather and getting-lost checks are rolled in the morning, the party marches along the road, camps at nightfall (eating a day's food, a fed night takes off 1 fatigue, the night encounter is rolled where danger is 2 or more) and the clock ends the next morning, when the camp ends, a day further on. Clear the route (click the party's own hex) and **Next day** waits in place instead.

## Events

Things that happen on a date whether the party is there or not: a festival, an attack, a ship arriving. Write what happens, its **Id**, a **description** if you like, when (**in how many days** and **at what time**, or **on a date** of the calendar), and whether it happens **once**, **every N days** (a weekly market) or **every year**. The list shows what's coming, soonest first, with each one's id and description; ✕ cancels one.

The **Id** is how conditions and tables name the event on its day: lowercase words joined by dashes (`market-day`, `clan-raid`), one per event. Left empty, it's the name written that way (**Market day** → `market-day`; a number is added if it's taken).

## Progress clocks

A clock is a round dial of segments filled as something advances: a threat (“The Wyrm wakes: 1/6”), a project, a faction's plan. Click a segment to fill up to it, or the last filled one to empty it. When a clock fills up, the timeline says so. Rename one by editing its name; ✕ removes it. Its **segments** can be any number: set them when adding it (beside its name) or change them later (beside the count). Under the count is the name tables read it by (`the-wyrm-wakes`).

**The system's own clocks.** A system may declare the clocks its world starts with ([Progress clocks](../technical/07-kinds.md#progress-clocks), the Systems app's **Clocks** tab): they come with the world clock when you start it, already filled as far as the system says. Click the name under a declared clock's count to see what it is and **what happens when it fills**: a line on the timeline and a notice, a table rolled, effects on the factions and on other clocks, and then it stays full, starts over or goes away. Rules read it by the id the system gives it, whatever you rename it. **Add the system's clocks** brings back the ones the world doesn't have (removed, or declared after the clock started).

**Tables and a system's rules read the world**: each clock by its name in lowercase with dashes (“The Wyrm wakes” is `world.clocks.the-wyrm-wakes`, its filled segments; `clocks.the-wyrm-wakes` for short), a declared one also by its id, and the day's events by their ids (`world.events: market-day`, or `events`; their names written as ids work too), in conditions and in rolls, by hand or the trip's: an encounter that only comes when a threat is near (`when: { world.clocks.the-wyrm-wakes: { gte: 4 } }`), an action only on market day. The full list: [What tables see](../technical/04-what-tables-see.md).

## Timeline

What happened in the world, newest first: events that came due, holidays, moons, clocks that moved, and your own notes (write one and **Add**).

The Grey Marches' example map comes with the clock running: a market every week (`market-day`: in Ashford that day, **Market day** trades for supplies), the Iron Clans marching on Fort Keld (`clan-march`), the spring floods (`spring-floods`), and the system's three clocks — the Greywood Wyrm (filled by the haunted lights; full, it rolls what the Wyrm does first and roams the Greywood), the Iron Clans' march (filled by their world turns; full, they go to war on Fort Keld, bringing its mutiny two segments closer, and gather again) and Fort Keld's unpaid garrison (full, it mutinies: the fort is lost and the clock goes away).

## Factions

A faction is one of the powers of the world (a kingdom, a clan, a guild): a sheet of values and conditions like a character's, kept by the campaign, and **land**, the hexes it holds on each map. When the map's system has factions (`kind: factions` in its pack), the World view lists them under **Factions**; **Bring in its factions** puts them on a map that doesn't have them yet, each holding its starting land (the regions and hexes its pack names). Each one shows its colour and how many hexes it holds; open it for what the system says it is and its sheet (its values, conditions and relations, like a character's: change them by hand when the story says so). Its land is drawn on the map in its colour (the **Factions** layer).

**Their land** comes from three places, and the map keeps it (the **Their land** label in the panel says so too):

- **Where it starts**: the regions its system names for each, on any map that has them, and the hexes it names, only on the example map they're on (Systems → [Factions](../systems/08-factions.md)), given when you bring them in. Changing them in the system later doesn't move a map's land.
- **By hand**: **Paint its land**, below.
- **World turns**: a faction's turn table may win ground (`faction.territory: 1`, a hex from its border) or lose it (`-1`).

A hex has one holder at most: taking it takes it from whoever held it. Tables read who holds a hex as `hex.faction`, and how much each holds as `factions.<id>.territory`.

**Their land, by hand.** Open a faction and press **Paint its land**: while it's on (and the World panel open), a click or a drag on the map gives it hexes, taken from whoever held them, and a right click takes them away (water and hexes off the map stay nobody's). Press **Stop painting** when done. Like a world turn, it isn't undone with Ctrl+Z: paint them back. Their values and conditions are changed in each one's sheet, under it.

**World turn** has every faction take its turn now (its explanation is in **What it does**, beside it, so reading it doesn't run a turn), in order: each rolls its turn table, and what comes up changes it, another faction, its land (a hex more from its border, or one less) or a progress clock; each result goes to the timeline ("The Iron Clans: Raiders strike the Vale's outlying farms"). With **Turns by themselves, every N days** ticked, turns come as the clock moves on, by hand or with a trip, every so many days as the system says.

Tables and conditions read them everywhere: `factions.the-vale.values.strength`, `hex.faction` (who holds the hex: the Grey Marches' Vale patrol rides wherever the Vale holds the land). A trip's results reach them too (the Grey Marches' toll makes the garrison think better of you; their haunted lights stir the Wyrm's clock), and **Apply to the trip** on a hand roll does the same. **Take the factions off the map** forgets them (after asking). The Grey Marches' example map comes with the Iron Clans, the Vale of Ashford and the garrison of Fort Keld, and the clock _The Iron Clans march_ their turns move on. How a system declares them: [Factions](../technical/07-kinds.md#factions).

# The world clock

The **World** panel (☾ in the toolbar, under Play) keeps the campaign's date for this map: time moves on, scheduled events come due on their day, and progress clocks fill up. It's saved with the map (and in its `.otd.json`). Its months, moons and holidays come from the calendar of the map's system (`kind: calendar` in its pack, see [Kinds of definition](../technical/07-kinds.md#calendars)); without one, days and four seasons.

## Starting it

**Start the world clock** sets it at dawn of the first day — or, during a trip, at the trip's time. It names time with the calendar of the system the map plays (Play → Rules): the Grey Marches show “Wellday, 3 Thaw, year 412” with their moons and holidays; the generic rules count days and seasons.

**Stop the world clock** forgets it (it asks first).

## Moving time on

**+1 hour**, **+1 watch**, **Until dusk**, **Until dawn**, **Next day** and **Next event**. Whatever comes due on the way is written in the **timeline** (and, during a trip, in its journal): events, holidays, full and new moons.

## With a trip going on

The world and a trip with rules share **one time**. New trips start on the clock's date instead of a season, travelling and camping move the clock, and moving the clock moves the trip on, living every moment as if you played it:

- **With a route planned**, the party **travels on** along it: the buttons are under **Travel on**, with the hex it's heading for. It marches by day (as **Travel** in Play does), takes the system's action for the night when night falls, marches on at dawn, and once it arrives it waits there for the rest of the time. **+1 hour** at 08:00 is an hour of marching; **Next day** is the rest of today's march, the night and the dawn.
- **Without a route**, the party **waits where it is**: the buttons are under **Wait here**, with the hex where it waits. A waiting party eats, but doesn't march.

Either way:

- At dawn, the day's checks are rolled (the weather, getting lost…), as when setting off.
- At nightfall the party takes **the system's action for the night**, once a night: camp, unless the system names another (`day.night` in its rules: see [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system)). When it can't take it (a value of the day blocks it, or its conditions don't hold: the Grey Marches camp only with food left), the night passes without it, and the journal says why: "Night falls and “Camp” isn't possible (…): the night passes without it." A system without one just lets the night pass.
- Each day that ends takes the system's end-of-day actions (eating, for example) and rolls its end-of-day checks (hunger, for example).
- A day the party can't march (a storm, a value that blocks travel, like being lost) is a day lost, said in the journal; it marches on the next day.

**Moving time into another day asks first**: "The party will travel on towards 0808 for 1 day(s), marching by day; each night: Camp. Go on?" (or "will wait here"). Saying no leaves everything as it was. The journal starts with "Wait here until day 3, 06:00" when waiting, and then tells all of it.

It **stops early**, and the clock with it, when something needs you, and **a message at the bottom says why**: a check without a table or one that pauses ("“Encounter” needs you": see the journal, press **Continue**, then move the clock on again), a place found on the way (discovery), a way blocked for good (choose another destination). Arriving says so too: "The party reached its destination."

A camp lasts till dawn even if you asked for less: **+1 hour** at 19:30 crosses nightfall, so the party camps and the clock ends at dawn.

Example with the Grey Marches: start the clock, place the party in Ashford (0608) and click 0808 in Play to plan the way there; then press **Next day**: it asks, the weather and getting-lost checks are rolled at dawn, the party marches along the road, camps at nightfall (eating a day's food, a fed night takes off 1 fatigue, the night encounter is rolled where danger is 2 or more) and the clock ends at the next dawn, a day further on. Clear the route (click the party's own hex) and **Next day** waits in place instead.

## Events

Things that happen on a date whether the party is there or not: a festival, an attack, a ship arriving. Write what happens, **in how many days** and **at what time**, and whether it happens **once**, **every N days** (a weekly market) or **every year**. The list shows what's coming, soonest first; ✕ cancels one.

## Progress clocks

A clock is a number of segments filled as something advances: a threat (“The Wyrm wakes: 1/6”), a project, a faction's plan. Click a segment to fill up to it, or the last filled one to empty it. When a clock fills up, the timeline says so. Rename one by editing its name; ✕ removes it.

## Timeline

What happened in the world, newest first: events that came due, holidays, moons, clocks that moved, and your own notes (write one and **Add**).

The Grey Marches' example map comes with the clock running: a market every week, the Iron Clans marching on Fort Keld, the spring floods, and two clocks — the Greywood Wyrm and Fort Keld's unpaid garrison.

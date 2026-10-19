# Playing a trip

Trips here have **no map**: you describe the way ahead hex by hex. It's quick for a journey you only need in broad strokes, or to try out a system while you write it. To travel on a map, use the Hexmapper's [Play mode](../hexmapper/08-play.md): it's the same engine and the same systems.

## Starting

Pick a system on the left and open **Play**. Choose the season to start in and press **Start a trip**.

You can keep several trips (in this browser), each with its own system, way and journal. At the top, **Trip** opens another one (its system's page opens with it), **Name** gives the open trip a name (unnamed trips show their system and day), **Another trip** starts one more with this system and season (the others are kept), and **Delete** removes the open one. **New trip**, under the system and season, starts the open trip again from scratch; it asks first if its journal has something. Opening another system's **Play** tab with a trip open says which system that trip uses ("The open trip uses The Grey Marches."), with **Start a trip with …** to start one more with this system (the open one is kept: **Trip** goes back to it).

## The campaign

Every trip plays in a **campaign**, the world it happens in: its system, a world clock, the factions and the Oracle (the cards drawn from each deck, the results that come up only once). **Campaign**, above the system, says which one, and **Open in Campaign ↗** under it shows it in the [Campaign](../campaign/01-getting-started.md) app (its world clock, timeline, factions, maps and trips). A trip starts in a campaign of its own (**Its own**), with the trip's system, a world nobody else plays in, as trips without a map always had. Choose another one, such as a Hexmapper map's (listed by the map's name), to travel in that map's world:

- The trip's days are the campaign's: a new trip starts on the campaign's date (when its world clock runs, see [The world clock](../hexmapper/12-world.md)), and marching, waiting and camping move the campaign's clock on. Events and holidays that come due on the way are written in the journal.
- Its tables and checks read the world (the campaign's progress clocks, today's events, the factions' values: [What tables see](../technical/04-what-tables-see.md)), and what they do to it happens there: a result that ticks a clock (`world.clocks.the-siege: 1`) or changes a faction's values. A faction's land is on a map, so it only changes when the trip is played on that map.
- Its checks roll on the campaign's Oracle: a card drawn on the trip is gone on the map too.

**One trip at a time.** A campaign's time is one, so only one trip goes on in it. Playing a trip in a campaign where another one played last (the map's trip in the Hexmapper, another trip here) asks first: “Another trip is going on in this campaign: “The Frontier”. Pause it and play this one?” Saying no leaves everything as it was. If the campaign's clock went on meanwhile (the other trip travelled for a day), this party **waits until then** first, and a message says so; the other trip asks the same when it's played again.

Changing **Campaign** on a trip under way moves it to that world from its next step. If the trip's campaign has a world of its own (a world clock, factions, Oracle rolls), Travel asks which one stays, as the Hexmapper does when a map moves ([Campaigns](../hexmapper/01-getting-started.md#campaigns)): **Keep the campaign's** (the trip's world is left behind) or **Bring this one's** (it takes the place of the campaign's, system included, for every map and trip in it); when the other campaign has no world yet, bring it or **Leave it behind**. The campaign the trip leaves, and the one of a trip you delete, is deleted if nothing else is in it.

**The system is the campaign's.** A trip keeps the system it started with, and a new trip makes its system the campaign's: in a campaign of its own, without asking; in one shared with maps or other trips, asking first, since they play it too.

The [Campaign](../campaign/01-getting-started.md) app shows every campaign, with its world clock and the maps and trips in it.

## The way

The list on the left is the way. The party starts on hex 1 and heads for the last one. Its column headers are underlined with dots: click one to read what it is.

- **Terrain** of each hex: the Hexmapper's terrains plus any the system's rules name.
- **Tags**, separated by commas. Tables and checks read them: the Grey Marches stop at `landmark` hexes, charge a toll on `toll` ones and have night lights in `haunted` ones.
- Under each hex, **To the next hex**: whether a road, trail or river joins it to the next one. What that does depends on the system (in the Grey Marches, roads are faster and keep you from getting lost or meeting anything).
- **km per hex**: the scale. Speeds in the rules are in km per day. A system that sets its own scale (`travel.hexKm`) is always played at it: the box shows it and can't be changed here (change it in Systems → Rules).
- **Add a hex** extends the way; **×** removes one the party hasn't reached. Hexes already walked are greyed out and can't change.

Changing the way re-plans the route right away.

## The trip

The panel on the right is the same as in the Hexmapper. At the top, where the party is: day, time and season, what it is in each division of the calendar's day (“Part of the day: evening · Watches: 5”), the weather, the marching hours used; right under it, a check that waits for you (**Continue**), the buttons to play and the way of travelling; then **What just happened** and the tabs. The buttons are the actions the system declares, the ones that move the party first: its march (the Grey Marches' **March**) goes along the route until it gets as far as you chose beside it (to the destination, one hex…, as the system offers), something happens, or the system's rule for it stops holding (at night, when the day's hours are spent…); the rest come after (the Grey Marches: **Camp**, **Rest**, **Forage for food**, **Forced march**, and only when they can be taken **Night march**, **Rite of the Ember Moon**, **Talk to the hirelings** and **Tales of the road**). When a check stops a march on the way, **Go on** goes on with it once you've read it (the rest of the way, then the rest of what the action does); pressing another button leaves it. **Wait to go on** lets the time pass until the trip can go on the way the system says (its march, by day). A system without an action that moves has no march button at all. Actions the system takes by itself (eating as each day ends) are not buttons: they just happen, and the journal says so.

**What just happened.** Right under the buttons, a box shows the journal lines of your last step: a march with every hex it entered and every check it rolled, an action and what it changed, a check you went on from with **Continue**. Tables you roll by hand afterwards are added to it. The next step replaces them, so what you just did is always beside the buttons that did it; the whole trip stays in the **Journal** tab.

**The tabs.** Under it, the rest of the trip is shown a tab at a time; this browser remembers the one you chose, in every app that shows a trip:

- **Party** (only when the system declares any of it): the supplies, the party stats the system declares (e.g. the Grey Marches' Charisma, Survival and Navigation, added to rolls, and their Morale, Fatigue and Hirelings, changed by what happens), **The party** (its own sheet) and **Characters**. Each of these sections folds and unfolds when you click its heading; a section with an explanation has **What it is** beside its heading: click it to read it in the help column without folding anything.
- **Journal**: the whole trip, newest first, grouped by day; **Export** sits on the tabs' line.
- **So far**: what the trip has done.

**So far** sums up the trip: hexes and km travelled, hours marched, the checks that came up, how many times each action was taken and what the supplies spent and gained. The system's rules and tables can read them too (`trip.km: { gte: 100 }`, `trip.taken.camp`, `trip.spent.food`: see [What tables see](../technical/04-what-tables-see.md#the-trip-trip)). Trips saved before they existed get their hexes and actions from the journal; the rest counts from then on.

Checks are rolled on their tables and written in the **journal**, grouped by day. **Export** downloads the whole journal as Markdown (a heading per day, named after the trip) for your notes app or to print. A check with no table is only written in the journal (with what it changes, if anything) and the trip goes on, unless it says to pause. The trip stops and shows **Continue** in two cases:

- a check that says **Pause after it** (`pause: true`): it's rolled if a table resolves it, and the trip waits so you can describe the place, resolve it yourself or decide something (the Grey Marches' shrine, rolled; their landmarks, with no table);
- a table entry or deck card with `pause: true` that comes up (the Grey Marches' Greywood Wyrm): only when that result comes up.

Until you press **Continue** nothing moves the trip on: marching, waiting and the actions are greyed out (their tooltip says why). Changing the destination, the way of travelling, the characters or the supplies by hand still works. What a paused result does to the trip (getting lost, the weather) applies when you continue; its effects on supplies and stats apply at once.

**Buttons that can't be used now** stay visible, disabled: hovering one says why. A value of the day the system declares blocks them (the Grey Marches' **Lost**: "Lost: not possible for the rest of the day", until the day ends; or **The hirelings refuse to march**, until you talk them round), the action was already done today (**Once a day**), or the system's rule for it doesn't hold here and now (the Grey Marches' **Forage for food** in a storm or at night, **Rest** and **Forced march** at night, **Forced march** with fatigue 2 or more). A system may instead hide an action's button while it can't be taken (**Hidden when it can't be taken**), for actions that only make sense now and then: the Grey Marches' **Rite** shows only at a shrine under a full Ember Moon, **Night march** only after nightfall. Camp, rest and the system's own actions all come from the system: one may have no rest, another camps differently (see [Actions](../systems/05-rules.md#actions)).

What the journal says, so nothing happens silently:

- **Results with what they changed**: "Foraging: Berries and roots for a day (Food +1)", "Toll: The bridge-warden takes a day’s food as toll (Food −1)", "Getting lost: Lost in the fog: no progress today (Lost)".
- **Actions** with how long they took, and when nothing was rolled: in the Grey Marches, **Forage for food** on hills says "Forage for food (3 h): nothing to forage on hills: only woods, fields, heath and marsh give food". The three hours still pass and the march is still halved.
- **Actions the system takes by itself**, like eating as each day ends, with what they changed ("Eat (Food −1)"); a value that hits its minimum or maximum ("Food can’t go lower than 0") and **fatigue** changes with their reason ("Not enough to eat: Fatigue +1"); what an action changed goes on its own line ("Camp for the night (Fatigue −1)", "Rest for 2 h (Fatigue −1)").

## Who rolls

When the system has stats made of one character (`from: { pick: … }`: the Grey Marches' Charisma, whoever does the talking), **Rolls with**, under the trip's buttons, chooses whose value they take: **The best** (the default) or one character, for every roll until you change it. Tick **Ask at every roll** to choose each time: a check rolled on a table waits (its line says _who rolls?_) with the choice beside **Continue**, and is rolled when you press it.

## The party's own sheet

When the system has a sheet for the party itself (the Grey Marches' **Company**; the Generic rules' **Morale**), every trip shows it as **The party**, above the characters: what belongs to the whole party, whoever travels. Characters can join and leave (they fall, others are hired); this stays. Change its values and conditions by hand, as a character's; checks and actions change them too (the Grey Marches: lost in the dark, the Company is **Shaken** and can't force a march until it rests). A party stat made of one of its values (the Grey Marches' Morale and Fatigue) has no box of its own among the stats: it's edited on this card.

## Characters

When the system has a sheet for its characters (the Grey Marches' companions; the Generic rules' smallest one, with health and a wound), the trip's **Party** tab has a **Characters** section under the supplies and stats. **Add a character** makes one with the sheet's starting values; name it, and its id follows the name (`Old Tobin` → `old-tobin`, how tables and conditions reach it: `characters.old-tobin.values.health`). Each character folds open to show its values (grouped as the sheet says; a track as boxes, click one to fill up to it), its conditions (tick them as they happen) and its tags (free words, comma-separated). ↑ moves one up the list, × removes one (after asking).

**The roster.** Characters can also come from the [Characters app](../characters/01-getting-started.md), where this browser keeps them, of any system. Under the list, **From the roster** lists the roster's characters made with this system's sheet: choosing one brings it into the party with its values. A character of the trip that isn't in the roster has **Keep in the roster** on its card, which puts it there; one that is has **Open in Characters ↗**, for its notes and the rest. Either way it's **linked**: what happens to it on the trip is written back to the roster after every step and edit, and what you change in the Characters app reaches the trip (the journal says "Kael: brought up to date from the roster"). A character travels in one place at a time: bringing one that travels elsewhere (another trip, a map, a token) asks first, and that place keeps its copy, no longer linked. Removing it from the party, or deleting the trip, leaves it in the roster, travelling nowhere. A new trip with the same system keeps the party and its links.

Each character also has **Relations**: what they're tied to, as the sheet's kinds say (a bond with another character, a home): pick the kind, type a name from the list (the other characters; on a map, its places, regions and named hexes; in Travel, the way's hexes) and **Add**; a kind with a number shows it beside, to change. The system's checks read them where the party is (the Grey Marches: coming into a companion's home lifts morale).

**Roles**, when the system declares journey roles, give each job to a character until you change it: the Grey Marches' **Guide** (with Pathfinding 2 or more, getting lost is rolled with advantage) and **Lookout** (with Stealth 2 or more, the camp stays hidden where danger is under 3).

**Acting** says who takes the party's actions now: what a system writes for `acting` reaches that character (in the Grey Marches, the rocks of a ford hurt and sprain whoever leads the crossing; **Tend the wounded** works only if whoever acts has Survival 2 or more). With **Nobody**, those effects change nothing and the journal says so: "Nobody is acting, so “Whoever acts: Sprained ankle” changed nothing".

With characters, the party is its members, as the system says:

- **Stats made of theirs** show greyed out, and follow them: the Grey Marches' Survival is the best of those not wounded, Stealth the clumsiest one's, Mouths how many they are. Change the characters' values, not the party's. Stats the system keeps for the party as a whole (Morale, Fatigue) are edited as before.
- **Supplies they carry** show their sum, greyed out: the Grey Marches' food is everyone's rations. What the trip eats or finds is taken from (or given to) them, evenly unless the system says otherwise; edit each one's share in their sheet.
- **Their conditions block** what the sheet says for the whole party: a wounded companion keeps the Grey Marches from the forced march, a sprained ankle from marching at all ("Mara: Sprained ankle: not possible while it lasts"), being saddle-sore from riding.
- **Effects reach them**: a fed night heals every companion, the haunted lights fill everyone's dread; the journal names whom ("Everyone: Health +1").

Without characters, the same system plays the party as a whole, and what it says of characters doesn't happen. A new trip with the same system takes the same characters along. The syntax, for systems: [Characters, in Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).

## Ways of travelling

The list in the panel has the ways of travelling the system declares, each with its speed. Some can't be chosen everywhere: the Grey Marches' **By boat** only at the water's edge or the ferry, and only through water and coast; **By cart** only along roads (with no road ahead there's no route). A value of the day can leave one behind: the Grey Marches' **Deep snow** (falling snow sets it) blocks **On horseback**, and a party already riding stops until you choose another way (on foot the trip goes on). Terrains may open and close too: the Grey Marches' peaks only in summer and not in snow, their lakes only in the two coldest months (crossed on the ice); routes go around what's closed.

## A day, step by step

What happens and when, with the Grey Marches as the example (other systems roll other things, at the same moments):

1. **Dawn**: the checks of the day start are rolled: the weather (the sky follows yesterday's) and, off roads and rivers, getting lost. The actions the system takes at dawn go first (the hirelings grumble if yesterday went hungry).
2. **Marching**: each hex entered rolls its own checks: an encounter where the map says there's danger, the toll at Keld Bridge by road, the ford, the shrine (which pauses), a landmark (no table, but it pauses).
3. **Nightfall**: nobody marches after dark. Asleep in camp, the night's watches still come: in the middle watch, where danger is 3 or more and nobody keeps watch, the haunted lights fill everyone's Dread. **Camp** (the system's halt: what the party does when it can't march) rolls the night's checks: a night encounter where danger is 2 or more. Camp needs food left and fatigue under the party's Endurance (10): without, the button is off, and **Wait to go on** passes the night in the open ("“Camp” isn't possible (…): the time passes without it"), with no fed night's relief, until the party can march in the morning. It lets the time pass where the party is until it can march again, whatever happens: lost and hungry, the day is gone and the party wakes on the next.
4. **The end of the day** (midnight): the system's day-end actions (eating: 1 food, 1 more per hireling, and 1 fodder on horseback) and checks (a day without enough food: fatigue +1; ending it with no food left, hunger, where morale decides how it goes). Today's values end; tomorrow's tables read them as `yesterday.…`.

Your own actions fit in between: **Rest** two hours, **Forage for food** (three hours, the march halved), a **Forced march** (faster, more tired, and off at once to the destination), all by day; in the Grey Marches resting where danger is 3 or more may bring an encounter too. At nightfall, instead of camping, a **Night march** lights the torches and the party may keep going until midnight (+1 fatigue); each hex entered in the dark off the road may get you lost or bring a night encounter.

## Saved as you play

The trip is saved in the browser as you play, and is still there when you come back. A [backup](../technical/05-backups.md) takes it to another computer.

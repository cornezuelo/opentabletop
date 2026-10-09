# Playing a trip

Trips here have **no map**: you describe the way ahead hex by hex. It's quick for a journey you only need in broad strokes, or to try out a system while you write it. To travel on a map, use the Hexmapper's [Play mode](../hexmapper/08-play.md): it's the same engine and the same systems.

## Starting

Pick a system on the left and open **Play**. Choose the season to start in and press **Start a trip**.

You can keep several trips (in this browser), each with its own system, way and journal. At the top, **Trip** opens another one (its system's page opens with it), **Name** gives the open trip a name (unnamed trips show their system and day), **Another trip** starts one more with this system and season (the others are kept), and **Delete** removes the open one. **New trip**, under the system and season, starts the open trip again from scratch; it asks first if its journal has something. Opening another system's **Play** tab with a trip open says which system that trip uses ("The open trip uses The Grey Marches."), with **Start a trip with …** to start one more with this system (the open one is kept: **Trip** goes back to it).

## The way

The list on the left is the way. The party starts on hex 1 and heads for the last one. Its column headers are underlined with dots: click one to read what it is.

- **Terrain** of each hex: the Hexmapper's terrains plus any the system's rules name.
- **Tags**, separated by commas. Tables and checks read them: the Grey Marches stop at `landmark` hexes, charge a toll on `toll` ones and have night lights in `haunted` ones.
- Under each hex, **To the next hex**: whether a road, trail or river joins it to the next one. What that does depends on the system (in the Grey Marches, roads are faster and keep you from getting lost or meeting anything).
- **km per hex**: the scale. Speeds in the rules are in km per day. A system that sets its own scale (`travel.hexKm`) is always played at it: the box shows it and can't be changed here (change it in Systems → Rules).
- **Add a hex** extends the way; **×** removes one the party hasn't reached. Hexes already walked are greyed out and can't change.

Changing the way re-plans the route right away.

## The trip

The panel on the right is the same as in the Hexmapper: day, time and season, the weather, the marching hours used, the way of travelling, the supplies and the party stats the system declares (e.g. the Grey Marches' Charisma, Survival and Navigation, added to rolls, and their Morale, Fatigue and Hirelings, changed by what happens). **Travel** (or the name the system gives its march, like **March** in the Grey Marches) marches until something happens or the day ends, **1 hex** only to the next hex; the other buttons are the actions the system declares (the Grey Marches: **Camp**, **Rest**, **Forage for food**, **Forced march**, and only when they can be taken **Night march**, **Rite of the Ember Moon**, **Talk to the hirelings** and **Tales of the road**). Actions the system takes by itself (eating as each day ends) are not buttons: they just happen, and the journal says so.

Above the journal, **So far** sums up the trip: hexes and km travelled, hours marched; open it for the checks that came up, how many times each action was taken and what the supplies spent and gained. The system's rules and tables can read them too (`trip.km: { gte: 100 }`, `trip.taken.camp`, `trip.spent.food`: see [What tables see](../technical/04-what-tables-see.md#the-trip-trip)). Trips saved before they existed get their hexes and actions from the journal; the rest counts from then on.

Checks are rolled on their tables and written in the **journal**, grouped by day. **Export** downloads the whole journal as Markdown (a heading per day, named after the trip) for your notes app or to print. A check with no table is only written in the journal (with what it changes, if anything) and the trip goes on, unless it says to pause. The trip stops and shows **Continue** in two cases:

- a check that says **Pause after it** (`pause: true`): it's rolled if a table resolves it, and the trip waits so you can describe the place, resolve it yourself or decide something (the Grey Marches' shrine, rolled; their landmarks, with no table);
- a table entry or deck card with `pause: true` that comes up (the Grey Marches' Greywood Wyrm): only when that result comes up.

Until you press **Continue** nothing moves the trip on: marching, waiting and the actions are greyed out (their tooltip says why). Changing the destination, the way of travelling, the characters or the supplies by hand still works. What a paused result does to the trip (getting lost, the weather) applies when you continue; its effects on supplies and stats apply at once.

**Buttons that can't be used now** stay visible, disabled: hovering one says why. A value of the day the system declares blocks them (the Grey Marches' **Lost**: "Lost: not possible for the rest of the day", until the next dawn; or **The hirelings refuse to march**, until you talk them round), the action was already done today (**Once a day**), or the system's rule for it doesn't hold here and now (the Grey Marches' **Forage for food** in a storm or at night, **Rest** and **Forced march** at night, **Forced march** with fatigue 2 or more). A system may instead hide an action's button while it can't be taken (**Hidden when it can't be taken**), for actions that only make sense now and then: the Grey Marches' **Rite** shows only at a shrine under a full Ember Moon, **Night march** only after nightfall. Camp, rest and the system's own actions all come from the system: one may have no rest, another camps differently (see [Making a system](../systems/02-making-a-system.md)).

What the journal says, so nothing happens silently:

- **Results with what they changed**: "Foraging: Berries and roots for a day (Food +1)", "Toll: The bridge-warden takes a day’s food as toll (Food −1)", "Getting lost: Lost in the fog: no progress today (Lost)".
- **Actions** with how long they took, and when nothing was rolled: in the Grey Marches, **Forage for food** on hills says "Forage for food (3 h): nothing to forage on hills: only woods, fields, heath and marsh give food". The three hours still pass and the march is still halved.
- **Actions the system takes by itself**, like eating as each day ends, with what they changed ("Eat (Food −1)"); a value that hits its minimum or maximum ("Food can’t go lower than 0") and **fatigue** changes with their reason ("Not enough to eat: Fatigue +1"); what an action changed goes on its own line ("Camp for the night (Fatigue −1)", "Rest for 2 h (Fatigue −1)").

## Characters

When the system has a sheet for its characters (the Grey Marches' companions; the Generic rules' smallest one, with health and a wound), the trip has a **Characters** section above the actions. **Add a character** makes one with the sheet's starting values; name it, and its id follows the name (`Old Tobin` → `old-tobin`, how tables and conditions reach it: `characters.old-tobin.values.health`). Each character folds open to show its values (grouped as the sheet says; a track as boxes, click one to fill up to it), its conditions (tick them as they happen) and its tags (free words, comma-separated). ↑ moves one up the list, × removes one (after asking).

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
3. **Nightfall**: nobody marches after dark. **Camp** (or the system's action for the night) rolls the night's checks: a night encounter where danger is 2 or more. Camp needs food left and fatigue under the party's Endurance (10): without, the button is off, and **Travel** passes the night in the open ("Night falls and “Camp” isn't possible (…): the night passes without it"), with no fed night's relief, and marches on at dawn. **Wait until dawn** lets the time pass where the party is, whatever happens: lost and hungry, the day is gone and the party wakes on the next.
4. **The end of the day** (midnight): the system's day-end actions (eating: 1 food, 1 more per hireling, and 1 fodder on horseback) and checks (a day without enough food: fatigue +1; ending it with no food left, hunger, where morale decides how it goes). Today's values end; tomorrow's tables read them as `yesterday.…`.

Your own actions fit in between: **Rest** two hours, **Forage for food** (three hours, the march halved), a **Forced march** (faster, more tired), all by day; in the Grey Marches resting where danger is 3 or more may bring an encounter too. At nightfall, instead of camping, a **Night march** lights the torches and the party may keep going until midnight (+1 fatigue); each hex entered in the dark off the road may get you lost or bring a night encounter.

## Saved as you play

The trip is saved in the browser as you play, and is still there when you come back. A [backup](../technical/05-backups.md) takes it to another computer.

# Playing a trip

Trips here have **no map**: you describe the way ahead hex by hex. It's quick for a journey you only need in broad strokes, or to try out a system while you write it. To travel on a map, use the Hexmapper's [Play mode](../hexmapper/08-play.md): it's the same engine and the same systems.

## Starting

Pick a system on the left and open **Play**. Choose the season to start in and press **Start a trip**.

You can keep several trips (in this browser), each with its own system, way and journal. At the top, **Trip** opens another one (its system's page opens with it), **Name** gives the open trip a name (unnamed trips show their system and day), **Another trip** starts one more with this system and season (the others are kept), and **Delete** removes the open one. **New trip**, under the system and season, starts the open trip again from scratch; it asks first if its journal has something.

## The way

The list on the left is the way. The party starts on hex 1 and heads for the last one. Its column headers are underlined with dots: click one to read what it is.

- **Terrain** of each hex: the Hexmapper's terrains plus any the system's rules name.
- **Tags**, separated by commas. Tables and checks read them: the Grey Marches stop at `landmark` hexes, charge a toll on `toll` ones and have night lights in `haunted` ones.
- Under each hex, **To the next hex**: whether a road, trail or river joins it to the next one. What that does depends on the system (in the Grey Marches, roads are faster and keep you from getting lost or meeting anything).
- **km per hex**: the scale. Speeds in the rules are in km per day.
- **Add a hex** extends the way; **×** removes one the party hasn't reached. Hexes already walked are greyed out and can't change.

Changing the way re-plans the route right away.

## The trip

The panel on the right is the same as in the Hexmapper: day, time and season, the weather, the marching hours used, the way of travelling, the supplies and the party stats the system declares (e.g. the Grey Marches' Charisma, Survival and Navigation, added to rolls, and their Morale, Fatigue and Hirelings, changed by what happens). **Travel** marches until something happens or the day ends, **1 hex** only to the next hex; the other buttons are the actions the system declares (the Grey Marches: **Camp**, **Rest**, **Forage for food**, **Forced march**, **Rite of the Ember Moon**, **Talk to the hirelings**). Actions the system takes by itself (eating as each day ends) are not buttons: they just happen, and the journal says so.

Checks are rolled on their tables and written in the **journal**, grouped by day. **Export** downloads the whole journal as Markdown (a heading per day, named after the trip) for your notes app or to print. The trip stops and shows **Continue** in three cases:

- a check with no table (like the Grey Marches' landmarks): resolve it yourself, then press **Continue**;
- a check that says **Pause after it** (`pause: true`): it's rolled, and the trip waits so you can describe the place or decide something (the Grey Marches' shrine);
- a table entry or deck card with `pause: true` that comes up (the Grey Marches' Greywood Wyrm): only when that result comes up.

Until you press **Continue** the party doesn't move on. What a paused result does to the trip (getting lost, the weather) applies when you continue; its effects on supplies and stats apply at once.

**Buttons that can't be used now** stay visible, disabled: hovering one says why. A value of the day the system declares blocks them (the Grey Marches' **Lost**: "Lost: not possible for the rest of the day", until the next dawn; or **The hirelings refuse to march**, until you talk them round), the action was already done today (**Once a day**), or the system's rule for it doesn't hold here and now (the Grey Marches' **Forage for food** in a storm, **Forced march** with fatigue 2 or more, the **Rite** away from a shrine or without a full Ember Moon). Camp, rest and the system's own actions all come from the system: one may have no rest, another camps differently (see [Making a system](03-systems.md)).

What the journal says, so nothing happens silently:

- **Results with what they changed**: "Foraging: Berries and roots for a day (Food +1)", "Toll: The bridge-warden takes a day’s food as toll (Food −1)", "Getting lost: Lost in the fog: no progress today (Lost)".
- **Actions** with how long they took, and when nothing was rolled: in the Grey Marches, **Forage for food** on hills says "Forage for food (3 h): nothing to forage on hills: only woods, fields, heath and marsh give food". The three hours still pass and the march is still halved.
- **Actions the system takes by itself**, like eating as each day ends, with what they changed ("Eat (Food −1)"); a value that hits its minimum or maximum ("Food can’t go lower than 0") and **fatigue** changes with their reason ("Not enough to eat: Fatigue +1"); what an action changed goes on its own line ("Camp for the night (Fatigue −1)", "Rest for 2 h (Fatigue −1)").

## Ways of travelling

The list in the panel has the ways of travelling the system declares, each with its speed. Some can't be chosen everywhere: the Grey Marches' **By boat** only at the water's edge or the ferry, and only through water and coast; **By cart** only along roads (with no road ahead there's no route). A value of the day can leave one behind: the Grey Marches' **Deep snow** (falling snow sets it) blocks **On horseback**, and a party already riding stops until you choose another way (on foot the trip goes on). Terrains may open and close too: the Grey Marches' peaks only in summer and not in snow, their lakes only in the two coldest months (crossed on the ice); routes go around what's closed.

## A day, step by step

What happens and when, with the Grey Marches as the example (other systems roll other things, at the same moments):

1. **Dawn**: the checks of the day start are rolled: the weather (the sky follows yesterday's) and, off roads and rivers, getting lost. The actions the system takes at dawn go first (the hirelings grumble if yesterday went hungry).
2. **Marching**: each hex entered rolls its own checks: an encounter where the map says there's danger, the toll at Keld Bridge by road, the ford, the shrine (which pauses), a landmark (which waits for you).
3. **Nightfall**: nobody marches after dark. **Camp** (or the system's action for the night) rolls the night's checks: a night encounter where danger is 2 or more. Camp needs food left and fatigue under 10: without, the button is off, and **Travel** passes the night in the open ("Night falls and “Camp” isn't possible (…): the night passes without it"), with no fed night's relief, and marches on at dawn. **Wait until dawn** lets the time pass where the party is, whatever happens: lost and hungry, the day is gone and the party wakes on the next.
4. **The end of the day** (midnight): the system's day-end actions (eating: 1 food, and 1 fodder on horseback) and checks (a day without enough food: fatigue +1; ending it with no food left, hunger, where morale decides how it goes). Today's values end; tomorrow's tables read them as `yesterday.…`.

Your own actions fit in between: **Rest** two hours, **Forage for food** (three hours, the march halved), a **Forced march** (faster, more tired), and in the Grey Marches resting where danger is 3 or more may bring an encounter too.

## Saved as you play

The trip is saved in the browser as you play, and is still there when you come back. A [backup](../technical/05-backups.md) takes it to another computer.

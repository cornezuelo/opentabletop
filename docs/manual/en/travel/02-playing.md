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

The panel on the right is the same as in the Hexmapper: day, time and season, the weather, the marching hours used, the travel mode, supplies, fatigue and the system's party stats (e.g. the Grey Marches' Charisma, Survival and Navigation, which are added to rolls). The buttons are the actions the system declares: **Travel** (until something happens or the day ends), **1 hex**, **Camp**, **Rest**…

Checks are rolled on their tables and written in the **journal**, grouped by day. **Export** downloads the whole journal as Markdown (a heading per day, named after the trip) for your notes app or to print. The trip stops and shows **Continue** in three cases:

- a check with no table (like the Grey Marches' landmarks): resolve it yourself, then press **Continue**;
- a check that says **Pause after it** (`pause: true`): it's rolled, and the trip waits so you can describe the place or decide something (the Grey Marches' shrine);
- a table entry or deck card with `pause: true` that comes up (the Grey Marches' Greywood Wyrm): only when that result comes up.

Until you press **Continue** the party doesn't move on. What a paused result does to the trip (getting lost, the weather) applies when you continue; its effects on supplies and stats apply at once.

**Buttons that can't be used now** stay visible, disabled; hovering says why. A value of the day the system declares blocks them (the Grey Marches' **Lost**: "Lost: not possible for the rest of the day", until the next dawn), the action was already done today (**Once a day**), or the system's rule for it doesn't hold here and now (the Grey Marches' **Forage for food** in a storm). The same goes for the ways of travelling in the list: the Grey Marches' **By boat** can only be chosen at the water's edge or the ferry. Camp, rest and the system's own actions all come from the system: one may have no rest, another camps differently (see [Making a system](03-systems.md)).

What the journal says, so nothing happens silently:

- **Results with what they changed**: "Foraging: Berries and roots for a day (Food +1)", "Toll: The bridge-warden takes a day’s food as toll (Food −1)", "Getting lost: Lost in the fog: no progress today (Lost)".
- **Actions** with how long they took, and when nothing was rolled: in the Grey Marches, **Forage for food** on hills says "Forage for food (3 h): nothing to forage on hills: only woods, fields, heath and marsh give food". The three hours still pass and the march is still halved.
- **Actions the system takes by itself**, like eating as each day ends, with what they changed ("Eat (Food −1)"); a value that hits its minimum or maximum ("Food can’t go lower than 0") and **fatigue** changes with their reason ("Not enough to eat: Fatigue +1"); what an action changed goes on its own line ("Camp for the night (Fatigue −1)", "Rest for 2 h (Fatigue −1)").

The trip is saved in the browser as you play, and is still there when you come back. A [backup](../technical/05-backups.md) takes it to another computer.

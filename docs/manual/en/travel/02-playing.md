# Playing a trip

Trips here have **no map**: you describe the way ahead hex by hex. It's quick for a journey you only need in broad strokes, or to try out a system while you write it. To travel on a map, use the Hexmapper's [Play mode](../hexmapper/08-play.md): it's the same engine and the same systems.

## Starting

Pick a system on the left and open **Play**. Choose the season to start in and press **Start a trip**. Only one trip is kept at a time (in this browser); starting another with a different system asks first, because the current one and its journal are discarded.

## The way

The list on the left is the way. The party starts on hex 1 and heads for the last one.

- **Terrain** of each hex: the Hexmapper's terrains plus any the system's rules name.
- **Tags**, separated by commas. Tables and checks read them: the Grey Marches stop at `landmark` hexes, charge a toll on `toll` ones and have night lights in `haunted` ones.
- Under each hex, **To the next hex**: whether a road, trail or river joins it to the next one. What that does depends on the system (in the Grey Marches, roads are faster and keep you from getting lost or meeting anything).
- **km per hex**: the scale. Speeds in the rules are in km per day.
- **Add a hex** extends the way; **×** removes one the party hasn't reached. Hexes already walked are greyed out and can't change.

Changing the way re-plans the route right away.

## The trip

The panel on the right is the same as in the Hexmapper: day, time and season, the weather, the marching hours used, the travel mode, supplies, fatigue and the system's party stats (e.g. the Grey Marches' Charisma, Survival and Navigation, which are added to rolls). The buttons are the actions the system declares: **Travel** (until something happens or the day ends), **1 hex**, **Camp**, **Rest**…

Checks are rolled on their tables and written in the **journal**, grouped by day. A check with no table (like the Grey Marches' landmarks) waits for you: resolve it yourself and press **Continue**.

The trip is saved in the browser as you play, and is still there when you come back. A [backup](../technical/05-backups.md) takes it to another computer.

# Sub-maps

A place on a map can lead into a map of its own, a **sub-map**: the dungeon under a hill, the town on a crossroads, the caves below a mountain. A sub-map belongs to the campaign of the map it hangs from (the same world clock, factions and Oracle) and may have sub-maps of its own. The Grey Marches show one: **The Barrow-halls**, under the Barrow-halls' hex (1008) of the Hollow Hills ([The Grey Marches](../packs/02-grey-marches.md)).

## Making one

- Select a hex and, in its panel, under **Ways into other maps**, click **New sub-map here**. An empty dungeon ([squares](01-getting-started.md#hexes-or-squares) of 3 m and the dungeon palette, as **New map → Dungeon**) is kept in **Maps**, named after the hex (or _Under the hex_), in the same campaign (**Map settings → Cells** turns it into hexes). The hex now shows a small ring with a point down, its way in.
- Open it with **Open** in the same place. It's a map like any other: draw it with the same tools, at the scale you choose in **Map settings** (**km per hex**, a square's side on a map of squares: `0.01` is ten metres, a room or a passage).
- Its **Map settings** say where it hangs, under **Inside**: the map above (click it to open it) and its place there. Its **Entrance** is where the way in arrives and leaves from, its middle hex at first: select another hex and click **Make … the entrance** to move it; it shows a ring with a point up. **Kind of the way in** is the kind of connection going in and out is, as the system names it (below).
- In **Maps**, sub-maps are listed under the map they hang from, one step in (↳). The bar at the top of a sub-map says where it hangs: _The Hollow Hills › The Barrow-halls_, each name opening its map.

## Going in on a trip

- With the party on a hex that leads into a sub-map, its panel offers **Go in ↗**: the way in becomes the destination, and the march takes it as any other step. On a sub-map, its entrance offers **Go out ↗** the same way.
- Going through is a step of the way's kind: what it costs and does is the system's, as for any [connection](04-roads-and-rivers.md#connections) (its `extra` minutes, its **Open when** / **Closed when**, checks that read `connection.kind`). The step measures no distance: with no kind, it takes nothing more than the way of travelling's time a step, if it has one.
- Once through, the trip **goes on in the other map**, which opens: the same trip, party, journal and time. The party stands on the entrance (or, coming out, on the hex it went in from). Places of the map it left are named with that map's name in the journal (_The Hollow Hills · 1008_).
- The map it left keeps the party where it went in, and its **Play** panel says where the trip went on, with **Open it**. Clicking a hex there does nothing while the trip is away.

What a sub-map is for and how it plays is the system's: its terrains, checks and actions read its places as they read any map's. For the file format, see [File formats](../technical/02-file-formats.md).

# Clocks

The **Clocks** tab edits the progress clocks the system's world starts with (`kind: clocks`, one per system). **New clocks** makes one that, when full, rolls Core's twists and starts over, and names it in the system. In the Hexmapper they come with the world clock when it starts ([Progress clocks](../hexmapper/12-world.md#progress-clocks)). The YAML: [Progress clocks](../technical/07-kinds.md#progress-clocks).

## What it has

- Their **Name**.
- Each clock, by its id (how rules read it: `world.clocks.<id>`), with its **Name**, its **Description (its help**, in the World panel's help on its id), its **Segments** (any number from 1) and where it **Starts at**.
- What happens when it fills: **When full** (what happens, in words: a line on the timeline and a notice), **Rolls** (a table, oracle, generator or deck), **Changes** (other clocks and the factions: `world.clocks.the-siege: 2`, `factions.the-crown.values.strength: -1`) and **Then**: `keep` it full (the default), `reset` it to start over, or `remove` it.

Each clock's **Used by** lists what fills it and what reads it: tables, actions, checks, another clock ([Used by](04-overview.md#used-by)).

Something fills them with effects, wherever effects go: a trip's encounter, a faction's turn table, another full clock (`world.clocks.the-siege: 1`). A clock nothing fills is filled by hand on the map.

In the Grey Marches, the Greywood Wyrm wakes when the haunted lights fill its clock (and rolls what it does first); the Iron Clans' march, filled by their turns, brings Fort Keld's mutiny closer and starts over; the mutiny, once full, loses the fort and goes away ([The Grey Marches](../packs/02-grey-marches.md)).

# Clocks

The **Clocks** tab edits the progress clocks the system's world starts with (`kind: clocks`, one per system): a threat drawing near, a plan coming together, a season of raids. **New clocks** makes one that, when full, rolls Core's twists and starts over, and names it in the system. In the Hexmapper they come with the world clock when it starts ([Progress clocks](../hexmapper/12-world.md#progress-clocks)), and the Campaign app shows the same ones. This page explains how clocks work, then each part of the tab, builds a spreading fever from nothing step by step and lists the usual mistakes. Help next to each field explains it, with examples. The YAML: [Progress clocks](../technical/07-kinds.md#progress-clocks).

## How clocks work

A progress clock is a dial of **segments** (4, 6, 8, any number from 1) that fill one by one as something advances. It does nothing while it fills; what matters is **what happens when it's full**.

- **They live in the world clock.** The system says which clocks its world **starts** with, and how far filled; they come when the world clock starts (or with **Add the system's clocks**, for one declared later). From then on the campaign keeps them: changing the system doesn't move a clock already there. Without the world clock running there are no clocks: a trip plays, but nothing fills.
- **Anything with effects fills them**, wherever effects go: a trip's check or table result (`world.clocks.the-fever: 1`), an action's step, a table rolled by hand on the map, a faction's turn table, another clock filling. `-1` empties a segment, `'=0'` empties it all. And by hand: a click on a segment in the World panel.
- **When it fills**, once: what it says in **When full** goes to the timeline (and a notice); it **Rolls** a table, whose result goes to the timeline too; its **Changes** and the table's apply, to other clocks and to the factions (never to a trip's party: the world has none); and **Then** it stays full (`keep`, the default), starts over empty (`reset`) or goes away (`remove`). A full clock that fills another may fill it too, in a chain (up to ten in a row).
- **The trip hears it.** A clock filling, however it fills, is a moment the trip going on in the campaign hears, if its rules name it: an action with **By itself at** `world.clocks.the-fever.full`, or a check with that **When**. Its journal says _In the world: The marsh fever filled_ first, then what the system does. In the same app it's heard at once (or as the step that filled it ends); filled in another app, on the trip's next step.
- **Everything reads them.** Conditions and tables, a trip's or a hand roll's, read how full a clock is by its id: `world.clocks.the-closed-roads: { gte: 2 }` (two segments or more), `{{world.clocks.the-fever}}` in a text. A trip reads the clocks as they were when its step began: what the step fills is seen from the next one.

![A clock of four segments, one filled when the world clock starts, and what fills it: a trip's check, a click in the World panel, a faction's turn, another clock. When the fourth segment fills: When full goes to the timeline, Rolls rolls its table, Changes ticks another clock, the trip going on hears world.clocks.the-fever.full and its action happens; then keep, reset or remove.](clock-full.svg)

## The tab

- Their **Name**: what these clocks are called together.
- Each clock, by its id (how rules read it: `world.clocks.<id>`, whatever the player renames it on the map), with its **Name**, its **Description (its help**, in the World panel's help on its id), its **Segments** and where it **Starts at** (segments already filled when the world clock starts; empty, none).
- What happens when it fills: **When full** (in words: a line on the timeline and a notice), **Rolls** (a table, oracle, generator or deck: `core/table.twists`), **Changes** (other clocks and the factions: `world.clocks.the-closed-roads: 1`, `factions.the-crown.values.strength: -1`) and **Then**: `keep`, `reset` or `remove`. Leave them empty for a clock that only fills, and that rules read.

Each clock's **Used by** lists what fills it and what reads it: tables, actions, checks, another clock ([Used by](04-overview.md#used-by)).

## Step by step: a spreading fever

A fever haunts the marshes. Travellers who cross them carry it, and each time it reaches the villages the lords lose patience: the second time, they close the roads. Word of the fever reaches the party wherever it is, and a closed road turns it back at the barrier. Start from a new system: it begins as a copy of the Generic rules, without clocks.

1. **Create it**: type _The Fever Marshes_ under the system list and press **+**.
2. **The fever**: in **Clocks**, **New clocks**. Name them _Troubles of the marshes_. Change the clock `the-threat-grows` into `the-fever`, named _The marsh fever_, **Segments** `4`, **Starts at** `1`; **When full** _The fever reaches the villages._; **Rolls** stays `core/table.twists`; **Changes** `world.clocks.the-closed-roads: 1`; **Then** `reset`.
3. **The roads**: add a clock `the-closed-roads`, named _The roads close_, **Segments** `2`; **When full** _The lords close the roads._; nothing to roll or change, and **Then** empty (`keep`: once closed, they stay closed).
4. **Travellers carry it**: in **Checks**, **Add a check**, with **Check** `FEVER`, named _Fever_. **When** `trip.hex-enter`; **Only if** `hex.terrain` · **is** · `swamp`; no table; **Changes** `world.clocks.the-fever` · `1`.
5. **The barrier**: **Add a check**, with **Check** `BARRIER`, named _Turned back at the barrier_. **When** `trip.hex-enter`; **Only if** the rows `world.clocks.the-closed-roads` · **is at least** · `2` and `trip.edges` · **is** · `road`; no table; tick **Pause after it**.
6. **Word of it**: in **Rules → Actions**, **Add an action** `news`, named _Word of the fever_, with **By itself at** `world.clocks.the-fever.full`. Its one step: **Say** _Word comes: the fever has reached the villages._
7. **A map**: in the Hexmapper, **New map**; in **Map settings → Campaign → System**, _The Fever Marshes_. Paint a row of hexes: one of `plains`, three of `swamp`, then three of `plains` with a `road` along them.
8. **Play it**: open the **World** panel (☾) and **Start the world clock**: its **Clocks** tab shows _The marsh fever_ at 1/4 and _The roads close_ at 0/2. In **Play**, put the party on the first plains hex, set the plains hex after the swamps as the destination and travel there.
9. **By hand**: in the **World** panel's **Clocks** tab, click the fever's fourth segment. Then set the last plains hex as the destination and travel on.

**What you'll see.** Each swamp hex entered fills a segment of the fever (the journal says _Fever_, and the World panel shows the clock one segment fuller). The swamps are slow: on foot a hex takes more than a day's march. Entering the third one fills it: the timeline says _The fever reaches the villages._ and the twist Core's table rolled, the fever starts over at 0/4 and the roads go to 1/2; as the step ends, the trip's journal says _In the world: The marsh fever filled_ and then _Word comes: the fever has reached the villages._ The road beyond is still open. In step 9, your click fills the fever by hand: the timeline gets its lines again, the roads fill (2/2) and say _The lords close the roads._, and the trip hears the fever at once, _Word comes…_ again in its journal. Travelling on, the first hex entered along the road stops the trip: _Turned back at the barrier at …: waiting for you_, naming the hex. Clearing a segment of the roads (click the last filled one) opens them again.

## The same in YAML

The clocks, as the **YAML** tab shows them:

```yaml
# clocks.yaml
kind: clocks
id: default # step 2
name: Troubles of the marshes
clocks:
  the-fever:
    name: The marsh fever
    segments: 4
    filled: 1
    onFull:
      description: The fever reaches the villages.
      resolve: core/table.twists
      effects: { world.clocks.the-closed-roads: 1 }
      then: reset
  the-closed-roads: # step 3
    name: The roads close
    segments: 2
    onFull:
      description: The lords close the roads.
```

What the other steps add to the system and the Generic rules (an excerpt: the rest stays as it was):

```yaml
# system.yaml (kind: system), named by step 2
clocks: clocks.default
---
# travel.yaml: the rules (kind: travel-rules)
checks:
  - event: FEVER # step 4
    name: Fever
    at: trip.hex-enter
    when: { hex.terrain: swamp }
    effects: { world.clocks.the-fever: 1 }
  - event: BARRIER # step 5
    name: Turned back at the barrier
    at: trip.hex-enter
    when: { world.clocks.the-closed-roads: { gte: 2 }, trip.edges: road }
    pause: true
actions:
  news: # step 6
    name: Word of the fever
    on: world.clocks.the-fever.full
    do:
      - { id: news, say: 'Word comes: the fever has reached the villages.' }
# … the Generic rules' day, terrains, ways, food and actions
```

The Grey Marches play with all of this and more (the Greywood Wyrm, filled by the haunted lights, that rolls what it does first and wakes every companion's dread; the Iron Clans' march, filled by their world turns, that brings Fort Keld's mutiny closer and starts over; the mutiny that loses the fort and goes away): their [page](../packs/02-grey-marches.md) says where.

## Common mistakes

- **Nothing fills.** Clocks need the world clock running: without it, a trip's `world.clocks.the-fever: 1` changes nothing. **Start the world clock** in the World panel (or the Campaign app).
- **A clock that doesn't come.** The system's clocks come when the world clock starts. One declared after that (or removed on the map) comes back with **Add the system's clocks** in the World panel's **Clocks** tab.
- **Starts at changed, world unchanged.** Where a clock starts is read once, when it comes. A campaign that already has it keeps how far it is: fill it by hand.
- **An id renamed.** Rules read a clock by its id: renaming `the-fever` leaves `world.clocks.the-fever` naming nothing, and the trip's action never happens. **Used by** lists what names it.
- **The trip doesn't hear it.** Only the trip going on in the campaign hears a clock fill, and only the moments its rules name: `world.clocks.<id>.full`, with the clock's id and `.full`. The system's problems warn about a moment naming a clock it doesn't declare (a clock made by hand on the map is named by its name in lowercase with dashes, so it may still be heard).
- **A full clock that fills again at once.** `reset` empties it; with `keep`, a full clock stays full, and filling it more fills it no further: it doesn't fill again. To have it happen each time, use `reset`.
- **Party changes in Changes.** A clock's **Changes**, and its table's, change the world: other clocks and the factions. `party.…` there changes nothing. For the party, let the trip hear it: an action at `world.clocks.<id>.full` with **Change values**.
- **A condition one step late.** A trip reads the clocks as they were when its step began: in the step that closes the roads, the barrier isn't there yet; from the next step on, it is.
- **Comparing with the wrong number.** `world.clocks.<id>` is how many segments are filled, not whether it's full: `{ gte: 2 }` for a clock of 2 segments means full. A clock that `reset`s is never seen full by conditions, only heard filling.

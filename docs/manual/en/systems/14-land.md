# Land

The **Land** tab edits the system's **land models** (`kind: land`): terrain with memory. For each terrain, a model says how likely a hex next to it is to be each terrain, so land that's generated or discovered grows coherent (forests stay forests, hills gather into ranges, water into lakes) instead of a patchwork. **New land model** makes one, to change, and lists it in the system (`land:` in its Overview). This page explains how a model decides a hex, then the tab, builds a small model step by step and lists the usual mistakes. The YAML: [Land models](../technical/07-kinds.md#land-models).

## How a model decides a hex

- **Its known neighbours.** An empty hex looks at the six hexes around it that have a terrain (painted, or decided already).
- **Their rows, added up.** For each of them, the model's row for its terrain: the weights of what a hex next to it becomes. Two forest neighbours count the forest row twice; a hex between forest and hills leans to both. A terrain the model has no row for adds nothing.
- **One pick.** A terrain is picked by those weights: weights, not percentages (`forest 6`, `hills 2` is three forests for each hill).
- **Where nothing is known**: a hex with no known neighbour the model has a row for uses its own weights (the first hex of a blank map).
- **The hex it's seen from**: in discovery, the hex the party stands on may count more than the others (**The hex it's seen from counts** `2`: the land you come from counts twice).

Where it's used, once the system lists it:

- Map's **Generate land** (Terrain tool) fills a map's empty hexes, and a region's **Generate its empty hexes** a region's, growing from the land you painted outwards ([Terrain](../map/02-terrain.md#generating-land)).
- **Discovery**, when the bindings decide empty hexes with it (`discover.terrain: { land: land.default }`), or when the terrain table hands a hex over to it (`set: { land: land.default }` on an entry) ([Discovering the map](../oracle/07-connecting.md#7-discovering-the-map)).

## The tab

- **Name**: what the model is called (_The lie of the land_).
- **The hex it's seen from counts**: how many times the hex the party stands on counts in discovery (empty: once, as any other).
- **Next to each terrain**: a grid. Each row is a terrain a hex may stand next to; each column, what that hex may become; each cell, a weight (empty is 0). Each row starts with its colour on Map's palettes. **×** removes a row; **Add a terrain**, with a terrain of the rules or the palette, adds one (going on as itself, `1`, until you weigh it).
- **Where nothing is known**: the weights of a hex with no known neighbour.
- **Over many hexes**: how much of each terrain a large patch grown from nothing has, from the weights above.
- **A patch of this land**: land grown from nothing with the model, in Map's terrain colours; **Another** draws another patch.

## Step by step: a land of forests and lakes

A new system starts without a land model. In a system of your own:

1. **The model**: in the **Land** tab, **New land model**. It starts with plains, forests, hills and mountains; name it _Forests and lakes_.
2. **Forests that go on**: in the **Forest** row, `forest` · `6`, `plains` · `1`.
3. **Lakes**: **Add a terrain** `lake`. In its row, `lake` · `4`, `forest` · `2`; in the **Forest** row, `lake` · `1`.
4. **Look**: **A patch of this land** shows forests with lakes in them, and **Over many hexes** how much of each; **Another** for another patch. If the lakes are too many, lower `lake` in their own row.
5. **Use it**: in Map, a map playing this system (**Map settings → Campaign → System**); paint a forest hex and, in the Terrain tool, **Fill the empty hexes**.

## The same in YAML

```yaml
kind: land
id: land
name: Forests and lakes
next:
  plains: { plains: 5, forest: 2, hills: 1 }
  forest: { forest: 6, plains: 1, lake: 1 } # step 2 and 3
  hills: { hills: 4, mountains: 2, plains: 1 }
  mountains: { mountains: 4, hills: 2 }
  lake: { lake: 4, forest: 2 } # step 3
start: { plains: 2, forest: 1 }
```

Core's _The plain land_ is the smallest model for any map; the Grey Marches' _The lie of the Marches_ counts the land you come from twice and decides their unmapped east past the Hollow Hills: their [page](../packs/02-grey-marches.md) says where.

## Common mistakes

- **A patchwork.** A row that doesn't weigh its own terrain most (`forest: { plains: 3, forest: 1 }`) scatters it. Give each terrain its own column most in its row.
- **A terrain that never comes.** Nothing leads to it: no row gives it weight, nor **Where nothing is known**. Give it a little weight in a neighbour's row (`plains: { lake: 1 }`).
- **A terrain that swallows the map.** It leads only to itself (`lake: { lake: 6 }`): once one comes it spreads. Let it lead back to others (`lake: { lake: 4, marsh: 1, plains: 1 }`).
- **Not offered in Map.** The system must list the model (`land:` in its Overview), and the map must play that system.
- **A terrain the rules don't know.** The model names a terrain the travel rules have no row for: the pack shows a warning; a hex would get a terrain nothing reads. Add it to **Rules → Terrains**, or use one they know.

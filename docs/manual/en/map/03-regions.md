# Regions

Regions name areas of the map: kingdoms, territories, danger zones. Use the **Regions** tool (<kbd>N</kbd>).

## Creating and painting

1. **New region** creates one and selects it.
2. Paint its cells with the brush (same **Brush size** as terrain). <kbd>Shift</kbd>+drag paints a rectangle. Right-click takes cells out of their region; <kbd>Ctrl</kbd>+click picks the region of a cell.
3. In the region's settings: **Name**, colour, **Show the name on the map** with its **Style** (the map's, or its own) and a **Linked note**.

**Generate its empty cells**, in its settings, fills the region's cells that have no terrain yet with the system's land model, as the Terrain tool's **Generate land** does for the whole map (its seed and model): a region of empty cells painted east of a range grows from the range ([Terrain](02-terrain.md#generating-land)).

A cell is painted into one region at most, though that region may lie [inside others](#regions-inside-regions). The cell panel also has a **Region** list to change it. **Delete region**, in its settings, removes it (it asks first if it has cells): its cells and the regions inside it go to the region it lay inside, or are left without a region; ↶ undoes it.

## Values

A region can have **fields** too (key–value, like a cell's). They hold for **every cell of the region**: give the Greywood `danger: 2` once instead of on each of its cells. A region [inside it](#regions-inside-regions) can say otherwise for its own cells, and a cell's own field with the same key wins over all, so the heart of the forest can say `danger: 4` and one cell in it `danger: 5`. A cell's panel shows what it gets from its regions under its own fields ("From its region (The Greywood): danger = 2"). Tables and travel checks read them like the cell's: `{{place.danger}}`. See [What tables see](../technical/04-what-tables-see.md).

## Regions inside regions

A region can lie **inside** another: choose it in its panel's **Inside** list (any region but itself and those inside it). The Deepwood inside the Greywood, the Heart of the Greywood inside the Deepwood; a chapel inside a temple, an altar inside the chapel. Paint the inner one's cells as any region's: a cell keeps the innermost region it's painted into, and it's in every region up the tree.

- **Its values come from outside in**: the outer region's hold on the inner one's cells, the inner one's win where both set the same, and a cell's own win over all. In the Grey Marches the Greywood says `danger: 2`, the Deepwood inside it `3`, its heart `4`, and one cell of the heart `5`: four values instead of twenty-five cells' fields.
- **Conditions on the outer one hold inside it**: `place.region: The Greywood` holds in the Deepwood and its heart too, and `place.region: The Deepwood` only there. Tables read `place.region` as the list of every region the cell is in, innermost first (`[The Heart of the Greywood, The Deepwood, The Greywood]`); `{{place.region}}` writes them with commas.
- **Rooms**: a region inside a [room](#rooms) is still that room, unless it's played as one place too. Then it's a room of its own inside the other, with a wall between them unless a door is drawn (the Barrow-halls' grave-niche, inside the chief's tomb).

The Regions panel lists each region under the one it lies inside; hovering a cell says them all from the outside in (_Region: The Greywood › The Deepwood_), and each region is drawn over the one it lies inside.

## On the map

A region is drawn as a light tint, a border along the inside of its outline (so neighboring regions don't overlap) and its name in the middle. Regions are the geography, so they look like an atlas's: a flat colour and a solid line. [Factions](12-world.md#factions), the politics, are drawn differently over them (stripes of their colour and a dashed frontier), so a cell of a region held by a faction reads as the region's colour with the faction's stripes.

**While you work with the Regions tool**, the region it paints is outlined (a thick light line with a dark edge, which shows on any terrain) and the rest of the map is dimmed; the factions' land fades, so the regions come forward (the **Factions** layer still hides it). Hovering a cell says under the map what holds it: _Region: The Greywood · Faction: The Iron Clans_.

**Map settings → Regions** sets how every region looks: the **fill** (how strong the tint is; 0 for none), the **border** width (0 for none), its opacity, and whether it's **dashed**. A region can look its own way instead: tick **Own style** in its panel and move its own sliders. In the Grey Marches the Greywood has a stronger tint and the Hollow Hills only a dashed border. The **Regions** layer hides or locks them all; **Map settings → Map texts** styles or hides every region name.

## In play

Travel checks and Oracle rolls see the cell's region by its **name**, so a table can say `when: { place.region: Black Marches }`; inside other regions, it holds for each of them ([Regions inside regions](#regions-inside-regions)). See [The Oracle in the map](09-oracle.md).

## Rooms

Tick **Played as one place (a room)** in a region's panel and a trip takes the whole region as **one place**, as a room is in a dungeon; left unticked, each of its cells is a place of its own, as on any map. What changes is what a trip does there. Take a hall of twelve squares with an encounter check on entering a place:

- **Unticked**: crossing the hall takes up to twelve steps, each square entered is a place entered, so the check may come up on every square, and tables read the square the party stands on.
- **Ticked**: going in is **one step**, wherever you come in, the check comes up **once**, and tables read the hall: its name, its values and its tags.

A trip is _in_ it, not in one of its cells: stepping in is one step wherever you come in, whatever its size, and the party's token stands on the cell it came in by. Clicking any of its cells in Play heads for the room. Tables see the room as the place: its name (`place.name`), its values (`{{place.danger}}`), every tag of its cells (`place.tags: landmark`), their most common terrain and whether it's floor. In the journal and the file it's `area:<the region's id>`.

On [floor](02-terrain.md), a wall stands by itself between two rooms that touch; draw a [connection](04-roads-and-rivers.md#connections) across it for a door (a kind the system names: its time, whether it's shut now). A corridor's floor in no room joins rooms openly. A region inside a room is still that room (it names part of it, and tables read the room), unless it's played as one place too: then it's a room of its own inside the other, with a wall between them unless a door is drawn. The Grey Marches' Barrow-halls have three rooms (the barrow stair, the long barrow, the chief's tomb), a bronze door into the tomb, and a fourth room inside the tomb, the grave-niche, behind a sealed slab.

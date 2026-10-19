# Regions

Regions name areas of the map: kingdoms, territories, danger zones. Use the **Regions** tool (<kbd>N</kbd>).

## Creating and painting

1. **New region** creates one and selects it.
2. Paint its hexes with the brush (same **brush size** as terrain). Right-click takes hexes out of their region; <kbd>Ctrl</kbd>+click picks the region of a hex.
3. In the region's settings: **name**, **color**, **show the name on the map** with its **style** (the map's, or its own) and a **linked note**.

A hex belongs to one region at most. The hex panel also has a **Region** list to change it. **Delete region**, in its settings, removes it (it asks first if it has hexes, which are left without a region; ↶ undoes it).

## Values

A region can have **fields** too (key–value, like a hex's). They hold for **every hex of the region**: give the Greywood `danger: 2` once instead of on each of its hexes. A hex's own field with the same key wins, so the heart of the forest can say `danger: 3`. A hex's panel shows what it gets from its region under its own fields ("From its region (The Greywood): danger = 2"). Tables and travel checks read them like the hex's: `{{danger}}`. See [What tables see](../technical/04-what-tables-see.md).

## On the map

A region is drawn as a light tint, a border along the inside of its outline (so neighboring regions don't overlap) and its name in the middle. Regions are the geography, so they look like an atlas's: a flat colour and a solid line. [Factions](12-world.md#factions), the politics, are drawn differently over them (stripes of their colour and a dashed frontier), so a hex of a region held by a faction reads as the region's colour with the faction's stripes.

**While you work with the Regions tool**, the region it paints is outlined (a thick light line with a dark edge, which shows on any terrain) and the rest of the map is dimmed; the factions' land fades, so the regions come forward (the **Factions** layer still hides it). Hovering a hex says under the map what holds it: _Region: The Greywood · Faction: The Iron Clans_.

**Map settings → Regions** sets how every region looks: the **fill** (how strong the tint is; 0 for none), the **border** width (0 for none), its opacity, and whether it's **dashed**. A region can look its own way instead: tick **Own style** in its panel and move its own sliders. In the Grey Marches the Greywood has a stronger tint and the Hollow Hills only a dashed border. The **Regions** layer hides or locks them all; **Map settings → Map texts** styles or hides every region name.

## In play

Travel checks and Oracle rolls see the hex's region by its **name**, so a table can say `when: { hex.region: Black Marches }`. See [The Oracle in the map](09-oracle.md).

# Regions

Regions name areas of the map: kingdoms, territories, danger zones. Use the **Regions** tool (<kbd>N</kbd>).

## Creating and painting

1. **New region** creates one and selects it.
2. Paint its hexes with the brush (same **brush size** as terrain). Right-click takes hexes out of their region; <kbd>Ctrl</kbd>+click picks the region of a hex.
3. In the region's settings: **name**, **color**, **show the name on the map** with its **style** (the map's, or its own) and a **linked note**.

A hex belongs to one region at most. The hex panel also has a **Region** list to change it.

## Values

A region can have **fields** too (key–value, like a hex's). They hold for **every hex of the region**: give the Greywood `danger: 2` once instead of on each of its hexes. A hex's own field with the same key wins, so the heart of the forest can say `danger: 3`. Tables and travel checks read them like the hex's: `{{danger}}`. See [What tables see](../technical/04-what-tables-see.md).

## On the map

A region is drawn as a light tint, a border along the inside of its outline (so neighboring regions don't overlap) and its name in the middle. The **Regions** layer hides or locks them all; **Settings → Map texts** styles or hides every region name.

## In play

Travel checks and Oracle rolls see the hex's region by its **name**, so a table can say `when: { region: Black Marches }`. See [The Oracle in the map](09-oracle.md).

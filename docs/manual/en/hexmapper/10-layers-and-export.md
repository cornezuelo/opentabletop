# Layers, size and export

## Layers

**Layers** (the ▤ button in the top bar) lists the parts of the map in the order they're drawn, the top one above the rest: note markers, tokens, trail and route, text, coordinates, icons, roads and rivers, factions (each one's land in its colour), regions, grid and terrain.

- The **eye** shows or hides a layer while you work. Hidden layers aren't exported either.
- The **lock** protects a layer from your own clicks: no tool can change it until you unlock it.

## Locking layers

Many clicks on the map could change more than one thing: a click near a river can grab one of its points, a drag over a token moves it, a stroke with the wrong tool repaints the terrain. Lock what you've finished and work on the rest without fear:

- Lock **terrain** before painting regions or placing tokens over a finished map.
- Lock **roads and rivers** while placing icons next to them.
- Lock **icons** and **text** when the map is finished and you only play on it.
- Lock **tokens** to keep the pieces where they are while you edit the map under them.

A locked layer is still drawn and exported. Trying to change it shows a notice saying which layer is locked. Terrain, regions, roads and rivers, icons, text and tokens can be locked; the grid, coordinates, markers and the trail can only be hidden. Playing a trip still moves the party: the lock is for editing, not for play.

**Highlight a tag**, at the bottom of Layers, outlines every hex with that tag (`landmark`, `haunted`, `shrine`: the box suggests the map's own) and says how many there are; **Dim the other hexes** shades the rest so they stand out. It's only a view while you look: nothing is saved, and **Stop highlighting** clears it.

Hex, region and token names are set in **Map settings → Map texts**.

## Size and printing

In **Map settings → Map size**, size the map by number of hexes, or by paper: choose the paper (A5 to A1, Letter, Legal, Tabloid or custom), the margins and the hex size in millimetres, and the grid is fitted to it. The panel shows the printed size and the smallest paper that fits.

## Export

**Export** (the arrow in the top bar):

- **PNG** by pixels per hex, for virtual tabletops, optionally with a transparent background.
- **PDF** at real scale (150 or 300 dpi) to print: hexes come out at the size you chose.
- **Split into pages** (PDF): a map too big for one sheet is printed on several pages of the paper you pick (A4, Letter…, upright or **Landscape**), still at real scale. Before exporting it says how many: "6 page(s): 3 across, 2 down, overlapping 10 mm". Neighbouring pages repeat 10 mm of the map, to trim and glue them, and each page says in its corner where it goes (**B3**: second row, third column). The Grey Marches' example map at 25 mm hexes takes six A4 pages.
- **Empty hexes in white** (PNG and PDF): hexes without terrain print white instead of dark, with dark coordinates and icons on them, to save ink (a map still being explored, or one to fill in by hand). The editor keeps showing them as before.

Only visible layers are exported.

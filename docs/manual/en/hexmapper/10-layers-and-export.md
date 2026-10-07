# Layers, size and export

## Layers

**Layers** (the ▤ button in the top bar) lists the parts of the map in the order they're drawn, the top one above the rest: note markers, tokens, trail and route, text, coordinates, icons, roads and rivers, regions, grid and terrain.

- The **eye** shows or hides a layer while you work. Hidden layers aren't exported either.
- The **lock** protects a layer from your own clicks: no tool can change it until you unlock it.

## Locking layers

Many clicks on the map could change more than one thing: a click near a river can grab one of its points, a drag over a token moves it, a stroke with the wrong tool repaints the terrain. Lock what you've finished and work on the rest without fear:

- Lock **terrain** before painting regions or placing tokens over a finished map.
- Lock **roads and rivers** while placing icons next to them.
- Lock **icons** and **text** when the map is finished and you only play on it.
- Lock **tokens** to keep the pieces where they are while you edit the map under them.

A locked layer is still drawn and exported. Trying to change it shows a notice saying which layer is locked. Terrain, regions, roads and rivers, icons, text and tokens can be locked; the grid, coordinates, markers and the trail can only be hidden. Playing a trip still moves the party: the lock is for editing, not for play.

Hex, region and token names are set in **Settings → Map texts**.

## Size and printing

In **Settings → Map size**, size the map by number of hexes, or by paper: choose the paper (A5 to A1, Letter, Legal, Tabloid or custom), the margins and the hex size in millimetres, and the grid is fitted to it. The panel shows the printed size and the smallest paper that fits.

## Export

**Export** (the arrow in the top bar):

- **PNG** by pixels per hex, for virtual tabletops, optionally with a transparent background.
- **PDF** at real scale (150 or 300 dpi) to print: hexes come out at the size you chose.

Only visible layers are exported.

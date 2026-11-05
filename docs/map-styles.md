# Map styles: a beautiful map, the schematic one kept

Design of the map's redesign (backlog: _Map looks like a beautiful map editor_), proposed 2026-11-05 and **agreed with the user the same day** (§9). It grows [places.md](places.md) §9 ("simple now, easy to make beautiful later") into a style system.

## 1. What was asked and decided

- User, 2026-10-31: "algo estilo Dungeon Scrawl, y unos hexes más bonitos y gráficos en vez de esquemáticos (seguramente haya que bajar SVGs de montañas, bosques y tal free, o generar los nuestros)".
- **The schematic look stays** as one style among the others, chosen per map (user, 2026-10-31).
- **Art from both sources** (user, 2026-11-05: "yo diría ambas"): drawn by code, and FOSS art sets whose licence allows bundling.
- Order agreed (2026-11-05): this design → illustrated cells → styled dungeons and connections → names moved by hand → agents' play-testing → the app's UI/UX from what they find.

## 2. Today

One look, settings scattered over the map: each terrain a flat `color` and an optional `glyph` (a game-icons.net symbol in a shade of the colour), the region style (`fill`, `border`, `dashed`), caption styles (hex, region and token names: `font` among `fell` / `cinzel` / `sans`, size, colour, halo), walls as one dark line, connections a dashed line with a diamond, ways a badge. The renderer (`apps/map/src/lib/render/MapRenderer.ts`, PixiJS) already draws in layers: terrain, glyphs, regions, factions, walls, paths, connections, ways, labels, icons, names, tokens, party.

What looks schematic in the screenshots of the Grey Marches: every cell a flat hexagon with a small repeated glyph and its coordinate; terrains meet in hard edges; the coast is the hex outline; rivers and roads are smooth even lines; forests are colour, not trees.

## 3. What a style is

**A style is data**: how each thing the map holds is drawn, never what it is. Changing style never touches the map's cells, the rules or a trip. It is a **pack kind**, `kind: style`, so a system can bring its own (a parchment hexcrawl, a blueprint dungeon), Core brings the generic ones, the user makes or edits theirs, and its texts are translated in `locales/` as any kind.

A map names one style (`meta.style: core/parchment`). **Choosing a style copies its settings into the map** (built in phase 1, 2026-11-05: simpler than keeping them as overrides, and no migration of the maps' own settings): its names', regions', coordinates' and glyphs' settings become the map's, which it changes freely after, and Ctrl+Z puts the previous look back. What only a style decides (the grid's line; the paper, the ground's art, shores and strokes to come) is read from it while drawing, so a change to the style shows at once. A system may name the style its new maps start with. A map without a style is drawn in Core's **Schematic** one, today's look, so older maps look exactly as before (maps v36, no migration needed).

What a style decides, layer by layer:

| Layer                                    | Decides                                                                                                                                        | Examples                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Paper**                                | the background beyond and under the map                                                                                                        | dark slate; parchment with a stain texture; blueprint blue                                     |
| **Ground** (per terrain)                 | a **fill** and an **art**                                                                                                                      | flat colour; a pattern (dots, hatching); art drawn by code (`mountains`, `conifers`); an image |
| **Borders between terrains**             | hard, blended (a soft gradient or a ragged edge), or drawn (a line)                                                                            |                                                                                                |
| **Shores**                               | where water meets land: a line, ripples parallel to it, a shallow band                                                                         |                                                                                                |
| **Grid**                                 | line colour, width, opacity, shown or not, coordinates shown or not                                                                            | a faint grid on parchment; none on a printed map                                               |
| **Paths** (per kind: road, trail, river) | stroke: width, colour, dashes, wobble (hand-drawn), taper (a river widening downstream)                                                        |                                                                                                |
| **Floors and walls**                     | the floor's fill (stone flags, a grid, plain), the wall's stroke, and what is drawn **outside** a wall: a hatched band, a shadow, rough rock   | Dungeon Scrawl's classic look; a cave                                                          |
| **Connections** (per kind)               | a line and a **symbol** where it is drawn: a door on its wall, a bridge or ford across the river, a tunnel's mouths, a ferry's dashed crossing | (_styles for the map's connections_)                                                           |
| **Ways** into and out of sub-maps        | their badge (today's orange / blue) or a drawn symbol (a stair, a cave mouth)                                                                  |                                                                                                |
| **Regions**                              | today's region style (tint, border, dashes)                                                                                                    |                                                                                                |
| **Texts**                                | the fonts and colours of every caption, halo                                                                                                   |                                                                                                |
| **Icons and tokens**                     | tint, a shadow, a ring                                                                                                                         |                                                                                                |

Only the Ground row is new in kind; the rest are today's settings gathered, plus strokes the renderer learns.

## 4. Ground art drawn by code

A terrain's art is drawn by a **painter**: a small piece of code that, given a cell's shape, a seed and the style's colours, draws a few symbols over it. Painters are built in (code, not data: packs never carry drawing code); a style picks one per terrain and tunes it with data.

- **Painters to start with**: `mountains` (peaks with a shaded side, bigger in the middle), `hills` (rounded humps), `conifers` and `broadleaf` (trees in clumps, overlapping into the next cell for a forest's mass), `grass` (tufts), `marsh` (reeds and water lines), `waves` (sea), `dunes`, `rocks`, `farmland` (field strips), `ruins`. Enough for the Grey Marches and Core's terrains; more come as packs need them.
- **Variation without randomness**: each cell's seed is its coordinates hashed, so the art is the same every time it is drawn and printed, differs from the next cell's, and needs no `RandomSource` (it isn't play).
- **Depth**: symbols are sorted by their foot so those further down the map are drawn over those above, and big ones (peaks, trees) overlap into the next cell: forests and ranges read as masses, not tiles.
- **Tuned by data**: `art: { painter: conifers, density: 0.8, size: 1.1, colors: [...] }`; a terrain with no art keeps its glyph.
- **A system's own terrains**: a style says what each terrain looks like by **id** (`forest`, `dense-forest`…) and, for the ones it doesn't know, by a fallback the terrain itself may suggest (a terrain's `look: conifers` hint in its system), else its flat colour and glyph. So a style made for one system still draws another's map sensibly.

## 5. Art from FOSS sets

An image is **one more kind of fill or symbol**: a style may say a terrain is drawn by an image per cell (a hex tile), or by images scattered as a painter scatters its symbols (stamps: a mountain, a tree). The images come from:

- **Bundled sets**, each a pack of its own (`packs/art-<name>/`) with its licence and attribution in `pack.yaml`, as content packs do; only sets whose licence allows bundling (CC0, CC BY, OFL for fonts). Candidates to check, nothing checked yet: Kenney's hexagon tiles (CC0), the relief icons of Azgaar's Fantasy Map Generator (MIT repository: to confirm the icons' own licence), sets on OpenGameArt marked CC0 / CC BY, game-icons.net (CC BY 3.0, already used for glyphs). Excluded: anything NC or "free for personal use" (it can't go in a public build).
- **The user's own images**, imported as today's `asset:` icons.

The style's credits show in Map settings and in the printed map's legend when it uses a CC BY set.

## 6. The styles we bring

- **Schematic** (Core): today's look, exactly.
- **Parchment** (Core): a hexcrawl drawn in ink on paper: art by code in sepia ink with a light wash of each terrain's colour, blended borders, rippled shores, wobbling rivers and roads, a faint grid, Fell captions. The Grey Marches' default.
- **Classic dungeon** (Core): Dungeon Scrawl's look for floors: white floor with a grid, thick black walls, a hatched band outside, doors and stairs as drawn symbols. The Barrow-halls' and the old mine's default.
- **Cave** (Core): rough rock edges and a stippled band; the old mine could use it.
- **Painted** (Core): an Inkarnate-like painted map (the look the user had in mind): rich colours blended into each other, paper and brush textures from noise, mountains and trees shaded with a lit and a shadowed side, deep and shallow water, soft shores, no grid; drawn by code first, with images from a bundled set where one fits (phase 3). Both it and Parchment are wanted (user, 2026-11-05: "voy a querer ambos").
- **Village** (Core): for hybrid maps (§6b).

Hextml's look (coloured symbols on flat cells) is close to today's Schematic style, so it isn't a style of its own.

## 6b. Hybrid maps: towns and villages

A hybrid map (a square map with ground outside and buildings inside, places.md §10) uses both halves of a style at once: the **ground** painters outside (cobbles, streets, grass, gardens, water, a well as an icon) and the **floors and walls** inside the buildings. What is new for a town is how a building looks **from outside**: seen from above, a town shows **roofs**, not floors. Proposed:

- A style says how a building (a region played as one place, on floor) is drawn from outside: its **roof** (tiles or thatch, a ridge line, a shadow cast on the street) or its **inside** (floor and walls, as a dungeon).
- In Map's editing, a **See inside** switch shows floors and walls to draw them; in play, a building shows its roof unless the party is in it (or, a system's choice, has been in it), so the village reads as a village and a house opens when entered.
- The Grey Marches' village (the backlog's _hybrid example_) is drawn in the **Village** style with phase 4.

Agreed with the user (2026-11-05: "lo de los tejados es un buen toque! con que haya un interruptor para mostrarlos siempre abiertos además de ese comportamiento, listo"): roofs from outside, the inside while the party is in the building (a house left shows its roof again), and a switch (Map's view, kept with the map's view settings) that shows every building open, in editing and in play.

Each shows in the manual's Map pages with screenshots, and the Grey Marches' page says which map uses which.

## 7. Where the code goes

- `packages/schema` / `oracle-engine`: `kind: style` parsed and validated (colours, painters by name, images by reference), as other kinds.
- `packages/map`: the map's `meta.style` and overrides, the migration moving today's settings into them, and the **resolved style** (style + overrides → what each layer draws), headless and tested.
- `apps/map/src/lib/render`: the painters (pure functions from a cell, a seed and a style to drawing commands, tested without a canvas), the new strokes (wobble, taper, hatching), and the caching: the ground's art is drawn once into textures per chunk of cells and redrawn only where a cell changed, so a 24×16 map with a hundred trees a cell stays fluid.
- Map settings: **Style** (a picker with thumbnails) and the overrides grouped by layer, as the region style is today.
- Printing uses the same renderer, so a printed map gets the style.

If a second app ever draws maps (Travel's way, Campaign's overview), the resolved style and the painters move to a shared package then.

## 8. Phases

1. ✅ (2026-11-05) **Styles as data**: `kind: style`, the Schematic style, today's settings moved into it with a migration (maps look the same); Map settings' **Style**.
2. ✅ (2026-11-05: ragged borders are geometry, each side cut and moved by a noise of the plane, the same for both cells, since Pixi's displacement filter hid the layers under it; shallows are blurred with the ground, the shores' lines aren't) **Illustrated cells**: the painters, blended borders, shores, hand-drawn paths; **Parchment** (the Grey Marches' default) and **Painted**; coordinates hidden in both.
3. ✅ (2026-11-05: images as pack files, SVG as text and the others as `data:` URLs (the user chose both over SVG alone); `art.terrains.<terrain>.images` with `count`, and a style's `texture`; the pack `azgaar-relief` (Azgaar's _colored_ and _illustrated_ sets, MIT, the illustrated set's stroke colour set on each file's root), Core's **Relief**, the Grey Marches' **Engraved atlas** with a vellum WebP of its own on the Hollow Hills; the Oracle's **+ Image**, the style form's images and texture, zip and CLI reading them) **Images**: fills and stamps from images, a first bundled set once its licence is checked.
4. **Dungeons, towns and connections** (4a ✅ 2026-11-05: a style's `floors` and `walls` (`outside`: hatch, shadow, stipple), walls following ragged ground; Core's **Classic dungeon** and **Cave**; the Barrow-halls and the mine in them. 4b ✅ 2026-11-05: a style's `connections` by kind (a symbol: door, arch, bridge, ford, stair, ladder, mouth, badge, diamond, none; a line; a colour), a connection's symbol on the side its cells share, a way's on its cell; Core's styles drawing doors, stairs, mouths, bridges and fords. 4c ✅ 2026-11-05: buildings (`mapBuildings`: floor joined side by side, split by outermost rooms) under a style's `roofs` (tiles, slate, thatch, plain; a gable per rectangle, its shadow), open while the party is in or a cell of it is selected, the **Roofs** layer (maps v37) opening them all, what a closed one holds not drawn nor clicked (decided with the user: tokens, icons, cells' names, markers, inner doors, rooms' names); Core's **Village** with the `cobbles` painter, the Town palette and **New map → Town**; the Grey Marches' Ashford. Still to do: a single connection's own look (the backlog's _styles for the map's connections_; a map's looks by kind are its style's copy, edited in the style form, 2026-11-05)): floors, walls' outside bands, roofs (§6b), connection and way symbols; **Classic dungeon**, **Cave** and **Village**; the Barrow-halls and the mine in them, and the hybrid example.
5. ✅ (2026-11-05: cells' and regions' `nameOffset`, maps v38, dragged with Select, **Place by itself** in their panels; cells' names placed by themselves, under or above their cell; free labels dragged with Select too, always where they were put) **Names moved by hand** (fourth round's (8)), with the texts' layer.

Each phase with its manual pages (Map's settings, the technical **Kinds** page for `kind: style`), its line in the changelog, and the bundled packs using it.

## 9. Decided with the user (2026-11-05)

1. **Styles are a pack kind** (`kind: style`).
2. **Parchment is the Grey Marches' default**, the Schematic one a click away.
3. **Coordinates** (left to Claude): hidden by default in Parchment and Painted, shown in the cell's panel and the line under the map; a style's grid setting shows them always.
4. **Which first**: the user doesn't mind; illustrated cells first, as proposed.
5. **The look**: both an ink hexcrawl (**Parchment**) and an Inkarnate-like painted one (**Painted**) ("inkarnate es lo que tenía pensado… no descarto esa tinta clásica"; "voy a querer ambos"). Hextml's look is roughly today's.
6. **Hybrid maps**: roofs from outside, the inside while the party is in, and a switch to show them all open (§6b).

# Places beyond hexes

Design for backlog point 7 of the user's eleven (_Places beyond hexes: rooms, doors and their connections_), with what it joined on 2026-10-29: _Sub-maps_, the _Dungeon / site mapper_, square grids, dungeons drawn piece by piece as you play, and what point 9 (conflicts) needs from it. **Decided with the user 2026-10-30** (§8); nothing built yet.

## 1. What was asked

- The user (2026-10-20): "un sistema de mazmorras podría declarar que abrir una puerta consume un turno y provoca una tirada de encuentros… No necesitas programar reglas de exploración de mazmorras: necesitas representar esos espacios y sus conexiones… ¿motor de navegación espacial independiente o basta con generalizar las interfaces de map y travel-engine?"
- Decided 2026-10-29 ("pensémoslo todo bien desde el principio"): one design for all of it, built **graph first**; Map (then the Hexmapper) supports **square grids** besides hexes; dungeons drawn **piece by piece** on discovery from a pack's table or deck (as Ker Nethalas does: a d100 or a card gives each corridor or room, turned so its entry meets the door crossed), as the land model does for terrain; drawing by hand; **sub-maps**; places can be **zones** and tokens keep a **position in play state** (point 9).
- Presentation (user: "ojo cuando afrontemos los nodos de mapas porque habrá que pensar bien como presentarlo de manera intuitiva"): campaign → maps → sub-maps, a tree in the library, a breadcrumb in the header.
- From the roster (2026-10-19): going down into a sub-map is not leaving the trip; the trip goes on in the sub-map, which belongs to its map.

## 2. What already exists

- **The travel engine already walks a graph.** It sees the world only through `TravelWorld`: `cell(id)`, `neighbors(id)`, `distance(a, b)`, `edges(a, b)` and `hexKm`. Ids are opaque strings: its tests walk `a → b → c`, and Travel's way (`wayWorld`) is a line of places with no map at all. Routes are A\* over `neighbors`, with `distance` as the heuristic and `hexKm` turning a mode's km per day into minutes per step.
- **What is hex-shaped**: `hexKm` and the minutes per step made from it; `distance` (axial); the facts' names (`hex.terrain`, `hex.tags`, `hex.id`, the `HEX_ENTER` moment, `trip.hexes`, `trip.km`); `@open-tabletop/hex` behind `mapWorld`; the map model (`hexes` keyed `col,row`, `paths` as crossed hexes); the renderer; discovery (`discover` bindings decide an empty hex's terrain, contents and reveal; terrain may come from a land model).
- **Edges** are already kinds between neighbours (`road`, `river`), read by rules (`trip.edges: road`). A door is one more kind.
- **POIs** live in hexes, with fields, a template (`kind: places`) and notes; a result can make one (`hex.pois.<place>: 1`).

## 3. The idea: every map is places and connections

A map, whatever its grid, is read by the rules as a **graph**:

- **Places**: where the party can be. On a hex or square map, by default each cell is a place (as today). A map can also have **areas**: a room, a cave, a clearing, a district, drawn over several cells and played as **one place** (the party is "in the guardroom", not in square 4,7). In a point-crawl a place is a point with no cells.
- **Connections** between places: by default, neighbouring cells connect; drawn connections add or replace them, each with a **kind** the system names (`door`, `stairs`, `passage`, `secret`, `rope`…), tags and values (`locked`, `dc: 3`). A connection's **state** while playing (found, open, locked, broken) is play state, not the map (definitions ≠ state).
- The engine changes little: `TravelWorld` names places instead of hexes; `edges(a, b)` returns the connection's kinds; `distance` is a hint for routes (any graph may give 0, the search still works); the time a step takes comes from the system (§5), not only from km.

What rules read is the same syntax, generalised: `place.terrain`, `place.tags`, `place.kind` (`hex`, `square`, `area`, `point`), `trip.edges: door`, `trip.places`. **`hex.*` goes** (decision A): every name that says hex where it means the place the party is (facts, moments, totals, effects such as `hex.pois.<place>`) is renamed, with a pack format bump; packs of the older format are refused, ours are moved.

## 4. Grids and drawing

- `grid.kind: hex | square | none`. Square grids share everything hexes do (terrain palette, paths, icons, labels, tokens, regions, fog of discovery), with 4 or 8 neighbours (a system or map setting). `none` is a point-crawl: places as pins, connections as lines.
- **Areas** are drawn on cells (paint a room's squares, like a region) or as points; **connections** drawn between areas or cells: a door on the wall between two squares, stairs, a passage between two pins.
- Later, the keyboard drawing of the _Dungeon / site mapper_ (arrows extend a corridor, R room, D door).

## 5. Time, distance and scale

Today a step's time is `hexKm` ÷ the mode's speed. For any grid:

- `scale` gives a cell's size with its unit (`hexKm` stays as the hex's; a square map may say `cellM: 3`, 10 ft).
- A system may give a step's time directly, by where it is or how it's done, with the usual conditions: e.g. a way of moving `turn: { minutes: 10 }` used `when: { 'map.kind': dungeon }`, or a connection kind that costs time (`door: { minutes: 10 }`, "opening a door takes a turn").
- Actions already cost time and roll checks (`steps`), so "open a door: a turn and an encounter check" is an action whose steps say so, offered `when: { 'place.connections': door }`. Nothing about dungeons is built in.

## 6. Sub-maps

- A place (a hex, a POI, an area) can **lead into** another map: the ruins' dungeon, a city, the caves under a hill. The sub-map belongs to its map (`meta.parent: { map, place }`), is in the same campaign, and may have sub-maps of its own.
- **Entering** is a connection of a kind the system names (`way-in`), so it costs what the system says and fires its moments; the trip goes on in the sub-map (the same trip, members, journal and time), and leaving brings the party back to the place it came from.
- **Presentation**: Map's library lists maps as a tree under their campaign (campaign → maps → sub-maps); the header shows a breadcrumb (_The Grey Marches › The Hollow Hills › The Barrow-halls_), each part opening its map; a place leading into a sub-map shows its way in on the map and in its panel (**Go in ↗** while playing, **Open** while editing).
- A sub-map may not exist yet: discovery can make it (§7), from nothing, when the party first goes in.

## 7. Pieces on discovery

- A pack declares **pieces** (`kind: pieces`): shapes on a grid (a room, a corridor, a junction) with their exits marked, their areas, connections and contents. A table or deck picks the next piece, as `discover` picks a hex's terrain today; the piece is turned and placed so one of its exits meets the way the party came in, if it fits (what happens when it doesn't is the system's: another roll, a dead end).
- Discovery's bindings grow a `piece` entry beside `terrain`, `contents` and `reveal`; a sub-map made on entering starts from the system's first piece (an entrance).
- Placed pieces are part of the map from then on (the player can edit them), like discovered terrain today.

## 8. Decided with the user (2026-10-30)

- **A. Names in rules: `place.*` only.** No `hex.*` alias (user: "¿y por qué no solo place.? no me gusta mantener mierdas viejas si hemos decidido cambiar… esta herramienta no la usa nadie, así que estamos a tiempo de hacer renombrados sin preocuparnos de migraciones o retrocompatibilidad"). The rename is the first piece of work: `PACK_FORMAT` bumped, our packs (Core, the Grey Marches, Kal-Arath in `packs-private/`) and the manual moved.
- **B. Areas are one place each** (a room over many squares is one place; squares matter for drawing and tokens' positions).
- **C. Order**: (0) `hex.*` → `place.*`; (1) the graph under the engine (places, connections with kinds and play state, the step time of §5) on today's hex maps; (2) sub-maps, with the library's tree and the breadcrumb: the Hollow Hills' _Barrow-halls_ (hex 10,8) as a dungeon under its hex, drawn by hand; (3) square grids and areas; (4) pieces on discovery (the Barrow-halls drawn as you go; Ker Nethalas in the private repo); (5) the keyboard drawing. Each phase with the Grey Marches and Core and their manual pages.
- **D. Any place can lead into a sub-map** (a hex, a POI or an area), as a connection whose kind the system names.
- **F. The look** (user, 2026-10-30): simple drawing first, built so it can be made beautiful later, as Dungeon Scrawl does: rooms painted as floor, walls derived from the floor's edge and drawn by a style the map chooses (§9).
- **E. Format** (Claude's, as proposed): maps gain `grid.kind`, `areas`, `connections` and `meta.parent`; play state gains connection states and positions inside a sub-map; a map format bump.

## 9. The look: simple now, easy to make beautiful later

User, 2026-10-30: "para diseñar hazlo sencillo, pero estaría bien darle una vuelta al diseño de hexes y mazmorras por si se pueden embellecer en el futuro de manera fácil". So the first versions draw plainly (flat fills, plain walls and doors, as hexes are drawn today), but the drawing is built so a nicer look is added later without touching the model or the rules:

- **What a thing is stays apart from how it looks.** The map says a square is `stone-floor`, a wall runs here, a connection is a `door`; how each is drawn comes from a **style**: per terrain or floor a fill, and optionally a pattern or texture; per wall a stroke; per connection kind a glyph (a door, stairs, a portcullis); per area an outline and a label. Today's terrain palette (a colour and a glyph per terrain) is the first such style, grown, not replaced.
- **Styles are data**, like packs' content: a map uses one, a system may bring its own (a parchment hexcrawl, a blueprint dungeon), and the user picks or edits it in **Map settings**. A later prettier look (hand-drawn walls, textured floors, shadows, hatching around rooms as old-school dungeon maps do) is a new style plus the renderer's new kind of stroke or fill, never a format change.
- **The renderer draws in layers** (already so: terrain, grid, paths, icons, text, tokens), and areas, walls and connections get layers of their own, so an effect (a wall's shadow, the hatching outside rooms, fog over undiscovered parts) is one more layer.
- **Pieces carry shape, not pictures**: a piece on discovery says which cells are floor, where walls and exits are; the style draws it. Art for pieces (an image per tile, as a published dungeon's tiles) can come later as one more kind of fill.
- **Rooms are painted, walls come by themselves** (user, 2026-10-30: "con embellecer me refiero a lo que hace Dungeon Scrawl por ejemplo, y muchos otros editores, donde dibujas salas bastante fácil y rellena de manera chula bordes para indicar separación pared-suelo, con distintas opciones"). Drawing a room is painting its **floor** (cells with a brush or a rectangle, later free shapes); the map keeps only the floor and the doors. Walls are never drawn: the renderer **derives them** from where floor meets no floor, so two rooms painted together merge, a corridor painted into a room opens it, and a door sits on that edge. How the edge looks is the style's: a thick wall line, a hatched or stippled band outside it (old-school maps), a shadow, rough rock for caves, each map choosing one and changing it in one click. This is why the first version already keeps floor, not walls, and draws walls from the floor's outline: the plain look and the pretty ones share that outline.
- Out of the first versions: textures, hand-drawn strokes, lighting. They're the reason for the points above, not part of the work now.

## 10. Kinds of map (to discuss with the user, 2026-10-30)

User: "también poder dibujar ríos y masas de agua que se vean guay; para los hexes habría que pensar cómo hacer el embellecimiento, no tendría que ver con esto. Me pregunto, y esto sería para parar y preguntárselo bien antes de seguir, si tendremos que diferenciar distintos tipos de mapa, ya que entiendo que no se dibujará igual un mapa de una dungeon u otros interiores, de cómo se dibujaría un mapa de un outdoor de una ciudad, de cómo se diseñaría un hexcrawl o pointcrawl, o algo híbrido como Door Kickers donde ves interiores y también exterior".

Claude's proposal, nothing decided: **kinds of map are presets over one model**, not separate models or apps. What really changes between a hexcrawl, a dungeon, a city or a Door Kickers street is four things, each already a setting of the model above:

| Kind (preset)         | Grid   | Places                  | Drawing tools                                          | Time and scale        |
| --------------------- | ------ | ----------------------- | ------------------------------------------------------ | --------------------- |
| Hexcrawl              | hex    | cells                   | terrain brush, roads and rivers, regions, icons        | km per hex, hours     |
| Pointcrawl            | none   | points                  | pins and the links between them                        | time per link         |
| Dungeon / interior    | square | areas (rooms)           | floor painter, doors, stairs; walls come by themselves | turns, a cell in feet |
| Outdoor site / city   | square | cells and areas         | ground brush (streets, water, grass) and buildings     | minutes, a cell in m  |
| Hybrid (Door Kickers) | square | cells outside, areas in | both: ground outside, floors and walls of buildings    | as the site           |

- So a map has layers that each kind shows or hides: the **ground** (terrain cells: grass, streets, water), **structures** (floors with walls derived from their edge, doors), **points and links**, and what all have today (icons, labels, tokens). The hybrid is simply a square map using both ground and structures: outside is ground, inside a building is floor.
- **Edges drawn by themselves are one mechanism**: where floor meets no floor the style draws a wall; where water meets land it draws a shore (a soft coastline, waves); between two terrains, a blended border. That gives nice **rivers and lakes** on square and point maps too: a lake is painted water cells with a shore drawn round it, a river is a path drawn as a widening curve, or painted water.
- **Hexes' own look** (the user: "no tendría que ver con esto") stays apart: the same style idea (§9) applies to them later (terrain art per hex, blended borders, hand-drawn coast), but it isn't part of this work.
- Choosing: **New map** asks for the kind (with a picture of each), which sets the grid, the tools in sight, the style and the scale; everything stays changeable in Map settings, so a kind is a starting point, not a cage. A system may say which kinds its maps use (the Grey Marches: hexcrawl, and dungeons under it).
- To decide: whether kinds are presets of one model (this proposal) or separate kinds of maps with their own rules; which kinds come first (the order of §8 C would give hexcrawl → its dungeons as sub-maps → square maps with structures → the city and the hybrid → the pointcrawl); and whether a hex map can hold structures too (Claude: no, a site inside a hex is a sub-map).

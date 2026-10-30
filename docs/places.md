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
- **E. Format** (Claude's, as proposed): maps gain `grid.kind`, `areas`, `connections` and `meta.parent`; play state gains connection states and positions inside a sub-map; a map format bump.

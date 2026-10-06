# Hexmapper

Hex map editor for hexcrawls, inspired by [Hexfriend](https://hexfriend.net/). It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** geography. The hexmapper draws the map, stores its persistent data (terrain, roads, rivers, POIs, metadata) and hosts the engines' UI when embedded (Travel/Play mode). It doesn't resolve tables or compute travel: `oracle-engine` and `travel-engine` do, wired through `session`.

**Keep it simple:** not a VTT, not a campaign manager.

## Architecture

```
src/
  lib/
    model/        # map types, hex normalization, serialization and migrations (moving to @open-tabletop/schema)
    commands/     # reversible commands (paint, edit hex, paths, labels, settings…) + History
    store/        # app state with runes: editor, preferences, toasts, dialog, view
    render/       # MapRenderer (PixiJS): layers, pan/zoom, pointer input → tools; path geometry; export
    tools/        # editing tools (select, terrain, paths, icons, text)
    icons/        # bundled icon registry (game-icons.net subset)
    labels/       # bundled fonts
    print/        # paper sizes, physical hex size, fitting the grid to paper
    io/           # files, IndexedDB map library, deep links, PNG/PDF export
    i18n/         # typed en/es dictionaries
  components/     # Svelte UI (panels, toolbar…); components/hex/ = hex metadata editor
scripts/
  build-icons.mjs # extracts the curated icon subset from @iconify-json/game-icons
```

Uses `@open-tabletop/hex` (grid math), `@open-tabletop/note-refs` (note links) and `@open-tabletop/ui-kit` (tooltips, info tips, toasts).

Principles:

- **Every map mutation goes through a command**, so undo/redo always works. A whole brush stroke is one history entry; live previews (slider drags, typing a label, dragging a node) commit a single step on release.
- **Rendering derives from the model.** Pixi holds no state that needs saving. Rendering is incremental: hexes share one `GraphicsContext` per terrain and painting only swaps the context.
- **The map is not deeply reactive**: it's a plain object, and what the UI shows is copied into reactive snapshots (`editor.grid`, `editor.print`, `editor.layers`…) on every change.
- Clicking the canvas blurs the focused panel field before a tool can change the selection, so half-made edits are never lost. The canvas suppresses the compatibility `mousedown` so tools can focus fields (e.g. a new label's text).
- **The crosshair is drawn in the canvas**, at the exact point used for hit testing, and the system cursor is hidden over the map. With fractional display scaling some browsers scale the cursor image but not its hotspot.
- Only text fields count as "typing" for shortcuts: sliders, checkboxes and color pickers don't block Ctrl+Z.

## Current data model

See `src/lib/model/types.ts`. The editor keeps its own model (fast to edit, used by the local library) and **files are OTD bundles** (`src/lib/io/otd.ts`): `HexMap` → `Map`, `HexData` → `Hex`, POIs → `POI` entities with a `location`, `fields` → `stats`, `note` → `noteRef`; rendering, printing, icons, labels and assets → `ext.hexmapper`. Data the editor doesn't understand (other tools' `ext` namespaces, parties, log, other maps) is kept in `map.foreign` and written back untouched.

**Hexes are keyed by offset coordinates (`col,row`), not axial.** Offset "odd-q" for flat-top, "odd-r" for pointy-top. Switching orientation keeps every cell's content and CCRR label. Math is done in axial (`@open-tabletop/hex`). Shrinking the map keeps data of cells left outside, so undo loses nothing.

**Paths** store every hex they cross (travel semantics: edges between consecutive hexes) plus `nodes`, the indices of user-placed points. Only nodes are drawn and get handles, so straight mode gives true straight lines. Per-node offsets place points off-center; water hexes cut paths at the shore.

**Two different scales, not to be confused:**

- **Print:** `print.hexMm`, the physical hex size on paper (flat-to-flat, like mini bases).
- **World:** `scale.hexKm`, km per hex, for travel (default 10; Kal-Arath uses 30). Set in Settings → Map.

## Features

Done:

- **Terrain:** editable palette (name, color, water, add/delete), brush with radius, flood fill, erase (right click), eyedropper (Ctrl+click).
- **Grid:** flat/pointy orientation, CCRR or axial coordinates, zoom and pan.
- **Roads, trails, rivers, walls and borders:** nodes vs. crossed hexes; closed loops; smooth curves or straight segments; off-center points with snapping (Shift+click while drawing, Ctrl for free placement); drag nodes, even to other hexes, with re-routing; click a node to keep drawing (extends from an end, branches from the middle); paths stop at water shores.
- **Icons:** 111 from game-icons.net plus imported ones (SVG/PNG/JPEG/WebP); color, size, rotation, flip, halo (color and size) and outline (color and thickness), with live preview.
- **Text:** labels with font (IM Fell English, Cinzel, sans), size, color, rotation, italic and halo (color and thickness); also outside the grid.
- **Hex metadata:** name, short optional Markdown notes (marked + DOMPurify), POIs (with linked notes), tags and fields with autocompletion, linked note (`note-refs`), gold marker on the map, copyable hex link.
- **Fixed layers:** terrain, grid, regions, paths, icons, text, trail and route, tokens, coordinates and markers, each with show/hide and lock.
- **Size:** by hex count or by paper (A5–A1, Letter, Legal, Tabloid, custom), hex size in mm with presets, printed size and smallest fitting paper.
- **Export:** PNG by pixels per hex (VTT-friendly, optional transparency) and **real-scale PDF** (150/300 dpi).
- **Local map library** in IndexedDB (migrates the old single autosave); **deep links** `#/<id>/<hex>`; new-map dialog (save to file / create / cancel).
- **General:** undo/redo, robust autosave (synchronous copy when the tab closes), keyboard shortcuts, en/es UI (English by default), Settings/Export/Maps as side panel views.

**Planned uses of hex tags:** highlight or filter hexes by tag on the map, pass them as context to Oracle tables (`when: { tags: … }`) and use them in travel rules (e.g. `landmark` helps navigation).

## Notes apps integration

- **Map → notes (done):** hexes and POIs store a provider-agnostic path, and the provider chosen in Preferences (SilverBullet or Obsidian) turns it into a URL. See `@open-tabletop/note-refs`.
- **Notes → map (done):** links like `<app>/#/<mapId>/<hex>` (CCRR or axial) open the map from the local library and select/center the hex; the URL follows the open map and selection. Only maps this browser knows can open; otherwise the app asks to import `<mapId>.hexmap.json`. Sharing across devices would need a server and is out of scope.

## Roadmap

### Done

- [x] Phases 0–1: skeleton, grid, terrain, undo/redo, save/load, autosave.
- [x] Hex metadata, provider-based linked notes, physical size and printing, unique map id.
- [x] Roads and rivers (nodes, shores, offsets, branches), styled icons, text, layers, editable palette.
- [x] PNG and real-scale PDF export.
- [x] Local map library and deep links.

### Pending

- [ ] UI for the optional hex fields travel may use (elevation, danger, region); custom fields cover them for now.
- [ ] Highlight/filter hexes by tag.
- [ ] Multi-page PDF tiling for large maps, and an option to print empty hexes white.
- [ ] Translate icon names (currently English, as they come from game-icons).

### Play (with the engines)

- [x] Files in OTD (`.otd.json`), world scale.
- [x] Play mode (tool ▶, key P): party token (bundled party icons or an uploaded image, optional halo), trail. _Simple_: click to move. _With rules_: system (generic or a pack with travel-rules, e.g. Kal-Arath), destination and A\* route, travel / 1 hex / camp / rest (the actions each system declares), pack-declared party stats, checks resolved by the Oracle through pack bindings, journal. Saved as OTD party + log + state.oracle.
- [x] Oracle side panel (the Oracle icon, key O) from `@open-tabletop/oracle-ui`: roll any definition of the loaded packs, with history. Rolls read the selected hex (or the party's) and, on a rules trip, season, weather, mode, stats and today's values; those rolls are also written in the journal (`ORACLE_ROLL`).
- [x] User packs created in the Oracle app are loaded too (shared `opentabletop.userPacks` storage when both apps share an origin; live across tabs), including systems with travel rules.

### Next (agreed 2026-10-06, in this order)

- [x] **Tokens** (tool ♟, key K): party, PCs, NPCs and enemies; several per hex (arranged around the center), dragged between hexes (snapping to the center), also with the select and play tools; name, icon (or an imported image), color, halo, linked note; off-map tokens stay in the list. Saved as OTD characters with `kind` and `location` (the party as the OTD party). Play mode moves the party token. Later: the PC tokens travelling together as the party.
- [x] **Terrain glyphs:** a subtle symbol per hex (mountain, tree…) in a lighter or darker shade of the terrain color (hidden under icons), with an opacity slider (0 hides them); each terrain picks a symbol from the new Terrain icon category or an imported image. Wider default biome palette (farmland, jungle, taiga, tundra, volcanic), with travel costs in the generic rules. Map format v3 gives old maps' built-in terrains their symbol.
- [x] **Regions** (tool ⛉, key N): paint hexes into a region with the brush (right-click takes them out, Ctrl+click picks); name, color, show name, linked note; drawn as a light tint, an inner border along the outline and the name at the center; region select in the hex panel. Saved as OTD `hex.region` plus the region list in `ext.hexmapper`; travel checks and tables see `region` (its name). Map format v4.
- [x] **Path kinds:** walls (thick, with stones) and borders (dashed, across water too) besides roads, trails and rivers; closed loops (option for new paths, Close/Open per path in the hex panel). Only roads, trails and rivers are travel edges.
- [x] **Captions:** the name under tokens (per token, party included) and every hex's name under it. Icons have no caption: the hex name already says what's there.
- [x] **Map texts** (Settings): hex, region and token names shown or hidden and styled per kind (font, size, color or automatic, italic, halo). Map format v5 (replaces the Hex names layer). Each hex, region and token can also hide its name or use its own style (its panel → Style).
- [x] **Wider palette from Hexermap (2026-10-07):** heath, savanna, dense forest, marsh, peaks, canyon, oasis, glacier, coast and deep sea, with glyphs and travel speeds (generic rules and Core); the palette is grouped (lowlands, forests, wetlands, highlands, arid, cold, water and coast, other) by a display-only table, so the map format is unchanged; Edit palette adds the defaults an older map lacks.
- [ ] **POI icons:** an optional icon per POI to tell them apart in the hex panel (not drawn on the map).

### Side panel (agreed 2026-10-07)

Each tool shows only what it edits (Select: the hex; Terrain: the palette; Tokens: the token…). Settings, Layers (▤), Help (?), Maps, Export and the Oracle are views opened from the toolbar. Changing tools deselects what the previous one had selected. Keyboard shortcuts live in the manual.

### Backlog (Oracle in the map, agreed 2026-10-06)

- [x] "Roll here" from the hex panel: opens the Oracle with that hex as context (the panel says which hex rolls read).
- [x] Apply results to the map: "Add to <hex> as a point of interest" under each result (oracle-ui `actions` snippet); long results keep the table name as the POI name and the text as its description. Undoable.
- [x] Oracle history and deck state per map (map format v6): `map.oracle` = { state, history }, shared by hand rolls and trip checks; in OTD, `state.oracle` and `ext.hexmapper.oracleHistory`. oracle-ui's Roller takes a `store`.
- [ ] Discovery: travel results fill the map as you go — a point of interest rolled on a trip becomes a POI of the hex, and a mode that starts with only the first hex and lets the Oracle decide what each new hex holds (terrain, POIs…) when the party enters it.

### Later

- Narrow windows and mobile: keep layouts responsive (content-sized columns instead of fixed widths, panels that collapse).

- Procedural generation, sub-maps, curved text, SVG export, Tauri desktop build.

### Rejected

- Square grids: better FOSS editors already exist (Tiled, etc.).
- Fog of war, second-screen player view and other VTT features.

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
    i18n/         # typed en/es dictionaries (moving to @open-tabletop/ui-kit)
  components/     # Svelte UI (panels, toolbar…); components/hex/ = hex metadata editor
scripts/
  build-icons.mjs # extracts the curated icon subset from @iconify-json/game-icons
```

Uses `@open-tabletop/hex` (grid math) and `@open-tabletop/note-refs` (note links).

Principles:

- **Every map mutation goes through a command**, so undo/redo always works. A whole brush stroke is one history entry; live previews (slider drags, typing a label, dragging a node) commit a single step on release.
- **Rendering derives from the model.** Pixi holds no state that needs saving. Rendering is incremental: hexes share one `GraphicsContext` per terrain and painting only swaps the context.
- **The map is not deeply reactive**: it's a plain object, and what the UI shows is copied into reactive snapshots (`editor.grid`, `editor.print`, `editor.layers`…) on every change.
- Clicking the canvas blurs the focused panel field before a tool can change the selection, so half-made edits are never lost. The canvas suppresses the compatibility `mousedown` so tools can focus fields (e.g. a new label's text).
- **The crosshair is drawn in the canvas**, at the exact point used for hit testing, and the system cursor is hidden over the map. With fractional display scaling some browsers scale the cursor image but not its hotspot.
- Only text fields count as "typing" for shortcuts: sliders, checkboxes and color pickers don't block Ctrl+Z.

## Current data model

See `src/lib/model/types.ts`. It will migrate to the OTD entities (`docs/otd.md`): `HexMap` → `Map`, `HexData` → `Hex`, POIs become `POI` entities with a `location`, `fields` → `stats`, `note` → `noteRef`, rendering and printing → `ext.hexmapper`; files become `.otd.json`.

**Hexes are keyed by offset coordinates (`col,row`), not axial.** Offset "odd-q" for flat-top, "odd-r" for pointy-top. Switching orientation keeps every cell's content and CCRR label. Math is done in axial (`@open-tabletop/hex`). Shrinking the map keeps data of cells left outside, so undo loses nothing.

**Paths** store every hex they cross (travel semantics: edges between consecutive hexes) plus `nodes`, the indices of user-placed points. Only nodes are drawn and get handles, so straight mode gives true straight lines. Per-node offsets place points off-center; water hexes cut paths at the shore.

**Two different scales, not to be confused:**

- **Print:** `print.hexMm`, the physical hex size on paper (flat-to-flat, like mini bases).
- **World:** km per hex, for travel (Kal-Arath uses 30 km). Not yet in the model (`Map.scale.hexKm`).

## Features

Done:

- **Terrain:** editable palette (name, color, water, add/delete), brush with radius, flood fill, erase (right click), eyedropper (Ctrl+click).
- **Grid:** flat/pointy orientation, CCRR or axial coordinates, zoom and pan.
- **Roads, trails and rivers:** nodes vs. crossed hexes; smooth curves or straight segments; off-center points with snapping (Shift+click while drawing, Ctrl for free placement); drag nodes, even to other hexes, with re-routing; click a node to keep drawing (extends from an end, branches from the middle); paths stop at water shores.
- **Icons:** 72 from game-icons.net plus imported ones (SVG/PNG/JPEG/WebP); color, size, rotation, flip, halo (color and size) and outline (color and thickness), with live preview.
- **Text:** labels with font (IM Fell English, Cinzel, sans), size, color, rotation, italic and halo (color and thickness); also outside the grid.
- **Hex metadata:** name, short optional Markdown notes (marked + DOMPurify), POIs (with linked notes), tags and fields with autocompletion, linked note (`note-refs`), gold marker on the map, copyable hex link.
- **Fixed layers:** terrain, grid, paths, icons, coordinates, text and markers, each with show/hide and lock.
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

- [ ] World scale (`hexKm`) and the hex fields travel uses (biome, elevation, danger, region). Comes with the OTD migration.
- [ ] Highlight/filter hexes by tag.
- [ ] Multi-page PDF tiling for large maps, and an option to print empty hexes white.
- [ ] Translate icon names (currently English, as they come from game-icons).

### Play (with the engines)

- [ ] Migration to OTD (`.otd.json`, importing `.hexmap.json`).
- [ ] Travel/Play mode: party token (custom image), route on the map and Travel Engine panel.
- [ ] Embedded Oracle panel with history.

### Later

- Procedural generation, sub-maps, curved text, SVG export, Tauri desktop build.

### Rejected

- Square grids: better FOSS editors already exist (Tiled, etc.).
- Fog of war, second-screen player view and other VTT features.

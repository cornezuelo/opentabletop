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
- **Notes → map (done):** links like `<app>/#/<mapId>/<hex>` (CCRR or axial) open the map from the local library and select/center the hex; the URL follows the open map and selection. Only maps this browser knows can open; otherwise the app asks to import `<mapId>.otd.json`. Sharing across devices would need a server and is out of scope.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md#hexmapper).

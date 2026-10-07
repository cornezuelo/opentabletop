# OpenTabletop

FOSS tooling for **solo RPGs, hexcrawls and sandbox campaigns**. It started as a hex map editor for playing **Kal-Arath** and is growing into a set of reusable libraries plus the apps built on them.

The point is to be **game-system agnostic**. Kal-Arath is the first supported system and validates the design, but none of its rules live in the core: they live in a data _pack_.

## Principles

1. **Separate responsibilities whenever it makes sense.** Small packages with clear interfaces; composition over giant "managers".
2. **Headless cores.** Engines (`*-engine`) and domain packages are plain TypeScript: no Svelte, no DOM, no `localStorage`, no network. Persistence, UI and filesystem access live in adapters.
3. **Data, not code.** Each system's rules are declared in packs (YAML/JSON) validated on load. No `eval`, no `Function()`, no embedded scripts: packs may come from third parties.
4. **Definitions ≠ state.** Static data (tables, rules, the map) is separate from play state (drawn cards, party position, time). Saving a session never modifies definition files.
5. **Engines don't know each other.** They talk through events and ports, never by calling each other. E.g. the Travel Engine emits `ENCOUNTER_CHECK_REQUIRED` and an integration layer decides which Oracle table to resolve.
6. **Immutable state and pure functions** in engines: `(state, action) → { state, events }`. Easy to test, undo and replay.
7. **Injectable randomness.** No engine calls `Math.random()`; all take a `RandomSource`, which can be seeded for tests and replays.
8. **Lore lives elsewhere.** Notes, NPCs and factions in depth live in the user's notes app (SilverBullet, Obsidian…). OpenTabletop stores mechanical state and **references** (`noteRef`), never duplicated content. Short, optional GM notes on hexes are fine.
9. **Keep it simple.** The apps are not VTTs or campaign managers. When in doubt, leave it out.

## Monorepo layout

npm workspaces. Packages are consumed as TS source (`exports` → `src/index.ts`) and transpiled by Vite. A per-package build step will be added before publishing to npm.

```
packages/                   # libraries, scope @open-tabletop/*
  hex/                      # ✅ hex grid math (axial/offset, pixels, neighbors, lines, flood fill)
  note-refs/                # ✅ provider-based links to external notes apps (SilverBullet, Obsidian…)
  random/                   # ✅ RandomSource, seeded PRNG
  dice/                     # ✅ dice expressions with breakdown (NdM±K, d66, dF, keep, advantage…)
  conditions/               # ✅ safe condition evaluator (no eval), shared by oracle and travel
  time/                     # ✅ GameTime (absolute minutes), calendars, seasons, watches
  schema/                   # ✅ OTD schema (OpenTabletop Data) in Zod → TS types + JSON Schema
  oracle-engine/            # ✅ MVP: tables, oracles, generators, decks; packs; locales; history
  travel-engine/            # ✅ MVP: A* routes, movement, time, resources, fatigue, event-driven checks
  weather-engine/           # ⏳ weather with inertia (Markov / hex flower), part of the world clock; decoupled from travel
  session/                  # ✅ integration layer: travel checks → Oracle via bindings, journal, travel systems from packs, trips, map discovery
  storage/                  # ✅ browser storage adapter: the map library (IndexedDB), backups of everything
  ui-kit/                   # ✅ shared Svelte: theme, typed i18n, styled tooltips, info tips, toasts, app switcher (with backups)
  pack-ui/                  # ✅ pack library (bundled + user packs), editing, YAML helpers, YAML editor
  oracle-ui/                # ✅ embeddable Oracle: roll panel, result card, history, picker
  travel-ui/                # ✅ embeddable trip UI: system/season setup, status, supplies, actions, journal
  manual-ui/                # ✅ user manual: pages from docs/manual, search, in-app help panel, full view
apps/
  hexmapper/                # ✅ map editor (see apps/hexmapper/CLAUDE.md)
  oracle/                   # ✅ roll and edit packs (see apps/oracle/CLAUDE.md)
  manual/                   # ✅ the user manual of every app, with search (see apps/manual/CLAUDE.md)
  travel/                   # ✅ play trips without a map, edit travel systems (see apps/travel/CLAUDE.md)
packs/                      # data packs (tables, travel rules, weather…)
  core/                     # ✅ generic content for any game (oracles, inspiration, scene twists); no travel system
  grey-marches/             # ✅ showcase setting: a travel system and tables using every feature, with an example map
  kal-arath/                # README only; the whole pack (personal use) lives in the private packs repo
examples/maps/              # ✅ example maps (OTD bundles) listed in the Hexmapper's Maps panel
packs-private/              # ✅ (git-ignored) checkout of github.com/cornezuelo/opentabletop-packs-private (private)
docs/
  manual/<locale>/<app>/    # user manual pages (Markdown, en base + es)
  otd.md                    # common OpenTabletop Data schema
  oracle-engine.md          # Oracle Engine design
  travel-engine.md          # Travel Engine design
```

✅ done · ⏳ designed or pending

**Allowed dependencies** (top to bottom, never upwards):

```
apps  →  *-ui, ui-kit  →  session  →  *-engine  →  dice, conditions, time, hex  →  random
                                         ↘ schema (types/validation of persisted data only)
```

- An engine **never imports another engine**. Whatever they share (dice, time, conditions) goes into a lower-level package.
- `note-refs` depends on nothing, and no engine depends on it: external references are opaque strings to engines.
- `storage` is a browser adapter (IndexedDB, localStorage) with no dependencies; only apps and UI packages use it, never engines.

## Common schema: OpenTabletop Data (OTD)

Details in [`docs/otd.md`](docs/otd.md). In short:

- **Campaign entities:** Campaign, Map (with Hex), POI, Party, Character, Faction, Clock and LogEntry (the persisted "Event"). They share a base `{ id, type, name, tags, noteRef, refs, ext }`.
- **Pack definitions:** Table, Generator, Oracle and Deck (Oracle Engine), plus travel rules and weather models, in versioned, namespaced packs (`kal-arath/reaction`).
- **`ext.<namespace>`** holds app- or system-specific data without polluting the core, e.g. `ext.hexmapper` (rendering, printing) or `ext.kal-arath`.
- **References** are `type:id` strings, never nested objects.
- **Runtime events** (`HEX_ENTERED`, `TABLE_RESOLVED`…) are messages between engines and are not persisted. What matters for the session is saved as `LogEntry`.
- **File extension:** `.otd.json` (the hexmapper saves and opens OTD bundles only).

## Packs, sources and licensing

A pack is a folder with `pack.yaml` (id, version, base locale, license, dependencies) and YAML/JSON definitions. Packs are validated on load: broken references, overlapping ranges, cycles, missing dependencies.

**Goal: apps ship preloaded with oracles from many games.** Each pack is distributed through whatever channel its license allows, and the engine loads every pack found in its **sources**:

| Source                 | Contents                                                                                                                   | Where                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open packs**         | Our own FOSS content (`core`) and games whose license allows redistribution (CC BY, CC BY-SA, ORC, OGL…), with attribution | `packs/` in this repo; bundled in builds                                                                                                                                           |
| **Personal-use packs** | Games whose license only allows personal use                                                                               | **Separate private repo** `cornezuelo/opentabletop-packs-private`, cloned at `packs-private/` (`git clone git@github.com:cornezuelo/opentabletop-packs-private.git packs-private`) |
| **User packs**         | Tables created or imported in the app                                                                                      | Browser library or a chosen folder, exportable as packs                                                                                                                            |

- **Kal-Arath is personal use only**: "Copyright 2023 Castle Grief, permission to copy granted for personal use" (rulebook at `~/Descargas/Rol y Wargames/Rol/Solitario/Kal-Arath/`). Its content never goes into this public repo: the whole pack (manifest included, so it can't shadow the real one) lives in the private packs repo. Only a README and our own design work (generic travel rules, bindings without rulebook text) live here.
- Before adding a game to `packs/`, check its license and record it in `pack.yaml` (`license`, `attribution`). If in doubt, it goes to the private repo.
- A personal-use game could move to `packs/` only with the author's permission.
- **Languages:** every pack has exactly one required base locale (`locale` in `pack.yaml`). Translations are optional overlays per locale; any missing string falls back to the base locale (see `docs/oracle-engine.md`). Pack content is not translated by the UI's i18n.

## Stack and tooling

| Piece      | Choice                                          |
| ---------- | ----------------------------------------------- |
| Language   | TypeScript `strict`                             |
| Monorepo   | npm workspaces                                  |
| UI         | Svelte 5 (runes) in apps and `*-ui` packages    |
| Map render | PixiJS v8 (hexmapper only)                      |
| Validation | Zod 4 (OTD schema and packs) → also JSON Schema |
| Packs      | YAML (`yaml`, ISC) and JSON                     |
| Tests      | Vitest (single config at the root)              |
| Quality    | ESLint + Prettier + `svelte-check` / `tsc`      |

FOSS dependencies only, and no unnecessary runtime dependencies in the cores.

Commands (from the root): `make` lists them all (`make dev`, `make dev-oracle`, `make serve`, `make verify`…); they wrap the npm scripts: `npm run dev` (hexmapper), `npm run dev:oracle`, `npm test`, `npm run check`, `npm run lint`, `npm run format`, `npm run build` (each app into `apps/<app>/dist/`), `npm run build:site` (every app into `dist/<app>/`, to serve from one origin so they share the user packs). Builds use relative URLs (`base: './'`), so they work from any folder.

## Conventions

- **Everything in the repo is in English**: code, identifiers, comments, commit messages and all Markdown (the repo will be public). Conversation with the user stays in Spanish.
- **Bilingual UI (en/es), English by default** in every app and `*-ui` package: no hard-coded visible text, always `t('key')`. `en.ts` is the reference dictionary and `es.ts` must have the same keys (enforced by types). Every new key is added in both languages.
- **Cores don't translate.** They emit codes and parameters (`{ code: 'NAVIGATION_LOST', hex }`) and the UI translates them.
- **Interconnect the systems:** whenever it makes sense, a new engine or app reads and feeds the others (map, oracle, travel, time, factions, characters, journal, notes) through events, ports and shared OTD data, never by importing another engine.
- **Every feature lives in the bundled packs too:** when a feature lands, its simple, generic use goes into **Core** (if it makes sense for any game) and its full use into **the Grey Marches** (and its example map), with a test that plays it. Core stays small and generic; the Grey Marches exercise everything. Before closing a milestone, review that the Grey Marches use every feature.
- **No native browser UI**: tooltips use `use:tooltip` (never `title=`), questions use `confirmAction()` / `ask()` from `ui-kit` (never `confirm()` or `alert()`); each app mounts `<Toasts />` and `<Dialogs />` once. Actions that Ctrl+Z can't undo (play state, forms without undo, deletions outside the history) ask first.
- **Autocomplete where values are known:** an input whose value comes from a known list (ids, tags, terrains, field keys…) suggests them (`<datalist>` at least).
- Language and personal settings (notes provider, etc.) are **user preferences** in `localStorage`, never session data.
- **Browser storage keys start with `opentabletop.`** (or the legacy `hexmapper.`), so backups (`@open-tabletop/storage`) include them; data in IndexedDB must be added to the backup explicitly. An app that saves on its own (autosave on page hide) registers `onBeforeBackup` / `onBeforeRestore`.
- **Every app has a user manual** in `docs/manual/<locale>/<app>/` (English and Spanish, kept in sync: a test checks every English page has a Spanish one and that links resolve) and a help button with `HelpPanel` from `manual-ui`. Update the manual when a feature changes. **Every feature is documented thoroughly as part of the work, not later:** how to use it in its app's pages, in plain words with examples (for people who don't program); the harder details (file formats, what tables see and in which order, YAML, edge cases) in the **technical** section, linked from the app pages. Examples should point to the Grey Marches when they show it.
- Tests are mandatory in every headless package, with deterministic RNG. Snapshots never replace meaningful asserts.
- Every persisted format change bumps the version and adds a migration.
- One commit per phase or feature, with a descriptive message.

## Ecosystem roadmap

1. [x] Monorepo, `hex` and `note-refs` packages.
2. [x] Design review of `docs/otd.md`, `docs/oracle-engine.md` and `docs/travel-engine.md` (open decisions resolved: short optional hex notes, `.otd.json`, one base locale per pack with fallback translations).
3. [x] `random`, `dice`, `conditions`.
4. [x] `oracle-engine` MVP and the private Kal-Arath pack (es): tables, settlements, dungeons, travel rules, bindings.
5. [x] `time`, A\* pathfinding in `hex`, `travel-engine` MVP.
6. [x] OTD `schema` and hexmapper files in OTD (`.otd.json`).
7. [x] `session` and the hexmapper Play mode (simple token + trail, or rules: Travel Engine + Oracle with journal). `oracle-ui` and `travel-ui` are extracted and used by the hexmapper.
8. [ ] Standalone `oracle` (✅ first version: browse and roll every definition, history, form editor for tables with translations, YAML editor with live diagnostics, new packs, zip import/export) and `travel` (✅ first version: play trips without a map, forms for travel rules and checks/bindings, YAML editor with live diagnostics, new systems, edit a copy) apps, each with **creation and editing tools for its rulesets**: the Oracle app edits packs (tables, generators, oracles, decks, translations), the Travel app edits travel rules and bindings. Text files (YAML/JSON) stay the source of truth: the editors read and write them, with live validation.
9. [ ] Phases ahead, in order of priority (agreed 2026-10-07). Each new engine is headless, with its UI on top, and talks to the others through events and ports. Things in one phase are done together because they share groundwork.

**Phase A: close the current apps → alpha `0.1`**

- ✅ **Values on map elements:** custom fields (key/value, like hex fields) on tokens, icons, regions, POIs and wherever it makes sense, readable by tables and travel checks; documented in the manual and used by the Grey Marches.
- **Packs per map (Hexmapper):** Settings → Map chooses which packs the map works with (default: all); the Oracle panel and Play's systems list only show those. The example map comes with the Grey Marches and Core. (The Oracle and Travel apps fold their lists, so they don't need it.)
- **Realistic discovery:** an empty hex is decided from all its known neighbours, not just the one it's seen from, so lakes, forests and ranges grow together instead of land / water / plains in a row. Shares groundwork with weather inertia (phase B).
- ✅ **Region styles:** today a fixed light tint (alpha 0.14) and an inner border (alpha 0.85); make the fill optional with its opacity, and style the border (width, solid or dashed), map-wide in Settings with an optional own style per region, like map texts.
- **Loose ends:** ✅ conditions and `set` in the Oracle table form; ✅ undo across form edits; ✅ several saved trips and journal export in the Travel app; ✅ POI icons, ✅ highlight/filter hexes by tag; ✅ responsive layouts for narrow windows (Hexmapper panel as a sheet, Oracle in one column).
- **Suggestions while typing, everywhere** (✅ condition, value and context boxes in Oracle and Travel forms, the YAML editor, Travel tags and rules lists, map values; `SuggestInput` + `contextSuggestions`; new inputs must use them): autocomplete in every input whose value comes from a known list, in every app and system (today's and future ones): context keys, field keys and values, table and definition ids, tags, terrains, regions, events, stats… in forms, the roll panel, the hex panel and the YAML editor.
- ✅ **Save / load the whole state (before any new system):** one backup file (OTD bundle or zip) with everything the apps keep in this browser, not just Hexmapper maps: the map library (IndexedDB), user packs, the Travel app's trip, Oracle histories and deck states, favorites and preferences. Restore it on another machine to resume whole campaigns, or after losing the browser storage. Versioned with migrations like every persisted format; restoring asks before replacing (or merges by id). Done (2026-10-07): app switcher → Save a backup / Restore a backup… (add to mine or replace everything), `@open-tabletop/storage`, manual page technical/05-backups.
- **Installable, offline apps (PWA)** and the **command line** (`oracle roll …`, `oracle validate …`).
- **Release workflow** (see below), per-package build, then alpha `0.1`.

**Phase B: the living world**

- **Calendar / world clock** (grow `time` into an engine): configurable fantasy calendars (seasons, months, weeks, moon phases, holidays) and scheduled events; advance 1 hour / 1 watch / 1 day / until sunset / until the next event; a timeline ("Day 47: full moon", "Day 53: the Iron Clans attack Black Pass"). Shared by travel and the faction turns.
- **Weather with inertia** (`weather-engine`, part of the world clock): today's weather follows from yesterday's, by a Markov table or a hex flower (2d6 moves on a small map of weathers) per climate and season, defined in packs; travel keeps reading `weather` as today.
- **Progress clocks** (the OTD `Clock` entity): segments filled by tables, faction turns, the calendar or by hand ("The Wyrm wakes: 3/6").
- **Faction / world turn engine** (`faction-engine`): factions with goal, resources, strength and territory (hexes); "Advance world turn" resolves each faction's action on pack tables (expand, recruit, events) and emits `FACTION_ACTION_RESOLVED`, `TERRITORY_CHANGED`, `RESOURCE_CHANGED`, `WORLD_EVENT_CREATED`, `RUMOUR_CREATED`. No lore: factions point to notes with `noteRef` (e.g. `Kal-Arath/Factions/Iron Clans`). With **reputation**: how each faction regards the party, changed by table results and read by reactions and encounters.

**Phase C: characters and the campaign record**

- **Characters engine** (`character-engine`): sheets kept in one place whose values every system can read (e.g. the acting PC's stat in a roll); builds on the values of phase A.
- **Statblocks and a bestiary** (like Obsidian's Fantasy Statblocks): detailed sheets for tokens and for creatures in a bestiary to draw from (place a wolf token, roll a bandit from it), defined in packs per system and usable by every other engine (encounters, initiative, combat).
- **Initiative tracker** and **combat ledger** (like Obsidian's Initiative Tracker and Combat Ledger): a light turn order and a record of what happened in a fight (hits, damage, conditions, rounds), fed by statblocks and written to the journal. No battle map: we stay out of VTTs.
- **Journal system**: an optional journal of the campaign (sessions, trips, hand rolls, notes), exportable as Markdown (SilverBullet, Obsidian) with links to hexes; the map's note markers live in the same system.
- **Our own notes app** (a small SilverBullet / Obsidian): Markdown pages linked with `[[links]]` and backlinks, each page showing what links to it and what it links to (one click away); link suggestions while typing (autolinking); `{{…}}` like the Oracle (dice, tables, values); queries over pages (like Dataview); page templates; search; a canvas; global and local graphs. Pages also link to hexes, POIs, factions, characters and statblocks, so OpenTabletop can be used without an external notes app. It is one more `note-refs` provider: engines still store only references (principle 8 holds; the lore lives in the notes, ours or someone else's).

**Phase D: solo play and content**

- **Solo scene engine**: chaos factor, lists of threads and characters, and whether a scene goes as expected, is altered or interrupted; our own free mechanics, working with the oracles.
- **Ironsworn** as a pack, with progress clocks: [Datasworn](https://github.com/rsek/datasworn) has its rules as JSON. Licence per item (each object's `source`): CC BY 4.0 (Ironsworn and Starforged core) can go to `packs/` with attribution; CC BY-NC 4.0 items must be decided first (not in our open-pack list); the code and schemas are MIT.
- **Name generators** by setting (people, settlements, taverns, places…), and not only fantasy: modern, post-apocalyptic, sci-fi (the Hexmapper already has terrain sets and icons for them): bundled per pack and user-editable, built on the Oracle Engine (syllable tables and generators; maybe Markov chains trained on name lists as data).
- **Import tables from text**: paste a numbered list (from a PDF) or a CSV and get a table.
- **Settlement and dungeon generators on the map**: "generate a village here" fills the hex (POIs, name, NPCs) with pack generators; dungeons once sub-maps exist (phase E).
- **Dice roller app**: quick, visual rolls (dice that tumble) of any expression the `dice` package knows, with history; reuses the Oracle's roller and result cards. Nothing complex.

**Phase E: maps in depth**

- **Sub-maps**: a POI opens its own map (a city, a dungeon, an underground hexmap), recursively (city → house → a tavern board).
- **Dungeon / site mapper**: hex and square grids in detail (rooms, corridors, doors, secret doors, stairs, pits, statues, markers, notes), drawn with the keyboard (arrows extend a corridor, R room, D door, S stairs, M marker). Linked to characters and the other engines.
- **Image maps** (like Obsidian's Leaflet): an image of your own (a city plan, a scanned map) as a map with pins, regions and the same values and links; mostly covered by the hexmapper and sub-maps.

**Phase F: print and reference**

- **Card studio** (print & play): `cards.yaml` + an SVG template → PDF, PNG, SVG and Tabletop Simulator decks; change the design once, regenerate every card.
- **Rules reference builder**: from a `rules.yaml`, a GM screen, quick reference, mobile reference, printable cards, HTML and PDF.

**Later, or to decide**

- **Supplies and loot over time** (maybe): when something was spent or found, and who carries what, without becoming an inventory manager.
- Web Components for non-Svelte hosts.
- **Last: more free solo GM / oracle systems** found on itch.io and elsewhere, after researching which ones have licences that allow it (each as a pack, licence recorded).

**Versioning and releases (to define):** we work on `main` for now. Before the first release, agree on a workflow for tags and releases (semver; repo-wide vs per-package versions; changelog, e.g. Changesets; what triggers a tag). No release until there is an alpha MVP the user is happy with; that one becomes `0.1`.

The apps' own roadmaps are in `apps/hexmapper/CLAUDE.md`, `apps/oracle/CLAUDE.md` and `apps/travel/CLAUDE.md`.

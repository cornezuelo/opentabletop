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
  world-engine/             # ✅ the world clock: time, scheduled events, holidays and moons, progress clocks, timeline
  weather-engine/           # ✅ weather with inertia: Markov models per season as data (`kind: weather`); hex flowers later
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
  cli/                      # ✅ the `opentabletop` command line: validate, list and roll packs (Node, bundled by Vite)
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
- **Languages:** every pack has exactly one required base locale (`locale` in `pack.yaml`). Translations are optional overlays per locale; any missing string falls back to the base locale (see `docs/oracle-engine.md`). This holds for every kind: definitions that aren't tables (travel rules, bindings, calendars, weather, roll modes) are translated in the same `locales/<lang>/<file>` overlays, keyed `<kind>/<id>`; never write texts in several languages inline in a definition. Pack content is not translated by the UI's i18n.

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
- **No game rules in code, only in packs:** anything a game names or decides (advantage and other roll modes, fatigue, morale, reputation…) is declared by a pack as data; engines offer generic mechanisms (repeat-and-keep rolls, declared values, effects). Every `kind` a pack can hold is documented in `docs/manual/*/technical/07-kinds.md` (and briefly where it's used); a new kind adds itself there.
- **UI texts are generic:** tooltips, hints and placeholders never describe what a particular pack does ("in the Grey Marches, landmark stops the trip") nor name a pack the user may not have; they explain the mechanism and say it depends on the system. What a pack does goes in its own manual page (and in its own texts: descriptions, names). Syntax examples with made-up values (`tags: landmark`) are fine.
- **Cores don't translate.** They emit codes and parameters (`{ code: 'NAVIGATION_LOST', hex }`) and the UI translates them.
- **Interconnect the systems:** whenever it makes sense, a new engine or app reads and feeds the others (map, oracle, travel, time, factions, characters, journal, notes) through events, ports and shared OTD data, never by importing another engine.
- **Every feature lives in the bundled packs too:** when a feature lands, its simple, generic use goes into **Core** (if it makes sense for any game) and its full use into **the Grey Marches** (and its example map), with a test that plays it. Core stays small and generic; the Grey Marches exercise everything. Before closing a milestone, review that the Grey Marches use every feature. Every Grey Marches definition's `description` (en, and es in its overlay) says what it is for and, in a second paragraph, which features it shows (`**Shows:** …` / `**Enseña:** …`; pack descriptions are basic Markdown, rendered safely by `Markdown` / `renderMarkdown` in ui-kit and `tooltip={{ markdown }}`); keep it up to date when a definition changes or a new one is added.
- **No native browser UI**: tooltips use `use:tooltip` (never `title=`), questions use `confirmAction()` / `ask()` from `ui-kit` (never `confirm()` or `alert()`); each app mounts `<Toasts />` and `<Dialogs />` once. Actions that Ctrl+Z can't undo (play state, forms without undo, deletions outside the history) ask first.
- **Autocomplete where values are known:** an input whose value comes from a known list (ids, tags, terrains, field keys…) suggests them (`<datalist>` at least).
- Language and personal settings (notes provider, etc.) are **user preferences** in `localStorage`, never session data.
- **Browser storage keys start with `opentabletop.`** (or the legacy `hexmapper.`), so backups (`@open-tabletop/storage`) include them; data in IndexedDB must be added to the backup explicitly. An app that saves on its own (autosave on page hide) registers `onBeforeBackup` / `onBeforeRestore`.
- **Every app has a user manual** in `docs/manual/<locale>/<app>/` (English and Spanish, kept in sync: a test checks every English page has a Spanish one and that links resolve) and a help button with `HelpPanel` from `manual-ui`. Update the manual when a feature changes. **Every feature is documented thoroughly as part of the work, not later:** how to use it in its app's pages, in plain words with examples (for people who don't program); the harder details (file formats, what tables see and in which order, YAML, edge cases) in the **technical** section, linked from the app pages. Examples should point to the Grey Marches when they show it.
- Tests are mandatory in every headless package, with deterministic RNG. Snapshots never replace meaningful asserts.
- Every persisted format change bumps the version and adds a migration.
- One commit per phase or feature, with a descriptive message.

## Backlog

Everything to do, done, agreed, decided or rejected lives in **[`docs/BACKLOG.md`](docs/BACKLOG.md)** (the ecosystem roadmap and each app's), not here: this file holds directives.

- Read the backlog before starting work; "continue with the backlog" means its next step in order.
- When the user asks for something to be noted, or a decision is agreed, write it there (with the date and, if useful, their reason) and tell them the file and line.
- When something is done, mark it ✅ there in the same commit, with a short note of what was built.
- Directives that come out of the work (how to do things from now on) go into the conventions above, not the backlog.

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
  weather-engine/           # ⏳ weather with inertia (Markov / hex flower), decoupled from travel
  session/                  # ✅ integration layer: travel checks → Oracle via bindings, journal, travel systems from packs, trips, map discovery
  ui-kit/                   # ✅ shared Svelte: theme, typed i18n, styled tooltips, info tips, toasts
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
  core/                     # ⏳ generic FOSS content (yes/no oracle, etc.)
  kal-arath/                # README only; the whole pack (personal use) lives in the private packs repo
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

## Common schema: OpenTabletop Data (OTD)

Details in [`docs/otd.md`](docs/otd.md). In short:

- **Campaign entities:** Campaign, Map (with Hex), POI, Party, Character, Faction, Clock and LogEntry (the persisted "Event"). They share a base `{ id, type, name, tags, noteRef, refs, ext }`.
- **Pack definitions:** Table, Generator, Oracle and Deck (Oracle Engine), plus travel rules and weather models, in versioned, namespaced packs (`kal-arath/reaction`).
- **`ext.<namespace>`** holds app- or system-specific data without polluting the core, e.g. `ext.hexmapper` (rendering, printing) or `ext.kal-arath`.
- **References** are `type:id` strings, never nested objects.
- **Runtime events** (`HEX_ENTERED`, `TABLE_RESOLVED`…) are messages between engines and are not persisted. What matters for the session is saved as `LogEntry`.
- **File extension:** `.otd.json` (the hexmapper saves OTD bundles; legacy `.hexmap.json` files still open).

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
- Language and personal settings (notes provider, etc.) are **user preferences** in `localStorage`, never session data.
- **Every app has a user manual** in `docs/manual/<locale>/<app>/` (English and Spanish, kept in sync: a test checks every English page has a Spanish one and that links resolve) and a help button with `HelpPanel` from `manual-ui`. Update the manual when a feature changes.
- Tests are mandatory in every headless package, with deterministic RNG. Snapshots never replace meaningful asserts.
- Every persisted format change bumps the version and adds a migration.
- One commit per phase or feature, with a descriptive message.

## Ecosystem roadmap

1. [x] Monorepo, `hex` and `note-refs` packages.
2. [x] Design review of `docs/otd.md`, `docs/oracle-engine.md` and `docs/travel-engine.md` (open decisions resolved: short optional hex notes, `.otd.json`, one base locale per pack with fallback translations).
3. [x] `random`, `dice`, `conditions`.
4. [x] `oracle-engine` MVP and the private Kal-Arath pack (es): tables, settlements, dungeons, travel rules, bindings.
5. [x] `time`, A\* pathfinding in `hex`, `travel-engine` MVP.
6. [x] OTD `schema` and hexmapper files in OTD (`.otd.json`; legacy `.hexmap.json` still opens).
7. [x] `session` and the hexmapper Play mode (simple token + trail, or rules: Travel Engine + Oracle with journal). `oracle-ui` and `travel-ui` are extracted and used by the hexmapper.
8. [ ] Standalone `oracle` (✅ first version: browse and roll every definition, history, form editor for tables with translations, YAML editor with live diagnostics, new packs, zip import/export) and `travel` (✅ first version: play trips without a map, forms for travel rules and checks/bindings, YAML editor with live diagnostics, new systems, edit a copy) apps, each with **creation and editing tools for its rulesets**: the Oracle app edits packs (tables, generators, oracles, decks, translations), the Travel app edits travel rules and bindings. Text files (YAML/JSON) stay the source of truth: the editors read and write them, with live validation.
9. [ ] Later: `weather-engine` (Markov / hex flower), CLI (`oracle roll …`, `oracle validate …`), table editor, Web Components for non-Svelte hosts.

**Versioning and releases (to define):** we work on `main` for now. Before the first release, agree on a workflow for tags and releases (semver; repo-wide vs per-package versions; changelog, e.g. Changesets; what triggers a tag). No release until there is an alpha MVP the user is happy with; that one becomes `0.1`.

The apps' own roadmaps are in `apps/hexmapper/CLAUDE.md`, `apps/oracle/CLAUDE.md` and `apps/travel/CLAUDE.md`.

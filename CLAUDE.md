# OpenTabletop

FOSS tooling for **solo RPGs, hexcrawls and sandbox campaigns**: a set of reusable libraries plus the apps built on them. It started as a hex map editor for playing **Kal-Arath**.

The point is to be **game-system agnostic**: every game's rules live in data _packs_, never in the code. The Grey Marches, our own showcase pack, exercise every feature.

## Principles

1. **Separate responsibilities whenever it makes sense.** Small packages with clear interfaces; composition over giant "managers".
2. **Headless cores.** Engines (`*-engine`) and domain packages are plain TypeScript: no Svelte, no DOM, no `localStorage`, no network. Persistence, UI and filesystem access live in adapters.
3. **Data, not code.** Each system's rules are declared in packs (YAML/JSON) validated on load. No `eval`, no `Function()`, no embedded scripts: packs may come from third parties.
4. **As system-agnostic as possible, short of madness.** Anything a game names or decides (roll modes, fatigue, morale, being lost, eating, camping, reputation…) is declared by a pack; engines offer generic mechanisms (repeat-and-keep rolls, declared values, effects, conditions, actions made of steps) and know no game concepts. No hidden decisions either: no implicit bounds (a value has the `min` / `max` its system declares, or none, and may go negative), implicit defaults or fixed lists of choices where a system could declare its own. An unavoidable built-in shortcut is a documented default the system can override. Prefer one general mechanism over special cases.
5. **Definitions ≠ state.** Static data (tables, rules, the map) is separate from play state (drawn cards, party position, time). Saving a session never modifies definition files.
6. **Engines don't know each other.** They talk through events and ports, never by calling each other. E.g. the Travel Engine emits `ENCOUNTER_CHECK_REQUIRED` and an integration layer decides which Oracle table to resolve.
7. **Immutable state and pure functions** in engines: `(state, action) → { state, events }`. Easy to test, undo and replay.
8. **Injectable randomness.** No engine calls `Math.random()`; all take a `RandomSource`, which can be seeded for tests and replays.
9. **Lore lives elsewhere.** Notes, NPCs and factions in depth live in the user's notes app (SilverBullet, Obsidian…). OpenTabletop stores mechanical state and **references** (`noteRef`), never duplicated content. Short, optional GM notes on hexes are fine.
10. **Keep it simple.** The apps are not VTTs or campaign managers. When in doubt, leave it out.

## Monorepo layout

npm workspaces. Packages are consumed as TS source (`exports` → `src/index.ts`) and transpiled by Vite.

```
packages/                   # libraries, scope @open-tabletop/*
  hex/                      # hex grid math (axial/offset, pixels, neighbors, lines, flood fill)
  note-refs/                # provider-based links to external notes apps (SilverBullet, Obsidian…)
  random/                   # RandomSource, seeded PRNG
  dice/                     # dice expressions with breakdown (NdM±K, d66, dF, repeat and keep…)
  variables/                # {{…}} variables and rolls in written values; rolls fixed for a moment
  conditions/               # safe condition evaluator (no eval), shared by every engine
  time/                     # GameTime (absolute minutes), calendars, seasons, watches
  schema/                   # OTD schema (OpenTabletop Data) in Zod → TS types + JSON Schema
  oracle-engine/            # tables, oracles, generators, decks; packs; locales; history
  travel-engine/            # routes, movement, time, supplies, declared values, actions as steps, checks
  world-engine/             # the world clock: time, scheduled events, holidays and moons, progress clocks, timeline
  weather-engine/           # weather with inertia: Markov models per season as data (`kind: weather`)
  session/                  # integration layer: travel checks → Oracle via bindings, effects, journal, systems from packs, trips, map discovery
  storage/                  # browser storage adapter: the map library (IndexedDB), backups of everything
  ui-kit/                   # shared Svelte: theme, typed i18n, shared vocabulary, tooltips, toasts, dialogs, app switcher
  pack-ui/                  # pack library (bundled + user packs), editing, YAML helpers, YAML editor
  oracle-ui/                # embeddable Oracle: roll panel, result card, history, picker
  travel-ui/                # embeddable trip UI: setup, status, supplies, actions, journal; the trip without a map (way, store, room)
  manual-ui/                # user manual: pages from docs/manual, search, in-app help panel, full view
apps/                       # each with its own CLAUDE.md
  hexmapper/                # map editor, and play on the map
  oracle/                   # roll and edit packs
  travel/                   # play trips without a map
  systems/                  # make and edit game systems (travel rules, checks, bindings…)
  manual/                   # the user manual of every app, with search
  cli/                      # the `opentabletop` command line: validate, list and roll packs (Node, bundled by Vite)
packs/                      # open data packs
  core/                     # generic content for any game (oracles, inspiration, scene twists); no travel system
  grey-marches/             # showcase setting: a travel system and tables using every feature, with an example map (maps/)
  kal-arath/                # README only (the pack is personal use: see below)
packs-private/              # (git-ignored) checkout of the private packs repo
docs/
  BACKLOG.md                # everything to do, done, agreed or rejected
  manual/<locale>/<app>/    # user manual pages (Markdown, en base + es); technical/ for formats and syntax
  otd.md                    # common OpenTabletop Data schema
  oracle-engine.md          # Oracle Engine design
  travel-engine.md          # Travel Engine design
```

**Allowed dependencies** (top to bottom, never upwards):

```
apps  →  *-ui, ui-kit  →  session  →  *-engine  →  dice, conditions, variables, time, hex  →  random
                                         ↘ schema (types/validation of persisted data only)
```

- Among the lower packages: `conditions` → `variables` → `dice` (variables and rolls in written values are read in one place).
- An engine **never imports another engine**. Whatever they share (dice, time, conditions) goes into a lower-level package.
- `note-refs` depends on nothing, and no engine depends on it: external references are opaque strings to engines.
- `storage` is a browser adapter (IndexedDB, localStorage) with no dependencies; only apps and UI packages use it, never engines.

## Common schema: OpenTabletop Data (OTD)

Details in [`docs/otd.md`](docs/otd.md). In short:

- **Campaign entities:** Campaign, Map (with Hex), POI, Party, Character, Faction, Clock and LogEntry (the persisted "Event"). They share a base `{ id, type, name, tags, noteRef, refs, ext }`.
- **Pack definitions:** every `kind` a pack can hold (tables, oracles, generators, decks, roll modes, travel rules, bindings, calendars, weather…), in versioned, namespaced packs (`kal-arath/reaction`). Each kind is documented in `docs/manual/*/technical/07-kinds.md` (and briefly where it's used); a new kind adds itself there.
- **`ext.<namespace>`** holds app- or system-specific data without polluting the core, e.g. `ext.hexmapper` (rendering, printing) or `ext.kal-arath`.
- **References** are `type:id` strings, never nested objects.
- **Runtime events** (`HEX_ENTERED`, `TABLE_RESOLVED`…) are messages between engines and are not persisted. What matters for the session is saved as `LogEntry`.
- **File extension:** `.otd.json` (the hexmapper saves and opens OTD bundles only).

## Packs, sources and licensing

A pack is a folder with `pack.yaml` (id, version, base locale, license, dependencies) and YAML/JSON definitions. Packs are validated on load: broken references, overlapping ranges, cycles, missing dependencies.

Apps ship preloaded with packs from many games, each distributed through whatever channel its license allows. The engine loads every pack found in its **sources**:

| Source                 | Contents                                                                                                                   | Where                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open packs**         | Our own FOSS content (`core`) and games whose license allows redistribution (CC BY, CC BY-SA, ORC, OGL…), with attribution | `packs/` in this repo; bundled in builds                                                                                                                                           |
| **Personal-use packs** | Games whose license only allows personal use                                                                               | **Separate private repo** `cornezuelo/opentabletop-packs-private`, cloned at `packs-private/` (`git clone git@github.com:cornezuelo/opentabletop-packs-private.git packs-private`) |
| **User packs**         | Tables created or imported in the app                                                                                      | Browser library or a chosen folder, exportable as packs                                                                                                                            |

- **Kal-Arath is personal use only**: "Copyright 2023 Castle Grief, permission to copy granted for personal use" (rulebook at `~/Descargas/Rol y Wargames/Rol/Solitario/Kal-Arath/`). Its content never goes into this public repo: the whole pack (manifest included, so it can't shadow the real one) lives in the private packs repo. Only a README and our own design work (generic travel rules, bindings without rulebook text) live here.
- **Personal-use packs never reach a public build.** Apps glob them as `@personal-packs/**` (`vite.packs.ts`): included in dev, tests and builds with `OTT_PERSONAL_PACKS=1` (`make serve` / `make rebuild`, into `dist-local/`); every other build (`make site` → `dist/`, releases, CI) leaves them out and fails if one is loaded. Publish only `dist/`.
- Before adding a game to `packs/`, check its license and record it in `pack.yaml` (`license`, `attribution`). If in doubt, it goes to the private repo. A personal-use game could move to `packs/` only with the author's permission.
- **Languages:** every pack has exactly one required base locale (`locale` in `pack.yaml`). Translations are optional overlays per locale; any missing string falls back to the base locale (see `docs/oracle-engine.md`). This holds for every kind: definitions that aren't tables are translated in the same `locales/<lang>/<file>` overlays, keyed `<kind>/<id>`; never write texts in several languages inline in a definition. Pack content is not translated by the UI's i18n.

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

**Commands:** `make` lists them all; each wraps an npm script. `make verify` runs what CI runs (lint, types, tests). `make serve` builds every app into one origin (so they share the browser's data) and serves it; `make rebuild` rebuilds it under a running `make serve`. Builds use relative URLs (`base: './'`), so they work from any folder.

## Conventions

**Language and texts**

- **Everything in the repo is in English**: code, identifiers, comments, commit messages and all Markdown (the repo will be public). Conversation with the user stays in Spanish.
- **Bilingual UI (en/es), English by default** in every app and `*-ui` package: no hard-coded visible text, always `t('key')`. `en.ts` is the reference dictionary and `es.ts` must have the same keys (enforced by types). Every new key is added in both languages.
- **Spanish texts read as Spanish, not as a calque:** "by itself" is "automática" / "por sí sola", never a bare "sola" that agrees with nothing; "solo" (only) never takes a gender.
- **Cores don't translate.** They emit codes and parameters (`{ code: 'NAVIGATION_LOST', hex }`) and the UI translates them.
- **UI texts are generic:** tooltips, hints and placeholders never describe what a particular pack does ("in the Grey Marches, landmark stops the trip") nor name a pack the user may not have; they explain the mechanism and say it depends on the system. What a pack does goes in its own manual page and its own texts. Syntax examples with made-up values (`tags: landmark`) are fine. Anything a system decides (speeds, what a terrain or water allows, what a value or action does, a worked calculation) is said as a hypothesis ("if a way of travelling makes 24 km a day…", "a terrain at `0.5`"), never as a fact about a terrain or way ("a forest is half speed", "impassable on foot"); example names are made up, never a bundled pack's (its system, calendar, moons, weather).
- **Reuse texts, never copy them:** whenever the same word or sentence means the same thing in several places, write it once and refer to it. Words of maps and trips shared by the apps (terrains, roads and rivers, seasons, moon phases, region, tags…) live in ui-kit's `vocabulary` and every dictionary refers to it (`terrains: vocabulary.es.terrains`); a text used twice in one app is one key. Only copy when the meaning differs.

**Forms and UI**

- **The full syntax wherever it fits:** a field that decides when or where something applies takes a [condition](docs/manual/en/technical/08-conditions.md) (the same `when` / `unless` syntax everywhere), not a plain list or a checkbox; a choice among things a system declares lists what the system declares, not a fixed set. Older plain forms keep being read.
- **Autocomplete where values are known:** an input whose value comes from a known list (ids, tags, terrains, field keys, context values…) suggests them (`SuggestInput`, or `<datalist>` at least).
- **Explanations live in the help column**: a control's explanation is an `<InfoTip>` inside its label's text (or column header, or title): it draws a dotted underline, and clicking it (or F1 in its field) shows the text in the app's help column, in place of its manual (`contextHelp` in ui-kit; apps open their column when `contextHelp.asked` changes). Write it for the field in basic Markdown (`helpMarkdown`: each line a paragraph, `• ` lines a list): what it does, then several short examples that work, one per line, syntax in backticks (`` `danger: { gte: 2 }` — … ``), labels in **bold**. Tooltips (`use:tooltip`) are only for icon-only buttons' names.
- **No native browser UI**: tooltips use `use:tooltip` (never `title=`), questions use `confirmAction()` / `ask()` from `ui-kit` (never `confirm()` or `alert()`); each app mounts `<Toasts />` and `<Dialogs />` once. Actions that Ctrl+Z can't undo (play state, forms without undo, deletions outside the history) ask first.
- **Interconnect the systems:** whenever it makes sense, a new engine or app reads and feeds the others (map, oracle, travel, time, factions, characters, journal, notes) through events, ports and shared OTD data, never by importing another engine.

**Storage**

- Language and personal settings (notes provider, etc.) are **user preferences** in `localStorage`, never session data.
- **Browser storage keys start with `opentabletop.`** (or the legacy `hexmapper.`), so backups (`@open-tabletop/storage`) include them; data in IndexedDB must be added to the backup explicitly. An app that saves on its own (autosave on page hide) registers `onBeforeBackup` / `onBeforeRestore`.
- **Every persisted format change** (maps, saved trips) bumps the version and adds a migration.
- **Pack syntax never changes meaning silently:** if existing YAML would mean something else, bump `PACK_FORMAT` (oracle-engine), migrate the old meaning on reading (packs say their `format` in `pack.yaml`; absent: 1), add its row to the formats table in File formats, and move our packs to the new format. New keys that change nothing old need no bump.

**Bundled packs**

- **Every feature lives in the bundled packs too, as part of the work** (a feature isn't done until both use it, with a test that plays it):
  - **The Grey Marches** (and their example map) are the showcase: every feature at full power, with extreme complexity, every system interconnected with the others (map, oracle, travel, world clock, factions, everything to come). Review that they use every feature before closing a milestone.
  - **Core** (and the Generic rules in `travel-engine`) must not fall behind: the generic use of every feature that makes sense for any game, with extreme simplicity, the smallest example that works.
  - Both are documented in the manual's packs section (`docs/manual/*/packs/`): what each part does and which feature it shows, kept up to date with them.
- Every Grey Marches definition's `description` (en, and es in its overlay) says what it is for and, in a second paragraph, which features it shows (`**Shows:** …` / `**Enseña:** …`); keep it up to date when a definition changes. Pack descriptions are basic Markdown, rendered safely by `Markdown` / `renderMarkdown` in ui-kit and `tooltip={{ markdown }}`.

**Documentation** — every app has a user manual in `docs/manual/<locale>/<app>/` (English and Spanish, kept in sync: a test checks every English page has a Spanish one and that links resolve) and a help button with `HelpPanel` from `manual-ui`.

- **Every feature is documented as part of the work, not later:** how to use it in its app's pages, in plain words with examples (for people who don't program; point to the Grey Marches when they show it); the harder details (file formats, what tables see and in which order, YAML, edge cases) in the **technical** section, linked from the app pages.
- **Examples in the manual work:** every YAML block with a `kind:` in `docs/manual` is loaded by a test (`apps/oracle/src/lib/packs/manual-examples.test.ts`); an excerpt that leaves parts out says so with `…`. A walkthrough (like Travel's _Your first system_) gets a test that plays it.
- **No feature is done (no commit, no ✅) until its documentation is checked everywhere it belongs.** For every new key, option, value or behaviour, search the manual (`rg` in `docs/manual/en` and `docs/manual/es`) for the places that talk about its neighbours, and update each: (1) the app pages where the user meets it; (2) the technical references that list it (Kinds, Conditions, What tables see, Connecting); (3) **every list that enumerates the alternatives** (what `blocks` accepts, where `when` / `unless` go, which steps exist…); (4) the UI's help texts and the suggestions of the inputs that accept it; (5) the bundled packs' manual pages. Both languages. The reply that closes the work says which pages were updated.

**Work**

- Tests are mandatory in every headless package, with deterministic RNG. Snapshots never replace meaningful asserts.
- One commit per phase or feature, with a descriptive message.
- What a user would notice (apps, packs, formats, fixes) gets a line under **Unreleased** in [`CHANGELOG.md`](CHANGELOG.md) in the same commit; releases follow [`docs/RELEASING.md`](docs/RELEASING.md).

## Backlog

Everything to do, done, agreed, decided or rejected lives in **[`docs/BACKLOG.md`](docs/BACKLOG.md)** (the ecosystem roadmap and each app's), not here: this file holds directives.

- Read the backlog before starting work; "continue with the backlog" means its next step in order.
- When the user asks for something to be noted, or a decision is agreed, write it there (with the date and, if useful, their reason) and tell them the file and line.
- When something is done, mark it ✅ there in the same commit, with a short note of what was built.
- Directives that come out of the work (how to do things from now on) go into this file, not the backlog.

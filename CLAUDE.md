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
- **Every feature lives in the bundled packs too:** when a feature lands, its simple, generic use goes into **Core** (if it makes sense for any game) and its full use into **the Grey Marches** (and its example map), with a test that plays it. Core stays small and generic; the Grey Marches exercise everything. Before closing a milestone, review that the Grey Marches use every feature. Every Grey Marches definition's `description` (en, and es in its overlay) says what it is for and, in a second paragraph, which features it shows (`**Shows:** …` / `**Enseña:** …`; pack descriptions are basic Markdown, rendered safely by `Markdown` / `renderMarkdown` in ui-kit and `tooltip={{ markdown }}`); keep it up to date when a definition changes or a new one is added.
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
- ✅ **Packs per map (Hexmapper):** Settings → Map chooses which packs the map works with (default: all); the Oracle panel and Play's systems list only show those. The example map comes with the Grey Marches and Core. (The Oracle and Travel apps fold their lists, so they don't need it.)
- ✅ **Realistic discovery:** an empty hex is decided from all its known neighbours, not just the one it's seen from, so lakes, forests and ranges grow together instead of land / water / plains in a row. Shares groundwork with weather inertia (phase B).
- ✅ **Region styles:** today a fixed light tint (alpha 0.14) and an inner border (alpha 0.85); make the fill optional with its opacity, and style the border (width, solid or dashed), map-wide in Settings with an optional own style per region, like map texts.
- **Loose ends:** ✅ conditions and `set` in the Oracle table form; ✅ undo across form edits; ✅ several saved trips and journal export in the Travel app; ✅ POI icons, ✅ highlight/filter hexes by tag; ✅ responsive layouts for narrow windows (Hexmapper panel as a sheet, Oracle in one column).
- **Suggestions while typing, everywhere** (✅ condition, value and context boxes in Oracle and Travel forms, the YAML editor, Travel tags and rules lists, map values; `SuggestInput` + `contextSuggestions`; new inputs must use them): autocomplete in every input whose value comes from a known list, in every app and system (today's and future ones): context keys, field keys and values, table and definition ids, tags, terrains, regions, events, stats… in forms, the roll panel, the hex panel and the YAML editor.
- ✅ **Save / load the whole state (before any new system):** one backup file (OTD bundle or zip) with everything the apps keep in this browser, not just Hexmapper maps: the map library (IndexedDB), user packs, the Travel app's trip, Oracle histories and deck states, favorites and preferences. Restore it on another machine to resume whole campaigns, or after losing the browser storage. Versioned with migrations like every persisted format; restoring asks before replacing (or merges by id). Done (2026-10-07): app switcher → Save a backup / Restore a backup… (add to mine or replace everything), `@open-tabletop/storage`, manual page technical/05-backups.
- ✅ **Installable, offline apps (PWA)** (`vite.pwa.ts`: a manifest and a service worker per app) and ✅ the **command line** (`apps/cli`, `make cli ARGS="validate | list | roll …"`).
- **Release workflow** (see below), per-package build, then alpha `0.1`.

**Next, in this order (agreed with the user 2026-10-08; each step is groundwork for the ones after it, so nothing gets rewritten)**

Guiding idea (the user's concern): mechanics like fatigue, morale, reputation, fodder belong to **particular systems**, not to the core. The core only knows _generic declared values_ and _effects_ on them; each system (pack) declares which values exist, what they're called and how they behave. Nothing a system doesn't declare is shown.

1. ✅ **Clearer play messages** (done 2026-10-07: results show what they changed, actions say when nothing was rolled — an action's `nothing` text —, supplies eaten and fatigue changes are journaled with their reason; the Grey Marches' Forage for food / Buscar comida). The journal says what every action did, also when nothing happened: e.g. foraging on a terrain where the system rolls nothing must say so ("nothing to forage on hills"), and a successful forage says how much food was gained. Tooltips and short texts explain how each action and value works. (Background: the user thought Forage did nothing; it works — 1d6 + Survival on the `forage` table, food only on 4+ and only in forest/dense forest/plains/farmland/heath/marsh — but nothing told them so. Also "Forrajear" reads as "gain fodder" in Spanish: rename the Grey Marches action to "Buscar comida" / "Forage for food".)
2. **Every visible name from the pack.** Resources, stats, actions, checks, world events, moons… take `name`/`description` from their pack (in one or several languages), falling back to the id; no game words hard-coded in the apps (today `food`, `fodder` and the travel modes are named by the travel-ui dictionary, which only knows a few ids — move that into the packs). Review the manual on party stats (where Charisma, Survival, Navigation come from: the Grey Marches' bindings `stats:`; Kal-Arath declares PRE; Generic none; tables read them as `{{survival}}` / `party.stats.survival`). Fill in names and descriptions for checks, stats, resources, actions in **Core, the Grey Marches and Kal-Arath** (private repo).
3. **System values and effects (generic).**
   - A system declares its values: for the party (fatigue, morale, hirelings…), later for factions (reputation…), characters, the world. Each with name/description per language, optional min/max and a default. Engines know none of them by name.
   - **Fatigue stops being built into the travel engine:** today it always exists, hunger adds 1 and a fed night in camp removes 1. Those become rules of the system, written as data (e.g. "on camp with food: `party.fatigue: -1`"; "short of food: `party.fatigue: +1`"). A system that doesn't declare fatigue doesn't show it. Same for resources consumed per day.
   - **One effects vocabulary** (syntax agreed with the user) for actions, table entries, deck cards and faction turns: `effects: { party.fatigue: -1, party.resources.food: +2, factions.ironclans.reputation: +1, party.stats.morale: '=3' }` — the key is the dotted path tables already read; a number adds or subtracts, `'=value'` sets; min/max respected; a path the system doesn't declare is a pack error. Replaces fixed form columns like the travel actions' "fatigue recovered" (`actions.rest: { minutes: 120, effects: { party.fatigue: -1 } }`). Today's forms (`set: { resources: { food: 2 } }`, `set: { stats: { morale: -1 } }`, `fatigue: 1`) keep working (read as effects). `set` stays for context values that aren't system values (the day's `weather`, `*Modifier`, `*Impossible`, `lost`).
   - Forms: a list of "path + change" rows with suggestions of the declared paths.
4. **Suggestions panel and cheat sheets** (asked by the user): besides the inline suggestions, a side panel in the Oracle and Travel editors (forms and YAML) listing what tables can read and set right there — names with their values and descriptions (from step 2 and 3), grouped (map, trip, party, calendar, factions…) — plus cheat sheets of the syntax (dice, conditions and operators, templates, effects, table/oracle/generator/deck shapes); click to insert at the cursor. Shared component (pack-ui), searchable, bilingual.
5. **System engine.** Today a "system" is just a pack with `travel-rules`. Make it explicit: a system declares everything it brings — travel rules, oracles/tables, calendar, weather models, values (step 3), factions, example maps; later character sheets, bestiary, initiative. Maps and games choose a system (folding in today's "packs per map"); apps show what the chosen system provides; systems export and import as a whole (one file/zip). Every engine reads its part from the system, never from another engine.
6. **World clock dates and world events with ids** (dates asked by the user 2026-10-07: today the clock always starts at dawn of day 1 and can only be advanced by steps, and events are scheduled "in N days"):
   - Choose the date (year, month, day, time, in the system's calendar) when starting the clock, and **set the date** later: forward like advancing (what comes due is journaled), backward only after asking (events already past aren't undone).
   - Schedule events **on a date** ("15 Highsun, year 412"), not only in N days; repeating ones as today.
   - The scheduled events get an `id` (to reference them from YAML: conditions, faction plans, tables) plus their readable title (and optional description), like checks have `event` + `name`.
7. **Factions** (phase B), built on 3, 5 and 6:
   - Territory = **hexes** (decided: not whole regions), drawn like a region (tint + border in the faction's colour), growing hex by hex from its border; it may start as "all the hexes of region X". A region can be split between factions.
   - Turns: an "Advance world turn" button **and** automatic turns with the world clock (on by default, every week, configurable). Each faction's turn rolls a table of its system (expand, recruit, raid, event, rumour) whose `effects` change its values and territory; everything goes to the World timeline.
   - Values are the system's (step 3): the Grey Marches declare `reputation` (−3..+3, how the faction regards the party) read by reaction/encounter tables as `factions.<id>.reputation`. Another system might declare `heat` or nothing.
   - No lore: factions point to notes with `noteRef`.
8. **A frontier-space showcase pack** (Cowboy Bebop / Firefly style): ships, contracts, bounties, a space map using the sci-fi/space terrain set and the modern/sci-fi icons, a ship mode that only travels space terrains, its own calendar and values. Like the Grey Marches, it must exercise every feature, with tests that play it.
9. **Release cycle** for alpha 0.1: Claude defines it (versioning, changelog, what triggers a tag) and leaves it written for the user to review.

**Suggestions while typing (status):** done for condition/value/context boxes in the Oracle and Travel forms (`SuggestInput` in ui-kit + `contextSuggestions` / `setSuggestions` in session), the YAML editor (keys, `kind`, references, one-line conditions), Travel tags and rules lists, and map values (keys the packs' tables read). Every new input must use them; step 3 adds suggestions for effect paths, step 4 a panel of suggestions and cheat sheets.

**Decisions taken on 2026-10-07/08 (for review):**

- Backups (`@open-tabletop/storage`) copy each app's browser data as it is (raw storage entries, maps in the Hexmapper's internal format); see "Revisit the backup format" below.
- Name precedence in what tables see: party stats by name < today's values < map and trip facts < `party` < the binding's context. A stat named like a fact (`terrain`, `weather`…) can't hide it; `party.stats.<name>` always reaches the stat. Built-in names also win over a token's or icon's own values (`name`, `kind`, `id`).
- With the world clock running, trips start at its date (the season choice is replaced by a note); travelling moves the clock and journals what comes due.
- Map format is at v10 (v8 region styles, v9 packs per map, v10 world clock), each with its migration.
- Travel's edited copies of bundled systems have **Revert to bundled** (like the Oracle app's packs).
- The Grey Marches' example map opens ready to play (with rules, its system, discovery on, world clock running).

**Phase B: the living world**

- ✅ **Calendar / world clock** (calendars as data in `time`, `kind: calendar` in packs; `world-engine`; the Hexmapper's World panel, map format v10): configurable fantasy calendars (seasons, months, weeks, moon phases, holidays) and scheduled events; advance 1 hour / 1 watch / 1 day / until sunset / until the next event; a timeline ("Day 47: full moon", "Day 53: the Iron Clans attack Black Pass"). Shared by travel and the faction turns.
- ✅ **Weather with inertia** (`weather-engine`; Markov done, bound to travel checks with `weather:`; hex flower and the world clock's own daily weather pending): today's weather follows from yesterday's, by a Markov table or a hex flower (2d6 moves on a small map of weathers) per climate and season, defined in packs; travel keeps reading `weather` as today.
- ✅ **Progress clocks** (the OTD `Clock` entity; in `world-engine`, filled by hand for now): segments filled by tables, faction turns, the calendar or by hand ("The Wyrm wakes: 3/6").
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

- **Revisit the backup format** (`@open-tabletop/storage`): today it copies each app's browser data as it is (raw storage entries, maps in the Hexmapper's internal format). That ties backups to every app's internal format, so each change there needs a migration the backup also depends on. Consider a stable, documented format (e.g. OTD bundles for maps, pack folders for packs) so old backups keep restoring without chasing internal changes.

- **Supplies and loot over time** (maybe): when something was spent or found, and who carries what, without becoming an inventory manager.
- Web Components for non-Svelte hosts.
- **Last: more free solo GM / oracle systems** found on itch.io and elsewhere, after researching which ones have licences that allow it (each as a pack, licence recorded).

**Versioning and releases (to define):** we work on `main` for now. Before the first release, agree on a workflow for tags and releases (semver; repo-wide vs per-package versions; changelog, e.g. Changesets; what triggers a tag). No release until there is an alpha MVP the user is happy with; that one becomes `0.1`.

The apps' own roadmaps are in `apps/hexmapper/CLAUDE.md`, `apps/oracle/CLAUDE.md` and `apps/travel/CLAUDE.md`.

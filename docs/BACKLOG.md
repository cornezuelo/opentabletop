# Backlog

What is done, pending, agreed, decided and rejected for OpenTabletop, kept up to date as work goes on (see the Backlog directives in the root `CLAUDE.md`). ✅ / `[x]` done · `[ ]` or no mark: pending.

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

**Asked by the user on 2026-10-07, being done now (in this order)**

- [x] **Roll modes** as system data (`kind: roll-modes`: repeat N, keep highest / lowest / middle, `cancels`; tables list `modes` and `modeWhen`), replacing the built-in advantage (agreed: "modes declared by the system"). Done: dice `repeat`/`keep`, the Oracle engine, roll panel, form, YAML editor, CLI `--mode`; Core, the Grey Marches (+ _Carefully_) and Kal-Arath declare theirs.
- [x] **Every `kind` in the manual**: briefly in the section that uses it, and a technical page with all of them in detail (`table`, `oracle`, `generator`, `deck`, `roll-modes`, `travel-rules`, `bindings`, `calendar`, `weather`…). Done: technical/07-kinds, linked from Oracle → Packs, Travel → Systems, Hexmapper → World, Core and the Grey Marches.
- [x] **Oracle pack page**: list translation files under _Translations_, not mixed into _Files_. Done: one group per language under Translations.
- [ ] **Hexmapper layout**: swap the side panels (the right panel to the left, the left to the right), like the other apps.
- [x] **README.md** at the root of the repo. Done.
- [ ] **Travel → Play → The way**: column headers and tooltips (what each column is, especially tags).

**Next, in this order (agreed with the user 2026-10-08; each step is groundwork for the ones after it, so nothing gets rewritten)**

Guiding idea (the user's concern): mechanics like fatigue, morale, reputation, fodder belong to **particular systems**, not to the core. The core only knows _generic declared values_ and _effects_ on them; each system (pack) declares which values exist, what they're called and how they behave. Nothing a system doesn't declare is shown.

1. ✅ **Clearer play messages** (done 2026-10-07: results show what they changed, actions say when nothing was rolled — an action's `nothing` text —, supplies eaten and fatigue changes are journaled with their reason; the Grey Marches' Forage for food / Buscar comida). The journal says what every action did, also when nothing happened: e.g. foraging on a terrain where the system rolls nothing must say so ("nothing to forage on hills"), and a successful forage says how much food was gained. Tooltips and short texts explain how each action and value works. (Background: the user thought Forage did nothing; it works — 1d6 + Survival on the `forage` table, food only on 4+ and only in forest/dense forest/plains/farmland/heath/marsh — but nothing told them so. Also "Forrajear" reads as "gain fodder" in Spanish: rename the Grey Marches action to "Buscar comida" / "Forage for food".)
2. **Every visible name from the pack.** Resources, stats, actions, checks, world events, moons… take `name`/`description` from their pack (in one or several languages), falling back to the id; no game words hard-coded in the apps (today `food`, `fodder` and the travel modes are named by the travel-ui dictionary, which only knows a few ids — move that into the packs). Review the manual on party stats (where Charisma, Survival, Navigation come from: the Grey Marches' bindings `stats:`; Kal-Arath declares PRE; Generic none; tables read them as `{{survival}}` / `party.stats.survival`). Fill in names and descriptions for checks, stats, resources, actions in **Core, the Grey Marches and Kal-Arath** (private repo). **Translations the pack way (user, 2026-10-07):** today calendars, weather models, roll modes, travel rules (actions, checks) and stats write their texts in several languages inline (`name: { en: …, es: … }`), against the convention that translations live in `locales/<language>/` overlays. Move them to overlays like tables' (an overlay key for definitions that aren't tables: e.g. by `kind` and `id`, since `default` repeats), keep reading the inline form for a while, and migrate Core, the Grey Marches and Kal-Arath.
3. **System values and effects (generic).**
   - **No built-in “lost” (user, 2026-10-07):** the travel engine still knows `lost` (stops travel for the day) and tables read `yesterday.lost`. Being lost is a game's concept: a system declares a day value (Kal-Arath's and the Grey Marches' `lost`) with a generic effect such as “stops travel today”, and `yesterday.<value>` follows whatever values the system declares.
   - A system declares its values: for the party (fatigue, morale, hirelings…), later for factions (reputation…), characters, the world. Each with name/description per language, optional min/max and a default. Engines know none of them by name.
   - **Fatigue stops being built into the travel engine:** today it always exists, hunger adds 1 and a fed night in camp removes 1. Those become rules of the system, written as data (e.g. "on camp with food: `party.fatigue: -1`"; "short of food: `party.fatigue: +1`"). A system that doesn't declare fatigue doesn't show it. Same for resources consumed per day.
   - **One effects vocabulary** (syntax agreed with the user) for actions, table entries, deck cards and faction turns: `effects: { party.fatigue: -1, party.resources.food: +2, factions.ironclans.reputation: +1, party.stats.morale: '=3' }` — the key is the dotted path tables already read; a number adds or subtracts, `'=value'` sets; min/max respected; a path the system doesn't declare is a pack error. Replaces fixed form columns like the travel actions' "fatigue recovered" (`actions.rest: { minutes: 120, effects: { party.fatigue: -1 } }`). Today's forms (`set: { resources: { food: 2 } }`, `set: { stats: { morale: -1 } }`, `fatigue: 1`) keep working (read as effects). `set` stays for context values that aren't system values (the day's `weather`, `*Modifier`, `*Impossible`, `lost`).
   - Forms: a list of "path + change" rows with suggestions of the declared paths.
4. **Suggestions panel and cheat sheets** (asked by the user): besides the inline suggestions, a side panel in the Oracle and Travel editors (forms and YAML) listing what tables can read and set right there — names with their values and descriptions (from step 2 and 3), grouped (map, trip, party, calendar, factions…) — plus cheat sheets of the syntax (dice, conditions and operators, templates, effects, table/oracle/generator/deck shapes); click to insert at the cursor. Shared component (pack-ui), searchable, bilingual.
5. **System engine.** Today a "system" is just a pack with `travel-rules`. Make it explicit: a system declares everything it brings — travel rules, oracles/tables, calendar, weather models, values (step 3), factions, example maps; later character sheets, bestiary, initiative. Maps and games choose a system (folding in today's "packs per map"); apps show what the chosen system provides; systems export and import as a whole (one file/zip). Every engine reads its part from the system, never from another engine. **Where systems are edited (agreed 2026-10-07):** creating and editing roll modes, travel rules and bindings (today in the Oracle's New definition and the Travel app), and calendars and weather models (today YAML only, validated live), move to the system tools then. Until that step the Oracle gets no visual editors for calendars or weather: YAML stays the way.
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

- ✅ Updates of bundled packs (2026-10-07): a user copy records each bundled file's fingerprint (`basedOn`); when a newer version changes the bundled pack, Oracle and Travel mark it **update** and list each changed file to take or keep (`BundledUpdates` in pack-ui, for every app that edits packs).
- ✅ Basic Markdown in pack descriptions (2026-10-07): paragraphs, bold, italics, code, lists, quotes, web links; HTML and images stay text (`Markdown` / `renderMarkdown` in ui-kit, `tooltip={{ markdown }}`, `InfoTip markdown`). New places that show a pack's description must use them.

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

The apps' own roadmaps follow: [Hexmapper](#hexmapper), [Oracle](#oracle), [Travel](#travel).

## Hexmapper

### Done

- [x] Phases 0–1: skeleton, grid, terrain, undo/redo, save/load, autosave.
- [x] Hex metadata, provider-based linked notes, physical size and printing, unique map id.
- [x] Roads and rivers (nodes, shores, offsets, branches), styled icons, text, layers, editable palette.
- [x] PNG and real-scale PDF export.
- [x] Local map library and deep links.

### Pending

- [ ] UI for the optional hex fields travel may use (elevation, danger, region); custom fields cover them for now.
- [x] Highlight/filter hexes by tag (Layers panel; dims the rest on demand).
- [ ] Multi-page PDF tiling for large maps, and an option to print empty hexes white.
- [ ] Translate icon names (currently English, as they come from game-icons).
- [ ] **Planned route drawn along the roads it follows** (asked 2026-10-07): when the route goes by a road, trail or river, draw it along that line's smoothed curve, beside it (offset so it never sits on top of it), instead of from hex centre to hex centre. Today it looks like it leaves the obvious way: on the example map the trail to the Grey Stones is stored as 0605 → 0604 → 0504 → 0503 and the route follows exactly those hexes, but the trail's curve cuts the corner at 0604/0504 while the route turns square through the centres. The first stretch out of Ashford already looks right (close beside the road, not over it); keep that.

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
- [x] **Values (2026-10-07):** key/value fields on tokens, icons, regions and POIs (map format v7), edited with the shared `FieldEditor` (keys and values used on the map suggested). Region values hold for its hexes (a hex's own win); icons as `icon.*`; the selected token as `token.*` in Oracle-panel rolls; POI values are kept but not read. OTD: characters' and POIs' `stats`, the party's token look, regions and icons in `ext.hexmapper`.
- [x] **Packs per map (map format v9, `meta.packs`):** Settings → Map chooses the packs this map works with (default all); the Oracle panel and Play's systems list only show those.
- [x] **Region styles (map format v8):** optional fill with its opacity (now a fixed 0.14 tint), border width and solid/dashed; map-wide in Settings, own style per region (like map texts).
- [x] **POI icons:** an optional icon per POI to tell them apart in the hex panel (not drawn on the map).

### Side panel (agreed 2026-10-07)

Each tool shows only what it edits (Select: the hex; Terrain: the palette; Tokens: the token…). Settings, Layers (▤), Help (?), Maps, Export and the Oracle are views opened from the toolbar. Changing tools deselects what the previous one had selected. Keyboard shortcuts live in the manual.

### Backlog (Oracle in the map, agreed 2026-10-06)

- [x] "Roll here" from the hex panel: opens the Oracle with that hex as context (the panel says which hex rolls read).
- [x] Apply results to the map: "Add to <hex> as a point of interest" under each result (oracle-ui `actions` snippet); long results keep the table name as the POI name and the text as its description. Undoable.
- [x] Oracle history and deck state per map (map format v6): `map.oracle` = { state, history }, shared by hand rolls and trip checks; in OTD, `state.oracle` and `ext.hexmapper.oracleHistory`. oracle-ui's Roller takes a `store`.
- [x] Discovery (2026-10-07): bindings `discover: { terrain, contents, reveal }`; session goes hex by hex, decides empty hexes (terrain seen from the current hex; contents on first entry: POI, tags, name), re-plans the route and stops at finds; the Hexmapper writes them on the map outside undo (`editor.applyDiscovery`). Play panel toggle and reveal mode (neighbours / entered) in `play.discover`. The Grey Marches have the full example (`discovery.yaml`); terrain tables see the land around the hex being decided (`around`, `common`).

### Later

- Narrow windows and mobile: keep layouts responsive (content-sized columns instead of fixed widths, panels that collapse).

- Procedural generation, sub-maps, curved text, SVG export, Tauri desktop build.

### Rejected

- Square grids: better FOSS editors already exist (Tiled, etc.).
- Fog of war, second-screen player view and other VTT features.

## Oracle

### Done

- Pack list and history can be folded (header buttons; remembered in this browser).
- Favorites (☆ next to a definition's name): pinned on top of the list, also in the Hexmapper's Oracle panel (shared `opentabletop.favorites`).
- New definition dialog also adds travel rules and bindings (one travel system per pack).
- Sidebar with search, packs (bundled / edited / personal-use badges, error count) and their definitions.
- Roll tab: oracle inputs, detected context variables, advantage/disadvantage, deck draw/shuffle with cards left, result card with dice breakdown and nested results, entries preview with the chosen one highlighted, Space/Enter to roll again, results in the UI language.
- History (last 100, persisted) and "New session" (resets once-only entries and decks).
- Undo/redo of every change to user packs (PackLibrary history, ↶ ↷ and Ctrl+Z outside text fields; YAML typing groups per pause).
- Entry conditions, `set` values, once/at-most (⋯ on a row, one line of flow YAML) and clamp / when-exhausted per table.
- Form editors for every kind, with translations per language (overlay files): tables (dice, entries with range or weight, delegate to a table/generator, add/duplicate/move/remove, number 1–N, give entries ids), oracles (the input, its options: rename/add/move/remove, default, one entry list per option), generators (fields from a table, generator, dice or fixed value; rename/move/remove; template with {{field}} chips) and decks (cards with copies, reshuffle mode).
- Definitions: "New definition" dialog (pack, kind, name → id, file; also from the + on each user pack), duplicate, "copy to" one of your packs (with translations; local references become `pack/id`), delete (with translations).
- Pack view: manifest summary, problems (click → line), definitions, other engines' definitions, files (add/rename/delete), translations (add language), new definition from templates, export .zip, delete / revert.
- YAML editor (CodeMirror 6, MIT) with diagnostics in the gutter.
- New pack dialog, import .zip.

### Pending

- Roll statistics (distribution of a table) and coverage view.

## Travel

- [x] First version: systems list, play an abstract trip, YAML editor with live diagnostics, new system, edit a copy, manual pages.
- [x] Forms for travel rules (day, modes, terrains, edges, resources, weather, actions) and, in one Checks tab, checks with their bindings (table picker, context) and stats. They write the YAML through pack-ui helpers, keeping comments.
- [x] Several saved trips (open, name, another, delete); export a trip's journal as Markdown (travel-ui, also in the Hexmapper).

## Packs

### Kal-Arath (checked against the rulebook on 2026-10-07)

Done: the travel procedure (weather, getting lost, points of interest, encounters, camping) matches the rulebook; foraging is a trip action (halves the day's march, once a day, adds to the food; impossible in storms); the Explorer ability is a party stat (`explorer`: advantage to forage and not get lost, points of interest on 4–6); finding the way again after a day lost is rolled with disadvantage (`yesterday.lost`); the autumn storm only halves travel (`autumn-storm`); the extra ration of a heatwave or the first snows is taken; dungeons gained the passages table and the boss rooms (summarised: the full rooms stay in the book).

Still not as the rulebook has it, waiting for generic support (not Kal-Arath code):

- [ ] **Fatigue**: Kal-Arath has none, but the trip panel shows it and hunger raises it. Step 3 of the roadmap (system values) removes it: the pack will declare only what it uses.
- [ ] **Camping recovers wounds and conditions** after spending a ration: there are no character values yet (phase C, characters).
- [ ] **An Explorer chooses advantage or disadvantage on encounter rolls**: a choice the player makes when the trip rolls; today only by hand.
- [ ] **Herbs** are rolled by hand after a rare find (`herbCount` times); _Tarnak berries_ (no ration needed that day) aren't applied.
- [ ] **Revisited areas** of a dungeon bring an enemy on 1 in 1d6: today by rolling _Passage_ again; dungeons live on the map only once there are sub-maps (phase E).

# Backlog

What is done, pending, agreed, decided and rejected for OpenTabletop, kept up to date as work goes on (see the Backlog section of the root `CLAUDE.md`). `[ ]` pending · `[x]` / ✅ done. Within each list, **order is priority**.

Guiding idea (the user's, 2026-10-07): mechanics like fatigue, morale, reputation, fodder or eating belong to **particular systems**, not to the core. The core knows _generic declared values_, _effects_, _conditions_ and _actions made of steps_; each system (pack) declares what exists, what it's called and how it behaves. Nothing a system doesn't declare is shown.

## Alpha 0.1: what's left (reviewed 2026-10-07)

**Bugs and asks first (user, 2026-10-09), in this order, before the rest of the alpha (item 7 waits for the user):**

1. [x] ✅ **Travel + world clock, end to end** (done 2026-10-09: `travel` with `by` in the engine, kept hex by hex with discovery; the World panel travels on with a route (**Travel on**) and waits without one; any move into another day asks; `stopMessage` says at the bottom why the trip stopped early (a check, a place found, a value, a blocked way) or that it arrived; a day the party can't march is a day lost, journaled; Hexmapper play tests with a seeded Math.random play it to the destination; World and Play pages en/es) (user: "advancing days still doesn't move the party"; the travel–world system "is lost or buggy"): advancing the world clock with a trip on and a route planned marches the party along it (engine: `travel` with `by`, written, one test failing: a fed party doesn't camp in the `fedCamp` rules), waiting only without a route. The World panel calls it (`advanceWorld` in `apps/hexmapper/src/lib/play/world.svelte.ts`), its label and help say so ("Travel on" / "Wait here"). **A confirmation dialog when a day (or more) is going to pass**, and **a message at the bottom when the trip stops for something that needs the player** (a check to resolve, a blocked way, a value that blocks travel, arrival): both existed (`world.confirmWait`, `world.waitStopped`) and the user says they're missing or broken: check them in the built app. Deep tests that play it (Hexmapper play tests, session tests), the World and Play manual pages (en/es).
2. [x] ✅ **A night that can't be camped passes** (done 2026-10-09: journal line en/es; Travel playing and systems pages, Connecting, Travel's help) (engine done, uncommitted: `NIGHT_WITHOUT` event; a travel order at nightfall without camp passes the night and marches on): its journal line in travel-ui (en/es), the Travel manual (playing, actions), the old `stop.camp` kept for older journals.
3. [x] ✅ **The Grey Marches: camp and rest only when the party can** (done 2026-10-09: `when` on both, Hunger moved to `at: day-end`; deep tests: rest, can't rest or camp hungry / exhausted, nightfall fed or not, travelling on hungry) (user): `when: { party.resources.food: { gte: 1 }, party.stats.fatigue: { lt: 10 } }` (or similar) on camp and rest, so the system shows its flexibility; the night passes without camp otherwise (item 2). `**Shows:**` lines, pack manual rows, tests that play it (fed and hungry, fresh and exhausted). Replaces the 2026-10-08 decision "camping is always possible".
4. [x] ✅ Route drawn along the roads' drawn shape (2026-10-09: `routePoints`; the trail and route take the points of the road, trail or river they follow, skipping crossed-only hexes). Still to check in the built app with a screenshot.
5. [x] ✅ **The help column, richer** (user; done 2026-10-09: help texts are basic Markdown (`helpMarkdown`), the help column shows only the explanation with **← The manual** / **Find it in the manual**; every help of Travel, the Oracle, the Hexmapper and the roll and trip panels rewritten en/es with working examples in code; tooltips and notes that show help texts render them too): many more working examples in every InfoTip (Oracle, Travel, Hexmapper), basic Markdown formatting in them (code, lists, bold), and **no manual below a field's explanation** (the manual only when no field is being explained, or behind a link).
6. [x] ✅ **Collapsible side panels everywhere, like the Hexmapper's** (user; done 2026-10-09: `FoldTab` in ui-kit, the Hexmapper's edge tab; the Oracle folds its pack list and history / help with it (the header toggles are gone), Travel its systems list and help column, the Manual its contents; each remembered in this browser): the Hexmapper's way of folding its side panel looks much better than the Oracle's: use it in the Oracle (and give it a collapsible left panel too), in Travel and in the Manual.

The alpha is the four apps (Hexmapper, Oracle, Travel, Manual) published as a static site with the open packs, a pack format we don't expect to break soon, a complete manual and a repeatable release. In order:

1. [x] ✅ **Actions the system triggers, and no built-in eating** (agreed with the user 2026-10-07; done 2026-10-08: actions' `on:`, steps `do:` / `roll:` / `set:`, supplies' `min` / `max` with `below` / `above` and the `LIMIT_REACHED` journal line, checks without `at`, stat bounds passed to the engine so later steps see them; older `perDay` / `consumes` / `eat: day` read as a generated `eat` action at day-end, with **Convert** in the Travel editor (`olderEatingEdits`); the Generic rules, the Grey Marches and Kal-Arath migrated; older trips' `ate` read by the engine, so the trips format stays v3):
   - Actions get `on:` (the same moments checks use: `day-start`, `hex-enter`, `day-end`, or an action's id) and run by themselves then, with their conditions; an action with `on:` isn't a button. What happens as each day ends, whether the party camped or not, is an action `on: day-end`.
   - Steps can trigger the system's own things: `do: <action>` (another action, with its conditions), `roll: <check>` (a check now), `set: { <value>: … }` (a value of the day), besides `time`, `speed` and `effects`.
   - **`eat` goes away:** using supplies is an effect (`party.resources.food: -1`). **No implicit bounds:** every declared value (supplies, stats; later factions…) has the `min` / `max` its system declares, or none (it may go negative). A change past a bound stops there and later steps (and that day's `day-end` checks) see `below: [ids]` / `above: [ids]`; `short` is read as "something hit its minimum" for older packs.
   - Older packs keep working: `perDay`, a way of travelling's `consumes` and `eat: day` are read as an equivalent day-end action (once a day; camp's `eat: day` runs it), with `min: 0` on their supplies. The bundled packs migrate: the Generic rules, the Grey Marches, Kal-Arath (private repo).
   - Travel's step select grows with what the system declares (Do: <each action>, Roll: <each check>) beside a box with the full syntax; supplies get **Min** / **Max** instead of **Per day**, ways of travelling lose **Uses per day**.
   - Later (not for the alpha): checks' `at:` may become actions' `on:` (a check would be an action that rolls).
   - ✅ Follow-up (user, 2026-10-08): **camp and rest are ordinary actions** (an id, removable; systems that don't name them still get the usual ones, `false` leaves one out); what was special is data: `day.night` (the action a waiting party takes at nightfall, camp by default), `doing` (the action under way; older `camping`), the journal's lines and buttons are any action's. The Travel editor shows every action alike and writes each **step in the pack's syntax** (one box with suggestions instead of a select). The YAML editor suggests the travel keys and values (`on`, `at`, `do`, `roll`, `night`, `time`, effect paths). Rule tables are as wide as their columns.
2. [x] ✅ **Our syntax in every field where it fits** (user, 2026-10-07; see the "full syntax" convention; done 2026-10-08): terrains' and water's `passable` take a condition (`{ when, unless }` on the hex entered and the moment, calendar included; **Open when** / **Closed when** in Travel); roll modes get `modeUnless` (an **Unless** box in the Oracle); table entries and generator fields get `unless` (they only had `when`), and generator fields' **Only if** / **Unless** / **Context** are in the form (before: "edit them in the file"); ways of travelling show **Not when**; what a value blocks suggests the system's own actions instead of a fixed camp / rest. The Grey Marches use each (peaks open only in summer and not in snow, lakes frozen in deep winter, no clear-sky advantage in forests, the Vale patrol never at night, an untouched ruin), the Generic rules a lake crossed on the ice in winter; tests play them.
   - Left as yes/no on purpose: `pause`, `once`, `oncePerDay` (limits and stops, not when something applies).
   - [x] ✅ Follow-up (user, 2026-10-08): **"La hace" / who takes an action**: actions' `on:` and checks' `at:` take one moment or several (`[hex-enter, rest]`), and their conditions and tables see which one as `moment`; the Travel forms write them in the pack's syntax with suggestions (and say them back in words) instead of fixed selects. The Grey Marches roll encounters entering a hex and resting somewhere dangerous. Still to consider: checks as actions that roll (item 1's note).
   - [x] ✅ Generator fields' `value` texts aren't translatable (`locales/` only reach templates, entries and cards): _Delving a ruin_'s trap and untouched lines show in English in Spanish. (Done 2026-10-09: overlays' `fields:` by field name, warned when the field isn't a text; the Oracle's generator form translates them; the Grey Marches' ruin in Spanish, with a test.)
3. [x] ✅ **Show off the conditions in the Grey Marches** (user, 2026-10-07; done 2026-10-08: deep snow set by the weather blocks `mode.horse`, and a value blocking the way the party travels now stops it; a cart only by road; a forced march while fresh; the rite of the full Ember Moon at a shrine; hirelings who refuse to march after a hungry day, talked round by morale; a restless watch with low morale; besides item 2's peaks, lakes, patrol and ruin. Each with its manual row and a test that plays it): bold uses of conditions and triggered actions, each with its `**Shows:**` line, its manual row and a test that plays it. Ideas: a ritual at the shrine only at a full Ember Moon; horses unusable while it snows (a value that blocks `mode.horse`); a night watch step whose outcome depends on morale; hirelings that refuse to march when not fed (a value blocking travel); a forced march action (more hours, fatigue +1, only if fatigue is low); a cart only by road (`through: { edges: road }`).
4. [x] ✅ **Contextual help instead of "i" tooltips** (agreed 2026-10-07; done 2026-10-08: `contextHelp` in ui-kit, InfoTip draws a dotted underline on its label and shows its text in the help column (`HelpPanel` of manual-ui, above the manual), Oracle / Travel / Hexmapper open their column when asked and say whether it's showing; focusing a field shows its help while the column is open; a checkbox's text asks for help instead of ticking it; the Travel syntax helps rewritten with examples, one per line. Still open: a link from each explanation to its manual section, and more fields' examples in the Oracle and Hexmapper): the explanatory tooltips (InfoTip) are many and long, cluttering every app; they move to a **Help** panel (the column of the ? in Oracle and Travel, the Help view in the Hexmapper), with room for formatting, examples and a link to the manual section; the app's manual stays below it.
   - The "i" icons go away. Hovering a label only shows that there is help (a dotted underline, `cursor: help`); the panel doesn't change on hover.
   - Clicking a label with help opens the panel on its explanation, and it stays until another is chosen. With the panel open, focusing a field (click or Tab) shows and pins its help too. The panel says which control it explains.
   - Icon-only buttons (undo, save…) keep their short tooltip with their name.
   - Cheap path: InfoTip registers its text in a shared ui-kit store instead of drawing an icon. Texts stay generic (the mechanism; examples from the Grey Marches or the Generic rules at most).
   - **The help grows with the syntax** (user, 2026-10-08): moving the tooltips there is the moment to expand them with contextual examples, not just move them: the travel rules' syntax especially (actions with `on:`, steps `time` / `speed` / `effects` / `set` / `do` / `roll`, `below` / `above` / `doing`, `min` / `max`, `day.night`), each with a short example that works, written for the field focused (a step box shows the step syntax; a condition box what it can read there).
5. [ ] **The manual, complete:** review everything that can be done and isn't documented, kind by kind and key by key (Kinds of definition as the index); expand the Travel manual (playing, checks, Continue, actions); more explanation in the Oracle's "Connecting tables to maps and trips".
6. [x] ✅ **Continuous integration** (done 2026-10-08: `.github/workflows/ci.yml`, from a clean clone on Node 22 and 26: `make verify`, `make site`, and a check that the private Kal-Arath licence line isn't in `dist/`; tried locally on a clean clone, not yet on GitHub: it runs on the next push): a workflow that runs `make verify` and `make site` on every push from a clean clone (no `packs-private/`), so a personal-use pack can never slip into the public build.
7. [ ] **Release workflow** (written 2026-10-08, **for the user to review**: [docs/RELEASING.md](RELEASING.md), `.github/workflows/release.yml` (tag `vX.Y.Z` → verify, site, GitHub release with the zip and the changelog's notes, GitHub Pages), [CHANGELOG.md](../CHANGELOG.md) with everything under Unreleased, and a landing page at the site's root; Pages needs Settings → Pages → Source: GitHub Actions once) (Claude defines it and leaves it written for the user to review): versioning (semver, repo-wide), changelog, what triggers a tag; CI builds the public `dist/` and publishes it (e.g. GitHub Pages) and attaches it to the release. **Requirement (user, 2026-10-07): no alpha without builds that leave personal-use packs out** (done: `vite.packs.ts`, `make site` → `dist/`, `make serve` → `dist-local/`). We work on `main` until then; no release until the user is happy with the alpha, which becomes `0.1`.

**To agree with the user (2026-10-09)** before tagging the alpha: the release cycle in [docs/RELEASING.md](RELEASING.md) (one repo-wide semver, a tag `vX.Y.Z` triggers the release, `0.x` as pre-releases), whether to work only on `main` or with branches (release branches, PRs that CI checks), turning on GitHub Pages (Settings → Pages → Source: GitHub Actions), and the first push (CI only runs on GitHub then). Nothing is tagged or pushed yet; what's left of item 5 (the manual's last gaps) can go before or right after `0.1.0`.

Nice to have before the alpha, otherwise right after:

- [ ] **Suggestions panel and cheat sheets** (asked by the user): besides the inline suggestions, a side panel in the Oracle and Travel editors (forms and YAML) listing what tables can read and set right there (names, values and descriptions, grouped: map, trip, party, calendar…) plus cheat sheets of the syntax (dice, conditions, templates, effects, steps, each kind's shape); click to insert at the cursor. Shared component (pack-ui), searchable, bilingual; the same panel as the contextual help (item 4).
- [x] ✅ Hexmapper: the planned route drawn beside the roads it follows (see Hexmapper → Pending).
- [ ] Kal-Arath reviewed against its rulebook again (see Packs → Kal-Arath).

## After the alpha

In order (agreed 2026-10-07; each step is groundwork for the next ones):

1. **System engine.** Today a "system" is a pack with `travel-rules`. Make it explicit: a system declares everything it brings (travel rules, oracles and tables, calendar, weather models, values, factions, example maps; later character sheets, bestiary, initiative). Maps and games choose a system (folding in today's packs per map); apps show what the chosen system provides; systems export and import as a whole. Every engine reads its part from the system. **Where systems are edited (agreed 2026-10-07):** roll modes, travel rules and bindings (today in the Oracle's New definition and the Travel app), calendars and weather models (today YAML only) move to the system tools then; until then the Oracle gets no visual editors for calendars or weather. Then review the bundled packs so their calendars, weather and rules use the standard shape. **Settings + systems (2026-10-07):** a game combines a **setting** (content: tables, travel, map) with a **system** (a game's rules: the characters' stats and rolls), e.g. a post-apocalyptic setting played with Cairn; the system brings the stats, the setting maps the ones its tables read onto them as data ("this setting's Survival is the system's DEX"), with defaults when a system has none. Until then, settings declare few, generic stats and their tables lean on them as little as possible.
2. **World clock dates and world events with ids** (user, 2026-10-07): choose the date (year, month, day, time, in the system's calendar) when starting the clock and **set the date** later (forward like advancing, backward only after asking); schedule events **on a date**, not only in N days; scheduled events get an `id` (for conditions, faction plans, tables) besides their title and description.
3. **Factions and world turns** (`faction-engine`), built on 1 and 2:
   - Factions with goal, resources, strength and **territory as hexes** (decided: not whole regions), drawn like a region in the faction's colour, growing hex by hex from its border; it may start as "all the hexes of region X"; a region can be split between factions.
   - Turns: an "Advance world turn" button **and** automatic turns with the world clock (on by default, every week, configurable). Each faction's turn rolls a table of its system (expand, recruit, raid, event, rumour) whose `effects` change its values and territory; everything goes to the World timeline (`FACTION_ACTION_RESOLVED`, `TERRITORY_CHANGED`, `WORLD_EVENT_CREATED`, `RUMOUR_CREATED`…).
   - Values are the system's: the Grey Marches declare `reputation` (−3..+3, how the faction regards the party), read by reaction and encounter tables as `factions.<id>.reputation`; another system might declare `heat` or nothing.
   - No lore: factions point to notes with `noteRef`.
   - Progress clocks filled by faction turns and tables (today by hand).
4. **A frontier-space showcase pack** (Cowboy Bebop / Firefly style): ships, contracts, bounties, a space map with the sci-fi terrain set and icons, a ship that only travels space (`through`), its own calendar and values. Like the Grey Marches, it exercises every feature, with tests that play it.
5. **More settings beyond fantasy** (user, 2026-10-07; all agreed, order to decide). A **setting** is an open pack of our own content for playing in a genre with any game (not a game's rules: that's a system, see "More open systems"), modelled on the Grey Marches but smaller (only the Grey Marches and the frontier-space pack must exercise every feature):
   - **Oracles and tables** in the genre's voice: encounters, places and points of interest, people (names, roles, motives), rumours, events, loot, complications.
   - **A travel system** where travel fits: its terrains and speeds, its ways of travelling (car, ship, airship, rail… with `through`), its supplies (fuel, water, ammo…) with their bounds, values of the day, actions and triggered actions (e.g. radiation rising on `hex-enter`), checks bound to its tables.
   - **Discovery tables** for its terrain set, a **calendar** and **weather** if it has its own.
   - **An example map**, ready to play, with the Hexmapper's terrain set and icons for the genre; new terrains and icons where they're missing (ships and reefs, rails, ruins…).
   - Names and descriptions in English and Spanish (`locales/`), a manual page in `docs/manual/*/packs/`, and a test that plays it.
   - Generic pieces any game of the genre can use may go to a Core-like pack per genre.

   Candidates: **modern / urban**; **post-apocalyptic** (wasteland, radiation; or zombies); **cyberpunk**; **weird west**; **horror** (1920s, Lovecraftian: investigation, sanity as a value); **pirates / age of sail** (islands, open sea, wind); **classic sword and sorcery** (deserts, ruins, city-states); **steampunk / Victorian** (airships, railways, industrial cities); **mythic** (Norse: fjords, long winters; Greek: islands, gods, oracles); **wuxia / eastern fantasy** (mountains, monasteries, sects as factions); **frontier exploration / colonial** (unknown land, scarce supplies, discovery).

6. **Our own system** (user, 2026-10-07; after the settings): a core of our own, like Free League's Year Zero Engine, from which specialised subsystems come per genre (as Free League does), designed from the start for what the apps do together: the map, oracles, travel, the world clock, factions and what comes later. The Grey Marches stay the showcase where every system and feature works together at full power.
   - What to learn from or build on: see [Reference systems](#reference-systems). None of them covers everything the apps join up (a living map with discovery, oracles bound to travel, a world clock, faction turns): that's the gap our own system fills.
7. **Weather, the rest:** hex flowers (2d6 moves on a small map of weathers) besides Markov tables, and the world clock's own daily weather outside trips.
8. **Per-package builds** before publishing the libraries to npm (today packages are consumed as TS source), and Web Components for non-Svelte hosts.

**Characters and the campaign record**

- **Characters engine** (`character-engine`): sheets kept in one place whose values every system can read (e.g. the acting PC's stat in a roll); the PC tokens travelling together as the party.
- **Statblocks and a bestiary** (like Obsidian's Fantasy Statblocks): sheets for tokens and for creatures to draw from (place a wolf token, roll a bandit), defined in packs per system and usable by every engine (encounters, initiative, combat).
- **Initiative tracker** and **combat ledger** (like Obsidian's Initiative Tracker and Combat Ledger): a light turn order and a record of a fight, fed by statblocks and written to the journal. No battle map: we stay out of VTTs.
- **Journal system**: an optional journal of the campaign (sessions, trips, hand rolls, notes), exportable as Markdown with links to hexes; the map's note markers live in the same system.
- **Our own notes app** (a small SilverBullet / Obsidian): Markdown pages with `[[links]]` and backlinks, link suggestions, `{{…}}` like the Oracle, queries over pages, templates, search, a canvas, graphs; pages also link to hexes, POIs, factions, characters and statblocks. One more `note-refs` provider: engines still store only references.

**Solo play and content**

- **Solo scene engine**: chaos factor, lists of threads and characters, scenes that go as expected, altered or interrupted; our own free mechanics, working with the oracles.
- **Name generators** by setting (people, settlements, taverns, places…), not only fantasy: bundled per pack and user-editable, on the Oracle Engine (syllable tables, maybe Markov chains trained on name lists as data).
- **Import tables from text**: paste a numbered list (from a PDF) or a CSV and get a table.
- **Settlement and dungeon generators on the map**: "generate a village here" fills the hex (POIs, name, NPCs) with pack generators; dungeons once sub-maps exist.
- **Dice roller app**: quick, visual rolls of any expression `dice` knows, with history; reuses the Oracle's roller and result cards.
- **More open systems as packs** (user, 2026-10-07; not a priority): games whose licence allows redistribution, each in `packs/` with its licence and attribution recorded; **check every licence before adding** (candidates from memory, unverified unless said):
  - **Ironsworn / Starforged** via [Datasworn](https://github.com/rsek/datasworn) (rules as JSON): licence per item; CC BY 4.0 (the core books) can go to `packs/`; CC BY-NC 4.0 items must be decided first; the code and schemas are MIT. With progress clocks.
  - **Cairn**, **Knave**, **Mausritter** (believed CC BY / CC BY-SA), the **Old-School Essentials SRD** (OGL), and free solo oracles such as the **One Page Solo Engine**.
  - The **Year Zero Engine SRD** and the **Worlds Without Number SRD** (see [Reference systems](#reference-systems)).
  - More free solo GM / oracle systems from itch.io and elsewhere.
- **Mechanics from the reference systems** (user, 2026-10-07: to grow our own systems; [Reference systems](#reference-systems)). We don't copy their texts; the mechanisms are generic and go into the engines as data a system declares, then into the Grey Marches (full) and Core (simple):
  - **Journey roles** (Forbidden Lands): each character takes a job for the day or the watch (lead the way, keep watch, forage, hunt, make camp) and rolls it with their own stats; needs characters (the PCs travelling as the party).
  - **A daily condition roll** (Ryuutama): how each traveller feels today, which helps or hinders the day's checks; difficulty as **terrain + weather** from tables.
  - **Journey events** (The One Ring 2e): a journey's length and the party's roles decide how many events happen and of what kind; arriving tired or well.
  - **An event die** (Errant): one roll per turn (travel, exploration, downtime) that says whether something happens: an encounter, a sign, a resource running low, the clock advancing.
  - **Faction turns and tags** (Worlds / Stars Without Number): factions with assets acting each turn; tags that give a place or a faction its hooks (for the factions step and the settings).
  - **Progress tracks** (Ironsworn): journeys and vows as tracks filled by moves, like our progress clocks; oracles answering yes/no with odds.
  - **Strongholds** (Forbidden Lands): a base the party builds and keeps (sites on the map with values, upkeep and events over time).

**Maps in depth**

- **Sub-maps**: a POI opens its own map (a city, a dungeon, an underground hexmap), recursively.
- **Dungeon / site mapper**: hex and square grids in detail (rooms, corridors, doors, stairs, markers, notes), drawn with the keyboard (arrows extend a corridor, R room, D door…), linked to the other engines.
- **Image maps** (like Obsidian's Leaflet): an image of your own as a map with pins, regions, values and links.
- Procedural map generation, curved text, SVG export, a Tauri desktop build.

**Print and reference**

- **Card studio** (print & play): `cards.yaml` + an SVG template → PDF, PNG, SVG and Tabletop Simulator decks.
- **Rules reference builder**: from a `rules.yaml`, a GM screen, quick reference, printable cards, HTML and PDF.

**To decide**

- **Revisit the backup format** (`@open-tabletop/storage`): today it copies each app's browser data as it is (raw storage entries, maps in the Hexmapper's internal format), which ties backups to every internal format. Consider a stable, documented one (OTD bundles for maps, pack folders for packs).
- **Supplies and loot over time** (maybe): when something was spent or found, and who carries what, without becoming an inventory manager.
- **One origin for live development** (user, 2026-10-07: `make dev-all` is useless while each app has its own port and can't see the others' data): a single server on one port routing `/hexmapper/`, `/oracle/`… to the dev servers, with hot reload.

## Reference systems

Games to learn from for our own system, the settings and the bundled packs, or to bring in as packs where their licence allows (found 2026-10-07; **read each licence's conditions before using anything**):

| System                                                                      | What to learn from it                                                                                                        | Licence: can we bring it in?                                                                                                                                                                                        |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forbidden Lands** (Free League, Year Zero Engine)                         | Hexcrawl survival: journeys where each character has a role (lead the way, keep watch, forage, hunt, make camp), strongholds | Its book: inspiration only. The **YZE SRD** under Free League's Free Tabletop License (royalty-free, commercial use allowed, with notice and conditions; includes travel, vehicles, chases): a base we may build on |
| **Ryuutama**                                                                | A daily travel loop: condition, travel, direction and camping checks against terrain + weather                               | Inspiration only                                                                                                                                                                                                    |
| **The One Ring 2e** (Free League)                                           | Journeys and the events on the way                                                                                           | Inspiration only                                                                                                                                                                                                    |
| **Worlds Without Number** / **Stars Without Number** (Sine Nomine)          | Faction turns, sandbox and hexcrawl tools, the tag system                                                                    | The **WWN SRD is CC0**: yes                                                                                                                                                                                         |
| **Errant**                                                                  | Procedures for everything: travel, exploration and downtime turns with an event die                                          | Its own "Waylaid by Errant" licence (for compatible works): check before using                                                                                                                                      |
| **Ironsworn / Starforged**                                                  | Oracles, progress tracks and clocks, solo play                                                                               | Datasworn: CC BY 4.0 core items yes, with attribution (see "More open systems")                                                                                                                                     |
| **Cairn**, **Knave**, **Mausritter**, **OSE SRD**, **One Page Solo Engine** | Light rules, OSR procedures, solo oracles                                                                                    | Believed open (CC BY / CC BY-SA / OGL): check                                                                                                                                                                       |
| **Solo Hexcrawling 2.0**, **Wandering Hexcrawl** (itch.io)                  | Solo hexcrawl procedures (watches, pace, survival, oracle suites)                                                            | Inspiration only unless their licence says otherwise                                                                                                                                                                |

Sources: [Free League's free licences](https://freeleaguepublishing.com/community-content/free-tabletop-licenses/), [Forbidden Lands review](https://www.stuartellisgorman.com/blog/forbidden-lands-by-free-league-publishing-a-gms-review), [The Ryuutama engine](https://necropraxis.com/2018/04/27/the-ryuutama-engine/), [WWN free and its CC0 SRD](https://www.tenkarstavern.com/2022/02/free-rpg-worlds-without-number-free.html), [Errant](https://killjestergames.itch.io/errant), [Datasworn](https://github.com/rsek/datasworn), [Solo Hexcrawling 2.0](https://basunat.itch.io/solo-hexcrawling-20), [Wandering Hexcrawl](https://ancientshell.itch.io/wanderinghexcrawl).

## Decisions in force

- **Name precedence** in what tables see: party stats by name < today's values < map and trip facts < `party` < the binding's context. A stat named like a fact (`terrain`, `weather`…) can't hide it; `party.stats.<name>` always reaches the stat. Built-in names win over a token's or icon's own values (`name`, `kind`, `id`).
- **One time for the world and a trip** (2026-10-07): trips start at the world clock's date; travelling moves the clock; moving the clock with a trip on is waiting in the trip.
- **Updates of bundled packs** (2026-10-07): a user copy records each bundled file's fingerprint (`basedOn`); when a newer version changes the bundled pack, Oracle and Travel mark it **update** and list each changed file to take or keep. Edited copies have **Revert to bundled**.
- **Basic Markdown in pack descriptions** (2026-10-07): paragraphs, bold, italics, code, lists, quotes, web links; HTML and images stay text.
- **Backups** copy each app's browser data as it is (see "Revisit the backup format").
- The Grey Marches' example map opens ready to play (with rules, its system, discovery on, world clock running).
- Formats: map format v13, Travel trips v3, each change with its migration.

## Done

Ecosystem, in the order it was built:

- [x] Monorepo, `hex`, `note-refs`, `random`, `dice`, `conditions`, `time`, the OTD `schema` (maps saved as `.otd.json`).
- [x] Design docs (`otd.md`, `oracle-engine.md`, `travel-engine.md`); one base locale per pack with fallback translations.
- [x] `oracle-engine`, `travel-engine` (A\* routes), `session` and the Hexmapper's Play mode; `oracle-ui` and `travel-ui` extracted.
- [x] The Oracle and Travel apps, each with editors for its rulesets (forms and YAML with live diagnostics; text files stay the source of truth), and the Manual app.
- [x] Values on map elements (tokens, icons, regions, POIs), packs per map, realistic discovery, region styles, POI icons, highlight/filter by tag, responsive layouts.
- [x] Backups of everything (app switcher → Save / Restore a backup; `@open-tabletop/storage`), installable offline apps (PWA), the command line (`make cli`).
- [x] Suggestions while typing (`SuggestInput` + `contextSuggestions` / `setSuggestions`): condition, value, context and effect boxes, the YAML editor, Travel lists, map values. Every new input uses them.
- [x] World clock (`world-engine`, calendars as data, the Hexmapper's World panel), weather with inertia (`weather-engine`, Markov), progress clocks (by hand).
- [x] Roll modes as system data (`kind: roll-modes`), replacing the built-in advantage.
- [x] Clearer play messages: results say what they changed, actions what they did (also when nothing), supplies and stat changes journaled with their reason.
- [x] Every visible name from the pack, translations of every kind in `locales/` keyed `<kind>/<id>`; context values with friendly names (`reads:` in bindings); one shared vocabulary in ui-kit.
- [x] System values and effects: one effects vocabulary (`effects: { party.stats.morale: -1, party.resources.food: 2, …: '=3' }`); fatigue and being lost are no longer built in (stats and values of the day a system declares, with what they `block`); actions (camp and rest too) are steps with `when` / `unless` and `oncePerDay`; checks at `day-end` and with effects of their own; Travel edits values, actions as cards and changes.
- [x] Pausing on a check or a result (`pause: true`) until **Continue**.
- [x] Ways of travelling with `when` / `unless` and `through` (where they can go, a condition on each hex entered).
- [x] One time for the world and a trip: the travel engine's `wait`, the World panel waiting in the trip.
- [x] Manual: every kind (technical/07-kinds), conditions reference (08-conditions), name collisions, values of the day; README at the root.
- [x] Builds without personal-use packs (`vite.packs.ts`, `make site` / `make serve` / `make rebuild`).

## Hexmapper

### Pending

- [x] ✅ **Planned route drawn beside the roads it follows** (asked 2026-10-07; done 2026-10-08: trail and route are drawn as parallel lines a fifth of a hex to each side of the centres, easing back at the ends, `offsetPolyline`): the route (and trail) already curve through the same hexes as the map's lines (Play → Straight lines to turn it off); draw them offset beside the line so they never sit on top of it, as the first stretch out of Ashford already does on the example map.
- [ ] Multi-page PDF tiling for large maps, and an option to print empty hexes white.
- [ ] Translate icon names (currently English, as they come from game-icons).
- [ ] UI for the optional hex fields travel may use (elevation, danger); custom fields cover them for now.

### Done

- [x] Skeleton, grid, terrain (editable, grouped palette with glyphs), undo/redo, save/load, autosave, local map library and deep links.
- [x] Hex metadata, provider-based linked notes, physical size and printing, PNG and real-scale PDF export.
- [x] Roads, trails, rivers, walls and borders (nodes, shores, offsets, branches, closed loops); styled icons; map texts and captions; layers.
- [x] Tokens, regions (with styles), values on tokens, icons, regions and POIs, packs per map.
- [x] Play mode: party token and trail, rules trips (system, route, actions, stats, checks resolved by the Oracle, journal, discovery), trail and route as curves or straight lines.
- [x] Oracle panel: roll any definition with the hex (or party) as context, "Roll here", results added as POIs, history and deck state per map.
- [x] World panel: the world clock, events, progress clocks, timeline; waiting in the trip.
- [x] Side panel: each tool shows only what it edits; Settings, Layers, Help, Maps, Export and the Oracle are views; top bar like the other apps.

### Rejected

- Square grids: better FOSS editors already exist (Tiled, etc.).
- Fog of war, second-screen player view and other VTT features.
- Swapping the side panels (tried and reverted 2026-10-07): editors keep tools on the left and details on the right.

## Oracle

### Pending

- [ ] Roll statistics (distribution of a table) and coverage view.

### Done

- Sidebar with search, packs (bundled / edited / personal-use badges, error count), folding, favorites (shared with the Hexmapper).
- Roll tab: inputs, detected context values with friendly names, roll modes, decks, result card with dice breakdown and nested results, entries preview; history and "New session".
- Form editors for every kind with translations; entry conditions, `set`, effects, pause, limits; YAML editor (CodeMirror 6) with diagnostics and suggestions.
- Definitions: new (also travel rules, bindings, calendars, weather from templates), duplicate, copy to, delete. Packs: new, import / export .zip, files and translations, updates of bundled packs, revert. Undo/redo of every change.

## Travel

- [x] Systems list, play an abstract trip, several saved trips, journal export as Markdown, new system, edit a copy, manual pages.
- [x] Forms for travel rules (day, ways of travelling with their conditions, terrains, edges, supplies, weather, values of the day, actions as cards with steps) and, in one Checks tab, checks with their bindings, changes and pause, and the party's stats; they write the YAML keeping comments.

## Packs

### Kal-Arath (checked against the rulebook on 2026-10-07)

Done: the travel procedure (weather, getting lost, points of interest, encounters, camping) matches the rulebook; foraging is a trip action (halves the day's march, once a day, adds to the food; impossible in storms); the Explorer ability is a party stat (`explorer`); finding the way again after a day lost is rolled with disadvantage (`yesterday.lost`); the autumn storm only halves travel; the extra ration of a heatwave or the first snows is taken; dungeons have the passages table and the boss rooms (summarised); fatigue is gone (Kal-Arath declares only what it uses).

- [ ] **Camping without rations** (user, 2026-10-08): today the party can camp with none left (as the rulebook: the ration is spent to recover); check the manual says what happens, and model "no ration, no recovery" with the characters engine (see below). The Grey Marches decided (2026-10-08): camping is always possible (a party that couldn't camp would be stuck at nightfall); hungry, camp brings the Hunger check and no fatigue relief, and a rest doesn't ease fatigue.
- [ ] **Review the whole pack against the PDF rulebook again** (asked by the user 2026-10-07): check every rule (travel rules, values of the day, actions and their steps, checks, tables and their modifiers, roll modes, calendar if any) against the book (`~/Descargas/Rol y Wargames/Rol/Solitario/Kal-Arath/`), and use the new mechanisms where they fit (triggered actions, `pause`, `blocks`). Best after alpha item 1, which changes how it eats.

Not as the rulebook has it yet, waiting for generic support (not Kal-Arath code):

- [ ] **Camping recovers wounds and conditions** after spending a ration: needs character values (characters engine).
- [ ] **An Explorer chooses advantage or disadvantage on encounter rolls**: a choice the player makes when the trip rolls; today only by hand.
- [ ] **Herbs** are rolled by hand after a rare find (`herbCount` times); _Tarnak berries_ (no ration needed that day) aren't applied (possible with triggered actions and `set`).
- [ ] **Revisited areas** of a dungeon bring an enemy on 1 in 1d6: today by rolling _Passage_ again; dungeons live on the map once there are sub-maps.

# Changelog

What changes in each release of OpenTabletop, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/) for the whole repository (see [docs/RELEASING.md](docs/RELEASING.md)). Work not yet released goes under **Unreleased**.

## [Unreleased]

### Apps

- Oracle: **Odds** beside a table's entries shows how likely each one is with the context typed and the roll mode chosen (and, with dice, how likely each total is).
- Hexmapper: **icon names in Spanish** too (and the search finds an icon by its name in either language).
- Hexmapper, Export: **Split into pages** prints a big map on several sheets of a paper you pick (A4, Letter…), at real scale, overlapping 10 mm to glue, each page saying where it goes (B3); **Empty hexes in white** saves ink in the PDF and PNG.
- Hexmapper: the Text tool lists **Texts on the map** (each with its font and size); clicking one selects it and centres the map on it.
- Hexmapper, World: **the world clock starts on a date you choose** (day, month, year and time in the system's calendar), and **Set the date** moves it later (like moving time on) or earlier (asking first, and never during a trip; the timeline says the clock went back). **Events on a date** of the calendar, besides in N days, each with an **id** (`market-day`: what conditions read as `world.events`) and a description. The example map's events have ids (`market-day`, `clan-march`, `spring-floods`), and the Grey Marches' Market day reads `world.events: market-day`.

## [0.4.0] - 2026-10-09

### Packs

- **Progress by moves**: an action's step `advance: 2` (or `'{{party.stats.rank}}'`) moves the party that many hexes along its route at once, no time passing, entering each as by marching (its checks, its visit, the trip's totals): journeys made of moves instead of hours of marching, in the Hexmapper and on the Travel app's ways (see _Journeys by moves_ in Connecting). The Grey Marches get **Ride with a carter**: on a road by day, two hexes in two hours, once a day.
- `trip.edges` outside a moment of its own (an action's conditions, a hand roll) is the stretch ahead on the route; it used to be empty.
- **The Grey Marches use it all**: the party's **Endurance** (camp and rest while fatigue is under it) and **Stealth** (encounters only where danger is over it); hirelings eat a ration each; **Fish** next to water (a d6 under Survival) and **Market day** in Ashford (on Marketday, or the world clock's market day); checks for **A long day** (marching past 8 hours), **Homesick** (the 10th, 20th and 30th day of a trip), **Going in circles** (a hex entered a third time) and **Out of the Greywood**; the shrine only the first time each trip; foraging in the dawn watch (until 8) is rolled with advantage; the gates roll _Talking your way in_ (a roll mode of their own) when Charisma beats the guards; someone on the road wants what fits their role, and a ruin's guardian is as dangerous as the ruin; the Wyrm roams the Greywood once the world clock's _The Greywood Wyrm wakes_ is full. Ashford is tagged `market` on the example map.
- **A table's own roll, as `roll`**: a table with dice gives its entries the total, for their conditions (`party.stats.survival: { gte: '{{roll}}' }`, a roll-under on the table's own die), texts (`'You rolled {{roll}}'`), `set` and effects. The table rolls first, then picks among the entries whose conditions hold, so a table now rolls (and shows the dice) even when no entry applies.
- **What the trip has done so far**, for conditions and tables: `trip.hexes` and `trip.km` (at the map's scale), `trip.hours` marched, `trip.checks`, `trip.taken.<action>` (each action of the system, 0 until it's taken) and `trip.spent.<supply>` / `trip.gained.<supply>` (what actions, checks and tables took or added; hand edits don't count). The Grey Marches get **Tales of the road**: once a trip, after 50 km, from nightfall, morale +1.
- **Marching is an action the system declares** (`actions.march`, the Travel buttons): its `when` / `unless` are checked as the party marches, and it stops as soon as they no longer hold. Without it, or without its `when`, the party marches by day for the day's marching hours, as before; the engine no longer decides it (nor that nobody marches before dawn). The Grey Marches' **Night march** now lights the torches (`torchlit`, a value of the day their march admits) until midnight, from their own nightfall (`hour: { gte: $nightfall }`).
- **The march's name is the Travel button's**: a system that names its march (`actions.march.name`, editable in Systems) sees it on the trip panel's first button (Travel and the Hexmapper), with its description as help. The Grey Marches call it **March** (**Marchar**).
- **The system sets the scale**: `travel.hexKm` in its travel rules, how many km a hex measures. Trips without a map (Travel, Systems' **Try it**) are played at it (Travel's **km per hex** shows it, locked); a map with the system takes it unless the map sets its own (Hexmapper: Map settings → Map, now empty for "the system's"; maps saved with the old default of 10 km follow their system). The Generic rules and the Grey Marches play at 10 km, Kal-Arath at 30 km. Systems' **Rules** has a **km per hex** field.
- **Full names for every fact**, by where it comes from: `hex.*` (`hex.id`, `hex.terrain`, `hex.danger`…), `time.*` (`time.season`, `time.daylight`, `time.moons.pale`…), `system.*` (`system.nightfall`…), `trip.*` (`trip.day`, `trip.mode`, `trip.moment`…), `world.*` (`world.clocks.<name>`, `world.events`) and `today.*`, besides `party.*`, `yesterday.*`, `from.*` and `around.*`. The short names stay as shortcuts and read the same; full names can't be hidden by a stat or a value with the same name. `hex` alone is now the hex's facts (its id is `hex.id`, also in `from.id`). Suggestions offer both; What tables see lists both; the Grey Marches' travel rules use the full names.
- **Variables and rolls in conditions and effects, `{{…}}`**, the syntax texts already used: another value instead of a fixed one in every condition (`danger: { gt: '{{party.stats.stealth}}' }`, `hour: { gte: '{{nightfall}}' }`, `faction: '{{rival}}'`) and as the amount of an effect (`party.resources.food: '-{{party.stats.mouths}}'`, `'={{party.stats.endurance}}'`, `'-{{loss}}'` from the entry's own values); the journal says what such an effect did. Dice too (`party.stats.str: { gte: '{{1d20}}' }`, `'-{{1d3}}'`), rolled **once per moment**: in a trip the same dice give the same roll all through a day, hex and moment or action (so what's available and the route don't change when looked at again, and each trip rolls its own); in a table, all through one roll (a roll-under entry and its `unless` see the same d20). The **Dice, variables and context** page and Syntax call them variables.
- **More for conditions and tables to read**: the hour (`hour: 14.5`), the calendar's `watch` (its help promised it, nobody passed it), the day of the month (`monthDay`), the system's `dawn`, `nightfall` and `hoursPerDay` as numbers, the trip's `tripDay`, hours `marched` today, actions done today (`doneToday`), `routeLeft` and `arrived`, `visits` to the hex, the hex left (`from.terrain`…), the hexes around (`around.terrain: lake`…), and the world clock's progress clocks and today's events (`clocks.the-wyrm-wakes`, `events: market-day`). Rolls by hand during a trip see everything its checks see.
- **Day and night**: conditions and tables read `daylight` (between the system's dawn and nightfall); an action's step `overtime: 240` lets today's march go on past nightfall (never past midnight); `hideWhenUnavailable: true` hides an action's button while it can't be taken. The Grey Marches rest, forage and force the march only by day (resting can no longer skip the night), and get a **Night march**: four more hours in the dark, +1 fatigue, with getting lost and night encounters in each hex off the road; their rite, talking to the hirelings and the night march only show when they can be taken. The Generic rules rest only by day; Kal-Arath forages only by day.
- **Pack format**: `pack.yaml` says which pack format a pack is written for (`format: 2`), so a pack written for an older one keeps its meaning when the syntax changes. Packs without it are format 1, where a check with neither a table nor effects stopped the trip: they still play that way, and the Systems app's **Checks** tab offers **Update** to write it in today's format. A pack of a newer format than the app reads gets a warning.
- **Systems as their own definition**: `kind: system` names what a game system uses (its travel rules, bindings, calendar, weather models) and the packs whose tables it brings; a pack may declare several, and use parts of the packs it depends on. Older packs with travel rules keep working as before. The Grey Marches declare theirs (`system.yaml`), with its name in Spanish.
- **Example maps of a system**: `maps:` in `kind: system` lists map files (`.otd.json`) kept in the system's pack. The Grey Marches' example map now lives in their pack (`maps/grey-marches.otd.json`).

### Apps

- **The last system follows you between apps**: Travel and Systems open on the system last chosen in either of them or in the Oracle (whose pack the Oracle opens on); remembered in this browser and kept in backups. The Hexmapper keeps each map's own system.
- Travel and Hexmapper Play: **So far** above the journal sums up the trip (hexes, km, hours marched), and opens to the checks, the actions taken and the supplies spent and gained. Saved trips and maps move to a new format (trips v4, maps v16): older trips get their hexes and actions from the journal, the rest counts from then on.
- **Only `pause: true` stops a trip**: a check that nothing rolls (no table bound) used to stop the trip and wait for **Continue**; now it's written in the journal (with its effects, if any) and the trip goes on, unless it says **Pause after it** (`pause: true`). The Grey Marches' landmarks say `pause: true`; packs of an older format keep stopping as before (see **Pack format**). In Systems, a check's table choice says **no table** instead of _nothing: wait for me_.
- **A new app, Systems**, where systems are made and edited: the systems list, **New system**, and each system's **Rules**, **Checks** and **YAML** tabs, with **Edit a copy** and the updates of bundled systems, moved from Travel. **Travel now only plays** trips without a map; each system there links to **Edit in Systems**, and each system in Systems to **Play it in Travel**. Its manual pages (Getting started, Making a system) are in the Manual under Systems.
- Systems: each system opens on its **Overview**, a form for its own definition: its name and description (also translated), the travel rules, bindings and calendar it plays with (**Create** makes new travel rules or bindings), its weather models and the packs it brings. A system of an older pack gets **Declare it**. The **YAML** tab shows every file of its parts.
- Systems: a system's **Calendar**, **Weather** and **Roll modes** tabs edit them with forms (they were YAML only): months with their seasons, weekdays, moons and holidays; kinds of weather and, per season, a grid of weights with how often each kind comes up over many days; roll modes with their rolls, the total kept and what they cancel. **New calendar**, **New weather model** and **New roll modes** start from templates and the system names them. The Oracle's New definition template for travel rules now eats with a day-end action instead of the older `perDay`.
- Systems: a system's **Try it** tab plays a trip without a map with it as it is now (the way hex by hex and the trip, as in Travel), so a change in another tab counts from the next step. Its test trips are kept apart from the Travel app's.
- Hexmapper: **Maps → Example maps** lists the maps every loaded system brings (also your own packs'), each with the system it's played with. Systems: a system's **Overview** lists its example maps, opens one in the Hexmapper, and adds (**Add a map file…**) or removes them.
- Oracle, Systems and Travel: a name cut short in the side list shows whole when pointed at.
- Hexmapper: the **tools bar** on the left folds away too, with a tab on the map's left edge (the tools' keys still work).
- Hexmapper: the icon picker of tokens and points of interest has category chips, as in Icons (**Suggested** first: the usual ones for a token or a place). In Icons, the line under the palette says what it means: **Clicking a hex places: …** (it said _New icons: …_).
- Hexmapper: Play is less cluttered: the party's icon, color and halo are only edited in Tokens (the party token stays selected there), and the system is shown, not chosen: it's the map's, chosen in Map settings → Map → System (choosing it in Play changed the map's and started a new trip).
- Hexmapper: less text in the way: the World panel's long note about a trip going on is a short note under the buttons (its explanation is in the help of **Travel on** / **Wait here**); Play's introduction and the modes' tooltips are the help of **Play mode**; Regions' and Tokens' how-to lines go below, as in Icons and Roads. The Oracle's icon in the tools bar is drawn like the other tools (white, gold when open).
- Help column: a field's explanation no longer has its own **✕** (the column's own fold closes it).
- Hexmapper: the help opens in **its own column** at the far right, beside the side panel (it used to replace it), as in the other apps: a field and its explanation are seen together, and its examples can be inserted into it.
- Help column, every app: moving to a field no longer changes what the column shows (only clicking a dotted label, or <kbd>F1</kbd> in a field, does), so an example can be clicked into any field.
- Oracle: the **?** in the header looks like the other apps' (no button frame).
- Systems: **a system goes elsewhere whole**: its **Overview** ends with **Take it elsewhere**, whose **Export as .zip** saves its pack with every pack it needs (the Grey Marches' file holds them and Core); **Import a system (.zip)…** under the systems list reads it back and opens it. The Oracle's **Import .zip** reads these files too, and now leaves packs already here unchanged alone and asks before replacing a different version (one ↶ undoes the import).
- Systems: the **Overview** lists calendars and weather models by their names (with the id beside them), and the Calendar, Weather and Roll modes tabs show the code in their introductions as code; the Systems app's help texts use made-up names in their examples instead of the Grey Marches' (`seedtime`, `moons.silver`, `highland-skies`…).
- Systems: the tabs wrap when the help column leaves little room, instead of pushing the view (and the YAML editor) wider than its column; the YAML tab names a file's pack when two have the same name.
- Help texts no longer state what one system decides as if it were general (a forest at half speed, water impassable on foot, a day's march per hex): worked examples are hypotheses, and example names are made up rather than the Grey Marches'.
- Travel: a new system also writes its `system.yaml`; a pack's file may hold several travel rules, and the forms and the problems list point at the right one.
- Hexmapper: **a map chooses its system** in **Map settings → Map → System** (the same choice as in Play): its new trips, the World panel's calendar and the Oracle panel use what the system brings. **Packs** are now the ones a map adds to its system's (shown ticked). A trip going on keeps the system it started with, and Play says so when the map's has changed. Maps are migrated (format v14): the system their trip played becomes the map's. In Play and Travel the choice is called **System** (it was **Rules**).

### Fixes

- Conditions: `all`, `any` or `not` beside other pairs (`{ tags: market, any: [ … ] }`) left the other pairs unchecked; now every pair counts.
- Trips: a hex half-walked on a slow day (snow, rain) and faster to walk the next is entered at once; the trip's clock used to go back in time and enter it before dawn.

## [0.3.0] - 2026-10-08

### Apps

- The Hexmapper's top bar looks like the other apps': its icons in the same muted tone, and Preferences (the gear) next to Help.
- The site's front page no longer lists the bundled packs: the apps show them.

## [0.2.0] - 2026-10-08

### Apps

- **Preferences** in every app, under a gear in the header: the language and your notes app (until now only in the Hexmapper's settings), shared by every app; in the Oracle, a **seed** for repeatable rolls (the same seed, the same results; **New session** starts it over) and **which packs the list shows**. The Hexmapper's **Settings** are now **Map settings**, with a map icon.
- The **help column**: a field's help is part of the column (its **✕** closes the column) and lists the manual's sections about it under **In the manual**; **Syntax** opens the page with everything a pack can write; a click on an example in code puts it into the last text box or YAML editor used, at the cursor; the search looks in the technical and packs pages too and shows the words found in bold (also in the Manual app).
- The site's **front page**: an OpenTabletop logo (also the site's icon and in the app list), the packs it comes with, and a footer with the source code on GitHub, where to report a problem, the licence and the version with what's new.

### Fixes

- The manual's links to a section of the same page (like _templates_ in **Syntax**) went to the first page instead.

## [0.1.1] - 2026-10-08

### Apps

- The apps open in your browser's language when we have it (Spanish for `es-*`), until you choose one; the site's front page has flags to choose it, shared with every app.

### Fixes

- The "new version" question comes back after a reload: closing it without answering no longer counts as **Later**, and **Later** only silences that version, so a newer build asks again.

## [0.1.0] - 2026-10-08

The first alpha: the four apps, the open packs and the manual, published as a static site.

### Apps

- **Hexmapper**: hex maps (terrain, roads, rivers, walls and borders, regions, icons, texts, tokens, notes), printing and PNG / real-scale PDF export, a map library in the browser; **Play** on the map with any travel system (routes, checks resolved by the Oracle, discovery of blank hexes, a journal); the **Oracle** panel and the **World clock** (calendars, events, holidays and moons, progress clocks).
- **Oracle**: browse, roll and edit tables, oracles, generators and decks with forms or a YAML editor with live problems; packs (new, import and export, translations, updates of bundled packs).
- **Travel**: trips without a map; travel systems edited with forms (the day, ways of travelling, terrains, supplies, values of the day, actions as steps, checks and their tables) or YAML.
- **Manual**: the user manual of every app, English and Spanish, with search; each app opens it in its help column, which shows the explanation of the field you're on instead, formatted, with working examples.
- **Command line**: `opentabletop validate`, `list` and `roll`.
- Side columns fold away with a tab on their edge in every app, as in the Hexmapper.
- The manual's technical section has a **Syntax** page: every piece of syntax a pack can write (values, ids, dice, ranges, templates, conditions, `set`, `effects`, moments, steps, `blocks`, limits), with examples and links.

### Packs

- **Core**: generic oracles and inspiration for any game, and the Generic travel rules.
- **The Grey Marches**: a frontier setting with an example map that uses every feature. Camp and rest only with food left and fatigue under 10; hunger is rolled when a day ends without food.

### Fixes

- Moving the world clock on with a trip and a route planned travels along the route (marching by day, nights, waiting on arrival) instead of waiting in place; a day passing asks first, and a message at the bottom says why the trip stopped early, or that it arrived.
- A night when the party can't take its night action (camp) passes without it, said in the journal, instead of leaving the trip stuck at nightfall.
- The trip panel has **Wait until dawn**, and travelling in a storm that can't be camped out passes to the next day: a party lost or stormbound with no food is never stuck.
- The trail and planned route follow the drawn shape of the roads, trails and rivers they walk.
- The party's trail and planned route are drawn beside the roads and rivers they follow, not on top of them.
- Waiting with the world clock never moves the party, even with a route planned and discovery on.

### Formats

- Maps as OTD bundles (`.otd.json`, format v13), Travel trips v3, packs as YAML folders; every older format is migrated when read.
- Translations can translate a generator field's fixed text (`fields:` in `locales/`).

# Campaigns and the Campaign app — design

Backlog item 11, phase (c). It began as a Factions app ([its first design](#how-we-got-here)); asked how one faction could be on several maps, it grew into **campaigns**, agreed in principle with the author on 2026-10-19 (§7). **Agreed with the author 2026-10-19** (§7, §9).

## 1. Where we are

- **Every map is its own world.** A map keeps its world clock (`map.world`: date, scheduled events, progress clocks, timeline), its world weather (`map.worldWeather`), its Oracle state (`map.oracle`: decks drawn, once-only entries, values set, hand-roll history) and its factions (`map.factions`: each faction's sheet, the hexes each holds, the last turn).
- So two maps are two dates, and "the Iron Clans" on two maps are two unrelated factions. A faction's starting `hexes` in a pack are coordinates without a map: every map that has a `15,9` gets Fort Keld there.
- **Travel's trips** (no map) have no world clock, no factions and an Oracle state of their own.
- **The Oracle app** rolls with a state of its own (`opentabletop.oracle`).
- **Characters** live in the roster ([characters-app.md](characters-app.md)), global to the browser, used by trips and tokens by id.

## 2. The model: where each thing lives

The **place** (a map) is split from **what happens in the world** (a campaign).

| Lives in                   | What                                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The roster** (global)    | Characters, as today. A character may go from one campaign to another.                                                                                                                                                                                               |
| **The campaign**           | Its system (and the packs it adds); the world clock (date, events, holidays and moons, progress clocks, timeline) and the world's weather; the factions (one sheet each, the last turn); the Oracle state (decks, once-only entries, values set, hand-roll history). |
| **The map**                | Geography, tokens, the trip played on it, and **each faction's land on this map**.                                                                                                                                                                                   |
| **A trip** (Map or Travel) | The party, its supplies, its journal, as today; its time **is** the campaign's clock.                                                                                                                                                                                |

- **A campaign** has an id, a name, a `noteRef`, its system and the state above. In OTD it is the `Campaign` entity that already exists. It doesn't list its maps and trips: each names its campaign, and the list is read from them (one place says it, so the two can't disagree; decided in phase 2).
- **Every map and every trip belongs to exactly one campaign** (`meta.campaign`). A new map or trip creates its own campaign without asking, so whoever plays one map sees no difference from today. A sub-map (backlog) belongs to its parent's campaign.
- **Where**: IndexedDB, beside the map library (timelines and histories grow), added to backups explicitly; changes announced on a `BroadcastChannel` (`opentabletop.campaigns`) so open apps stay in step (§6).
- **Lore stays in the notes app** (principle 9): a campaign keeps only mechanical state, and a `noteRef` to its page.

## 3. Factions in a campaign

- **One sheet per faction**, in the campaign. **Land per map**: each map keeps the hexes each faction holds on it.
- **Starting land from the pack**: `regions` by name, on any map of the campaign that has them; `hexes` only **with the map they belong to** (the system's example map, by its path in the pack), so they never land on an unrelated map.
- **A turn's land effects** (`faction.territory: 1` / `-1`) happen **on the map being played**: the map open in Map when the turn comes, or the one chosen in the Campaign app. Values, conditions and clocks change once, in the campaign.
- `factions.<id>.territory` reads the land on the map being played; `factions.<id>.land` (new) the total over the campaign's maps.

## 4. The Campaign app

`apps/campaign`, in the switcher, with its manual and help column like the rest. The **hub** of a game: what is going on.

- **Campaigns** (left column, folds): this browser's campaigns, with a search box; **New campaign** (a name and a system).
- **The campaign** (middle), in tabs:
  - **World**: the date, moving time on, scheduled events, holidays and moons, progress clocks, the world's weather (what Map's World panel has today).
  - **Factions**: each faction's card (colour, name, what the system says it is, its full `CharacterCard`, notes), its land as a read-only **minimap** per map (a selector when there are several), **Paint in Map ↗**; **World turn**, **Turns by themselves**.
  - **Timeline**: what happened, newest first (world turns, events, clocks).
  - **Maps and trips**: the campaign's maps (open in Map) and Travel's trips (open in Travel); **Add a map** (a map of another campaign joins this one, §5); who plays in it (roster characters in its trips and tokens, opened in Characters).
- **Edit the system in Systems →** beside its name.
- Deep links: `#/campaign/<id>`, `#/campaign/<id>/<tab>`, `#/campaign/<id>/factions/<faction>`.

## 5. The other apps

- **Map**: the World view keeps quick controls (the date, moving time on, **World turn**, a line per faction with its brush) and **Open in Campaign ↗**; it reads and writes the campaign of the open map. The map's settings say which campaign it is in, with **Move to another campaign…**.
- **Travel**: a new trip belongs to a campaign (its own, or one chosen); its time is the campaign's clock, so it now has a world clock, factions and the campaign's Oracle state. Opening a trip shows its campaign, with a link.
- **Oracle**: a campaign selector (**No campaign** = today's own state); rolling in a campaign shares its decks and history.
- **Characters**, **Systems**, **Manual**: unchanged; Characters' **Where it plays** names the campaign too.
- **Joining a map to another campaign**: if the map brings a clock or factions of its own, it asks what stays (the campaign's, by default); the map keeps its land for the factions the campaign has.

## 6. Two apps, one campaign

- **The map model goes to a package**, `@open-tabletop/map` (types, defaults, migrations, serializing, hexes, tokens), so every app reads and writes maps with the same migrations. The campaign's model, migrations and the plain functions that act on it (a world turn on a campaign and a map, bringing factions, joining a map) go to `session` or a `campaign` package, tested headless; the apps wrap them.
- **Changes are announced** (maps and campaigns): an app holding something open that changed elsewhere reads it again (outside the undo history, like any play change), so a turn played in Campaign shows at once on the open map. If both changed it at once, the last write wins; a window whose map was edited elsewhere (not only played) says so when it reads it again, since its undo history starts over.
- **One trip per campaign at a time** (§9.1).

## 7. Agreed with the author (2026-10-19)

1. **Campaigns** (after a first draft that kept factions in each map): the place (map) apart from the world (campaign), one sheet per faction, land per map, one clock for all the maps of a campaign.
2. Territory: a read-only minimap in the app, painted in Map.
3. World turns are played from the app too, with their timeline.
4. Map's World view is compacted, with a link to the app.
5. **Characters and Travel stay apps of their own**: the roster is global (a character goes from one campaign to another; someone may want only a character manager), Travel is the play surface without a map as Map is with one; their trips and characters are listed in the campaign, with links. The Oracle rolls within a campaign or alone.
6. **The campaign journal is not part of this design** (§8).

## 8. The journal, apart

The author wants a journal to keep by itself too, and a notes app of our own for lore, characters, POIs and the world (backlog: _Journal system_, _Our own notes app_). That app is designed on its own, later, with its pieces as a `*-ui` package the other apps embed (as the Oracle's roll panel is). A **Log** tab in the campaign is welcome (author, 2026-10-19: "no digo que una pestaña log para la campaña esté mal, pero tendría que venir de manera natural cuando hagamos esa app, y permitamos reutilizar sus elementos en los distintos módulos de las apps"): it comes with that app, built from its pieces, not before. Until then the campaign's **Timeline** and each trip's journal are what we have.

## 9. Decided with the author (2026-10-19)

1. **One trip per campaign at a time**, as a character is in one trip at a time: starting or resuming a trip in a campaign that has another going on asks to pause it.
2. **Rewinding** the campaign's clock asks first and says which maps and trips it touches. As today, nothing is undone (the timeline and journals keep what happened, with a line saying the clock went back; repeating events don't come back) and it is refused while the campaign has a trip going on. It is there to fix mistakes (a week moved on by error, a wrong start date), since the clock is outside Ctrl+Z (author: "no termino de verle la utilidad, aunque sí hay que dejar esa libertad a sabiendas de lo que puede pasar").
3. **A map exported to a file** carries its campaign (the `.otd.json` stays complete on its own); importing it creates the campaign, or joins an existing one with the same id after asking.
4. **The name: Campaign** (`Campaña`), chosen by Claude at the author's request: the OTD entity is already `Campaign`, it is the word players use, and **World** already names the world clock and Map's World view (an app "World" with a tab "World" would confuse).

## 10. Phases

1. **The map package**: `@open-tabletop/map` out of Map (no format change; `old-maps` still pass); maps announced on change and read again by Map.
2. **Campaigns, headless**: the model, storage (IndexedDB, backups, `BroadcastChannel`), migrations (every saved map and trip becomes a campaign of its own: map and trip formats bumped, `old-maps` and `old-trips` keep playing on), factions' land per map, pack `hexes` with their map, world turns on a campaign; tests. In two steps:
   - **2a ✅ (2026-10-19)**: `@open-tabletop/campaign` (the model and its format, `openMap` making a campaign from a map saved before campaigns, `factionsOn` / `splitFactions`, `bringFactions` to a map of a campaign, `worldTurnOn`); map format v24 (`meta.campaign`, `territories`; the world clock, its weather, the factions' sheets and the Oracle go to the campaign, the map's own id as the campaign's); `storage`'s campaigns beside the map library (`opentabletop.campaigns`), backups v2; Map keeps its map's campaign (`editor.campaign`), saves both, takes a campaign changed elsewhere, and its files carry the campaign (`campaign` in the bundle; a copy of a map gets a campaign of its own). Its UI is unchanged.
   - **2b ✅ (2026-10-19)**: pack `hexes` with their map: `territory: { map: <path in the pack>, hexes: [...] }`, the hexes given only on that example map (the library map opened from it, by its id; a copy opened beside it is another map and gets only the regions); `hexes` without `map` refused with a message, so no format bump (nothing is read with another meaning). One map per faction for now; several would be `map` as a list.
   - **Moved to phase 3** (they mean nothing until then): Travel's trips becoming campaigns (with their time and Oracle, when a trip's time is its campaign's); the campaign's system (the map keeps `meta.system` until maps can join another campaign); a file whose campaign this browser already has asking whether to join it (§9.3; until then it replaces the campaign kept, as a map's file replaced the map's world).
3. **Map and Travel on campaigns**: moving a map to another campaign; Travel's trips with the campaign's clock, factions and Oracle; the Oracle's campaign selector; manual pages en/es. In steps (2026-10-19):
   - **3a ✅ (2026-10-19)**: the world clock played headless, so every app plays it the same way: `@open-tabletop/campaign`'s `world.ts` (`worldAct` with what an action brings along: the world's weather day by day, the factions' turns as they come due, a declared clock's `onFull`; `startWorld`, `bringClocks`, `worldTurnNow`, `worldEffects`, `followTrip`, `worldFactsOf`), on a campaign and the map being played, or none (no land changes then); Map's World view is a thin host of it (`WorldHost`: the map's system, its Oracle, the trip going on, the timeline's words). Found on the way: a trip step put its Oracle state back after a full clock had rolled on it; fixed.
   - **3b ✅ (2026-10-19)**: Travel's trips in campaigns (trips v9, `campaign`: every saved trip one of its own, with the trip's id): travel-ui's `TripStore` with `campaignApp` keeps the open trip's campaign (`CampaignKeeper`: read from storage, written as it changes, read again when changed elsewhere); a trip starts at the campaign's clock, steps with its facts and Oracle and changes its world (`tripStepped`: effects, then the world following the trip's time, events and holidays in the journal); **Campaign** in the trip room (its own, or one kept in this browser). One trip per campaign (§9.1): the campaign's `playing` (campaigns v2), `otherTrip` / `playTrip` / `leaveTrip`; a trip that plays where another played last asks to pause it and waits until the campaign's clock (Travel and Map alike). The world's texts shared in ui-kit's vocabulary (`world`, `campaign`) and travel-ui's `worldWords`.
   - **3c ✅ (2026-10-19)**: the Oracle app's **Campaign** at the top of the history (`History`'s `top` snippet): **No campaign** (its own state, as today) or a campaign kept in this browser, whose Oracle state and history the rolls use (a `RollerStore` over ui-kit's `CampaignKeeper`, moved there from travel-ui; read again when changed elsewhere); the seed stays the browser's own.
   - **3d ✅ (2026-10-19)**: Map's **Map settings → Campaign** (the campaign it's in, chosen like Travel's, its name, its other maps and trips), the system and packs as the campaign's (campaigns v3 `system`, `packs`; maps v25 without them, a map saved before handing them over on opening; a trip keeps the system it started with, a new one makes its system the campaign's, asking when others are in it); moving a map or a Travel trip to another campaign asks what stays when both have a world (`@open-tabletop/campaign`'s `hasWorld`, `joinCampaign`, `landIn`; the campaign left is deleted if empty, `campaignPlaces` in travel-ui saying who's in one); a file whose campaign this browser has asks to join it, replace it or keep it apart (§9.3). Decided with the author (2026-10-19): the system goes to the campaign for maps and trips alike, and migrations of these formats aren't a concern while nobody else uses them (the ones that came for free were written anyway, so `old-maps` and `old-trips` still pass).
4. **The Campaign app**: campaigns, tabs, minimap, links; switcher, Makefile, `make serve`; manual en/es. In steps (2026-10-19):
   - **4a ✅ (2026-10-19)**: `@open-tabletop/campaign-ui`, the world clock's UI out of Map (`WorldClock`, `WorldTimeline`, `DateInput`, driven by a host's `WorldControls`; the world's words `worldWords` / `clockFilledText` moved there from travel-ui); Map's World panel a thin host of it. `apps/campaign`: the campaigns kept (search, **New campaign** with a name and a system), the campaign's name, system (edited in Systems) and notes, the trip going on, **World** (its clock without a map: no land changes, no party; a trip going on elsewhere catches up when it next steps, the clock doesn't go back, and the world's weather is the trip's), **Timeline**, **Maps and trips** (links to open them; adding one is done in its app), **Delete** only when nothing is in it; `#/campaign/<id>[/<tab>]`; switcher, Makefile, manual en/es.
   - **4b ✅ (2026-10-19)**: **Factions**: each faction's card and sheet, its land as a read-only minimap per map (a selector when there are several; by default the map of the trip going on, else the first, the choice remembered per viewer), **Paint in Map ↗**, **World turn** and **Turns by themselves** on the map chosen (land changes happen on it, written back to the library; moving time on in **World** plays the due turns there too). Found on the way: a map that joins a campaign whose factions are in it already got no land (Map only brings factions to a campaign without them); **Give them their starting land here** does it. Bringing them in without maps brings their sheets only.
   - **4c ✅ (2026-10-19)**: Map's World view compacted (the date, moving time on, **World turn**, a line per faction with its brush) with **Open in Campaign ↗**, and in tabs like Play's (user, 2026-10-19: e.g. **Now** · **Events** · **Clocks** · **Timeline** · **Factions**, the tab remembered); Travel's trip room and the Oracle's campaign link to it; Characters' **Where it plays** names the campaign. Done as: campaign-ui's `WorldClock` shows one `part` at a time (`now`, `events`, `clocks`) for a host with tabs; the World panel's tabs remembered as `opentabletop.world.tab`; ui-kit's `campaignUrl` and the shared word **Open in Campaign ↗**; travel-ui's `placeCampaign` (the campaign a map or trip is in) for Characters.
5. **The bundled packs**: the Grey Marches' factions with their example map's hexes, a second map in the example campaign if it shows something; Core's page; tests that play a world turn from the app layer and see it on the open map and in a Travel trip.
   - **✅ (2026-10-19)**: a second example map, **The Hollow Hills** (`maps/hollow-hills.otd.json`, 3 km a hex), in one campaign with the Marches' map (both files name `grey-marches`; an example whose campaign is kept here with other maps or trips in it joins it, its world kept); the Iron Clans on both maps (the Hills by region, their watch-cairn by `map:`); Core's page on campaigns with the Generic rules; tests: both maps sharing the clock and factions with land per map and a world turn played on one, and a Travel trip in the campaign taking the factions' turns as they come due.

## 11. The campaign at the centre (agreed with the author, 2026-10-29)

**The ask** (author, while designing parties in the roster, [characters-app.md](characters-app.md) §8): today the switcher opens Map first, nothing says whether you are in a campaign or offers to make one, and a map's campaign shows only in **Map settings** and the World view. Author: "Campaña debería de ser la landing… la experiencia central debería de ser crear una campaña si no la has creado ya"; the Campaign app "ha quedado un poco cutre". And how does someone with a campaign going on play a quick game in Characters, start another campaign, and come back?

**What stays** (the model of §2 and [characters-app.md](characters-app.md) §6): the roster is global, a character is one person with one state, in one place at a time; several campaigns go on at once, each with its own clock, factions and Oracle, sharing only characters; taking a character to another campaign asks, and the trip it leaves keeps an unlinked copy; editing in Characters edits the character, wherever it plays. The author: "como funciona ahora no está mal del todo"; what's missing is a UI that makes it plain.

**Agreed:**

1. **Campaign is the landing.** The switcher and the site's root open Campaign. With no campaign yet, making one (a name and a system) is the first thing offered; with some, the current one opens. The app is reviewed as a whole, looked at in the built app first and redesigned with the author before code. Its tabs fell behind (author: "en campaña echo en falta pestañas, se ha quedado muy atrás"): **Maps and trips** splits into **Maps** and **Trips**, and **Characters** joins them (the campaign's cast, point 4: who plays in its trips and tokens, and those in it without a trip).
2. **The campaign you're in, visible in every app**: **Playing: <campaign> ▾** in the switcher's bar, a user preference (`opentabletop.campaign.current`). It **follows what you open**: opening a map or trip of another campaign makes that one current, so the campaign shown is never other than the one in front of you. **No campaign** stays, for whoever only wants a character manager or a roll.
3. **Each app uses it**: Characters shows the current campaign's cast by default (**All** and **No campaign** a click away); Map's library is grouped by campaign and a map's header names its campaign with **Open in Campaign ↗**; Travel's trips are grouped by campaign; the Oracle rolls in it; Campaign opens it.
4. **A quick game is a campaign without a trip.** A party or character can be in a campaign without playing in a trip or token: its place is the campaign itself, so a campaign has a cast (its **Characters** tab, point 1), the filter of point 3 finds them, and a new trip of the campaign offers its party. One place at a time holds: taking them to another campaign asks, and **Duplicate** (a character or a whole party) is how the same people play in both.
5. **Map nodes** (sub-maps, rooms: [BACKLOG](BACKLOG.md) point 7) are presented within this frame: campaign → maps → sub-maps, a tree in the library and a breadcrumb in the header, designed with the author before any code.

**The Campaign app redesigned (agreed with the author 2026-10-29, after looking at it in the built app).** What was wrong: the site's root was a launcher of every app, Map first; Campaign's welcome was a wall of text even with campaigns; a new campaign left two steps undone (starting the clock, bringing the system's factions); **Maps and trips** was a dead end (go to Map's Map settings…); nothing said what is going on now; **Delete** was the loudest thing in the header; the World tab said its help twice; the page used half the screen. Agreed, on Claude's proposal:

- **The root opens Campaign** (`/` → `campaign/`), the apps' launcher stays in the switcher; Campaign opens **the current campaign** (the last opened, `opentabletop.campaign.current`), or **Start your campaign** when there is none, with quiet links for whoever only wants to roll or keep characters.
- **Making one asks for a name, a system and the day it starts**, with **Start the world clock** and **Bring its factions** ticked (they can be unticked).
- **Tabs**: **Overview** (the default: today's date and weather with moving time on, what comes next, progress clocks, trips going on with **Continue ↗**, the latest of the timeline, who plays; each block links to its tab) · **World** · **Maps** · **Trips** · **Characters** · **Factions** · **Timeline**.
- **Maps** and **Trips** as cards with **Open ↗**, and **New map / New trip in this campaign** (Map or Travel opens with a new one already in it) and **Add an existing one** (from the map library, or a trip in no campaign).
- **Characters**: who plays in its trips and tokens (those in it without a trip come with point 4).
- **Header**: name, system, notes; **Delete** in a **⋯** menu. The sidebar says each campaign's system and date.

## How we got here

The first draft (2026-10-19, same day) kept factions in each map and a Factions app over the library's maps. Asked how one faction could be on several maps, the author chose consistency and an app that reads intuitively: campaigns, and the Campaign app instead of a Factions app.

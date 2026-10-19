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

| Lives in                         | What                                                                                                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The roster** (global)          | Characters, as today. A character may go from one campaign to another.                                                                                                                                                                                               |
| **The campaign**                 | Its system (and the packs it adds); the world clock (date, events, holidays and moons, progress clocks, timeline) and the world's weather; the factions (one sheet each, the last turn); the Oracle state (decks, once-only entries, values set, hand-roll history). |
| **The map**                      | Geography, tokens, the trip played on it, and **each faction's land on this map**.                                                                                                                                                                                   |
| **A trip** (Hexmapper or Travel) | The party, its supplies, its journal, as today; its time **is** the campaign's clock.                                                                                                                                                                                |

- **A campaign** has an id, a name, a `noteRef`, its system and the state above. In OTD it is the `Campaign` entity that already exists. It doesn't list its maps and trips: each names its campaign, and the list is read from them (one place says it, so the two can't disagree; decided in phase 2).
- **Every map and every trip belongs to exactly one campaign** (`meta.campaign`). A new map or trip creates its own campaign without asking, so whoever plays one map sees no difference from today. A sub-map (backlog) belongs to its parent's campaign.
- **Where**: IndexedDB, beside the map library (timelines and histories grow), added to backups explicitly; changes announced on a `BroadcastChannel` (`opentabletop.campaigns`) so open apps stay in step (§6).
- **Lore stays in the notes app** (principle 9): a campaign keeps only mechanical state, and a `noteRef` to its page.

## 3. Factions in a campaign

- **One sheet per faction**, in the campaign. **Land per map**: each map keeps the hexes each faction holds on it.
- **Starting land from the pack**: `regions` by name, on any map of the campaign that has them; `hexes` only **with the map they belong to** (the system's example map, by its path in the pack), so they never land on an unrelated map.
- **A turn's land effects** (`faction.territory: 1` / `-1`) happen **on the map being played**: the map open in the Hexmapper when the turn comes, or the one chosen in the Campaign app. Values, conditions and clocks change once, in the campaign.
- `factions.<id>.territory` reads the land on the map being played; `factions.<id>.land` (new) the total over the campaign's maps.

## 4. The Campaign app

`apps/campaign`, in the switcher, with its manual and help column like the rest. The **hub** of a game: what is going on.

- **Campaigns** (left column, folds): this browser's campaigns, with a search box; **New campaign** (a name and a system).
- **The campaign** (middle), in tabs:
  - **World**: the date, moving time on, scheduled events, holidays and moons, progress clocks, the world's weather (what the Hexmapper's World panel has today).
  - **Factions**: each faction's card (colour, name, what the system says it is, its full `CharacterCard`, notes), its land as a read-only **minimap** per map (a selector when there are several), **Paint in the Hexmapper ↗**; **World turn**, **Turns by themselves**.
  - **Timeline**: what happened, newest first (world turns, events, clocks).
  - **Maps and trips**: the campaign's maps (open in the Hexmapper) and Travel's trips (open in Travel); **Add a map** (a map of another campaign joins this one, §5); who plays in it (roster characters in its trips and tokens, opened in Characters).
- **Edit the system in Systems →** beside its name.
- Deep links: `#/campaign/<id>`, `#/campaign/<id>/<tab>`, `#/campaign/<id>/factions/<faction>`.

## 5. The other apps

- **Hexmapper**: the World view keeps quick controls (the date, moving time on, **World turn**, a line per faction with its brush) and **Open in Campaign ↗**; it reads and writes the campaign of the open map. The map's settings say which campaign it is in, with **Move to another campaign…**.
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
2. Territory: a read-only minimap in the app, painted in the Hexmapper.
3. World turns are played from the app too, with their timeline.
4. The Hexmapper's World view is compacted, with a link to the app.
5. **Characters and Travel stay apps of their own**: the roster is global (a character goes from one campaign to another; someone may want only a character manager), Travel is the play surface without a map as the Hexmapper is with one; their trips and characters are listed in the campaign, with links. The Oracle rolls within a campaign or alone.
6. **The campaign journal is not part of this design** (§8).

## 8. The journal, apart

The author wants a journal to keep by itself too, and a notes app of our own for lore, characters, POIs and the world (backlog: _Journal system_, _Our own notes app_). That app is designed on its own, later, with its pieces as a `*-ui` package the other apps embed (as the Oracle's roll panel is). A **Log** tab in the campaign is welcome (author, 2026-10-19: "no digo que una pestaña log para la campaña esté mal, pero tendría que venir de manera natural cuando hagamos esa app, y permitamos reutilizar sus elementos en los distintos módulos de las apps"): it comes with that app, built from its pieces, not before. Until then the campaign's **Timeline** and each trip's journal are what we have.

## 9. Decided with the author (2026-10-19)

1. **One trip per campaign at a time**, as a character is in one trip at a time: starting or resuming a trip in a campaign that has another going on asks to pause it.
2. **Rewinding** the campaign's clock asks first and says which maps and trips it touches. As today, nothing is undone (the timeline and journals keep what happened, with a line saying the clock went back; repeating events don't come back) and it is refused while the campaign has a trip going on. It is there to fix mistakes (a week moved on by error, a wrong start date), since the clock is outside Ctrl+Z (author: "no termino de verle la utilidad, aunque sí hay que dejar esa libertad a sabiendas de lo que puede pasar").
3. **A map exported to a file** carries its campaign (the `.otd.json` stays complete on its own); importing it creates the campaign, or joins an existing one with the same id after asking.
4. **The name: Campaign** (`Campaña`), chosen by Claude at the author's request: the OTD entity is already `Campaign`, it is the word players use, and **World** already names the world clock and the Hexmapper's World view (an app "World" with a tab "World" would confuse).

## 10. Phases

1. **The map package**: `@open-tabletop/map` out of the Hexmapper (no format change; `old-maps` still pass); maps announced on change and read again by the Hexmapper.
2. **Campaigns, headless**: the model, storage (IndexedDB, backups, `BroadcastChannel`), migrations (every saved map and trip becomes a campaign of its own: map and trip formats bumped, `old-maps` and `old-trips` keep playing on), factions' land per map, pack `hexes` with their map, world turns on a campaign; tests. In two steps:
   - **2a ✅ (2026-10-19)**: `@open-tabletop/campaign` (the model and its format, `openMap` making a campaign from a map saved before campaigns, `factionsOn` / `splitFactions`, `bringFactions` to a map of a campaign, `worldTurnOn`); map format v24 (`meta.campaign`, `territories`; the world clock, its weather, the factions' sheets and the Oracle go to the campaign, the map's own id as the campaign's); `storage`'s campaigns beside the map library (`opentabletop.campaigns`), backups v2; the Hexmapper keeps its map's campaign (`editor.campaign`), saves both, takes a campaign changed elsewhere, and its files carry the campaign (`campaign` in the bundle; a copy of a map gets a campaign of its own). Its UI is unchanged.
   - **2b ✅ (2026-10-19)**: pack `hexes` with their map: `territory: { map: <path in the pack>, hexes: [...] }`, the hexes given only on that example map (the library map opened from it, by its id; a copy opened beside it is another map and gets only the regions); `hexes` without `map` refused with a message, so no format bump (nothing is read with another meaning). One map per faction for now; several would be `map` as a list.
   - **Moved to phase 3** (they mean nothing until then): Travel's trips becoming campaigns (with their time and Oracle, when a trip's time is its campaign's); the campaign's system (the map keeps `meta.system` until maps can join another campaign); a file whose campaign this browser already has asking whether to join it (§9.3; until then it replaces the campaign kept, as a map's file replaced the map's world).
3. **The Hexmapper and Travel on campaigns**: moving a map to another campaign; Travel's trips with the campaign's clock, factions and Oracle; the Oracle's campaign selector; manual pages en/es. In steps (2026-10-19):
   - **3a ✅ (2026-10-19)**: the world clock played headless, so every app plays it the same way: `@open-tabletop/campaign`'s `world.ts` (`worldAct` with what an action brings along: the world's weather day by day, the factions' turns as they come due, a declared clock's `onFull`; `startWorld`, `bringClocks`, `worldTurnNow`, `worldEffects`, `followTrip`, `worldFactsOf`), on a campaign and the map being played, or none (no land changes then); the Hexmapper's World view is a thin host of it (`WorldHost`: the map's system, its Oracle, the trip going on, the timeline's words). Found on the way: a trip step put its Oracle state back after a full clock had rolled on it; fixed.
   - **3b ✅ (2026-10-19)**: Travel's trips in campaigns (trips v9, `campaign`: every saved trip one of its own, with the trip's id): travel-ui's `TripStore` with `campaignApp` keeps the open trip's campaign (`CampaignKeeper`: read from storage, written as it changes, read again when changed elsewhere); a trip starts at the campaign's clock, steps with its facts and Oracle and changes its world (`tripStepped`: effects, then the world following the trip's time, events and holidays in the journal); **Campaign** in the trip room (its own, or one kept in this browser). One trip per campaign (§9.1): the campaign's `playing` (campaigns v2), `otherTrip` / `playTrip` / `leaveTrip`; a trip that plays where another played last asks to pause it and waits until the campaign's clock (Travel and the Hexmapper alike). The world's texts shared in ui-kit's vocabulary (`world`, `campaign`) and travel-ui's `worldWords`.
   - **3c**: the Oracle app's campaign selector (**No campaign**: its own state, as today).
   - **3d**: the Hexmapper: Map settings name the map's campaign, **Move to another campaign…** (asking what stays, §5), the campaign's system, a file whose campaign this browser has asking whether to join it (§9.3).
   - The World view compacted with **Open in Campaign** goes with phase 4, when there is an app to open.
4. **The Campaign app**: campaigns, tabs, minimap, links; switcher, Makefile, `make serve`; manual en/es.
5. **The bundled packs**: the Grey Marches' factions with their example map's hexes, a second map in the example campaign if it shows something; Core's page; tests that play a world turn from the app layer and see it on the open map and in a Travel trip.

## How we got here

The first draft (2026-10-19, same day) kept factions in each map and a Factions app over the library's maps. Asked how one faction could be on several maps, the author chose consistency and an app that reads intuitively: campaigns, and the Campaign app instead of a Factions app.

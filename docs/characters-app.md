# The Characters app and the roster — design

Backlog item 11, phase (b). **Agreed with the author 2026-10-19** (§6).

## 1. Where we are

- A character is a `CharacterState` (character-engine): `id`, `sheet` (`pack/id`), `name`, `values`, `conditions`, `tags`, `cards`, `relations`.
- Each one lives **inside what it plays in**, as a copy: a trip's `session.members` (Travel's saved trips, the Hexmapper's `play.rules.session`), a map's company before a trip starts (`play.rules.members`), and a token's statblock (`token.character`, sheet only, id and name the token's). In OTD bundles they are `characters` of the party.
- So the same companion in two maps is two unrelated characters; a character can't be seen or edited without opening the trip; a new trip in Travel starts with nobody, unless the old trip's members are carried over to the same system.

Agreed on 2026-10-19: characters live in a **shared roster** in the browser, maps and trips use them **by id**, and **sheets are still edited in Systems**.

## 2. The roster

- **What it is**: every character this browser keeps, of any system, that you made in the Characters app or kept from a trip or a token (§6.1): an entry is a `CharacterState` plus `modified` (ISO time), an optional `noteRef` (its page in the notes app) and `playing` (the one trip or token it is in, see §4). Not the party's own sheet (`session.party`, it belongs to the trip) nor factions (phase c).
- **Ids** are unique across the roster (from the name, as today: `Old Tobin` → `old-tobin`, `old-tobin-2` when taken). Relations keep pointing at `character:<id>`.
- **Where**: `localStorage`, `opentabletop.characters` (versioned, with migrations like trips; small enough, and backups already take `opentabletop.` keys; other open apps see changes through the `storage` event). The reading and writing goes in `@open-tabletop/storage` (`characterRoster.ts`); the rules of linking and syncing (§4) are plain functions in `session` (`roster.ts`), tested headless.
- **A character whose sheet is gone** (its pack removed or not loaded): kept, shown with its raw values, read-only, until the sheet is back.

## 3. The Characters app

`apps/characters`, the fifth app in the switcher, with its manual (`docs/manual/<locale>/characters/`) and help column like the rest.

- **List** (left column, folds): the roster grouped by system (the system whose `sheet` each character's sheet is; "Other sheets" for the rest), with a search box. **New character** asks the system (its characters' sheet) and a name.
- **The character** (middle): the full `CharacterCard` (values by group, tracks, conditions, tags, relations), plus what the trip panel leaves out: **Notes** (`noteRef`, opened in the notes app), cards, and **Where it plays** (§4) with a link to each map or trip.
- **Duplicate**, **Delete** (asks; see §5), **Export** / **Import** (`.otd.json` with `characters`, the format maps already write).
- **Edit the sheet in Systems →** link beside the sheet's name (sheets stay in Systems).
- The help column explains each part, as in every app.

## 4. Taking a character to a trip, and keeping it in step

- **Joining**: the trip panel's **Characters** gets **From the roster ▾** beside **Add a character**, listing the roster's characters of the system's sheet not yet in the trip. The trip keeps its copy in `session.members` as today (engines stay pure, a map file stays complete on its own, undo and old maps keep working); the copy is **linked** by its id.
- **Keeping in step** (the host does it, not the engines): after every step or edit of a trip, the linked members are written back to the roster (with `modified`); when a trip or map opens, a linked member whose roster entry is newer takes the roster's state, and the journal says so ("Kael brought up to date from the roster"). `playing` lists where each is, `{ app, id, name }` (a Hexmapper map, a Travel trip), updated as they sync.
- **One trip at a time** (§6.2): joining a trip takes a character out of the trip it was in, after asking, and that trip keeps an unlinked copy.
- **New characters made in a trip** are the trip's until **Keep in the roster** (§6.1); so are those of a map or trip opened with characters the roster lacks (someone else's exported map, an older map, the Grey Marches' example company): each shows **Keep in the roster**.
- **The trip panel** keeps the full cards in its **Party** tab, edited while playing, with **Open in Characters ↗** on each linked one (§6.3).

## 5. Deleting and leaving

- **Deleting from the roster** a character that plays somewhere asks first and says where; the trips keep their copy, unlinked ("no longer in the roster"), and can add it back with **Keep in the roster**.
- **Removing a member from a trip** (× in the panel) only takes it out of the trip; it stays in the roster.

## 6. Decided with the author (2026-10-19)

1. **Only the characters you keep go into the roster**: characters made in a trip stay the trip's until **Keep in the roster**; the roster holds what you made in the Characters app or kept. Opening someone's map, or the example twice, doesn't fill the roster with copies that then sync with each other.
2. **One trip at a time**: a character can't be in two places, so there are no conflicts. With **sub-maps** (backlog, After the alpha) the party going down into a sub-map stays in the same trip, unfinished: a sub-map belongs to its map, so its characters don't leave the trip (author: "ese viaje puede no haber terminado aún que se cambie de mapa").
3. **The trip panel's characters: as now, plus a link**: the full cards stay in the **Party** tab with **Open in Characters ↗**; a compact line each may come when item 14 redesigns the party.
4. **Tokens' statblocks can be roster characters too**: a token (a recurring NPC on several maps) may be linked to a roster character, kept in step like a trip's member, with **Keep in the roster** on a token's sheet and **From the roster** when giving it one; the token keeps its copy (`token.character`) so the map stays complete. A creature of one map just stays the map's. One place at a time holds here too: a character is a member of one trip or one token, and taking it elsewhere asks.

## 7. Phases

1. **The roster, headless**: `session/roster.ts` (link, sync, ids, `playing`), `storage/characterRoster.ts` (versioned, backups), tests.
2. **The Characters app**: list, card, new / duplicate / delete / import / export, notes, where it plays; the switcher, Makefile, `make serve`; manual en/es.
3. **The trips and tokens**: **From the roster** and **Keep in the roster**, syncing in Travel and the Hexmapper (trips' members and tokens' sheets; maps v24, trips v9 if a link needs a field), one place at a time; old maps and trips still open; Travel's Playing, Hexmapper's Play and Tokens pages.
4. **The bundled packs**: the Grey Marches' company and Core's manual pages say how to take them to the roster; a test that plays a roster character on the example map and in Travel.

## 8. Parties in the roster (agreed with the author, 2026-10-29)

**The ask**: a party's own sheet (`session.party`, the system's `partySheet`) was the trip's (§2): made anew with every trip, while its members already went on. The author wants it kept in the roster, carried from trip to trip and kept in step like members, and shown in Characters under its system and sheet. Only systems that declare a party sheet have one (a crew sheet, a fellowship, a company with its provisions); nothing shows for the rest.

1. **A party is its sheet and its members.** A roster entry on the system's party sheet, plus `members`: the ids of the roster characters in it. Taking the party to a trip brings its members. While it plays, its members are the trip's linked members, written back at every sync; a trip's own characters (not in the roster) aren't listed.
2. **Ids.** Inside a trip the party stays `party` (`PARTY_ID`: paths and effects unchanged); in the roster it has its own id from its name (`the-company`), and a trip or map records which roster party is its own (a new field: trips' and maps' versions bumped, light migrations).
3. **Carried as it is.** Values, conditions and items stay as they were from one trip to the next (3 rations left, 3 rations at the start of the next): what anyone expects. No `reset:`; if a system ever needs something reset when a trip starts, it would be a general mechanism the system declares, not a flag per value.
4. **Taking it to a trip.** The trip panel's party card gets **From the roster ▾** and **Keep in the roster**, as characters have; bringing one replaces the trip's party (asking first when that one isn't in the roster). In Travel, a new trip of the same system goes on with the last trip's linked party, as members do. One place at a time, as for characters.
5. **In Characters.** Under its system and sheet, as any character; **New** chooses the sheet (characters' or party's). The party's view shows its sheet and its **Members**, with links. Members are edited there (add from the roster, remove) **while the party plays nowhere** (Characters also runs games at the table); while it plays, the trip keeps the list, and the view shows it with where it plays. **A character is in one party at a time**: adding one in another party takes it out of that one, asking first.
   - **Several parties per system**, and splitting one: **Duplicate** copies the party; **Split the party** is a dialog. You tick the members who go; the new party starts **as any new party of that sheet starts** (its starting values, no items) and the old one keeps everything, so nothing is made out of nothing; each value has two numbers (stays, goes) with **=** (the same as the old one) and **½** (half each); items go to one side or the other, and those with a count are split by a number, with **½** too. The dialog knows no value: the player decides each one. Joining two parties: later, if wanted.
6. **The Bestiary is edited in Systems only** (Claude's reasoning, agreed): a template is a definition of the system, like a sheet (principle 5; sheets stay in Systems, decision **h** of the Bestiary rework); changing it doesn't change the copies already made, which is what someone at the table wants, and copies are edited like any character; **Edit a copy** made a whole pack the user's from an app that isn't about packs; and one editor is left, not two. Characters shows a template read-only with what makes copies of it, and **Edit in Systems ↗**; Systems' Bestiary gets folded cards with the full template editor. `present.<id>` under a template's name gets an `InfoTip` saying how tables and effects name it.

**Phases**: the Bestiary (6) first, short; then the campaign at the centre ([campaigns.md](campaigns.md) §11); then (1)–(5), headless first (`session/roster.ts`: parties, members, one party per character, split), then Travel and the Hexmapper, then Characters; each with its manual pages en/es and tests. Order agreed with the author 2026-10-29 ([BACKLOG](BACKLOG.md)).

# Backups and exports

Every OpenTabletop app keeps your work in this browser: no account, no server. A **backup** puts all of it in one file, to move your games to another computer or to keep a copy in case the browser's data is lost (clearing site data, a new profile, a broken disk).

## Making a backup

Open the app switcher (the nine dots in any app) and press **Save a backup**. The file, `opentabletop-backup-<date>.json`, is downloaded. Keep it somewhere safe, like any other document. The open map and its campaign are saved first, so the backup has them as you see them.

It holds everything the apps keep in this browser:

- **Maps**: every map of Map's library, with its play state (party, trail, trip, journal) and the land each faction holds on it.
- **Campaigns**: the world each map is played in: its world clock and weather, its factions and its Oracle (history, decks, once-only results).
- **Your packs**: the packs you made or edited, and edited copies of bundled packs.
- **The Characters app's roster**: every character and party it keeps, with its notes, where it plays and a party's members.
- **The Travel app's trips**, the **Oracle app's** history, decks and seed, and **favorites**.
- **Preferences**: language, notes app, the packs hidden in the Oracle, the last system chosen, the campaign you're playing, layouts and the like.

Bundled packs are not in it: they come with the apps.

## Restoring a backup

In the app switcher, press **Restore a backup…** and choose the file. OpenTabletop says when the backup was made and what it has, and asks how to restore it:

- **Add to mine**: the backup joins what this browser already has. A map (or campaign) both have keeps the newer copy; packs with the same folder and favorites are joined (the backup's copy of a pack wins); the roster's characters are joined too, and a character both have keeps the copy changed last; other things (the trip, histories, preferences) are taken from the backup.
- **Replace everything**: this browser ends up exactly like the backup. Maps, campaigns and data that aren't in the backup are deleted.

The page then reloads. Close other OpenTabletop tabs before restoring: an open tab still has the old data and could save it again.

Restoring a backup can't be undone with Ctrl+Z. If in doubt, make a backup of this browser first.

## Moving to another computer

1. On the old computer: **Save a backup**.
2. Copy the file to the new one (a USB stick, your cloud folder, an email to yourself).
3. On the new computer, open any OpenTabletop app from the same place you'll use from now on, then **Restore a backup…** → **Replace everything** (or **Add to mine** if it already has work of its own).

Apps share their data only when they are served from the same site (for example, all of them under `http://localhost:8080/`). A backup made on one site and restored on another moves everything across.

## Exporting and importing some of it

A backup takes everything. To choose what goes (one campaign to a friend, your homebrew packs to another computer, a few characters), use **Export…** in the app switcher, below the backup buttons.

It lists what you've made, as a tree with ticks, all ticked at first:

- **Your packs**: the packs you made or edited, and your copies of bundled packs. A copy of a pack whose licence allows only personal use is marked **Personal use**, and ticking it warns that the file isn't to be shared.
- **Campaigns**, each with its **maps** (Map's) and **trips** (Travel's) under it. Ticking a campaign ticks its maps and trips too; untick any of them to leave it out.
- **Maps and trips** whose campaign isn't kept here, if any.
- **Characters**: the roster's.

**All** and **None** tick or untick everything. Press **Export** and `opentabletop-export-<date>.zip` is downloaded.

When something ticked needs something that isn't, **Left out** says what and why, for example:

- `Pack «Homebrew» depends on Pack «Lore».`: a pack's `dependencies` (see [File formats](02-file-formats.md)).
- `Trip «To the coast» plays in Campaign «The North».`: a map or trip without its campaign has no world clock, factions or Oracle elsewhere.
- `Campaign «The North» is played with Pack «Homebrew».`: the pack of the system a campaign, trip or character's sheet plays with, and the packs a campaign adds to its system's.
- `Brenna plays in Trip «To the coast».`: a roster character and the map or trip it plays in, both ways.
- `Brenna is in the party The Company.`: a roster party and its members.

**Add what's missing** ticks all of it, and what that needs in turn. You can still export without it. Packs that come with the apps (Core, the Grey Marches…) are never in the file and never asked for: every copy of OpenTabletop has them. Preferences, the Oracle app's history and Systems' test trips go only in backups.

To bring an export in, press **Import…** in the app switcher and choose the file. The same tree shows what it holds, each thing marked:

- **New**: not here; ticked.
- **Already here**: here and the same; nothing to do, so it can't be ticked.
- **Replaces yours**: here with the same id, but different (you went on playing a trip in both places, say); not ticked. Tick it to replace yours with the file's: OpenTabletop asks first, since it can't be undone.

**Left out** works the same, counting what this browser has already: a trip whose campaign is here needs nothing more. Importing adds what you ticked beside everything else here (nothing else is removed) and reloads the page; close other OpenTabletop tabs first.

The Oracle's **Import .zip** reads an export too, taking only its packs.

## The file

A JSON file:

```json
{
  "format": "opentabletop-backup",
  "version": 2,
  "created": "2026-10-07T21:30:00.000Z",
  "storage": { "opentabletop.userPacks": "[…]", "opentabletop.locale": "\"es\"", "…": "…" },
  "maps": [{ "id": "greymarches1", "name": "The Grey Marches", "modified": "…", "json": "{…}" }],
  "campaigns": [
    { "id": "greymarches1", "name": "The Grey Marches", "modified": "…", "json": "{…}" }
  ]
}
```

- `storage` copies the apps' browser storage entries whose keys start with `opentabletop.` or `hexmapper.`, as text. Map's crash copies of the open map and its campaign (`hexmapper.pending`, `hexmapper.pendingCampaign`) are left out.
- `maps` copies Map's library as it is: each `json` is a map in Map's own format, which carries its version and is migrated when the map opens. To share a single map with other tools, use Map's **Save** (an OTD bundle, see [File formats](02-file-formats.md)).
- `campaigns` copies the campaigns the same way, each `json` in their own versioned format. Backups made before campaigns (`version` 1) have none: each of their maps makes its own when it opens.
- `version` is the version of this envelope. Newer backups than the app understands are refused rather than read wrongly.

## The export file

A .zip:

```
opentabletop-export.json        what it holds: { "format": "opentabletop-export", "version": 1, "created", "packs", "maps", "campaigns" }
packs/<id>/pack.yaml, …         each pack as a pack folder
maps/<id>.json                  each map as Map's library keeps it
campaigns/<id>.json             each campaign in its own format
trips/<id>.json                 each Travel trip as Travel keeps it
characters/<id>.json            each roster character with its notes and where it plays (a party with its members)
```

- `opentabletop-export.json` lists the packs (with what a copy of a bundled pack was based on) and the maps' and campaigns' names and times; trips and characters carry their own. An export of a newer `version` than the app understands is refused.
- Every map, campaign, trip and character keeps its own format's version and is migrated when its app reads it, as in a backup.
- Ids with characters a file name can't hold are written escaped (`%2F` for `/`).

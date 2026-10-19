# Backups of everything

Every OpenTabletop app keeps your work in this browser: no account, no server. A **backup** puts all of it in one file, to move your games to another computer or to keep a copy in case the browser's data is lost (clearing site data, a new profile, a broken disk).

## Making a backup

Open the app switcher (the nine dots in any app) and press **Save a backup**. The file, `opentabletop-backup-<date>.json`, is downloaded. Keep it somewhere safe, like any other document. The open map and its campaign are saved first, so the backup has them as you see them.

It holds everything the apps keep in this browser:

- **Maps**: every map of the Hexmapper's library, with its play state (party, trail, trip, journal) and the land each faction holds on it.
- **Campaigns**: the world each map is played in: its world clock and weather, its factions and its Oracle (history, decks, once-only results).
- **Your packs**: the packs you made or edited, and edited copies of bundled packs.
- **The Characters app's roster**: every character it keeps, with its notes and where it plays.
- **The Travel app's trips**, the **Oracle app's** history, decks and seed, and **favorites**.
- **Preferences**: language, notes app, the packs hidden in the Oracle, the last system chosen, layouts and the like.

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

- `storage` copies the apps' browser storage entries whose keys start with `opentabletop.` or `hexmapper.`, as text. The Hexmapper's crash copies of the open map and its campaign (`hexmapper.pending`, `hexmapper.pendingCampaign`) are left out.
- `maps` copies the Hexmapper's library as it is: each `json` is a map in the Hexmapper's own format, which carries its version and is migrated when the map opens. To share a single map with other tools, use the Hexmapper's **Save** (an OTD bundle, see [File formats](02-file-formats.md)).
- `campaigns` copies the campaigns the same way, each `json` in their own versioned format. Backups made before campaigns (`version` 1) have none: each of their maps makes its own when it opens.
- `version` is the version of this envelope. Newer backups than the app understands are refused rather than read wrongly.

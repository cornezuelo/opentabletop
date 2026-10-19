# Getting started

The Characters app keeps your **roster**: the characters this browser keeps, of any system. Each one is made with its system's characters' sheet (its values, tracks, conditions and kinds of relation), the sheet the system names in Systems ([Sheet](../systems/07-sheet.md)). A roster character can travel on a map in the Hexmapper or on a trip in Travel played with its system, in one place at a time, and what happens to it there comes back to the roster.

## The screen

- **Header**: the app switcher (nine dots), the gear (**Preferences**: language and notes app, shared by every app) and **?** for this manual. The small tabs on the edges of the middle column (‹ ›) fold the characters list and the help column away, and bring them back.
- **Characters** (left): **New character**, **Import…**, a search box, and the roster grouped by system (the system whose characters' sheet each one is made with; **Other sheets** for those whose system isn't loaded). Under the list, **Make or edit systems** opens the Systems app.
- **The character** (center): the one chosen in the list.

Labels underlined with dots have an explanation: click one and the help column opens on it.

## A new character

**New character** asks for the **system** (only systems with a characters' sheet are listed; the one you last chose in any app comes first) and a **name**, and makes the character with the sheet's starting values. Its **id** comes from the name (`Old Tobin` → `old-tobin`; `old-tobin-2` if the roster already has one) and doesn't change: it's how rules and tables reach it once it travels (`characters.old-tobin.values.health`) and how relations point at it (`character:old-tobin`).

## The character

- **Duplicate** makes a copy with its values, in the roster only; **Export** downloads it as an `.otd.json` file; **Delete** removes it from the roster (after asking).
- **Sheet**: the sheet it's made with and its system, with **Edit the sheet in Systems →**. A character whose sheet isn't loaded (its pack removed, or a personal-use pack in another build) shows its values as they are, and can't be changed until the sheet is back.
- **Id**: how it's read, as above.
- **Where it plays**: the map or trip it travels on now, with **Open**, or _only in the roster_.
- **Notes**: its page in your notes app (a path such as `People/Old Tobin`); **↗** opens it. The notes app is chosen in **Preferences**. Its story, looks and secrets live there, not here.
- Under them, its card, the same as in a trip: its values by group (a track as boxes: click one to fill up to it), its conditions, its tags and its relations (to places, regions, hexes or other roster characters).

## Files

**Export** writes an OTD file (`.otd.json`) with its `characters`: its values as `stats`, its tags, its note, and its sheet, conditions and relations in `ext.character` (see [File formats](../technical/02-file-formats.md)). **Import…** adds the characters of such a file: one exported here, or a map saved by the Hexmapper (its party's characters). Characters whose id the roster already has get a new one. Characters that aren't made with a sheet (a map's plain tokens) are left out.

The roster lives in this browser (`opentabletop.characters`), like your packs and maps: a [backup](../technical/05-backups.md) includes it. Export the characters you care about to keep them safe.

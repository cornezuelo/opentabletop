# Getting started

The Characters app keeps your **roster**: the characters this browser keeps, of any system. Each one is made with its system's characters' sheet (its values, conditions and kinds of relation), the sheet the system names in Systems ([Sheet](../systems/07-sheet.md)). A roster character can travel on a map in the Hexmapper or on a trip in Travel played with its system, in one place at a time, and what happens to it there comes back to the roster.

## The screen

- **Header**: the app switcher (nine dots), the gear (**Preferences**: language and notes app, shared by every app) and **?** for this manual. The small tabs on the edges of the middle column (‹ ›) fold the characters list and the help column away, and bring them back.
- **Characters** (left): **New character**, **Import…**, a search box, and the roster grouped by system (the system whose characters' sheet each one is made with; **Other sheets** for those whose system isn't loaded). Under the list, **Bestiary** opens the system's templates ([below](#the-bestiary)) and **Make or edit systems** opens the Systems app.
- **The character** (center): the one chosen in the list.

Labels underlined with dots have an explanation: click one and the help column opens on it.

## A new character

**New character** asks for the **system** (only systems with a characters' sheet are listed; the one you last chose in any app comes first) and a **name**, and makes the character with the sheet's starting values. Its **id** comes from the name (`Old Tobin` → `old-tobin`; `old-tobin-2` if the roster already has one) and doesn't change: it's how rules and tables reach it once it travels (`characters.old-tobin.values.health`) and how relations point at it (`character:old-tobin`).

## The character

- **Duplicate** makes a copy with its values, in the roster only; **Export** downloads it as an `.otd.json` file; **Delete** removes it from the roster (after asking).
- **Sheet**: the sheet it's made with and its system, with **Edit the sheet in Systems →**. A character whose sheet isn't loaded (its pack removed, or a personal-use pack in another build) shows its values as they are, and can't be changed until the sheet is back.
- **Id**: how it's read, as above.
- **Where it plays**: the map or trip it travels on now, with **Open**, or _only in the roster_; under it, the campaign that map or trip is in, with **Open in Campaign ↗** (the [Campaign](../campaign/01-getting-started.md) app).
- **Notes**: its page in your notes app (a path such as `People/Old Tobin`); **↗** opens it. The notes app is chosen in **Preferences**. Its story, looks and secrets live there, not here.
- Under them, its card, the same as in a trip: its values, each group a card, each value drawn as its sheet says (a number, a bar, boxes, dots, a dial, a named level: click a box, dot or segment to fill up to it; see [How values are shown](../systems/07-sheet.md#how-values-are-shown)), its conditions, its tags and its relations (to places, regions, hexes or other roster characters). What holds by itself is shown but not edited: a value **made of others** (Wounds, from Health) and a condition that **holds while** something is true (Terrified, while Dread is full) follow what they're made of; change that instead. A condition that reads the world (Seasick, while the party travels by boat) follows it on a trip; here, away from any trip, it stays as it was last seen ([Sheet](../systems/07-sheet.md#how-sheets-work)).
- Its **Items**, when its system gives characters items: what it carries, grouped by the places its sheet declares (hands, body, pack…, each with how much of its room is taken, in red when over) and the containers it carries (_In Backpack_). Each item has **How many**, the numbers its system gives items (a torch's uses as dots), where to move it (drag its handle ⠿ onto a place, or pick one: only the places it fits, with room left where the sheet takes no more than a place's room; hold Shift as you drop to move only one of a stack) and × to drop it (with what's inside it). When the sheet gives a **Room in all**, **Carried** above shows how much is carried against it. **Add an item** suggests the system's catalogues by name; any other name makes one by hand; what has no room left is refused (_No room left for…_). An item marked _No room for it_ came on a trip with nowhere to go: drop something, or move it to a place. **Places of its own** adds a place only this character has (a tail, a third arm). Values made of the items (a load) follow them at once ([Items](../systems/08-items.md)).

## The bestiary

**Bestiary** (under the list) shows the creatures and kinds of people a system can make, as **templates**: each a character of one of the system's sheets whose rolls (`{{2d4}}`) are made again for every copy ([Bestiary](../systems/18-bestiary.md)). Pick the system, search by name, id or tag, and pick a template:

- **Make copies in the roster** makes that many independent characters, named after the template and numbered (_Grey wolf 1_, _2_…), each with its own rolls and remembering the template it came from. Handy to keep track of specific wolves without a trip.
- Its card shows what the template says: **Values** (a number or a roll; empty takes the sheet's default, shown faint), **Conditions**, **Tags**, **Items** from the system's catalogues, the one it is a **Variant of**, the generator its **Names** come from, what becomes of copies **Left behind** and its **Token**.
- A template in a bundled pack is read-only: **Edit a copy of the pack** makes a pack of your own (it overrides the bundled one) where it can be changed. Changes are saved as you make them and only affect copies made afterwards. **New template** and **Delete the template** work in a pack of your own.

## On trips

A roster character travels in **one place at a time**: a map's trip in the Hexmapper, a trip in Travel, or a token on a map (an NPC who comes back). It joins with **From the roster** in the trip's **Party** tab (or a token's **Sheet**), and a character of a trip joins the roster with **Keep in the roster** on its card ([Characters on a trip](../travel/02-playing.md#characters)). From then on the place and the roster are kept in step: what happens on the trip is written here after every step, and what you change here reaches the trip (now, if it's open in another tab; otherwise when it next opens). **Where it plays** says where it is, with **Open**. Taking it to another place asks first, and the place it leaves keeps its own copy, no longer linked. Taken out of the party, or with its trip or token deleted, it stays here, travelling nowhere.

## Files

**Export** writes an OTD file (`.otd.json`) with its `characters`: its values as `stats`, its tags, its note, and its sheet, conditions, relations and items in `ext.character` (see [File formats](../technical/02-file-formats.md)). **Import…** adds the characters of such a file: one exported here, or a map saved by the Hexmapper (its party's characters). Characters whose id the roster already has get a new one. Characters that aren't made with a sheet (a map's plain tokens) are left out.

The roster lives in this browser (`opentabletop.characters`), like your packs and maps: a [backup](../technical/05-backups.md) includes it. Export the characters you care about to keep them safe, or several at once, with the trips they play in, with the app switcher's [**Export…**](../technical/05-backups.md#exporting-and-importing-some-of-it).

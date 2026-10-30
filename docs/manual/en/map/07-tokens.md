# Tokens

Tokens are pieces you move around the map: the party, player characters, NPCs and enemies. Use the **Tokens** tool (<kbd>K</kbd>).

## Placing and moving

- Choose the kind of the new tokens (PC, NPC or Enemy), their icon (the **Suggested** ones are characters and creatures; the chips filter by category as in Icons, and searching looks through them all; or **Import an image…**) and color, then click an empty hex.
- Click a token (or anywhere on its hex) to edit it. Drag it to another hex: it lands centered.
- Several tokens can share a hex: they're arranged around the center. <kbd>Shift</kbd>+click always adds a new token, even on a hex that already has tokens (or right on one).
- **Place from the bestiary** (in the new-token options, when the map's system or its campaign's packs have a bestiary): new tokens are copies of a template, with its look, its name and a sheet with its values rolled for each one. They are the map's, like any token: a guard at a bridge, a lair. The copies a trip makes are something else: see [Playing a trip](08-play.md).
- Right-click or <kbd>Delete</kbd> removes a token. **Take off the map** keeps it in the list without a hex.

Tokens can also be dragged with the Select and Play tools (in Play, a click on one is a click on its hex too: [Play](08-play.md)).

With the color on **Auto**, each token gets its own color from its kind's family — PCs in cool colors, enemies in warm ones, NPCs in earthy ones — so tokens of one kind look alike but can be told apart. Pick a color to fix it.

## A token's settings

Name, kind (party, PC, NPC, enemy), icon, color, halo, **Show the name on the map** with its **Style** (the map's, or its own), a linked note and **fields** (key–value: `might: 18`, `fare: 2`; not on the party token, see below). While a token is selected, tables rolled from the Oracle panel read its fields as `{{token.might}}`, and its name and kind as `{{token.name}}` and `{{token.kind}}` (in the Grey Marches, select Brenna and roll _The ferry_). **Tokens on this map** lists them all by kind: click one to select it and center the map on it.

**Sheet**: when the map's system has a sheet for its characters (the Grey Marches' companions), a PC, NPC or enemy token can have one too: **Give it a sheet** makes it a character of that sheet, like a statblock, with its values (each drawn as the sheet says: [How values are shown](../systems/07-sheet.md#how-values-are-shown)), conditions, tags, relations and items, the same as the party's characters in Play. Tables rolled with the token selected read them (`{{token.health}}`, `token.conditions: wounded`); its fields stay as they are. Above it, the sheet says which it is and whose system (_Sheet: Companion · The Grey Marches_), with **Edit in Systems ↗**: a token's sheet is always the map's system's, chosen in **Map settings → Campaign → System**, and it has only what that sheet declares (to add a value, edit the sheet in Systems). **Remove its sheet** takes it away (after asking). The Grey Marches' example map gives one to Brenna the ferrywoman.

A token's sheet can be a character of the roster ([Characters](../characters/01-getting-started.md)), for an NPC who comes back on several maps: **Keep in the roster** keeps it there, named after the token, and **From the roster** (on a token without a sheet) gives the token one of the roster's characters made with the sheet of the map's system's characters or of its templates (a creature made from the bestiary in the Characters app). A token's card always uses its own character's sheet: a creature placed from the bestiary shows its template's sheet, not the companions'. Linked, what you change on the token is written back to the roster, and what changes in the Characters app reaches the map when it's open; **Open in Characters ↗** opens it there. A character is in one place at a time: taking one that travels elsewhere asks first. Deleting the token, or removing its sheet, leaves it in the roster. One engine for every character: the sheet a system declares for its party is the one its NPCs and creatures use.

## The party

The party is a token too: Play mode moves it (see [Playing a trip](08-play.md)). There is one party per map; making another token the party turns the old one into a PC. A trip in progress goes on with the new party, from where it stands: same day, party sheet and journal; its trail starts there.

The party token is only where the party is: it has no fields nor sheet of its own. The party's sheet, its stats and its characters are in Play's **Party** tab ([The party](../travel/02-playing.md#the-party)); the token's panel says so, and **Open Play → Party** takes you there. Maps saved with fields on the party token lose them when opened (nothing read them).

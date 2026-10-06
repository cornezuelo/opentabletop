# Tokens

Tokens are pieces you move around the map: the party, player characters, NPCs and enemies. Use the **Tokens** tool (<kbd>K</kbd>).

## Placing and moving

- Choose the kind of the new tokens (PC, NPC or Enemy), their icon (or **Import an image…**) and color, then click an empty hex.
- Click a token (or anywhere on its hex) to edit it. Drag it to another hex: it lands centered.
- Several tokens can share a hex: they're arranged around the center. <kbd>Shift</kbd>+click always adds a new token, even on a hex that already has tokens (or right on one).
- Right-click or <kbd>Delete</kbd> removes a token. **Take off the map** keeps it in the list without a hex.

Tokens can also be dragged with the Select and Play tools.

With the color on **Auto**, each token gets its own color from its kind's family — PCs in cool colors, enemies in warm ones, NPCs in earthy ones — so tokens of one kind look alike but can be told apart. Pick a color to fix it.

## A token's settings

Name, kind (party, PC, NPC, enemy), icon, color, halo, **show the name on the map** with its **style** (the map's, or its own), a linked note and **fields** (key–value: `might: 18`, `fare: 2`). While a token is selected, tables rolled from the Oracle panel read its fields as `{{token.might}}`, and its name and kind as `{{token.name}}` and `{{token.kind}}` (in the Grey Marches, select Brenna and roll _The ferry_). **Tokens on this map** lists them all by kind: click one to select it and center the map on it.

## The party

The party is a token too: Play mode moves it (see [Playing a trip](08-play.md)). There is one party per map; making another token the party turns the old one into a PC. A trip in progress goes on with the new party, from where it stands: same day, supplies and journal; its trail starts there.

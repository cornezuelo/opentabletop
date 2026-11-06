# Map's UI/UX: review and proposal

Part (3) of _Map looks like a beautiful map editor_ in the [backlog](BACKLOG.md): panels, toolbar and canvas reviewed as a whole, screenshots first, then a proposal, then the work in steps. **Status (2026-11-06): decided with the user (§5), steps 1 to 4 done, step 5 next.**

Seen on v0.37.0 in headless Chrome: the Grey Marches' frontier in every tool and panel, a trip with a march played, a fresh profile, and windows of 1440, 1280, 1024, 820 and 390 px. It also starts from the round 1 players (P1–P14). The comparison with Dungeon Scrawl, Inkarnate, Wonderdraft, Hextml and Worldographer is from what is generally known of them; they weren't opened for this.

## 1. What works, and stays

- The map is the largest thing on screen, with tools left and a panel right, the shape every map editor shares.
- One panel that follows the tool: Terrain's palette by groups, Regions as a tree, Tokens' lists.
- Shortcuts on every tool, shown in the tooltips; the fold tabs; the help column.
- Contrast is fine: panel text 12:1, muted text 5.1:1, accent 6.4:1 (AA asks 4.5:1).
- The World panel dimming the regions' names is deliberate (`render/focus.ts`): it shows the factions instead. Not a bug, though it looks like one at first.

## 2. What doesn't

**Playing**, the biggest problem:

1. **The Play panel is three screens long.** 2705 px in 855 at 1440×900, with the Grey Marches' company. Top to bottom: play mode, trail, straight lines, system, discovery (two controls), the status (nine lines), the actions, two options, way of travelling, _What just happened_, then the tabs. The actions begin at 525 px and the tabs at 775 px, so what a player does most sits under settings touched once a trip.
2. **Scrolls inside scrolls.** _What just happened_ is a small scrolling box inside the scrolling panel, and repeats the first lines of the **Journal** tab, which sits below it.
3. **No main action.** **March**, **Camp** and **Forage** are the same small button, wrapped in whatever order fits. A disabled one says why only in its tooltip, on a hover nothing invites, and an action that will come to nothing doesn't warn first (P12's Forage and Drive them off).
4. **Characters at 300 px.** The panel is fixed at 300 px, so sheets (tracks of pips, relations, places) are squeezed, on a screen where the map could spare room.

**Editing and playing mixed:**

5. **Play is one tool among twelve.** Nine that edit, then Play, World and the Oracle, in one column with no groups. During a trip every editing tool is one click or key away, so a stray key turns the next click on the map into a brush stroke. Two buttons light up at once (Play and World).
6. **Mixed glyphs.** Unicode characters (⬚ ⬢ ⇄ ▥ ♜ ♟ ☾) beside drawn icons, of different weights. Without the tooltip, Connections, Walls and Icons can't be told apart.

**The cell:**

7. **An empty cell shows a form.** About a dozen controls for a plain cell, starting with **New sub-map here** and **Another way into…**, and every optional thing (linked note, point of interest, tag, field) as an empty input. What the cell _is_ takes three lines at the top. A full one (Fort Keld) runs past the screen.
8. **Two coordinates:** `0714` and `6,13` side by side (P12's "at 15,9" beside "at 1404").
9. **Bug: Select on a token does nothing visible** (verified). `selectTool.down` returns once `tokenDragger` takes the click, so a click on Ashford, where the party stands, leaves the panel on the cell before, or on its hint. The same for any cell with a token.

**The frame:**

10. **The open map's name isn't on screen** unless it's a sub-map (`TopBar`'s breadcrumb); the bar shows the campaign's. It is only in the window's title.
11. **Two kinds of panel header:** tools' `▾ Terrain` folds the only section there is, while Layers, Settings, Maps, Export, World and the Oracle have a title and ✕.
12. **No zoom in sight:** no percentage, no buttons, only the wheel and **Fit**. The cell under the pointer isn't told either: `HoverLine` gives its region and faction, not its coordinate.
13. **First run:** a dark empty grid and "Click a cell to view and edit its details". Campaign, Characters, Travel and Systems greet with ui-kit's `Welcome`; Map doesn't, and the examples are behind the **Maps** icon.
14. **Bug: a link to an example asks about "your copy" in a fresh browser** (verified, the item found checking Relief). Not the service worker, as suspected: it happens with it blocked. One page load, the hash is rewritten to `#/greymarches1` and then the dialog opens. Its cause is under step 1 in §4.
15. **Narrow windows.** The panel stays 300 px down to 761 px, so at 820 px the map has 463 px of width. Under 760 px it becomes a sheet of 45% of the height, so a phone reads a 2705 px panel through 380 px. The bar scrolls sideways (601 px in 390), which works but hides Save.

## 3. Proposal

### 3.1 Two modes: Edit and Play

What the editors compared share: the mode you're in decides what's on screen. A switch **Edit | Play** in the top bar (keys kept: `P`):

- **Edit:** the rail holds the editing tools, grouped: Select · Terrain, Regions, Roads and rivers, Walls · Connections · Icons, Text, Tokens.
- **Play:** the rail holds what play uses: Select, Trip, World, Oracle. The editing tools' keys do nothing; a change to the map needs a step back to Edit.
- World and the Oracle are in both.

Every tool's icon drawn in one set (`LineIcon` exists; the glyphs become entries in it).

### 3.2 The Play panel: do first, read after

```
┌──────────────────────────────────────┬───────────────┐
│ Day 1 · 14:00 · spring · grey        │ [March ▾]     │  actions, always
│ At Keld Bridge (0909) → Fort Keld    │ Camp Rest …   │  in sight
│  (a strip over the map)              │ On foot   ▾   │
│                                      ├───────────────┤
│                                      │ Journal│Party │  tabs: the rest of
│              the map                 │ │So far       │  the column, one
│                                      │               │  scroll
│                                      │ 14:00 …       │
│                                      │ 12:24 …       │
└──────────────────────────────────────┴───────────────┘
```

- **The status leaves the panel** for a strip over the top of the map: day, hour, season, weather, place, destination, march. Its long form (calendar, moons) opens from it. About 190 px back.
- **Actions pinned at the top**, the system's first one (or its main one) as the primary button, with the reason a disabled one can't be played under it.
- **Journal, Party and So far fill the rest**, with the only scroll. _What just happened_ goes: the Journal tab opens by default, the newest lines marked.
- **Trip options in a tab of their own** (**Options**): play mode, trail, straight lines, discovery, skip pauses, ask who gives, **New trip**, **Clear trail**, **Remove party**.
- **A panel you can widen:** a drag on its edge, 300 to 480 px (340 at first), remembered as a preference.

`TripPanel` lives in `travel-ui`, so Travel gets the same order; the strip is a part it draws in its own place.

### 3.3 The cell: what it is, then what you can add

- Head: name (or its coordinate), terrain, region, one coordinate (in the map's format; the other in the help).
- Then only what it holds: notes, points of interest, ways, icon, tags, fields.
- Below, **+ Note · + Linked note · + Place · + Tag · + Field · + Way in** as small chips: each opens its input.
- **Clear cell** and **New sub-map here** in a ⋯ menu.
- In Play, the same head, read only: what it holds, nothing to fill in.

### 3.4 The frame

- The map's name always in the bar, as the breadcrumb's last step, editable with a click. The campaign chip stays beside it.
- One panel head everywhere: title, its help, ✕ where it goes back.
- A small bar at the map's bottom edge, joining `HoverLine`: the cell's coordinate, its region and faction, zoom in %, − and +, **Fit**.
- `Welcome` on a fresh browser: **New map** (its three kinds), the examples, **Open a file**.

### 3.5 Narrow windows

- Under about 1100 px the panel floats over the map instead of squeezing it, folded with its tab.
- On a phone, a bottom sheet with three heights (peek: the actions; half; full), and the top bar's file actions in one ⋯ menu.

## 4. Steps

One commit each, `make verify` green, the manual updated in the same work.

1. ✅ (2026-11-06) **Small and sure:** the two bugs (9, 14), the map's name (10), one panel head (`PanelHead` in ui-kit, 11), one coordinate (8), `Welcome` (13). Number 14's cause: `App`'s start-up effect read `playing.id`, so playing the opened map's campaign started the app again; and reading the ways to other maps counted as a change (`links`), stamping and keeping every map opened, a blank one too. **Left:** opening a kept example again by its link still asks, though nothing was played: the bundled files have no `modified` to compare with.
2. ✅ (2026-11-06) **The Play panel** (3.2), with Travel. Changed while building: the options are a fourth tab, **Options**, not a ⚙ in the head (Travel gets them as they are, and no new popover), and the panel opens at 340 px so four tabs fit. Travel keeps `TripStatus` as a box at the top of its column.
3. ✅ (2026-11-06) **Edit and Play** (3.1) and the icons: the switch in the top bar, `editor.mode` (the tool's setter keeps it, Select being in both), one `LineIcon` set for both bars. Editing a cell's fields from Select in Play still works: step 4 decides what the cell shows there.
4. ✅ (2026-11-06) **The cell** (3.3): chips for what it doesn't hold, the link and **Clear cell** in a ⋯, **New sub-map here** behind **+ Way into a map**. Decided with the user: in Play it's read only (`HexReadOnly`), names can't be dragged and **Delete** doesn't remove a token. Discovery needs nothing here: an undiscovered cell is an empty one, with nothing to hide.
5. **The map's bar** (3.4).
6. **Narrow windows** (3.5).
7. P12's rest, what's left of it by then.

## 5. Decided with the user (2026-11-06)

1. **Edit | Play as modes** (§3.1), not Play as a tool with the rail only grouped. The cost accepted: fixing a cell in the middle of a trip takes a step back to Edit.
2. **The status as a strip over the map** (§3.2).
3. **Map only.** Campaign, Characters, the Oracle and Systems wait for round 2; Travel gets the Play panel's order through `TripPanel`.
4. **The steps in the order of §4**, starting with step 1.

# The Packs app: UI/UX proposal

Steps (2) to (4) of _One app edits packs_ in the [backlog](BACKLOG.md): what was decided there (2026-11-05 and 11-06) drawn as screens, from screenshots of the app and the Oracle after the rename (step 1). **Status (2026-11-06): to review with the user (§6); no code yet.**

## 1. What's wrong today

1. **A pack can't be seen in Packs.** Its left column lists systems and map styles. Packs themselves, their files, translations and images are in the Oracle, and a definition that belongs to no system (a calendar in a pack of yours) has no way in.
2. **Sixteen tabs in two rows** on a system's page, in no order a reader can guess, and the row a tab is in changes with the window's width.
3. **Two apps do half each.** New pack, Import and New definition are in the Oracle's top bar; New system and Import a system in Packs' left column. A Grey Marches table is edited in one, its travel rules in the other.
4. **The Oracle's left column lists a definition twice over** and its page of a pack is mostly a second list of the same definitions, one badge per row.
5. **Land assumes hexes** (the user: "solo se puede editar tierra para el hexmap"). The **Land** tab can add a dungeon's or town's terrains, but in one flat list; its preview draws hexes whatever the map; and no bundled model shows what a land model does for floors or streets.
6. Small: a system's name is clipped by its tags (_Kal-Ara…_), and **Duplicate** and the read-only notice say the same thing in two places.

## 2. The left column: two views of the same files

A switch at the top, **Systems | Packs**, with one search box under it for both.

- **Systems**: as today, each system by name, with its tags on a second line so the name is never clipped.
- **Packs**: a tree. Each pack, with its origin and problems, unfolds into its kinds, each with its count, and each kind into its definitions:

```
▾ The Grey Marches            bundled
    ⚙ System: The Grey Marches
    ▸ Tables 49
    ▸ Oracles 3
    ▾ Land models 2
        The lie of the Marches
        The Hollow Hills
    ▸ Map styles 2
    ▸ Images 1
    ▸ Files 24
▸ Core                        bundled
```

Kinds a pack doesn't hold aren't listed. Map styles stop being a part of the column: they're a kind, under their pack, and the search finds them.

**One button, New ▾**, in the top bar, for everything made here: **System**, **Pack**, **Definition…** (in the pack selected), **Import…**. It replaces four controls in two apps.

## 3. The main area

**A pack's page**: its name and manifest in a line; **Export**, **Edit a copy** or **Remove**; problems, when there are any; then what it holds, as a card per kind with its count, a click taking you to the kind in the tree; then Files, Translations and Images, folded. The list of every definition goes: the tree has it.

**A definition's page**: a breadcrumb (_The Grey Marches › Land models › The lie of the Marches_), then tabs **Form | YAML | Used by**, and, for what rolls, **Roll ↗** to the Oracle. A form here is the same component as a system's tab. Bundled: read only, with one notice and **Edit a copy**.

**A system's page**: the sixteen tabs become a rail down the left of the page, in groups:

| Group      | Tabs                                                     |
| ---------- | -------------------------------------------------------- |
| (top)      | Overview                                                 |
| Travel     | Rules, Checks                                            |
| Characters | Sheet, Items, Bestiary, Roll modes                       |
| The world  | Places, Factions, Clocks, World, Calendar, Weather, Land |
| (bottom)   | Try it, YAML                                             |

Under 1100 px the rail folds into a select. Each entry may show a count of its problems. The tabs' URLs and manual pages stay as they are.

**The notice**: one line under the title, with its button in it, instead of a box and a separate **Duplicate**.

## 4. Land for any map

- **The terrains to add** in Map's palette groups (`terrainChoiceGroups`): the land, water, dungeon, town…, the system's own first.
- **The preview** with a **Hexes | Squares** switch, drawn with the same colours; on squares a floor terrain has its walls, so a cave reads as a cave.
- **New land model** offers a start: **Open land**, **Caves** (rock and cave floor), **A town** (cobbles, yards, gardens).
- **Bundled**: Core's _Caves_, the smallest example; the Grey Marches' old mine's side galleries grown from a model. A test generates both on squares.

Whether **Generate land** does what's wanted on a square map hasn't been tried: it's the first thing to check, since the model's rows count neighbours and a square has eight or four, as the system says.

## 5. The Oracle after it

It rolls. Its top bar loses New definition, New pack and Import; its left column stays as it is (search, filters, favourites, the tree); a pack's page is the name, the problems and **Open in Packs ↗**, with what can be rolled. **Edit** stays on a definition, as decided, the same shared editors, with **Open in Packs ↗** beside it. Hiding packs stays in its Preferences.

**In the code:** `manifest`, file and definition helpers (`workspace.ts`, `definitions.ts`, `fromText.ts`, `templates.ts`, `doc.svelte.ts`), `FileEditor`, `PackView` and the two **New** dialogs move to `pack-ui`, taking the library as a prop; the tables', oracles', generators' and decks' editors to `oracle-ui`, with their texts (about 230 keys). The manual's Packs, Translations and YAML pages move from `oracle/` to `packs/`.

**The order**, a commit each: (a) the move, nothing visible changing; (b) the left column and a pack's page; (c) a definition's page, every kind's form working without a system around it (today most take one: Land's `system` prop is the example), which is what (4) of the backlog's steps then reviews; (d) the system's rail and the notice; (e) the Oracle; (f) Land for any map.

## 6. To decide with the user

1. **Two views with a switch** (proposed), or one tree with the systems inside their packs and no switch? One tree is simpler, but a player who only thinks in systems has to find them.
2. **The rail** for a system's tabs (proposed), or tabs kept in one row with the groups as menus? The rail costs about 170 px of width, on forms that are 760 px wide today.
3. **Does §4 answer what was asked about land?** Claude read "tierra" as the **Land** tab. If it meant something else (Map's palette, or a system's terrains), §4 changes.
4. **Roll modes** under Characters, or a group of its own with Checks (_Rolling_)?

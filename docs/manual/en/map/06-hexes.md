# Cell details

Select a cell with the **Select** tool (<kbd>V</kbd>) to see and edit its details in the side panel: its coordinate, terrain, name and region, then what it holds, and small buttons for what it doesn't hold yet (**+ Notes**, **+ Point of interest**, **+ Tag**…), each opening its field. The **⋯** beside **Roll here** copies the cell's link and clears the cell. In [Play](08-play.md) the same panel is to read, with nothing to fill in: to change the cell, go back to **Edit**.

A click on a token shows the cell it stands on. The panel gives the cell's coordinate in the map's format; its help (a click on it) gives its **id** (`4,2`: column and row counted from 0, whatever the map's coordinate labels). Beside its terrain is the terrain's id (`heath`). Tables and conditions read them as `place.id` and `place.terrain`.

## What a cell can hold

- **Name**: shown under the cell on the map; you can hide it or give it its own style.
- **Region**: when the map has regions.
- **Notes**: short GM notes in Markdown. The lore of the place belongs in your notes app (see below).
- **POIs**: points of interest, each with a name, a description, its own linked note and, optionally, an icon to tell them apart in the panel (it isn't drawn on the map).
- **Tags**: free words (`ruins`, `haunted`, `landmark`…) with suggestions from the rest of the map.
- **Fields**: key–value pairs (`danger: 3`, `elevation: 1200`). Travel checks and tables read them by key. Keys and values already used on the map are suggested as you type, and so are the names the loaded packs' tables read (the Grey Marches' `danger`, for example).
- **Fields** of a point of interest: each point of interest has its own (`rooms: 3`), kept with it; rules and tables read them on its cell as `place.poi.rooms` ([What tables see](../technical/04-what-tables-see.md)). With two in a cell, the first listed wins on the same name.
- **Made from**, on a point of interest a trip made from a system's [place template](../technical/07-kinds.md#places) (a discovered ruin): which one. It's edited like any other; changing the template later doesn't touch it.
- **Linked note**: a page of your notes app.
- The icon and the lines crossing the cell.
- **Ways into other maps**: the [sub-maps](13-sub-maps.md) under it (**Open**, with the cell it arrives at selected; **Go in ↗** on a trip with the party there), the way out at each of a sub-map's entrances (**Go out ↗**), **New sub-map here** and **Another way into…** a sub-map of this map (a tunnel's other mouth).

A gold dot marks cells with details you can't see on the map.

## Linked notes

Map doesn't store lore: it links to it. In **Preferences** (the gear at the top of any app) choose your notes app: SilverBullet (with its address) or Obsidian (with the vault name); a cell's or a POI's note is then a path like `My campaign/Hexes/0203` that opens there.

Going the other way, the cell link (the chain icon) pasted in a note opens the map on that cell.

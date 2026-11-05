# Icons and text

## Icons

The **Icons** tool (<kbd>I</kbd>) places one icon per cell: castles, villages, ruins, caves…

- Pick an icon (search it, or filter by category: party, terrain, settlements, landmarks, nature, danger, **modern** — vehicles, industry, emergencies — **sci-fi and wasteland** — ships, planets, robots, radiation — and misc), then click cells to place it. Below the icons, **Clicking a cell places** says which one you have picked, and **Id** its id (`game:castle`; imported images are `asset:<id>`), with **Copy ID**: what tables and conditions read as `icon.id` (`icon.id: game:castle`, whatever the language of its name). Hovering an icon shows its id too, and a selected cell's panel shows the id of its icon.
- Click a placed icon to edit it; drag it to another cell (it lands centered; <kbd>Shift</kbd> keeps a free position inside the cell). Right-click or <kbd>Delete</kbd> removes it, <kbd>Ctrl</kbd>+click copies an icon and its style.
- **Style**: color, size, rotation, flip, a halo behind it and an outline. New icons reuse the last style. **Auto** color draws dark ink on painted cells and light ink on empty ones, so icons always stand out.
- **Import** your own images (SVG, PNG, JPEG, WebP); they're saved inside the map.

Icons are named in the app's language; the search finds them by that name or by their English one (_puente_ or _bridge_ in Spanish). The icons come from [game-icons.net](https://game-icons.net) (CC BY 3.0).

### Values of an icon

Select a placed icon (click it with the Icons tool) to give it **fields**: a village with `guards: 0`, a fort with `guards: 2`. Tables rolled on its cell read them as `{{icon.guards}}` (and `{{icon.id}}` is the icon itself). The Grey Marches' oracle _Will they let us in?_ adds the guards of the gate you ask at.

## Text

The **Text** tool (<kbd>T</kbd>) writes free labels anywhere, even outside the grid: names of seas, mountain ranges, roads… Click empty space to add one, click a label to edit it and drag it to move it (with **Select** too, without changing tools). Font (IM Fell English, Cinzel or sans), size, color, rotation, italic and halo.

**Texts on the map**, below, lists every label with its font and size; clicking one selects it and centres the map on it, handy for labels far away, small or hidden under others (the Grey Marches' example map: The Grey Sea, Saltmere, Unknown lands).

## Cell names

A cell's name (set in the cell panel) is drawn under it, or above it when something is already under it (another cell's name, a free label, an icon, a connection's diamond or a way). Names are styled in two places:

- **Map settings → Map texts**: whether cell, region and token names are shown at all, and the style of each kind (font, size, color, italic and halo); choosing a [style](01-getting-started.md#styles) for the map sets them all at once.
- **Each element's panel** (the cell, the region, the token): **Show the name on the map** for that one, and **Style**: the map's style, or its own.

## Moving names by hand

Cell and region names place themselves, but you can put one where you want it: with **Select** (<kbd>V</kbd>), drag the name. It stays there, wherever the map changes around it, and no longer moves by itself; its panel (the cell's or the region's) says **Moved by hand**, and **Place by itself** puts it back. A click on a cell's name without dragging it selects its cell. Free labels are dragged the same way, and always stay where you put them.

For example, to write _The Greywood_ along the forest's northern edge instead of in its middle, drag it there; if you later paint more forest, the name stays where you left it.

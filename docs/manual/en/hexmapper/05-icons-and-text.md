# Icons and text

## Icons

The **Icons** tool (<kbd>I</kbd>) places one icon per hex: castles, villages, ruins, caves…

- Pick an icon (search it, or filter by category), then click hexes to place it.
- Click a placed icon to edit it; drag it to another hex (it lands centered; <kbd>Shift</kbd> keeps a free position inside the hex). Right-click or <kbd>Delete</kbd> removes it, <kbd>Ctrl</kbd>+click copies an icon and its style.
- **Style**: color, size, rotation, flip, a halo behind it and an outline. New icons reuse the last style. **Auto** color draws dark ink on painted hexes and light ink on empty ones, so icons always stand out.
- **Import** your own images (SVG, PNG, JPEG, WebP); they're saved inside the map.

The icons come from [game-icons.net](https://game-icons.net) (CC BY 3.0).

### Values of an icon

Select a placed icon (click it with the Icons tool) to give it **fields**: a village with `guards: 0`, a fort with `guards: 2`. Tables rolled on its hex read them as `{{icon.guards}}` (and `{{icon.id}}` is the icon itself). The Grey Marches' oracle _Will they let us in?_ adds the guards of the gate you ask at.

## Text

The **Text** tool (<kbd>T</kbd>) writes free labels anywhere, even outside the grid: names of seas, mountain ranges, roads… Click empty space to add one, click a label to edit it and drag it to move it. Font (IM Fell English, Cinzel or sans), size, color, rotation, italic and halo.

## Hex names

A hex's name (set in the hex panel) is drawn under it. Names are styled in two places:

- **Settings → Map texts**: whether hex, region and token names are shown at all, and the style of each kind (font, size, color, italic and halo).
- **Each element's panel** (the hex, the region, the token): **Show the name on the map** for that one, and **Style**: the map's style, or its own.

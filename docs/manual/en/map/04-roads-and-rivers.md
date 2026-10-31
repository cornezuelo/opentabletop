# Roads, rivers, walls, borders and connections

The **Roads and rivers** tool (<kbd>R</kbd>) draws lines from cell to cell.

## Kinds

| Kind   | Looks like                            | In a trip with rules             |
| ------ | ------------------------------------- | -------------------------------- |
| Road   | solid brown                           | what the system says (see below) |
| Trail  | dashed brown                          | what the system says             |
| River  | blue                                  | what the system says             |
| Wall   | thick, with stones, also across water | nothing: only drawn              |
| Border | dashed red, also across water         | nothing: only drawn              |

## What roads and rivers do when you travel

The map only says where each line goes. What it means for a trip is decided by the **travel rules of the system** the map plays (**Map settings → Campaign → System**), in its pack:

- **Speed**: each kind of line can have a speed multiplier. With the **Generic rules** a road is ×1.5 and a trail ×1.2, and a river changes nothing. With the **Grey Marches**, a road is ×1.5 and a trail ×1.2; another system may make them no faster at all.
- **Checks**: a system can skip a check while you follow a line. In the **Grey Marches** you don't roll to get lost when following a road or a river, nor meet encounters arriving by road; the Generic rules have no getting-lost roll at all.

Following a line means the route goes from cell to cell along it. To see or change what a system does, open its pack in the Oracle app (`connections` and `checks` in its travel rules); [Connecting tables to maps and trips](../oracle/07-connecting.md) explains them.

## Drawing

- Click cells one after another; cells in between are filled in with a straight line. Dragging draws freehand.
- <kbd>Shift</kbd>+click places the point where you click inside the cell (snapped to the center, edges or corners); add <kbd>Ctrl</kbd> for free placement.
- Click the last cell again, right-click or press <kbd>Enter</kbd> to finish. <kbd>Backspace</kbd> removes the last point, <kbd>Esc</kbd> cancels.
- **Straight segments** draws straight lines instead of curves; **Closed loop** joins the end to the start (handy for borders).

Roads, trails and rivers stop at the shore of lakes and seas; borders cross them.

## Editing

With no line in progress, the white handles are the points you placed:

- Drag a handle to move it, even to another cell (the line is re-routed).
- Click a handle to keep drawing from it: from an end it extends the line, from the middle it starts a branch.
- Right-click a handle to center it in its cell.

The cell panel lists the lines crossing the selected cell: switch them between curved and straight, open and closed, or delete them.

## Connections

The **Connections** tool (<kbd>C</kbd>, **⇄**) joins two places with something that isn't a line you follow: a bridge, a gate, a pass, a ford, or a way between two far cells (a tunnel, a ferry, a hidden path). Two far places joined by a connection become neighbours: a trip may go straight from one to the other in one step, as long as the cells between its ends at the map's scale (or its own **Length**), at its kind's speed and never the terrain's (it crosses none of the land between).

- Choose its **Kind** first: what the connection is, as the map's system names it. The box suggests the kinds the system declares and those the map already uses; a new word works too, and does nothing until a system says what it does.
- Click a place, then another: the connection joins them, drawn as a dashed line with a diamond in its middle. <kbd>Esc</kbd> or a right click drops one you've started.
- Click a connection to select it: its panel edits its **Kind**, **Name**, **Length (km)** when it joins far places (empty: measured on the grid, the number shown), **Tags** and values (`key` = `value`), and **Delete connection** removes it (or <kbd>Delete</kbd>). A right click on a connection deletes it too. Everything is undone with <kbd>Ctrl</kbd>+<kbd>Z</kbd>.
- The panel lists every connection on the map; clicking one selects it.
- On [floor](02-terrain.md), a connection between two neighbouring cells with a wall between them opens the wall: a **door** or an arch (its kind says what it costs and when it's shut). The wall is drawn with a gap where it is.
- While a trip is going on, one it can't cross now is greyed with its diamond crossed out, and its panel says what the trip made of it: [Connections in play](08-play.md).

What a kind of connection does in a trip is the system's, like roads: a speed, or skipping a check (`trip.connections: ford` in a condition reads the kinds of the step taken). Connections have a layer of their own in **Layers**, to show, hide or lock them.

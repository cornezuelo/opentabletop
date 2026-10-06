# Roads, rivers, walls and borders

The **Roads and rivers** tool (<kbd>R</kbd>) draws lines from hex to hex.

## Kinds

| Kind   | Looks like                    | In a trip with rules             |
| ------ | ----------------------------- | -------------------------------- |
| Road   | solid brown                   | what the system says (see below) |
| Trail  | dashed brown                  | what the system says             |
| River  | blue                          | what the system says             |
| Wall   | thick, with stones            | nothing: only drawn              |
| Border | dashed red, also across water | nothing: only drawn              |

## What roads and rivers do when you travel

The map only says where each line goes. What it means for a trip is decided by the **travel rules of the system** you play with (Play → Rules), in its pack:

- **Speed**: each kind of line can have a speed multiplier. With the **Generic** rules a road is ×1.5 and a trail ×1.2, and a river changes nothing. With **Kal-Arath**, roads and rivers don't make you faster.
- **Checks**: a system can skip a check while you follow a line. In **Kal-Arath** you don't roll to get lost when following a road or a river; the Generic rules have no getting-lost roll at all.

Following a line means the route goes from hex to hex along it. To see or change what a system does, open its pack in the Oracle app (`edges` and `checks` in its travel rules); [Connecting tables to maps and trips](../oracle/07-connecting.md) explains them.

## Drawing

- Click hexes one after another; hexes in between are filled in with a straight line. Dragging draws freehand.
- <kbd>Shift</kbd>+click places the point where you click inside the hex (snapped to the center, edges or corners); add <kbd>Ctrl</kbd> for free placement.
- Click the last hex again, right-click or press <kbd>Enter</kbd> to finish. <kbd>Backspace</kbd> removes the last point, <kbd>Esc</kbd> cancels.
- **Straight segments** draws straight lines instead of curves; **Closed loop** joins the end to the start (handy for borders).

Roads, trails and rivers stop at the shore of lakes and seas; borders cross them.

## Editing

With no line in progress, the white handles are the points you placed:

- Drag a handle to move it, even to another hex (the line is re-routed).
- Click a handle to keep drawing from it: from an end it extends the line, from the middle it starts a branch.
- Right-click a handle to center it in its hex.

The hex panel lists the lines crossing the selected hex: switch them between curved and straight, open and closed, or delete them.

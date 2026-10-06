# Roads, rivers, walls and borders

The **Roads and rivers** tool (<kbd>R</kbd>) draws lines from hex to hex.

## Kinds

| Kind   | Looks like                    | Travel                                             |
| ------ | ----------------------------- | -------------------------------------------------- |
| Road   | solid brown                   | faster travel along it                             |
| Trail  | dashed brown                  | a bit faster                                       |
| River  | blue                          | can be followed (some systems: you can't get lost) |
| Wall   | thick, with stones            | only drawn                                         |
| Border | dashed red, also across water | only drawn                                         |

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

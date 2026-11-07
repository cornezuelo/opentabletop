# Pieces

The **Pieces** tab edits the system's **catalogues of pieces** (`kind: pieces`): shapes of cells drawn in text, which a map grows with as the party goes. A party stands before a door nobody has opened, goes through, and the piece that comes up appears on the map, turned so that its way in meets that door. Its other exits are new doors nobody has opened.

It's one mechanism on any grid: a catalogue says whether it's drawn for squares or hexes, and a map lays the pieces of its own grid. Pieces work indoors and out: with exits, walls keep the party to them; a piece with no exits is laid on any empty cell the party steps into, as a tile.

## The tab

One catalogue at a time; **New catalogue of pieces** makes a small one and adds it to the system's **Overview** (`pieces:`, a list). A catalogue has:

- Its **Name** and its **Grid**: **Squares** or **Hexes**. Two catalogues may use the same ids on different grids, so one table serves both.
- Its **Marks**: what each mark of a drawing lays, by terrain id (`.` lays `stone-floor`). A terrain with **Floor** in the palette gets its walls by itself.
- Its **Pieces**, each by an **Id** (what a table names it with), with its **Name** and:
  - its **Drawing**, with the piece as it will look beside it. A mark a cell, a space for nothing, and an upper-case letter for each exit, on the cell **beyond** the piece, next to exactly one of its cells: that gives the exit's direction. On hexes each row stands half a cell from the next, so marks stand two characters apart;
  - its **Exits**, one per letter: the **Kind** of connection it leaves on the map, and **Way in** if the party may come in by it (with none ticked, by any);
  - **A room**: played as one place, one step in and one check, as a region ticked **Played as one place** is;
  - **May be turned**: on, it's turned and mirrored to fit; off, it's laid as drawn;
  - its **Contents**, what's rolled on coming in instead of the system's (`table.crypt-contents`);
  - its **Tags of its cells** and **Values**, read as `place.tags` and `place.<key>`.

## What chooses the next piece

**Checks → Discovering the map**: **Next piece** is a table or deck whose results say `set: { piece: <id> }`, **Starts with** the piece an empty map starts with, **Tries** how many rolls before giving up when what came up doesn't fit (3 if empty), and **Otherwise** the piece laid when none did. A piece of one cell always fits, so it makes a good **Otherwise**: without one, the party stays on its side of the door, and the journal says so.

The table sees what `discover.terrain` sees, plus the exit being crossed (`exit.kind`, `exit.tags`) and what has been laid on this map (`pieces.total`, `pieces.<id>`): _the third crypt is the last_, or _the tomb after eight pieces_. A deck works as it does everywhere: cards drawn stay drawn, so the place doesn't repeat itself.

## How a piece is laid

1. The party steps into an empty cell, through an exit or from any side on a map without walls.
2. The binding names a piece. Every way of laying it is tried, in a random order: each way in, each turn and mirror. A way fits when the cell the party entered is one of the piece's, the way in meets the cell it came from, and every cell falls inside the map on nothing.
3. If none fits, it's rolled again up to **Tries**, then **Otherwise**. A piece that would run off the map doesn't fit: the edge is rock.
4. Its other exits: one with nothing beyond it stays waiting; one that falls on floor opens there, a door between the two; one against anything else is dropped, silently, as a wall.
5. The step ends there: what's beyond was unknown, so no route went through it.

A laid piece stays, and is part of the map from then on: it can be edited in Edit, and <kbd>Ctrl</kbd>+<kbd>Z</kbd> doesn't undo it. Nothing is seen before crossing: an exit shows only its kind. A system wanting a look through a door has an action for it.

## Playing it

In Map, on a map whose system has pieces: **Play**, tick **Discover the map as you travel** and choose **Through exits, piece by piece**. It's chosen per map, so a system can discover its land cell by cell and lay its dungeons in pieces. Set a destination beyond a door, or a blank map's first cell, and march.

The Grey Marches' _Deep Barrows_ show all of it, on a map under the Barrow-halls; Core's _Rooms and passages_ are the smallest that works, on squares and on hexes. For the syntax, see [Kinds](../technical/07-kinds.md#pieces).

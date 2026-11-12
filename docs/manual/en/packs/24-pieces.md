# Pieces

The **Pieces** tab edits the system's **catalogues of pieces** (`kind: pieces`): shapes of cells drawn in text, which a map grows with as the party goes. A party stands before a door nobody has opened, goes through, and the piece that comes up appears on the map, turned so that its way in meets that door. Its other exits are new doors nobody has opened.

It's one mechanism on any grid: a catalogue says whether it's drawn for squares or hexes, and a map lays the pieces of its own grid. Pieces work indoors and out: with exits, walls keep the party to them; a piece with no exits is laid on any empty cell the party steps into, as a tile.

## The tab

One catalogue at a time; **New catalogue of pieces** makes a small one and adds it to the system's **Overview** (`pieces:`, a list). A catalogue has:

- Its **Name** and its **Grid**: **Squares** or **Hexes**. Two catalogues may use the same ids on different grids, so one table serves both.
- Its **Marks**: what each mark of a drawing lays, by terrain id (`.` lays `stone-floor`). A terrain with **Floor** in the palette gets its walls by itself.
- Its **Pieces**, each by an **Id** (what a table names it with), with its **Name** and:
  - its **Drawing**, with the piece as it will look beside it. A mark a cell, a space for nothing, and an upper-case letter for each exit, on the cell **beyond** the piece, next to exactly one of its cells: that gives the exit's direction. On hexes each row stands half a cell from the next, so marks stand two characters apart;
  - its **Exits**, one per letter: the **Kind** of connection it leaves on the map, **Way in** if the party may come in by it (with none ticked, by any), and **New map** if it leads into a map of its own ([below](#an-exit-into-a-new-map));
  - **A room**: played as one place, one step in and one check, as a region ticked **Played as one place** is;
  - **May be turned**: on, it's turned and mirrored to fit; off, it's laid as drawn;
  - its **Contents**, what's rolled on coming in instead of the system's (`table.crypt-contents`);
  - its **Tags of its cells** and **Values**, read as `place.tags` and `place.<key>`.

## What chooses the next piece

**Checks → Discovering the map**: **Next piece** is a table or deck whose results say `set: { piece: <id> }`, **Starts with** the piece an empty map starts with, **Tries** how many rolls before giving up when what came up doesn't fit (3 if empty), and **Otherwise** the piece laid when none did. A piece of one cell always fits, so it makes a good **Otherwise**: without one, the party stays on its side of the door, and the journal says so. **Kept open** keeps the place from closing by chance: a piece that would leave no exit waiting anywhere on the map doesn't fit, so it's drawn again (always, or while a condition holds: `pieces.total: { lt: 8 }`, open until eight are laid, then it may end).

The table sees what `discover.terrain` sees, plus the exit being crossed (`exit.kind`, `exit.tags`) and what has been laid on this map (`pieces.total`, `pieces.<id>`): _the third crypt is the last_, or _the tomb after eight pieces_. A deck works as it does everywhere: cards drawn stay drawn, so the place doesn't repeat itself.

## How a piece is laid

1. The party steps into an empty cell, through an exit or from any side on a map without walls.
2. The binding names a piece. Every way of laying it is tried, in a random order: each way in, each turn and mirror. A way fits when the cell the party entered is one of the piece's, the way in meets the cell it came from, and every cell falls inside the map on nothing.
3. If none fits, it's rolled again up to **Tries**, then **Otherwise**. A piece that would run off the map doesn't fit: the edge is rock; kept open, nor does one that would leave no way on.
4. Its other exits: one with nothing beyond it stays waiting; one that falls on floor opens there, a door between the two; one against anything else is dropped, silently, as a wall.
5. The step ends there: what's beyond was unknown, so no route went through it.

A laid piece stays, and is part of the map from then on: it can be edited in Edit, and <kbd>Ctrl</kbd>+<kbd>Z</kbd> doesn't undo it. Nothing is seen before crossing: an exit shows only its kind. A system wanting a look through a door has an action for it.

## An exit into a new map

An exit with **New map** ticked leads somewhere else: a stair further down, the way out of a level into the next. When its piece is laid, a new map is made, a [sub-map](../map/13-sub-maps.md) hanging from the piece's cell beside the letter, its way of the exit's **Kind**. It's blank and drawn like the map it hangs from (its grid, scale, palette and style), in the same campaign, and kept in **Maps**. It's named as the exit says (**New map's name**), else after the map above (_Below The Deep Ways_), with a number if a map has that name already.

The party takes it as any way into a sub-map, with **Go in ↗** on that cell; the trip goes on there and its first piece is laid under the party, the same way, so a place can go down level after level. The new map has its own [sheet](07-sheet.md) if the system has one for each map (its values start again). Such an exit is never a way in, and leaves nothing on the cell beyond. A result can make the same way where the party stands, with no piece: `place.ways.<kind>: 1` (the way out of a level, found by a check in the room the party is in). While a piece kept open is laid, a way into a new map counts as a way on.

## Playing it

In Map, on a map whose system has pieces: **Play**, tick **Discover the map as you travel** and choose **Through exits, piece by piece**. It's chosen per map, so a system can discover its land cell by cell and lay its dungeons in pieces. **Start playing** puts the party on a blank map, with the first piece under it. An arrow marks each exit nobody has crossed: click beyond it, or walk with the arrow keys, and what lies there is laid.

The Grey Marches' _Deep Barrows_ show all of it, on a map under the Barrow-halls, with _A stair further down_ into _The deeper barrows_; Core's _Rooms and passages_ are the smallest that works, on squares and on hexes, their _Stairs down_ into a level below. For the syntax, see [Kinds](../technical/07-kinds.md#pieces).

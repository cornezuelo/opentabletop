# Rolling

Open a definition and press **Roll** (or **Draw** for a deck). <kbd>Space</kbd> or <kbd>Enter</kbd> rolls again.

## The result

The result card shows the text, the values the entry sets (e.g. `weather: storm`), the dice with each roll (discarded dice crossed out) and, under **Details**, the results of every table the roll went through. The rolled entry is highlighted in the list below.

## Context

Some definitions read values: the terrain, the season, a modifier… The **Context** box lists the ones a definition (or any table it rolls) needs, by name (_Holidays_, _Guards_…), with what each one is and its key (`{{icon.guards}}`) in its **i**, and the values seen in its conditions as suggestions. The apps name the values maps and trips give; a system names its stats and the other values its tables read (`reads:` in its bindings, see [Connecting](07-connecting.md)). Blank means unknown. An oracle's input (e.g. the odds) is a list here.

In the Hexmapper these values come from the map and the trip; see [The Oracle in the map](../hexmapper/09-oracle.md).

## Roll modes (advantage and others)

Some tables can be rolled in more than one way: a **roll mode** rolls the whole roll several times and keeps one total. Which modes exist, what they're called and what they do is up to each system: Core has **Advantage** (twice, keep the higher) and **Disadvantage** (twice, keep the lower); the Grey Marches add **Carefully** (three times, keep the middle one) for the ford. A table that offers modes shows a choice next to **Roll**; its **i** says what each one does. The result card shows the totals that weren't kept.

Some tables also use a mode **by themselves** when a condition holds, whether you roll them by hand or a trip does. In the Grey Marches, _Do we get lost?_ rolls with advantage under clear skies and with disadvantage the day after getting lost; with both, they cancel out and it's a normal roll. How to declare modes and use them: [Kinds of definition](../technical/07-kinds.md#roll-modes).

## Decks and once-only entries

A deck shows how many cards are left and has **Shuffle**. Entries marked `once` can only come up once. **New session** (in the history) forgets both: every card goes back and once-only entries are available again. **Clear** empties the history.

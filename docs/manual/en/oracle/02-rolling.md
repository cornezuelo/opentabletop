# Rolling

Open a definition and press **Roll** (or **Draw** for a deck). <kbd>Space</kbd> or <kbd>Enter</kbd> rolls again.

## The result

The result card shows the text, the values the entry sets (e.g. `weather: storm`), the dice with each roll (discarded dice crossed out) and, under **Details**, the results of every table the roll went through. The rolled entry is highlighted in the list below.

## Context

Some definitions read values: the terrain, the season, a modifier… The **Context** box lists the ones a definition (or any table it rolls) needs, with the values seen in its conditions as suggestions. Blank means unknown. An oracle's input (e.g. the odds) is a list here.

In the Hexmapper these values come from the map and the trip; see [The Oracle in the map](../hexmapper/09-oracle.md).

## Advantage and disadvantage

Tables whose system rolls them that way (they say `advantage: true`) offer **Normal / Advantage / Disadvantage**: roll twice and keep the higher or the lower total.

Some tables also take advantage or disadvantage **by themselves**, when a condition holds (`advantageWhen`, `disadvantageWhen`), whether you roll them by hand or a trip does. In the Grey Marches, _Do we get lost?_ rolls with advantage under clear skies (`advantageWhen: { weather: clear }`) and with disadvantage the day after getting lost (`disadvantageWhen: { yesterday.lost: true }`); with both, they cancel out and it's a normal roll. Kal-Arath's Explorer works the same way (`advantageWhen: { explorer: { gte: 1 } }`, with `explorer` a party stat). The form has them under the dice as **Advantage when** / **Disadvantage when**, in the same one-line conditions as entries.

## Decks and once-only entries

A deck shows how many cards are left and has **Shuffle**. Entries marked `once` can only come up once. **New session** (in the history) forgets both: every card goes back and once-only entries are available again. **Clear** empties the history.

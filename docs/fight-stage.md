# The fight as a stage

A proposal for the fight's UI/UX, after [fight-ux.md](fight-ux.md) was built and the user still found it confusing. **Decided with the user (2026-11-14, "lo que recomiendas pa ambas": the recommended answer to each question of section 3) and built the same day.**

The ask (author, 2026-11-14): "la UI y UX sigue dejando mucho que desear, molaría feedback inmediato ya que abres dialog cuando se tira, con el resultado, y antes de tirar, por qué se está tirando. La mirada ya está centrada ahí, y el cuadrito donde se libra el combate sigue siendo confuso de la ostia"; "te había pedido un scroll con todo el diario de la batalla".

## 1. What there is today

Seen in the built Travel app (a Grey Marches trip, the party played as a whole, three enraged wolves, **Who rolls the dice** on _my own rolls_), 2026-11-14:

1. **A fight squeezed into a side column.** The fight panel lives in the trip's panel, about 370 px wide, between the trip's status (above) and the trip's tabs (below, with the journal again). It scrolls inside a column that scrolls too; the cards fill it, and the fight's own log falls below the cards, out of sight. In Map it's the same panel, widened a little.
2. **Its head is three rows of tools**: the title, **Rolls** with its select, **End the fight**. The eye starts on settings, not on the fight.
3. **Values look like a form.** Each card's main value is drawn as a text box (`9`, `3`), the party's with no name at all: it reads as something to type into, not as a wolf's health.
4. **Dice without consequences.** A wolf's turn shows _Grey wolf 2 goes for the weakest of you → party_ and a die, `4 = 4`, and nothing of what it did (whether it bit, what the party lost). The log's moments say the same: the table's text and its dice.
5. **Words the player shouldn't see**: `→ party` (an id), English names of copies and tables in the Spanish UI (_Pack leader_, _A wolf's turn_: the pack's texts without their translation where a name is built from the template).
6. **Buttons that look disabled**: **Next** and **Fall back** are drawn grey.
7. **Two journals**: the fight's log under the cards, and the trip's **Journal** tab right under it, both with the same moments.

## 2. Proposal: a stage of its own

When a fight starts, it takes the main area, as a stage, not a box in a column; when it ends, the trip comes back as it was.

- **Where**: in Travel, the whole middle (the way's editor isn't needed during a fight); in Map, a layer over the map (the map dimmed behind it, as the dice table), its tokens still visible at its edge; in Campaign's scenes, the scene's middle. The trip's panel stays as it is, the fight no longer inside it.
- **Layout**, three bands:
  - **Top: the round and whose turn**, in one line (_Round 2 · Kael's turn_), with **Rolls** and **End the fight** as small controls at its right end.
  - **Middle: the table.** The foes' cards in a row across the top half, the party's along the bottom (the player's side near the player), large: name, the main value as its sheet draws it (a bar for health, never a box to type in), conditions as chips, what just happened to it (_−2_, flashing). On the party's turn, what can be done to a foe is on its card; the turn's other choices in a bar between the two rows.
  - **Centre of the table: the turn.** What's being rolled and why before it's rolled (_Grey wolf 2 goes for Kael: 1d6, a 6 drags him down_), the dice thrown on the table itself (the throw of the dice table, when it's yours; tumbling, when it's the computer's), then **what it did**, in one sentence and its changes (_Grey wolf 2 bites Kael: Health 5 → 4_), and **Next**. The eye stays there the whole fight.
  - **Right: the fight's whole log**, a column of its own, every turn from the first, newest at the bottom like a chat, scrolling, each turn one line with its dice small, unfolded on a click.
- **Words**: every name the player reads is a name (a copy by its template's name, translated; _the party_ for the party played as a whole), never an id.
- **The trip's Journal** keeps the fight as one moment once it's over (_A fight with three wolves: won in 3 rounds_), unfolded into its turns.

## 3. Decided

1. **Where it lives**: a layer over everything (the map, the trip, the scene dimmed behind it), in every host alike: the trip's panel puts it at the page's end (ui-kit's `portal`). **See behind** puts it aside for a while (a foe still asked for can then be clicked on the map), **Back to the fight** where it was brings it back; Map shows its Play panel while a fight lasts, so the stage it holds is there.
2. **The log**: a column at the right of the stage, oldest first and scrolled to the newest; under the table on a narrow screen.
3. **The computer's rolls**: tumbling on the table in the turn's centre, with what they did, no **Use**.
4. **A foe's turn**: its table's own words and whom it went for, its dice, then what it did (_Grey wolf: Health 4 → 1_), or _Nothing on the table changes_; the one acting is said once (not again when the table's words name it).

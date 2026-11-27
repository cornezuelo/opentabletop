# Cards on the table

Proposed on autopilot (2026-11-27) after the author's "algo chulo al estilo de los dados pero para cartas" and "¿por qué el tarot es una tirada de dados 1d2?"; **to agree with the author** from an interactive mockup before any code (backlog, _Next_ step 4 (e)).

## What there is

A deck's card already shows its face where it's drawn (ui-kit's `PlayingCard`: a pack's picture, or a face drawn from its parts; `CardSpread` for a hand or a spread laid out), upside down when its `turned` condition holds. A draw appears still, at once. Core's tarot comes out upright or reversed by a table of its own, _Which way up_, rolled with `1d2` inside each card: the reversal shows as a die.

## Proposed

1. **A draw played on a table, as the dice are thrown** (ui-kit, beside `DiceThrow`): the deck face down at one side with the cards it has left, what was drawn at the other. A click on the deck deals its top card to the middle; dragged, the card follows the hand and lands a little past where it's let go. On the way it turns over; reversed, it lands upside down. A short swish of paper, made by the browser (no files), under the same preference as the dice's knock.
2. **The draw is made first**, the table only shows it, as with the dice: nothing depends on where the card lands.
3. **Where it plays:** the Oracle's **Draw**, always (as its **Roll**); a draw waiting for the player in a trip, on the same table as their dice; the computer's draw at an important moment, watched (dealt by itself, before the moment is told). Elsewhere (the journal, a result card) the card shows still, as today.
4. **A spread** (a generator that deals a hand or the Celtic cross): its cards dealt face down to their places one after another, then turned by the player one by one, in any order, or **Turn all**; each card's text shows as it's turned. `across` cards lie across.
5. **Without motion** (the player's preference or the system's reduce motion), the cards are shown turned over at once.
6. **Shuffling** gathers the deck with a short riffle of its stack.
7. **A back**: a default back drawn in the theme's colours; a deck may give its own (`face.back`, an image of its pack).

## Cards drawn either way up (the engine)

A generic mechanism in place of a table rolled inside each card:

- A deck declares its cards come out either way up: `reversible: true` (half each), or `reversible: { chance: 0.25 }`. The draw decides it with the `RandomSource`, as it draws.
- A card may have its own text for when it comes out reversed (`reversed: '…'`); without one, its `result`.
- What the draw sees after: `card.reversed` (true or false), for conditions, tables the card resolves and effects; a reversed card is drawn upside down without a `turned` condition (`turned` stays for other reasons to turn a card, like the Grey Marches' hedge-witch's cards while the Wyrm's clock is at 4+).
- Core's tarot moves to it: _Which way up_ goes, each of the 78 cards gets its reversed meaning (en and es). A pack syntax change: `PACK_FORMAT` bumped if anything old would read differently (nothing does: the keys are new).

## Mockup

An interactive mockup of the three tables (the player's tarot draw, the trip's draw watched, the Celtic cross dealt and turned) was shown to the author.

## To decide with the author

1. The look and feel of the table, from the mockup.
2. Whether the Celtic cross' cards are turned by the player one by one (proposed) or all at once as they're dealt.
3. Each tarot card's own reversed meaning (proposed), or one shared word (_reversed_) added to its upright text.

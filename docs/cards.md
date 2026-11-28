# Cards on the table

Proposed on autopilot (2026-11-27) after the author's "algo chulo al estilo de los dados pero para cartas" and "¿por qué el tarot es una tirada de dados 1d2?", from an interactive mockup; **decided with the author the same day** ("está bastante guapo, lo único que haría es que el barajar se vea más visual… mínimo que se vean las cartas volver"): as proposed, with the shuffle made visible (backlog, _Next_ step 4 (e)).

## What there is

A deck's card already shows its face where it's drawn (ui-kit's `PlayingCard`: a pack's picture, or a face drawn from its parts; `CardSpread` for a hand or a spread laid out), upside down when its `turned` condition holds. A draw appears still, at once. Core's tarot comes out upright or reversed by a table of its own, _Which way up_, rolled with `1d2` inside each card: the reversal shows as a die.

## Proposed

1. **A draw played on a table, as the dice are thrown** (ui-kit, beside `DiceThrow`): the deck face down at one side with the cards it has left, what was drawn at the other. A click on the deck deals its top card to the middle; dragged, the card follows the hand and lands a little past where it's let go. On the way it turns over; reversed, it lands upside down. A short swish of paper, made by the browser (no files), under the same preference as the dice's knock.
2. **The draw is made first**, the table only shows it, as with the dice: nothing depends on where the card lands.
3. **Where it plays:** the Oracle's **Draw**, always (as its **Roll**); a draw waiting for the player in a trip, on the same table as their dice; the computer's draw at an important moment, watched (dealt by itself, before the moment is told). Elsewhere (the journal, a result card) the card shows still, as today.
4. **A spread** (a generator that deals a hand or the Celtic cross): its cards dealt face down to their places one after another, then turned by the player one by one, in any order, or **Turn all**; each card's text shows as it's turned. `across` cards lie across.
5. **Without motion** (the player's preference or the system's reduce motion), the cards are shown turned over at once.
6. **Shuffling** is seen (the author: "no tiene por qué ser totalmente realista, pero mínimo que se vean las cartas volver"): the cards drawn, on the table and in the pile, go back face down onto the deck, then the deck is split in two halves that riffle back together.
7. **A back**: a default back drawn in the theme's colours; a deck may give its own (`back:`, an image of its pack).

## Cards drawn either way up (the engine)

A generic mechanism in place of a table rolled inside each card:

- A deck declares its cards come out either way up: `reversible: true` (half each), or `reversible: { chance: 0.25 }`. The draw decides it with the `RandomSource`, as it draws.
- A card may have its own text for when it comes out reversed (`reversed: '…'`); without one, its `result`.
- What the draw sees after: `card.reversed` (true or false), for conditions, tables the card resolves and effects; a reversed card is drawn upside down without a `turned` condition (`turned` stays for other reasons to turn a card, like the Grey Marches' hedge-witch's cards while the Wyrm's clock is at 4+).
- Core's tarot moves to it: _Which way up_ goes, each of the 78 cards gets its reversed meaning (en and es). A pack syntax change: `PACK_FORMAT` bumped if anything old would read differently (nothing does: the keys are new).

## Mockup

An interactive mockup of the three tables (the player's tarot draw, the trip's draw watched, the Celtic cross dealt and turned) was shown to the author.

## Decided

1. The table and the back as in the mockup.
2. A spread's cards are turned by the player one by one, in any order, or all with **Turn all**.
3. Each tarot card gets its own reversed meaning.

## Built

2026-11-27: oracle-engine's `reversible` decks (`true` or `{ chance }`, decided with the `RandomSource` after the card), a card's `reversed` text (overlays' `reversed:`), `reversed` seen by what the card leads to and in its value, a deck's `back`; the deck form's **Its back**, **Either way up** and **Reversed text**; Core's tarot moved to it (_Which way up_ gone, 78 reversed meanings in en and es), the Grey Marches' hedge-witch's cards one in four reversed, the Lantern read by its way up (_The Lantern_), their own back. ui-kit's `CardDeal` (the card table: the deck, a click or a drag dealing one card, a spread dealt face down and turned card by card or all, watched draws, the gathering and the riffle, a swish under **Sounds on the table**) and `layCards` / `landAt`; the Oracle's **Draw** and **Shuffle** play on it, and an important moment's cards (travel-ui's `cardsToWatch`) are dealt before it's told.

Then (2026-11-27, asked by the user: "¿por qué robar cartas no está implementado de la misma manera que las tiradas?"): the player's own draws in a trip. oracle-engine's `yoursCard` (a draw asks which card came out, `WantedDraw`: the cards the pile may give, each once with how many, its text and face, the deck's chance of reversal and back; the answer, `DrawnCard`, comes off the pile, which way up it says); session's hand gives cards as it gives totals (`Given`, `Wanted` with `draw`, `YourRoll.draw`, the `drawn` step); travel-ui's `YourDraw` (**Draw** on the card table, **⋯**: **Choose the card I drew…**, **Draw it for me**, **Let the computer roll from now on**). Lists by weight stay the computer's: they have nothing to roll.

Then (2026-11-28, from a mockup agreed with the author, backlog step 4 (k): "¿tiene sentido que para barajar tenga que salir del dialog?"): the card table in the page. ui-kit's `CardTable` (the Oracle's **Draw**, **Shuffle** and spreads on a table kept between draws: the last cards in sight, as many as can be read (`deckSpots`, three at most), the one before them on **Discards**, a spread dealt face down and turned there, the next draw gathering it first), built from the parts `CardDeal` now shares with it (`CardBack`, `TableCard`, `DeckStack`, `TableDialog`, `cardTexts`); the deck's top card lifts and glows under the pointer whenever it can be drawn from, and pulses only while a trip's draw waits for the hand. The result card no longer draws the card or the spread again under the table.

Then (2026-11-28, after playing it: "me saca hasta tres cartas como si fuera una mano en vez de ir descartando una tras otra"): a deck's draw keeps one card in play (`deckSpots(table, 1)`), each draw sending the one before to **Discards**; each definition has its own table (another deck never deals onto the cards of the one before); a card without a face is dealt with its words written on it (`PlayingCard` draws its label when the face has no parts), in the Oracle's table and its result card.

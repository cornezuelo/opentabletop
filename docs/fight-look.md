# The stage's look

A proposal for how a fight's stage looks, after [fight-stage.md](fight-stage.md) (where it lives) and [fight-turn.md](fight-turn.md) (what a turn says) were built. **Decided with the author (2026-11-15, "lo que recomiendes": the recommended answer to each question of §4) and built the same day**; §5 says what was built and what wasn't.

The ask (author, 2026-11-14): "la UI/UX de la aplicación a la hora de jugar, especialmente el combate, es muy mejorable"; its part about the look was left for a proposal of its own (fight-turn.md §1, 16–24, and §4.5).

## 1. What there is today

Played in the built Travel app at v0.59.0 (Spanish UI, 1500×950): a Grey Marches trip, two companions (Kael, Mira) against a bandit chief and two bandits, **Who rolls the dice** on _my own rolls_, to the fight's end.

**Room and size**

1. **The table is mostly empty.** It is some 1045 px wide and 750 px tall; three foes' cards fill 586 px of its width, each 190 px wide and 57 to 95 px tall. A band of 150 px above the foes and another under the party hold nothing.
2. **Names are cut**: _Cabecilla de los bandi…_ in a card with 400 px of empty table beside it.
3. **The cards move.** The foes' row sits at 221 px while the party chooses, 225 px while a roll waits and 241 px once it's told; the party's row at 632, 627 and 614 px. A card is 95 px tall with its action on it and 57 px without, so the whole row changes height from turn to turn.

**Who is who**

4. **One gold for everything.** The card of who acts has a gold frame; so has every foe that can be struck (three more gold frames, the same weight); so are the foes' bars, the buttons, the turn's line and the header. Sides differ only by a dashed border, which is lost as soon as the card is offered.
5. **While a turn is told, nobody is marked.** Who struck and who was hit are faded like everyone who has acted; the hit shows as a small `−2` beside a bar. With two of five acted and one gone, most of the table looks disabled.
6. **One who went is an empty box.** A foe that fled is a struck name in a card with no bar, as tall as its neighbours while they hold a button (an empty 95 px box) and short when they don't; the next round it's gone and the others close up.
7. **The numbers of the order** (2, 4, 5 across the top; 1, 3 below) say little: who is next is said only by **Next: …**.

**Words in place of design**

8. _Kael's turn: what's done to a foe is on its card_, under a header that says _Kael's turn_ already.
9. **The action's full name on every card** (_Strike one_, three times).
10. **A roll typed or thrown reads as text**: _rolled by hand = 2_, no die drawn, beside turns of the computer's that show theirs.
11. **The closing card speaks rules and stands alone**: _Bandit 2 leaves (Routed)_, _Bandit leaves (Down)_; the cards are gone from the table, so how the party ended (Kael at 3 of 4) is nowhere in sight.
12. **The log is one grey column**: each turn's sentence, its roll as _A blow: 2_, its outcome in bold, _And 1 more_. It reads, but a round is a wall of the same lines.

**Fixed on the way** (they said what wasn't so; no decision needed): a foe whose turn a moment took (its nerve broke) was told as _does nothing → Mira_ over _turns tail and flees_; one who left was named by its template (_Bandit turns tail and flees_ on Bandit 2's turn).

## 2. Principles

1. **A side is a colour and a place**, the same everywhere a side shows (cards, the turn's card, the order, the log).
2. **Nothing moves but what changed.** Cards, the centre and the log keep their place and size for the whole fight.
3. **One mark each for the three that matter in a turn**: who acts, who is aimed at, who was changed. Nothing else is highlighted, and nothing that can be clicked is faded.
4. **Design before sentences**: what a control is for is said by where it is and how it looks; a line of instruction is the last resort.
5. **Generic**: nothing a system must add. Colours are the theme's tokens, names and words the system's own.

## 3. Proposal

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Round 2 · Kael's turn                       Rolls ▾   End the fight   Behind │
│ (K) ✓  (C) ✓  [M]  (B)  (B2)                                   ← the order   │
├──────────────────────────────────────────────────────────┬───────────────────┤
│ FOES                                                     │ THE FIGHT         │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐             │ Round 1           │
│ │ C  Bandit  │ │ B  Bandit  │ │ B2 Bandit 2│             │ ▌Kael strikes …   │
│ │    chief   │ │ ████░ 3/5  │ │ █████ 5/5  │             │   2 harm          │
│ │ fled       │ │        −2  │ │            │             │ ▌The chief flees  │
│ └────────────┘ └────────────┘ └────────────┘             │ Round 2           │
│                                                          │ ▌…                │
│          ┌──────────────────────────────────┐            │                   │
│          │ Kael strikes Bandit              │            │                   │
│          │ A BLOW   ⚁                       │            │                   │
│          │ 2 harm · Health 5 → 3            │            │                   │
│          └──────────────────────────────────┘            │                   │
│           [ Strike one ● ]  [ Fall back ]                │                   │
│                                                          │                   │
│ THE COMPANY                                              │                   │
│ ┌────────────┐ ┌────────────┐                            │                   │
│ │ K  Kael    │ │ M  Mira    │                            │                   │
│ │ ███░ 3/4   │ │ ███ 3/3    │                            │                   │
│ └────────────┘ └────────────┘                            │                   │
└──────────────────────────────────────────────────────────┴───────────────────┘
```

### A. Two sides, two colours

The party's side is the theme's accent, the foes' its danger tone (both tokens exist: the turn's card and the log use them already). A side's colour is on its band's label (an overline: _Foes_, and the party's own name, _The Company_, or _The party_), the top edge of each of its cards, its tokens in the order, its turns in the centre and in the log. A card's **bar** keeps the tones its sheet gives it (a sheet says when health is low; the side is not the bar's to say).

### B. Cards that keep their place

- The table is three rows of fixed height: the foes' band, the centre, the party's band. The centre takes what's left and scrolls inside itself when a turn is long; the bands never move.
- A card is wider (from 220 px, growing with the room up to 300 px; two to a row on a narrow screen as today) and always as tall: a name on up to two lines, never cut; the main value; a line of conditions as chips; a line kept for what just happened to it (`−2`, large, in the tone of the change, fading out on the next turn).
- **One who went stays where they were**, to the fight's end: the card dimmed, the name struck, and how they went as its one line in the system's words (_fell_, _fled_: the condition's `told`, else its name). The others don't close up or get numbered again. Read from the turns told (`tellFight` knows who went and how), so the engine's order is untouched.

### C. Three marks

- **Who acts**: the card lifted with a ring in its side's colour. It keeps the ring while its turn is told, until **Next**.
- **Who is aimed at**: while the player chooses, the cards that can be chosen take a ring in the foes' colour as they're pointed at (not all of them at once); once chosen, and while the roll waits, that card keeps it (today nothing says whom the dice are for but the sentence).
- **Who was changed**: the card shakes once, its bar slides to the new value and the change shows large on it. Without motion where the browser asks for less (`prefers-reduced-motion`).
- **Has acted** is a small check on the card's corner and in the order, not a faded card. Only one who went is dimmed.

### D. The order, in a strip

Under the header's line, the round's order as small tokens, left to right: each fighter's initial in a disc of its side's colour, who acts ringed and larger, who has acted checked, who went struck. A token's tooltip is the name; pointing at one marks its card. The numbers go from the cards. On a narrow screen the strip scrolls sideways.

### E. Choose in the centre, aim at a card

The turn's choices are all in one bar under the centre: those that need a foe and those that don't, as the system names them, each once. An action on a foe is **armed** (pressed in the bar) and then a foe's card is clicked: the card is the button, whole. When only one action on a foe can be taken it's armed already, so a strike is still one click, on the card. The line _what's done to a foe is on its card_ goes; an armed action says _Strike one: choose whom_ in its own tooltip and in the cards' labels for screen readers.

### F. The centre

- Its place and width are fixed (640 px); dice a size larger.
- **A roll of the player's is drawn as dice** once made, like the computer's: a typed total as one die showing it (or the total alone when it can't be a face), with a small _by hand_ mark, never as a line of text.
- The computer's rolls are thrown on the same table, without a hand (decided in fight-turn.md, not built yet).

### G. The log

A turn is one block with its side's colour at its edge and its sentence; its outcome under it; its rolls small, as dice glyphs with their total (`⚁ 2`), not _A blow: 2_; the rest folded as today. The turn in the centre is marked. A round's title sticks to the top of the column while its turns scroll.

### H. The end

The closing card takes the centre and **the cards stay** as the fight left them (the fallen struck, the party's bars where they ended), so _how it left them_ is seen, not listed. Who went is said in the words used during the fight (_The bandit falls_, _The bandit chief and Bandit 2 flee_), never _leaves (Routed)_.

### I. A face

Each card and each token of the order carries a disc with the fighter's initial in its side's colour. When pictures for characters are built ([character-pictures.md](character-pictures.md), decided), the disc shows the portrait; the stage needs nothing else changed then.

## 4. Decided

The recommended answer to each, the first given (2026-11-15).

1. **Side colours** (A): the theme's accent for the party and its danger tone for the foes (recommended); or a green and a red of their own, added to the theme; or no colour, sides told by place alone.
2. **One who went** (B): kept on the table, struck, to the fight's end (recommended); or leaving the next round as today.
3. **The order** (D): a strip of tokens on top, no numbers on the cards (recommended); or the numbers as today; or neither (only **Next: …** says who follows).
4. **Actions on a foe** (E): chosen in the centre's bar and aimed at a card, armed already when there's only one (recommended); or a button on every card as today, smaller.
5. **A face** (I): an initial in a disc until pictures exist (recommended); or nothing until then.
6. **Has acted** (C): a check, cards never faded but the gone (recommended); or faded as today.

## 5. Built

- **A** (the party's band and cards in the theme's accent, the foes' in its danger tone: a card's top edge, its face, the order's tokens, the band's name, the turn's card and the log; bars keep their sheet's tones), **B** (travel-ui's `FightPanel`: the table as three rows, the bands fixed and the turn scrolling inside itself; cards from 200 to 300 px, a name on two lines; `tellFight`'s `roster`, so one who went keeps their card, dimmed and struck, with the condition's name, to the fight's end), **C** (who acts lifted and ringed; who the turn is aimed at, `FightTurn.onId`, with a dashed ring; who was changed shaking once, the change large; a check for who has acted), **D** (the order as a strip of faces under the header, pointing at one marking its card; no numbers on the cards), **E** (the turn's choices in one bar; an action on a foe armed there, the foe's card the button, armed already when it's the only one), **F** (the centre 640 px wide; ui-kit's dice tray draws a roll by hand of one die as that die, marked _rolled by hand_), **G** (the log's rolls as small dice, what they were for in their tooltip; a round's title sticks while its turns scroll), **H** (the closing card in the centre beside the fight's last turn, the cards still on the table; who went in the words said as it happened), **I** (character-ui's `Face` and `initialsOf`).
- **Not built**: the computer's rolls thrown on the table without a hand (F's last point, left from fight-turn.md §5); a card as tall whatever it holds only up to a point (many conditions still make it grow); the portrait in the face waits for [character-pictures.md](character-pictures.md).

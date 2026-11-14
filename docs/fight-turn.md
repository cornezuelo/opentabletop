# A turn in one piece

A proposal for how a fight's turn is told, after [fight-stage.md](fight-stage.md) was built. **Decided with the author (2026-11-14, "lo que recomiendas, dale": the recommended answer to each question of §4) and built** with the mistakes found on the way (§1, _Wrong_); §5 says what was built and what wasn't.

The ask (author, 2026-11-14): "la UI/UX de la aplicación a la hora de jugar, especialmente el combate, es muy mejorable. Identifica puntos de mejora."

## 1. What there is today

Played in the built Travel app (Spanish UI, 1500×950): a Grey Marches trip, one character against a bandit chief and two bandits, **Who rolls the dice** on _my own rolls_; then Map's Play on the example map.

**Wrong: what the screen says and isn't so**

1. **_Nothing on the table changes_ after a killing blow.** A strike that waits for the player's roll is told from the moment the action was taken, which holds no result; what the roll did lands in a later moment, so the centre keeps saying nothing changed, before the roll and after the foe fell.
2. **_Bandit 2 has acted. Next: Bandit._** Bandit 2 had fallen and never acted; the character had. The line names the last foe marked done, not who acted.
3. **Raw ids**: _Moment: present.leave_ among a blow's results; `→ purse`, `→ caught` in the log's titles.
4. **_Whoever acts: Wounded_**, _Whoever acts: Dread +1_ in the log's chips: a role's name where the character's belongs.
5. **A roll of 1d1 asked of the player** (_roll 1d1 for A blow while falling back_): a roll with no chance in it.
6. **Disadvantage with one die.** The roll says _1d6 (with Disadvantage)_; the table shows one die and _1d6 = 2_: no dropped die, no word of why (a condition of the character's).
7. **Someone at 0 of 4, who _falls and has to be carried_, still takes turns and strikes**, their card unchanged. It may be the system's rule; it reads as a mistake.
8. **Roll it for me did nothing in sight** the first time on the spoils' roll, and worked the second (cause not found: a roll inside a roll under the same title, or a lost click).
9. **The first foe's turn is over when the stage opens**: the header says the character's turn while the centre tells the chief's blow.

**A turn doesn't read**

10. **A blow is eight lines of one weight**, said twice and out of order: _A blow: 2 harm, steel (Bandit 2: Health −2)_, _Bandit 2: Health 2 → 0_, _Bandit 2 falls_, _Bandit 2 leaves (Down)_, _A blow, at one of them._, _strikes Bandit 2_, _Moment: present.leave_, _Strip the fallen_.
11. **Dice say neither what they are nor what was needed.** `6 −0 = 6` and `1 = 1`: which is the attack and which the harm isn't said, `−0` is noise. On a roll of the player's, _1d6 = 2_ doesn't say hit or miss until **Use 2**.
12. **The result comes in a dialog over the stage**, covering the cards as they change.
13. **A roll is a form**: **Roll**, **Total**, **Apply**, **Roll it for me** and a link to a preference; **Put away** on the dice table isn't understood.
14. **Spoils interrupt the fight** with another roll in the same box; what they gave is in the log alone.
15. **A fight ends with nothing**: the stage goes, and a small card stays with a rules title (_Roll of A blow while falling back: … 1d1 → 1 [1] → caught_).

**The stage, to the eye**

16. Much empty room and small cards (190 px in a 1400 px stage), names cut short.
17. Everything the same gold: foes, the party, the foes' bars, the buttons; no colour per side, no picture, the one acting and the one aimed at not marked enough.
18. The cards jump up and down with what the centre holds; a fallen one's card goes and the others are numbered again.
19. Instructions in place of design: _Kael's turn: what's done to a foe is on its card._
20. The action's full name on every card (_Strike one_).
21. **Who rolls the dice?** fills the centre on the first turn, and is in the header too.
22. The log speaks rules (_Kael: A blow in Cell 1 (Plain): yours to roll (1d6)_) and files a blow under the moment that came after it.
23. The numbers of the order (1, 3, 4 / 2) explain nothing.
24. The computer's rolls have no weight.

## 2. Principles

1. **A turn is one thing**: from the moment someone's turn begins to the moment the next one's does, whatever happened (a choice, a roll waited for, what it did, what that set off) is that turn, told in one place.
2. **Never say what isn't known.** While a roll is waited for, the turn says it waits; _nothing changes_ is said only of a turn that ended with nothing changed.
3. **One sentence, then the rest.** What matters large (who, what, whom, how it left them); the rules lines folded behind it.
4. **A die says what it's for and what it means**, before and after it's rolled.
5. **The table stays in sight**: nothing covers the cards while they change.

## 3. Proposal

### A. A turn told across its moments

travel-ui's `tellTurn` reads a turn, not a moment: every line from that fighter's `ENCOUNTER_TURN` to the next one (or the fight's end), whichever moments they fell in. A turn has a **stage**: _choosing_ (the party's, nothing taken yet), _rolling_ (an action taken, a roll of the player's waited for: _Kael strikes Bandit 2…_ and the roll, no results), _told_ (what it did). The log files each line under its turn the same way, so a blow is never under the moment after it.

The header says the turn **shown**: while a foe's turn is told and waits for **Next**, it's that foe's; the first turn of a fight waits like any other, so the stage opens on the fight's start (who's here, who goes first), not on a blow already taken.

### B. One sentence, its outcome, the rest folded

A told turn is three layers:

- **The sentence**: who, what, whom (_Kael strikes Bandit 2_; a foe's, its table's words: _The bandit chief lands a heavy blow on Kael_).
- **The outcome**, large, one line: the main value's change of whoever was hit and what became of them (_2 harm · Bandit 2 falls_; _Health 3 → 1 · Staggers_; or _Misses_ / _Nothing changes_). Built from: the change to a fighter's main value; conditions gained or lost, in their `told:` words; someone leaving (said once: _falls_ and _leaves (Down)_ are one thing when the condition that made them leave has its words). The card hit shows the same change on its bar as it's said.
- **More**, folded (_And…_): every other line of the turn (other values, the system's `say` lines, what the turn set off: spoils, a clock), each once. A line that only repeats the sentence or the outcome (a result's text naming the same harm, the action's own `told:` twice) is left out; a moment is named in words or not at all.

### C. Dice that say what they are

- Each roll in a turn carries **its table's name** (_A blow_, _Harm_) as a label over its dice; a modifier of 0 isn't drawn; dropped dice (advantage, disadvantage, keep) are drawn faded beside the kept one, on the tray and on the dice table, with why when the system gives a reason (the roll mode's name, and the condition that brought it, when the step's `when` names one).
- **What the roll can give**, for a table with few rows (six at most): its rows as a small ladder under the roll, before it's thrown (`1–2` _Misses_ · `3–5` _A blow_ · `6` _A heavy blow_), the row it fell on lit as the dice settle. A longer table shows the row it fell on once rolled. Generic: the table's own ranges and texts, nothing a system must add.
- The computer's rolls on a foe's turn are thrown on the stage's centre as the player's are, without a hand (dice.md's first open question).

### D. The throw on the stage, not over it

In a fight a roll of the player's is thrown **in the centre of the stage**: ui-kit's `DiceThrow` takes a place to live in (inline) as well as its dialog; the cards stay in sight, and when the dice settle the turn goes to _told_ in the same place, no **Use** to press (the roll is the roll; it's applied as it settles) and no **Continue** but the turn's own **Next**. Outside a fight the dialog stays as it is.

### E. One button to roll

A roll waiting shows **Roll**, large, and a small **⋯** with the rest: **I rolled it: the total…**, **Roll it for me**, **Let the computer roll from now on**. **Put away** goes from a fight's throw. **Who rolls the dice?** is asked once before the first roll that could be the player's, as a small line in the header's **Rolls**, not a box in the centre.

### F. No roll without chance

A roll with one possible total (`1d1`, a fixed number, a table of one row with no dice in it) is never the player's: session's `isYours` says no, whatever the way of rolling.

### G. What a turn sets off

What follows a blow by itself (a moment when someone leaves, spoils, a clock) belongs to that turn's **More** and is told there with its changes as chips (_Silver +5 · Ration +2_). Its rolls are the computer's with _my own rolls_ and _the foes' too_, the player's only with _I roll everything_: they aren't the party's turn, nor a check that stops the trip.

### H. An end

When a fight ends, the stage stays for its **closing card**: how it ended (the foes fell, fled or were driven off; the party fell back; ended by hand), in how many rounds, who fell on each side, what the party lost and gained over the fight (each one's main value from start to end, conditions kept, things gained), and **Back to the trip**. The trip's journal keeps the fight as that one moment, unfolded into its turns (fight-stage.md §2).

## 4. Decided

The recommended answer to each (2026-11-14).

1. **A turn's by-products' rolls** (G): the computer's unless _I roll everything_ (recommended), or the player's whenever their table can give an important result (as today).
2. **The ladder of what a roll can give** (C): for tables of six rows or fewer (recommended), for every table, or never before the roll.
3. **The throw in a fight** (D): on the stage, applied as it settles (recommended), or today's dialog with **Use**.
4. **The closing card** (H): waits for **Back to the trip** (recommended), or shows for a moment and goes.
5. **The stage's look** (§1, 16–24: sides by colour, larger cards that keep their place, an order strip on top, the fallen kept struck): a proposal of its own after this one (recommended), or together with it.

## 5. Built

- **A** (travel-ui's `tellFight`: a turn from its `ENCOUNTER_TURN` to the next, its stage `choosing` / `rolling` / `told`; the log a line a turn under its round), **B** (the sentence, the outcome, **And N more**), **C** (each roll under its table's name, a modifier of 0 not drawn, the dice a roll mode didn't keep thrown and faded, the ladder of a short table: `ladderOf`, oracle-ui's `rowsOf`), **D** (ui-kit's `DiceThrow` `inline`), **E** (`YourRoll`: **Roll**, the rest behind **⋯**; **Who rolls the dice?** asked by the stage's top line), **F** (session's `hasChance`), **G** (session's `turnActions`: a roll of an action a moment took is the computer's unless the player rolls everything), **H** (the closing card).
- **§1's mistakes**: 1–5 and 8 (the second roll of the spoils looked like the first: it's the computer's now) fixed; 7 was the system's: the Grey Marches' `skip` takes the turns of a companion who fell, and their fights end when none is left standing (**The Company is overcome**); 9: the top line says the turn shown.
- **Not built**: why a roll mode applies (6: the dice are both thrown and how the mode rolls is said, _2 rolls, the lowest kept_, but not the condition that brought it: the engine doesn't say which `modeWhen` held); the computer's rolls thrown on the stage without a hand (C's last point: they tumble in the tray, as before); the first turn of a fight waiting like any other (9: a foe's turn before a turn of the party's still comes with it, told above the party's choice); the trip's journal keeping a fight as one moment (H's last sentence).

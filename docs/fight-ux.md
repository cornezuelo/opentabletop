# The fight reads well

A proposal for the fight's UI/UX, after play-ux.md's phase 4 (D). **To review with the user**; nothing is built until it's agreed.

The ask (author, 2026-11-14, playing the built apps): "queda superconfuso dónde hay que clickar, clicko abajo en unos botones que no parecen ni formar parte del combate, me pregunta a quién golpear, que elija arriba para seguir, y no veo ni dónde coño tengo que elegir"; "habría que plantearse traducciones a lenguaje natural de cosas como `characters.pack-leader.conditions.down: ahora sí`"; "tampoco queda muy claro el feedback de qué hace el jugador tras golpear o qué hace el enemigo cuando te golpea".

## 1. What there is today

Read from the code (`TripPanel`, `FightPanel`, `journal.ts`, `members.ts`); the built apps weren't played for this draft (the session couldn't start a local server or a browser).

1. **Three places for one turn.** In a fight the trip's panel shows, top to bottom: the fight (cards, _Kael's turn: choose what Kael does_), then a box for what the trip waits on, then the party's buttons in their groups. The fight's actions (**Strike one down**, **Fall back**) are among those buttons, under a group's name like any other, far from the cards.
2. **Choosing whom, backwards.** **Strike** asks whom (`ask: params.foe`): the trip waits, the box under the fight says _Whom do you strike?_ and _click their card in the fight_, and the foes' cards above turn into buttons, outlined. The question is below, the answer above, and nothing moves the eye up or makes the cards look clickable enough.
3. **Paths as words.** What a step changed is labelled by `memberName`, which knows the party's members, the party's sheet, `present.<template>`, factions and clocks. A copy named by its id (`characters.pack-leader.…`, what Strike and every `characters[params.foe]` effect write) isn't any of them: the label falls back to the path, and a condition set reads `characters.pack-leader.conditions.down: yes`. With no members at all (a party played as a whole) every character path does.
4. **A blow isn't told as a blow.** A turn is a moment of the fight's log (_Kael's turn_, the result's text, its dice, the changes as labels) and the card hit shows a brief _−4_. Nowhere is there one sentence saying who did what to whom and how it left them: _Kael strikes the pack leader: 4 harm, 8 → 4_. A foe's turn is the same: its table's text (_The foe strikes_) and a label (_Mara: Health −1_), apart.

## 2. Proposal

### A. A turn is played on the cards

On a turn of the party's, **the actions that take a foe are on the foes' cards**: each foe's card shows the buttons of the encounter's actions whose parameter lists those present (`from: present.ids`), _Strike_ on the wolf's card, _Strike_ on the bandit's. Clicking one takes the action with that foe already chosen: no question, nothing to look for. The actions that take no foe (**Fall back**, **Get up**) are in a bar inside the fight panel, under _Kael's turn_, with the rest of that turn's choices (a skill to strike with, `choices:` parameters, as selects beside the button).

The party's buttons below are hidden while a fight goes on (they're closed in a fight anyway, `encounter.actions`), so there's one place to look. A fight's own starters (**Stand and fight**, **Drive them off**) stay in the party's buttons when there's no fight.

If an action still asks whom after it's taken (asked by a step, `ask:`), the fight panel itself turns into the question: its header says _Kael strikes: whom?_, the cards that can be chosen are outlined and raised, the others faded, a **Cancel** beside it; the box under the panel says nothing.

### B. What changed, in words

Every character path is named: a copy present by its id (`characters.pack-leader`) by its name (_Pack leader_, numbered when there are several: _Grey wolf 2_), its values and conditions by its template's sheet; with or without members. A label never shows a path.

How it reads: a value _Pack leader: Health 8 → 4_; a condition gained _Pack leader: Down_, lost _Mara: no longer Rattled_ (as today for members). Optionally, a condition may say how it's told when gained and lost, in the pack's words and translated like every text (`told: { gained: '{{name}} falls', lost: '{{name}} gets up' }`): _The pack leader falls_. Without it, the generic form.

### C. Each turn told in one sentence

Each turn of the fight ends with **what it did**, one sentence built from its moment: who acted (whose turn), what they did (the action's name or the table's result), on whom (the one chosen, or the one a foe went for: `encounter.target`), and what it left (the main value's change and the conditions gained): _Kael strikes the pack leader — 4 harm (8 → 4)_, _The bandit goes for Mara: a blow, Health −1 (5 → 4), Rattled_. It's shown large under the cards for the turn just played (with its dice drawn), the card hit flashes its change, and the fight's log keeps it as the moment's title. A foe's turn that did nothing says so (_The wolf circles, snarling_).

### D. In Map

The same panel (Map's Play uses Travel's). Map's strip over the map says whose turn it is and, on the party's, _choose on the foes' cards_; the foes' tokens are clickable for the actions on their cards, as they are for choosing whom today.

## 3. To decide

1. **A**: the foe's actions on its card (recommended), or the action first and then the cards (today, but with the question in the fight panel)?
2. **B**: the conditions' own phrases (`told:`), or only the generic _Pack leader: Down_ for now?
3. **C**: the sentence built from the moment as described, or should a system be able to write it per action (a `told:` on actions too)?
4. Order: A, B and C as one phase or three.

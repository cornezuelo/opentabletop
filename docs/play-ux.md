# Playing reads well: a review of the UI/UX of play

**Status: decided with the author** (2026-11-13: "me vale todo lo que dices… el resto lo que tú sugieras"); §5 says how each question was settled. Built phase by phase, in the order of §4.

The ask (author, 2026-11-13): "ahora mismo es un cristo lleno de tablas y pestañas y no se lee muy bien absolutamente nada de lo que va pasando, ni queda muy claro todo lo que ocurre… Está bien tener automatismos, pero también sentir que estás jugando a algo y no lo está haciendo por ti el ordenador." Their ideas: the strip at the top redesigned, the fight panel, what happens "in your face", dice you can see, and rolling yourself when you want to.

## 1. What playing looks like today

Played in the built apps (dist-local, 1500×950, Spanish UI): the Grey Marches' example map in Map, from **Play** to three days on the road into the Hollow Hills; then a scene in Campaign, a fight against the pack leader.

**Getting into play**

1. **Play shows the cell, not the trip.** Switching to **Jugar**, the panel says _Click a cell to read it, or choose The trip on the left_: the trip is behind a compass icon on the rail.
2. **Starting a trip is among its settings.** **New trip** sits between the play mode (Simple / With rules), discovery, the trail and **Remove party**: what you set once and what you play are one list.

**What happens, and how it's told**

3. **One click is hours of play, told as small print.** **March** went 8 hours: three cells, a toll at the bridge (a ration, reputation), an omen (a pedlar), the weather. **Camp** went 16 hours: eating, a new day, weather, an omen that moved a clock. Each landed as one or two lines among ten in the journal, 12 px, newest first, the same weight as _You enter 0808 (Farmland, Road)_. Nothing on the map or in front of the eyes marked any of it.
4. **The strip over the map speaks rules, not story.** Its first row is facts (day, place, today's march, the way to the next cell, weather); its second row is the journal's newest line, cut short: _«Marchar» se detiene aquí: la marcha del día es 8 h: hace falta menos de…_, or after camping _Fatigue stays at 0, its minimum_. The omen that woke the wyrm's clock, the same step, wasn't there. The weather is shown by its id (_Clima: grey_, _clear_): untranslated.
5. **The journal mixes story and rules.** Its default view is **And the rules**: _"A la luz de las antorchas" no está en vigor_ beside the toll. The story lines are coloured, the rest plain; a reader still has to read all of it to find what mattered.
6. **A wall of equal buttons.** Nine actions in one column (march, forced march, camp, rest, forage, track, explore, a carter, wait), all alike; why one is greyed is a grey paragraph under them, in rules words.
7. **The panel is narrow.** At this window size the trip panel is some 290 px wide: its tabs don't fit and are a list (**Diario ▾**) from the start, and a party sheet with eight values wraps into a block of inputs.
8. **Going into a sub-map happens behind your back.** Marching on, the trip went into _The Hollow Hills_ (another map) and the map changed under the pointer; a toast at the bottom said which campaign it's in.

**Fights**

9. **The fight panel is a small box.** _Combat, round 1_; names as chips (_Jefe de la manada_ enemigos, **El grupo**); _The party's turn: choose what it does_. No one's health, no wounds, no conditions: to know how the pack leader is, open **Party → Here → its card**.
10. **A turn's result is out of sight.** **Strike one** asks _Whom do you strike?_ in a dashed box with one button per foe; chosen, the round is over at once: my blow (_A blow: 2 damage_) and the wolf's turn (_goes for the weakest of you_) are journal lines, in the **Journal** tab, under the party sheet if **Party** is open. What the wolf did to whom isn't said where you look.
11. **Dice are text.** A roll is `1d6 → 5 [5]` inside a journal line's details. Rolling the foes by hand exists (**Options → Roll the foes by hand**: type a total, or **Roll it for me**); the party's rolls and every other check are always the computer's.

What works and stays: the trip's rules are right and complete; pauses wait for **Continue**; the journal keeps everything, searchable and exportable; what waits is outlined; tokens move on the map; the fight order is shown.

## 2. Principles

1. **Something happens → you see it happen.** Each step of play is told as one **moment** (a _beat_): what you did, what came of it, what it cost. The journal is its history, not where you go to find out.
2. **Story first, rules on demand.** Every beat shows the fiction (the toll, the pedlar, the wolf's bite) and the changes (−1 ration, +1 reputation) in plain words; the rules behind it (why a march stopped, what was skipped) are one click away, never in the way.
3. **What matters stops you.** A pause, a fight, someone falling, a place found, a clock filling: these come to the front of the screen and wait. Small things (entering a farmland cell) stay small.
4. **Dice are seen.** Every roll that decided something shows its dice: the faces, kept and dropped, the modifier, the total, the row of the table it fell on.
5. **You may roll.** Any roll can be yours: the system says what to roll, you roll (on the table or on screen) and give the total, or let it roll. How much is yours is a preference, not a system's choice.
6. **One look tells the state.** Who's in the party and how they are (health, conditions), the time and weather, what waits: always visible, as tracks and icons rather than inputs.
7. **Generic as everything else.** No system's words in the UI: what's important, which value is a character's health, which rolls a fight makes, all come from what the system declares (or a documented default it can override).

## 3. Proposal

### A. Beats: one moment per step

Every step (an action, a march, a pause answered, a foe's turn) becomes a **beat**: a card with

- **its title**: the action or what happened (_Marchar · 8 h_, _El turno de Jefe de la manada_);
- **the story**: the results of tables, each with its dice (B below), in the order they came;
- **the changes** as chips: _Ración −1 · Reputación (Fort Keld) +1 · Reloj «The greywood wyrm wakes» +1_;
- **why**, folded: the rules lines of that step (skipped checks, limits reached).

The journal becomes a list of beats (folded to their title after the newest, unfolded on a click), **Story** by default, with **And the rules** / **Everything** kept as today. The session already marks what each step wrote (`latest`); a beat is that group, so this is presentation over today's journal, no format change.

**Important beats** come to the front: a beat that pauses the trip, starts or ends a fight, makes someone fall or gain a condition, finds a place, fills a clock or comes from the world is shown as a card over the map (Map) or above the panel's content (Travel, scenes), with its **Continue** (or the choice it asks) on it. What counts as important is decided by the kinds of lines (pause, encounter, a condition, a clock, a place), and a system may mark a table's result as important or not (`notable: true` / `false`, a new key, generic).

### B. Dice you can see

A shared **dice tray** component (ui-kit, or oracle-ui with the Oracle's roll panel using it too): each die drawn as its shape and face (d4, d6, d8, d10, d12, d20, d%, dF, d66), dropped dice faded (advantage, keep-highest), exploding ones chained, the modifier and total, then the row it fell on. A short roll animation, off with the system's **reduce motion** and with a preference. Drawn as flat SVG of our own (no 3D library: no new runtime dependency, readable at small sizes, themable).

Shown in each beat's results, in the Oracle's result card, and large in an important beat.

### C. Rolling yourself

A preference of the trip (Options), generalising **Roll the foes by hand**:

- **The computer rolls everything** (today's default);
- **I roll what matters**: the rolls of important beats (A) and of fights, the party's and the foes';
- **I roll everything** that a step rolls.

When a roll is yours, the step waits like a pause: the card says what to roll and why (_Encuentro en el camino: tira 1d20_), with a box for the total, **Roll it for me**, and, for those without dice at hand, **Roll** on screen (the dice tray rolls: you pressed it, you saw it). The total goes to the table as `total` already does for foes (oracle-engine's `resolve`); a roll inside a row (a blow's damage) is asked in turn. A roll by weight (no dice) is always the computer's.

### D. The fight view

While a fight goes on, the fight panel grows into the place where the fight is played:

- **Everyone as a card** in the order of play, party and foes apart: name, icon (the token's), the main track of their sheet as a bar (which value is the one to show: the sheet's `display` of its first track, or a new sheet key `main: health`), conditions as small pills with what's left (_Rattled 1_). Who acts now is large; who has acted is faded; who fell is struck.
- **The acting one's actions** as large buttons in the panel; when an action asks for a target, the foes' cards (and their tokens on the map) are what you click.
- **Each turn is a beat** in the fight's own log, inside the panel: the dice, the hit, the damage shown on the card hit (a brief _−2_ on its bar).
- **Foes' turns one at a time**: each foe's beat waits for **Next** (or plays on by itself with a preference, as today), so a round is read, not skipped.

### E. Pacing a march

A march of several cells moves the token **cell by cell** on the map (a short step each, at a speed set in Options: instant, quick, slow), each cell's beats appearing as it's entered, and stops on an important beat. Underneath, the step is still one action for the session (as today); only the telling is paced. Travel (no map) shows the way's line advancing the same way.

### F. The panel, reorganised

- **Play opens on the trip**, always (the cell is still a click on the map).
- **Top: where we are**, as today's strip but readable: time and season with an icon, weather as words and icon (translated), the place, today's march as a bar; then the **latest beat's title**, story first, clickable.
- **Then: what you can do**, grouped: **Move** (the system's moving actions with their _until_), **Time** (camp, rest, wait), **Here** (the other actions); why one is greyed shown on hover or in plain words (_Today's march is spent: camp, or march by torchlight when it's allowed_).
- **Then: the party at a glance**: each character a row with its main track and conditions (D), unfolding to the full sheet; the party's own sheet the same.
- **Settings out of play's way**: play mode, discovery, trail, new trip, remove party go to a **⋯ Trip settings** menu.
- **Wider when it matters**: the panel can be widened (drag its edge, remembered), and grows by itself during a fight.

### G. Small fixes found on the way (no design needed)

- The weather in Map's strip by its id (_Clima: grey_): translate it as the trip panel does.
- Going into another map: say it where you look (a beat, _You go down into The Hollow Hills_) rather than only a toast.

## 4. Order proposed

1. ✅ (2026-11-13: Map's `switchMode`; `TripStatus` in two rows, the last step's story lines (`lastStepEntries`, level story, three at most), the weather by the result that set it or its model's name; **New trip** primary with no trip; `strip.test.ts`, `tools.test.ts`; manual en/es: Play. Going into another map as a beat waits for A) **G** and **F**'s first two points (Play opens on the trip, the strip readable): small, and everything after builds on the top of the panel.
2. ✅ (2026-11-13: session's `markBeats` / `beatsOf` / `notableLines` (journal lines carry the moment they belong to, `beat`; a fight's round and each turn start one), oracle-engine's `notable` on entries and cards; travel-ui's `tellBeat`, `BeatView`, `NotableBeat` (in the panel's top, over the map in Map's strip), `beatsSeen` (put away, **Stop at every important moment**); the journal as moments, **The story** its default; Map's `MAP_ENTERED`; Packs' **Important**; Core's stairs, the Grey Marches' lights, Wyrm's omen and shrine's quiet hour; `beats.test.ts`, `encounter.test.ts`, `strip.test.ts`, `submaps.test.ts`; manual en/es: Playing a trip, Play, Kinds, Syntax, Editing, Checks, Core, the Grey Marches) **A**, beats and important beats: the base of everything else.
3. ✅ (2026-11-13: ui-kit's `DiceTray` (flat SVG of our own, `drawRoll`) and `dicePreferences` (**Dice tumble as they're rolled**, in every app's Preferences); the journal keeps each roll's dice (`RolledNode.results`); travel-ui's moments draw them under each result, large and tumbling up front; oracle-ui's result card; `diceTray.test.ts`, `beats.test.ts`; manual en/es: Rolling, Playing a trip, each app's header) **B**, the dice tray, in beats and the Oracle.
4. **D**, the fight view (uses A and B). D1 ✅ (2026-11-13: character-engine's sheet `main` and `mainValue`; character-ui's `CharacterGlance` (for F's party at a glance too) and `characterValueView`; session's `participant`, a fighter's `character`; travel-ui's `FightPanel` as cards by side, targets (`waiting.choices` as cards), the last step's change on the main value, the fight's moments; Map's `chooseOnMap` (a token clicked chooses it) and `shownPanelWidth` (wider while fighting); Packs' **Main value**; the Grey Marches' `main: health`; `fight.test.ts`, `character.test.ts`; manual en/es: Playing a trip, Play, Sheet, Kinds). D2 ✅ (2026-11-13: session's encounter stages `shown` / `onward`, `{ type: 'encounter', what: 'next' }`, `foesAtOnce`, `encounterView`'s `next`; travel-ui's **Next** in the fight panel and the strip (`tripWaits`), **Foes' turns at once** in Options; `encounter.test.ts`, `fight.test.ts`; manual en/es: Playing a trip, Play) the foes' turns one at a time.
5. ✅ (2026-11-13: session's `rollWay` (`matters` / `all`) and `yours` (a check whose table rolls with dice waits for the player's total, `CHECK_YOURS`; `{ type: 'rolled', id, total }`, a `resolveCheck` rolls it for them), a foe's turn rolled through it (the encounter's `rolling` stage, `foesByHand` and `what: 'roll'` gone); travel-ui's `YourRoll` (total, **Roll** on screen with the dice tray, **Roll it for me**, **Let the computer roll from now on**), **Rolls** in Options replacing **Roll the foes by hand**, the last choice for new trips (`opentabletop.trip.rolls`); Map's files keep `rollWay` and `yours`; `yourrolls.test.ts`, `encounter.test.ts`, `bestiary.packs.test.ts`, `waits.test.ts`, `journal.test.ts`; manual en/es: Playing a trip, Play, Editing, the Grey Marches. **Left:** a roll inside a row (a blow's damage) asked in turn: still the computer's) **C**, rolling yourself (uses A, B and D's waits).
6. ✅ (2026-11-13: travel-ui's `pace` (`startTelling`, `tellOn`, `tellingView`: the journal, the place and the time as told, what waits at the end) and `pacing` (**A march is told** in Options, `opentabletop.trip.pace`, quick by default; holds on an important moment for **Continue**; **Tell it all**; any step tells the rest at once); Map's `toldParty` (the token and trail follow the telling), Travel's way; `pace.test.ts` in travel-ui, Map and Travel; manual en/es: Playing a trip, Play, Checks, the Grey Marches) **E**, pacing a march.
7. The rest of **F**: grouped actions ✅ (2026-11-14: travel-engine's `groups` and an action's `group: groups.<id>`, validated; travel-ui's `buttonGroups` (no groups: as before, those that move first); Packs' **Groups of buttons** and an action's **Group**; the Grey Marches' four groups, Core's _Time_; `actionGroups.test.ts`, `buttons.test.ts`, `engine.test.ts`; manual en/es: Kinds, Connecting, Rules, Playing a trip, Core, the Grey Marches); the settings menu and the wider panel were already there (Options holds what's set once a trip; Map's panel widens by hand and in a fight); the party at a glance ✅ the same day (travel-ui's `PartyGlance` under the buttons, `mainChanges` shared with the fight's cards, `showInParty` (was `showPresent`) for a member or the party's own sheet too, `revealed`; character-ui's glance drawn, not clicked, so its card takes the click; the Grey Marches' Company `main: morale`; `buttons.test.ts`, `glance.test.ts`; manual en/es: Playing a trip, Play, Sheet, Kinds, the Grey Marches). **Every phase of §4 done.**

Each phase with its tests, manual pages (en/es) and the bundled packs showing it (the Grey Marches' notable results, Core's smallest example), as every feature.

## 5. Decided (2026-11-13)

The author agreed to the whole proposal and asked two things; the rest as proposed.

1. **Important beats in Map**: a card over the map, under the strip.
2. **What stops you**: every important beat shows; only pauses (and rolls that are yours) wait; a preference makes them all wait.
3. **Where the way of rolling is set** (author: "¿el modo de tirar dónde se configuraría?"): in the trip's **Options** tab, beside **Skip pauses**, as one choice of three (**The computer rolls** / **I roll what matters** / **I roll everything**), replacing **Roll the foes by hand**; each trip keeps its own, a new trip takes the last one chosen. A roll waiting for you offers the way back on the spot (**Let the computer roll from now on**).
4. **Where the fight is seen** (author: "¿el combate seguiría viéndose donde se ve?"): yes, where the trip is played, in its panel: it takes the panel's top (in place of the actions) and the panel widens by itself while it lasts, so in Map the map stays in sight and its tokens can be clicked as targets. Travel and Campaign's scenes show it in their main column, as today, with the room they have.
5. **Dice**: flat 2D faces of our own.
6. **A march's pace**: **quick** by default, **instant** a choice.
7. **The order**: §4.

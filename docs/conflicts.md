# Conflicts: combat and contests

**Status: decided with the user on 2026-11-12** (written the same day on autopilot; the answers are in section 6). Phase 1 is built; phases 2 and 3 are next. It answers point 9 of the user's eleven (backlog: _Conflicts (combat, chases, debates, contests), only if a generic machine falls short_) and the **Combat** gap the real systems found (Ker Nethalas first, Kal-Arath, The One Ring, Twilight 2000…).

The user's rule for it (2026-10-20): "lo implementaría solo si se demuestra que una máquina de estados genérica reutilizando Session y Character Engine no es suficiente". So this document first says what the tools already do, then the smallest additions that make a turn-by-turn fight playable, each one a generic mechanism a system declares, never a game's rule.

## 1. What already works

A fight played **as a whole**, the theatre of the mind with no turns, is possible today and the Grey Marches show it:

- **Who is there**: the party's characters, and the copies of a bestiary's templates a result made (`present.wolf: 3`), each a character with its sheet (`characters.wolf-2.values.health`), gone by themselves when a condition with `leaves: true` holds (_Down_ at health 0).
- **What the party does**: actions with steps (`effects`, `roll`, `ask`, `when`), open while someone is here (`when: { present.count: { gte: 1 } }`): _Drive them off_ (every foe takes `1d3`, whoever acts may be hurt), _Buy them off_.
- **What the world does back**: an action the system takes at a moment written as a condition (_The pack breaks_ once the leader is gone).
- **Rolls that read both sides** (since 2026-11-12): a table rolled by an action sees its `params`, and a part of a name can be named by another value, so one table can read whoever the player chose: `characters[params.target].values.combat`.
- **Opposed rolls** as a generator with two fields and a table comparing them (Ironsworn's action roll does this), damage dice kept (`3d6kh1`), exploding (`1d6!`), percentile doubles (`dice.doubles`).

So an abstract skirmish needs nothing new. What can't be played today is **a fight in turns**, which is what Ker Nethalas, Kal-Arath and most solo games need.

## 2. What a fight in turns needs that is missing

Read from Ker Nethalas' combat chapter (the most demanding of the eight systems), Kal-Arath's and Ironsworn's:

1. **An encounter that begins and ends**: a state of its own while the fight lasts (travel stops; the trip's actions that make no sense mid-fight are closed), and an end the system declares (no foes left, the party fled, all of it down).
2. **Turns and rounds**: who acts, in which order, and a round ending when everyone acted. Ker Nethalas: one opposed Initiative check, the winning side acts first until the fight is over. Kal-Arath: an AGI test. Others: each participant by its own roll.
3. **A target among those here**: the player chooses whom to strike, from those present now. Today `ask` offers only the choices written in the pack.
4. **Foes that act on their turn**: a template's own action table (Ker Nethalas' statblocks: a d6 of named attacks), rolled for each copy when its turn comes, with `acting` being that copy and `target` someone of the party.
5. **Values of the round**: what resets each round (Ker Nethalas' cumulative −20 to each further Reaction), as values of the day reset each day.
6. **Moments of the fight**: `encounter.start`, `encounter.round` (each round's start), `encounter.turn` (each participant's), `encounter.end`, for actions and checks to happen then (_at the start of the target's turn it takes D4 necrotic damage_).

The rest of a system's combat is **its own data**, written with what exists: attack and defence as an opposed roll (a generator), the Defensive Moves table, hit locations as a table, a damage pool keeping one die (`kh1`), armour that wears out (an item field that is `spent`), conditions (_Prone_, _Restrained_) with `blocks`.

## 3. Proposal: an encounter in the session

A generic **encounter state** in `session` (no new engine: the travel engine keeps the trip, the character engine the sheets; the encounter orders who acts and offers what they may do). A system declares how its fights go in its `kind: system`, under `encounter:`; a system without it plays fights as a whole, as today.

```yaml
# kind: system (an excerpt)
encounter:
  # Who acts first: by side (the party's or the foes'), or each participant by itself.
  order: { by: side, roll: table.initiative } # its results set { first: party } or { first: foes }
  # or: { by: participant, value: '{{self.values.agility + 1d6}}' } — highest first, read once
  # What a participant of the party may do on its turn: the system's actions marked for fights.
  actions: [actions.attack, actions.cast, actions.flee, actions.use-item]
  # What a foe does on its turn: its template's `actions` table (bestiary), or the system's.
  foes: { resolve: table.foe-turn }
  # Values reset each round, read as `round.<id>`, like values of the day.
  round: { reactions: { default: 0 } }
  # When it ends by itself: a condition read after every turn.
  ends: { any: [{ present.count: 0 }, { party.conditions: fled }] }
```

- **Starting it**: a step or an effect (`encounter: start`), from an action (_Fight_), a check (an encounter that's hostile) or a table's result. The trip stops moving; the journal opens a fight section; `encounter.start` actions run (an Initiative check is just one).
- **A turn of the party's**: the trip waits for the player, as `ask` does: the panel shows whose turn it is and the encounter's actions (with their own `when`, `blocks` and costs). A target is a parameter with **choices from the state**: `params: { target: { from: present.ids } }` (or `party.members`), so `characters[params.target].…` reads it.
- **A foe's turn**: the system rolls its table for that copy, `acting` being the copy, and a `target` the table names (`target: party.members.random`, `target: party.lowest.health`; the candidates-and-conditions mechanism of _Factions that choose_ when it exists). A player who wants to roll for the foes by hand gets the same waiting box.
- **Rounds**: when everyone has acted, `round.*` resets, `encounter.round` comes, and the order starts again.
- **Time**: a round takes the minutes the system says (`roundMinutes: 0.17`), so torches and clocks move.
- **Ending it**: `ends` holds, or a step says `encounter: end`. `encounter.end` actions run (loot, XP); the trip goes on.

What's kept: the encounter is play state, saved with the trip (`SessionState.encounter`), a format change with a migration that adds nothing to older trips.

## 4. The three levels, the system choosing

As agreed on 2026-10-29: (a) **the theatre of the mind** is this proposal; (b) **zones** (near, far, at the door) are places of the map's graph at battle scale, a sub-map with rooms or regions, range being steps between them: the same encounter, with a participant's place as part of its state and `target.distance` a fact; (c) **a tactical grid** adds positions on cells, spatial facts (adjacent, in range, line of sight, cover) and movement as an action at battle scale. (b) and (c) come after (a) works, each its own phase, and only if a system asks for it.

## 5. Phases

1. **Choices from the state**: a parameter's `from:` (`present.ids`, `party.members`), offered by `ask` and on the action's button. Useful outside fights too (whom to talk to, whom to heal). The Grey Marches: _Drive them off_ strikes one foe chosen.
2. **The encounter**: start, order (by side or by participant), the party's turns as waiting boxes, rounds, `round.*`, the four moments, `ends`. Travel and Map show whose turn it is; the journal tells it round by round. The Grey Marches: a fight with bandits in turns; Core: the smallest one (one attack action, foes that hit back).
3. **Foes that act**: a template's `actions` table rolled on its turn, with its target. The Grey Marches' wolves and the restless dead.
4. **Ker Nethalas' combat to the letter** with it (opposed attack and defence, Defensive Moves, hit locations, the damage pool, armour integrity, Reactions), noting what's still missing.
5. **Zones**, then **the grid**, only when a system needs them.

## 6. Decided with the user (2026-11-12)

1. **A fight in turns is worth it**: phases 2 and 3 are built; a system without `encounter:` still plays fights as a whole.
2. **The order** comes from `by: side` (a table's result says which side goes first) or `by: participant` (a value rolled once each); no ordering table of the system's own.
3. **Foes' turns are rolled by the system** by default (solo play); a user preference asks for each one with the same waiting box, to roll it by hand.
4. **A fight exists without a trip too**: the encounter is not the trip's alone; the Oracle and the Campaign app can open one (a scene with those present), as Travel and Map's Play do.
5. **A shared fight panel**: a component of its own in a `*-ui` package (the backlog's _Initiative tracker and combat ledger_), mounted by Travel, Map's Play, the Oracle and Campaign: whose turn, the round, those present and what each may do.

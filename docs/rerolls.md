# Rolling again: a value spent to roll one of your rolls again

**Status: proposal, to review with the user** (written 2026-11-28, on autopilot, for Kal-Arath's Fate Point; backlog: _Systems to finish_ → Kal-Arath (1)).

## 1. What the games ask for

| Game                                                                 | What it does                                                                                 | What it costs                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Kal-Arath                                                            | A Fate Point: once a session, roll **any one of your own rolls** again, the new one stands   | the point (1, the Mystic 2; _Visión de la Providencia_ 1d6 more for the session) |
| Year Zero (Twilight 2000, Forbidden Lands, Alien…)                   | **Pushing**: roll again only the dice that didn't succeed                                    | each 1 then rolled hurts (stress, damage, a round of ammunition)                 |
| Fate, Savage Worlds (bennies), Blades (devil's bargain is different) | a point spent to reroll, or to add after the roll                                            | the point                                                                        |
| Ironsworn                                                            | Burning momentum: not a reroll (the momentum replaces a die): another mechanism, noted apart | momentum reset                                                                   |

So: a **declared way of rolling again**, with a **cost**, a **condition**, and _what_ is rolled again (the whole roll; later, only the dice that failed).

## 2. Proposal

A system declares its ways of rolling again in its travel rules, as it declares its actions:

```yaml
rerolls:
  fate:
    name: Punto de Destino
    description: Repite una de tus tiradas; vale la nueva.
    # Who may: a member of the party for whom this holds (they pay).
    when: { acting.values.destino: { gte: 1 } }
    # What it costs, as effects on whoever pays.
    effects: { acting.values.destino: -1 }
```

- **Only the last step's rolls**, as at a table: once the trip goes on, the roll stands. The trip keeps the step it last played (the state before it and the action), nothing more: no history, no undo.
- **One roll of it**: the step is played again from the state before it, with **every other roll of it given as it came** (the same mechanism that already replays an action's steps with the totals the player gave, `handOf` / `given`), and the one chosen rolled anew. What came after it in that step (a result's effects, a fight started) follows the new roll.
- **Who pays**: the member the roll was for (`acting`), if the condition holds for them; a roll of the party's (a check at dawn), any member for whom it holds, chosen if several.
- Rolled by your own dice (**Who rolls the dice**), the new roll waits for you like any other.
- The journal keeps both: _Urth spends a Fate Point: 5 → 9_.
- **Later, not now**: `dice: failed` (pushing: only the dice that didn't succeed, and what each 1 then costs), when Twilight 2000 is built, with a dice pool that counts successes.

## 3. In play

```
┌ Trip ─────────────────────────────────────────────────────────┐
│ Prueba de Fuerza · Urth   2d6 + 2 → [2][3] + 2 = 7  Fallo      │
│                                         [↻ Punto de Destino ▾] │
└───────────────────────────────────────────────────────────────┘
```

- Under the newest roll (the notable beat over the map, the trip panel's journal), a **↻** button named after the way (**↻ Punto de Destino**), shown only while some member can pay; with several ways or several rolls in the step, a menu.
- It asks first (it can't be undone): _Urth spends a Fate Point to roll 7 again?_
- The dice are thrown again on the table, and the step's lines are told anew.

## 4. The bundled packs

- **Core**: a _Luck_ value on its sheet (1), and _Luck_ as a way of rolling again (the smallest example).
- **The Grey Marches**: the Company's _Fortune_ (`party.values.fortune`), won at shrines and lost by omens; spent by anyone to roll again a check of the trip, as a whole-party way (`when` on the party, not a member).
- **Kal-Arath**: the Fate Point (1, the Mystic's +1 when abilities come), back to 1 at each new session of the campaign's journal (a moment `session.start`, new: the journal's session begun).

## 5. To decide

1. Only the last step (recommended), or any roll still in the journal of the day (needs replaying everything after it: no)?
2. The new moment `session.start` for "once per session", or the point given back by hand (recommended: the moment, since the journal already has sessions)?
3. Its form in Packs: **Rolling again** in the system's rules, as cards like actions (name, when, effects).

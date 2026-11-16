# Tracks and scouting that matter

A proposal for the Grey Marches' **Look for tracks** and **Scout ahead** (backlog: _The Grey Marches: Look for tracks and Scout ahead do next to nothing_). **To review with the author**; nothing here is built.

The ask (author, 2026-11-15): "¿qué coño aportan las tiradas de buscar huellas y explorar el camino, están enlazadas a algún otro sistema?"

## 1. What there is today

- **Look for tracks** (an hour, where the place is dangerous) rolls _Tracks_, `1d6 + {{party.stats.survival}}`: _days ago_ (1–3) or _fresh, keep your eyes open_ (4+). Nothing reads either result.
- **Scout ahead** (half an hour by day, once a day) rolls _Scouting ahead_, a d6 at or under the skill chosen of whoever acts: the way is clear, morale +1; or nothing.
- The encounter check (_Who goes there?_, `1d6 + {{place.danger}}`) and a fight's order (`1d6 + acting.values.stealth` against `1d6 + acting.values.harm`) know nothing of either.

## 2. Principle

Only what tables, conditions and effects already do (the author's rule for Drive them off, 2026-11-15): conditions of the Company's sheet that hold for a while, a roll mode a table takes by itself when a condition holds (as _Do we get lost?_ under clear skies), an effect that says who goes first in a fight (`encounter.first`), an action that clears a condition on entering a place (as **Ground left behind**). Nothing new unless every system gains by it.

## 3. Proposal

### A. Fresh tracks: what walks here, and the Company forewarned

- _Tracks_ says **what** left them, by where the Company is: rows by terrain and region, as the encounter table has (wolves in the Greywood and the hills, boots of outlaws in the Hollow Hills and the marsh, nothing anyone knows elsewhere). The faint row stays as it is.
- A fresh row leaves the Company **Forewarned** (a condition of its sheet, until the next place entered: cleared as **Ground left behind** clears _Gave ground_).
- While **Forewarned**, the next fight begun here starts with the Company's turn (**Stand and fight**: `when: { party.conditions: forewarned }` → `encounter.first: party`), and the condition goes once that fight starts.

### B. A way scouted: the next step is safer

- A clear way leaves the Company **Scouted** (until the checks of the next place entered are rolled: the order of that moment's actions and checks to be looked at when building it), besides its morale.
- While **Scouted**, the encounter check rolls with a roll mode of its own, **Warned** (twice, the lower kept: a low `1d6 + danger` is the friendlier end of _Who goes there?_, travellers and patrols on 1–4, wolves, bandits and the Wyrm on 5 or more), so what's met on the road scouted is less often hostile. It's the same mechanism as _Do we get lost?_'s.

### C. Core

Core has no tracks or scouting: its **Explore** finds a landmark on a 6. Nothing to add; the smallest example of a condition that changes a roll by itself is already the Marches'.

## 4. To decide

1. **A and B as written** (recommended), or only one of them.
2. **Forewarned gives the first turn** (recommended), or advantage on the Company's first blow.
3. **Scouted makes the next encounter roll Warned** (recommended), or it lets the Company slip past what it meets on the next place (a **Slip past** action, leaving foes behind with no parting blow).

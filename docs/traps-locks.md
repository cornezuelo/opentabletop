# Traps, locks, containers and potions

A proposal for the backlog's _Then: back to Ker Nethalas' traps, locks, containers and potions_ (and the same line under _Systems to finish_). **To review with the author**; nothing here is built.

The author's rule for this work (2026-11-13): "espero que todo esto que estamos haciendo se ejercite también en marcas grises y no quede en desarrollos super específicos para ker nethalas". So: generic pieces first, the Grey Marches showing them at full power, Core the smallest example, Ker Nethalas to the letter last.

## 1. What Ker Nethalas asks (mechanisms only)

- **Once per room**: Scavenge once per room (some rooms allow three); a deep search for containers once per room. A room remembers what was done in it.
- **Doors and containers that may be trapped and locked**, found out in two phases: _Investigation_ (a Perception check at a random difficulty; passed, 7+ on a d10 means trapped and spotted; a d20 for the lock, doors 12+, containers 10+) and _Resolution_ (disarm, bypass or trigger a trap; pick a lock, breaking the pick and easing the next try, or force it, each try noisy and easier than the last). A trap triggers once and is gone. Failing to spot it, the trap is only known as it goes off.
- **Environmental traps**: a room may hold a trap (an event's 1–10), which goes off on anything done there but leaving by a corridor or a door.
- **A container found**, opened by the same steps; then 1–5 empty, 6–10 the Container Loot table.
- **Potions unknown until identified**: a Medicine check, or drinking it; once known, its aging (from turned to poison to made permanent).
- **Effects lasting a number of rooms**: Stoneskin and Strength for D10 rooms, invisibility for 5, a torch for 20, immunity to Sanity loss for 4.

## 2. What the tools have already

- **A connection's state in the trip** (`place.connections.door.state: barred`, an effect changing it, `passable: { unless: … }`): the Grey Marches' barred doors and **Force the door** use it. A door's lock is this.
- **Each map's own sheet** (`mapSheet`), its values and conditions kept per map: Ker Nethalas' Tension Die, rooms counted, lair found.
- **Those present** (`present.<template>: 1`): copies of a bestiary's templates where the party is, each a character of a sheet (values, conditions, tags), shown in **Here** with their cards, an action aimed at one (`target`), `present.leave` as one goes.
- **Items** from catalogues, with fields of the sheet's, places, containers (`holds`), counts and `spent`.
- **Conditions given for a while** (`lasts: rounds | turns`), counted down in a fight.
- **`trip.visits`**: times the party has been in this cell.

## 3. What they lack, and the proposal

### A. A place's own state: `placeSheet`

Nothing remembers what was done in a place: Scavenge once per room can only be `trip.doneToday` (wrong: per day, not per room), and a room's trap or a searched barrow has nowhere to live.

- **A sheet for each place** (`placeSheet:` in the system, as `mapSheet:`), kept per map in the campaign's play state for each place the party has touched (a cell, or a room as one place), never in the map's definition (principle 5).
- Read as **`place.values.<id>`**, `place.conditions`, `place.tags` beside the place's written values (`place.<value>` stays the map's: regions, cell); effects change it (`place.values.searched: 1`, `place.conditions.trapped: true`). A default may roll (`'{{1d10}}'`) or read what's written on the cell (`'{{place.danger}}'`), settled the first time the place is read.
- Shown in **Here**, under _This place_, as the sheet it is (only what differs from its defaults, so a place nobody touched shows nothing).
- Used for: **once per room** (`unless: { place.values.scavenged: { gte: '{{place.scavenges}}' } }`, a room's own count written on its region), an **environmental trap** (`place.conditions.trapped`, set by the room's event, cleared as it goes off), a container's **deep search** done.

### B. Things present that don't fight

Containers and traps are things in the place that have a state (trapped, locked, spotted, opened) and that actions are aimed at, which is what those present already are, but today everything present is a foe or a friend in a fight.

- **A template that doesn't fight**: `fights: false` on a bestiary template (default `true`, today's behaviour). Its copies are present (counted by `present.<template>.count`, shown in **Here** with their card and their actions), but a fight leaves them out (no turn, not a side, not counted by `present.count`'s fighting checks: Beset, Fight's `when`). `present.count` keeps counting everyone; a new `present.fighters.count` counts those that fight, and the bundled packs' Beset and Fight move to it.
- A **feature sheet** for them, the system's own (Ker Nethalas: `trapped`, `spotted`, `locked`, `trap`, `opened`; a die for the difficulty), with their `default` rolled as they appear (`trapped: '{{1d10 >= 7}}'`; `locked: '{{1d20 >= 10}}'`).
- **Actions aimed at one** (already: `target`, `needs`, `when: { target.conditions: locked }`), shown on its card as a foe's are in a fight: Investigate, Disarm, Pick the lock, Force, Open. A step can make it go (`target: leave`), with `present.leave` heard as today: an opened container leaves, rolling its loot.
- Doors stay connections: their lock and trap are the connection's state, with the same steps (`place.connections.door.state: trapped`), since a door has to be passable or not. A door's trap and lock rolled as it's met: an action `on: trip.place-enter` per door, as the Grey Marches' barred doors are laid.

### C. Items unknown until identified

- A catalogue item may be **held unknown**: `unknown: { name: An unlabelled flask, description: … }` in its entry. Given as `acting.items.<id>: 1` it's known; given as `acting.items.<id>.unknown: 1` it's held under that name, its true one hidden in the card, the journal and **Use**.
- Identifying is an effect: `acting.items.<id>.known: 1` turns one unknown into the item. Tables read `acting.items.<id>.unknown` (how many held unknown).
- A potion's **aging** (Ker Nethalas) is rolled as it's identified or drunk, by the action's own steps: a table whose rows change what the potion does (`set:` a factor its effects read: `'{{2d4 * potency}}'`), or turn it into another item (`acting.items.heal: -1`, `acting.items.poison: 1`). Nothing new for that.
- **Use** on an unknown item drinks it blind: the item's own action (`use:` on the catalogue entry, a list of steps, as an action's) runs, and it becomes known.

### D. Conditions that last a number of places

- `lasts: places` beside `rounds` and `turns`: given a number (`acting.conditions.stoneskin: '{{1d10}}'`), counted down as the party enters a place, gone at 0. The card shows what's left (_Stoneskin, 4 rooms_), as rounds today.
- The same unit for the party's sheet and the map's (a torch lit for 20 rooms is a party's condition).
- **The tracks and scouting proposal** ([tracks-scouting.md](tracks-scouting.md)) uses it: Forewarned and Scouted for one place, no clearing action needed.

## 4. In the bundled packs

**The Grey Marches** (every piece, interconnected):

- **A** — a ruin remembers being **delved** (**Delve the ruin** once per ruin, not once a day: `place.values.delved`), a camp-site remembers its fire (camping again where one was lit spares the firewood); a crypt whose sleeper woke stays **restless** (`place.conditions.restless`, set by its contents), so coming back to it rolls _The restless dead_ again.
- **B** — _A grave-goods chest_ (`fights: false`), its lock and its needle rolled as it appears in a crypt's contents; **Look it over** (Survival), **Pick it**, **Break it open** (noisy: _The noise of it_, as forcing a door), **Leave it**; opened, it leaves, rolling _Grave goods_. Beset and **Stand and fight** count fighters only.
- **C** — the hedge-witches' cordial found as _A stoppered flask_ in treasure: **Use** drinks it blind; **Taste it carefully** (a Survival check) knows it; one in six is spoiled (fatigue up, not down).
- **D** — Forewarned and Scouted (if decided as in tracks-scouting.md) last one place; a burning brand lights the Deep Barrows for 6 places.

**Core** (the smallest example of each): a **searched** place (`Explore` once per place), _A locked chest_ (`fights: false`, **Open it**, **Force it**), _A strange potion_ held unknown, and _Hidden_ lasting 3 places.

**Ker Nethalas** (private, to the letter): Scavenge and the deep search once per room (three in rooms that allow it); doors' trap and lock as connection state, rolled as met; containers as things present with the two phases; the Traps table as what goes off; environmental traps as the room's condition; potions unknown, Medicine to identify, aging on identifying; Stoneskin, Strength, invisibility and torches lasting rooms.

## 5. Phases

1. **D**, lasting places (the smallest, and tracks-scouting.md waits on it).
2. **A**, the place's sheet (Packs' form: **Place sheet** beside **Map sheet**; Here's _This place_).
3. **B**, things that don't fight (Packs' **Fights** on a template; the bundled Beset and Fight on fighters).
4. **C**, items unknown (Packs' **Unknown as** on a catalogue entry; the card's and **Use**'s names).
5. Ker Nethalas built with all four.

Each with its form, manual pages (Kinds, What tables see, Conditions' lists, Playing a trip, the packs' pages), tests that play it in the bundled packs.

## 6. To decide

1. **A place's state as a sheet of its own** (`placeSheet`, recommended), or as plain values with no declaration (`place.values.<anything>`, nothing to show bounds or names).
2. **Containers and traps as things present that don't fight** (recommended), or as the place's conditions only (simpler, but one room with two containers can't be told apart, and no card to aim at).
3. **`fights: false` with `present.fighters.count`** (recommended), or a condition on the system deciding who fights (`encounter.fighters: { unless: { tags: feature } }`, more general, one more thing to write).
4. **A potion's aging rolled when it's identified** (as the book; recommended), or when it's drunk.

# Checks

The **Checks** tab edits what is rolled on the way, the party's stats and, with a [sheet](07-sheet.md), what the characters bring to the party. It writes both the travel rules and the bindings, so you don't have to keep them in step: renaming a check takes its table along. This page explains how a check works, then each part of the tab, builds a stretch of wolf country from nothing step by step and lists the usual mistakes. Help next to each field explains it, with examples.

## How a check works

A check is a question the trip asks at a moment: _entering a forest, do the wolves find us?_, _at the end of a day without food, does the party tire?_ The [rules](05-rules.md) make the moments (the clock striking, a part of the day beginning, a hex entered, the day ending, an action taken); a check says at which ones it's asked, where, what answers it and what it changes.

- **When.** At each moment the trip passes, the actions the system takes **by itself** then come first, then the checks of that moment, **one by one, in the list's order**.
- **Whether.** Each check's **Only if** / **Skip if** is read just before it comes up, so it sees what came before it in that moment: the weather just rolled, a value of the day, another check's changes. When they don't hold, it doesn't come up; the journal's **Everything** says why (_Wolves doesn't come up: the way taken is road_).
- **What happens.** Its own **Changes** come first. Then it's **rolled on** its table (or oracle, generator, deck, weather model): the table sees the hex, the moment, the party's stats and supplies, and the check's **Extra context**. Its result goes to the journal, and what the result sets (values of the day, the weather) and changes (stats, supplies) reach the trip. With no table, the check is only a line in the journal, with its **Changes**.
- **Stopping.** A check never stops the trip unless it says so: **Pause after it**, or a result of its table that pauses (`pause: true` on an entry), stops the trip until the player presses **Continue**, and holds the rest of its moment until then. A wait it stopped goes on after **Continue**; a march it stopped waits for **Go on**, so you can look around first.

![One moment of a trip, entering a hex: the actions the system takes by itself, then each check in the list's order. One check as its moment comes: (1) its Only if / Skip if are read, and when they don't hold it's skipped, with the reason in Everything; (2) its own Changes; (3) it's rolled on its table, with its Extra context, or with no table it's only a line in the journal; (4) the result goes to the journal, with its values and effects, and Pause after it or a result that pauses waits for Continue. Then the moment's next check, which sees all of this.](check-moment.svg)

A check with no **When** is never asked by itself: an action's step asks it (`roll: checks.<its event>`), like the Grey Marches' foraging.

## Checks

Each check (**Add a check**) has:

- its id, under **Check** (`WOLVES`, `HUNGER`): the event the rules and the bindings know it by. Two checks with different tables or contexts need different ids;
- a **Name** and **Description** for players, shown in the trip panel and the journal instead of the event id;
- **When** it happens, written like in the YAML with suggestions: a clock such as `06:00` (as it strikes: said **At 06:00**), a part of the calendar's day such as `time.watch.middle` (as it begins: said **As Watches: middle begins**), `trip.hex-enter`, `time.day-end`, one of the system's actions such as `actions.camp`, a progress clock filling such as `world.clocks.the-greywood-wyrm-wakes.full` (said **When … fills**; however it fills, also by hand), or several separated by commas (the Grey Marches' encounters, `trip.hex-enter, actions.rest`). Empty: only when an action's step rolls it;
- **Only if** / **Skip if**: its conditions. E.g. the Grey Marches' getting lost, skipped on roads and rivers: `trip.edges: [road, river]`;
- **Rolled on**: what resolves it, any table, oracle, generator or deck, grouped by kind, or a weather model, under _Weather with inertia_. E.g. the Grey Marches' ford is rolled on an oracle;
- **Extra context**: values its table sees only for this check. E.g. `timeOfDay: night` to roll a night encounter on the day's table, or `danger: 3` as if the hex were more dangerous;
- **Changes**: its own effects. E.g. the Grey Marches' Not enough to eat: `party.stats.fatigue: 1`;
- **Pause after it**: stops the trip and waits for **Continue**.

**Checks of the same moment come one by one, in the list's order.** A check at dawn after the weather's with **Only if** `trip.weather: storm` comes up on a stormy dawn, today's storm and not yesterday's (the Grey Marches' _A stormy dawn_). A check that pauses, or waits for who rolls, holds the rest of its moment until **Continue** (see [what makes Continue appear](../travel/02-playing.md#the-trip)).

When the bindings still name tables for checks the rules no longer have (a check removed in the YAML), a note lists them and **Remove them** clears them.

The tables a check is rolled on go in the same pack (add them in the Oracle app, where your pack is listed too), or come from other packs by their full id (`core/weather`).

## Writing conditions

Conditions and context are written as `key: value` pairs, like in tables: `hex.tags: landmark`, `trip.edges: [road, river]`, `hex.danger: { gte: 3 }`, `hex.danger: { gt: '{{party.stats.stealth}}' }`. Every operator, variables and rolls: [Conditions](../technical/08-conditions.md); every piece of syntax at a glance: [Syntax](../technical/09-syntax.md); every value they can read: [What tables see](../technical/04-what-tables-see.md).

## Party stats

Numbers of the party, each with an id, a **Name** and **Description** for players and the value it **Starts at** (**Add a stat**; its `min` / `max` are written in YAML). The trip panel shows them and lets the player change them; tables read them in rolls (`1d6 + {{party.stats.survival}}`) and conditions (`party.stats.morale: { lte: 1 }`), and effects change them (`party.stats.fatigue: 1`).

With a party sheet, **From the sheets** can make a stat one of its values, always: `party: morale` (the Grey Marches' Morale, Fatigue, Hirelings and Endurance are the Company's). With a characters' sheet, it makes a stat of the characters' values while the party has any: `max: survival` (the best Survival), `min`, `sum`, `count: true`, `pick: charisma` (whoever the player chooses to roll, the best by default), with `when` / `unless` to leave some out. The Grey Marches' Survival: `max: survival, unless: { conditions: wounded }, none: 0`. Empty, the party keeps it.

Each stat's **Used by** lists the tables, actions and checks that read or change it, wherever it's written, by its full name or its short one ([Used by](04-overview.md#used-by)).

## Journey roles

The jobs the player gives the characters in a trip (the Grey Marches' **Guide** and **Lookout**), each with a name and description. Checks and tables read the holder as `roles.<id>.…`.

A role's **Used by** lists what reads its holder: the Grey Marches' guide is read by the table _Do we get lost?_, which no tab here shows otherwise.

## Supplies the members carry

With a sheet, names a supply of the rules and the value of the sheet each character carries it in (**Carried in**: the Grey Marches' food in `rations`), and how what the trip spends or gains is **Shared out** (evenly, or in order). The trip shows their sum.

## Step by step: wolf country

A system where the forests and hills belong to wolves: entering them by day the party may find their tracks and hurry on, tiring; camping there at night the pack may circle the fire; old standing stones on the way are worth stopping to describe; and a night without food tires the party too. Start from a new system: it begins as a copy of the Generic rules, which roll no checks at all (their day, the march and the food eaten each night: see [Rules](05-rules.md)).

1. **Create it**: type _Wolf Country_ under the system list and press **+**.
2. **Fatigue**: under **Party stats**, **Add a stat** and name it _Fatigue_ (its id becomes `fatigue`), **Starts at** `0`.
3. **Hunger**: **Add a check**, with **Check** `HUNGER`, named _Hunger_. **When** `time.day-end`; **Only if** `trip.below: food` (the Generic rules' **Eat** happens by itself as the day ends, before this check, and hits the minimum when there's no food left); **Rolled on** _— no table —_; **Changes** `party.stats.fatigue: 1`.
4. **The wolves' table**: in the Oracle app, **New definition**, a table in your pack _Wolf Country_ with the id `wolves`, named _Wolves_, rolled with `1d6 + {{night}}`: on `1-4` _Only the wind in the trees_; on `5-6` _Fresh tracks; you hurry on_, with **Changes** `party.stats.fatigue: 1`; on `7-8` _The pack circles the fire_, ticking **Pause** on that entry. By day `{{night}}` is nothing, which counts as `0`: the pack never comes.
5. **Wolves by day**: back in **Checks**, **Add a check**, with **Check** `WOLVES`, named _Wolves_. **When** `trip.hex-enter`; **Only if** `hex.terrain: [forest, hills]`; **Skip if** `trip.edges: road` (wolves keep off the roads); **Rolled on** _Wolves_.
6. **Wolves at night**: **Add a check**, with **Check** `WOLVES_AT_NIGHT`, named _Wolves at night_. **When** `actions.camp`; **Only if** `hex.terrain: [forest, hills]`; **Rolled on** _Wolves_, the same table; **Extra context** `night: 2`: at night the table rolls `1d6 + 2`, and one night in three the pack comes.
7. **Old stones**: **Add a check**, with **Check** `OLD_STONES`, named _Old stones_. **When** `trip.hex-enter`; **Only if** `hex.tags: landmark`; no table; tick **Pause after it**.
8. **Try it**: in **Try it**, make a way of six hexes: `plains`, `forest`, `forest`, `hills`, `plains` tagged `landmark`, `plains`, with a `road` from hex 3 to hex 4. Start a trip in summer, set **Food** to `1` in the trip panel, and march day after day, waiting for the next morning each time the march stops.

**What you'll see.** The first day the party enters the forest (hex 2) at 11:20: the journal says _Wolves: Only the wind in the trees_ or _Wolves: Fresh tracks; you hurry on (Fatigue +1)_. The march stops at 14:00 in the middle of the forest, and as the night comes the party camps there: _Wolves at night_ is rolled with `+2` (**Everything** shows the dice: `1d6 + 2`), and when the pack comes the trip stops (_Wolves at night at Hex 2 (Forest): paused, go on when you are ready_): **Continue**, and the night goes on. At midnight the party eats its last food. The second day: the next forest hex at 08:40, wolves again; the hills by the road, and no wolves (**Everything**: _Wolves doesn't come up: the way taken is road_); the old stones a little after 13:00: _Old stones at Hex 5 (Plains): waiting for you_. Press **Continue**, then **Go on**: the march goes on, and stops at 14:00. That night there's nothing to eat: _Food can't go lower than 0_, _There is nothing left to eat._ and _Hunger: Fatigue +1_. On the plains no wolves are rolled, by day or by night.

## The same in YAML

What the steps add to the Generic rules and their bindings, as the **YAML** tab shows them (an excerpt: the rest stays as it was), and the table, as the Oracle's YAML editor shows it:

```yaml
# travel.yaml: the rules (kind: travel-rules)
checks:
  - event: HUNGER # step 3
    name: Hunger
    at: time.day-end
    when: { trip.below: food }
    effects: { party.stats.fatigue: 1 }
  - event: WOLVES # step 5
    name: Wolves
    at: trip.hex-enter
    when: { hex.terrain: [forest, hills] }
    unless: { trip.edges: road }
  - event: WOLVES_AT_NIGHT # step 6
    name: Wolves at night
    at: actions.camp
    when: { hex.terrain: [forest, hills] }
  - event: OLD_STONES # step 7
    name: Old stones
    at: trip.hex-enter
    when: { hex.tags: landmark }
    pause: true
# … the Generic rules' day, terrains, ways, food and actions
---
# travel.yaml: the bindings (kind: bindings)
on:
  WOLVES: { resolve: table.wolves } # step 5
  WOLVES_AT_NIGHT: { resolve: table.wolves, context: { night: 2 } } # step 6
stats:
  fatigue: { name: Fatigue, default: 0 } # step 2
```

```yaml
kind: table
id: wolves
name: Wolves
roll: '1d6 + {{night}}'
entries:
  - { id: wind, range: 1-4, result: Only the wind in the trees }
  - id: tracks
    range: 5-6
    result: Fresh tracks; you hurry on
    effects: { party.stats.fatigue: 1 }
  - { id: pack, range: 7-8, result: The pack circles the fire, pause: true }
```

The Grey Marches play with all of this and more (weather first at dawn and a check that reads it, getting lost read from the guide, a ford rolled on an oracle, a shrine rolled and paused on, encounters by day and in camp on one table with a different context, hunger as a check of the day's end): their [page](../packs/02-grey-marches.md) says where.

## Common mistakes

- **A check that never comes up.** Its **When** is empty (only an action's step asks it), or its conditions never hold: the map's terrain is `dense-forest` and the check asks for `forest`, the hex's tag is `Landmark` and it asks for `landmark`. Choose **Everything** in the journal: each check that didn't come up says why.
- **The same table, by day and by night.** One check with **When** `trip.hex-enter, actions.camp` has one **Extra context**, the same at both moments. Make two checks with two ids, as steps 5 and 6 do, or let the table's entries tell the moments apart (`when: { trip.moment: actions.camp }`).
- **A check that reads what comes after it.** Checks of one moment come in the list's order: a check above the weather's sees yesterday's weather. Put the one that sets something first.
- **Hunger every night, or never.** `trip.below: food` is seen only at the moment the food hit its minimum (the Generic rules' **Eat**, at `time.day-end`): a hunger check at another moment never sees it.
- **A check that stops nothing.** With no table and no **Pause after it**, a check is only a line in the journal. To stop the trip, tick **Pause after it**; to stop it only on some results, tick **Pause** on those entries of its table.
- **A march that doesn't go on after Continue.** **Continue** ends the pause and goes on with a wait it stopped, but a march it stopped waits for **Go on** (or for the trip to go on by itself).
- **Wolves on the road.** **Skip if** `trip.edges: road` reads the road or river the party followed into the hex: a forest hex entered from the open, next to a road, still has wolves.
- **A ⚠ in Rolled on.** The table named isn't in the system's pack or the packs it brings: a table of another pack is named by its full id (`core/weather`), and that pack must be one of the pack's dependencies.
- **A table that asks for a value.** A value the table reads that nothing gives (`{{night}}` by day) counts as `0` in dice; in conditions it's nothing. Rolled by hand in the Oracle, it's asked for.

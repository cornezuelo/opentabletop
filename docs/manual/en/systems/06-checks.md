# Checks

The **Checks** tab edits what is rolled on the way, the party's stats and, with a [sheet](07-sheet.md), what the characters bring to the party. It writes both the travel rules and the bindings, so you don't have to keep them in step: renaming a check takes its table along.

## Checks

Each check (**Add a check**) has:

- a **Name** and **Description** for players, shown in the trip panel and the journal instead of the event id;
- **When** it happens, written like in the YAML with suggestions: `day-start`, `hex-enter`, `day-end`, one of the system's actions such as `camp`, or several separated by commas (the Grey Marches' encounters, `hex-enter, rest`). Empty: only when an action's step rolls it;
- **Only if** / **Skip if**: its conditions. E.g. the Grey Marches' getting lost, skipped on roads and rivers: `edges: [road, river]`;
- **Rolled on**: what resolves it, any table, oracle, generator or deck, grouped by kind, or a weather model, under _Weather with inertia_. E.g. the Grey Marches' ford is rolled on an oracle;
- **Extra context**: values its table sees only for this check. E.g. `timeOfDay: night` to roll a night encounter on the day's table, or `danger: 3` as if the hex were more dangerous;
- **Changes**: its own effects. E.g. the Grey Marches' Not enough to eat: `party.stats.fatigue: 1`;
- **Pause after it**: stops the trip and waits for **Continue**.

With **no table**, a check is only written in the journal (with its **Changes**) and the trip goes on; **Pause after it** is what stops the trip, after rolling it if it has a table (a landmark to describe: no table and **Pause after it**). A pack written for an older [pack format](../technical/02-file-formats.md), where tableless checks stopped the trip by themselves, plays as it did, and the tab offers **Update** to write it in today's (see [what makes Continue appear](../travel/02-playing.md#the-trip)).

When the bindings still name tables for checks the rules no longer have (a check removed in the YAML), a note lists them and **Remove them** clears them.

The tables a check is rolled on go in the same pack (add them in the Oracle app, where your pack is listed too), or come from other packs by their full id (`core/weather`).

## Writing conditions

Conditions and context are written as `key: value` pairs, like in tables: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }`, `danger: { gt: '{{party.stats.stealth}}' }`. Every operator, variables and rolls: [Conditions](../technical/08-conditions.md); every piece of syntax at a glance: [Syntax](../technical/09-syntax.md); every value they can read: [What tables see](../technical/04-what-tables-see.md).

## Party stats

Numbers of the party, each with an id, a **Name** and **Description** for players and the value it **Starts at** (**Add a stat**; its `min` / `max` are written in YAML). The trip panel shows them and lets the player change them; tables read them in rolls (`1d6 + {{survival}}`) and conditions (`party.stats.morale: { lte: 1 }`), and effects change them (`party.stats.fatigue: 1`).

With a **Sheet**, **From the members** makes a stat of the characters' values while the party has any: `max: survival` (the best Survival), `min`, `sum`, `count: true`, with `when` / `unless` to leave some out. The Grey Marches' Survival: `max: survival, unless: { conditions: wounded }, none: 0`. Empty, the party keeps it.

## Journey roles

The jobs the player gives the characters in a trip (the Grey Marches' **Guide** and **Lookout**), each with a name and description. Checks and tables read the holder as `roles.<id>.…`.

## Supplies the members carry

With a sheet, names a supply of the rules and the value of the sheet each character carries it in (**Carried in**: the Grey Marches' food in `rations`), and how what the trip spends or gains is **Shared out** (evenly, or in order). The trip shows their sum.

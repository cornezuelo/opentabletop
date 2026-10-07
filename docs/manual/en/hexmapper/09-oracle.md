# The Oracle in the map

The Oracle button (the gold hexagon under Play, or <kbd>O</kbd>) opens a panel to roll any table, oracle, generator or deck of your packs without leaving the map.

## Context from the map

Rolls receive what the map knows, so tables can depend on where you are:

- From the **selected hex** (or the party's, if none is selected): `terrain` (its id: `forest`, `hills`…), `water`, `tags`, `name`, `region` (by name), the region's and the hex's fields by key (the hex's win), the icon as `icon.*` and `hex`.
- From the **selected token**: `token.name`, `token.kind` and its fields as `token.*`.
- During a **trip with rules**: `season`, `weather`, `mode`, `day`, the party stats and today's values.

They appear in grey in the roll panel's **Context**; type over them to try other values. The full list, and which value wins, is in [What tables see](../technical/04-what-tables-see.md). The top of the panel says which hex the rolls read. **Roll here** (next to the coordinates in the hex panel) opens the Oracle on the selected hex.

## Keeping a result on the map

Under each result, **Add to … as a point of interest** adds it to the hex's points of interest: a short result becomes its name; a long one keeps the table's name as the name and the text as its description. Edit it in the hex panel like any other point of interest; <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes it.

During a trip with rules, a result that changes supplies, fatigue or party stats (`set: { resources: { food: -2 }, stats: { morale: 2 } }`) also shows **Apply to the trip: food -2, morale +2**: press it to apply those changes as a check's result would be (once per result). Checks rolled by the trip apply theirs by themselves; hand rolls only when you say so. Try it at Ashford with the Grey Marches' _At The Wet Ferret_.

## Try it

Make this table in the Oracle app (a pack of yours, see [Packs](../oracle/03-packs.md)):

```yaml
kind: table
id: what-do-we-find
name: What do we find here?
roll: 1d6
entries:
  - { id: forest, range: 1-6, when: { terrain: forest }, result: 'Fallen timber and mushrooms' }
  - {
      id: rocks,
      range: 1-6,
      when: { terrain: [hills, mountains] },
      result: 'A cave mouth in the rock',
    }
  - { id: nothing, range: 1-6, result: 'Nothing special' }
```

More examples, up to a whole travel system: [Connecting tables to maps and trips](../oracle/07-connecting.md).

Then select a forest hex, press <kbd>O</kbd>, search "What do we find" and roll. The first entry whose condition holds wins.

## Journal, history and your packs

Each map has its own Oracle: its roll history, the cards drawn from each deck and the once-only results that already came up. They are saved with the map (and in its `.otd.json`), so opening another map starts fresh and coming back finds them again. Hand rolls and the checks of a trip share them: a card drawn by hand is gone for the trip too.

During a trip with rules, hand rolls are written in the journal too.

The panel uses the bundled packs and the ones you make in the Oracle app. Your packs live in the browser, so both apps see them when they're served from the same site (e.g. `make serve`: `…/hexmapper/` and `…/oracle/`).

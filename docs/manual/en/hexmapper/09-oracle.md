# The Oracle in the map

The Oracle button (the gold hexagon under Play, or <kbd>O</kbd>) opens a panel to roll any table, oracle, generator or deck of your packs without leaving the map.

## Context from the map

Rolls receive what the map knows, so tables can depend on where you are:

- From the **selected hex** (or the party's, if none is selected): `terrain` (its id: `forest`, `hills`…), `tags`, its fields by key, `region` (by name) and `hex`.
- During a **trip with rules**: `season`, `weather`, `mode`, `day`, the party stats and today's values.

They appear in grey in the roll panel's **Context**; type over them to try other values.

## Try it

Make this table in the Oracle app (a pack of yours, see [Packs](../oracle/packs.md)):

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

More examples, up to a whole travel system: [Connecting tables to maps and trips](../oracle/connecting.md).

Then select a forest hex, press <kbd>O</kbd>, search "What do we find" and roll. The first entry whose condition holds wins.

## Journal and your packs

During a trip with rules, hand rolls are written in the journal too.

The panel uses the bundled packs and the ones you make in the Oracle app. Your packs live in the browser, so both apps see them when they're served from the same site (e.g. `make serve`: `…/hexmapper/` and `…/oracle/`).

# Factions and world turns

Design for the backlog's _Factions and world turns_ (After the alpha, item 4), built on the world clock and the characters engine. What the backlog already agreed (territory as hexes, turns by a button and by the world clock, values the system declares, no lore) is kept; the rest was decided on 2026-10-09 while the user was away, **to review** (section 6).

## 1. What a faction is

A faction is a **character of a sheet** plus a **territory**:

- **Values, conditions, tags and relations** are the same pieces characters have (`kind: sheet`), so nothing new is needed for them: a system declares a sheet for its factions (strength, reputation, wealth…, `at-war` as a condition, alliances and rivalries as relations) and the character engine keeps them within their bounds. One engine for PCs, NPCs and factions.
- **Territory** is a set of hexes of a map, drawn like a region in the faction's colour. A hex belongs to one faction at most; a region can be split among several.
- **No lore**: a faction has a `noteRef` to the notes app.

## 2. Declared by a pack

```yaml
kind: factions
id: default
sheet: faction # the kind: sheet every faction is made with
turn: faction-turn # what each faction rolls on its turn (a table, oracle, generator or deck)
every: 7 # days of the world clock between turns (absent: only by hand)
factions:
  iron-clans:
    name: The Iron Clans
    color: '#8b1e1e'
    values: { strength: 4, reputation: -1 }
    territory: { regions: [The Hollow Hills] } # or hexes: ['15,9']
    turn: clan-turn # its own table, instead of the default
```

A system names its factions definition (`factions:` in `kind: system`; an older pack's implicit system takes its pack's). Translated keyed `factions/<id>`.

## 3. Turns

A **world turn** rolls each faction's turn table, in order, with the faction's facts as context (`faction.values.strength`, `faction.territory`, `faction.id`, every faction as `factions.<id>.*`, the world clock's facts, the calendar). What comes up changes the world through **effects**:

| Effect                                  | Does                                                             |
| --------------------------------------- | ---------------------------------------------------------------- |
| `faction.values.strength: 1`            | the faction whose turn it is                                     |
| `faction.conditions.at-war: true`       | a condition of it                                                |
| `factions.the-vale.values.strength: -1` | another faction                                                  |
| `faction.territory: 1` / `-1`           | grows by a hex from its border (unclaimed first), or loses one   |
| `world.clocks.the-clans-march: 1`       | ticks a progress clock of the world clock (by its name as an id) |

Every result goes to the world clock's timeline, with what it changed. Turns come by the world clock (every `every` days, on by default) or by hand (**World turn**).

## 4. What tables see

Everywhere (trips, hand rolls, discovery): `factions.<id>.*` (values, conditions, tags, relations, `name`, `territory`: how many hexes) and `hex.faction` (the id of the faction that holds the hex, if any).

## 5. Phases

1. **Headless**: `@open-tabletop/faction-engine` (territory: claim, release, grow and shrink from the border with a `RandomSource`; turns due by the clock; `kind: factions` parsed), and the integration in `session` (factions from packs, a turn rolled with the Oracle and its effects applied, facts).
2. **The Hexmapper**: factions in the World panel (their sheets, territory sizes, **World turn**, turns every N days), territory drawn on the map (a layer), `hex.faction` in its world; map format v18.
3. **The Systems app**: a Factions tab; the bundled packs (the Grey Marches' clans, the Vale, the garrison; Core's generic turn table); the manual.

## 6. To review with the author

- Factions as **characters of a sheet** (one engine), rather than an engine of their own values.
- Factions **declared by packs** (with their starting territory by region name or hexes), their state kept by each map; a map may later add its own.
- **Effects** on territory as a number (`faction.territory: 1`) growing from the border, unclaimed hexes first, then any neighbour (taking it from another faction).
- No hand-painting of territory in the first version: it starts from the pack and changes by turns (painting is a later step).

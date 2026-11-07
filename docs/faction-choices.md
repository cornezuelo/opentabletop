# Factions that choose: proposal (2026-11-07), to review before any code

Point 8 of the user's eleven (`docs/BACKLOG.md`): "una facción quiere expandirse, pero solo debe considerar lugares que cumplan determinadas condiciones: territorios vecinos, rutas disponibles, determinados recursos o relaciones con otras facciones. Un sistema podría declarar sus prioridades y permitir que tablas y condiciones decidan qué acción emprender". Nothing here is built or decided; §6 lists what the user has to choose.

## 1. What exists

A world turn rolls each faction's turn table (`turn:` in `kind: factions`, or the faction's own), seeing itself as `faction.*`. Its entries' `when` read its values, and its effects change it, others and the clocks. `faction.territory: 1` takes one cell from its `frontier`, chosen at random; `-1` gives up one of its `border`. So a table already decides **what** a faction does; what it can't say is **where**, or **against whom**.

## 2. The idea: a target, chosen by the system's words

Keep the turn table as what decides, and add the one thing it lacks: an effect that says which candidates count, and how they're ranked. Nothing new for a system that doesn't use it.

```yaml
kind: table
id: clan-turn
entries:
  - id: raid
    weight: 3
    when: { faction.values.strength: { gte: 3 } }
    result: The clans come down on {{target.name}}
    effects:
      faction.territory:
        gain: 1
        where: { place.terrain: [plains, farmland], place.faction: { exists: true } }
        prefer: { place.tags: road, place.faction: the-vale }
```

- `gain` (or `lose`): how many cells, the number today's `faction.territory: 1` means. A plain number keeps working.
- `where`: a [condition](manual/en/technical/08-conditions.md) on each candidate of the frontier, with the same `place.*` a trip reads. Candidates that don't hold it are out. If none is left, the effect does nothing and the timeline says so.
- `prefer`: a condition, or a list of them in order. Candidates holding the first are chosen among before the rest. No scores to write: a list says priority, and ties stay random.
- `{{target.*}}`: the place chosen, for the result's text.

## 3. Rivals as targets

The same for a faction instead of a cell, so "attack the weakest neighbour" needs no code:

```yaml
effects:
  faction.target:
    where: { other.relations: rival, other.borders: true }
    prefer: { other.values.strength: { lte: 2 } }
  target.values.strength: -1
```

`faction.target` picks one other faction, seen as `other.*` while choosing (its values, conditions, relations, and `other.borders`: its land touches this one's), and the entry's later effects reach it as `target.*`.

## 4. Why, in the timeline

A turn says what it chose and why, as item 33's `explain` does for checks: _The Iron Clans took 0604: farmland, held by the Vale, on a road_. A detail line of the world's timeline, shown with **Everything**.

## 5. Where it lives

- **faction-engine:** `frontier` gets a filter passed in (`(hex) => boolean`), and picking among a ranked list. It stays free of conditions' syntax: it's given predicates.
- **session** (`factionTurn`): reads `where` and `prefer`, builds the place facts with the map's world, as a trip does, and evaluates them with `conditions`.
- **Packs:** the effect's form in an entry's effects (`PairEditor` shows maps as YAML today; a form of its own).
- **Bundled packs:** Core's simplest case (a faction growing only onto `plains`); the Grey Marches' clans raiding the Vale's farmland along the road, and Fort Keld holding the fort's region first.
- **Manual:** Factions (Packs), Kinds, What tables see (`target.*`, `other.*`), both packs' pages.

## 6. To decide with the user

1. **Effects, or actions of their own?** The backlog's first sketch has a faction declare **actions** with conditions and a weight. This proposal keeps the turn table for that, since a table with `when` and `weight` already is that list, and adds only the target. Claude's proposal: the table. The alternative, a new `actions:` in `kind: factions`, is a second way of writing the same thing.
2. **`prefer` as an ordered list, or scores?** Claude's proposal: the list; a score the pack writes is more powerful and much harder to read.
3. **A turn played where the map isn't open.** A faction's land is each map's, and a turn in the Campaign app has no map to read `place.*` from. Today land changes only on the map it's played on. Claude's proposal: with no map, `where` holds for nothing and the turn says so; or a turn asks which map. To choose.
4. **Routes.** "Reachable by a road" needs more than the frontier's neighbours. Claude's proposal: leave it to `place.*` of the cell itself (`trip.connections` has no meaning here) and add `place.roads: true` if a road touches it, not pathfinding.

# Dice, templates and context

This page lists everything you can write in a table's dice, its texts and its conditions, and where the values come from. Nothing else is needed: there is no JSON to open and no list of variables to declare — a table reads whatever its context holds when it's rolled.

## Dice

Dice go in a table's or oracle's **roll** (Dice in the form), in generator fields with **Dice**, and inside texts as `{{…}}`.

| Write                        | Means                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `1d6`, `3d8`                 | Roll N dice of M sides and add them (`NdM`).                                                                                         |
| `d20`                        | One die (`dM` is `1dM`).                                                                                                             |
| `d100`, `d%`                 | Percentile: 1 to 100.                                                                                                                |
| `d66`                        | Two d6 read as tens and units: 11, 12 … 16, 21 … 66 (36 results, typical of old-school tables). Ranges look like `11-16`.            |
| `4dF`                        | Fudge/Fate dice: each gives −1, 0 or +1, so `4dF` goes from −4 to +4.                                                                |
| `2d6+1`, `1d20-2`, `1d6+1d4` | Add or subtract constants and other dice.                                                                                            |
| `4d6kh3`                     | Roll 4d6 and **keep the highest** 3 (`kh`).                                                                                          |
| `2d20kl1`                    | Roll 2d20 and **keep the lowest** 1 (`kl`).                                                                                          |
| `1d6 + {{danger}}`           | Add a value from the context (see below). If it's missing it counts as 0; if it isn't a number, the roll fails with a clear message. |

**Roll modes** (advantage, disadvantage… whatever the system declares, see [Kinds of definition](../technical/07-kinds.md#roll-modes)) roll the whole expression several times and keep the highest, lowest or middle total. The result card shows every die, with discarded ones crossed out.

## Templates in texts

Texts (results, generator templates, card texts) can include `{{…}}`:

| Write          | Shows                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `{{2d6}}`      | A roll, right there: `'{{2d6}} wolves'` → "7 wolves".                                                                           |
| `{{season}}`   | A context value.                                                                                                                |
| `{{npc.role}}` | A part of a value (a generator's field holds its table's values).                                                               |
| `{{result}}`   | In an entry with **then roll**: the text of the table it rolled, e.g. `'Bandits — they are {{result}}'` with `table: reaction`. |
| `{{field}}`    | In a generator's template: a field's value (its text, if it came from a table).                                                 |

A missing value shows as nothing. Templates never run code: they only look values up and roll dice.

Table and generator references can be templates too: `table: 'weather-{{season}}'` rolls `weather-spring`, `weather-autumn`… depending on the season.

## Where context values come from

When a definition is rolled it receives a **context**: a set of named values. They come from, in order:

1. **What you type** in the roll panel's **Context** box (the Oracle app lists the values a definition reads, with suggestions taken from its conditions).
2. **The Hexmapper**, when you roll from its Oracle panel or a trip: `hex`, `terrain`, `water`, `tags`, `name`, `region`, the fields of the region and the hex, the icon (`icon.*`) and the selected token (`token.*`); during a trip, `season`, `weather`, `mode`, `day`, the party stats, today's values (`weather`, `…Modifier`, `…Impossible` set earlier the same day) and `edges` (the road or river being followed).
3. **The bindings** of a travel system: `context: { … }` adds fixed values for one check.
4. **Inside the roll itself**:
   - An oracle's **input** is a value with its name (`odds: even`).
   - An entry's **set** values are passed to the table it rolls next (**then roll**), and become values of the result.
   - A generator's **fields** are rolled in order, and each one sees the ones before it; a field's `context: { … }` adds values just for that field.

Conditions (`when`) read the same context. See [YAML reference](06-yaml.md#conditions) for their syntax.

## Putting it together

```yaml
kind: generator
id: encounter
name: Encounter
fields:
  who: { table: wilderness-creatures } # reads terrain, season… from the context
  mood: { table: reaction, context: { bonus: 1 } }
  count: { roll: '1d6 + {{danger}}' } # a hex field from the Hexmapper
template: '{{count}} × {{who}}, {{mood}}'
```

Rolled in a forest hex with `danger: 2`, this could give "5 × wolves, curious".

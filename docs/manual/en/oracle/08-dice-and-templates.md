# Dice, variables and context

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

## Without dice: weights

A table with no dice (its **Dice** left empty, no `roll:` in YAML) picks an entry by **weight** instead of by range: each entry has a `weight` (1 if it says none), and its chance is its weight out of the sum of all the weights. Weights are relative: only how they compare matters.

```yaml
kind: table
id: npc-roles
entries:
  - { id: pedlar, weight: 2, result: pedlar } # 2 of 6: one time in three
  - { id: pilgrim, weight: 3, result: pilgrim } # 3 of 6: half the time
  - { id: witch, weight: 1, result: hedge-witch } # 1 of 6
```

Use weights when no die fits the odds you want, or to make some results rarer without renumbering ranges. With no weights at all, every entry is equally likely (the Grey Marches' _Ruins_). Entries that a condition (`when`) leaves out don't count, so the others share their chance. A table uses either dice and ranges or weights, not both; roll modes need dice. In the Grey Marches, _Roles_ and _Summer in the Marches_ use weights.

## Variables in texts

`{{…}}` holds a **variable** (`{{season}}`: the value with that name) or a **roll** (`{{2d6}}`: dice). Texts (results, generator templates, card texts) can include them:

| Write          | Shows                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `{{2d6}}`      | A roll, right there: `'{{2d6}} wolves'` → "7 wolves".                                                                           |
| `{{season}}`   | A variable: a context value.                                                                                                    |
| `{{npc.role}}` | A part of a value (a generator's field holds its table's values).                                                               |
| `{{result}}`   | In an entry with **then roll**: the text of the table it rolled, e.g. `'Bandits — they are {{result}}'` with `table: reaction`. |
| `{{roll}}`     | In a table's entries: the total of the table's own **Roll**, e.g. `'You rolled {{roll}}'`.                                      |
| `{{field}}`    | In a generator's template: a field's value (its text, if it came from a table).                                                 |

A missing value shows as nothing. Variables never run code: they only look values up and roll dice. A value that is a whole `'{{…}}'` (`count: '{{2d6}}'`) keeps what it reads: a number stays a number.

Table and generator references can use variables too: `table: 'weather-{{season}}'` rolls `weather-spring`, `weather-autumn`… depending on the season.

## Variables and rolls in conditions

Conditions compare with a variable or a roll the same way: `when: { danger: { gt: '{{party.stats.stealth}}' } }`, or a roll-under against a stat:

```yaml
kind: table
id: climb-the-wall
entries:
  - { id: up, result: You climb it, when: { party.stats.str: { gte: '{{1d20}}' } } }
  - { id: fall, result: You fall, unless: { party.stats.str: { gte: '{{1d20}}' } } }
```

In one roll of the table, the same dice are the same roll everywhere, so exactly one of the two entries comes up, and the result card shows the d20. More in [Conditions](../technical/08-conditions.md#variables-and-rolls).

A table with a **Roll** of its own gives its entries the total as `roll`: their conditions can compare with it, and their texts, `set` and changes can show or use it. The roll is made first, then the entries are chosen by their conditions and ranges:

```yaml
kind: table
id: pick-the-lock
roll: 1d6
entries:
  - id: open
    range: 1-6
    when: { party.stats.dex: { gte: '{{roll}}' } }
    result: 'A {{roll}}, at or under your Dexterity: it clicks open'
  - { id: stuck, range: 1-6, result: 'A {{roll}}: it won’t budge' }
```

Both entries cover every total; the first whose condition holds comes up. The Grey Marches' _Fishing_ works like this.

## Where context values come from

When a definition is rolled it receives a **context**: a set of named values. They come from, in order:

1. **What you type** in the roll panel's **Context** box (the Oracle app lists the values a definition reads, with suggestions taken from its conditions).
2. **The Hexmapper**, when you roll from its Oracle panel or a trip: `hex`, `terrain`, `water`, `tags`, `name`, `region`, the fields of the region and the hex, the icon (`icon.*`) and the selected token (`token.*`); during a trip, `season`, `weather`, `mode`, `day`, the party stats, today's values (`weather`, `…Modifier`, `…Impossible` set earlier the same day) and `edges` (the road or river being followed).
3. **The bindings** of a travel system: `context: { … }` adds fixed values for one check.
4. **Inside the roll itself**:
   - An oracle's **input** is a value with its name (`odds: even`).
   - An entry's **set** values are passed to the table it rolls next (**then roll**), and become values of the result.
   - A generator's **fields** are rolled in order, and each one sees the ones before it; a field's `context: { … }` adds values just for that field.

Conditions (`when`) read the same context, and so do variables. See [YAML reference](06-yaml.md#conditions) for their syntax.

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

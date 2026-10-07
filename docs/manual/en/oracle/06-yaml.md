# YAML reference

Click a definition's file (or a file in the pack page) to open the YAML editor. Problems are underlined at their line and listed below; click one to jump to it. Changes are saved as you type.

While you type, the editor suggests what fits (<kbd>Ctrl</kbd>+<kbd>Space</kbd> shows the suggestions anywhere): keys at the start of a line, `kind` and other fixed values, tables and generators after `table:`, `generator:` or `resolve:` (this pack's first), and inside one-line `when`, `unless`, `set` and `context` the names tables read or set, with their known values (`terrain: forest`, `season: winter`, `resources: { food }`…). The same suggestions appear in the forms' condition and value boxes.

## A table

```yaml
kind: table
id: weather
name: Weather
roll: 1d6
modes: [advantage, disadvantage]
entries:
  - { id: clear, range: 1-3, result: Clear skies, set: { weather: clear } }
  - { id: rain, range: 4-5, result: Rain, set: { weather: rain } }
  - { id: storm, range: 6, result: Storm, table: storm-damage }
```

- `range` (`3`, `2-5`) or `weight` (without `roll`).
- `table` / `generator`: rolled after the entry; `'weather-{{season}}'` picks one by context.
- `set`: values the entry adds (other tables and the travel rules read them).
- `once: true` or `maxOccurrences: 3`, with `onExhausted: reroll | next | none`.

## Dice

The full list, with templates and where context values come from: [Dice, templates and context](08-dice-and-templates.md).

`2d6+1`, `d100`, `d%`, `d66`, `4dF`, `4d6kh3` (keep the highest 3), `2d20kl1` (keep the lowest). Context values go in braces: `1d6 + {{lostModifier}}`. Results can roll too: `'{{1d6}} wolves'`.

## Conditions

`when` keeps an entry only if the context matches:

```yaml
when: { terrain: forest } # equals
when: { terrain: [hills, mountains] } # one of
when: { danger: { gte: 4 }, season: { not: winter } }
when: { any: [{ weather: storm }, { lost: true }] } # all / any / not
```

Comparisons: `eq`, `not`, `in`, `gt`, `gte`, `lt`, `lte`, `exists`. List values in the context (like a hex's tags) match when they contain the value. The first entry that matches and fits the roll wins.

## Oracles, generators and decks

```yaml
kind: oracle
id: yes-no
inputs:
  odds: { label: Odds, options: [unlikely, even, likely], default: even }
roll: 1d6
variants:
  unlikely:
    { entries: [{ id: yes, range: 1-2, result: 'Yes' }, { id: no, range: 3-6, result: 'No' }] }
  even: { entries: […] }
  likely: { entries: […] }
---
kind: generator
id: npc
fields:
  role: { table: npc-role }
  age: { roll: 2d20+10 }
template: '{{role}}, {{age}} years old'
---
kind: deck
id: omens
reshuffle: when-empty
cards:
  - { id: crow, result: A crow, count: 2 }
  - { id: storm, result: A storm }
```

Several definitions go in one file separated by `---`, or as a list.

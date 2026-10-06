# Editing

The **Edit** tab is a form over the YAML file: it changes only what you touch and keeps comments and order. Bundled packs are read-only: make a copy first.

## Every definition

Name, description and, for tables and oracles, the **dice** (`1d6`, `2d6`, `d66`, `d%`, `1d6 + {{modifier}}`… empty = pick by weight) and whether it can be rolled with **advantage or disadvantage**.

## Tables

Each **entry** has:

- an **id** (needed for translations and once-only entries; **Give entries ids** fills them in),
- a **range** of totals (`3` or `2-5`), or a **weight** when the table has no dice,
- the **result** text, which may hold dice (`{{1d6}} wolves`) and context values (`{{season}}`),
- **then roll**: another table or generator rolled after it, whose result is added.

Add, duplicate, move and remove entries. **Number 1–N** gives them consecutive ranges and sets the dice to match.

## Oracles

An **input** (its id, a **label** to show, and its **options**, each with a label) and, for each option, its own list of entries. Renaming an option renames its list. The **default** option is the one selected when rolling.

## Generators

**Fields** are rolled in order; each comes from a table, a generator, dice or a fixed value, and later fields can use earlier ones. The **template** writes the result: click a `{{field}}` chip to add it.

## Decks

**Cards** with an id, the number of **copies**, a text and an optional table or generator; and when to **reshuffle** (when the deck runs out, only by hand, or after every draw).

## What the forms don't edit

Conditions (`when`), values set by entries (`set`), once-only limits and a generator field's context are edited in the YAML: the form marks entries that have them. See [YAML reference](yaml.md).

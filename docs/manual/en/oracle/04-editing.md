# Editing

The **Edit** tab is a form over the YAML file: it changes only what you touch and keeps comments and order. Bundled packs are read-only: make a copy first.

**↶ ↷** in the header (or <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> outside text boxes) undo and redo changes to your packs: form edits, new and deleted definitions, files and packs. Typing in the YAML editor counts as one change per pause; inside the editor, <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes the text itself. The history lasts while the page is open.

## Every definition

Name, description and, for tables and oracles, the **dice** (`1d6`, `2d6`, `d66`, `d%`, `1d6 + {{modifier}}`… empty = pick by weight) and its **roll modes**: for each mode its system declares (advantage…), whether it's offered when rolling by hand and, in **by itself when**, the condition that applies it alone (`explorer: { gte: 1 }`), and in **unless**, the one that stops it applying alone (`tags: lit`; written alone, the mode applies always but then). For tables and oracles also:

- **Clamp totals** (on by default): a total below the lowest range takes the first entry, above the highest the last one, so modifiers never leave you without a result. Off, such a total gives nothing.
- **When exhausted**: what happens when the entry rolled has reached its limit (see below): **roll again**, **take the next one** still available, or **nothing**.

Descriptions (of tables, oracles, generators and decks, and of a travel system's checks, actions and stats) can use **basic Markdown**: a blank line starts a new paragraph, `**bold**`, `_italics_`, `` `code` ``, lists (`- item`), quotes (`> …`) and links to the web (`[text](https://…)`). Nothing else: HTML and images written in a pack show as text, since packs can come from anyone. In YAML, write a long description as a block: `description: |-` and the text indented below it. The Grey Marches' descriptions use it: a paragraph saying what each one is for, then **Shows:** with what it teaches.

## Tables

Each **entry** has:

- an **id** (needed for translations and once-only entries; **Give entries ids** fills them in),
- a **range** of totals (`3` or `2-5`), or a **weight** when the table has no dice (how likely it is compared to the others: [Without dice: weights](08-dice-and-templates.md#without-dice-weights)),
- the **result** text, which may hold dice (`{{1d6}} wolves`) and context values (`{{season}}`),
- **then roll**: another table or generator rolled after it, whose result is added.

Add, duplicate, move and remove entries. **Number 1–N** gives them consecutive ranges and sets the dice to match.

**⋯** on a row opens its conditions, values and limits (rows that have some say so under their text):

- **Only if**: the entry can only come up when the context matches, written as `key: value` pairs, e.g. `terrain: forest`, `season: [autumn, winter]` (any of them), `danger: { gte: 3 }` (3 or more), `tags: landmark` (the hex has that tag). Empty: always. When no entry matches, the table gives nothing. The keys a table can read are in [What tables see](../technical/04-what-tables-see.md), and every way of comparing them (`not`, `lt`, `exists`, `any`…) in [Conditions](../technical/08-conditions.md).
- **Unless**: the entry can't come up when this matches, e.g. `timeOfDay: night` (the Grey Marches' Vale patrol). With **Only if** too, both are checked.
- **Sets**: values the entry gives when it comes up, e.g. `weather: storm, lost: true` or `count: "{{2d6}}"`. The result text, later tables and generator fields, and the trip read them (see [Connecting tables](07-connecting.md)).
- **Only once** / **At most**: how many times the entry can come up in a session (the Oracle's **New session** resets them).
- **Changes**: what the entry changes in a trip's party (`party.stats.morale: -1`, `party.resources.food: 2`; `=3` sets it), with suggestions of the system's stats and supplies. See [effects](07-connecting.md).
- **Pause**: when the entry comes up during a trip, the trip stops after the roll until you press **Continue** (`pause: true`; rolled by hand it does nothing). Deck cards take it in YAML.

The boxes take the same text as the YAML between `{ }`; a box that can't be read as `key: value` pairs turns red and isn't saved.

## Oracles

An **input** (its id, a **label** to show, and its **options**, each with a label) and, for each option, its own list of entries. Renaming an option renames its list. The **default** option is the one selected when rolling.

## Generators

**Fields** are rolled in order; each comes from a table, a generator, dice or a fixed value, and later fields can use earlier ones. The **template** writes the result: click a `{{field}}` chip to add it. **Conditions and context**, under each field: **Only if** / **Unless** (the field is rolled only then; otherwise it stays empty, e.g. _Delving a ruin_'s trap only at `danger: { lte: 2 }`) and **Context** (values given to the table or generator it rolls, e.g. `timeOfDay: night, danger: 3`).

## Decks

**Cards** with an id, the number of **copies**, a text and an optional table or generator; and when to **reshuffle** (when the deck runs out, only by hand, or after every draw).

## What the forms don't edit

Deeply nested conditions (`any`, `all`, `not`), are easier in the YAML. See [YAML reference](06-yaml.md).

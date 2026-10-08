# Getting started

The Oracle app rolls and edits the random tables of your games: tables, oracles, generators and decks, grouped in **packs**. Everything stays in your browser; to keep a copy or move it to another computer, see [Backups of everything](../technical/05-backups.md).

## The screen

- **Header**: the app switcher (nine dots), **New definition**, **New pack**, **Import .zip**, the gear (**Preferences**: the language and notes app every app shares, and the Oracle's own: a seed for repeatable rolls and which packs the list shows) and **?**. The small tabs on the edges of the middle column (‹ ›) fold the side columns away to make room, and bring them back; the app remembers it.
- **Pack list** (left): every pack and its definitions, with a search box (by name, id or tag). Badges show where a pack comes from: _bundled_, _edited_ (your copy of a bundled pack), _personal use_. A red number counts its problems. The **+** next to one of your packs adds a definition to it. Packs you don't use can leave the list: untick them in **Preferences → Packs in the list** (they still load, and their favorites stay pinned).
- **Definition** (center): the **Roll** tab rolls it, the **Edit** tab changes it. Above them: its id, its file (click to open it in the YAML editor) and the actions **Duplicate**, **Copy to…** and **Delete**.
- **History** (right): your last rolls. Click one to see it again.

**Help where you are**: a label underlined with dots has an explanation, often with examples of what to write. Click it and the help column (**?**, on the right) opens on it, in place of this manual: what the field does, examples that work and, under **In the manual**, the manual's sections about it (the Syntax page first); **✕** closes the column and **← The manual** goes back to the manual. While the column is open, moving to a field (click or Tab) shows its help too.

**Examples go in with a click**: after you've been in a text box or the YAML editor, click an example in `code` in the help column (in a field's help, on the **Syntax** page or anywhere in the manual) and it goes in where the cursor was; **Ctrl+Z** takes it back. **Syntax**, next to the column's search box, opens the page with everything a pack can write. The search looks in this app's pages, the technical ones and the packs', and shows the words found in bold. Buttons with only an icon say their name when you hover them.

## Four kinds of definition

| Kind          | What it does                                                                  |
| ------------- | ----------------------------------------------------------------------------- |
| **Table**     | Roll dice (or pick by weight) and read the entry.                             |
| **Oracle**    | A table with variants chosen by an input, like the odds of a yes/no question. |
| **Generator** | Rolls several fields (tables, dice, values) and fills a text template.        |
| **Deck**      | Cards drawn without replacement until it's reshuffled.                        |

Read on: [Rolling](02-rolling.md), [Packs](03-packs.md), [Editing](04-editing.md), [Dice, templates and context](08-dice-and-templates.md), and [Connecting tables to maps and trips](07-connecting.md) to make tables and travel systems that work with the Hexmapper.

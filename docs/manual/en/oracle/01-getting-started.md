# Getting started

The Oracle app rolls and edits the random tables of your games: tables, oracles, generators and decks, grouped in **packs**. Everything stays in your browser; to keep a copy or move it to another computer, see [Backups of everything](../technical/05-backups.md). It comes with three packs: [Core](../packs/01-core.md) (oracles and tables for any game), [The Grey Marches](../packs/02-grey-marches.md) (a setting to play and learn from) and [Names](../packs/03-names.md) (names for people and places).

## The screen

- **Header**: the app switcher (nine dots), **New definition**, **New pack**, **Import .zip**, the gear (**Preferences**: the language and notes app every app shares, and the Oracle's own: a seed for repeatable rolls and which packs the list shows) and **?**. The small tabs on the edges of the middle column (‹ ›) fold the side columns away to make room, and bring them back; the app remembers it.
- **Pack list** (left): every pack and what it has to roll (its tables, oracles, generators and decks; the rest of a pack, rules, sheets, calendars…, is edited in the Systems app and listed on the pack's page), with a search box (by name, id or tag) and **Filter**: chips of the kinds (only tables and decks…) and of the tags the packs give their definitions (`encounters`, `people`, `names`…). A click on a tag shows only what has it; a second, only what hasn't it (`−rules`: what the system's own rules roll is hidden, leaving what you'd roll by hand); a third forgets it. **Show all** forgets every chip. This browser remembers the filter, which Map's Oracle panel shares. Badges show where a pack comes from: _bundled_, _edited_ (your copy of a bundled pack), _personal use_. A red number counts its problems. The **+** next to one of your packs adds a definition to it. Packs you don't use can leave the list: untick them in **Preferences → Packs in the list** (they still load, and their favorites stay pinned). The app opens on the pack of the system you last chose in Travel or Systems, and choosing a pack that brings a system makes it the one those apps open next (this browser remembers it).
- **Definition** (center): the **Roll** tab rolls it, the **Edit** tab changes it. Above them: its id, its file (click to open it in the YAML editor) and the actions **Duplicate**, **Copy to…** and **Delete**; under its description, **Rolled by**: the places that roll it in the systems that bring its pack (an action's step, a check's binding, another table's entry, a generator's field), each a link to where it's edited (the rules open in Systems). **Nothing rolls it**: it's rolled by hand.
- **History** (right): your last rolls. Click one to see it again. **Campaign**, above it, says whether they're the Oracle's own or the campaign's you're playing (**Playing**, in the bar) ([Rolling in a campaign](02-rolling.md#rolling-in-a-campaign)).

**Help where you are**: a label underlined with dots has an explanation, often with examples of what to write. Click it and the help column (**?**, on the right) opens on it, in place of this manual: what the field does, examples that work and, under **In the manual**, the manual's sections about it (the Syntax page first); **← The manual** goes back to the manual. From a field, <kbd>F1</kbd> shows its help. Moving to another field doesn't change what the column shows, so a click on an example there inserts it into the field you're writing in.

**Examples go in with a click**: after you've been in a text box or the YAML editor, click an example in `code` in the help column (in a field's help, on the **Syntax** page or anywhere in the manual) and it goes in where the cursor was; **Ctrl+Z** takes it back. **Syntax**, next to the column's search box, opens the page with everything a pack can write. The search looks in this app's pages, the technical ones and the packs', and shows the words found in bold. Buttons with only an icon say their name when you hover them.

## Four kinds of definition

| Kind          | What it does                                                                  |
| ------------- | ----------------------------------------------------------------------------- |
| **Table**     | Roll dice (or pick by weight) and read the entry.                             |
| **Oracle**    | A table with variants chosen by an input, like the odds of a yes/no question. |
| **Generator** | Rolls several fields (tables, dice, values) and fills a text template.        |
| **Deck**      | Cards drawn without replacement until it's reshuffled.                        |

Read on: [Rolling](02-rolling.md), [Packs](03-packs.md), [Editing](04-editing.md), [Dice, variables and context](08-dice-and-templates.md), and [Connecting tables to maps and trips](07-connecting.md) to make tables and travel systems that work with Map.

# Bestiary

The **Bestiary** tab edits the system's **bestiaries** (`kind: bestiary`): the creatures and kinds of people it can make, as **templates**. A template is a character of one of the system's [sheets](07-sheet.md), written as a character is, whose rolls are made again for every copy: _grey wolf_ with `health: 2d4` gives wolves with different health. A table or an action makes copies with an effect (`present.grey-wolf: '{{1d4+2}}'`), and they stand among those present in the trip. A copy keeps what it was made with, so changing a template only touches copies made afterwards.

This tab is **the one place templates are made and changed**: they are part of the system, like its sheets. The [Characters app](../characters/01-getting-started.md#the-bestiary) shows them as they are and makes copies of them in the roster; its **Edit in Systems ↗** opens this tab at the template, unfolded, and its **New template ↗** opens this tab.

## The tab

One bestiary at a time; with several, a row of buttons chooses. **New bestiary** makes a small one (a wolf and a wolf leader) on the system's characters' sheet and adds it to the system's **Overview** (`bestiary:`, a list). A bestiary has:

- Its **Name**, the **Sheet** its templates are made with unless one names its own, and what becomes of copies **Left behind**: they stay where they were made, or leave. Which one is the system's to say; empty means they stay.
- Its **Templates**, as folded cards: each one line (its name, its id and what it sets), unfolded with a click; **Unfold all**, **Fold all** and a search when there are many. **Add** makes a new one. An unfolded card has its **Id** (what effects and tables name it with), its **Sheet** (empty: the bestiary's), and the template's editor, as its sheet lays it out:
  - **Named as** `present.<id>`: how tables, actions and effects make and read its copies (`present.wolf: 3`, `present.wolf.count: { gte: 2 }`); their inputs suggest it.
  - Its **Name** and **Description**, the template it is a **Variant of** (it takes that one's values and items, writes over them, and adds its tags and conditions), the generator rolled for each copy's **Names**, what becomes of its copies **Left behind**.
  - A box for each of the sheet's **Values**, by group: a number, or a roll in braces rolled for every copy (`{{2d4}}`); empty takes the sheet's default, shown faint.
  - Its **Conditions** (the sheet's, ticked), its **Tags** (those its system's characters and templates already use are suggested), its **Items** from the system's catalogues with how many, and how it is drawn as a **Token** on a map.

Values and conditions come from the sheet and items from the catalogues, so a made-up name can't slip in. Its name and description are written in the language the app is in: in the template itself when it's the pack's own language, otherwise in the pack's translation ([Translating](../technical/01-translating.md)). The YAML: [Bestiaries](../technical/07-kinds.md#bestiaries).

## Step by step: wolves

1. In **Bestiary**, **New bestiary**. Keep the wolf: unfold its card and write `{{2d4}}` in its **Health**.
2. Make the leader: unfold **Wolf leader**; its **Variant of** is already `wolf`; write `{{2d4+2}}` in its **Health**.
3. In **Rules** or the tables, an effect `present.wolf: '{{1d4+2}}'` brings the pack.
4. **Try it**: after the effect, the trip's **Here** box shows the wolves, each with its own health.

Bundled systems are read-only: **Duplicate** one to change it.

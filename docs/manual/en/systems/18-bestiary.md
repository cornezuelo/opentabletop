# Bestiary

The **Bestiary** tab edits the system's **bestiaries** (`kind: bestiary`): the creatures and kinds of people it can make, as **templates**. A template is a character of one of the system's [sheets](07-sheet.md), written as a character is, whose rolls are made again for every copy: _grey wolf_ with `health: 2d4` gives wolves with different health. A table or an action makes copies with an effect (`present.grey-wolf: '{{1d4+2}}'`), and they stand among those present in the trip. A copy keeps what it was made with, so changing a template only touches copies made afterwards.

## The tab

One bestiary at a time; with several, a row of buttons chooses. **New bestiary** makes a small one (a wolf and a wolf leader) on the system's characters' sheet and adds it to the system's **Overview** (`bestiary:`, a list). A bestiary has:

- Its **Name**, the **Sheet** its templates are made with unless one names its own, and what becomes of copies **Left behind**: they stay where they were made, or leave. Which one is the system's to say; empty means they stay.
- Its **Templates**, each by an id (what effects and tables name it with: `present.<id>`), with its **Name** and **Description**, its **Sheet**, the template it is a **Variant of** (it takes that one's values and items, writes over them, and adds its tags and conditions), the **Values** it starts with (a number, or a roll in braces), its **Conditions**, its **Items** from the system's catalogues, its **Tags**, the generator rolled for each copy's **Names** and how it is drawn as a **Token** on a map.

Values, conditions and items are offered from the sheet and the catalogues, so a made-up name is easy to spot. The YAML: [Bestiaries](../technical/07-kinds.md#bestiaries).

## Step by step: wolves

1. In **Bestiary**, **New bestiary**. Keep the wolf; set its **Values** to `health` · `{{2d4}}`.
2. Make the leader: its **Variant of** `wolf-leader` is already `wolf`; add a value `health` · `{{2d4+2}}`.
3. In **Rules** or the tables, an effect `present.wolf: '{{1d4+2}}'` brings the pack.
4. **Try it**: after the effect, the trip's **Here** box shows the wolves, each with its own health.

Bundled systems are read-only: edit a copy.

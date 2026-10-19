# Sheet

The **Sheet** tab edits the system's two sheets, both optional (`kind: sheet`): **its characters'** (`sheet`), what each character has, and **the party's own** (`partySheet`), what belongs to the whole party (morale, fatigue, hirelings…) in every trip, whoever travels. With both, a tab above the form chooses which. **New characters sheet** and **New party sheet** make a small one and name it in the system. The party's sheet shows as **The party** in every trip, above the characters; tables read it as `party.values.morale`, and a party stat can be one of its values (**From the sheets** in [Checks](06-checks.md): `party: morale`). Without a characters' sheet, the party is played as a whole; with one, trips have a **Characters** section ([Playing a trip](../travel/02-playing.md#characters)), and the [Checks](06-checks.md) tab says which party stats come from them and which supplies they carry. The YAML of a sheet: [Sheets](../technical/07-kinds.md#sheets).

A sheet is the only place what a character or the party has is declared: they have no values of their own beside it. Wherever a sheet is played (the trip's **Party** tab, a token's sheet in the Hexmapper), it says which it is and whose system, with **Edit in Systems ↗** to come here.

## What a sheet has

- Its **Name** and **Description** (what the sheet is for).
- Its **Values**, each with a name, the value it **Starts at**, **Min** and **Max** (a number, or another value in braces, `'{{maxHealth}}'`: as high as the character's maxHealth), **Track** (shown as boxes, as many as its max) and **Group**.
- The **Groups** values are shown under, in order, with their names.
- Its **Conditions**, each with what it **Blocks** for the whole party while someone has it: `travel`, one of the system's actions, `mode.horse` (the box suggests them).
- Its **Kinds of relation**, with the bounds of the number one carries (a bond from 0 to 3).

Values, groups, conditions and kinds of relation each have a **Description (its help)**: what it is, in a sentence or two. Wherever the sheet is shown (a character's card, the party's, a faction's), its name is underlined and clicking it shows that description first in the help column, before what the apps add (how tables read it, its bounds, what it blocks). Like names, it's written in the current language: the pack's own, or its translation file. The Grey Marches describe every part of theirs.

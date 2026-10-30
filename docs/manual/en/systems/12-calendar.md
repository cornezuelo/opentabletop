# Calendar

The **Calendar** tab edits the calendar the system names (one). **New calendar** makes one from a small template and names it. The YAML: [Calendars](../technical/07-kinds.md#calendars).

## What it has

- Its name, the year and day of day 1, the hours of a day. The world clock moves time on by its divisions of the day (below).
- Its **divisions of the day**, as many as the system wants (meals, watches, bells…): each one with its id (how conditions will read it, `time.<id>`), its name, its parts (rows with an id, a name, **From**, **Until** if it ends before the next part, and **Tags**, words with commas) and a **strip of the day** from midnight to midnight, each part a stretch in its colour and the gaps left blank, so what the rows make is seen at once (hovering a stretch says its hours). **Add a division** adds one; × removes it.

  Two ways to make the parts. **Stretches of your own**, each from its hour (the morning from 06:00, the night from 20:00 tagged `dark`, meals): write the rows, read as `time.part: night`. **Numbered shifts of equal length** (watches, bells): **Split into equal parts…** asks how many hours each and writes the rows, numbered from midnight (4 hours: **1** from 00:00 … **6** from 20:00, so `time.watch: 2` is 04:00–08:00), to rename or adjust; parts all named by whole numbers read as numbers. A division the YAML writes with `every` shows its parts in the strip, and **Write them as rows** turns it into rows. Map's World panel moves time on to their parts. The YAML: [Divisions of the day](../technical/07-kinds.md#calendars).

- Its **months** in order, each with its days and its season (any name: `spring`, or your world's `wet`), with the length of the year below. Renaming a month carries its holidays, its translations and day 1 along.
- **Weekdays**.
- **Moons**, with their cycle and offset.
- **Holidays**, on a month and day.

The arrows reorder a list.

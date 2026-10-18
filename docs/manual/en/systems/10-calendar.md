# Calendar

The **Calendar** tab edits the calendar the system names (one). **New calendar** makes one from a small template and names it. The YAML: [Calendars](../technical/07-kinds.md#calendars).

## What it has

- Its name, the year and day of day 1, the hours of a day and of a watch (the older form of a `watch` division). The world clock moves time on by its divisions of the day (below).
- Its **divisions of the day**, as many as the system wants (meals, watches, bells…): each one with its id (how conditions will read it, `time.<id>`), its name, and either **Its own parts** (rows with an id, a name, **From**, **Until** if it ends before the next part, and **Tags**, words with commas) or **Every N hours** (numbered parts of equal length from midnight). **Add a division** adds one; × removes it. The Hexmapper's World panel moves time on to their parts. The YAML: [Divisions of the day](../technical/07-kinds.md#calendars).
- Its **months** in order, each with its days and its season (any name: `spring`, or your world's `wet`), with the length of the year below. Renaming a month carries its holidays, its translations and day 1 along.
- **Weekdays**.
- **Moons**, with their cycle and offset.
- **Holidays**, on a month and day.

The arrows reorder a list.

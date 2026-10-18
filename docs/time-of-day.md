# Parts of the day — design

Design for the backlog's _Time units, abstracted_ (Alpha 0.1, second round, item 9). The user's ask: dawn–nightfall and watches are built in; a system should declare its own parts of the day (Tolkien's first, second and third breakfast, afternoon, night…), with watches only if it wants them, and anything that now names dawn or nightfall should read the system's declared parts. **Agreed with the user 2026-10-18** (section 7). Item 10 (no built-in march, camp or rest) is a separate design: it removes dawn and nightfall; this one leaves room for it.

## 1. What is built in today

Game time is an absolute number of minutes; calendars only name it. What names the hours of a day is spread over three places, and two of them say the same thing:

| Where                | What                                                                                                                     | Used by                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind: calendar`     | `hoursPerDay`, `watchHours` (equal, numbered watches), `dawn` / `dusk` (clock times)                                     | `time.watch`; the World panel's **Watch**, **Dusk** and **Dawn** buttons (`world-engine`'s `until: dawn                                                                                                         | dusk`, default 06:00 / 20:00) |
| `kind: travel-rules` | `day.start`, `day.nightfall` (clock times), `day.night` (the action at nightfall), `travel.hoursPerDay` (marching hours) | the engine's day: `day-start` checks at dawn, marching only from dawn to midnight, the night's action at nightfall, `time.daylight`, `system.dawn` / `system.nightfall`, steps `time: dawn` / `time: nightfall` |
| the engine           | midnight                                                                                                                 | `day-end` (the calendar's day changes)                                                                                                                                                                          |

So the Grey Marches' calendar says nothing about dawn, its travel rules say 06:00, and the World panel's **Dawn** is 06:00 only because that's the default: change one and they part ways. And a system can only name two moments of its day (dawn and nightfall), plus numbered watches of equal length.

## 2. Divisions of the day, declared by the calendar

The calendar names time (months, weekdays, seasons, moons), and the world clock, the trip and the weather share it, so it also names how the day is divided: **as many divisions as the system wants**, each with its own parts, overlapping one another (meals and watches, or canonical hours and bells…):

```yaml
kind: calendar
id: shire-reckoning
hoursPerDay: 24
divisions:
  meal: # read as `time.meal`; its moments are `meal.<part>`
    name: Meals
    parts: # in order; each lasts until the next one starts (the last until the first, past midnight)
      - { id: night, from: '00:00', tags: [dark] }
      - { id: first-breakfast, from: '07:00' }
      - { id: second-breakfast, from: '09:00' }
      - { id: elevenses, from: '11:00' }
      - { id: luncheon, from: '13:00' }
      - { id: afternoon-tea, from: '16:00' }
      - { id: dinner, from: '18:00' }
      - { id: supper, from: '21:00', tags: [dark] }
  watch:
    name: Watches
    parts:
      - { id: first, from: '21:00' }
      - { id: middle, from: '01:00' }
      - { id: morning, from: '04:00', until: '07:00' } # `until`: no watch after it, until the first
  bell: { name: Bells, every: 0.5 } # numbered parts of equal length from midnight: 1, 2, 3…
```

- A **division** has an id (how conditions name it), an optional `name` and `description`, and either `parts` or `every` (hours: numbered parts of equal length from midnight).
- A **part** has an `id`, a `from`, optionally `until` (a gap with none of the division's parts after it), `name`, `description` and `tags` a system may read (`dark`, `meal`…: no tag means anything to the engine).
- Names are translated in `locales/<lang>/`, keyed `calendar/<id>` like the months.
- The older `watchHours: 4` is read as `divisions: { watch: { every: 4 } }`, so `time.watch` and the Grey Marches' `watch: 2` keep working; the older `dawn` / `dusk` (the World panel's buttons) are kept until item 10.
- **No divisions: none.** Nothing implicit; the day still has its hours.
- Validation: ids unique, a division's id not one of the names the moment already has (`day`, `hour`, `minute`, `season`, `daylight`, `month`, `year`, `weekday`, `moons`, `holidays`, `tags`…), times `HH:MM` within `hoursPerDay`, `from` in order, `until` before the next `from`.

## 3. The system's day names parts

Until item 10 removes them, the travel rules keep saying when the trip's day starts and when night falls, and may name a part instead of a clock:

```yaml
kind: travel-rules
day: { start: meal.first-breakfast, nightfall: meal.supper, night: camp }
```

- `day.start` and `day.nightfall` take a part (`<division>.<part>`) or a clock (`'06:00'`, as today). A clock is still read the same, so no `PACK_FORMAT` bump.
- `time:` steps go to the next start of any part (`time: meal.luncheon`, `time: watch.middle`, `time: bell.3`), besides minutes, clocks and `dawn` / `nightfall`.
- `travel.hoursPerDay` (hours marched a day) doesn't change: it's a rule, not a part of the day.

## 4. What conditions and tables see

| Fact                                               | Short name                      | What it is                                                                           |
| -------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| `time.<division>`                                  | `<division>`                    | the part it is now: its id (`elevenses`), or its number for `every`; absent in a gap |
| `time.tags`                                        | —                               | the tags of every part it is now (`time.tags: dark`)                                 |
| `system.<division>.<part>`                         | —                               | the hour a part starts, as a number (`time.hour: { gte: '{{system.meal.dinner}}' }`) |
| `system.dawn`, `system.nightfall`, `time.daylight` | `dawn`, `nightfall`, `daylight` | the system's day, as today (until item 10)                                           |

## 5. New moments: when a part begins

Checks (`at:`) and actions (`on:`) may name `<division>.<part>` (`meal.elevenses`, `watch.middle`, `bell.4`), besides `day-start`, `hex-enter`, `day-end` and actions' ids:

```yaml
actions:
  elevenses:
    on: meal.elevenses # by itself, as elevenses begins: a hobbit stops to eat
    do:
      - { effects: { party.resources.food: -1 } }
      - { time: 30 }
checks:
  - { event: NIGHT_ENCOUNTER, at: watch.middle, unless: { roles.lookout: none } }
```

The engine already stops at dawn, nightfall and midnight while marching and waiting; it stops too at the start of every part some check or action names (not the others, so a system that names none costs nothing). A moment passed while camping (asleep until dawn) still happens: its checks roll and its actions run, as `day-end` does today.

## 6. Where the user meets it

- **Systems → Calendar**: the divisions, each with its parts (id, from, until, name, tags) or **Every N hours**, with their help; **Rules**: _Day starts_ and _Nightfall_ suggest the parts. Suggestions (`at`, `on`, `time`, `time.<division>`, `time.tags`) everywhere they're typed.
- **Hexmapper → World**: the clock says the part of each division; a **Next …** button per division (_Next meal_, _Next watch_) and a menu of parts to wait until, besides **Dusk** and **Dawn** until item 10; with a trip on, its _Travel on_ / _Wait here_ as today.
- **Travel and the trip panel**: the time line says the parts ("Day 3, 11:20, elevenses, first watch"); the stop message names the system's nightfall by its part's name when it is one.
- **Bundled packs**: the Grey Marches get their own parts (parts of the day, from the grey hour before dawn to the night, and watches only at night, replacing `watchHours`) and a check or action on a part and one on a watch; the Generic rules keep the default calendar's watches of 4 hours, the smallest division (`every`), and a night check on one in phase (c). Kal-Arath (private) needs nothing.
- **Manual**: Kinds (Calendars, Travel rules), What tables see, Syntax, Conditions, Systems' Calendar and Rules pages, World, Travel's Playing, packs pages; en/es.

No persisted format changes: maps and trips keep minutes.

## 7. Decided with the user (2026-10-18)

1. **Where they live**: left to Claude; in the calendar (shared by the world clock, trips and weather), the travel rules only pointing at them (§3).
2. **Any number of divisions**, each system declares what it wants (user: "que cada sistema declare lo que quiera"), not two fixed ones (§2).
3. **Moments `<division>.<part>`** for checks and actions: agreed (§5).
4. **Dawn and nightfall must go**, with item 10 (no built-in march, camp or rest), not now; meanwhile they may name parts (§3).
5. **Three phases**, one commit each: (a) divisions in the calendar (`time`), the world clock and its World panel, Systems' Calendar tab, the Grey Marches' calendar; (b) the travel rules, facts, moments and steps, the trip panel; (c) the Grey Marches and Core using them in their rules, with tests that play them. Manual pages with each phase.

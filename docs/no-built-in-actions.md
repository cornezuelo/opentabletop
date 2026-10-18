# No built-in march, camp or rest — design

Design for the backlog's _No built-in march, camp or rest_ (Alpha 0.1, third round, item 10). The user's asks: with the syntax we have now, the core should only offer mechanisms, and each system declares the actions it wants with the complexity it decides; dawn and nightfall go too (decided with [time-of-day.md](time-of-day.md)); and the Generic rules' game concepts (health, wounded, morale) are a system's values, not the code's. **Agreed with the user 2026-10-18** (section 8).

## 1. What is built in today

| Where                                  | What the code decides                                                                                                                                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUILT_IN_ACTIONS` (travel-engine)     | rules that don't name `camp`, `rest` or `march` get them: camp sleeps until dawn, a rest is an hour, marching is by day for `hoursPerDay` hours; `camp: false` takes one away. A `march` without `when` gets the by-day one                                                                   |
| `day.start` (dawn)                     | `day-start` checks and actions run once the day has dawned; a march never starts before it; the trip going on by itself (**Travel on**, the world clock) waits for it after each night; `system.dawn`; `time: dawn` steps                                                                     |
| `day.nightfall`                        | `time.daylight`; the default march; while waiting, the night's action is taken as it falls; `system.nightfall`; `time: nightfall` steps; the stop said as "night fell"                                                                                                                        |
| `day.night`                            | the night's action, `camp` by default; `NIGHT_WITHOUT` when it can't be taken (the night passes); `camping` (the day ended in it)                                                                                                                                                             |
| `travel.hoursPerDay`                   | the speed's scale (`kmPerDay` over these hours) and the default march's limit; the stop said as "the day's hours are spent" (`day-limit`)                                                                                                                                                     |
| `LEGACY_VALUES`                        | rules without `values` have `lost`, which blocks travel for the day                                                                                                                                                                                                                           |
| `kind: calendar`, world-engine         | `dawn` / `dusk` (06:00 / 20:00 by default): the World panel's **Until dawn** / **Until dusk**                                                                                                                                                                                                 |
| `genericTravelRules`, `GENERIC_SHEET`… | the Generic rules are TypeScript (session, travel-engine): terrains, ways of travelling, food, camp, rest, eat; health and wounded on characters, morale on the party, named by character-ui's i18n (`known`); Systems' **New system**, **New sheet** and **New party sheet** start from them |
| engine commands                        | `{ type: 'camp' }`, `{ type: 'rest' }` (older forms of `{ type: 'action', id }`)                                                                                                                                                                                                              |

What stays, because it's a mechanism and not a game's: moving along a route, time passing minute by minute, the calendar's day (`day-end` at midnight), moments, actions made of steps, conditions, values of the day, and `hoursPerDay` as the scale of `kmPerDay` (declared, required: a system says how many hours its day's distance takes).

## 2. Actions: only what the system declares

- **No actions by default.** Rules that don't declare `camp` have no camp; `camp: false` is still read (it means the same as leaving it out).
- **Marching** is the engine's own mechanism (the Travel buttons), and `actions.march` only says when it can happen (`when` / `unless`). Without it, **the party can march whenever nothing blocks it** (a value of the day, a terrain, the weather): a documented default, the one with no rule in it. A system that wants days and limits writes them:

```yaml
actions:
  march:
    when: { time.tags: { not: dark }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
```

- **No built-in `lost`**: rules without `values` have none.

## 3. No dawn, no nightfall

`day:` goes from the travel rules. What it did is said with the calendar's parts of the day (time-of-day.md), with clocks for a system whose calendar has none:

| Today                                                                   | Format 3                                                                                                                               |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `at: day-start`, `on: day-start`                                        | a part or a clock: `at: part.morning`, `at: '06:00'` (moments take clocks too, as `time:` steps already do)                            |
| `time.daylight`, `daylight`                                             | what the calendar says: `time.part: { not: night }`, `time.tags: { not: dark }`, or a clock: `time.hour: { gte: 6, lt: 20 }`           |
| `system.dawn`, `system.nightfall`                                       | `system.<division>.<part>` (already there)                                                                                             |
| `time: dawn`, `time: nightfall`                                         | `time: part.morning`, `time: '06:00'`                                                                                                  |
| a march never starts before dawn                                        | the march's `when`                                                                                                                     |
| the trip going on by itself waits for dawn                              | it waits until the march's conditions hold again (minute by minute, as marching already checks them), its moments happening on the way |
| `camping`                                                               | `trip.doing: camp` (already there)                                                                                                     |
| calendar `dawn` / `dusk`, World panel's **Until dawn** / **Until dusk** | gone: **Until…** a part, already there                                                                                                 |

`day-start` as a moment goes (no meaning of its own left: "when the day starts" is the system's part or clock). `day-end` stays: midnight, when the calendar's day changes and the day's values become yesterday's.

## 3b. When trips start, and waiting for the next march (added while building phase a)

- `travel.start` (a clock or a part; absent: midnight): when a new trip starts on its first day, which `day.start` used to say. A new trip's moments of its first minute (a clock, a part beginning then) happen as it first marches or waits that day, as dawn's checks did; actions taken before don't use them up.
- The trip panel's **Wait until dawn** becomes **Wait for the next march** (`{ type: 'waitForMarch' }`): today's march goes by (while the party could march, the wait goes on until it can't), then the time passes until the march holds again, the halt taken on the way; three days at most.
- Moments now come as they're reached, asleep in camp too: older rules' `day-start` (their dawn's clock) rolls as the party wakes, not at its first march.

## 4. The halt: what the trip does when it can't march

Today, when the trip goes on by itself (or **March** is pressed with nothing left to march today), the party takes the night's action at nightfall, or the night passes without it, said in the journal. That's useful (the user asked for it: _a night that can't be camped passes_), so it stays as a mechanism, named by the system:

```yaml
travel:
  hoursPerDay: 8
  halt: { at: part.night, do: camp } # from this moment, a party that isn't marching takes this action
```

- `halt.at`: a moment of the day (a part or a clock); `halt.do`: one of the system's actions (a button too).
- From `at` on, a party not marching while the trip goes on by itself takes `do`, once a day; if it can't (its `when`, a value that blocks it…), the journal says so (`HALT_WITHOUT`, as `NIGHT_WITHOUT` today: "The night passes without Camp: …" becomes "Camp can't be taken: …, the time passes") and time passes until the march holds again.
- **No `halt`**: the trip just waits until the march holds again.
- Pressing **March** when the party can't march stops and says why, as today; when the halt can't be taken either, the time passes until it can march, as today.

The stop is said by what stopped it: a part of the day that began ("Night: the march stops"), a value of the day, the weather, or the system's march rule; `nightfall` and `day-limit` as stop reasons go.

## 5. The Generic rules in Core

The Generic rules become a **`kind: system` in Core** (`packs/core/`, `id: default`, so the system's id is `core`), made of data:

- `calendar.yaml`: the plain calendar's watches of 4 hours and a division of the day (night, tagged `dark`; morning; afternoon; evening), so its march and camp can say "by day" and "at night".
- `travel.yaml`: today's terrains, water, roads and trails, foot and horse, food with `min: 0`, `march` by day for `hoursPerDay`, `camp` (until morning), `rest` (an hour by day), `eat` at day-end, `halt: { at: part.night, do: camp }`.
- `sheet.yaml`: the character sheet (health, wounded) and the party sheet (morale).
- `locales/es/`: their Spanish names. character-ui's `known` goes: every name comes from the pack.
- **A system names the travel rules it plays** (`travel:` in `kind: system`, its own or a dependency's: `travel: core/default`, and the same for `sheet:` / `partySheet:`). **A system without `travel:` doesn't travel**: Play and Travel say so, and the map still plays its world, oracle and factions. Nothing falls back on the Generic rules in code.
- **A map with no system chosen** (`meta.system` absent) plays Core's, as it played the generic one. Maps and trips that name `generic` are read as `core` (a migration of each format).
- Systems shows Core's system as any bundled one (its tabs read-only, a dependency's notice for the systems that bring Core); the read-only **YAML** tab made for the Generic rules (`genericYaml`) goes.
- Templates: **New system** copies Core's rules (data the user sees and changes); **New sheet** and **New party sheet** start with one made-up row to rename (`value-1`), not health or morale.

Core's manual page says what its system does and which feature each part shows.

## 6. Format and compatibility

- **`PACK_FORMAT` 3.** Packs of format 1–2 keep their meaning, read by `migrateRules` (session): their `day.start` / `nightfall` become the moments, `daylight` and the march they had (an implicit division of the day from those clocks, only for them), camp, rest and march by default, `lost`, `day.night` as the halt at nightfall; the formats table in File formats gets its row. Our packs move to format 3: Core (with its new system), the Grey Marches, Kal-Arath (private repo).
- **Maps and trips**: a format bump each, reading `generic` as `core`. Old trips with the Generic rules keep their ids (`camp`, `eat`, `food`, `health`, `morale`); `dayChecksDone` is no longer read. `old-maps.test.ts` and `old-trips.test.ts` must keep passing.
- Systems' **Rules** tab: _Day starts_, _Nightfall_ and _Night's action_ become **Halt** (moment and action); old packs get an **Update** button that writes the format-3 form, as for format 2.

## 7. Phases

1. **(a) Engine and session**: format 3 (no `day`, moments with clocks, `halt`, no default actions, `lost`, `daylight`, `dawn` / `nightfall`, `camping`, the old commands; world-engine's `dawn` / `dusk`), `migrateRules` for formats 1–2, stop reasons; tests. Our packs still at format 2 keep playing through the migration.
2. **(b) Core's system**: the Generic rules as data in Core, `GENERIC_*`, `genericTravelRules` and `known` gone, systems without `travel:` don't travel, `generic` read as `core` (maps, trips), templates, Systems' tabs, suggestions from the pack; Core's manual page; tests that play it.
3. **(c) Our packs at format 3 and the apps**: the Grey Marches (`day-start` → `part.morning`, `daylight` → tags, the halt), Kal-Arath; Systems' Rules tab, the trip panel's stop messages, the World panel; every manual page that names dawn, nightfall, daylight, camp or rest by default (Kinds, What tables see, Syntax, Conditions, Connecting, File formats, Systems' Rules and Checks, Travel's Playing, World, the packs pages), en/es; CHANGELOG.

## 8. Decided with the user (2026-10-18)

1. **The halt**: `halt: { at, do }` in the travel rules (§4), not actions that are both a button and taken by themselves.
2. **The Generic rules go in Core** (§5; user: "¿no tenemos Core ya para las genéricas?"), not a pack of their own: Core gets a system, `core`.
3. **A system says which travel rules it plays** (§5; user: "¿no hay manera de que un sistema diga qué reglas de viaje usa, y entonces pueda definir si ninguno (y no se podrá viajar) o genérico?"): none, and it doesn't travel; Core's, by naming them. A map with no system chosen plays Core's.
4. **`day-start` goes** (§3): checks name a part or a clock.

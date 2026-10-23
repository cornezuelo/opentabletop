# Actions and steps

Everything the party does on a trip is an **action** of its system: marching, camping, resting, foraging, crossing a river. The engine has none of its own. Each action says **when** it can be taken (`when` / `unless`, `oncePerDay`), **who** takes it (the player with a button, or the system by itself at a moment: `on:`) and **what it does**: a list of **steps** (`do:`), done in order. This page gathers every step, with an example of each and a whole system at the end that uses them all. The rest of an action (its parameters, its checks, the halt, the way the trip goes on by itself) is in [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system); the YAML of the whole kind in [Kinds of definition](07-kinds.md#travel-rules).

In the Systems app each action is a card in **Rules → Actions**, and each step a card of its own in **What it does**: a choice of what it does (_Pass time_, _Move_, _Take another action_…) and that kind's fields, its own **Only when** / **Not when** as rows, and **YAML** to write it as here (`time: 180`). See [Rules](../systems/05-rules.md#actions).

## Every step at a glance

| Step                                    | What it does                                                      | Time passes    | Stops the trip for the player    |
| --------------------------------------- | ----------------------------------------------------------------- | -------------- | -------------------------------- |
| `time: 180`                             | three hours pass (or until a clock, or a part of the day)         | yes            | no                               |
| `travel.move: destination`              | moves along the route while the action's conditions hold          | yes            | a check may stop it on the way   |
| `travel.speed: 0.5`                     | the rest of today's moving at half speed                          | no             | no                               |
| `travel.advance: 1`                     | one hex along the route at once                                   | no             | a check may stop it              |
| `travel.mode: modes.boat`               | travel another way from now on                                    | no             | no                               |
| `effects: { party.stats.fatigue: 1 }`   | changes the party, its characters, the world                      | no             | no                               |
| `set: { lost: true }`                   | gives a value of the day                                          | no             | no                               |
| `do: actions.forage`                    | takes another action (with `with:` its parameters)                | as that action | as that action                   |
| `roll: checks.ENCOUNTER_CHECK_REQUIRED` | rolls a check now (or `roll: table.ruins`: a table of the Oracle) | no             | as the check says (or the entry) |
| `say: The porters sing`                 | writes a line of the system's own in the journal                  | no             | no                               |
| `pause: The ferry is on the far bank`   | the trip waits, saying so, until **Continue**                     | no             | **yes**                          |
| `ask: params.how`                       | the trip waits for the player to choose a parameter's value       | no             | **yes**                          |
| `wait: { today.ferry: true }`           | time passes until a condition holds, at most until its `limit`    | yes            | no                               |

Every step may have its own `when` / `unless` (it only happens when they hold) and an `id` (to translate what it says). Nothing else goes in a step: each does exactly one of the things above, and the pack shows a problem at that line otherwise.

## Time: `time`

`time: 180` lets 180 minutes pass. `time: '14:00'` lets time pass until that clock next strikes; `time: time.part.morning` (a part of the calendar's day, `<division>.<part>`) until it next begins. Everything on the way happens as it comes: the checks and actions of each moment (`at: '12:00'`, `on: time.part.night`), and every day that ends on the way ends with its `time.day-end` actions and checks. Camping is often just `time: time.part.morning`.

## Moving

- `travel.move: destination` moves the party along its route, minute by minute, while the action's own `when` / `unless` still hold: a march by day stops as night falls. It goes as far as it says: `destination`, `hex` (the next one), a number of hexes (`3`), or a variable (`'{{params.until}}'`: what its parameter says). A check that needs the player stops it on the way; **Go on** goes on with it, then with the steps after it.
- `travel.speed: 0.5` makes the rest of today's moving half as fast (`1.5`: faster; `0`: no more moving today). It multiplies the weather's speed and any earlier `travel.speed` of the day (a weather at `0.5` and this: a quarter).
- `travel.advance: 2` moves the party two hexes (or legs of a way) along its route at once, no time passing: progress by moves instead of marching. A variable too: `'{{party.stats.rank}}'`. See _Journeys by moves_ in [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).
- `travel.mode: modes.boat` changes the way of travelling (one of the system's `modes`, or a variable: `'{{params.by}}'`), if it can be chosen now: its own `when` / `unless` hold and no value of the day blocks it. Otherwise nothing changes. With a destination, the route is planned again for the new way (the fastest), and the journal says so ("Now travelling: By boat").

## Changing things: `effects` and `set`

- `effects: { party.stats.fatigue: 1, party.resources.food: -1 }` changes the party like a table's effects do: a number adds or takes away, `'=0'` sets, `'-{{party.stats.mouths}}'` takes as many as another value, `'+{{1d3}}'` a roll. A change past a value's `min` / `max` stops there, and later steps see its id in `trip.below` / `trip.above`. Characters (`party.members.values.health: 1`, `acting.conditions.wounded: false`), factions and clocks too: see [What results can change](04-what-tables-see.md).
- `set: { lost: true }` gives a value of the day the system declares (`values:`): it lasts until the day ends, and blocks what it lists while it holds.

## Other actions and checks: `do` and `roll`

- `do: actions.forage` takes another action, if its conditions hold (otherwise nothing happens). `{ do: actions.march, with: { until: hex } }` gives it the values of its parameters. An action that takes another is how a forced march marches: `[{ travel.speed: 1.5 }, { do: actions.march }]`.
- `roll: checks.ENCOUNTER_CHECK_REQUIRED` rolls a check now: every check with that event whose conditions hold, whatever its `at`. It's resolved when the action ends, so later steps don't see its result yet.
- `roll: table.ruins` rolls something of the Oracle instead (a table, `oracle.<id>`, `generator.<id>`, `deck.<id>`; another pack's as `core/table.twists`), with no check or binding around it: resolved when the action ends like a check, its result goes to the journal by the table's name, its `set` values and `effects` reach the trip, and an entry with `pause: true` stops it until **Continue**. A name that isn't something to roll is a problem when the pack loads. The Grey Marches' _Delve the ruin_: `[{ time: 180 }, { roll: generator.ruin-delve }]`.

## Talking to the player: `say`, `pause` and `ask`

- `say: The porters sing as they walk.` writes that line in the journal, as the system's own words. Values in it are read at that moment: `say: 'Across, with {{party.resources.food}} food left.'` writes "Across, with 4 food left.". Use it for colour, or to say why something happened (`{ when: { trip.below: food }, say: There is nothing left to eat. }`).
- `pause: true` stops the trip there. The trip panel shows the action waiting, with **Continue**; until it's pressed nothing moves the trip on (marching, waiting and the other actions are greyed out, saying why), though the destination, the way of travelling, the characters and the supplies can still be changed by hand. **Continue** goes on with the rest of the action's steps at once, and then with whatever the pause stopped (a march an action took on the way, see below). With a text instead of `true` (`pause: The ferry is on the far bank.`), the waiting box and the journal say it.
- `ask: params.how` stops the trip the same way, but to ask: the waiting box shows the action's parameter `how` (its `name` as the question, its `description` as its help) and a button for each of its `choices` (their names, their descriptions on hover). Choosing one is going on: the steps after it read the answer as `params.how`, so they can branch with their own conditions (`when: { params.how: swim }`). The parameter must be one of the action's own; its button doesn't offer it (it's asked as the action goes), and whatever it was given (a `with:`, its `default`) is what's chosen if the player gives nothing.

```yaml
params:
  how:
    name: How do you cross?
    description: The current is strong after the rains.
    choices:
      - { id: swim, name: Swim across, description: Quick, but you get soaked. }
      - { id: ferry, name: Wait for the ferry }
do:
  - { ask: params.how }
  - { when: { params.how: swim }, effects: { party.stats.fatigue: 1 } }
  - { when: { params.how: ferry }, wait: { today.ferry: true }, limit: '18:00' }
… # an excerpt of an action
```

**A pause on the way.** When an action the system takes by itself pauses or asks (one with `on: trip.hex-enter`, say a toll at a bridge), it stops whatever was going on as well: the march that entered the hex stays under way. **Continue** (or the choice) goes on with the toll's steps, then with the march, as far as it was going. When two steps would wait at once (two actions at the same moment), the first waits, and the second asks after it.

## Waiting for something: `wait` and `limit`

`wait: { today.ferry: true }` lets time pass until its condition holds, minute by minute, living everything on the way like `time:` does (the moments' checks and actions, the day ending). `limit:` is required: the most it waits, written like `time:` (minutes from now, `'18:00'`, `time.part.night`). If the condition already holds, no time passes; if it never does, the wait ends at the limit. The steps after it can tell which by asking the same condition again.

What can make it hold: the time itself (`time.hour: { gte: 14 }`, `time.part: [afternoon, evening]`), and anything the moments on the way change: an action `on: '12:00'` that sets a value of the day (`set: { ferry: true }`), a check whose result sets one. What doesn't change while waiting: the host's values that only change between your clicks.

## A step's condition, and its `id`

- `when` / `unless` on a step make it happen only when they hold: `{ unless: { trip.below: food }, effects: { party.stats.fatigue: -1 } }` (a fed night). They see what the action's conditions see, plus `params.<id>` (its parameters), `trip.below` / `trip.above` (what hit a bound during the action), `trip.doing` (the action under way) and `trip.moment` (when the system took it).
- `id` names a step so its texts can be translated: in `locales/<language>/`, a step is found by its `id` in its action's `do` (`actions: { grumble: { do: { sulk: { say: … } } } }`), and only `say` and `pause` texts are translated. See [Translations](../oracle/05-translations.md#rules-calendars-weather-and-roll-modes).

## A whole example: a river crossing

A tiny system whose only interesting action is crossing a river: the player chooses how (`ask`), waits for the ferry that comes at noon (`wait`, with an action the system takes at `'12:00'` that sets the value it waits for) or builds a raft (three hours, then `travel.mode`), the journal says how it went (`say`, reading the food left) and the trip waits for the player before going on (`pause`).

```yaml
kind: travel-rules
id: river-crossing
travel:
  hoursPerDay: 8
  start: '06:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '20:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes:
  foot: { name: On foot, kmPerDay: 30 }
  # Only once there's a raft (a value of the day).
  raft: { name: By raft, kmPerDay: 60, when: { today.raft: true } }
resources:
  food: { name: Food, min: 0 }
values:
  ferry: { name: The ferry is here }
  raft: { name: A raft is built }
actions:
  march:
    name: March
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 6, lt: 20 } }
    do: [{ travel.move: '{{params.until}}' }]
  camp:
    name: Camp
    do: [{ time: '06:00' }]
  # The ferry comes at noon: not a button, the system takes it then.
  horn:
    on: '12:00'
    do: [{ set: { ferry: true } }]
  cross:
    name: Cross the river
    params:
      how:
        name: How do you cross?
        choices:
          - { id: ferry, name: Wait for the ferry }
          - { id: raft, name: Build a raft }
    do:
      - { ask: params.how }
      - { when: { params.how: ferry }, wait: { today.ferry: true }, limit: '18:00' }
      - { when: { params.how: raft }, time: 180 }
      - { when: { params.how: raft }, set: { raft: true } }
      - { when: { params.how: raft }, travel.mode: modes.raft }
      - { id: over, say: 'Ready to cross, {{party.resources.food}} food left.' }
      - { pause: true }
```

What you see in the trip, starting at 08:00 with 5 food:

1. **Cross the river**: the trip stops and asks "How do you cross?", with **Wait for the ferry** and **Build a raft** (the journal: "Cross the river: How do you cross? (choose to go on)").
2. **Wait for the ferry**: the time goes to 12:00, when the horn sets **The ferry is here**; the journal says "How do you cross? → Wait for the ferry", then "Ready to cross, 5 food left.", and the trip waits again (the pause), with **Continue**.
3. **Build a raft** instead: three hours pass (11:00), the way of travelling becomes **By raft** ("Now travelling: By raft"), then the same line and the same pause.

## Common mistakes

- **Two things in one step**: `{ time: 60, effects: { … } }` is two steps; write them one after the other.
- **`wait` without `limit`** (or `limit` without `wait`): the pack shows a problem; a wait always says the most it waits.
- **`ask` for something that isn't a parameter of the action**: declare it first, with its choices, in the action's `params`.
- **A `wait` for something nothing changes**: a value only the player changes by hand, or a stat, won't change while waiting; the wait just runs to its limit.
- **`travel.mode` to a way that can't be chosen there** (a boat inland): nothing changes. Give the way's `when` the place where it can be boarded, or set the value it needs first (as the raft above).
- **A `pause` the player never sees coming**: say why (`pause: The bridge is down.`), or `say` it just before.

The Grey Marches use every step: **Take the ferry** (Brenna's ferry over the Saltmere) asks how to pay, waits for her afternoon crossing, says what's left, takes to the boat and pauses; **Go ashore** changes the way back; the hirelings' grumbling says so in the journal. See [The Grey Marches](../packs/02-grey-marches.md).

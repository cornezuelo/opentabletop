# Your first system

A small system for a game where the party carries torches, can get lost in the woods and must rest when tired. Each step is done in the forms (or the same in YAML), and its **Try it** tab plays it at once: your changes count from the next step.

## Step by step

1. **Create it**: type _Dark Woods_ under the system list and press **+**. It starts from the Generic rules: walking 30 km a day, eating 1 food as each day ends.
2. **A supply**: in **Rules → Supplies**, add `torches` with **Min** `0`. Now the trip panel shows Torches, and the player can change them by hand.
3. **Spend it**: open the action **eat** (it runs by itself at `day-end`) and add a step `effects: { party.resources.torches: -1 }`. Each day now burns a torch too.
4. **Being lost**: in **Values of the day**, add `lost` and, in **Blocks**, `travel`. A table that sets `lost: true` will stop the party for the rest of the day.
5. **A check**: in **Checks**, **Add a check**: event `LOST_CHECK`, **When** `day-start`, **Only if** `terrain: forest`. In **Rolled on**, pick a table of yours whose bad result has **Sets** `lost: true` (make it in the Oracle app: _1d6_, 1–2 sets `lost: true`).
6. **Fatigue**: in **Checks → Party stats**, add `fatigue`, starting at `0` (its minimum, `min: 0`, is written in YAML). Then a check **When** `day-end`, **Only if** `below: torches`, **Changes** `party.stats.fatigue: 1`: a day without torches tires the party.
7. **Resting only when tired**: open **rest**: **Only when** `party.stats.fatigue: { gte: 1 }`; steps `time: 120` and `effects: { party.stats.fatigue: -1 }`. The button is off while the party is fresh, and says why.
8. **Try it**: open the **Try it** tab and make a way of three hexes, the middle one `forest`; travel and read the journal: the lost check at dawn in the forest, the torches going down each night, the rest button turning on once tired.

## The same in YAML

The **YAML** tab shows it like this:

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 }, forest: { multiplier: 0.5 } }
modes: { foot: { kmPerDay: 30 } }
resources:
  food: { min: 0 }
  torches: { min: 0 } # step 2
values:
  lost: { blocks: [travel] } # step 4
actions:
  camp: { do: [{ time: dawn }] }
  rest: # step 7
    when: { party.stats.fatigue: { gte: 1 } }
    do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }]
  eat:
    on: day-end
    do:
      - { effects: { party.resources.food: -1 } }
      - { effects: { party.resources.torches: -1 } } # step 3
checks:
  - { event: LOST_CHECK, at: day-start, when: { terrain: forest } } # step 5
  - {
      event: NO_TORCHES,
      at: day-end,
      when: { below: torches },
      effects: { party.stats.fatigue: 1 },
    } # step 6
---
kind: bindings
id: default
stats:
  fatigue: { name: Fatigue, default: 0, min: 0 } # step 6
on:
  LOST_CHECK: { resolve: dark-lost }
---
kind: table # step 5, made in the Oracle app
id: dark-lost
roll: 1d6
entries:
  - { range: 1-2, result: Lost among the trees, set: { lost: true } }
  - { range: 3-6, result: The path holds }
```

The Grey Marches do all of this and much more; their [page](../packs/02-grey-marches.md) says where each part is. Each tab's page tells what else it can do, starting with the [Overview](04-overview.md).

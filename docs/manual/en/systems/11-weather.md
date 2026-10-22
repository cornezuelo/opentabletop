# Weather

The **Weather** tab edits the system's **weather models**: weather with memory, where today's weather depends on yesterday's. This page explains how they work, builds one from nothing step by step and lists the usual mistakes. The YAML of every field: [Weather models](../technical/07-kinds.md#weather-models).

## How weather with memory works

A table of weather rolled each morning forgets the day before: rain, then sun, then a storm, then sun again, as the dice fall. Real weather doesn't jump like that: rain sets in for days, a storm blows over into rain, a fine spell lasts. A **weather model** keeps that memory: each day it starts from yesterday's weather and moves from there.

A model has three parts:

- **Kinds of weather**: what the weather can be (clear, rain, storm…), each with an id that conditions read (`trip.weather: storm`), a name for the journal, and what it **sets for the day** (values the rest of the system can read, like a table's `set`).
- **Seasons**: for each season of the calendar, how the weather moves from one day to the next, in one of two ways: **chance tables** (for each kind of weather yesterday, how likely each kind is today) or a **hex flower** (a board of 19 cells the weather walks on, one step a day).
- Nothing else: the model doesn't slow anyone down or stop anything by itself. That's for the rest of the system, which reads the day's weather.

Three other places make a model play:

1. A **check** rolls it: in [Checks](06-checks.md), a check whose **Rolled on** is the model, under _Weather with inertia_, usually as the morning begins. Without that check nobody rolls the model, and trips have no weather.
2. The [Rules](05-rules.md#weather) say how each kind of weather slows the party (**Speed ×**: `0` is a day without travel), and their **values of the day** what the weather's values block (a way of travelling, an action).
3. Conditions anywhere read it: `trip.weather: storm` in an action's **Not when**, a check's **Skip if**, a terrain's **Closed when**, a table's entry. The day after, yesterday's is `yesterday.weather`.

The system must also name the model (Overview → **Weather models**); **New weather model** does that for you. While no trip is going on, the Hexmapper's world clock rolls the map system's model each day too ([The world clock](../hexmapper/12-world.md#moving-time-on)).

## Kinds of weather

One row per kind: its **id** (short, what conditions read: `rain`), its **Name** (what the journal says: _Steady rain_) and what it **Sets for the day**, as `key: value` pairs: `deep-snow: true`, `climbModifier: -1`. Those values last until the day ends, like the values a table's result sets, and the day after they're `yesterday.deep-snow`. A value only does something when something reads it: a condition, a table, or the rules' **values of the day** (a value there can block a way of travelling or an action while it holds).

## Chance tables

The usual way: for each season, a grid with yesterday's weather in the rows and today's in the columns. Each row says how likely each kind of weather is today, after a day of that row's weather, in **weights**: numbers compared with each other, not percentages.

Reading one row: after a day of **Rain**, `rain 2`, `clear 2`, `storm 1` means 5 in all, so tomorrow is rain again 2 times in 5, clear 2 in 5 and a storm 1 in 5. An empty cell is `0`: that weather never follows. The bigger a row's weight for its own weather (the diagonal), the longer that weather lasts.

**Starts as** is the weather of a trip's first day in that season, and of any day after a weather whose row is empty.

**Over many days**, below each grid, says how often each kind comes up in that season in the long run: whether the season feels right. Change a weight and watch it move.

The seasons are the calendar's (its months' `season`): a model needs one for each season trips are played in. **Add a season** adds one by its id. A season the model doesn't have uses the first one it has.

## Hex flowers

**Make it a hex flower** turns a season into a board of 19 hexagonal cells instead (**Use weights instead** turns it back), each cell a kind of weather. The day's weather is the cell the day is on, and each day 2d6 moves it to a neighbouring cell. So tomorrow is always next to today: the weather drifts instead of jumping, and how you lay out the cells is how the weather behaves.

![A hex flower: the example's winter below, with storms at the top, snow in the middle and clear skies at the bottom. Day 1 is on the middle cell; 2d6 rolls 7 and the day moves south-east, onto Rain; then 5 moves it east, onto Clear. On the right, which way each 2d6 total moves the day.](hex-flower.svg)

In the form, the flower is drawn with each cell coloured by its kind (the legend beside it says which is which): choose a kind under **Paint with** and click cells to give them it. Beside it, **Where each 2d6 goes**:

- 2–3 north-east, 4–5 east, 6–7 south-east, 8–9 south-west, 10–11 west, 12 north-west (a pack can change them with `moves` in the YAML).
- 6, 7 and 8 are the commonest totals of 2d6, so the weather tends to drift **south-east and south-west: downwards**. Put the weather a season heads for at the bottom, and the weather that comes and goes at the top.
- More cells of a kind make it commoner, and cells of a kind side by side make it last (a day moving inside a patch of snow stays snow).

**Starts on** is the weather of the first day: the cell of that kind nearest the middle (empty: the middle cell). **At the edge** says what happens when a roll would leave the flower: **comes back on the far side** (along the same line: the top and bottom rows, and the left and right sides, are neighbours) or **stays** where it is.

**Over many days**, below the flower, says how often each kind comes up, as for chance tables. A model may mix both ways, season by season.

## Step by step: a valley's weather

A model for a valley: summers mostly fine with rainy spells and rare storms, winters of snow with clear spells and storms now and then. Rain slows the party, snow more, a storm stops it, and deep snow leaves the horses behind. Start from any system: a new one (it starts from a copy of the Generic rules, with a way **On horseback**) or the one from [Your first system](03-your-first-system.md).

1. **The model**: in **Weather**, press **New weather model**. It comes with three kinds (`clear`, `rain`, `storm`) and the same chance tables in every season, and the system names it already (Overview → **Weather models**, ticked). Its id is `weather`; give it the **Name** _Valley skies_.
2. **Snow**: under **Kinds of weather**, add `snow`, named _Snow_, with **Sets for the day** `deep-snow: true`.
3. **Summer**: in **Season: summer**, leave **Starts as** on _Clear skies_ and fill the grid:
   - the **Clear skies** row: `clear 5`, `rain 1` (a fine day is followed by another 5 times in 6);
   - the **Rain** row: `rain 2`, `clear 2`, `storm 1`;
   - the **Storm** row: `clear 2`, `rain 1` (and `0` storm: a storm never lasts two days).

   **Over many days** now says about 73 % clear, 23 % rain and 5 % storm.

4. **Winter**: in **Season: winter**, press **Make it a hex flower**. Paint it as in the picture above: storms on the top row's first two cells, snow down the left and through the middle, rain scattered, clear skies along the bottom and on the right. **Starts on**: _Snow_; **At the edge**: _comes back on the far side_. **Over many days** says about a third snow, a third clear, a quarter rain and one day in nine a storm. (Spring and autumn keep the chance tables they came with.)
5. **The check that rolls it**: in **Checks**, **Add a check**: **Check** `WEATHER`, **Name** _Weather_, **When** `time.part.morning` (the Generic rules' calendar, whose day starts with the morning; a clock like `06:00` works too) and, in **Rolled on**, _Valley skies_ under _Weather with inertia_.
6. **What it does to the trip**: in **Rules → Weather**, `rain` **Speed ×** `0.75`, `snow` `0.5` and `storm` `0`. In **Rules → Values of the day**, add `deep-snow`, named _Deep snow_, with **Blocks** `modes.horse`.
7. **Try it**: in **Try it**, make a long way, start a trip in summer and march day after day; then start one in winter.

**What you'll see.** Each morning the journal says _Weather: Clear skies_ (or _Rain_, _Snow_…), with what it sets for the day, and the trip panel shows today's weather. In summer most days are clear and a rainy spell lasts a few days; on rain the party covers three quarters of a clear day's distance. A storm day the march can't start (_The weather prevents travel_) and the next day is clear or rain, never another storm. In winter the weather moves a cell a day: snow lasts, clears little by little, and a storm comes now and then. On a snowy day the party travels at half speed, and **On horseback** can't be chosen (it says _Deep snow_ is why); on foot the trip goes on.

## The same in YAML

The model, as the **YAML** tab shows it:

```yaml
kind: weather
id: weather
name: Valley skies
states:
  clear: { name: Clear skies }
  rain: { name: Rain }
  storm: { name: Storm }
  snow: { name: Snow, set: { deep-snow: true } } # step 2
seasons:
  spring:
    start: clear
    next:
      clear: { clear: 3, rain: 1 }
      rain: { rain: 2, clear: 1, storm: 1 }
      storm: { rain: 2, clear: 1 }
  summer: # step 3
    start: clear
    next:
      clear: { clear: 5, rain: 1 }
      rain: { rain: 2, clear: 2, storm: 1 }
      storm: { clear: 2, rain: 1 }
  autumn:
    start: clear
    next:
      clear: { clear: 3, rain: 1 }
      rain: { rain: 2, clear: 1, storm: 1 }
      storm: { rain: 2, clear: 1 }
  winter: # step 4
    flower:
      start: snow
      rows:
        - [storm, storm, snow]
        - [snow, snow, snow, rain]
        - [snow, rain, snow, rain, clear]
        - [rain, clear, rain, clear]
        - [clear, clear, clear]
```

And what steps 5 and 6 add to the travel rules and the bindings (an excerpt: the rest of the rules stays as it was):

```yaml
# travel rules
weather: { rain: { speed: 0.75 }, snow: { speed: 0.5 }, storm: { speed: 0 } }
values:
  deep-snow: { name: Deep snow, blocks: [modes.horse] }
checks:
  - { event: WEATHER, name: Weather, at: time.part.morning }
  # … the other checks
# bindings
on:
  WEATHER: { weather: weather.weather }
```

The Grey Marches use a model like this one with more weather (grey skies, fog), chance tables for three seasons and a hex flower for winter: their [page](../packs/02-grey-marches.md) says where.

## Common mistakes

- **The trip has no weather.** No check rolls the model: a model only plays when a check's **Rolled on** names it (step 5). The Weather tab alone rolls nothing.
- **Weather that doesn't slow anyone.** A kind of weather the **Rules → Weather** list doesn't name keeps the usual speed; and a value it sets does nothing until something reads it (a value of the day that **Blocks**, a condition, a table).
- **A condition that never matches.** Conditions read the weather's **id**, not its name: `trip.weather: storm`, not `trip.weather: Storm`.
- **A check that sees yesterday's weather.** The checks of one moment come one by one, in the list's order, each seeing what the ones before it set: a check whose **Only if** / **Skip if** reads the weather (`trip.weather: rain`) sees today's only if it comes after the weather's in the list (or at a later moment). Before it, it still sees yesterday's.
- **Two checks rolling the model.** Each roll moves the weather a day: rolled twice a day, it changes twice as fast. One check, once a day.
- **Every season plays the same.** The model's seasons must be named as the calendar's (`summer`, not `Summer`); a season the model doesn't know uses its first season.
- **A weather that never lasts.** Its row has no weight for itself (the storm above, on purpose); or its row is empty, and the day after it starts over from **Starts as**.
- **A flower stuck in one corner.** With **At the edge** on **stays**, the weather piles up where the commonest rolls push it: the example's winter with **stays** is clear 89 % of the time, as the days sink to the bottom row and stay there. Keep **comes back on the far side**, or put at the bottom what the season should mostly be.
- **A flower that jumps.** With **comes back on the far side**, the bottom row's neighbours are the top row's: a day falling off the clear bottom of the example lands on the storms at the top. That's how its storms break a fine spell; if a season shouldn't do that, put weather at the top and bottom edges that may follow each other.

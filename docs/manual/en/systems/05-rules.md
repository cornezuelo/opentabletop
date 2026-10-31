# Rules

The **Rules** tab edits the system's travel rules (`kind: travel-rules`): how a day goes, how fast the party moves and through where, and what it can do. This page explains how a trip moves, then each part of the tab, builds a desert caravan from nothing step by step and lists the usual mistakes. Help next to each field explains it, with examples. Grey text in an empty box is only the default or a hint, not a value. All of it, with the YAML: [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).

## How a trip moves

A trip is a clock and a place. Nothing in it happens by itself: the clock only goes forward when the party does something (an action's steps take time, marching takes time) or when you let it run (**Wait to go on**, the world clock); and the party only leaves its hex when an action moves it.

- **Moments.** As the clock goes forward it passes moments: a clock time (`06:00`), a part of the calendar's day beginning (`time.part.morning`), a hex entered (`trip.place-enter`), the day ending (`time.day-end`), an action taken. At each one, the actions the system takes **by itself** then and its [checks](06-checks.md) of that moment happen, one after another. That's what gives a day its shape: no day is built in.
- **Moving.** Only an action with a **Move** step (`travel.move`) moves the party: the **march**. It walks the route hex by hex while its **Only when** / **Not when** hold, and stops when they don't (at night, once the day's marching hours are spent), when a value of the day blocks it, when the weather's speed is `0`, when a check stops it, or at the end of the way.
- **How long a hex takes.** A way of travelling covers its **km per day** in the **Marching hours a day**: that's its speed on easy ground (30 km in 8 hours: 3.75 km an hour). The hex entered multiplies it by its terrain's **Speed ×**, or, when the party follows a road or river into it, by that line's instead; then by today's weather's **Speed ×** and by a **Change speed** step an action took today. The hex's **km per cell** at that speed is how long it takes: 10 km at 3.75 km/h into a forest at `0.5` is 5 h 20 min. What's left of a hex when the march stops is kept for the next march.
- **Everything else is numbers the system's actions and tables read and change**: what the party carries (food, water…: values of its [sheet](07-sheet.md), or [items](08-items.md)), values of the day (lost…), the party's stats. The app never spends or sets them by itself.

![A day of the Generic rules, from midnight to midnight: (1) the trip starts at 06:00, as the morning begins; (2) the march enters a hex every 2 h 40 min; (3) at 14:00, its 8 hours marched, it stops; (4) the afternoon is the player's, for the other buttons; (5) at 20:00 the night begins and a party left waiting camps until the morning; (6) at midnight the day ends and the party eats.](trip-day.svg)

The picture is the Generic rules' day, which every new system starts from: its march holds while it isn't dark and fewer than 8 hours have been marched, its camp sleeps until the morning, and its **Eat** happens by itself at `time.day-end`. Change any of them and the day changes with it.

## The day

There's no built-in day and no built-in march: the party moves with the actions that have a `travel.move` step (the **march**, below), by day, for some hours, by torchlight…, as the system says.

- **Trips start**: when a new trip starts on its first day, a clock (`06:00`) or a part of the calendar's day (`time.part.morning`, suggested: when it starts). Empty: at midnight.
- **Marching hours a day**: the hours a way of travelling's km a day are marched in, the scale of its speed. How long the party may march each day is the march's (`trip.marched: { lt: '{{system.hoursPerDay}}' }` reads this number). Time spent on actions (resting, foraging) doesn't count as marching.
- **km per cell**: the scale the system is played at, the km a cell measures (a hex, or a square on a [map of squares](../map/01-getting-started.md#hexes-or-squares)). Trips without a map (Travel, **Try it**) use it; a map with this system takes it, unless the map sets its own scale.
- **Diagonal step**: on maps of squares, whether a trip may step to a square touching only at a corner, and what that step costs in steps along a side (`travel.diagonals`): empty, never (four neighbours); `1`, like any step (eight neighbours, as D&D 5e counts); `1.5`, the 1-2-1 count on average (as D&D 3.5 and Pathfinder do); `1.41`, the true distance. It multiplies the step's time and km. **Cut corners** (`travel.cutCorners`) lets a diagonal step pass a corner where a square beside it can't be entered (a wall, a pillar, deep water); unticked, it can't. Hexes have no diagonals.
- **Goes on by itself with** and **With**: the action the trip takes when it goes on by itself (the world clock moving with a trip on, a travel order), with its parameters: `march`, with `until: destination`, marches on to the destination day after day. It takes it whenever it can, and waits (with the halt) while it can't. Nothing: the trip only waits.
- **Halt from** and **Halt action**: what the party does when it can't march while the time moves on by itself (the world clock, **Wait to go on**, a travel order while its way on can't be taken): from that moment (a clock, `20:00`, or a part, `time.part.night`) until the day ends, a party that isn't marching takes the action, once a day; camp, for example. When its conditions don't hold, the journal says why and the time passes without it. No action: the party just waits.

## Ways of travelling

Each with its **Name** and **Description (its help)** for players (the trip panel shows the description of the one chosen as the help of **Travel**), its **km per day** (or, for maps of rooms or points, its **Minutes a step**: one or the other) and: Their order counts: **the first is a new trip's way**; each card shows its place, and its handle (⠿) drags it onto another (or ↑ / ↓ one place).

- **Only through**: where it can go, a condition on each hex it enters, built as rows (see [Conditions as rows](#conditions-as-rows)). E.g. the Grey Marches' boat on water or coast, **Any of these**: `place.water` · **is** · `true` and `place.terrain` · **is** · `coast`, or a cart only by road, `trip.connections` · **is** · `road`. Where it holds, even a terrain that is closed (or not **Passable**) lets it in.
- **Only when**: where and when it can be chosen, as rows too. E.g. the Grey Marches' boat only at the water's edge or the ferry, **Any of these**: `place.water` · **is** · `true`, `place.terrain` · **is** · `coast` and `place.tags` · **is** · `ferry`.
- **Not when**: when it can't.

A trip starts with the first way of the list; the player chooses another in the trip panel.

## Terrains, water and roads

- **Terrains**: how each changes the speed (**Speed ×**) and whether it can be entered (**Passable**, and **Open when** / **Closed when**: conditions on the hex entered and the moment; a way of travelling with **Only through** goes by that alone, as above). E.g. the Grey Marches' peaks, open only in summer and closed in snow or storm: `time.season` · **is** · `summer` / `trip.weather` · **is one of** · `snow, storm`. **Speed × for terrains not listed** covers any terrain the map uses that isn't in the list.
- **Water hexes**: the same, for hexes the map marks as water that have no rule of their own in Terrains. A way of travelling whose **Only through** holds on water can still sail them.
- **Connections**: the kinds of connection between places (roads, trails, rivers, and those drawn with Map's **Connections** tool: a bridge, a gate, a tunnel). Following one from one place to the next, its **Speed ×** replaces the terrain's (a road `1.5`: half again as fast). It replaces it, it doesn't multiply it: a river at `1` makes mountains along it as easy as plains. Kinds not listed do nothing; conditions can still tell them apart (`trip.connections: road`). Each kind may also have its **Name**, **Extra minutes** (a step through it takes them on top of its usual time: a door `10`, ten minutes more; empty or `0`, the step as usual; a connection drawn between far places goes at its **Speed ×**, `1` if empty, over its length, never at the terrain's) and **Passable** with **Open when** / **Closed when**, as terrains, seeing the connection itself (**Closed when** `connection.state: locked`): routes go round one that can't be crossed, or, with no other way, lead up to it and stop there, where an action can change it (`connection.state: open`; [What tables see](../technical/04-what-tables-see.md#the-connection-of-the-step-connection)). The way into a [sub-map](../map/13-sub-maps.md) is a kind of connection too (its map names it: `way-in`), a step that measures no distance: its **Extra minutes** are what going in takes.

## What the party carries

There's no list of supplies in the rules: what the party carries is the system's own, like any other number. Food, water or torches are values of the party's sheet (`party.values.food`, [Sheet](07-sheet.md)), with the **Min**, **Max** and **Starts at** a new trip begins with, or items its characters carry (`party.items.ration`, [Items](08-items.md)), shared out among them. Either way, only the system's own actions, checks and tables spend them, never the app: the Generic rules eat a day of food with an action the system takes at the end of each day; the Grey Marches eat a ration per mouth, and fodder on horseback.

A bound stops a change: past its **Min** or **Max** it stays there, the journal says so, and the system's rules can react (the Grey Marches: a day-end check, fatigue +1, when the rations ran out): later steps of the same action, and the checks of that moment, see `trip.below: party.values.food` (or `trip.above`), by its full name.

## Weather

How each weather slows the party (**Speed ×**; `0`: no travel that day). Weather not listed doesn't change the speed; conditions can still read it (`trip.weather: storm`). Where the day's weather comes from is a check: a table, or a [weather model](13-weather.md).

## Values of the day

Values that tables, weather and actions' **Set a value of the day** steps (`set:`) can set for the rest of the day, each with a name and what it **Blocks** while it holds: travel, one of the system's actions, or a way of travelling as `modes.<id>` (the box suggests what the system declares: `modes.horse` leaves the horses behind while it holds: a party riding stops, and the journal says to choose another way).

The Grey Marches declare **Lost**, which blocks travel: the getting-lost table sets it, and the actions that move the party (its march) stay disabled until the next day, saying why.

**Used by** lists who sets each value and who reads it, today or the next day as `yesterday.<id>` ([Used by](04-overview.md#used-by)).

## Actions

What the party can do: only what the system declares (camp, rest, **march** and its own), all alike, as cards (**Add an action**; × removes one). The cards come folded, each saying in one line who takes it and its first steps (_Rest_ `rest`: _With its button · Pass 2 h → Change: Fatigue −1_; a longer one ends _…and 3 more_); click one to unfold it, or **Unfold all** / **Fold all**. Their order counts: it's the trip panel's buttons', and the order the system takes those of one moment by itself; each card shows its place, and its handle (⠿) drags it onto another (or ↑ / ↓ one place). Unfolded, it starts with a short reading: a line of who takes it and how (_With its button · once a day · choosing How far_), then its **Only when** and **Not when** in words, each on its own line (a condition with groups, which rows can't show, is said short: its YAML is in its field); its steps are the cards below it, each saying what it does. **Search** finds the cards whose name, id, description, moments or steps hold every word you type (`camp fatigue`). Each has:

- an **id**, and a **Name** and description for players;
- **Only when** / **Not when**: when its button can be pressed, built as rows (see [Conditions as rows](#conditions-as-rows) below). E.g. the Grey Marches' Forage for food, not in a storm; `time.hour: { gte: 6, lt: 20 }` for only by day;
- **Once a day**;
- **Hidden when it can't be taken**: otherwise its button stays, disabled, saying why. E.g. the Grey Marches' rite, only at a shrine under a full moon;
- **By itself at**: empty, the player takes it with a button; or the moments the system takes it by itself, written like in the YAML with suggestions: a clock (`06:00`: as it strikes), a part of the calendar's day (`time.meal.elevenses`: as it begins), `trip.place-enter`, `time.day-end`, another action (`actions.camp`) or its end (`actions.camp.done`), a check right after it's resolved (`checks.WEATHER_CHECK_REQUIRED`: the Grey Marches' _A stormy dawn_), or a progress clock filling, however it fills (`world.clocks.<id>.full`, by the id the system declares or, for one made by hand, by its name in lowercase with dashes: see [Moments of the world](../oracle/07-connecting.md#5-your-own-travel-system)), or a world turn of the campaign (`world.turn`: the Grey Marches' _Word on the road_), several, each one a pill (the Grey Marches' Eat, `time.day-end`; their _The Wyrm wakes_, `world.clocks.the-greywood-wyrm-wakes.full`). A step's `time` may also go until a part (`time: time.meal.luncheon`). The words below the box say it back. The actions that follow it and its checks (in [Checks](06-checks.md), at this action) come first;
- **As this turns true**: a moment written as a condition, built as rows: the system takes the action **once, as it turns true** (whatever changed it), and again only after it has stopped holding; with **For each member**, it's looked at for each character, who acts in it (the Grey Marches' _A companion falls_, `acting.values.health` at most `0`; their _The hirelings desert_, `party.values.morale` at most `0`). What already holds when a trip starts comes on its first step. For a state that holds all the while, use a sheet's **Holds while** instead ([Moments written as conditions](../oracle/07-connecting.md#5-your-own-travel-system));
- **Parameters**: what the player chooses beside its button, each with its choices (the first is the default): `until: { choices: [destination, place, 3] }`; its steps and conditions read the one chosen as `{{params.until}}`. Each is a row: its id, its **Name**, its **Choices** as pills (drag one onto another to change their order; the first is the default) and its **Default** when it isn't the first; **YAML** writes them all at once (a choice's name: `{ id: 3, name: Three hexes }`). A `do:` step gives them with `with:`, and so does **Goes on by itself with**;
- **When nothing applies**: what the journal says when none of its checks apply;
- **What it does**, step by step, each step a card (the arrows move a step up or down).

**March** is an action like the rest: its step `travel.move: '{{params.until}}'` moves the party along the route, checking its **Only when** / **Not when** as it goes, and stops as soon as they no longer hold (empty: whenever nothing else stops it, day and night). Its button offers the choices of its parameter (to the destination, one hex…). A system may call it anything (`sail`, `ride`), have several, or none: then the party never moves along its route.

### Conditions as rows

**Only when**, **Not when**, a step's **Wait for something**, a way of travelling's **Only through** and a terrain's **Open when** / **Closed when** are built as rows, one per thing to check: **what it reads** (suggested by full name: `place.terrain`, `party.stats.fatigue`, `trip.weather`…), a **comparison** and a **value** (suggested from what the system declares). For example `trip.weather` · **is none of** · `storm, snow`, or `party.stats.fatigue` · **is under** · `{{party.stats.endurance}}`.

- The comparisons: **is**, **is one of** and **is none of** (values separated by commas), **is not**, **is over**, **is at least**, **is under**, **is at most**, **is there** and **is missing** (no value). They are the `eq`, `in`, `not`, `gt`, `gte`, `lt`, `lte` and `exists` of [Conditions](../technical/08-conditions.md).
- With two rows or more, **All of these** (every row must hold) or **Any of these** (one is enough).
- **+ Add a condition** adds a row; × removes it; with no rows, nothing is checked.
- **YAML** shows the same condition as one line of YAML (`trip.weather: { not: [storm, snow] }`), for what rows can't say; **Rows** goes back. A condition written with groups inside groups (an `any` whose branches check two things, a whole condition turned around with `not:`), like the Grey Marches' march, is shown as YAML only, and kept as it is.

### Steps

Each step is a card. Folded, its title says what it does in words (_Pass 3 h_, _Take March (until: place)_, _Change: Fatigue −1_: what it changes by its name, as the trip's journal says it) and, beside it, its condition (_not when trip.below is party.items.ration_); click the title to open it. Drag a card by its handle (⠿) onto another to move the step there (or ↑ / ↓ one place). Open, **What it does** chooses one of the kinds below, and its fields change with it: a time, a way of travelling, an action and the values of its parameters, a check, rows of changes (`party.stats.fatigue` · `1`)… Changing the kind keeps the step's conditions. Under them, the step's own **Only when** / **Not when**, as rows. **YAML**, at the top of the card, shows the step as the pack writes it, for what the form doesn't cover (an `id`, say). The kinds, as the YAML writes them:

- `time: 180`: three hours pass (or until a clock, `06:00`, or a part of the day, `time.part.morning`);
- `travel.move: destination`: move along the route while time passes and the action's conditions hold, to the destination (`hex`: the next one; `3`: three hexes; `'{{params.until}}'`: as its parameter says); a check that needs you stops it on the way, and **Go on** goes on with it;
- `travel.speed: 0.5`: the rest of today's moving goes at half speed;
- `effects: { party.stats.fatigue: -1 }`: changes the party's stats, its sheet and items (`party.values.food`, `party.items.ration`) or its characters;
- `set: { lost: true }`: sets a value of the day;
- `do: actions.forage`: another action, if its conditions hold; `do: actions.march, with: { until: place }`: with its parameters;
- `roll: checks.<check>`: a check, now; or something of the Oracle (`roll: table.ruins`, `generator.<id>`, `oracle.<id>`, `deck.<id>`), rolled now with no check around it: its result in the journal by its name, its values and changes applied, a pause if its entry says so (the Grey Marches' _Delve the ruin_, `roll: generator.ruin-delve`; Core's _Explore_, `roll: generator.prompt`). The card's **Roll a check or a table** lists both;
- `travel.advance: 1`: move along the route that many hexes or legs at once, no time passing: progress by moves, see _Journeys by moves_ in [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system);
- `travel.mode: modes.boat`: travel another way from now on, if it can be chosen now (the route is planned again for it);
- `say: The porters sing`: a line of the system's own in the journal (`{{party.stats.morale}}` in it reads that value then);
- `pause: true`: the trip waits there until the player presses **Continue** (`pause: The bridge is down`: saying why), then the rest goes on;
- `ask: params.how`: the trip waits for the player to choose one of the action's **Parameters** (`how`), a button per choice; later steps read the answer (**only when** `params.how: swim`), and the action's button doesn't offer that parameter;
- `wait: { today.ferry: true }, limit: '18:00'`: time passes until the condition holds, at most until the limit (minutes, a clock or a part of the day).

A step may also have an `id` (`id: song, say: …`): its translations find it by it. Every step, with examples and a whole system that uses them: [Actions and steps](../technical/10-actions-and-steps.md).

A step can have its own condition: the Grey Marches' camp sleeps until morning and, **unless** `trip.below: party.items.ration` (the rations ran out at the end of the day), takes off 1 fatigue.

## Step by step: a caravan across the salt waste

A system for crossing a desert by camel: camels are faster than walking but drink, the water skins hold three days, a salt flat on the way floods in spring, and an oasis refills the skins. Start from a new system: it begins as a copy of the Generic rules (the day in the picture above, ways **On foot** and **On horseback**, food eaten each night).

1. **Create it**: type _Salt Road_ under the system list and press **+**.
2. **Camels**: under **Ways of travelling**, add `camel`, named _By camel_, **km per day** `40`. In 8 marching hours that's 5 km an hour on easy ground.
3. **The land**: under **Terrains**, set `desert` to **Speed ×** `0.5` (sand is slow: a 10 km hex takes a camel 4 hours). Add `salt-flat`, **Speed ×** `1`, **Passable** ticked, and **Closed when** `time.season: spring`: the spring rains flood it. Leave **Connections** as they are: a `road` at `1.5` replaces the desert's `0.5` wherever the party follows one.
4. **Water**: in **Sheet**, the party's sheet (_the party_, a copy of the Generic rules' with Morale and Food), add a value `water`, named _Water_, **Starts at** `3`, **Min** `0` and **Max** `3`: three days in the skins, never more.
5. **Parched**: under **Values of the day**, add `parched`, named _Parched_, with **Blocks** `modes.camel`: thirsty camels won't carry anyone.
6. **Drinking**: under **Actions**, **Add an action** `drink`, named _Drink_, with **By itself at** `time.part.morning`. Its steps: **Change values** with the row `party.values.water` · `-1`; then a second step, **Set a value of the day** `parched: true`, with **Only when** `trip.below` · **is** · `party.values.water` (only when the skins were already empty: the drink hit the water's **Min**).
7. **The oasis**: **Add an action** `fill`, named _Fill the skins_, with **Only when** `place.terrain` · **is** · `oasis`. Its steps: **Pass time** `60`, then **Change values** `party.values.water` · `3`.
8. **Try it**: in **Try it**, make a way of ten hexes: `desert` all along, but `salt-flat` on hex 6 and `oasis` on hex 10, and a `road` from hex 2 to hex 3. Start a trip in summer, choose **By camel** and march day after day; then start one in spring.

**What you'll see.** The party's card starts with 3 water (its **Starts at**) and, as the first morning begins, the journal says _Drink (Water −1)_. By camel the party enters hex 2 at 10:00 (4 hours of sand), hex 3 at 11:20 (the road), and the march stops at 14:00, its 8 hours spent, two thirds of the way into hex 4. The next day it goes on from there: hex 4 at 07:20, hex 5 at 11:20, the salt flat at 13:20. On the fourth morning the skins are empty: _Water can't go lower than 0_, and the party is _Parched_: **March** stops at once (_Parched: “By camel” can't go on while it lasts; choose another way of travelling_), and **By camel** can't be chosen, saying why. Choose **On foot** and march on: slower (5 h 20 min a hex of sand), but the party reaches the oasis at 13:20. There **Fill the skins** takes an hour and fills them to 3; pressed again, the journal says _Water can't go higher than 3_. In spring there's no way past the flooded salt flat: setting the destination says _No route there_, and **March** goes nowhere. (The times are a fair day's: the weather check the copy keeps rolls each morning, and rain, a storm or snow slow the march.)

## The same in YAML

What the steps add to the Generic rules, as the **YAML** tab shows it (an excerpt: the rest of the rules stays as it was):

```yaml
modes:
  camel: { name: By camel, kmPerDay: 40 } # step 2
terrains:
  desert: { multiplier: 0.5 } # step 3
  salt-flat: { multiplier: 1, passable: { unless: { time.season: spring } } }
values:
  parched: { name: Parched, blocks: [modes.camel] } # step 5
actions:
  drink: # step 6
    name: Drink
    on: time.part.morning
    do:
      - { effects: { party.values.water: -1 } }
      - { when: { trip.below: party.values.water }, set: { parched: true } }
  fill: # step 7
    name: Fill the skins
    when: { place.terrain: oasis }
    do:
      - { time: 60 }
      - { effects: { party.values.water: 3 } }
# … the Generic rules' day, terrains, roads, march, camp, rest, eat and explore
```

And the party's sheet, as the copy came, with the water of step 4:

```yaml
kind: sheet
id: party
values:
  morale: { name: Morale, default: 3, min: 0, max: 5, display: boxes }
  food: { name: Food, default: 6, min: 0 }
  water: { name: Water, default: 3, min: 0, max: 3 } # step 4
```

The Grey Marches play with all of this and more (a boat only through water, a cart only along roads, peaks open only in summer, deep snow that leaves the horses behind, a march by night): their [page](../packs/02-grey-marches.md) says where.

## Common mistakes

- **The party never moves.** No action has a **Move** step, or the march's **Only when** never holds (a clock condition the calendar's day never reaches, a value it reads that nothing sets). Its button says which part doesn't hold.
- **More marching hours don't make a longer day.** **Marching hours a day** is the time a way's **km per day** take: raise it from 8 to 10 and the party walks slower, the same 30 km in 10 hours. To cover more ground, raise the way's **km per day**; to march longer than a day's distance, an action with its own conditions (the Grey Marches' **Forced march**).
- **A terrain that doesn't slow anyone.** The map's terrain id isn't in the list (`dunes` in the map, `desert` in the rules): it gets **Speed × for terrains not listed**, or `1`.
- **A road that makes mountains easy.** Along a road or river, the line's **Speed ×** replaces the terrain's instead of multiplying it. A river at `1` crossing mountains at `0.33` is crossed at `1`.
- **A closed terrain a way still goes through.** A way of travelling with **Only through** goes wherever that condition holds, even through terrains that are closed or not **Passable**: the boat that sails a lake nobody can walk. Add the closing to its **Only through** too.
- **No route at all.** With a terrain closed (the salt flat in spring) and no way around it, there's no route: **March** goes nowhere and setting the destination says _No route there_. On a map, routes go around what's closed when they can.
- **Water that never goes down.** The app never spends what the party carries: an action or a check must (step 6). And a trip starts with each value's **Starts at**: set it in the Sheet tab, or change it on the party's card in the trip.
- **`trip.below: water` never holds.** What hit a bound is named in full: `trip.below: party.values.water` (an item: `party.items.ration`; a stat: `party.stats.fatigue`).
- **A value of the day that does nothing.** It only does something while it holds: what it **Blocks**, or a condition that reads it. Set as the day ends (`time.day-end`), it ends at once: read it the next day as `yesterday.parched`, or set it in the morning, as step 6 does.
- **The party stuck on camels.** A value that blocks the way of travelling the party is on stops it until the player chooses another way; blocking `travel.move` instead stops every way for the rest of the day.
- **A drink that never came.** An action **by itself** at a moment happens when the clock passes it: a trip that started after `time.part.morning` drinks the next morning. And its **Only when** decides whether it happens at all.

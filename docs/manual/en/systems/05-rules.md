# Rules

The **Rules** tab edits the system's travel rules (`kind: travel-rules`): how a day goes, how fast the party moves and through where, what it carries, and what it can do. Help next to each part explains it, with examples. Grey text in an empty box is only the default or a hint, not a value. All of it, with the YAML: [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).

## The day

There's no built-in day and no built-in march: the party moves with the actions that have a `travel.move` step (the **march**, below), by day, for some hours, by torchlight…, as the system says.

- **Trips start**: when a new trip starts on its first day, a clock (`06:00`) or a part of the calendar's day (`time.part.morning`, suggested: when it starts). Empty: at midnight.
- **Marching hours a day**: the hours a way of travelling's km a day are marched in, the scale of its speed. How long the party may march each day is the march's (`trip.marched: { lt: '{{system.hoursPerDay}}' }` reads this number). Time spent on actions (resting, foraging) doesn't count as marching.
- **km per hex**: the scale the system is played at. Trips without a map (Travel, **Try it**) use it; a map with this system takes it, unless the map sets its own scale.
- **Goes on by itself with** and **With**: the action the trip takes when it goes on by itself (the world clock moving with a trip on, a travel order), with its parameters: `march`, with `until: destination`, marches on to the destination day after day. It takes it whenever it can, and waits (with the halt) while it can't. Nothing: the trip only waits.
- **Halt from** and **Halt action**: what the party does when it can't march while the time moves on by itself (the world clock, **Wait to go on**, a travel order while its way on can't be taken): from that moment (a clock, `20:00`, or a part, `time.part.night`) until the day ends, a party that isn't marching takes the action, once a day; camp, for example. When its conditions don't hold, the journal says why and the time passes without it. No action: the party just waits.

## Ways of travelling

Each with its **Name** and **Description (its help)** for players (the trip panel shows the description of the one chosen as the help of **Travel**), its **km per day** and:

- **Only through**: where it can go, a condition on each hex it enters. E.g. the Grey Marches' boat on water or coast, `any: [{ water: true }, { terrain: coast }]`, or a cart only by road, `edges: road`.
- **Only when**: where and when it can be chosen. E.g. the Grey Marches' boat only at the water's edge or the ferry, `any: [{ water: true }, { terrain: coast }, { tags: ferry }]`.
- **Not when**: when it can't.

## Terrains, water and roads

- **Terrains**: how each changes the speed (**Speed ×**) and whether it can be entered (**Passable**, and **Open when** / **Closed when**: conditions on the hex entered and the moment). E.g. the Grey Marches' peaks, open only in summer and closed in snow or storm: `time.season: summer` / `trip.weather: [snow, storm]`. **Speed × for terrains not listed** covers any terrain the map uses that isn't in the list.
- **Water hexes**: the same, for hexes the map marks as water that have no rule of their own in Terrains. A way of travelling whose **Only through** holds on water can still sail them.
- **Roads and rivers**: following one from one hex to the next, its **Speed ×** replaces the terrain's (a road `1.5`: half again as fast). Lines not listed do nothing; conditions can still tell them apart (`edges: road`).

## Supplies

What the party carries, each with its **Name**, **Description (its help)**, **Min** and **Max**. Supplies are used by the system's own actions, checks and tables, never by the app: the Grey Marches eat with an action the system takes at the end of each day (1 food, and 1 fodder on horseback).

**Min** and **Max** bound a supply: a change past one stops there, the journal says so, and the system's rules can react (the Grey Marches: a day-end check, fatigue +1, when food hit its minimum).

Its **Used by** column lists the actions, checks and tables that read, spend or add to each one ([Used by](04-overview.md#used-by)).

## Weather

How each weather slows the party (**Speed ×**; `0`: no travel that day). Weather not listed doesn't change the speed; conditions can still read it (`trip.weather: storm`). Where the day's weather comes from is a check: a table, or a [weather model](11-weather.md).

## Values of the day

Values tables can set for the rest of the day, each with a name and what it **Blocks** while it holds: travel, one of the system's actions, or a way of travelling as `modes.<id>` (the box suggests what the system declares: `modes.horse` leaves the horses behind while it holds).

The Grey Marches declare **Lost**, which blocks travel: the getting-lost table sets it, and the actions that move the party (its march) stay disabled until the next day, saying why.

**Used by** lists who sets each value and who reads it, today or the next day as `yesterday.<id>` ([Used by](04-overview.md#used-by)).

## Actions

What the party can do: only what the system declares (camp, rest, **march** and its own), all alike, as cards (**Add an action**; × removes one). Each has:

- an **id**, and a **Name** and description for players;
- **Only when** / **Not when**: when its button can be pressed, built as rows (see [Conditions as rows](#conditions-as-rows) below). E.g. the Grey Marches' Forage for food, not in a storm; `time.hour: { gte: 6, lt: 20 }` for only by day;
- **Once a day**;
- **Hidden when it can't be taken**: otherwise its button stays, disabled, saying why. E.g. the Grey Marches' rite, only at a shrine under a full moon;
- **By itself at**: empty, the player takes it with a button; or the moments the system takes it by itself, written like in the YAML with suggestions: a clock (`06:00`: as it strikes), a part of the calendar's day (`time.meal.elevenses`: as it begins), `trip.hex-enter`, `time.day-end` or another action (`actions.camp`), several separated by commas (the Grey Marches' Eat, `time.day-end`). A step's `time` may also go until a part (`time: time.meal.luncheon`). The words below the box say it back. The actions that follow it and its checks (in [Checks](06-checks.md), at this action) come first;
- **Parameters**: what the player chooses beside its button, each with its choices (the first is the default): `until: { choices: [destination, hex, 3] }`; its steps and conditions read the one chosen as `{{params.until}}`. A `do:` step gives them with `with:`, and so does **Goes on by itself with**;
- **When nothing applies**: what the journal says when none of its checks apply;
- **What it does**, step by step, each step a card (the arrows move a step up or down).

**March** is an action like the rest: its step `travel.move: '{{params.until}}'` moves the party along the route, checking its **Only when** / **Not when** as it goes, and stops as soon as they no longer hold (empty: whenever nothing else stops it, day and night). Its button offers the choices of its parameter (to the destination, one hex…). A system may call it anything (`sail`, `ride`), have several, or none: then the party never moves along its route.

### Conditions as rows

**Only when**, **Not when** and a step's **Wait for something** are built as rows, one per thing to check: **what it reads** (suggested by full name: `hex.terrain`, `party.stats.fatigue`, `trip.weather`…), a **comparison** and a **value** (suggested from what the system declares). For example `trip.weather` · **is none of** · `storm, snow`, or `party.stats.fatigue` · **is under** · `{{party.stats.endurance}}`.

- The comparisons: **is**, **is one of** and **is none of** (values separated by commas), **is not**, **is over**, **is at least**, **is under**, **is at most**, **is there** and **is missing** (no value). They are the `eq`, `in`, `not`, `gt`, `gte`, `lt`, `lte` and `exists` of [Conditions](../technical/08-conditions.md).
- With two rows or more, **All of these** (every row must hold) or **Any of these** (one is enough).
- **+ Add a condition** adds a row; × removes it; with no rows, nothing is checked.
- **YAML** shows the same condition as one line of YAML (`trip.weather: { not: [storm, snow] }`), for what rows can't say; **Rows** goes back. A condition written with groups inside groups (an `any` whose branches check two things, a whole condition turned around with `not:`), like the Grey Marches' march, is shown as YAML only, and kept as it is.

### Steps

Each step is a card. Folded, its title says what it does in words (_Pass 3 h_, _Take March (until: hex)_, _Change: party.stats.fatigue: -1_) and, beside it, its condition (_not when trip.below is food_); click the title to open it. Open, **What it does** chooses one of the kinds below, and its fields change with it: a time, a way of travelling, an action and the values of its parameters, a check, rows of changes (`party.stats.fatigue` · `1`)… Changing the kind keeps the step's conditions. Under them, the step's own **Only when** / **Not when**, as rows. **YAML**, at the top of the card, shows the step as the pack writes it, for what the form doesn't cover (an `id`, say). The kinds, as the YAML writes them:

- `time: 180`: three hours pass (or until a clock, `06:00`, or a part of the day, `time.part.morning`);
- `travel.move: destination`: move along the route while time passes and the action's conditions hold, to the destination (`hex`: the next one; `3`: three hexes; `'{{params.until}}'`: as its parameter says); a check that needs you stops it on the way, and **Go on** goes on with it;
- `travel.speed: 0.5`: the rest of today's moving goes at half speed;
- `effects: { party.stats.fatigue: -1 }`: changes the party's stats, supplies or characters;
- `set: { lost: true }`: sets a value of the day;
- `do: actions.forage`: another action, if its conditions hold; `do: actions.march, with: { until: hex }`: with its parameters;
- `roll: checks.<check>`: a check, now;
- `travel.advance: 1`: move along the route that many hexes or legs at once, no time passing: progress by moves, see _Journeys by moves_ in [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system);
- `travel.mode: modes.boat`: travel another way from now on, if it can be chosen now (the route is planned again for it);
- `say: The porters sing`: a line of the system's own in the journal (`{{party.stats.morale}}` in it reads that value then);
- `pause: true`: the trip waits there until the player presses **Continue** (`pause: The bridge is down`: saying why), then the rest goes on;
- `ask: params.how`: the trip waits for the player to choose one of the action's **Parameters** (`how`), a button per choice; later steps read the answer (**only when** `params.how: swim`), and the action's button doesn't offer that parameter;
- `wait: { today.ferry: true }, limit: '18:00'`: time passes until the condition holds, at most until the limit (minutes, a clock or a part of the day).

A step may also have an `id` (`id: song, say: …`): its translations find it by it. Every step, with examples and a whole system that uses them: [Actions and steps](../technical/10-actions-and-steps.md).

A step can have its own condition: the Grey Marches' camp sleeps until morning and, **unless** `below: food` (food ran out at the end of the day), takes off 1 fatigue.

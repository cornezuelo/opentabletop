# Rules

The **Rules** tab edits the system's travel rules (`kind: travel-rules`): how a day goes, how fast the party moves and through where, what it carries, and what it can do. Help next to each part explains it, with examples. Grey text in an empty box is only the default or a hint, not a value. All of it, with the YAML: [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).

## The day

- **Dawn** and **Nightfall**.
- **Marching hours a day**: how long the party can march before it has to stop, even if night is still far. Time spent on actions (resting, foraging) doesn't count as marching.
- **km per hex**: the scale the system is played at. Trips without a map (Travel, **Try it**) use it; a map with this system takes it, unless the map sets its own scale.
- **At nightfall, while waiting**: the action the party takes when night falls while the world clock moves, camp by default. When its conditions don't hold, the night passes without it.

## Ways of travelling

Each with its **km per day** and:

- **Only through**: where it can go, a condition on each hex it enters. E.g. the Grey Marches' boat on water or coast, `any: [{ water: true }, { terrain: coast }]`, or a cart only by road, `edges: road`.
- **Only when**: where and when it can be chosen. E.g. the Grey Marches' boat only at the water's edge or the ferry, `any: [{ water: true }, { terrain: coast }, { tags: ferry }]`.
- **Not when**: when it can't.

## Terrains, water and roads

- **Terrains**: how each changes the speed (**Speed ×**) and whether it can be entered (**Passable**, and **Open when** / **Closed when**: conditions on the hex entered and the moment). E.g. the Grey Marches' peaks, open only in summer and closed in snow or storm: `season: summer` / `weather: [snow, storm]`. **Speed × for terrains not listed** covers any terrain the map uses that isn't in the list.
- **Water hexes**: the same, for hexes the map marks as water that have no rule of their own in Terrains. A way of travelling whose **Only through** holds on water can still sail them.
- **Roads and rivers**: following one from one hex to the next, its **Speed ×** replaces the terrain's (a road `1.5`: half again as fast). Lines not listed do nothing; conditions can still tell them apart (`edges: road`).

## Supplies

What the party carries, each with its **Min** and **Max**. Supplies are used by the system's own actions, checks and tables, never by the app: the Grey Marches eat with an action the system takes at the end of each day (1 food, and 1 fodder on horseback).

**Min** and **Max** bound a supply: a change past one stops there, the journal says so, and the system's rules can react (the Grey Marches: a day-end check, fatigue +1, when food hit its minimum). Older systems that used supplies **per day** show a note with **Convert**, which writes the same as such an action.

## Weather

How each weather slows the party (**Speed ×**; `0`: no travel that day). Weather not listed doesn't change the speed; conditions can still read it (`weather: storm`). Where the day's weather comes from is a check: a table, or a [weather model](10-weather.md).

## Values of the day

Values tables can set for the rest of the day, each with a name and what it **Blocks** while it holds: travel, one of the system's actions, or a way of travelling as `mode.<id>` (the box suggests what the system declares: `mode.horse` leaves the horses behind while it holds).

The Grey Marches declare **Lost**, which blocks travel: the getting-lost table sets it, and the trip's Travel buttons stay disabled until the next day, saying why.

## Actions

What the party can do: camp, rest, **march** and the system's own, all alike, as cards (**Add an action**; × removes one). Each has:

- an **id**, and a **Name** and description for players;
- **Only when** / **Not when**: when its button can be pressed. E.g. the Grey Marches' Forage for food, not in a storm; `daylight: true` for only by day;
- **Once a day**;
- **Hidden when it can't be taken**: otherwise its button stays, disabled, saying why. E.g. the Grey Marches' rite, only at a shrine under a full moon;
- **By itself at**: empty, the player takes it with a button; or the moments the system takes it by itself, written like in the YAML with suggestions: `day-start`, `hex-enter`, `day-end` or another action's id, several separated by commas (the Grey Marches' Eat, `day-end`). The words below the box say it back. The actions that follow it and its checks (in [Checks](06-checks.md), at this action) come first;
- **When nothing applies**: what the journal says when none of its checks apply;
- **What it does**, step by step (the arrows move a step up or down).

**March** is the Travel buttons, not a button of its own: it only has **Only when** / **Not when**, checked as the party marches, which stops as soon as they no longer hold. Empty, it marches by day for the day's marching hours. Its name and description are the first Travel button's.

### Steps

Each step is written like in the YAML, with suggestions:

- `time: 180`: three hours pass (or `dawn`, `nightfall`, `14:00`);
- `speed: 0.5`: the rest of today's march goes at half speed;
- `effects: { party.stats.fatigue: -1 }`: changes the party's stats, supplies or characters;
- `set: { lost: true }`: sets a value of the day;
- `do: forage`: another action, if its conditions hold;
- `roll: <check>`: a check, now;
- `advance: 1`: move along the route that many hexes or legs at once, no time passing: progress by moves, see _Journeys by moves_ in [Your own travel system](../oracle/07-connecting.md#5-your-own-travel-system).

A step can have its own condition: the Grey Marches' camp sleeps until dawn and, **unless** `below: food` (food ran out at the end of the day), takes off 1 fatigue.

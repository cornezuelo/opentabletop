# World

The **World** tab edits what the system's world does by itself (`kind: world`, one per system): when a progress clock fills, after every world turn, or as something turns true in the world (a faction's strength reaching 0, a market day), the world reacts: a line on the timeline, a table rolled, clocks and factions changed, another reaction or a world turn. It happens wherever the world moves: the Hexmapper's World panel, the Campaign app, and time moving under a trip. **New world rules** makes them, with one reaction to rename, and names them in the system; a clock's **Add what happens when it fills** ([Clocks](10-clocks.md)) makes one too. This page explains how the world reacts, then the tab, adds a market day to the spreading fever of the Clocks page step by step and lists the usual mistakes. The YAML: [The world's rules](../technical/07-kinds.md#the-world-s-rules).

## How the world reacts

A **reaction** is like an action a trip takes by itself, but the world's: it comes at its moments, if its conditions hold, and does its steps in order.

- **Its moments** (**At**):
  - `world.turn` — after every world turn, once every faction has taken its turn (every few days, by hand, or brought by a trip's step `do: world.turn`).
  - `world.clocks.<id>.full` — as a progress clock fills, whatever fills it: a trip, a table, a faction's turn, another reaction, a click on the World panel. A clock made by hand is named by its name in lowercase with dashes.
  - **As this turns true** — a condition on what the world shows: its clocks (`world.clocks.the-siege`), today's events (`world.events: market-day`), the factions (`factions.the-crown.values.strength`), the moment (`time.season`). It comes **once**, as it turns true, and again only after it has stopped holding.
- **Its conditions**: **Only when** and **Not when**, seen as its moment comes. A reaction whose conditions don't hold does nothing that time.
- **Its steps**, each seeing what the ones before changed, each with its own **Only when**:
  - **Say** — a line on the timeline; `{{…}}` read the world (`The siege: {{world.clocks.the-siege}}`).
  - **Roll** — a table, oracle, generator or deck, with what the world shows: what comes up goes to the timeline, its effects apply.
  - **Change** — clocks (`world.clocks.the-siege` · `1`, `'=0'` empties it) and factions (`factions.the-crown.values.strength` · `-1`, `factions.the-rebels.territory` · `1`, land on the map being played). Never a trip's party: the world has none (for that, let the trip hear the moment).
  - **Bring** — another reaction (`world.reactions.<id>`, whatever its moments, if its conditions hold) or a world turn (`world.turn`).
  - **Pause** — the world waits for the player to **Go on**, saying this (or nothing): `The bridge stands empty.`
  - **Ask** — the world waits for the player to choose one of a **Question**'s choices; the steps after it read the answer as `params.<id>` (a step **Only when** `params.who` is `clans`).
- **Its questions** (**Questions**): what it may ask, each by an id (`who`), with its question (**Name**: _Who takes the bridge?_) and its choices (`clans`, `vale`; a choice's own name, `{ id: clans, name: The Clans }`, in YAML).
- **When they're looked at.** After anything that changes the world (time moving on, a world turn, a clock ticked, a trip's effects, a change by hand), the moments that came are played in the order they happened, each one's reactions in the order the tab lists them; then the conditions, again until nothing new turns true. Moving several days at once looks at each day's start on the way, so a market day in the middle of a week isn't skipped.
- **The memory.** The campaign keeps which conditions held, so each comes once. A campaign that never looked (one started before the system had these rules) takes what holds as seen: nothing comes at once.
- **Chains.** A reaction may bring others: its change fills a clock that reacts, its turn brings `world.turn`, its condition turns another true. Reactions bringing each other in a loop the pack shows (`world.turn` bringing `world.turn`, two clocks filling each other) are refused when the pack loads; a loop only the numbers make stops after 10 in a row, with a line on the timeline.
- **Waiting for the player.** A **Pause** or an **Ask** stops the world where it is: the timeline says what the reaction said so far, and the World panel, the Campaign app and the trip going on show what it waits for, with **Go on** or the question's choices. Nothing else moves the world until it's answered: not time, not world turns, not a trip (the trip shows it too, and doesn't step until it's answered). Then the rest goes on, in order: the reaction's other steps, the moment's other reactions, what becomes of a full clock, the turns that came due and the days still to move (a trip that moved on meanwhile is caught up with). A trip that skips pauses (**Skip pauses**) skips the world's too, their words on the timeline; questions still wait.
- **With a trip going on** the world's reactions play too (the world is one), and what they change the trip reads from its next step. A trip's own rules still react in the trip ([Rules](05-rules.md)).

## The tab

- Their **Name**: what these rules are called.
- Each **reaction** a folded card: its name, its id (how another reaction brings it: `world.reactions.<id>`) and what it does in one line. Unfolded: its **Name**, **Description**, **At** (its named moments as pills, and **As this turns true** as rows), **Only when**, **Not when**, its **Questions** (a row each: id, question, choices as pills; **YAML** for a choice's own name) and its **Steps**: each a row with **What it does**, its value and its **Only when**, moved with ↑ ↓ and removed with ×; **Add a step** adds one.

## Step by step: market day in the Fever Marshes

The Fever Marshes of the [Clocks](10-clocks.md#step-by-step-a-spreading-fever) page have a fever that spreads and roads that close. Every week there's a market at the crossroads: travellers bring the fever along, until the lords close the roads; then the marshes are under quarantine, and the market stops.

1. **The world tab**: open _The Fever Marshes_ and its **World** tab: it has the two reactions the Clocks page made (_The fever spreads_, _The roads close_).
2. **Quarantine**: below them, **Add**, with the id `quarantine`, named _Quarantine_. In **At**, remove the pill `world.turn`, and in **As this turns true** the row `world.clocks.the-closed-roads` · **is at least** · `2`. Its one step: **Say** _The marshes are under quarantine._
3. **Market day**: **Add**, with the id `market`, named _Market day_. In **At**, remove `world.turn`, and **As this turns true** `world.events` · **is** · `market-day`. **Not when** `world.clocks.the-closed-roads` · **is at least** · `2`. Its steps: **Say** _Market day: travellers bring the fever along._, then **Add a step**, **Change** `world.clocks.the-fever` · `1`.
4. **The market**: in the Hexmapper, on the map of the Clocks page, the **World** panel (☾); its **Events** tab: an event named _Market day_ tomorrow, repeating every 7 days (its id is `market-day`).
5. **Time**: in its first tab, move time on 15 days at once.

**What you'll see.** Each market day, as it begins, the timeline says _Market day: travellers bring the fever along._ and the fever fills a segment, though time moved fifteen days in one go: three market days, the third filling it (_The fever reaches the villages._ and a twist, the fever back at 0/4, the roads at 1/2). Click the last segment of the roads (2/2): the timeline says _The lords close the roads._ and then, once, _The marshes are under quarantine._ Move time on another week: no market line, and the fever stays as it was. Open the roads again (click the second segment) and the next market day brings the fever again; close them again and the quarantine is said again.

## The same in YAML

```yaml
# world.yaml
kind: world
id: default
reactions:
  the-fever-fills:
    name: The fever spreads
    on: world.clocks.the-fever.full
    do:
      - say: The fever reaches the villages.
      - roll: core/table.twists
      - effects: { world.clocks.the-closed-roads: 1 }
  the-closed-roads-fills:
    name: The roads close
    on: world.clocks.the-closed-roads.full
    do:
      - say: The lords close the roads.
  quarantine: # step 2
    name: Quarantine
    on: { when: { world.clocks.the-closed-roads: { gte: 2 } } }
    do:
      - say: The marshes are under quarantine.
  market: # step 3
    name: Market day
    on: { when: { world.events: market-day } }
    unless: { world.clocks.the-closed-roads: { gte: 2 } }
    do:
      - say: 'Market day: travellers bring the fever along.'
      - effects: { world.clocks.the-fever: 1 }
```

The Grey Marches' world (_How the Marches move_) plays with all of this: the threats' clocks filling, news on the roads after every world turn, Fort Keld falling once its strength reaches 0 (and with the Clans at war, a world turn at once), and market day in Ashford heartening a weakened Vale: their [page](../packs/02-grey-marches.md) says where.

## Common mistakes

- **Nothing happens.** The world's reactions need the world clock running, and the system naming them (`world:` in its kind: system; **New world rules** and **Add what happens when it fills** do it).
- **It happened once, and never again.** A condition comes once as it turns true, and again only after it has stopped holding. For something every time, use a named moment (`world.turn`, a clock that `reset`s), or a condition that stops holding in between (an event's day ends).
- **It didn't come in a campaign under way.** What already holds when a campaign first looks at the rules is taken as seen. Make it stop holding and turn true again, or do it by hand.
- **A reaction doing nothing when brought.** A reaction brought by another (`world.reactions.<id>`) still has its conditions: if its **Only when** doesn't hold, it does nothing.
- **A loop refused.** A reaction can't bring its own moment, directly or through others: `world.turn` bringing a world turn, a clock's reaction filling that clock. Bring it by a condition instead, or empty the clock first (`'=0'` fills nothing).
- **The world doesn't move.** It waits for you: a reaction paused or asked (**The world waits: …**, in the World panel, the Campaign app and the trip). Answer it, and the rest goes on.
- **Ask with no question.** An **Ask** names one of the reaction's **Questions** (`params.<id>`): add the question first.
- **Party changes.** The world has no party: `party.…` in a world reaction changes nothing. Let the trip hear the moment instead: an action **By itself at** `world.clocks.<id>.full`.
- **An event's id.** Conditions read today's events by their id (`world.events: market-day`), made from the name when the event is scheduled; renaming the event later keeps its id.

# The world reacts — design

Design for what's left of the roadmap's point 5 (_Everything connected through session: reactions and chains of events_). The user's ask (2026-10-20): "una acción ejecuta directamente un oráculo… se dispara una acción cuando se completa un reloj… una condición de personaje activa una consecuencia del mundo… un turno de facción desencadena un evento que modifica el viaje… cadenas de eventos, cómo detectar ciclos". **Agreed 2026-10-23:** three pieces, (1) world turns as moments, (2) reactions of the world without a trip, design first, (3) one manual page saying what reacts to what and in which order. This document covers (1) and (2). **Decided with the user 2026-10-23** (section 8): Claude's recommendations, each checked again for being the most coherent and extensible, not the least work; two changed with that check (a and d).

## 1. What there is today

**In a trip**, almost everything point 5 asks for exists:

- Actions taken by themselves at a moment (`on:`) and checks (`at:`): the day's moments, hexes entered, an action's own (`actions.<id>`, `actions.<id>.done`), a check resolved (`checks.<event>`).
- **Reactions** (alpha item 65): a moment written as a condition, `on: { when: … }`, coming once as it turns true, checked after every settled round and hand edit; `for: party.members`. A character's condition, a value reaching a bound, the weather changing, a world event's day, a faction's value: all are conditions, so a trip already reacts to them.
- **The world heard**: a progress clock that fills, by any means, is the moment `world.clocks.<id>.full`, queued in the campaign (`moments`) and played on the trip's next step.
- Steps: `do:` another action, `roll:` a check or any Oracle table, `effects` on the party, characters, clocks (`world.clocks.<id>`) and factions (`factions.<id>.…`), `say`, `pause`, `ask`.
- Chains: loops through `do:`, `roll:` and moments refused when the pack loads; reactions and heard moments stop after 10 in a row, with a journal line.

**In the world, without a trip** (the Campaign app, the Hexmapper's World panel, or time moving under a trip), only two fixed shapes react:

- A declared clock's **`onFull`** (`kind: clocks`): words for the timeline, a table rolled, effects on clocks and factions, then `keep` / `reset` / `remove`; a full clock filling another, 10 deep at most.
- A **world turn** (every N days, or by hand): each faction rolls its turn table, whose effects change factions and tick clocks.

What the world can't say:

- Nothing reacts to **an event's or holiday's day** (`world.events: market-day`), **a faction's value** crossing a line (`factions.fort-keld.values.strength: { lte: 0 }`), **the world's weather**, or **a world turn** having happened, unless a trip is going on and its rules do it.
- A **trip can't bring a world turn** (`do: world.turn`), and doesn't hear one.
- The world's own happenings live in two places (clocks' `onFull`, factions' turn tables), each with its own keys.

## 2. The idea: the world's reactions, with the steps actions have

A system declares **the world's rules** (`kind: world`, named by `world:` in `kind: system`): a list of reactions, each written as a trip's action is, with the moments and steps that make sense without a trip.

```yaml
kind: world
id: default
name: How the Marches move
reactions:
  # A moment of the world: after every world turn.
  rumours:
    on: world.turn
    do:
      - roll: table.rumours
  # A condition turning true: once, again only after it stopped holding.
  fort-falls:
    on: { when: { factions.fort-keld.values.strength: { lte: 0 } } }
    do:
      - say: Fort Keld falls; the bridge road is open.
      - effects: { factions.fort-keld.territory: -2, world.clocks.the-iron-clans-march: 2 }
  # An event's day is a condition too: it comes as the day begins.
  market:
    on: { when: { world.events: market-day } }
    do:
      - effects: { factions.the-vale.values.strength: 1 }
```

- **Moments** (`on:`): `world.turn` (after a world turn), `world.clocks.<id>.full`, and any condition (`{ when, unless }`) on what the world shows: `world.*` (date, clocks, today's events and holidays, the weather), `factions.<id>.*`, `time.*`. Several at once as a list, as actions'.
- **Steps**: `say` (a line in the timeline), `roll:` a table, oracle, generator or deck (its text in the timeline, its `effects` applied), `effects` on clocks and factions, `do:` another world reaction or `world.turn`, `pause` and `ask` (the world waits for the player, section 3), with `when` / `unless` per step as in actions. **Not** in the world: steps that need a party or a trip (`time`, `travel.*`, `set`): refused when the pack loads.
- **Conditions** on a reaction (`when` / `unless` beside `on:`) as an action's.
- A clock's **`onFull` goes** (decision a): what happens when a clock fills is a world reaction on `world.clocks.<id>.full`, like any other; the clock keeps only what is its own, what becomes of it once full (`then: keep | reset | remove`). Pack format 9; the Grey Marches' three clocks move. Systems' Clocks tab still shows, under each clock, the reactions on its filling (and **Add what happens when it fills**), so nothing is lost in reading.

## 3. Where they play

- **One place, the campaign's world** (`playWorld` in `campaign`), with the reading in `session` (as `clockFull` today: what a reaction does, given the facts and the Oracle; the campaign applies it). So the world reacts the same in the Campaign app, the Hexmapper's World panel and under a trip moving time (`followTrip` goes through it already).
- **When**: after every action on the world (time moving on, a turn, a tick, a hand edit of a clock or a faction, a trip's effects on the world), the moments it brought are played (a turn: `world.turn`; a full clock: its `onFull`, then the reactions on it), then the conditions are checked, in the order of section 5.
- **Memory**: what held last time, kept in the campaign (`reactions`, as trips keep theirs); a campaign without it takes what holds when opened as seen, so nothing fires at once in a campaign under way (the trips' rule, item 65 (c)).
- **Time jumps**: moving a week on checks the conditions at each day's start on the way, so a market day in the middle isn't skipped; a turn due on the way is played at its time, as today.
- **With a trip going on**, the world's reactions run too (the world is one); the trip's own rules still react in the trip.
- **Waiting for the player** (`pause`, `ask`): the campaign keeps what waits (`waiting`: the reaction, its step, the text or the choices), as a trip does, and the rest of that reaction, and of the world's action that brought it (the days still to move, the turns still due), goes on once answered. The Campaign app and the World panel show it as a trip shows its pauses; under a trip, the trip shows it as one of its own pauses and doesn't move on until it's answered. **Skip pauses** applies to the world's too.

## 4. The trip and the world, both ways

- **A trip hears `world.turn`**, as it hears full clocks: queued in the campaign's `moments` and played on its next step (`on: world.turn` in the travel rules, e.g. news reaching the party). The queue becomes general: `{ at, name }` per moment (today `{ clock, ids }`, migrated: a cheap one).
- **A trip brings a world turn**: a step `do: world.turn`. The travel engine doesn't know the world: a `do:` naming `world.…` is journaled as an event for the host (`WORLD_DO`), and the host (the Hexmapper, Travel with a campaign) plays it on the world, as it applies `world.clocks` effects today. Without a campaign, a line says nothing happened.
- An event's day, a faction's value or the world's weather need **no new moment**: they're conditions, and a reaction `{ when }` comes once as they turn true, in a trip or in the world (one mechanism, no `world.events.<id>` moment).

## 5. Order and chains

- One world action's moments are played in the order they happened (time's events and holidays, turns, full clocks); each moment: the clock's `onFull` first, then the reactions on it in the order the pack declares them.
- Then the conditions, in declared order; a reaction's own effects can make another turn true: checked again until nothing new holds.
- **Bounded**: 10 in a row at most (clocks' chain and the trips' rule), with a timeline line where it stopped (`REACTIONS_LOOP`).
- **Found when the pack loads**: a reaction on a moment that brings that moment itself, directly or through others (`on: world.turn` doing `do: world.turn`; `onFull` of a clock filling itself). Conditions can't be followed (what an effect makes true depends on the numbers), so those stay bounded at play.

## 6. The bundled packs

- **The Grey Marches**: a `world.yaml` (_How the Marches move_): rumours rolled after each world turn (the timeline tells what's heard), Fort Keld falling once its strength reaches 0 (land lost, the Clans' march closer), market day strengthening the Vale; a trip's action that brings a world turn (e.g. _Carry the news_ at a fort or village: the factions move); the travel rules hearing `world.turn` (a rumour at the next inn). Descriptions with **Shows:**.
- **Core**: the smallest: one reaction, `on: world.turn`, rolling Core's twists into the timeline.

## 7. Pieces and documentation

- `world-engine`: `kind: world` parsed and checked (moments, steps the world allows, loops); `session`: `worldReaction` (what one does) and the conditions' memory; `campaign`: `playWorld` plays them, the general `moments` queue (campaign format bump); `travel-engine`: `do: world.…` journaled for the host; the Hexmapper and Travel: `WORLD_DO`; travel-ui: its journal line.
- **Systems**: a **World** tab (reactions as folded cards, as actions: `CardHead`, moments and steps, conditions as rows), `world:` in the Overview; suggestions and help for `world.turn` and `do: world.turn`.
- **Manual** (en/es): Systems' World page; Kinds (`kind: world`, `world:` in systems); Connecting, Actions and steps (`do: world.turn`, the moment `world.turn`); Syntax's moments; Campaign's and the Hexmapper's World pages (what reacts as time moves); both packs' pages; and piece (3), the page saying what reacts to what and in which order.

## 8. Decided with the user (2026-10-23)

The user: "me quedaría con lo que recomiendas, pero solo si lo que recomiendas no es por ahorrarte trabajo y realmente es lo más coherente y extensible". Checked again on that ground:

- a. **`onFull` goes into the world's reactions** (changed: keeping it was two ways of saying one thing, the kind of exception item 66 removed; recommended at first partly to spare a pack format change). The clock keeps `then`, its own lifecycle. Pack format 9.
- b. **`kind: world`**, with `reactions:`, room for the world's other settings later (the factions' turn every N days could move there).
- c. **The world's reactions run under a trip too**: the world is one, and a reaction that only ran without a trip would depend on whether anyone travels.
- d. **`pause` and `ask` in the world too** (changed: refusing them was a hidden decision, principle 4, and less work; a system may well want to ask "the fort falls: who takes the bridge?"). The campaign keeps what waits, as trips do (section 3).
- e. **No `world.events.<id>` moment**: an event's day is a condition, `{ when }` comes once as it begins; one mechanism.
- f. **A trip can `do: world.turn`** and hears `world.turn`: both ways, as clocks.

## 9. Phases

One commit each, both bundled packs and the manual with each:

1. **The world's reactions**: `kind: world`, moments and steps (no waiting yet), conditions' memory, time jumps day by day, loops on load; `onFull` moved (pack format 9); Systems' World tab and the Clocks tab's reactions; the Grey Marches' and Core's `world.yaml`.
2. **World turns both ways**: the general `moments` queue (campaign format bump), `world.turn` heard by trips, `do: world.turn` from a trip.
3. **The world waits for the player**: `pause` and `ask` in world reactions, kept in the campaign, shown by the Campaign app, the World panel and trips.
4. ✅ (2026-10-29) **What reacts to what**: the manual page with every moment of every subsystem and the order they're played in (piece 3).

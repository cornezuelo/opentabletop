# What reacts to what

A system's rules react to things happening: a check is rolled at dawn, an action is taken as the party enters a hex, the world reacts when a clock fills, a trip hears a world turn. Each of these is a **moment**, and a definition that reacts to one names it (`at:` on a check, `on:` on an action or a world reaction). This page gathers every moment of every part of the system, says **who hears it** (a trip, the world, or both) and **in which order** everything is played when several things happen at once. How to write each one is in [Syntax](09-syntax.md#moments), [Actions and steps](10-actions-and-steps.md) and [The world's rules](07-kinds.md#the-world-s-rules).

## Two places that react

- **The trip** (its travel rules): its checks (`at:`) and the actions it takes by itself (`on:`). It reacts as the trip goes on, in Map's Play or in Travel. It knows the party, the hex it's in, the day's values.
- **The world** (the system's `kind: world`): its reactions (`on:`). It reacts as the world clock moves, wherever it moves: the Campaign app, Map's World panel, and under a trip going on (the world is one). It knows the world clock, the progress clocks, the factions, today's events and the world's weather; it has no party.

They don't call each other: each hears the other's moments through the campaign (below, [Between the trip and the world](#between-the-trip-and-the-world)).

## Every moment

| Moment                                                  | Heard by       | When                                                                                                 |
| ------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| a clock (`'06:00'`)                                     | trip           | as it strikes, marching, waiting or asleep in camp                                                   |
| a part of the day (`time.part.morning`)                 | trip           | as the calendar's part begins                                                                        |
| `trip.place-enter`                                      | trip           | entering each hex                                                                                    |
| `time.day-end`                                          | trip           | as each day of the trip ends, at midnight                                                            |
| an action (`actions.camp`)                              | trip           | as the party takes it, before its steps                                                              |
| an action's end (`actions.camp.done`)                   | trip           | once its steps are done                                                                              |
| a check (`checks.WEATHER_CHECK_REQUIRED`)               | trip           | right after it's resolved (after **Continue**, if it paused)                                         |
| a clock of the world filling (`world.clocks.<id>.full`) | world and trip | as one of the campaign's progress clocks fills, whatever fills it                                    |
| a world turn (`world.turn`)                             | world and trip | after every faction has taken its turn, whatever brought it (days passing, a hand, `do: world.turn`) |
| a condition turning true (`{ when: … }`)                | world and trip | once, as it turns true, whatever changed it; again only after it stopped holding                     |

A condition is the moment for everything that has no name of its own: a character's condition or value (`party.members.conditions.wounded`, with `for: party.members`), a value reaching a bound (`trip.below: party.values.food`), the weather changing (`trip.weather: storm`), an event's or holiday's day (`world.events: market-day`), a faction's value (`factions.fort-keld.values.strength: { lte: 0 }`), a season (`time.season: winter`). The trip's conditions read what tables see on a trip ([What tables see](04-what-tables-see.md)); the world's read the world only.

What holds by itself on a sheet (a condition with its own `when`, a value made of others) isn't a moment: it's settled before anything else is looked at, so every moment sees it up to date. A reaction may then come as it turns true (a condition on `party.members.conditions.seasick`).

## In a trip

One step of a trip (a click: **March**, **Camp**, an action, **Continue**) plays everything that comes on its way, minute by minute, in the order it comes:

1. **What changed since the last step** is seen first: the party as it is now (changed by hand, or by another app) and what holds by itself on its sheets.
2. **The world's moments** the trip hears that came while it wasn't stepping (a clock filled in the Campaign app) are played first, each as its own moment (see [Between the trip and the world](#between-the-trip-and-the-world)).
3. **The step itself.** As time passes, each moment that comes is played at its minute. When several come in the same minute:
   - **A day that ends** comes first: the day-end moment at midnight, then the new day begins (today's values become `yesterday.*`), then the moments of the new day's first minute.
   - **A clock and a part of the day** that strike together come in the order the rules first name them (checks first, in their order, then actions).
   - **Entering a hex** comes as the party enters it, once the move to it is done.
4. **Each moment** plays, in this order:
   1. the **actions** the system takes by itself at it (`on:`), in the order the rules declare them, each with its own steps; an action that waits (for the player, a check, a roll) holds the rest of the moment until it's done;
   2. the **checks** of the moment (`at:`), in the rules' order, each decided just before it's rolled, so it sees what the checks before it set (a check whose conditions don't hold is skipped);
   3. right after each check is resolved, its moment `checks.<event>` (the actions and checks on it), before the next check of the moment.
5. **Taking an action** (by a button, by a moment, or by `do:`) plays its moment `actions.<id>` first (the actions and checks on it), then its steps in order, then `actions.<id>.done`.
6. **The reactions** (moments written as conditions) are looked at once everything else has settled: no check waiting, no action held, nothing asked. The first one that turned true is played at once, in the same minute; then they're looked at again, so a reaction can set off another. They come in the order the rules declare them; one with `for: party.members` comes for each member it holds for, in the party's order, with that member as `acting`. More than 10 in a row stop, with a line in the journal.
7. Then the step goes on as it was going (the march marches on), until it ends or something stops it.

What a step did to the world (its clocks, its factions, the world turns it brought) is played on the world once the step is done: next section.

## In the world

One action on the world (moving time on, a world turn, a clock ticked, a faction changed by hand, or what a trip's step did) plays this, in order:

1. **Time moving on goes day by day.** Moving a week at once stops at each midnight on the way and plays steps 2–6 there, so a market day in the middle isn't skipped.
2. **The world clock**: the events and holidays of the day.
3. **The world's weather**, one day after another, while no trip has a weather of its own.
4. **The world turns that came due** on the way (every so many days), each at its time. A world turn is:
   1. every **faction's turn**, one by one in the factions' order, each seeing what the ones before did; their lines go on the timeline;
   2. the **clocks they ticked**, then (each clock that filled: step 5);
   3. the world's **reactions on `world.turn`**, in the order the rules declare them.
5. **Each clock that filled**, in the order they filled:
   1. the world's **reactions on `world.clocks.<id>.full`**, in declared order, one line on the timeline with what they said;
   2. then what becomes of the clock (`then: keep | reset | remove`): it starts over only once its reactions are done.
6. **The conditions** (reactions `on: { when: … }`), once the action is done: every one that turned true is played, in declared order; then they're looked at again, since what one changed may make another true, until nothing new holds.

**Inside a reaction**, its steps go in order and each sees what the ones before changed. A step that changes clocks plays at once what they bring (a clock filling: its reactions), and so does `do: world.turn` (the whole turn) and `do: world.reactions.<id>` (that reaction, if its conditions hold); then the next step.

**Chains** are bounded: reactions bringing each other more than 10 deep, or conditions turning each other true for more than 10 rounds, stop, with a line on the timeline. Loops the pack shows (`on: world.turn` with `do: world.turn`, two clocks filling each other) are refused when it loads.

**Waiting for the player.** A world reaction that pauses or asks (`pause:`, `ask:`) stops the world right there. Nothing else moves it (time, turns, a trip) until it's answered; then everything goes on in the order above, from where it stopped: the reaction's other steps, the moment's other reactions, what becomes of a full clock, the other clocks, the turns still due, the days still to move.

## Between the trip and the world

The trip and the world hear each other through the campaign, never directly:

- **The world → the trip.** When a clock fills or a world turn is played, the campaign keeps the moment for the trip going on (`world.clocks.<id>.full`, `world.turn`). The trip hears each, in the order they happened, as soon as the step that brought it is done (or, if it came from elsewhere, before its next step), as a moment of its own: its actions `on:` it, then its checks `at:` it. A full clock says so in the journal first. Moments no trip rule names are dropped. More than 10 heard in a row stop.
- **The trip → the world.** After each step, what the step did reaches the world in the order it was done in the step: its effects on clocks (`world.clocks.<id>: 1`) and factions (`factions.<id>.…`), each played as above (a clock filling, its reactions); every `do: world.turn` it took, played as a turn at its time (the journal says what each faction did); its highlights on the timeline; and last the world clock following the trip's time (step 1 of [In the world](#in-the-world): days, events, turns due).
- **Waiting.** While the world waits for the player, the trip doesn't step (it shows what the world waits for). A trip that skips pauses (**Skip pauses**) skips the world's pauses too; questions still wait.
- **Conditions on both sides.** The trip's reactions read the world too (`world.clocks.the-siege: { gte: 3 }`), and come when the trip next looks at them; the world's conditions don't read the party.

## An example, from start to end

A system whose world has a clock _The siege_ (4 segments) and factions; its world reacts to the siege filling with a world turn, and its trip hears world turns (news at the next inn):

```yaml
# world.yaml
reactions:
  siege-falls:
    on: world.clocks.the-siege.full
    do:
      - say: The fort falls.
      - do: world.turn
# travel rules
actions:
  news:
    on: world.turn
    do:
      - say: Riders bring news of the war.
… # excerpts of two definitions
```

The party camps; the camp's night has a check at `'23:00'` whose result ticks `world.clocks.the-siege: 1`, and the siege is at 3 of 4:

1. In the trip: at 23:00 the check is rolled and resolved (its result goes to the journal); `checks.<event>`'s actions, if any; the night passes until morning, with `time.day-end` at midnight. The step is done.
2. On the world, what the step did, in order: the tick fills the siege. Its reaction: _The fort falls._ on the timeline, then `do: world.turn`: every faction's turn, one by one, then the world's reactions on `world.turn`. Then the siege's `then` (reset, if it says so). Then the world clock follows the trip to the morning, day by day, and last the world's conditions.
3. Back in the trip: it hears what the world kept for it, in order: `world.clocks.the-siege.full` (the journal says the siege filled; any action or check on it), then `world.turn`: **news**, _Riders bring news of the war._

## Common mistakes

- **Expecting a check of a moment to see an action of the same moment the other way round.** Actions of a moment come first, then its checks: a check sees what the actions set, an action doesn't see what the checks will roll. To act on a check's result, react to `checks.<event>`.
- **A reaction on a condition that never "turns" true.** It comes once as it turns true, and again only after it stopped holding. What holds when a trip or a campaign first looks is taken as seen.
- **A world reaction changing the party.** The world has no party. Let the trip hear the moment (`on: world.clocks.<id>.full`, `on: world.turn`) and change the party there.
- **A trip hearing nothing.** The trip must be the one going on in its campaign, and its rules must name the moment (`on:` or `at:`); moments no rule names are dropped.
- **Two moments in the same minute in the wrong order.** Clocks and parts that coincide come in the order the rules first name them; give one a later clock (`'06:01'`) or chain them (`on: actions.<id>.done`) when the order matters.

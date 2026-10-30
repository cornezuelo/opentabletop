# Factions

The **Factions** tab edits the powers of the system's world (`kind: factions`, one per system): kingdoms, clans, guilds, a band of outlaws. **New factions** makes two on Core's turn table, with a sheet of their own, and names them in the system. In Map they're brought onto a map from the World view ([Factions](../map/12-world.md#factions)), and into a campaign from the Campaign app's [Factions](../campaign/02-factions.md) tab. This page explains how factions work, then each part of the tab, builds a border feud from nothing step by step and lists the usual mistakes. Help next to each field explains it, with examples. The YAML: [Factions](../technical/07-kinds.md#factions).

## How factions work

A faction is two things: **a sheet**, like a character's (its Strength, its Wealth, whether it's at war), and **land**, the hexes it holds on a map. The system only says how they **start**; once a campaign brings them in, it keeps their sheets, and each map keeps the land they hold on it. Changing the system later doesn't move what a campaign already has.

- **A world turn** is every faction taking its turn, **one by one, in the list's order**. On its turn a faction rolls its **turn table** (its own, or the one they share): the table sees it as `faction.*` (`faction.values.strength`, `faction.territory`: how many hexes it holds), every faction as `factions.<id>.*` and the world clock (the date, the season, the progress clocks). What comes up goes to the timeline (_The Reavers: A steading burns (land +1)_), and the result's **effects** change the world: the faction itself (`faction.values.strength: -1`, `faction.conditions.at-war: true`), another one (`factions.the-wardens.values.strength: -1`), land, and progress clocks (`world.clocks.the-siege: 1`). Each faction sees what the ones before it did.
- **When.** **World turn**, in Map's World panel or the Campaign app, takes one now, and so does a trip's step `do: world.turn` (an action of the travel rules: see [World turns](../oracle/07-connecting.md#5-your-own-travel-system)). With **Every (days)**, turns also come by themselves as the world clock moves on (by hand, or with a trip): the first that many days after the factions came in, and then every that many days.
- **Land grows and shrinks hex by hex.** `faction.territory: 1` takes a hex next to its land: nobody's first, and when there's none left, a neighbour's (taken from them). `-1` gives up one of its hexes at its edge, which becomes nobody's. Water and hexes off the map are never held, and a faction with no land at all can't grow (it has nowhere to start from). Land changes only on the map being played: without a map (a trip of the Travel app), turns change the sheets and the clocks, never land.
- **Values keep within their bounds**, as a character's: Strength from 0 to 6 never goes past them.
- **The rest of the world reads them, and changes them.** Anywhere conditions and tables are written (a trip's checks, a hand roll, discovery), `factions.<id>.values.strength`, `factions.<id>.conditions: at-war` and `hex.faction` (who holds the hex the party is in) read them; a trip's results, a check's **Changes** or a full clock's effects change them by name: `factions.the-reavers.values.strength: 1`. Only a turn table knows `faction.*`: everywhere else a faction is named by its id.

![One world turn on a strip of the map: the Wardens' land, two hexes of nobody's, the Reavers' land. The Wardens go first and roll Core's turn table: Expands its reach, faction.territory: 1, so they take a nobody's hex next to their land. Then the Reavers roll their own table, 1d6 + their Strength: A steading burns, faction.territory: 1 and the Wardens' Strength −1; the last nobody's hex between them is taken. On the next turn that grows, there is no nobody's land left beside them, so the hex is taken from a neighbour. Below, the two lines the timeline gets.](world-turn.svg)

## The tab

- Their **Name**: what these factions are called together.
- **Their sheet**: the sheet every faction is made with, its values, conditions and kinds of relation. It's edited in the **Sheet** tab, which shows it beside the party's and its characters' (it can also be the characters' own).
- **Their turn**: what each rolls on a world turn, a table, oracle, generator or deck.
- **Every (days)**: how often a world turn comes by itself; empty, only by hand.
- Each faction, by its id (`the-wardens`: how tables name it, `factions.the-wardens.…`), with its **Name**, **Description (its help**, shown when it's opened in the World view), **Colour**, what it **Starts with** (values of its sheet, `strength: 4`; the rest, the sheet's), where it starts (below) and its **Own turn** table, rolled instead of theirs. Their order is the world turn's: each card shows its place, and its handle (⠿) drags it onto another (or ↑ / ↓ one place).

**Where they start.** Here you say where each **starts**: the **Regions** (by the names the map gives them), on any map that has them, and **Hexes** it holds when a map brings the factions in. Hexes are coordinates, and the same coordinates are somewhere else on another map, so they're given only **On the map** you choose: one of the pack's example maps (`maps:` in its system), the map you get by opening it from Map's **Example maps**; `territory: { map: maps/frontier.otd.json, hexes: ['15,9'] }`. From then on the land is the map's: painted by hand in Map's World view and won or lost hex by hex on world turns. Changing where they start doesn't move the land of a map that already has them.

## Step by step: a border feud

Two powers on one border: the Wardens hold the low fells, the Reavers the high moor. Each world turn the Wardens may grow, hold or lose ground (Core's table); the Reavers ride out on a table of their own, rolled with their Strength, and when a steading burns they take land and leave the Wardens weaker and at war. Travellers on the Reavers' land may be robbed, and each robbery makes the Reavers bolder. Start from a new system: it begins as a copy of the Generic rules, without factions.

1. **Create it**: type _The Border_ under the system list and press **+**.
2. **Their factions**: in **Factions**, **New factions**. Name them _The powers of the Border_; **Their turn** stays Core's `core/table.faction-turn` (_A faction's turn_) and **Every (days)** `7`. Change the faction `the-crown` into `the-wardens`, named _The Wardens_, **Colour** `#3a6ea5`, **Starts with** `strength: 4`, **Regions** `The Low Fells`; and `the-rebels` into `the-reavers`, _The Reavers_, `#8b1e1e`, `strength: 3`, **Regions** `The High Moor`.
3. **Their sheet**: in **Sheet**, the tab _faction · the factions_ has what **New factions** made: **Strength** (**Starts at** `3`, **Min** `0`, **Max** `6`) and the condition **At war**. Leave it as it is.
4. **The Reavers' table**: in the Oracle app, **New definition**, a table in your pack _The Border_ with the id `reaver-raid`, named _The Reavers ride_, rolled with `1d6 + {{faction.values.strength}}`: on `1-4` _The raid is beaten off_, with **Changes** `faction.values.strength: -1`; on `5-7` _Cattle driven off in the night_; on `8-12` _A steading burns_, with **Changes** `faction.territory: 1, factions.the-wardens.values.strength: -1, factions.the-wardens.conditions.at-war: true`.
5. **Their own turn**: back in **Factions**, the Reavers' **Own turn** `table.reaver-raid`.
6. **Robbers on the moor**: in **Checks**, **Add a check**, with **Check** `REAVERS`, named _Reavers_. **When** `trip.hex-enter`; **Only if** the rows `hex.faction` · **is** · `the-reavers` and `factions.the-reavers.values.strength` · **is at least** · `{{1d6}}` (on their land, as often as they're strong); no table; **Changes** the rows `party.values.food` · `-1` and `factions.the-reavers.values.strength` · `1`.
7. **A map**: in Map, **New map**; in **Map settings → Campaign → System**, _The Border_. With **Regions** (<kbd>N</kbd>), **New region** named _The Low Fells_ and paint a patch of hexes on the west; another, _The High Moor_, a patch on the east, leaving a couple of hexes of nobody's land between them.
8. **Bring them in**: open the **World** panel (☾), **Start the world clock**, and in its **Factions** tab, **Bring in its factions**. Press **World turn** a few times; then **Next day** eight times.
9. **Travel through the moor**: in **Play**, put the party on the fells, set a destination across the moor and travel.

**What you'll see.** After **Bring in its factions**, the Wardens hold every hex of the Low Fells, in blue stripes, and the Reavers the High Moor, in red; each line says how many hexes. Each **World turn** adds two lines to the timeline, the Wardens' first: _The Wardens: Expands its reach (land +1)_, _Holds what it has_, _Schemes in secret: something is coming_ or _Loses ground (land −1)_; then the Reavers': _The Reavers: Cattle driven off in the night_, or _A steading burns (land +1)_, and the Wardens' sheet shows Strength one less and **At war** ticked. Land grows into the nobody's hexes between them first; once there are none left beside it, a steading that burns takes a hex of the Wardens'. A raid beaten off leaves the Reavers weaker, and a weaker Reavers' roll burns less: at Strength 1 or less, never. On the eighth **Next day**, the first past a week after they came in (at 06:00 of the first day), a turn comes by itself, with its two lines. On the trip, each hex of the Reavers' land entered rolls a d6 against their Strength (**Everything** shows it when it doesn't come up); when it comes up, the journal says _Reavers_ with Food −1, and the Reavers' sheet in the World panel shows Strength one more. On the Wardens' land, and on nobody's, no robbers.

## The same in YAML

The factions and their sheet, as the **YAML** tab shows them:

```yaml
# factions.yaml
kind: factions
id: default # step 2
name: The powers of the Border
sheet: sheet.faction
turn: core/table.faction-turn
every: 7
factions:
  the-wardens:
    name: The Wardens
    color: '#3a6ea5'
    values: { strength: 4 }
    territory: { regions: [The Low Fells] }
  the-reavers:
    name: The Reavers
    color: '#8b1e1e'
    values: { strength: 3 }
    territory: { regions: [The High Moor] }
    turn: table.reaver-raid # step 5
---
kind: sheet
id: faction # step 3
name: Faction
values:
  strength: { name: Strength, default: 3, min: 0, max: 6 }
conditions:
  at-war: { name: At war }
```

The Reavers' table, as the Oracle's YAML editor shows it:

```yaml
kind: table
id: reaver-raid
name: The Reavers ride
roll: '1d6 + {{faction.values.strength}}'
entries:
  - { range: 1-4, result: The raid is beaten off, effects: { faction.values.strength: -1 } }
  - { range: 5-7, result: Cattle driven off in the night }
  - range: 8-12
    result: A steading burns
    effects:
      faction.territory: 1
      factions.the-wardens.values.strength: -1
      factions.the-wardens.conditions.at-war: true
```

What the other steps add to the system and the Generic rules (an excerpt: the rest stays as it was):

```yaml
# system.yaml (kind: system), named by step 2
factions: factions.default
---
# travel.yaml: the rules (kind: travel-rules)
checks:
  - event: REAVERS # step 6
    name: Reavers
    at: trip.hex-enter
    when: { hex.faction: the-reavers, factions.the-reavers.values.strength: { gte: '{{1d6}}' } }
    effects: { party.values.food: -1, factions.the-reavers.values.strength: 1 }
# … the Generic rules' day, terrains, ways, food and actions
```

The Grey Marches play with all of this and more (the Iron Clans, the Vale of Ashford and the garrison of Fort Keld, with strength, wealth and the party's reputation; each with a turn table of its own; land by regions and by hexes on their two example maps; a clock the Clans' turns fill; a patrol that rides wherever the Vale holds the land; a toll that makes the garrison think better of you): their [page](../packs/02-grey-marches.md) says where.

## Common mistakes

- **Nothing to roll.** A faction needs a turn table: **Their turn**, or its **Own turn**. Without either, the system's problems say _nothing to roll on its turn_.
- **A faction that never grows.** Its land starts from the **Regions** named exactly as the map names them (_The High Moor_, not _high moor_); a faction brought in with no land has nowhere to grow from, and `faction.territory: 1` does nothing. Paint it a hex by hand (**✎** in the World panel), and it grows from there.
- **Hexes that don't come.** **Hexes** are given only **On the map** chosen, one of the pack's example maps; on any other map only the regions are. Without **On the map**, the system's problems say so.
- **Starting land changed, map unchanged.** Where they start is read once, when a map brings them in. To see a change, paint the land by hand, or take the factions off the map and bring them in again.
- **`faction.` outside a turn table.** Only a turn table knows whose turn it is. In a trip's check, a hand roll or a world reaction's effects, name the faction: `factions.the-reavers.values.strength: 1`.
- **Effects a turn ignores.** A turn changes factions and progress clocks only: `party.…` or `trip.…` in a turn table change nothing (there's no trip in a world turn).
- **Turns that don't come by themselves.** They need **Every (days)**, the world clock started, and **Turns by themselves** ticked in the World panel; the first comes that many days after the factions came in, not at once.
- **Land that doesn't change.** Land changes on the map being played: a world turn in the Campaign app changes the map chosen there, and a trip of the Travel app, with no map, changes none. `hex.faction` reads nothing there either.
- **An id renamed.** Tables read a faction by its id, not its name: renaming `the-reavers` leaves `factions.the-reavers.…` naming nobody. Each faction's **Used by** lists what reads or changes it (`factions.the-reavers.values.strength`); **Used by** in **Sheet**, what reads its values; a map that already has them keeps the old id.
- **The order of turns.** Factions take their turns in the list's order, and each sees the ones before: a faction whose table reads another's Strength sees it after that one's turn.

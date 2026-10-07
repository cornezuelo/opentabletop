# The Grey Marches

> The old kingdom ends where the road gives out. Past Ashford, the Keld Road crosses the river on a toll bridge and climbs to Fort Keld, whose garrison hasn't been paid in a year. North, the Greywood keeps its own counsel — lights between the trees at night, and something large asleep under the roots. South, the Hollow Hills ring with bandits, and the Saltmere lies flat and grey, crossed only by Brenna's ferry. East of the hills, nobody has drawn the map.

**The Grey Marches** is a small frontier to play and to learn from. It's a bundled pack (MIT) with its own **travel system** and an **example map**, and between them they use every feature of OpenTabletop. Read its files in the Oracle app as worked examples: each one has comments saying what it shows.

## Playing it

1. In the Hexmapper, **Maps → Example maps → The Grey Marches**. It opens as one of your maps; open it again later to go on, or start it fresh.
2. **Play** (<kbd>P</kbd>): the map opens ready, **With rules** and **The Grey Marches**, with discovery on. Choose a season if you like (**New trip**) and click a destination: the party starts in Ashford.
3. Try the road to Fort Keld (the toll), the path to the shrine (the ford), the trail to the Grey Stones (a landmark that waits for you), a night in the Greywood, or the ferry across the Saltmere: at Brenna's shore, switch the travel mode to **By boat**; it only goes on water and coast, so switch back to **On foot** to land.
4. Head east, into the blank hexes: they are discovered as you go (untick **Discover the map as you travel** to keep them blank).

The same system plays without a map in the Travel app.

## The places

Hexes are given by their coordinates (column and row, as the map shows them: `0503` is column 5, row 3).

| Hex           | Place                                                  | What happens                                                                                                                                                                      |
| ------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0608          | **Ashford**, in Ashford Vale (the village, west)       | Where the party starts. Safe: no danger. Ask at the gates with the oracle _Will they let us in?_; spend a night at the inn with _At The Wet Ferret_ (then **Apply to the trip**). |
| 0503          | **The Grey Stones** (north of Ashford)                 | Tag `landmark`: the trip **stops** and waits for you to describe the place and press **Continue**.                                                                                |
| 0909          | **Keld Bridge** (the road crosses the river)           | Tag `toll`: arriving by road, the bridge-warden takes a day's food.                                                                                                               |
| 0907          | **The ford** (the shrine path crosses the river)       | Tag `ford`: rolled on the oracle _Crossing the ford_ (not by boat).                                                                                                               |
| 1104          | **Wayside shrine** (edge of the Greywood)              | Tag `shrine`: rest eases fatigue; one prayer is answered, once.                                                                                                                   |
| 1302–1706     | **The Greywood** (the forest, north)                   | Danger 2 (3–4 in its heart), `haunted` hexes at 1404, 1505 and 1603; the Wyrm (1504), once.                                                                                       |
| 1011          | **The ferry**, Brenna at the shore of **the Saltmere** | Water: only the boat crosses the lake.                                                                                                                                            |
| 1610, 1815    | **Fort Keld**, **Hollow Gate** in **the Hollow Hills** | Danger 2: bandits; peaks nobody can cross.                                                                                                                                        |
| columns 20–24 | **Unknown lands** (the blank east)                     | Discovered as you go.                                                                                                                                                             |

## What is rolled, and when

Every check is in `travel.yaml`; the journal says each one as it comes up.

| Check           | When                                                                                                                                    | Table                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Weather         | Every dawn                                                                                                                              | `weather` (by season)             |
| Getting lost    | Every dawn, unless you set off along a road or river, or by boat                                                                        | `getting-lost` (+ Navigation)     |
| Encounter       | Entering a hex with danger (the Greywood, the Hollow Hills), unless you came by road                                                    | `encounter` (by day)              |
| Toll            | Entering Keld Bridge (0909) by road                                                                                                     | `toll`                            |
| Ford            | Entering the ford (0907), unless by boat                                                                                                | oracle `ford`                     |
| Shrine          | Entering the shrine (1104)                                                                                                              | `shrine`                          |
| **Landmark**    | Entering the Grey Stones (0503), or a discovered landmark: **no table, press Continue**                                                 | —                                 |
| Night encounter | Camping in danger 2 or more                                                                                                             | `encounter` (by night)            |
| Foraging        | Pressing **Forage** (once a day; 3 hours, halves the rest of the day's march) in forest, dense forest, plains, farmland, heath or marsh | `forage` (+ Survival)             |
| Hunger          | Camping with no food left (`party.resources.food` below 1); morale decides how it goes, down to desertion                               | `hunger` (+ Morale) → `desertion` |

**To see Continue**: from Ashford click the Grey Stones (0503) and **Travel**. The trip stops on arrival with _Landmark: waiting for you_ and a **Continue** button in the trip panel; the journal says the same.

## Where each feature is

| Feature                                                                                                                              | File                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Travel rules: terrains, water, a boat, horses that eat fodder, weather, rest                                                         | `travel.yaml` (travel-rules)                                                                       |
| Checks with `edges`, `tags`, `mode`, comparisons, `any` / `all` / `not`, lists                                                       | `travel.yaml` (checks)                                                                             |
| A check that waits for **Continue**                                                                                                  | `travel.yaml`: `LANDMARK_CHECK_REQUIRED`                                                           |
| A check resolved by an **oracle**, its input from the bindings                                                                       | `travel.yaml`: `FORD_CHECK_REQUIRED`; `travel-tables.yaml`: `ford`                                 |
| Party stats used in rolls (`{{charisma}}`, `{{survival}}`, `{{navigation}}`)                                                         | `travel.yaml` (bindings); `reaction`, `forage`, `ford`, `getting-lost`                             |
| One table per season (a reference built from the context)                                                                            | `weather.yaml`: `weather` → `weather-{{season}}`                                                   |
| Weights, 2d6, Fate dice (4dF)                                                                                                        | `weather.yaml`                                                                                     |
| Results the trip understands: `lost`, `weather`, `fatigue`, `resources`                                                              | `travel-tables.yaml`, `weather.yaml`                                                               |
| Day values for later checks (`fordModifier`)                                                                                         | `weather.yaml` → `ford`                                                                            |
| Tables by terrain, region, hex field (`danger`), time of day                                                                         | `encounters.yaml`: `encounter`                                                                     |
| Then roll, `{{result}}`, dice in texts (`{{1d4+2}}`), `once`                                                                         | `encounters.yaml`, `treasure.yaml`                                                                 |
| Generators, and one generator reading another (`{{npc.role}}`)                                                                       | `encounters.yaml`: `npc`, `rumour`                                                                 |
| Keep-highest dice (`4d6kh3`), d66, d100                                                                                              | `encounters.yaml`, `treasure.yaml`                                                                 |
| Oracle with labelled options, a variant with its own dice                                                                            | `oracles.yaml`: `gates`                                                                            |
| A deck with copies, cards that roll tables or give food                                                                              | `decks.yaml`: `omens`                                                                              |
| `maxOccurrences`                                                                                                                     | `treasure.yaml`: `prize`                                                                           |
| Discovering the map                                                                                                                  | `discovery.yaml`                                                                                   |
| Values of regions (`danger` for a whole forest), hexes overriding them, icons (`{{icon.guards}}`) and tokens (`{{token.fare}}`)      | the example map; `oracles.yaml`: `gates`, `ferry`; `encounters.yaml`                               |
| Comparisons `gt`, `lt`, `lte`, `eq`, `in`, `not` with a value, `exists: false`                                                       | `encounters.yaml`, `travel-tables.yaml`: `getting-lost`, `treasure.yaml`: `ruin-delve`             |
| `water` in a condition                                                                                                               | `discovery.yaml`: `hex-contents`                                                                   |
| Today's `*Impossible` value (`fordImpossible`, set by storms)                                                                        | `weather.yaml` → `travel-tables.yaml`: `ford`                                                      |
| Generator fields with `when`, `value` with a template, `context`; `2d6kl1`, `d%`                                                     | `treasure.yaml`: `ruin-delve`                                                                      |
| Another pack's tables: `dependencies` and `aliases`                                                                                  | `pack.yaml`; `decks.yaml`: the `twist` card                                                        |
| Checks with a **name** and **description** for players                                                                               | `travel.yaml` (checks)                                                                             |
| An **action of the system's own** (Forage: time, today's speed, once a day) and a check at it                                        | `travel.yaml`: `actions.forage`, `FORAGE_CHECK_REQUIRED`                                           |
| Tables that **read the party** (`party.stats.morale`, `party.resources.food`) in dice and conditions; `exists: false` without a trip | `travel-tables.yaml`: `hunger`; `oracles.yaml`: `inn`                                              |
| A check whose condition reads the party (`when: { party.resources.food: { lt: 1 } }`)                                                | `travel.yaml`: `HUNGER_CHECK_REQUIRED`                                                             |
| Tables that **change the party**: `stats` (morale; `hirelings`, a stat nobody declared), `resources`, `fatigue`                      | `encounters.yaml`, `travel-tables.yaml`: `getting-lost`, `shrine`, `hunger`; `oracles.yaml`: `inn` |
| A value rolled inside a value and read back by the text (`food: '{{1d3+1}}'`, `{{resources.food}}`)                                  | `travel-tables.yaml`: `forage`                                                                     |
| `maxOccurrences` with `onExhausted: next`, then a cascade into another table                                                         | `travel-tables.yaml`: `hunger` → `desertion`                                                       |
| An oracle whose variants mix conditions, limits, cascades into a table and a generator, and party changes                            | `oracles.yaml`: `inn` (The Wet Ferret)                                                             |
| Region styles: the map's, and regions with their own (a stronger fill; a dashed border without fill)                                 | the example map: the Greywood, the Hollow Hills                                                    |
| Translations                                                                                                                         | `locales/es/`                                                                                      |

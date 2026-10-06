# The Grey Marches

> The old kingdom ends where the road gives out. Past Ashford, the Keld Road crosses the river on a toll bridge and climbs to Fort Keld, whose garrison hasn't been paid in a year. North, the Greywood keeps its own counsel — lights between the trees at night, and something large asleep under the roots. South, the Hollow Hills ring with bandits, and the Saltmere lies flat and grey, crossed only by Brenna's ferry. East of the hills, nobody has drawn the map.

**The Grey Marches** is a small frontier to play and to learn from. It's a bundled pack (MIT) with its own **travel system** and an **example map**, and between them they use every feature of OpenTabletop. Read its files in the Oracle app as worked examples: each one has comments saying what it shows.

## Playing it

1. In the Hexmapper, **Maps → Example maps → The Grey Marches**. It opens as one of your maps; open it again later to go on, or start it fresh.
2. **Play** (<kbd>P</kbd>) → **With rules** → **The Grey Marches**, choose a season and click a destination. The party starts in Ashford.
3. Try the road to Fort Keld (the toll), the path to the shrine (the ford), the trail to the Grey Stones (a landmark that waits for you), a night in the Greywood, or the ferry across the Saltmere: at Brenna's shore, switch the travel mode to **By boat**; it only goes on water and coast, so switch back to **On foot** to land.
4. Tick **Discover the map as you travel** and head east, into the blank hexes.

The same system plays without a map in the Travel app.

## The places

| Place                                                | On the map                              | What happens                                                             |
| ---------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| **Ashford**, in Ashford Vale                         | The village in the west                 | Safe: no danger. Ask at the gates with the oracle _Will they let us in?_ |
| **Keld Bridge**                                      | Where the road crosses the river        | Tag `toll`: by road, the bridge-warden takes a day's food                |
| **The ford**                                         | Where the shrine path crosses the river | Tag `ford`: rolled on the oracle _Crossing the ford_ (not by boat)       |
| **Wayside shrine**                                   | At the edge of the Greywood             | Tag `shrine`: rest eases fatigue; one prayer is answered, once           |
| **The Grey Stones**                                  | North of Ashford                        | Tag `landmark`: the trip waits for you to **Continue**                   |
| **The Greywood**                                     | The forest in the north                 | Danger 1–4, `haunted` hexes; the Wyrm, once                              |
| **The Saltmere** and **the ferry**                   | The lake; Brenna at its shore           | Water: only the boat crosses it                                          |
| **The Hollow Hills**, **Fort Keld**, **Hollow Gate** | The south-east                          | Bandits; peaks nobody can cross                                          |
| **Unknown lands**                                    | The blank east                          | Discovered as you go                                                     |

## Where each feature is

| Feature                                                                                                                         | File                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Travel rules: terrains, water, a boat, horses that eat fodder, weather, rest                                                    | `travel.yaml` (travel-rules)                                                           |
| Checks with `edges`, `tags`, `mode`, comparisons, `any` / `all` / `not`, lists                                                  | `travel.yaml` (checks)                                                                 |
| A check that waits for **Continue**                                                                                             | `travel.yaml`: `LANDMARK_CHECK_REQUIRED`                                               |
| A check resolved by an **oracle**, its input from the bindings                                                                  | `travel.yaml`: `FORD_CHECK_REQUIRED`; `travel-tables.yaml`: `ford`                     |
| Party stats used in rolls (`{{charisma}}`, `{{survival}}`, `{{navigation}}`)                                                    | `travel.yaml` (bindings); `reaction`, `forage`, `ford`, `getting-lost`                 |
| One table per season (a reference built from the context)                                                                       | `weather.yaml`: `weather` → `weather-{{season}}`                                       |
| Weights, 2d6, Fate dice (4dF)                                                                                                   | `weather.yaml`                                                                         |
| Results the trip understands: `lost`, `weather`, `fatigue`, `resources`                                                         | `travel-tables.yaml`, `weather.yaml`                                                   |
| Day values for later checks (`fordModifier`)                                                                                    | `weather.yaml` → `ford`                                                                |
| Tables by terrain, region, hex field (`danger`), time of day                                                                    | `encounters.yaml`: `encounter`                                                         |
| Then roll, `{{result}}`, dice in texts (`{{1d4+2}}`), `once`                                                                    | `encounters.yaml`, `treasure.yaml`                                                     |
| Generators, and one generator reading another (`{{npc.role}}`)                                                                  | `encounters.yaml`: `npc`, `rumour`                                                     |
| Keep-highest dice (`4d6kh3`), d66, d100                                                                                         | `encounters.yaml`, `treasure.yaml`                                                     |
| Oracle with labelled options, a variant with its own dice                                                                       | `oracles.yaml`: `gates`                                                                |
| A deck with copies, cards that roll tables or give food                                                                         | `decks.yaml`: `omens`                                                                  |
| `maxOccurrences`                                                                                                                | `treasure.yaml`: `prize`                                                               |
| Discovering the map                                                                                                             | `discovery.yaml`                                                                       |
| Values of regions (`danger` for a whole forest), hexes overriding them, icons (`{{icon.guards}}`) and tokens (`{{token.fare}}`) | the example map; `oracles.yaml`: `gates`, `ferry`; `encounters.yaml`                   |
| Comparisons `gt`, `lt`, `lte`, `eq`, `in`, `not` with a value, `exists: false`                                                  | `encounters.yaml`, `travel-tables.yaml`: `getting-lost`, `treasure.yaml`: `ruin-delve` |
| `water` in a condition                                                                                                          | `discovery.yaml`: `hex-contents`                                                       |
| Today's `*Impossible` value (`fordImpossible`, set by storms)                                                                   | `weather.yaml` → `travel-tables.yaml`: `ford`                                          |
| Generator fields with `when`, `value` with a template, `context`; `2d6kl1`, `d%`                                                | `treasure.yaml`: `ruin-delve`                                                          |
| Another pack's tables: `dependencies` and `aliases`                                                                             | `pack.yaml`; `decks.yaml`: the `twist` card                                            |
| Translations                                                                                                                    | `locales/es/`                                                                          |

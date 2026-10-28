# Terrain

Paint the land with the **Terrain** tool (<kbd>B</kbd>).

## Painting

- **Brush** (<kbd>B</kbd>): click or drag to paint the selected terrain. The **Brush size** slider paints several hexes at once (<kbd>[</kbd> and <kbd>]</kbd> change it).
- **Fill** (<kbd>G</kbd>): paints a whole connected area of the same terrain.
- **Erase** (<kbd>E</kbd>), or the right mouse button with any mode: removes the terrain.
- <kbd>Ctrl</kbd>+click picks the terrain under the cursor (eyedropper).

## The palette

The palette lists the map's terrains, grouped:

| Group           | Terrains (ids)                                                    |
| --------------- | ----------------------------------------------------------------- |
| Lowlands        | steppe, plains, farmland, heath, savanna                          |
| Forests         | forest, dense-forest, jungle, taiga                               |
| Wetlands        | swamp, marsh                                                      |
| Highlands       | hills, mountains, peaks, volcanic                                 |
| Arid            | desert, badlands, canyon, oasis                                   |
| Cold            | tundra, snow, glacier                                             |
| Water and coast | coast, lake, sea, deep-sea (coast is land: the shore you walk on) |

Your own terrains go under **Other**. Each map keeps the palette it was made with. **Edit palette** shows each terrain's **id** beside its name (`dense-forest`): what tables, conditions and travel rules write (`hex.terrain: dense-forest`), whatever the language of its name.

Not every game is fantasy. In **Edit palette**, **Add terrains for…** adds a whole set at once (only the terrains the map lacks), each with its symbol and a speed in the Generic rules (Core's):

| Set               | Terrains                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Natural (default) | the palette above; brings older maps up to date                                                             |
| Modern            | city, suburbs, industrial (group _Towns and cities_)                                                        |
| Post-apocalyptic  | ruins, wasteland, irradiated, toxic swamp, crater (group _Wasteland_)                                       |
| Sci-fi and space  | alien jungle, crystal field, lava field, regolith (_Alien worlds_); space, nebula, asteroid field (_Space_) |

Lava fields, space, nebulae and asteroid fields are closed to walking in the Generic rules: a system of your own gives ships a way of travelling that only goes there (`through: { hex.terrain: [space, nebula] }`), like the Grey Marches' boat on water. **Edit palette** lets you change each one:

- **Color** and **name** (empty name = the translated default).
- **Symbol**: the small drawing on its hexes (see below).
- **Water**: marks the terrain as water. On the map, roads, trails and rivers stop at its shore (walls and borders cross it). It changes nothing else on the map. On a trip, water hexes follow the travel rules' **water** rule unless their terrain has its own: the Generic rules and the Grey Marches make them impassable on foot (except lakes in winter, crossed on the ice: a terrain can open or close on a condition), and a system can have boats that only sail water (the Grey Marches' boat crosses the Saltmere). Tables see `water: true` on those hexes.
- Add your own terrains or delete them (hexes painted with a deleted terrain become empty).

Terrain ids (`forest`, `hills`…) are what travel rules and tables read, so a table can say `when: { hex.terrain: forest }`.

## Terrain symbols

Each terrain can draw a subtle symbol on its hexes (a tree, a mountain, waves…) in a lighter or darker shade of its color. Pick it in **Edit palette** with the button next to the color: the Terrain set, any image of the map, or **Import an image…** for your own. The **Terrain symbols** slider fades them; at 0 they're hidden. Hexes with an icon show the icon instead.

## Generating land

**Generate land**, at the bottom of the Terrain tool, fills the map's **empty** hexes with a **land model** of the map's system (its `land:`, see [Land models](../technical/07-kinds.md#land-models)): for each terrain, how likely a hex next to it is to be each terrain. Each empty hex adds up the land of all its known neighbours, so forests, ranges and lakes grow together instead of a patchwork.

- Paint the land you care about first (a coast, a range, a lake): the land grows outwards from it, the hexes with most painted neighbours first. Painted hexes never change.
- **Seed**: the same seed draws the same land (note it to draw it again); 🎲 gives another. **Land model** chooses one when the system has several.
- **Fill the empty hexes** fills every empty hex of the map; ↶ takes it all back in one step, so try another seed and fill again.
- To fill only one region, paint the region on the empty hexes and use its panel's **Generate its empty hexes** ([Regions](03-regions.md)).
- A terrain the model draws that the map's palette lacks is said in a message: add it with **Edit palette**.

With the Generic rules, _The plain land_ grows plains, farmland, forests, hills, mountains, lakes and marshes. The Grey Marches' example map leaves its east blank: **Fill the empty hexes** draws it with _The lie of the Marches_ (hills that rise into ranges east of the Hollow Hills), or leave it blank to discover it as you travel ([Play](08-play.md)).

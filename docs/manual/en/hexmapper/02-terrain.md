# Terrain

Paint the land with the **Terrain** tool (<kbd>B</kbd>).

## Painting

- **Brush** (<kbd>B</kbd>): click or drag to paint the selected terrain. The **brush size** slider paints several hexes at once (<kbd>[</kbd> and <kbd>]</kbd> change it).
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

Your own terrains go under **Other**. Each map keeps the palette it was made with.

Not every game is fantasy. In **Edit palette**, **Add terrains for…** adds a whole set at once (only the terrains the map lacks), each with its symbol and a speed in the generic travel rules:

| Set               | Terrains                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Natural (default) | the palette above; brings older maps up to date                                                             |
| Modern            | city, suburbs, industrial (group _Towns and cities_)                                                        |
| Post-apocalyptic  | ruins, wasteland, irradiated, toxic swamp, crater (group _Wasteland_)                                       |
| Sci-fi and space  | alien jungle, crystal field, lava field, regolith (_Alien worlds_); space, nebula, asteroid field (_Space_) |

Lava fields, space, nebulae and asteroid fields are closed to walking in the generic rules: a system of your own gives ships a way of travelling that only goes there (`allowedTerrains: [space, nebula]`), like the Grey Marches' boat on water. **Edit palette** lets you change each one:

- **Color** and **name** (empty name = the translated default).
- **Symbol**: the small drawing on its hexes (see below).
- **Water**: marks the terrain as water. On the map, roads, trails and rivers stop at its shore (walls and borders cross it). It changes nothing else on the map. On a trip, water hexes follow the travel rules' **water** rule unless their terrain has its own: the generic rules, the Grey Marches and Kal-Arath make them impassable on foot, and a system can have boats that only sail water (the Grey Marches' boat crosses the Saltmere). Tables see `water: true` on those hexes.
- Add your own terrains or delete them (hexes painted with a deleted terrain become empty).

Terrain ids (`forest`, `hills`…) are what travel rules and tables read, so a table can say `when: { terrain: forest }`.

## Terrain symbols

Each terrain can draw a subtle symbol on its hexes (a tree, a mountain, waves…) in a lighter or darker shade of its color. Pick it in **Edit palette** with the button next to the color: the Terrain set, any image of the map, or **Import an image…** for your own. The **Terrain symbols** slider fades them; at 0 they're hidden. Hexes with an icon show the icon instead.

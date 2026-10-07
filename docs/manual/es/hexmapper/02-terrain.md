# Terreno

Pinta el territorio con la herramienta **Terreno** (<kbd>B</kbd>).

## Pintar

- **Pincel** (<kbd>B</kbd>): haz clic o arrastra para pintar el terreno elegido. El control **Tamaño del pincel** pinta varios hexes a la vez (<kbd>[</kbd> y <kbd>]</kbd> lo cambian).
- **Rellenar** (<kbd>G</kbd>): pinta toda una zona conectada del mismo terreno.
- **Borrar** (<kbd>E</kbd>), o el botón derecho en cualquier modo: quita el terreno.
- <kbd>Ctrl</kbd>+clic coge el terreno que hay bajo el cursor (cuentagotas).

## La paleta

La paleta lista los terrenos del mapa, agrupados:

| Grupo         | Terrenos (ids)                                                                |
| ------------- | ----------------------------------------------------------------------------- |
| Tierras bajas | steppe, plains, farmland, heath, savanna                                      |
| Bosques       | forest, dense-forest, jungle, taiga                                           |
| Humedales     | swamp, marsh                                                                  |
| Tierras altas | hills, mountains, peaks, volcanic                                             |
| Árido         | desert, badlands, canyon, oasis                                               |
| Frío          | tundra, snow, glacier                                                         |
| Agua y costa  | coast, lake, sea, deep-sea (la costa es tierra: la orilla por la que se anda) |

Tus propios terrenos van en **Otros**. Cada mapa conserva la paleta con la que se creó.

No todo es fantasía. En **Editar paleta**, **Añadir terrenos de…** añade un conjunto entero de una vez (solo los terrenos que le faltan al mapa), cada uno con su símbolo y una velocidad en las reglas de viaje genéricas:

| Conjunto                  | Terrenos                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Natural (por defecto)     | la paleta de arriba; pone al día los mapas antiguos                                                                                       |
| Moderno                   | ciudad, afueras, industrial (grupo _Pueblos y ciudades_)                                                                                  |
| Postapocalíptico          | ruinas, páramo, irradiado, ciénaga tóxica, cráter (grupo _Páramo_)                                                                        |
| Ciencia ficción y espacio | jungla alienígena, campo de cristales, campo de lava, regolito (_Mundos alienígenas_); espacio, nebulosa, campo de asteroides (_Espacio_) |

Los campos de lava, el espacio, las nebulosas y los campos de asteroides están cerrados a pie en las reglas genéricas: un sistema propio da a las naves una forma de viajar que solo va por ahí (`allowedTerrains: [space, nebula]`), como la barca de las Marcas Grises por el agua. **Editar paleta** permite cambiar cada uno:

- **Color** y **nombre** (nombre vacío = el traducido por defecto).
- **Símbolo**: el pequeño dibujo de sus hexes (ver abajo).
- **Agua**: marca el terreno como agua. En el mapa, los caminos, senderos y ríos se detienen en su orilla (los muros y fronteras la cruzan). No cambia nada más en el mapa. En un viaje, los hexes de agua siguen la regla **water** de las reglas de viaje salvo que su terreno tenga una propia: las reglas genéricas y las Marcas Grises los hacen intransitables a pie, y un sistema puede tener barcas que solo navegan por agua (la barca de las Marcas cruza el Lago Salado). Las tablas ven `water: true` en esos hexes.
- Añade tus propios terrenos o bórralos (los hexes pintados con un terreno borrado quedan vacíos).

Los ids de terreno (`forest`, `hills`…) son lo que leen las reglas de viaje y las tablas, así que una tabla puede decir `when: { terrain: forest }`.

## Símbolos del terreno

Cada terreno puede dibujar un símbolo discreto en sus hexes (un árbol, una montaña, olas…) en un tono más claro u oscuro de su color. Elígelo en **Editar paleta** con el botón junto al color: el conjunto Terreno, cualquier imagen del mapa o **Importar una imagen…** para usar una tuya. El control **Símbolos del terreno** los atenúa; a 0 se ocultan. Los hexes con icono muestran el icono en su lugar.

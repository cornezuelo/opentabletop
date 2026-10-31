# Terreno

Pinta el territorio con la herramienta **Terreno** (<kbd>B</kbd>).

## Pintar

- **Pincel** (<kbd>B</kbd>): haz clic o arrastra para pintar el terreno elegido. El control **Tamaño del pincel** pinta varias casillas a la vez (<kbd>[</kbd> y <kbd>]</kbd> lo cambian).
- <kbd>Mayús</kbd>+arrastrar (con el pincel o el botón derecho): pinta (o borra) un **rectángulo**, desde donde pulsaste hasta donde sueltas; lo más rápido para dibujar una sala.
- **Relleno** (<kbd>G</kbd>): pinta toda una zona conectada del mismo terreno.
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

Tus propios terrenos van en **Otros**. Cada mapa conserva la paleta con la que se creó. **Editar paleta** enseña el **id** de cada terreno junto a su nombre (`dense-forest`): lo que escriben las tablas, las condiciones y las reglas de viaje (`place.terrain: dense-forest`), sea cual sea el idioma de su nombre.

No todo es fantasía. En **Editar paleta**, **Añadir terrenos de…** añade un conjunto entero de una vez (solo los terrenos que le faltan al mapa), cada uno con su símbolo y una velocidad en las reglas genéricas (las de Core):

| Conjunto                  | Terrenos                                                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Natural (por defecto)     | la paleta de arriba; pone al día los mapas antiguos                                                                                                                        |
| Moderno                   | ciudad, afueras, industrial (grupo _Pueblos y ciudades_)                                                                                                                   |
| Postapocalíptico          | ruinas, páramo, irradiado, ciénaga tóxica, cráter (grupo _Páramo_)                                                                                                         |
| Mazmorra (suelos y roca)  | suelo de piedra, suelo de cueva, escombros, charca (todos **Suelo**: los muros se dibujan solos a su alrededor; la charca también es agua), roca maciza (grupo _Mazmorra_) |
| Ciencia ficción y espacio | jungla alienígena, campo de cristales, campo de lava, regolito (_Mundos alienígenas_); espacio, nebulosa, campo de asteroides (_Espacio_)                                  |

Los campos de lava, el espacio, las nebulosas y los campos de asteroides están cerrados a pie en las reglas genéricas: un sistema propio da a las naves una forma de viajar que solo va por ahí (`through: { place.terrain: [space, nebula] }`), como la barca de las Marcas Grises por el agua. **Editar paleta** permite cambiar cada uno:

- **Color** y **nombre** (nombre vacío = el traducido por defecto).
- **Símbolo**: el pequeño dibujo de sus casillas (ver abajo).
- **Agua**: marca el terreno como agua. En el mapa, los caminos, senderos y ríos se detienen en su orilla (los muros y fronteras la cruzan). No cambia nada más en el mapa. En un viaje, las casillas de agua siguen la regla **water** de las reglas de viaje salvo que su terreno tenga una propia: las reglas genéricas y las Marcas Grises los hacen intransitables a pie (salvo los lagos en invierno, que se cruzan sobre el hielo: un terreno puede abrirse o cerrarse con una condición), y un sistema puede tener barcas que solo navegan por agua (la barca de las Marcas cruza el Lago Salado). Las tablas ven `water: true` en esas casillas.
- **Suelo**: marca el terreno como el suelo de una estructura (el de una sala, un pasillo, el interior de un edificio). Donde el suelo toca una casilla que no es suelo (roca maciza, el terreno de fuera, el borde del mapa), se dibuja un **muro** solo; pinta dos salas juntas y se unen, pinta un pasillo hasta una sala y se abre. Un viaje nunca cruza un muro: dibuja una [conexión](04-roads-and-rivers.md#conexiones) a través de él para una puerta o un arco. También hay muro entre dos salas que se tocan ([regiones que se juegan como un solo lugar](03-regions.md#salas)). Dibuja más a mano con la herramienta [Muros](04-roads-and-rivers.md#muros). Las tablas ven `place.floor: true`. Déjalo sin marcar para el terreno abierto (hierba, calles) y para la roca alrededor de una mazmorra. Las Barrow-halls de las Grey Marches se dibujan así.
- Añade tus propios terrenos o bórralos (las casillas pintadas con un terreno borrado quedan vacías).

Los ids de terreno (`forest`, `hills`…) son lo que leen las reglas de viaje y las tablas, así que una tabla puede decir `when: { place.terrain: forest }`.

## Símbolos del terreno

Cada terreno puede dibujar un símbolo discreto en sus casillas (un árbol, una montaña, olas…) en un tono más claro u oscuro de su color. Elígelo en **Editar paleta** con el botón junto al color: el conjunto Terreno, cualquier imagen del mapa o **Importar una imagen…** para usar una tuya. El control **Símbolos del terreno** los atenúa; a 0 se ocultan. Las casillas con icono muestran el icono en su lugar.

## Generar tierra

**Generar tierra**, al final de la herramienta Terreno, rellena las casillas **vacías** del mapa con un **modelo de tierra** del sistema del mapa (su `land:`, mira [Modelos de tierra](../technical/07-kinds.md#modelos-de-tierra)): para cada terreno, lo probable que es que una casilla junto a él sea cada terreno. Cada casilla vacía suma la tierra de todas sus vecinas conocidas, así bosques, cordilleras y lagos crecen juntos en vez de salir un mosaico.

- Pinta primero la tierra que te importa (una costa, una cordillera, un lago): la tierra crece hacia fuera desde ella, primero las casillas con más vecinas pintadas. Las casillas pintadas no cambian nunca.
- **Semilla**: la misma semilla saca la misma tierra (apúntala para volver a sacarla); 🎲 da otra. **Modelo de tierra** elige uno cuando el sistema tiene varios.
- **Rellenar las casillas vacías** rellena todas las casillas vacías del mapa; ↶ lo quita todo de un paso, así que prueba otra semilla y vuelve a rellenar.
- Para rellenar solo una región, pinta la región sobre las casillas vacías y usa **Generar sus casillas vacías** en su panel ([Regiones](03-regions.md)).
- Si el modelo saca un terreno que la paleta del mapa no tiene, un mensaje lo dice: añádelo con **Editar paleta**.

Con las reglas genéricas, _La tierra sencilla_ hace crecer llanuras, cultivos, bosques, colinas, montañas, lagos y marismas. El mapa de ejemplo de las Marcas Grises deja su este en blanco: **Rellenar las casillas vacías** lo dibuja con _La tierra de las Marcas_ (colinas que se alzan en cordilleras al este de las Hollow Hills), o déjalo en blanco para descubrirlo al viajar ([Jugar](08-play.md)).

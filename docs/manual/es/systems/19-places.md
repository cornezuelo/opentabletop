# Lugares

La pestaña **Lugares** edita los **catálogos de lugares** del sistema (`kind: places`): plantillas de puntos de interés que sus resultados pueden crear en el hex del grupo, como ruinas, santuarios junto al camino, campamentos o guaridas. Una entrada de una tabla, un paso de una acción, una carta de un mazo o el contenido de un hex descubierto crea uno con un efecto (`hex.pois.ruins: 1`). Jugado sobre un mapa en el Hexmapper, se escribe en el mapa como un punto de interés que dice **Hecho a partir de** su plantilla, y las etiquetas de la plantilla van a su hex; en un viaje sin mapa, lo anota el diario. Un lugar conserva con lo que se hizo, así que cambiar una plantilla solo afecta a los lugares creados después.

## La pestaña

Un catálogo cada vez; con varios, una fila de botones elige. **Nuevo catálogo de lugares** crea uno pequeño (un campamento) y lo añade al **Resumen** del sistema (`places:`, una lista). Un catálogo tiene:

- Su **Nombre**.
- Sus **Lugares**: cada uno con un **Id** (con el que lo nombran los efectos: `hex.pois.<id>`), y:
  - su **Nombre** y **Descripción**, lo que dice el punto de interés. La descripción puede leer el resultado que lo crea (`{{result}}`, el texto del propio resultado) y tirar (`Un campamento de {{1d6+2}} viajeros`), una vez, al crearse el lugar;
  - su **Icono**, uno del mapa (`game:castle-ruins`, `game:totem`), para distinguirlo entre los puntos de interés del hex;
  - sus **Etiquetas del hex**: lo que recibe el hex cuando el lugar se crea en él, que leen las reglas (una acción que solo se puede hacer en un santuario: `hex.tags: shrine`);
  - sus **Campos**, pares `clave: valor` guardados con el punto de interés, con las tiradas leídas al crearlo (`skulls: {{1d6+2}}`).

Su nombre y los nombres y descripciones de los lugares se escriben en el idioma en que está la aplicación: en el propio catálogo cuando es el idioma del pack, y si no en la traducción del pack ([Traducir](../technical/01-translating.md)). El YAML: [Lugares](../technical/07-kinds.md#lugares).

## Paso a paso: un campamento encontrado al explorar

1. En **Lugares**, **Nuevo catálogo de lugares**. Trae un **camp**: dale la descripción `Las cenizas de {{1d3}} hogueras, aún calientes`.
2. Haz una tabla que pueda encontrarlo: en el Oracle, una tabla con una entrada con `effects: { hex.pois.camp: 1 }`.
3. En **Reglas**, da a una acción un paso que la tire (`roll: table.<tu tabla>`).
4. **Pruébalo**: cuando sale la entrada, el diario dice _Un lugar aquí: Campamento — Las cenizas de 2 hogueras, aún calientes_. En un mapa del Hexmapper, el hex recibe el punto de interés y la etiqueta `camp`.

El descubrimiento también puede crear lugares: una entrada de la tabla que decide qué hay en un hex encontrado (`discover.contents`) con `effects: { hex.pois.camp: 1 }` crea el campamento en vez de un punto de interés hecho con su texto ([Descubrir el mapa](../oracle/07-connecting.md#7-descubrir-el-mapa)). Las Marcas Grises crean así sus ruinas, sus santuarios y la guarida del dragón, y el **Explorar** de Core crea un _Hito_ con un 6.

Los sistemas incluidos son de solo lectura: edita una copia.

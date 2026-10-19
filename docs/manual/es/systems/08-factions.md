# Facciones

La pestaña **Facciones** edita los poderes del mundo del sistema (`kind: factions`, una por sistema). **Nuevas facciones** hace dos sobre la tabla de turno de Core, con una hoja propia, y las nombra en el sistema. En el Hexmapper se traen a un mapa desde la vista Mundo ([Facciones](../hexmapper/12-world.md#facciones)). El YAML: [Facciones](../technical/07-kinds.md#facciones).

**Su tierra.** La tierra de una facción son los hexes que tiene en un mapa. Aquí dices dónde **empieza** cada una: las **Regiones** (por los nombres que les da el mapa), en cualquier mapa que las tenga, y los **Hexes** que tiene cuando un mapa trae las facciones. Los hexes son coordenadas, y las mismas coordenadas son otro sitio en otro mapa, así que solo se dan **En el mapa** que elijas: uno de los mapas de ejemplo del pack (`maps:` en su sistema), el mapa que tienes al abrirlo desde los **Mapas de ejemplo** del Hexmapper; `territory: { map: maps/frontier.otd.json, hexes: ['15,9'] }`. Desde entonces la tierra es del mapa: se pinta a mano en la vista Mundo del Hexmapper y se gana o se pierde hex a hex en los turnos del mundo, según digan los resultados de su tabla de turno (`faction.territory: 1` coge un hex de su frontera, `-1` cede uno; _El turno de una facción_ de Core hace las dos cosas). Cambiar dónde empiezan no mueve la tierra de un mapa que ya las tiene.

## Qué tiene

- Su **Nombre**.
- **Su hoja**: los valores, estados y relaciones que tiene cada facción.
- **Su turno**: lo que tira cada una en un turno del mundo.
- **Cada (días)**: cada cuánto llega un turno del mundo por sí solo; vacío, solo a mano.
- Cada facción, con su **Nombre**, su **Descripción (su ayuda**, que se ve al abrirla en la vista Mundo), **Color**, con qué **Empieza**, las **Regiones** que tiene al empezar, el mapa en el que están sus **Hexes** (**En el mapa**) y esos hexes, y su tabla de **Turno propio**.

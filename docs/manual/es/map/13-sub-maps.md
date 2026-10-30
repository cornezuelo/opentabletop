# Submapas

Un lugar de un mapa puede llevar a un mapa propio, un **submapa**: la mazmorra bajo una colina, el pueblo de un cruce de caminos, las cuevas bajo una montaña. Un submapa es de la campaña del mapa del que cuelga (el mismo reloj del mundo, facciones y Oráculo) y puede tener submapas propios. Las Grey Marches traen uno: **The Barrow-halls**, bajo el hex de las Barrow-halls (1008) de las Hollow Hills ([Las Grey Marches](../packs/02-grey-marches.md)).

## Hacer uno

- Selecciona un hex y, en su panel, en **Caminos a otros mapas**, pulsa **Nuevo submapa aquí**. Se guarda en **Mapas** un mapa vacío de [casillas cuadradas](01-getting-started.md#hexes-o-cuadradas), con el nombre del hex (o _Bajo el hex_), en la misma campaña (**Ajustes del mapa → Casillas** lo pasa a hexes). El hex muestra ahora un pequeño círculo con una punta hacia abajo, su entrada.
- Ábrelo con **Abrir** en el mismo sitio. Es un mapa como cualquier otro: dibújalo con las mismas herramientas, a la escala que elijas en **Ajustes del mapa** (**km por hex**, el lado de una casilla en un mapa de cuadradas: `0.01` son diez metros, una sala o un pasillo).
- Sus **Ajustes del mapa** dicen de dónde cuelga, en **Dentro de**: el mapa de arriba (púlsalo para abrirlo) y su lugar en él. Su **Entrada** es donde llega y de donde sale el camino, al principio su hex del centro: selecciona otro hex y pulsa **Hacer … la entrada** para moverla; muestra un círculo con una punta hacia arriba. **Tipo del camino de entrada** es el tipo de conexión que es entrar y salir, como lo nombra el sistema (abajo).
- En **Mapas**, los submapas salen bajo el mapa del que cuelgan, un paso hacia dentro (↳). La barra de arriba de un submapa dice de dónde cuelga: _The Hollow Hills › The Barrow-halls_, y cada nombre abre su mapa.

## Entrar en un viaje

- Con el grupo en un hex que lleva a un submapa, su panel ofrece **Entrar ↗**: la entrada pasa a ser el destino, y la marcha la toma como cualquier otro paso. En un submapa, su entrada ofrece **Salir ↗** igual.
- Pasar es un paso del tipo del camino: lo que cuesta y hace es cosa del sistema, como en cualquier [conexión](04-roads-and-rivers.md#conexiones) (sus minutos `extra`, su **Abierto cuando** / **Cerrado cuando**, las comprobaciones que leen `connection.kind`). El paso no mide distancia: sin tipo, no tarda más que el tiempo por paso de la forma de viajar, si lo tiene.
- Al pasar, el viaje **sigue en el otro mapa**, que se abre: el mismo viaje, grupo, diario y tiempo. El grupo queda en la entrada (o, al salir, en el hex por el que entró). Los lugares del mapa que deja se nombran en el diario con el nombre de ese mapa (_The Hollow Hills · 1008_).
- El mapa que deja guarda al grupo donde entró, y su panel **Jugar** dice dónde siguió el viaje, con **Abrirlo**. Pulsar un hex allí no hace nada mientras el viaje está fuera.

Para qué sirve un submapa y cómo se juega es cosa del sistema: sus terrenos, comprobaciones y acciones leen sus lugares como leen los de cualquier mapa. Para el formato del fichero, mira [Formatos de fichero](../technical/02-file-formats.md).

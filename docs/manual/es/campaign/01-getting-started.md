# Primeros pasos

La aplicación Campaign muestra tus **campañas**: los mundos en los que se juegan tus mapas y viajes. Una campaña guarda lo que pasa en su mundo: el sistema de juego, el reloj del mundo (su fecha, los eventos por venir, los relojes de progreso y el clima), lo que ha pasado (su cronología), las facciones y el Oráculo (mazos robados, resultados únicos, tiradas a mano). Cada mapa del Hexmapper y cada viaje de Travel está en una campaña, y los de la misma campaña lo comparten todo: una fecha, los mismos relojes, los mismos mazos. Un mapa o viaje nuevo empieza en una campaña propia, así que un mapa que se juega solo no necesita nada de aquí.

Una campaña guarda solo aquello con lo que juegan las reglas. Su historia, sus lugares y su gente viven en tu aplicación de notas: **Notas** enlaza con su página allí.

## La pantalla

- **Cabecera**: el selector de aplicaciones (nueve puntos), el engranaje (**Preferencias**: idioma y aplicación de notas, compartidos por todas las aplicaciones) y **?** para este manual. Las pestañas pequeñas en los bordes de la columna central (‹ ›) pliegan la lista de campañas y la columna de ayuda, y las vuelven a mostrar.
- **Campañas** (izquierda): **Nueva campaña**, un buscador y las campañas que guarda este navegador, la última cambiada primero. Bajo la lista, **Crear o editar sistemas** abre la aplicación Systems.
- **La campaña** (centro): la elegida en la lista, con sus pestañas.

Las etiquetas subrayadas con puntos tienen una explicación: pulsa una y la columna de ayuda se abre en ella.

## Una campaña nueva

**Nueva campaña** pide un **nombre** y un **sistema** (el último que elegiste en cualquier aplicación sale primero), y crea una campaña vacía: aún sin reloj del mundo, sin mapas ni viajes. Añádele mapas y viajes desde sus propias aplicaciones (abajo).

## Cómo nacen las campañas

Pocas veces crearás una aquí. Las campañas aparecen solas:

- **Un mapa nuevo** (Hexmapper) empieza en una campaña propia, con el nombre del mapa.
- **Un viaje nuevo** (Travel) también empieza en una propia, con el nombre del viaje.
- **Un mapa de ejemplo** se abre en la campaña que nombra su fichero: los dos mapas de las Marcas Grises comparten _The Grey Marches_, así que el segundo que abras se une a la del primero. Si este navegador no tiene esa campaña pero sí otras **con el mismo nombre o jugadas con el mismo sistema** (por ejemplo, un mapa de ese juego que empezaste antes), el Hexmapper pregunta: **Unirse a «…»** una de ellas (el mapa comparte su mundo, y el reloj y las facciones del ejemplo se quedan fuera) o **Empezar la suya** (la campaña del ejemplo, aparte).
- **Un fichero de mapa** trae su campaña: si este navegador ya la tiene, el Hexmapper pregunta si unirse a ella, reemplazarla o guardar aparte la del fichero ([Tus mapas](../hexmapper/01-getting-started.md#tus-mapas)).

**Dos campañas nunca comparten nombre**: una nueva cuyo nombre ya está cogido lleva un número, _The Grey Marches (2)_, para que las distingas (renómbrala cuando quieras). Y al abrir un mapa en el Hexmapper se dice en qué campaña está y qué mapas y viajes están también en ella: _Este mapa está en la campaña «The Grey Marches», con «The Hollow Hills»_.

## Fusionar dos campañas

Dos campañas que deberían ser una (dos mapas del mismo juego que empezaron cada uno la suya): lleva todos los mapas y viajes de una a la otra, y la vacía desaparece por sí sola.

1. En **Mapas y viajes** de la campaña que vas a dejar, mira qué hay en ella.
2. Abre cada mapa en el Hexmapper y elige la otra campaña en **Ajustes del mapa → Campaña → El mapa está en**; para cada viaje, elígela en la sala del viaje de Travel (**Campaña**).
3. El primero que lleves pregunta qué mundo se queda: **Mantener el de la campaña** (la que unes) o **Traer el propio** (su reloj, facciones y Oráculo ocupan el lugar de los de la otra, para todo lo que hay en ella).

Cuando se ha llevado el último mapa o viaje, la campaña que dejó se borra.

## La campaña

Arriba, su **nombre** (púlsalo para cambiarlo; todas las aplicaciones nombran la campaña con él) y **Borrar**. Debajo:

- **Sistema**: el sistema de juego con el que se juegan sus mapas y viajes, con **Editar el sistema en Systems →**. Se elige en los **Ajustes del mapa → Campaña** de un mapa (o al empezar un viaje en ella), ya que también es de ellos ([Campañas](../hexmapper/01-getting-started.md#campañas)).
- **Notas**: su página en tu aplicación de notas (una ruta como `Campañas/El largo invierno`); **↗** la abre.
- Con un viaje en marcha en la campaña, una línea dice cuál, con **Abrir**. En una campaña hay un viaje en marcha a la vez, ya que su tiempo es el de la campaña ([Un viaje a la vez](../travel/02-playing.md#la-campaña)).

**Borrar** solo se puede cuando no hay ningún mapa ni viaje en la campaña: llévalos a otra campaña (o bórralos) antes. Pregunta, y olvida el reloj, la cronología, las facciones y el estado del Oráculo de la campaña.

Las pestañas de la campaña (un desplegable con ellas en una ventana demasiado estrecha para tenerlas en fila; la dirección de cada una, como `#/campaign/<id>/timeline` o `#/campaign/<id>/factions`, se puede enlazar):

### Mundo

El reloj del mundo, el mismo que muestra el panel **Mundo** del Hexmapper para un mapa de la campaña: ponlo en marcha en una fecha, avanza el tiempo (una hora, hasta la siguiente parte del día, el día siguiente, el próximo evento, o hasta una parte elegida), fija la fecha, programa eventos, lleva relojes de progreso y añade los del sistema, y mira el clima de hoy. Todo funciona como en [El reloj del mundo](../hexmapper/12-world.md), y es un solo reloj: moverlo aquí lo mueve en todos los mapas y viajes de la campaña, y lo ven al momento.

Aquí no hay grupo, así que avanzar el tiempo solo mueve el mundo: llegan sus eventos, su clima se tira día a día, sus relojes hacen lo que dice el sistema al llenarse, y se juegan los turnos de las facciones que tocan, cambiando su tierra en el mapa elegido en [Facciones](02-factions.md). Un viaje en marcha en la campaña (en un mapa, o en Travel) espera hasta la nueva fecha cuando da su siguiente paso, viviendo el tiempo que pasó; un reloj que se llenó aquí entretanto (a mano, o con los turnos de las facciones) también lo oye entonces, si su sistema lo nombra ([Momentos del mundo](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)). Mientras hay un viaje en marcha, el reloj no puede volver atrás, y el clima del mundo es el del viaje (aquí no se muestra).

### Facciones

Los poderes del mundo de la campaña, sus hojas y su tierra en cada uno de sus mapas, y los turnos del mundo: [Facciones](02-factions.md).

### Cronología

Lo que ha pasado en el mundo, lo más reciente primero: eventos que llegaron, fiestas y lunas, relojes llenos, los turnos de las facciones, el reloj volviendo atrás, y tus propias notas (**Añadir**). La misma cronología que la del panel Mundo, en una página propia. Es la historia del mundo, no la del grupo: un evento llega en su día esté donde esté el grupo (_Día de mercado en Ashford_ sale estéis en Ashford o no), y lo que hace el grupo en un viaje (hexes, comprobaciones, encuentros, lugares encontrados) va al **diario** del viaje. Solo lo más destacado de un viaje llega también aquí, una línea corta cada cosa: las llegadas (_El grupo llega a 0707_), los lugares encontrados y las comprobaciones que detuvieron el viaje (un encuentro).

### Mapas y viajes

Los mapas del Hexmapper (su biblioteca en este navegador) y los viajes de Travel que están en la campaña, cada uno con **Abrir ↗**; el viaje en marcha lo dice. Una campaña no los apunta ella misma: cada mapa y viaje nombra su campaña. Para añadir uno:

- **Un mapa**: ábrelo en el Hexmapper y elige esta campaña en **Ajustes del mapa → Campaña → El mapa está en**.
- **Un viaje**: elígela en la sala del viaje de Travel (**Campaña**), para un viaje nuevo o uno ya en marcha.

Si el mapa o el viaje trae un mundo propio (un reloj del mundo, facciones, tiradas del Oráculo), su aplicación pregunta cuál se queda. La campaña que deja se borra si no queda nada más en ella.

Las demás aplicaciones te traen aquí con **Abrir en Campaign ↗**: el panel Mundo del Hexmapper (encima de sus pestañas), la sala del viaje de Travel (bajo **Campaña**), el Oracle (bajo **Campaña**, con una elegida) y **Dónde juega** de un personaje del plantel en Characters.

## Dónde se guardan las campañas

Las campañas viven en este navegador (IndexedDB), junto a los mapas del Hexmapper, y una [copia de seguridad](../technical/05-backups.md) las incluye. Un mapa guardado en un archivo lleva su campaña ([Formatos de archivo](../technical/02-file-formats.md)).

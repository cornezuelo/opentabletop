# Primeros pasos

La aplicación Campaign muestra tus **campañas**: los mundos en los que se juegan tus mapas y viajes. Una campaña guarda lo que pasa en su mundo: el sistema de juego, el reloj del mundo (su fecha, los eventos por venir, los relojes de progreso y el clima), lo que ha pasado (su cronología), las facciones y el Oráculo (mazos robados, resultados únicos, tiradas a mano). Cada mapa del Hexmapper y cada viaje de Travel está en una campaña, y los de la misma campaña lo comparten todo: una fecha, los mismos relojes, los mismos mazos. Un mapa o viaje nuevo empieza en una campaña propia, así que un mapa que se juega solo no necesita nada de aquí.

Una campaña guarda solo aquello con lo que juegan las reglas. Su historia, sus lugares y su gente viven en tu aplicación de notas: **Notas** enlaza con su página allí.

**Campaign es donde empieza el juego**: la raíz del sitio la abre, es la primera del selector de aplicaciones, y abre **la campaña que estabas jugando** (la última abierta aquí; si no, la más reciente). Si aún no hay ninguna, ofrece empezar una ([más abajo](#una-campaña-nueva)), con enlaces discretos al Oracle, Characters y el Hexmapper para quien solo quiere tirar dados o llevar personajes.

## La campaña en la que juegas

La barra de cada aplicación dice en qué campaña juegas, junto al selector de aplicaciones: **Jugando: The Grey Marches ▾** (o **Sin campaña ▾**). Es la misma en todas las aplicaciones, y **sigue a lo que abres**: abrir un mapa en el Hexmapper o un viaje en curso en Travel hace de su campaña la que juegas, y abrir una campaña aquí también, así que la campaña que se muestra es siempre la que tienes delante. Haz clic en ella para:

- **Abrir en Campaign ↗**: la campaña, aquí.
- Las demás campañas que guarda este navegador. En el Oracle y en Characters, elegir una hace que juegues en ella desde entonces (**No jugar en ninguna campaña** no juega en ninguna, para quien solo quiere una tirada o llevar personajes); donde hay un mapa, un viaje o una campaña abiertos, se abren aquí, porque para jugar en otra abres uno de sus mapas o viajes.
- **Campaña nueva ↗**: [una campaña nueva](#una-campaña-nueva) aquí.

Cada aplicación la usa: Campaign la abre; el Hexmapper abre un mapa suyo al empezar (el último abierto, si está en ella; si no, el más reciente) y agrupa su biblioteca por campaña, esta primero; Travel abre su último viaje y agrupa los viajes por campaña; Characters muestra los personajes que juegan en ella, con **Todas las campañas** y **Sin campaña** a un clic; y el Oracle tira en ella ([Tirar en una campaña](../oracle/02-rolling.md#tirar-en-una-campaña)). Es una preferencia de este navegador, guardada con tus demás preferencias en las copias.

## La pantalla

- **Cabecera**: el selector de aplicaciones (nueve puntos: todas las aplicaciones, Campaign la primera, las copias y exportaciones de tus datos, y enlaces al código fuente, para avisar de un problema y a las novedades), **Jugando** ([arriba](#la-campaña-en-la-que-juegas)), el engranaje (**Preferencias**: idioma y aplicación de notas, compartidos por todas las aplicaciones) y **?** para este manual. Las pestañas pequeñas en los bordes de la columna central (‹ ›) pliegan la lista de campañas y la columna de ayuda, y las vuelven a mostrar.
- **Campañas** (izquierda): **Nueva campaña**, un buscador y las campañas que guarda este navegador, la última cambiada primero, cada una con su sistema y, cuando su reloj del mundo está en marcha, su fecha. Bajo la lista, **Crear o editar sistemas** abre la aplicación Systems.
- **La campaña** (centro): la elegida en la lista, con sus pestañas.

Las etiquetas subrayadas con puntos tienen una explicación: pulsa una y la columna de ayuda se abre en ella.

## Una campaña nueva

**Nueva campaña** (o **Empieza tu campaña**, la primera vez) pide un **nombre** y un **sistema** (el último que elegiste en cualquier aplicación sale primero), y dos cosas marcadas, que puedes desmarcar:

- **Poner en marcha el reloj del mundo**, el día que elijas (**Empieza el**: un día del calendario del sistema, su primera mañana por defecto). Sin marcar, se puede poner en marcha después en **Mundo**.
- **Traer sus facciones** (cuando el sistema declara alguna, con cuántas): sus hojas llegan ahora, y la tierra con que empieza cada una llega con cada mapa que entre. Sin marcar, se pueden traer después en **Facciones**.

Se abre en su **Resumen**. Después, añade mapas y viajes desde **Mapas** y **Viajes** ([más abajo](#mapas-y-viajes)).

## Cómo nacen las campañas

Pocas veces crearás una aquí. Las campañas aparecen solas:

- **Un mapa nuevo** (Hexmapper) empieza en una campaña propia, con el nombre del mapa.
- **Un viaje nuevo** (Travel) también empieza en una propia, con el nombre del viaje.
- **Un mapa de ejemplo** se abre en la campaña que nombra su fichero: los dos mapas de las Marcas Grises comparten _The Grey Marches_, así que el segundo que abras se une a la del primero. Si este navegador no tiene esa campaña pero sí otras **con el mismo nombre o jugadas con el mismo sistema** (por ejemplo, un mapa de ese juego que empezaste antes), el Hexmapper pregunta: **Unirse a «…»** una de ellas (el mapa comparte su mundo, y el reloj y las facciones del ejemplo se quedan fuera) o **Empezar la suya** (la campaña del ejemplo, aparte).
- **Un fichero de mapa** trae su campaña: si este navegador ya la tiene, el Hexmapper pregunta si unirse a ella, reemplazarla o guardar aparte la del fichero ([Tus mapas](../hexmapper/01-getting-started.md#tus-mapas)).

**Dos campañas nunca comparten nombre**: una nueva cuyo nombre ya está cogido lleva un número, _The Grey Marches (2)_, para que las distingas (renómbrala cuando quieras). Y al abrir un mapa en el Hexmapper se dice en qué campaña está y qué mapas y viajes están también en ella: _Este mapa está en la campaña «The Grey Marches», con «The Hollow Hills»_.

## Fusionar dos campañas

Dos campañas que deberían ser una (dos mapas del mismo juego que empezaron cada uno la suya): lleva todos los mapas y viajes de una a la otra, y la vacía desaparece por sí sola.

1. En **Mapas** y **Viajes** de la campaña que vas a dejar, mira qué hay en ella.
2. En la campaña que vas a conservar, **Añadir un mapa existente…** / **Añadir un viaje existente…** y **Traerlo ↗** cada uno (o abre cada uno en su aplicación y elige la otra campaña: **Ajustes del mapa → Campaña → El mapa está en**, la **Campaña** de la sala del viaje de Travel).
3. El primero que lleves pregunta qué mundo se queda: **Mantener el de la campaña** (la que unes) o **Traer el propio** (su reloj, facciones y Oráculo ocupan el lugar de los de la otra, para todo lo que hay en ella).

Cuando se ha llevado el último mapa o viaje, la campaña que dejó se borra.

## La campaña

Arriba, su **nombre** (púlsalo para cambiarlo; todas las aplicaciones nombran la campaña con él) y **⋯** con **Borrar**. Debajo:

- **Sistema**: el sistema de juego con el que se juegan sus mapas y viajes, con **Editar el sistema en Systems →**. Se elige en los **Ajustes del mapa → Campaña** de un mapa (o al empezar un viaje en ella), ya que también es de ellos ([Campañas](../hexmapper/01-getting-started.md#campañas)).
- **Notas**: su página en tu aplicación de notas (una ruta como `Campañas/El largo invierno`); **↗** la abre.
- Con un viaje en marcha en la campaña, una línea dice cuál, con **Abrir**. En una campaña hay un viaje en marcha a la vez, ya que su tiempo es el de la campaña ([Un viaje a la vez](../travel/02-playing.md#la-campaña)).

**Borrar** solo se puede cuando no hay ningún mapa ni viaje en la campaña: llévalos a otra campaña (o bórralos) antes. Pregunta, y olvida el reloj, la cronología, las facciones y el estado del Oráculo de la campaña.

Las pestañas de la campaña (un desplegable con ellas en una ventana demasiado estrecha para tenerlas en fila; la dirección de cada una, como `#/campaign/<id>/timeline` o `#/campaign/<id>/factions`, se puede enlazar; `#/campaign/<id>` es su Resumen):

### Resumen

Lo que está pasando, de un vistazo; el título de cada bloque lleva a su pestaña:

- **Hoy**: la fecha, la parte del día, las lunas y el clima, con avanzar el tiempo y **Fijar la fecha**, como en **Mundo** (y ponerlo en marcha, si no lo está).
- **En curso**: el viaje en curso en la campaña, con **Seguir ↗**; si no hay ninguno, **Nuevo viaje en esta campaña ↗** y **Nuevo mapa en esta campaña ↗**. Debajo, cuántos mapas, viajes, personajes y facciones tiene.
- **Lo próximo**: los eventos que llegan antes. **Relojes de progreso**: cada uno con sus segmentos llenos.
- **Últimamente**: las últimas líneas de la cronología, y una nota tuya.

### Mundo

El reloj del mundo, el mismo que muestra el panel **Mundo** del Hexmapper para un mapa de la campaña: ponlo en marcha en una fecha, avanza el tiempo (una hora, hasta la siguiente parte del día, el día siguiente, el próximo evento, o hasta una parte elegida), fija la fecha, programa eventos, lleva relojes de progreso y añade los del sistema, y mira el clima de hoy. Todo funciona como en [El reloj del mundo](../hexmapper/12-world.md), y es un solo reloj: moverlo aquí lo mueve en todos los mapas y viajes de la campaña, y lo ven al momento.

Aquí no hay grupo, así que avanzar el tiempo solo mueve el mundo: llegan sus eventos, su clima se tira día a día, sus relojes hacen lo que dice el sistema al llenarse, y se juegan los turnos de las facciones que tocan, cambiando su tierra en el mapa elegido en [Facciones](02-factions.md). Un viaje en marcha en la campaña (en un mapa, o en Travel) espera hasta la nueva fecha cuando da su siguiente paso, viviendo el tiempo que pasó; un reloj que se llenó aquí entretanto (a mano, o con los turnos de las facciones) también lo oye entonces, si su sistema lo nombra ([Momentos del mundo](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)). Mientras hay un viaje en marcha, el reloj no puede volver atrás, y el clima del mundo es el del viaje (aquí no se muestra).

Cuando el mundo te espera (la pausa o la pregunta de una reacción, [Mundo](../systems/11-world.md)), **El mundo espera: …** aparece en todas las pestañas, con **Seguir** o las opciones de la pregunta; nada mueve el mundo (aquí, en un mapa o en un viaje) hasta que respondes, y luego sigue el resto.

### Facciones

Los poderes del mundo de la campaña, sus hojas y su tierra en cada uno de sus mapas, y los turnos del mundo: [Facciones](02-factions.md).

### Cronología

Lo que ha pasado en el mundo, lo más reciente primero: eventos que llegaron, fiestas y lunas, relojes llenos, los turnos de las facciones, lo que el mundo hizo por sí solo ([Mundo](../systems/11-world.md)), el reloj volviendo atrás, y tus propias notas (**Añadir**). La misma cronología que la del panel Mundo, en una página propia. Es la historia del mundo, no la del grupo: un evento llega en su día esté donde esté el grupo (_Día de mercado en Ashford_ sale estéis en Ashford o no), y lo que hace el grupo en un viaje (hexes, comprobaciones, encuentros, lugares encontrados) va al **diario** del viaje. Solo lo más destacado de un viaje llega también aquí, una línea corta cada cosa: las llegadas (_El grupo llega a 0707_), los lugares encontrados, las comprobaciones que detuvieron el viaje (un encuentro) y los personajes que dejaron el grupo.

### Mapas y viajes

**Mapas** lista los mapas del Hexmapper (su biblioteca en este navegador) que están en la campaña, con su tamaño; **Viajes**, los viajes de Travel (el viaje de un mapa se juega en su mapa). Cada uno es una tarjeta con **Abrir ↗** (**Seguir ↗** para el viaje en curso, que lo dice). Una campaña no los apunta ella misma: cada mapa y viaje nombra su campaña.

- **Nuevo mapa en esta campaña ↗** abre el Hexmapper con un mapa nuevo ya en ella, jugado con su sistema; **Nuevo viaje en esta campaña ↗** abre Travel con un viaje nuevo en ella, igual; cuando hay en la campaña un grupo del sistema sin viaje ([Personajes](#personajes)), el viaje nuevo ofrece traerlo, con sus miembros.
- **Añadir un mapa existente…** / **Añadir un viaje existente…** lista los demás que guarda este navegador, cada uno con la campaña en la que está ahora (o _una campaña propia_); **Traerlo ↗** lo abre en su aplicación y lo mueve aquí, como hacen **Ajustes del mapa → Campaña** o la **Campaña** de la sala del viaje.

Si el mapa o el viaje trae un mundo propio (un reloj del mundo, facciones, tiradas del Oráculo), su aplicación pregunta cuál se queda: **Mantener el de la campaña** o **Traer el propio**. La campaña que deja se borra si no queda nada más en ella.

### Personajes

Los personajes de tu plantel ([Characters](../characters/01-getting-started.md)) que juegan en la campaña: en el grupo de sus viajes, entre los presentes, en los tokens de sus mapas o en ella **sin viaje** (una partida rápida: **En una campaña** en su página de Characters), cada uno con dónde juega y **Abrir ↗**. Un nombre abre el personaje en Characters; **Abrir el plantel ↗** abre la aplicación.

Las demás aplicaciones te traen aquí con **Abrir en Campaign ↗**: bajo **Jugando** en la barra de cada aplicación, el panel Mundo del Hexmapper (encima de sus pestañas), la sala del viaje de Travel (bajo **Campaña**), el Oracle (bajo **Campaña**, cuando tira en una) y **Dónde juega** de un personaje del plantel en Characters.

## Dónde se guardan las campañas

Las campañas viven en este navegador (IndexedDB), junto a los mapas del Hexmapper, y una [copia de seguridad](../technical/05-backups.md) las incluye. Un mapa guardado en un archivo lleva su campaña ([Formatos de archivo](../technical/02-file-formats.md)). Para llevarte una campaña entera, con todos sus mapas y viajes, los packs con los que se juega y sus personajes, usa el [**Exportar…**](../technical/05-backups.md#exportar-e-importar-parte) del selector de aplicaciones.

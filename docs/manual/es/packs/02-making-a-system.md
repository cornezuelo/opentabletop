# Crear un sistema

Un sistema son unas pocas definiciones en un pack: **reglas de viaje** (`kind: travel-rules`: el día, las velocidades, las acciones, las comprobaciones) y **bindings** (`kind: bindings`: qué tabla responde a cada comprobación) y, si las quiere, una **hoja** de personajes y la del propio grupo (lo que lleva el grupo: comida, agua…), **facciones**, un **calendario**, modelos de **clima** y **modos de tirada**. Una definición de **sistema** (`kind: system`, en `system.yaml`) nombra con cuáles se juega y de qué packs trae tablas. No hace falta escribir nada a mano: cada pestaña de la aplicación edita una parte con formularios. Todos los tipos están en [Tipos de definición](../technical/07-kinds.md); [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) explica las reglas de viaje y los bindings en YAML, con ejemplos.

## Un sistema nuevo

Escribe un nombre en la casilla de abajo de la lista de sistemas y pulsa **+**. Crea un pack tuyo con una copia de las reglas genéricas (las de Core) de partida y unos bindings vacíos (en `travel.yaml`) y el sistema que los nombra junto con el calendario de Core, cuyas partes del día nombran esas reglas (en `system.yaml`; el pack depende de Core), y abre su **Resumen**. El sistema se puede jugar al momento en la aplicación Viajes y en Mapa (en el mismo navegador): **Jugarlo en Viajes →**, bajo su nombre, abre su viaje en la aplicación Viajes.

Para aprender haciendo, [Tu primer sistema](03-your-first-system.md) construye uno pequeño paso a paso.

## Las pestañas

Cada pestaña tiene su página:

- [**Resumen**](04-overview.md): su nombre, las partes con las que se juega, los packs que trae, sus mapas de ejemplo y exportarlo a un fichero.
- [**Reglas**](05-rules.md): el día, las formas de viajar, los terrenos, caminos y ríos, cuánto frena el clima, los valores del día y las acciones.
- [**Comprobaciones**](06-checks.md): qué se tira por el camino y cuándo, las características del grupo y los roles de viaje.
- [**Hoja**](07-sheet.md): lo que tiene cada personaje, y el propio grupo.
- [**Objetos**](08-items.md): lo que pueden llevar sus personajes, en catálogos.
- [**Bestiario**](18-bestiary.md): las criaturas y clases de gente que puede crear, como plantillas.
- [**Lugares**](19-places.md): los lugares que sus resultados pueden crear en el mapa, como plantillas.
- [**Facciones**](09-factions.md): los poderes de su mundo y sus turnos.
- [**Relojes**](10-clocks.md): los relojes de progreso con los que empieza su mundo, y qué es de cada uno una vez lleno.
- [**Mundo**](11-world.md): lo que su mundo hace por sí solo: cuando se llena un reloj, tras cada turno del mundo, cuando algo pasa a cumplirse.
- [**Calendario**](12-calendar.md): meses, días de la semana, lunas y fiestas.
- [**Clima**](13-weather.md): clima con inercia, estación a estación.
- [**Tierra**](14-land.md): terreno con memoria, para generar y descubrir tierra.
- [**Modos de tirada**](15-roll-modes.md): ventaja, desventaja y similares.
- [**Pruébalo**](16-try-it.md): un viaje sin mapa, para probarlo mientras lo haces.
- [**YAML**](17-yaml.md): los ficheros que escriben los formularios, para lo que estos no cubren.

## Cambiar un sistema incluido

Los sistemas incluidos son de solo lectura. **Duplicar**, junto al nombre del sistema (en todas sus pestañas, en cualquier sistema: incluido, las reglas genéricas o uno vuestro), crea a partir de él un sistema vuestro, independiente de él: un pack nuevo con todo lo que tiene el pack del original (sus reglas y bindings, cada parte que nombran, sus tablas, sus traducciones), llamado _… (copia)_ (se renombra en su **Resumen**), con todas las pestañas editables. El original nunca cambia. Sus mapas de ejemplo vienen con él, y juegan el duplicado en una campaña propia; lo que trae de otros packs (las tablas de Core, en las Marcas Grises) sigue siendo de ellos, compartido y no copiado. El duplicado de un pack de uso personal sigue siendo de uso personal. Lo que una pestaña muestra de otro pack que trae el sistema (los modos de tirada de Core) es de ese pack: de solo lectura, porque lo comparten todos los sistemas que lo traen. Una copia de un sistema incluido editada en su sitio (hecha con una versión anterior, o en la aplicación Oráculo) muestra en el mismo sitio **Volver a la versión incluida**, que descarta tus cambios y recupera el sistema incluido (pregunta antes; ↶ lo deshace), y avisa cuando una versión nueva cambia el sistema incluido, dejándote coger o conservar cada cambio: mira [Actualizaciones de los packs incluidos](../oracle/03-packs.md).

**Borrar un sistema**: en un sistema vuestro (hecho o importado aquí), **⋯ → Borrar este sistema** junto a su nombre borra todo su pack, con cada tabla y parte que tenga (pregunta antes; ↶ lo deshace). Los mapas, viajes y campañas jugados con él conservan su estado, y se juegan sin él hasta que vuelva. Un sistema incluido no se puede borrar (duplicadlo en su lugar); una copia de uno editada en su sitio se revierte.

**Las listas largas son fichas plegadas.** Acciones, comprobaciones, formas de viajar, terrenos, los valores y relaciones de una hoja, facciones, relojes… salen como fichas, cada una diciendo en una línea qué es (su nombre, su id y los campos que dicen algo: _Cumbres_ `peaks`: _Velocidad ×: 0.25 · Abierto cuando: time.season es summer_). Pulsa una para desplegarla: sus campos en dos columnas, condiciones y cambios en filas. **Desplegar todo** / **Plegar todo** lo hacen con todas, y si hay muchas, una caja de búsqueda encuentra las que tienen todas las palabras que escribas. Las listas cortas (caminos y ríos, valores del día, los estados de una hoja) siguen siendo una tabla.

**↶ ↷** en la cabecera (o <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> fuera de las cajas de texto) deshacen y rehacen cambios en tus sistemas, mientras la página está abierta.

Sigue con: [Tu primer sistema](03-your-first-system.md).

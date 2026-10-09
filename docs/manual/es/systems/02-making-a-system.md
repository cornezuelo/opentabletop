# Crear un sistema

Un sistema son unas pocas definiciones en un pack: **reglas de viaje** (`kind: travel-rules`: el día, las velocidades, las provisiones, las acciones, las comprobaciones) y **bindings** (`kind: bindings`: qué tabla responde a cada comprobación) y, si las quiere, una **hoja** de personajes, **facciones**, un **calendario**, modelos de **clima** y **modos de tirada**. Una definición de **sistema** (`kind: system`, en `system.yaml`) nombra con cuáles se juega y de qué packs trae tablas. No hace falta escribir nada a mano: cada pestaña de la aplicación edita una parte con formularios. Todos los tipos están en [Tipos de definición](../technical/07-kinds.md); [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) explica las reglas de viaje y los bindings en YAML, con ejemplos.

## Un sistema nuevo

Escribe un nombre en la casilla de abajo de la lista de sistemas y pulsa **+**. Crea un pack tuyo con las reglas Genéricas de partida y unos bindings vacíos (en `travel.yaml`) y el sistema que los nombra (en `system.yaml`), y abre su **Resumen**. El sistema se puede jugar al momento en la aplicación Travel y en el Hexmapper (en el mismo navegador): **Jugarlo en Travel →**, bajo su nombre, abre su viaje en Travel.

Para aprender haciendo, [Tu primer sistema](03-your-first-system.md) construye uno pequeño paso a paso.

## Las pestañas

Cada pestaña tiene su página:

- [**Resumen**](04-overview.md): su nombre, las partes con las que se juega, los packs que trae, sus mapas de ejemplo y exportarlo a un fichero.
- [**Reglas**](05-rules.md): el día, las formas de viajar, los terrenos, caminos y ríos, las provisiones, cuánto frena el clima, los valores del día y las acciones.
- [**Comprobaciones**](06-checks.md): qué se tira por el camino y cuándo, las características del grupo, los roles de viaje y las provisiones que llevan los personajes.
- [**Hoja**](07-sheet.md): lo que tiene cada personaje.
- [**Facciones**](08-factions.md): los poderes de su mundo y sus turnos.
- [**Calendario**](09-calendar.md): meses, días de la semana, lunas y fiestas.
- [**Clima**](10-weather.md): clima con inercia, estación a estación.
- [**Modos de tirada**](11-roll-modes.md): ventaja, desventaja y similares.
- [**Pruébalo**](12-try-it.md): un viaje sin mapa, para probarlo mientras lo haces.
- [**YAML**](13-yaml.md): los ficheros que escriben los formularios, para lo que estos no cubren.

## Cambiar un sistema incluido

Los sistemas incluidos son de solo lectura. Bajo el nombre del sistema (en todas sus pestañas), **Editar una copia** hace una copia de todo el pack que puedes cambiar; sustituye al incluido en este navegador. Las copias de packs de uso personal siguen siendo de uso personal. En tu copia editada, en el mismo sitio aparece **Volver a la versión incluida**, que descarta tus cambios y recupera el sistema incluido (pregunta antes; ↶ lo deshace). Cuando una versión nueva cambia el sistema incluido, tu copia lo avisa en el mismo sitio y te deja coger o conservar cada cambio: mira [Actualizaciones de los packs incluidos](../oracle/03-packs.md).

**↶ ↷** en la cabecera (o <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> fuera de las cajas de texto) deshacen y rehacen cambios en tus sistemas, mientras la página está abierta.

Sigue con: [Tu primer sistema](03-your-first-system.md).

# Resumen

La pestaña **Resumen** es la definición propia del sistema (`kind: system`, en `system.yaml`): cómo se llama, con qué se juega y qué trae. Un sistema de un pack antiguo (reglas de viaje sin `kind: system`) muestra **Declararlo** en su lugar: escribe `system.yaml` nombrando lo que usa hoy el sistema, y se juega igual.

## Nombre y descripción

Su **Nombre** y su **Descripción**, como los muestran todas las aplicaciones (en el idioma de la interfaz: el del pack, o su traducción).

## Sus partes

- **Reglas de viaje**, **Bindings** y **Calendario**: con los que se juega, cada uno elegido entre los de este pack (por su id) y los de sus dependencias (`core/default`), con su nombre si lo tienen (_El cómputo real (royal-reckoning)_). **Abrir** va a la pestaña que los edita; **Crear** hace unas reglas de viaje nuevas (una copia de las genéricas, que nombra también el calendario de Core cuando el sistema no tiene ninguno y depende de Core) o unos bindings vacíos y los nombra.
- **Modelos de clima**: los que pueden nombrar sus bindings (`weather: weather.highland-skies`), cada uno con su nombre y su id. Se editan en [Clima](12-weather.md).
- **Catálogos de objetos** (`items:`, una lista): lo que pueden llevar sus personajes; se crean, se eligen y se editan en [Objetos](08-items.md), cuyo **Nuevo catálogo** añade uno aquí.

## Packs que trae

El suyo siempre, y las dependencias que marques, cuyas tablas vienen con él: un mapa que se juega con él las muestra en su panel del Oracle. Para traer otro pack, añádelo a las dependencias en `pack.yaml`.

## Mapas de ejemplo

Mapas en los que jugar el sistema, guardados en su pack (`maps:`):

- **Abrir en el Hexmapper →** abre uno allí como lo haría su **Mapas → Mapas de ejemplo**.
- **Añadir un fichero de mapa…** copia en la carpeta `maps/` del pack un fichero de mapa escrito por **Guardar** en el Hexmapper.
- **Quitar** lo saca del pack.

Los mapas cuyos ficheros nombran la misma campaña (guardados desde mapas de una campaña) se abren juntos en ella y comparten su reloj del mundo y sus facciones.

## Buscar un nombre

Un sistema nombra cosas en un sitio y las usa en muchos: una característica declarada en Comprobaciones la leen tablas, la cambian acciones y sale de los valores de los personajes. **Buscar un nombre** lista todos los sitios de los packs del sistema que usan un nombre, también tablas, oráculos, generadores y mazos, que ninguna otra pestaña enseña. Escríbelo tal como está escrito (`pathfinding`) o por su nombre completo (`party.stats.morale`, que también lo encuentra donde está escrito en corto, `morale`); la casilla sugiere todos los nombres que usan los packs.

Cada línea dice cómo lo usa el sitio, luego qué sitio es y qué parte de él:

- **lo lee**: una condición o un `{{…}}` (`when`, `modeWhen.advantage`, la `roll` de una tabla);
- **lo cambia**: efectos (`entries.bandits.effects`);
- **lo fija**: `set`, un valor del día (`do[3].set`);
- **sale de él**: el **De las hojas** de una característica del grupo, o una provisión que llevan los personajes.

Una acción o una comprobación abre su pestaña aquí; una tabla, oráculo, generador o mazo se abre en el Oráculo (↗). Un nombre que nada del sistema declara, y que tampoco dan las aplicaciones (`hex.…`, `trip.…`, `time.…`), lo dice, con los nombres a los que se parece: suele ser una errata (`pathfindng` por `pathfinding`).

Lo que no ve: lo que da un mapa (los valores propios de un hex o de un icono), lo que las aplicaciones leen por su cuenta (las horas de marcha, para la marcha del día) y los ids de acciones, formas de viajar o terrenos usados como valores.

## Usado en

Las filas de lo que declara un sistema tienen una columna **Usado en** con las mismas listas: las características del grupo y los roles de viaje en [Comprobaciones](06-checks.md); las formas de viajar, los terrenos, los caminos y ríos, las provisiones, los tipos de clima, los valores del día y cada acción en [Reglas](05-rules.md); los valores, estados y tipos de relación de cada [hoja](07-sheet.md); las [facciones](09-factions.md); los [relojes](10-clocks.md); los meses y las partes del día del [calendario](11-calendar.md) (un momento al empezar una, `time.part.morning`, o una condición sobre ella); y los [modos de tirada](13-roll-modes.md) (las tablas que ofrecen cada uno o lo toman solas). Además de leerlo, cambiarlo, fijarlo o salir de él, un sitio puede **nombrarlo**: una acción que hace el paso de otra (`do: actions.march`), una forma de viajar que bloquea un valor (`blocks: [modes.horse]`), una tabla que tira otra (`roll: table.ruins`, la tabla siguiente de una entrada). Una comprobación no tiene: la toman sus momentos, y su tarjeta los dice. Su número es en cuántos sitios se usa la fila; púlsalo para verlos debajo. **–** quiere decir que nada lo usa aún: a menudo está bien (un valor que solo lee el jugador), a veces es un descuido (una característica que no lee ninguna tabla, un nombre escrito de otra manera).

En las Marcas Grises, el **Rastreo** de los compañeros (Hoja) enseña dos sitios: de él sale la característica del grupo Orientación (el mejor de ellos), y la tabla _¿Nos perdemos?_ lee el del guía (`roles.guide.values.pathfinding`, en su modo de tirada automático: ventaja).

## Llevarlo a otra parte

Tus sistemas solo viven en este navegador. Para ponerlo a salvo, llevarlo a otro navegador o dárselo a alguien, el Resumen acaba con **Llevarlo a otra parte**: dice lo que lleva el fichero y **Exportar como .zip** lo descarga. El .zip lleva todos los packs que necesita el sistema, cada uno en su carpeta: el suyo, los que trae, los que tienen sus partes y sus dependencias, hasta donde lleguen. El fichero de las Marcas Grises, por ejemplo, lleva las Marcas Grises y Core.

**Importar un sistema (.zip)…**, bajo la lista de sistemas, vuelve a leer ese fichero y abre el sistema que trae (el **Importar .zip** de la Oracle también lo lee):

- los packs que no tienes se añaden a los tuyos;
- los que ya están y sin cambios (un Core incluido, por ejemplo) se quedan como están;
- un pack que tienes en otra versión solo se sustituye tras preguntar: uno tuyo se sobrescribe, uno incluido queda tapado por tu copia importada (**Volver a la versión incluida** lo recupera). **↶** deshace toda la importación de una vez.

Un sistema que usa packs de uso personal lo dice junto al botón: guárdate ese fichero. La forma del fichero está en [Formatos de fichero](../technical/02-file-formats.md#packs).

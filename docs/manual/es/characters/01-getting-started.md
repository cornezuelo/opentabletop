# Primeros pasos

La aplicación Characters guarda tu **plantel**: los personajes que guarda este navegador, de cualquier sistema. Cada uno se hace con la hoja de personajes de su sistema (sus valores, estados y tipos de relación), la hoja que el sistema nombra en Systems ([Hoja](../systems/07-sheet.md)). Un personaje del plantel puede viajar en un mapa del Hexmapper o en un viaje de Travel jugado con su sistema, en un sitio a la vez, y lo que le pase allí vuelve al plantel.

## La pantalla

- **Cabecera**: el selector de aplicaciones (nueve puntos), el engranaje (**Preferencias**: idioma y aplicación de notas, compartidas por todas las aplicaciones) y **?** para este manual. Las pestañitas de los bordes de la columna central (‹ ›) pliegan la lista de personajes y la columna de ayuda, y las vuelven a sacar.
- **Personajes** (izquierda): **Nuevo personaje**, **Importar…**, un buscador y el plantel agrupado por sistema (el sistema con cuya hoja de personajes está hecho cada uno; **Otras hojas** para aquellos cuyo sistema no está cargado). Bajo la lista, **Crear o editar sistemas** abre la aplicación Systems.
- **El personaje** (centro): el que elijas en la lista.

Las etiquetas subrayadas con puntos tienen una explicación: haz clic en una y la columna de ayuda se abre en ella.

## Un personaje nuevo

**Nuevo personaje** pide el **sistema** (solo salen los sistemas con hoja de personajes; el último que elegiste en cualquier aplicación va primero) y un **nombre**, y crea el personaje con los valores iniciales de la hoja. Su **id** sale del nombre (`Viejo Tobin` → `viejo-tobin`; `viejo-tobin-2` si el plantel ya tiene uno) y no cambia: es como lo alcanzan las reglas y las tablas cuando viaja (`characters.viejo-tobin.values.health`) y como lo señalan las relaciones (`character:viejo-tobin`).

## El personaje

- **Duplicar** hace una copia con sus valores, solo en el plantel; **Exportar** lo descarga como fichero `.otd.json`; **Borrar** lo quita del plantel (tras preguntar).
- **Hoja**: la hoja con la que está hecho y su sistema, con **Editar la hoja en Systems →**. Un personaje cuya hoja no está cargada (su pack quitado, o un pack de uso personal en otra compilación) muestra sus valores tal cual, y no se puede cambiar hasta que vuelva la hoja.
- **Id**: cómo se lee, como arriba.
- **Dónde juega**: el mapa o el viaje en el que viaja ahora, con **Abrir**, o _solo en el plantel_; debajo, la campaña en la que está ese mapa o viaje, con **Abrir en Campaign ↗** (la aplicación [Campaign](../campaign/01-getting-started.md)).
- **Notas**: su página en tu aplicación de notas (una ruta como `Personajes/Viejo Tobin`); **↗** la abre. La aplicación de notas se elige en **Preferencias**. Su historia, su aspecto y sus secretos viven allí, no aquí.
- Debajo, su ficha, la misma que en un viaje: sus valores, cada grupo una tarjeta, cada valor dibujado como dice su hoja (un número, una barra, casillas, puntos, un dial, un nivel con nombre: haz clic en una casilla, punto o segmento para llenar hasta él; mira [Cómo se muestran los valores](../systems/07-sheet.md#cómo-se-muestran-los-valores)), sus estados, sus etiquetas y sus relaciones (con lugares, regiones, hexes u otros personajes del plantel).

## De viaje

Un personaje del plantel viaja en **un sitio a la vez**: el viaje de un mapa en el Hexmapper, un viaje en Travel o un token en un mapa (un PNJ que vuelve). Se une con **Del plantel** en la pestaña **Grupo** del viaje (o en la **Hoja** de un token), y un personaje de un viaje entra en el plantel con **Guardar en el plantel** en su ficha ([Personajes de viaje](../travel/02-playing.md#personajes)). Desde entonces el sitio y el plantel van a la par: lo que pasa en el viaje se escribe aquí tras cada paso, y lo que cambies aquí llega al viaje (enseguida, si está abierto en otra pestaña; si no, cuando se vuelva a abrir). **Dónde juega** dice dónde está, con **Abrir**. Llevarlo a otro sitio pregunta antes, y el sitio que deja conserva su propia copia, ya sin enlazar. Si se quita del grupo, o se borra su viaje o su token, se queda aquí, sin viajar.

## Ficheros

**Exportar** escribe un fichero OTD (`.otd.json`) con sus `characters`: sus valores como `stats`, sus etiquetas, su nota, y su hoja, estados y relaciones en `ext.character` (ver [Formatos de fichero](../technical/02-file-formats.md)). **Importar…** añade los personajes de un fichero así: uno exportado aquí, o un mapa guardado por el Hexmapper (los personajes de su grupo). Los personajes cuyo id ya tiene el plantel reciben uno nuevo. Los que no están hechos con una hoja (los tokens sencillos de un mapa) se quedan fuera.

El plantel vive en este navegador (`opentabletop.characters`), como tus packs y mapas: una [copia de seguridad](../technical/05-backups.md) lo incluye. Exporta los personajes que te importen para no perderlos.

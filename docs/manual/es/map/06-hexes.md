# Detalles de la casilla

Al editar, **Seleccionar** coge lo que esté más arriba bajo el puntero: un token, una etiqueta libre, el nombre de una región o una conexión, y el panel lateral lo muestra, con un enlace de vuelta a su casilla; un segundo clic sobre ello baja a la casilla. Selecciona una casilla con la herramienta **Seleccionar** (<kbd>V</kbd>) para ver y editar sus detalles en el panel lateral: su coordenada, terreno, nombre y región, después lo que contiene y unos botones pequeños para lo que aún no tiene (**+ Notas**, **+ Punto de interés**, **+ Etiqueta**…), cada uno abre su campo. El **⋯** junto a **Tirar aquí** copia el enlace de la casilla y la vacía. En [Jugar](08-play.md) el mismo panel es para leer, sin nada que rellenar: para cambiar la casilla, vuelve a **Editar**.

Un clic en un token muestra la casilla en la que está. El panel da la coordenada de la casilla en el formato del mapa; su ayuda (un clic en ella) da su **id** (`4,2`: columna y fila contadas desde 0, sea cual sea el formato de coordenadas del mapa). Junto a su terreno está el id del terreno (`heath`). Las tablas y las condiciones los leen como `place.id` y `place.terrain`.

## Qué puede tener una casilla

- **Su imagen** (_+ Añadir una imagen_, sobre su nombre): una imagen de tu biblioteca, entera (un paisaje del lugar, el dibujo de una torre); un clic la muestra a tamaño completo. Sale en el panel de la casilla, y en Jugar sobre el viaje mientras el grupo está allí ([Jugar un viaje](08-play.md)). Se elige como el retrato de un personaje ([Personajes](../characters/01-getting-started.md)).
- **Nombre**: se muestra bajo la casilla en el mapa; puedes ocultarlo o darle un estilo propio.
- **Región**: cuando el mapa tiene regiones.
- **Notas**: notas breves del máster en Markdown. El trasfondo del lugar va en tu aplicación de notas (ver abajo).
- **PDI**: puntos de interés, cada uno con nombre, descripción, su propia nota enlazada, una imagen (_+ Añadir una imagen_, como la de la casilla) y, si quieres, un icono para distinguirlos en el panel (no se dibuja en el mapa).
- **Etiquetas**: palabras libres (`ruinas`, `encantado`, `referencia`…) con sugerencias del resto del mapa.
- **Campos**: pares clave–valor (`danger: 3`, `elevation: 1200`). Las comprobaciones de viaje y las tablas los leen por su clave. Mientras escribes se sugieren las claves y valores ya usados en el mapa, y también los nombres que leen las tablas de los packs cargados (por ejemplo, el `danger` de las Marcas Grises).
- Los **Campos** de un punto de interés: cada punto de interés tiene los suyos (`rooms: 3`), guardados con él; las reglas y las tablas los leen en su casilla como `place.poi.rooms` ([Qué ven las tablas](../technical/04-what-tables-see.md)). Con dos en una casilla, con el mismo nombre gana el primero de la lista.
- **Hecho a partir de**, en un punto de interés que un viaje creó con una [plantilla de lugar](../technical/07-kinds.md#lugares) del sistema (una ruina descubierta): cuál. Se edita como cualquier otro; que la plantilla cambie después no lo toca.
- **Nota enlazada**: una página de tu aplicación de notas.
- El icono y las líneas que cruzan la casilla.
- **Caminos a otros mapas**: los [submapas](13-sub-maps.md) que hay bajo él (**Abrir**, con la casilla a la que llega seleccionada; **Entrar ↗** en un viaje con el grupo allí), la salida en cada una de las entradas de un submapa (**Salir ↗**), **Nuevo submapa aquí** y **Otro camino a…** un submapa de este mapa (la otra boca de un túnel).

Un punto dorado marca las casillas con detalles que no se ven en el mapa.

## Notas enlazadas

Mapa no guarda el trasfondo: lo enlaza. En **Preferencias** (el engranaje de arriba, en cualquier aplicación) elige tu aplicación de notas: las [Notas](../notes/01-getting-started.md) de OpenTabletop (lo predeterminado), SilverBullet (con su dirección) u Obsidian (con el nombre de la bóveda); la nota de una casilla o de un PDI es entonces una ruta como `lugares/Hollow Gate` que se abre allí (**↗**). Con Notas, la página se busca entre las de la campaña del mapa, y se crea si aún no está, empezando por un enlace de vuelta a la casilla; **✎**, mientras la nota está vacía, escribe una página nueva con el nombre de la casilla.

En el otro sentido, el enlace de la casilla (el icono de cadena) pegado en una nota abre el mapa en esa casilla; en Notas, `[[map:<id del mapa>#0608]]` la enlaza por su etiqueta.

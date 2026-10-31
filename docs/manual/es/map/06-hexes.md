# Detalles de la casilla

Selecciona una casilla con la herramienta **Seleccionar** (<kbd>V</kbd>) para ver y editar sus detalles en el panel lateral. Junto a sus coordenadas está su **id** (`4,2`: columna y fila contadas desde 0, sea cual sea el formato de coordenadas del mapa), y junto a su terreno el id del terreno (`heath`): lo que las tablas y las condiciones leen como `place.id` y `place.terrain`.

## Qué puede tener una casilla

- **Nombre**: se muestra bajo la casilla en el mapa; puedes ocultarlo o darle un estilo propio.
- **Región**: cuando el mapa tiene regiones.
- **Notas**: notas breves del máster en Markdown. El trasfondo del lugar va en tu aplicación de notas (ver abajo).
- **PDI**: puntos de interés, cada uno con nombre, descripción, su propia nota enlazada y, si quieres, un icono para distinguirlos en el panel (no se dibuja en el mapa).
- **Etiquetas**: palabras libres (`ruinas`, `encantado`, `referencia`…) con sugerencias del resto del mapa.
- **Campos**: pares clave–valor (`danger: 3`, `elevation: 1200`). Las comprobaciones de viaje y las tablas los leen por su clave. Mientras escribes se sugieren las claves y valores ya usados en el mapa, y también los nombres que leen las tablas de los packs cargados (por ejemplo, el `danger` de las Marcas Grises).
- Los **Campos** de un punto de interés: cada punto de interés tiene los suyos (`rooms: 3`), guardados con él; las tablas no los leen.
- **Hecho a partir de**, en un punto de interés que un viaje creó con una [plantilla de lugar](../technical/07-kinds.md#lugares) del sistema (una ruina descubierta): cuál. Se edita como cualquier otro; que la plantilla cambie después no lo toca.
- **Nota enlazada**: una página de tu aplicación de notas.
- El icono y las líneas que cruzan la casilla.
- **Caminos a otros mapas**: los [submapas](13-sub-maps.md) que hay bajo él (**Abrir**; **Entrar ↗** en un viaje con el grupo allí), la salida en la entrada de un submapa, y **Nuevo submapa aquí**.

Un punto dorado marca las casillas con detalles que no se ven en el mapa.

## Notas enlazadas

Mapa no guarda el trasfondo: lo enlaza. En **Preferencias** (el engranaje de arriba, en cualquier aplicación) elige tu aplicación de notas: SilverBullet (con su dirección) u Obsidian (con el nombre de la bóveda); la nota de una casilla o de un PDI es entonces una ruta como `Mi campaña/Hexes/0203` que se abre allí.

En el otro sentido, el enlace de la casilla (el icono de cadena) pegado en una nota abre el mapa en esa casilla.

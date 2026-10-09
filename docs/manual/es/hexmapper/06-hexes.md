# Detalles del hex

Selecciona un hex con la herramienta **Seleccionar** (<kbd>V</kbd>) para ver y editar sus detalles en el panel lateral. Junto a sus coordenadas está su **id** (`4,2`: columna y fila contadas desde 0, sea cual sea el formato de coordenadas del mapa), y junto a su terreno el id del terreno (`heath`): lo que las tablas y las condiciones leen como `hex.id` y `hex.terrain`.

## Qué puede tener un hex

- **Nombre**: se muestra bajo el hex en el mapa; puedes ocultarlo o darle un estilo propio.
- **Región**: cuando el mapa tiene regiones.
- **Notas**: notas breves del máster en Markdown. El trasfondo del lugar va en tu aplicación de notas (ver abajo).
- **PDI**: puntos de interés, cada uno con nombre, descripción, su propia nota enlazada y, si quieres, un icono para distinguirlos en el panel (no se dibuja en el mapa).
- **Etiquetas**: palabras libres (`ruinas`, `encantado`, `referencia`…) con sugerencias del resto del mapa.
- **Campos**: pares clave–valor (`danger: 3`, `elevation: 1200`). Las comprobaciones de viaje y las tablas los leen por su clave. Mientras escribes se sugieren las claves y valores ya usados en el mapa, y también los nombres que leen las tablas de los packs cargados (por ejemplo, el `danger` de las Marcas Grises).
- **Campos de los PDI**: cada punto de interés tiene los suyos (`rooms: 3`), guardados con él; las tablas no los leen.
- **Nota enlazada**: una página de tu aplicación de notas.
- El icono y las líneas que cruzan el hex.

Un punto dorado marca los hexes con detalles que no se ven en el mapa.

## Notas enlazadas

Hexmapper no guarda el trasfondo: lo enlaza. En **Preferencias** (el engranaje de arriba, en cualquier aplicación) elige tu aplicación de notas: SilverBullet (con su dirección) u Obsidian (con el nombre de la bóveda); la nota de un hex o de un PDI es entonces una ruta como `Mi campaña/Hexes/0203` que se abre allí.

En el otro sentido, el enlace del hex (el icono de cadena) pegado en una nota abre el mapa en ese hex.

# Tokens

Los tokens son piezas que mueves por el mapa: el grupo, los personajes jugadores, los PNJ y los enemigos. Usa la herramienta **Tokens** (<kbd>K</kbd>).

## Colocar y mover

- Elige el tipo de los tokens nuevos (PJ, PNJ o Enemigo), su icono (los **Sugeridos** son personajes y criaturas; las etiquetas filtran por categoría como en Iconos, y la búsqueda mira entre todos; o **Importar una imagen…**) y su color, y haz clic en un hex vacío.
- Haz clic en un token (o en cualquier punto de su hex) para editarlo. Arrástralo a otro hex: queda centrado.
- Varios tokens pueden compartir hex: se colocan alrededor del centro. <kbd>Mayús</kbd>+clic siempre añade un token nuevo, aunque el hex ya tenga tokens (o hagas clic justo sobre uno).
- Clic derecho o <kbd>Supr</kbd> borra un token. **Quitar del mapa** lo deja en la lista sin hex.

Los tokens también se pueden arrastrar con las herramientas Seleccionar y Jugar.

Con el color en **Auto**, cada token recibe su propio color dentro de la familia de su tipo —los PJ en colores fríos, los enemigos en cálidos, los PNJ en tonos tierra—, así que los de un mismo tipo se parecen pero se distinguen. Elige un color para fijarlo.

## Ajustes de un token

Nombre, tipo (grupo, PJ, PNJ, enemigo), icono, color, halo, **mostrar el nombre en el mapa** con su **estilo** (el del mapa o uno propio), una nota enlazada y **campos** (clave–valor: `might: 18`, `fare: 2`). Con un token seleccionado, las tablas que se tiran desde el panel Oracle leen sus campos como `{{token.might}}`, y su nombre y tipo como `{{token.name}}` y `{{token.kind}}` (en las Marcas Grises, selecciona a Brenna y tira _La barca_). **Tokens de este mapa** los lista todos por tipo: haz clic en uno para seleccionarlo y centrar el mapa en él.

**Hoja**: cuando el sistema del mapa tiene una hoja para sus personajes (los compañeros de las Marcas Grises), una ficha de PJ, PNJ o enemigo también puede tener una: **Darle una hoja** la convierte en personaje de esa hoja, como un bloque de estadísticas, con sus valores (los contadores como casillas), estados, etiquetas y relaciones, igual que los personajes del grupo al jugar. Las tablas que se tiran con la ficha seleccionada los leen (`{{token.health}}`, `token.conditions: wounded`); sus campos siguen como están. **Quitarle la hoja** la quita (tras preguntar). El mapa de ejemplo de las Marcas Grises le da una a Brenna, la barquera. Un solo motor para todos los personajes: la hoja que un sistema declara para su grupo es la que usan sus PNJ y criaturas.

## El grupo

El grupo también es un token: el modo Jugar lo mueve (ver [Jugar un viaje](08-play.md)). Hay un grupo por mapa; si conviertes otro token en el grupo, el anterior pasa a ser un PJ. Un viaje en curso sigue con el nuevo grupo, desde donde está: mismo día, provisiones y diario; su rastro empieza ahí.

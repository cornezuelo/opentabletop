# Tokens

Los tokens son piezas que mueves por el mapa: el grupo, los personajes jugadores, los PNJ y los enemigos. Usa la herramienta **Tokens** (<kbd>K</kbd>).

## Colocar y mover

- Elige el tipo de los tokens nuevos (PJ, PNJ o Enemigo), su icono (los **Sugeridos** son personajes y criaturas; las etiquetas filtran por categoría como en Iconos, y la búsqueda mira entre todos; o **Importar una imagen…**) y su color, y haz clic en un hex vacío.
- Haz clic en un token (o en cualquier punto de su hex) para editarlo. Arrástralo a otro hex: queda centrado.
- Varios tokens pueden compartir hex: se colocan alrededor del centro. <kbd>Mayús</kbd>+clic siempre añade un token nuevo, aunque el hex ya tenga tokens (o hagas clic justo sobre uno).
- **Colocar desde el bestiario** (en las opciones de token nuevo, cuando el sistema del mapa o los packs de su campaña tienen un bestiario): los tokens nuevos son copias de una plantilla, con su aspecto, su nombre y una ficha con sus valores tirados para cada uno. Son del mapa, como cualquier token: un guardia en un puente, una guarida. Las copias que hace un viaje son otra cosa: mira [Jugar un viaje](08-play.md).
- Clic derecho o <kbd>Supr</kbd> borra un token. **Quitar del mapa** lo deja en la lista sin hex.

Los tokens también se pueden arrastrar con las herramientas Seleccionar y Jugar (en Jugar, un clic en uno es también un clic en su hex: [Jugar](08-play.md)).

Con el color en **Auto**, cada token recibe su propio color dentro de la familia de su tipo —los PJ en colores fríos, los enemigos en cálidos, los PNJ en tonos tierra—, así que los de un mismo tipo se parecen pero se distinguen. Elige un color para fijarlo.

## Ajustes de un token

Nombre, tipo (grupo, PJ, PNJ, enemigo), icono, color, halo, **Mostrar el nombre en el mapa** con su **Estilo** (el del mapa o uno propio), una nota enlazada y **campos** (clave–valor: `might: 18`, `fare: 2`; no en el token del grupo, ver abajo). Con un token seleccionado, las tablas que se tiran desde el panel Oracle leen sus campos como `{{token.might}}`, y su nombre y tipo como `{{token.name}}` y `{{token.kind}}` (en las Marcas Grises, selecciona a Brenna y tira _La barca_). **Tokens de este mapa** los lista todos por tipo: haz clic en uno para seleccionarlo y centrar el mapa en él.

**Hoja**: cuando el sistema del mapa tiene una hoja para sus personajes (los compañeros de las Marcas Grises), un token de PJ, PNJ o enemigo también puede tener una: **Darle una hoja** la convierte en personaje de esa hoja, como un bloque de estadísticas, con sus valores (cada uno dibujado como dice la hoja: [Cómo se muestran los valores](../systems/07-sheet.md#cómo-se-muestran-los-valores)), estados, etiquetas, relaciones y objetos, igual que los personajes del grupo al jugar. Las tablas que se tiran con el token seleccionado los leen (`{{token.health}}`, `token.conditions: wounded`); sus campos siguen como están. Encima, la hoja dice cuál es y de qué sistema (_Hoja: Compañero · Las Marcas Grises_), con **Editar en Systems ↗**: la hoja de un token es siempre la del sistema del mapa, que se elige en **Ajustes del mapa → Campaña → Sistema**, y tiene solo lo que declara esa hoja (para añadir un valor, edita la hoja en Systems). **Quitarle la hoja** la quita (tras preguntar). El mapa de ejemplo de las Marcas Grises le da una a Brenna, la barquera.

La hoja de un token puede ser un personaje del plantel ([Characters](../characters/01-getting-started.md)), para un PNJ que vuelve en varios mapas: **Guardar en el plantel** lo guarda allí, con el nombre del token, y **Del plantel** (en un token sin hoja) le da uno de los personajes del plantel hechos con la hoja de los personajes del sistema del mapa o de sus plantillas (una criatura hecha del bestiario en la aplicación Characters). La ficha de un token usa siempre la hoja de su propio personaje: una criatura colocada desde el bestiario muestra la hoja de su plantilla, no la de los compañeros. Enlazado, lo que cambies en el token se vuelca al plantel, y lo que cambie en la aplicación Characters llega al mapa mientras está abierto; **Abrir en Characters ↗** lo abre allí. Un personaje está en un sitio a la vez: tomar uno que viaja en otro sitio pregunta antes. Borrar el token, o quitarle la hoja, lo deja en el plantel. Un solo motor para todos los personajes: la hoja que un sistema declara para su grupo es la que usan sus PNJ y criaturas.

## El grupo

El grupo también es un token: el modo Jugar lo mueve (ver [Jugar un viaje](08-play.md)). Hay un grupo por mapa; si conviertes otro token en el grupo, el anterior pasa a ser un PJ. Un viaje en curso sigue con el nuevo grupo, desde donde está: misma fecha, hoja del grupo y diario; su rastro empieza ahí.

El token del grupo es solo dónde está el grupo: no tiene campos ni hoja propios. La hoja del grupo, sus características y sus personajes están en la pestaña **Grupo** de Jugar ([El grupo](../travel/02-playing.md#el-grupo)); el panel del token lo dice, y **Abrir Jugar → Grupo** te lleva allí. Los mapas guardados con campos en el token del grupo los pierden al abrirse (nada los leía).

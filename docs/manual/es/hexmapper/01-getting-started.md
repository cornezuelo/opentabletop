# Primeros pasos

Hexmapper dibuja mapas de hexágonos para hexcrawls y campañas sandbox, y permite jugar viajes sobre ellos. Todo se queda en tu navegador: sin cuentas ni servidores. Se puede instalar y funciona sin conexión: ver [Instalar y jugar sin conexión](../technical/06-install-and-offline.md).

## La pantalla

- **Barra superior**, como en todas las aplicaciones: a la izquierda la aplicación (el nombre del mapa abierto está en el título de la ventana, «Hexmapper - The Grey Marches») y el botón de nueve puntos que abre las demás aplicaciones de OpenTabletop; a la derecha Deshacer, Rehacer y Encuadrar, luego Nuevo, Mapas, Guardar y Exportar, y luego Capas, Ajustes del mapa, el engranaje (**Preferencias**, compartidas por todas las aplicaciones: idioma y aplicación de notas) y Ayuda (?).
- **Barra de herramientas** (izquierda): las herramientas —Seleccionar, Terreno, Regiones, Caminos y ríos, Iconos, Texto, Tokens, Jugar, el reloj del Mundo y Oracle—. La pestañita del borde izquierdo del mapa la oculta para tener más sitio (las teclas de las herramientas siguen funcionando) y la vuelve a mostrar.
- **Mapa** (centro): arrastra con el botón central o con <kbd>Espacio</kbd> + arrastrar para desplazarte, usa la rueda para el zoom y <kbd>F</kbd> encuadra el mapa entero.
- **Panel lateral** (derecha): lo que edita la herramienta activa —el hex seleccionado con Seleccionar, la paleta con Terreno, el token seleccionado con Tokens…— o Ajustes, Capas, Oracle y las demás vistas de los botones de la barra superior. Al cambiar de herramienta se deselecciona lo que tenía seleccionado la anterior. La pestañita del borde derecho del mapa lo oculta y lo vuelve a mostrar.
- **Columna de ayuda** (a la derecha del todo, se abre con **?**): este manual, o la explicación de un campo, junto al panel lateral para que veas los dos.

Cada herramienta tiene su tecla: pasa el ratón por un botón para verla, o consulta [Atajos de teclado](11-shortcuts.md).

**Ayuda donde estás**: una etiqueta subrayada con puntos tiene una explicación, a menudo con ejemplos de qué escribir. Púlsala y la columna de ayuda (**?**, a la derecha del todo) se abre en ella, en lugar de este manual: qué hace el campo, ejemplos que funcionan y, bajo **En el manual**, las secciones del manual que hablan de él (primero la página de Sintaxis); **← El manual** vuelve al manual. Desde un campo, <kbd>F1</kbd> muestra su ayuda. Pasar a otro campo no cambia lo que enseña la columna, así que un clic en un ejemplo de ella lo inserta en el campo en el que escribes.

**Los ejemplos entran con un clic**: después de haber estado en una casilla de texto o en el editor YAML, pulsa un ejemplo en `código` de la columna de ayuda (en la ayuda de un campo, en la página de **Sintaxis** o en cualquier parte del manual) y entra donde estaba el cursor; **Ctrl+Z** lo quita. **Sintaxis**, junto al buscador de la columna, abre la página con todo lo que puede escribir un pack. El buscador mira en las páginas de esta aplicación, en las técnicas y en las de los packs, y muestra en negrita las palabras encontradas. Los botones que solo tienen un icono dicen su nombre al pasar el ratón.

## Tus mapas

Los mapas se guardan en la biblioteca de este navegador, automáticamente mientras trabajas. Un mapa abierto en dos ventanas (o cambiado desde otra aplicación) es el mismo en las dos: lo que se jugó en la otra (un viaje, el reloj del mundo, las facciones, el Oráculo) aparece sin más, y Deshacer sigue funcionando; si en la otra se editó el propio mapa, la ventana muestra esa versión, lo avisa y Deshacer empieza de nuevo. **Mapas** (el botón de la carpeta) los lista: abre uno, bórralo de este navegador o copia su enlace; **Importar fichero…** abre uno guardado. En **Mapas de ejemplo** están los mapas que traen los sistemas cargados (`maps:` en su definición, mira [Tipos de definición](../technical/07-kinds.md#sistemas)), cada uno con el sistema con el que se juega: _The Grey Marches_ es un mapa listo para jugar y aprender (mira [Las Marcas Grises](../packs/02-grey-marches.md)).

Un ejemplo que abres pasa a ser **tu mapa**: tus cambios y tu viaje se guardan en él. Al abrir el ejemplo otra vez se pregunta si **seguir con el tuyo**, **abrirlo junto al tuyo** (una copia nueva como otro mapa, conservando el tuyo) o **empezar de cero** en su lugar (el tuyo se pierde, y también el mundo de su campaña, salvo que haya en ella otro mapa o viaje tuyo). Los ejemplos cuyos ficheros nombran la misma campaña (los dos mapas de las Marcas Grises) se abren en ella: el segundo se une a la campaña que empezó el primero, con su reloj del mundo y sus facciones. Cuando una versión más nueva de la app trae un ejemplo cambiado, la lista lo marca como **nueva versión** y la pregunta lo dice: tu mapa sigue jugándose como estaba, y tú eliges cuándo probar el nuevo.

**Guardar** escribe el mapa en un fichero (`.otd.json`, OpenTabletop Data) para tener copia o compartirlo; **Mapas → Importar fichero…** (o <kbd>Ctrl</kbd>+<kbd>O</kbd>) lo vuelve a abrir. Si el fichero es un mapa que este navegador ya tiene (por ejemplo, una copia antigua) y son distintos, Hexmapper pregunta si **sustituir** tu copia por el fichero o **conservar ambos** (el fichero se abre como un mapa aparte, con una campaña propia). Un fichero lleva la [campaña](#campañas) de su mapa; si este navegador ya tiene esa campaña (otro mapa suyo, el mapa de un amigo de tu partida) y es distinta, Hexmapper también pregunta: **Unirse** (el mapa se abre en la campaña de aquí, sin el reloj del mundo, las facciones ni el Oráculo del fichero), **Sustituir el mío** (la campaña del fichero ocupa el lugar de la de aquí, para todos sus mapas y viajes) o **Conservar aparte** (la campaña del fichero se guarda como una nueva propia).

> Si borras los datos del navegador se borra su biblioteca: guarda en fichero los mapas que te importen, o una [copia de seguridad de todo](../technical/05-backups.md) (selector de aplicaciones → **Guardar una copia**).

## Deshacer y ajustes

<kbd>Ctrl</kbd>+<kbd>Z</kbd> deshace y <kbd>Ctrl</kbd>+<kbd>Mayús</kbd>+<kbd>Z</kbd> rehace cada cambio (una pincelada entera es un paso). Jugar un viaje no forma parte de deshacer: tiene su propio diario.

**Ajustes del mapa** (el mapa plegado) tiene el nombre del mapa, la rejilla (hexes planos o en punta, coordenadas), su tamaño (por número de hexes o por papel), la escala del mundo (km por hex, que usa el viaje; vacía, el mapa se juega a la escala de su sistema, y solo escribes una para un mapa dibujado a otra) y su [campaña](#campañas), con el sistema con el que se juega. Tus preferencias (idioma, la aplicación de notas que enlazas) están en el engranaje, en **Preferencias**: son de este navegador, no del mapa.

## Campañas

Un mapa es el **lugar**; el mundo en el que se juega es su **campaña**: el sistema de juego, el reloj del mundo (el panel [Mundo](12-world.md)), su clima, las facciones y el Oráculo (mazos robados, resultados únicos, tiradas a mano). Cada mapa y cada viaje de la aplicación Travel está en una campaña, y los mapas y viajes de la misma campaña lo comparten todo: una fecha, las mismas facciones (cada mapa guarda la tierra que tienen en él), los mismos mazos. Un mapa nuevo empieza en una campaña propia, con su nombre, así que un mapa jugado por sí solo funciona como siempre. La aplicación [Campaign](../campaign/01-getting-started.md) muestra todas las campañas que guarda este navegador, con su reloj del mundo, su cronología, sus mapas y sus viajes.

**Ajustes del mapa → Campaña**:

- **El mapa está en**: **Propia**, u otra campaña guardada en este navegador (la de un mapa o la de un viaje de Travel). Elegir una mueve el mapa a ella. Si la campaña del mapa tiene mundo propio (reloj del mundo, facciones o tiradas del Oráculo), Hexmapper pregunta cuál se queda: **Mantener el de la campaña** (el mundo del mapa se queda atrás, y el mapa conserva la tierra de las facciones que tenga la campaña) o **Traer el propio** (sustituye al mundo de la campaña, sistema incluido, para todos sus mapas y viajes). Cuando la otra campaña aún no tiene mundo, se elige entre traerlo o **Dejarlo atrás**. La campaña que deja el mapa se borra si no queda nada más en ella; bajo la elección, **También en ella** nombra los otros mapas y viajes de la campaña.
- **Nombre de la campaña**: cómo se llama la campaña allí donde se elige (aquí, en Travel, en el Oráculo).
- **Sistema** y **Packs**: los de la campaña, así que los juegan todos sus mapas y viajes. Cambiar el sistema pregunta antes si hay otros mapas o viajes en la campaña; un viaje en curso mantiene el sistema con el que empezó hasta empezar otro ([Jugar](08-play.md)).

Mover un mapa a otra campaña, cambiarle el nombre a la campaña y cambiar su sistema no forman parte de Deshacer. En una campaña hay un viaje en curso a la vez ([Con un viaje en marcha](12-world.md#con-un-viaje-en-marcha)).

## Enlaces a hexes

Cada hex tiene un enlace (el icono de cadena junto a su coordenada). Pégalo en tus notas: al abrirlo se muestra el mapa con ese hex seleccionado.

El enlace lleva el id del mapa. Si este navegador no tiene el mapa (otro dispositivo, o se borraron sus datos), Hexmapper te dice qué fichero necesita —`<id del mapa>.otd.json`, el nombre que le da **Guardar**— y te ofrece abrirlo; al cargarlo llegas al hex.

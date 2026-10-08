# Primeros pasos

Hexmapper dibuja mapas de hexágonos para hexcrawls y campañas sandbox, y permite jugar viajes sobre ellos. Todo se queda en tu navegador: sin cuentas ni servidores. Se puede instalar y funciona sin conexión: ver [Instalar y jugar sin conexión](../technical/06-install-and-offline.md).

## La pantalla

- **Barra superior**, como en todas las aplicaciones: a la izquierda la aplicación (el nombre del mapa abierto está en el título de la ventana, «Hexmapper - The Grey Marches») y el botón de nueve puntos que abre las demás aplicaciones de OpenTabletop; a la derecha Deshacer, Rehacer y Encuadrar, luego Nuevo, Mapas, Guardar y Exportar, y luego Capas, Ajustes del mapa, el engranaje (**Preferencias**, compartidas por todas las aplicaciones: idioma y aplicación de notas) y Ayuda (?).
- **Barra de herramientas** (izquierda): las herramientas —Seleccionar, Terreno, Regiones, Caminos y ríos, Iconos, Texto, Tokens, Jugar, el reloj del Mundo y Oracle—. La pestañita del borde izquierdo del mapa la oculta para tener más sitio (las teclas de las herramientas siguen funcionando) y la vuelve a mostrar.
- **Mapa** (centro): arrastra con el botón central o con <kbd>Espacio</kbd> + arrastrar para desplazarte, usa la rueda para el zoom y <kbd>F</kbd> encuadra el mapa entero.
- **Panel lateral** (derecha): lo que edita la herramienta activa —el hex seleccionado con Seleccionar, la paleta con Terreno, el token seleccionado con Tokens…— o Ajustes, Capas, Ayuda, Oracle y las demás vistas de los botones de la barra superior. Al cambiar de herramienta se deselecciona lo que tenía seleccionado la anterior. La pestañita del borde derecho del mapa lo oculta y lo vuelve a mostrar.

Cada herramienta tiene su tecla: pasa el ratón por un botón para verla, o consulta [Atajos de teclado](11-shortcuts.md).

**Ayuda donde estás**: una etiqueta subrayada con puntos tiene una explicación, a menudo con ejemplos de qué escribir. Púlsala y la columna de ayuda (la **Ayuda** del panel lateral) se abre en ella, en lugar de este manual: qué hace el campo, ejemplos que funcionan y, bajo **En el manual**, las secciones del manual que hablan de él (primero la página de Sintaxis); **← El manual** vuelve al manual. Mientras la columna está abierta, pasar a un campo (clic o Tab) también muestra su ayuda.

**Los ejemplos entran con un clic**: después de haber estado en una casilla de texto o en el editor YAML, pulsa un ejemplo en `código` de la columna de ayuda (en la ayuda de un campo, en la página de **Sintaxis** o en cualquier parte del manual) y entra donde estaba el cursor; **Ctrl+Z** lo quita. **Sintaxis**, junto al buscador de la columna, abre la página con todo lo que puede escribir un pack. El buscador mira en las páginas de esta aplicación, en las técnicas y en las de los packs, y muestra en negrita las palabras encontradas. Los botones que solo tienen un icono dicen su nombre al pasar el ratón.

## Tus mapas

Los mapas se guardan en la biblioteca de este navegador, automáticamente mientras trabajas. **Mapas** (el botón de la carpeta) los lista: abre uno, bórralo de este navegador o copia su enlace; **Importar fichero…** abre uno guardado. En **Mapas de ejemplo** están los mapas que traen los sistemas cargados (`maps:` en su definición, mira [Tipos de definición](../technical/07-kinds.md#sistemas)), cada uno con el sistema con el que se juega: _The Grey Marches_ es un mapa listo para jugar y aprender (mira [Las Marcas Grises](../packs/02-grey-marches.md)).

**Guardar** escribe el mapa en un fichero (`.otd.json`, OpenTabletop Data) para tener copia o compartirlo; **Mapas → Importar fichero…** (o <kbd>Ctrl</kbd>+<kbd>O</kbd>) lo vuelve a abrir. Si el fichero es un mapa que este navegador ya tiene (por ejemplo, una copia antigua) y son distintos, Hexmapper pregunta si **sustituir** tu copia por el fichero o **conservar ambos** (el fichero se abre como un mapa aparte).

> Si borras los datos del navegador se borra su biblioteca: guarda en fichero los mapas que te importen, o una [copia de seguridad de todo](../technical/05-backups.md) (selector de aplicaciones → **Guardar una copia**).

## Deshacer y ajustes

<kbd>Ctrl</kbd>+<kbd>Z</kbd> deshace y <kbd>Ctrl</kbd>+<kbd>Mayús</kbd>+<kbd>Z</kbd> rehace cada cambio (una pincelada entera es un paso). Jugar un viaje no forma parte de deshacer: tiene su propio diario.

**Ajustes del mapa** (el mapa plegado) tiene el nombre del mapa, la rejilla (hexes planos o en punta, coordenadas), su tamaño (por número de hexes o por papel) y la escala del mundo (km por hex, que usa el viaje). Tus preferencias (idioma, la aplicación de notas que enlazas) están en el engranaje, en **Preferencias**: son de este navegador, no del mapa.

## Enlaces a hexes

Cada hex tiene un enlace (el icono de cadena junto a su coordenada). Pégalo en tus notas: al abrirlo se muestra el mapa con ese hex seleccionado.

El enlace lleva el id del mapa. Si este navegador no tiene el mapa (otro dispositivo, o se borraron sus datos), Hexmapper te dice qué fichero necesita —`<id del mapa>.otd.json`, el nombre que le da **Guardar**— y te ofrece abrirlo; al cargarlo llegas al hex.

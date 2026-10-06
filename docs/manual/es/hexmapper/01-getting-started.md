# Primeros pasos

Hexmapper dibuja mapas de hexágonos para hexcrawls y campañas sandbox, y permite jugar viajes sobre ellos. Todo se queda en tu navegador: sin cuentas ni servidores.

## La pantalla

- **Barra de herramientas** (izquierda): arriba las herramientas —Seleccionar, Terreno, Regiones, Caminos y ríos, Iconos, Texto, Tokens, Jugar y Oracle— y abajo: Ajustes, Capas, Ayuda (?), Deshacer, Rehacer, Encuadrar, Nuevo, Mapas, Guardar y Exportar.
- **Mapa** (centro): arrastra con el botón central o con <kbd>Espacio</kbd> + arrastrar para desplazarte, usa la rueda para el zoom y <kbd>F</kbd> encuadra el mapa entero.
- **Panel lateral** (derecha): lo que edita la herramienta activa —el hex seleccionado con Seleccionar, la paleta con Terreno, el token seleccionado con Tokens…— o Ajustes, Capas, Ayuda, Oracle y las demás vistas de los botones de abajo. Al cambiar de herramienta se deselecciona lo que tenía seleccionado la anterior. El botón de nueve puntos junto al nombre del mapa abre las demás aplicaciones de OpenTabletop.

Cada herramienta tiene su tecla: pasa el ratón por un botón para verla, o consulta [Atajos de teclado](11-shortcuts.md).

## Tus mapas

Los mapas se guardan en la biblioteca de este navegador, automáticamente mientras trabajas. **Mapas** (el botón de la carpeta) los lista: abre uno, bórralo de este navegador o copia su enlace; **Importar fichero…** abre uno guardado.

**Guardar** escribe el mapa en un fichero (`.otd.json`, OpenTabletop Data) para tener copia o compartirlo; **Mapas → Importar fichero…** (o <kbd>Ctrl</kbd>+<kbd>O</kbd>) lo vuelve a abrir. Los ficheros antiguos `.hexmap.json` también se abren.

> Si borras los datos del navegador se borra su biblioteca: guarda en fichero los mapas que te importen.

## Deshacer y ajustes

<kbd>Ctrl</kbd>+<kbd>Z</kbd> deshace y <kbd>Ctrl</kbd>+<kbd>Mayús</kbd>+<kbd>Z</kbd> rehace cada cambio (una pincelada entera es un paso). Jugar un viaje no forma parte de deshacer: tiene su propio diario.

**Ajustes** (engranaje) tiene el nombre del mapa, la rejilla (hexes planos o en punta, coordenadas), su tamaño (por número de hexes o por papel), la escala del mundo (km por hex, que usa el viaje) y tus preferencias: idioma y la aplicación de notas que enlazas.

## Enlaces a hexes

Cada hex tiene un enlace (el 🔗 junto a su coordenada). Pégalo en tus notas: al abrirlo se muestra el mapa con ese hex seleccionado.

El enlace lleva el id del mapa. Si este navegador no tiene el mapa (otro dispositivo, o se borraron sus datos), Hexmapper te dice qué fichero necesita —`<id del mapa>.otd.json`, el nombre que le da **Guardar**— y te ofrece abrirlo; al cargarlo llegas al hex.

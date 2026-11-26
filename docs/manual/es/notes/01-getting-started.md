# Primeros pasos

Notas es la aplicación de notas de OpenTabletop: páginas en Markdown, guardadas en este navegador, para el trasfondo con el que enlazan tus partidas (personas, lugares, facciones, lo que sabe el grupo). Las demás aplicaciones guardan solo aquello con lo que juegan las reglas; un personaje, una casilla, un lugar, una facción o una campaña tiene una **nota**, la ruta de su página, y Notas es donde se escribe esa página. Si ya usas SilverBullet u Obsidian, elígelo en **Preferencias**: los enlaces funcionan igual.

## La pantalla

- **Cabecera**: el selector de aplicaciones (nueve puntos), la campaña que juegas, el teclado (**Atajos de teclado**, también la tecla <kbd>?</kbd>), el engranaje (**Preferencias**: idioma, aplicación de notas y lo demás que comparten todas las aplicaciones) y **?** para este manual.
- **Las páginas** (izquierda): **Nueva página**, **⋯** (exportar, importar y las páginas de ejemplo de los packs), un buscador, y todas las páginas como un árbol: primero una sección para la campaña que juegas, luego **General** (lo que no es de ninguna campaña) y después las demás campañas; dentro de cada una, carpetas. **+** junto a una sección o una carpeta crea una página allí.
- **La página** (centro): su ruta y título, su **Campaña**, **Leer** y **Editar**, y **⋯** (borrarla).
- **A su lado** (derecha): lo que la enlaza, lo del juego que tiene que ver con ella y dónde se escribe su título sin enlace ([abajo](#lo-que-enlaza-aqui)).

Las etiquetas subrayadas con puntos tienen una explicación: haz clic en una y la columna de ayuda se abre en ella.

## Páginas, carpetas y campañas

La **ruta** de una página es su título tras las carpetas en las que está, con `/` entre ellas: `pnj/Viejo Tobin` es **Viejo Tobin** en la carpeta **pnj**. Las carpetas son solo eso: una página en `lugares/pueblos/Hollow Gate` las crea. Cambia la ruta en lo alto de la página para renombrarla o moverla; los enlaces que llegaban a ella se cambian para llegar allí.

Cada página está en una **campaña**, o en **General**. Las páginas de una campaña son su trasfondo; General es para lo que puede usar cualquier campaña (reglas de la casa, un calendario de tu mundo, personas que viajan de una campaña a otra). La **Campaña** de la página la mueve. Dos páginas de la misma campaña no pueden compartir ruta; dos campañas pueden tener cada una su propio `pnj/Viejo Tobin`.

**Nueva página** crea una página _Sin título_ en la campaña que juegas (o en General, si no juegas ninguna), abierta para escribirla: dale su título arriba.

## Escribir

**Editar** (o <kbd>Ctrl</kbd>+<kbd>E</kbd>) escribe la página, en Markdown: `# Un título`, `**negrita**`, `_cursiva_`, listas (`- `), tareas (`- [ ] `), citas (`> `), tablas y código. **Leer** la muestra con sus enlaces. Lo que escribes se guarda según escribes.

## Enlaces

Escribe `[[` y elige con qué enlazar: páginas, los títulos de una página (tras `#`) y las cosas de tus partidas. Tal como se escriben:

- `[[Viejo Tobin]]` — la página con ese título; `[[pnj/Viejo Tobin]]` la nombra por su ruta, cuando dos páginas comparten título.
- `[[Viejo Tobin|el barquero]]` — muestra otro texto.
- `[[Hollow Gate#Secretos]]` — un título de una página; `[[#Secretos]]`, un título de esta.
- `[[character:kael]]` — un personaje del plantel, por su id: muestra su nombre actual, y lo abre en Personajes.
- `[[map:a1b2#0608]]` — una casilla de un mapa (el id del mapa, la etiqueta de la casilla), abierta en Mapa; `[[map:a1b2]]`, el mapa entero.
- `[[faction:valle/clanes]]` — una facción de una campaña (el id de la campaña, el de la facción), abierta en Campaña.
- `[[campaign:valle]]` — una campaña.

Los tipos (`character`, `map`, `faction`, `campaign`) se escriben siempre en inglés, sea cual sea el idioma de la interfaz. Un enlace a una página que aún no existe se dibuja discontinuo: un clic la crea, en la misma campaña. Uno a algo que este navegador no tiene (un personaje borrado) también sale discontinuo.

Dónde busca un enlace: una página de una campaña llega primero a las páginas de esa campaña y luego a las de General; una página de General solo llega a las de General. Las notas del [Diario](../campaign/01-getting-started.md) de una campaña se escriben con los mismos enlaces, y se leen como una página de esa campaña.

## Lo que enlaza aquí

Junto a la página:

- **Enlazan aquí**: las páginas que la enlazan, cada una con las líneas que lo hacen, y las notas del [Diario](../campaign/01-getting-started.md) de la campaña que la enlazan.
- **En el juego**: lo del juego que nombra (`[[character:kael]]`…), y lo que apunta a ella desde el juego: un personaje, una casilla, un lugar, una región, un token, una facción o una campaña cuya nota es esta página (**⇄**). Cada uno se abre en su aplicación.
- **Sin enlazar**: páginas que escriben su título sin enlazarla. **Enlazar** convierte esas menciones en enlaces.

## Desde las demás aplicaciones

En Personajes, Mapa, Campaña y las demás, las **Notas** (o la **Nota enlazada**) de una cosa guardan la ruta de su página. Con Notas elegida en Preferencias (lo predeterminado):

- **↗** abre su página aquí, buscada entre las páginas de la campaña de esa cosa (o la que juegas) y luego las de General; una página que aún no existe se crea, empezando por un enlace de vuelta a la cosa.
- **✎**, mientras la nota está vacía, escribe una página nueva para ella, con su nombre.

## Exportar e importar

**⋯ → Exportar como ficheros .md** descarga todas las páginas como un `.zip`: una carpeta por campaña (con su nombre) y **General**, cada página un fichero `.md` en su ruta. Los enlaces entre páginas se quedan como `[[…]]`, como los leen Obsidian y SilverBullet; los enlaces al juego pasan a ser enlaces Markdown normales a las aplicaciones.

**⋯ → Importar ficheros .md…** lee un `.zip` (o varios ficheros `.md`): lo que está en una carpeta con el nombre de una de tus campañas (o General) va allí, el resto a la campaña que juegas. Una página en la misma ruta de la misma campaña se reemplaza (tras preguntar), conservando lo que la enlaza; los enlaces a las aplicaciones escritos por una exportación vuelven a ser enlaces al juego.

Las páginas también van en tus [copias de seguridad](../technical/05-backups.md). Borrar una campaña conserva sus páginas: pasan a General, en una carpeta con su nombre.

## Las páginas de ejemplo

**⋯ → Añadir las páginas de ejemplo de The Grey Marches** añade a la campaña que juegas las páginas que traen las Marcas Grises: la portada de la campaña, Ashford, la barca, Hollow Gate, Brenna la barquera y los Clanes de Hierro ([Las Marcas Grises](../bundled/02-grey-marches.md#notas)). Abre antes el mapa de ejemplo (Mapa → Mapas de ejemplo), para que se añadan a su campaña: las casillas de Ashford, la barca y Hollow Gate del mapa, la barquera y los Clanes de Hierro ya enlazan con ellas.

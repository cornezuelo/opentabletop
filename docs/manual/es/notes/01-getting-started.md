# Primeros pasos

Notas es la aplicación de notas de OpenTabletop: páginas en Markdown, guardadas en este navegador, para el trasfondo con el que enlazan tus partidas (personas, lugares, facciones, lo que sabe el grupo). Las demás aplicaciones guardan solo aquello con lo que juegan las reglas; un personaje, una casilla, un lugar, una facción o una campaña tiene una **nota**, la ruta de su página, y Notas es donde se escribe esa página. Si ya usas SilverBullet u Obsidian, elígelo en **Preferencias**: los enlaces funcionan igual.

**La primera vez** que Notas se abre sin páginas, escribe una en General, **Bienvenida a Notas**: para qué sirve, el Markdown que lee (el mismo que [más abajo](#markdown-de-un-vistazo)) y cómo funcionan los enlaces, como chuleta. Es tuya: cámbiala o bórrala; no se vuelve a escribir.

## La pantalla

- **Cabecera**: el selector de aplicaciones (nueve puntos), la campaña que juegas, el teclado (**Atajos de teclado**, también la tecla <kbd>?</kbd>), el engranaje (**Preferencias**: idioma, aplicación de notas y lo demás que comparten todas las aplicaciones) y **?** para este manual.
- **Las páginas** (izquierda): **Nueva página**, **⋯** (exportar, importar y las páginas de ejemplo de los packs), un buscador, y todas las páginas como un árbol: primero una sección para la campaña que juegas, luego **General** (lo que no es de ninguna campaña) y después las demás campañas; dentro de cada una, carpetas. **+** junto a una sección o una carpeta crea una página allí.
- **La página** (centro): su ruta y título, su **Campaña**, **Leer** (el ojo) y **Editar** (el lápiz), y **⋯** (borrarla).
- **A su lado** (derecha): lo que la enlaza, lo del juego que tiene que ver con ella y dónde se escribe su título sin enlace ([abajo](#lo-que-enlaza-aqui)).

Las etiquetas subrayadas con puntos tienen una explicación: haz clic en una y la columna de ayuda se abre en ella.

## Páginas, carpetas y campañas

La **ruta** de una página es su título tras las carpetas en las que está, con `/` entre ellas: `pnj/Viejo Tobin` es **Viejo Tobin** en la carpeta **pnj**. Las carpetas son solo eso: una página en `lugares/pueblos/Hollow Gate` las crea. Cambia la ruta en lo alto de la página para renombrarla o moverla; los enlaces que llegaban a ella se cambian para llegar allí.

Cada página está en una **campaña**, o en **General**. Las páginas de una campaña son su trasfondo; General es para lo que puede usar cualquier campaña (reglas de la casa, un calendario de tu mundo, personas que viajan de una campaña a otra). La **Campaña** de la página la mueve. Dos páginas de la misma campaña no pueden compartir ruta; dos campañas pueden tener cada una su propio `pnj/Viejo Tobin`.

**Nueva página** crea una página _Sin título_ en la campaña que juegas (o en General, si no juegas ninguna), abierta para escribirla: dale su título arriba.

## Escribir

**Editar** (el lápiz, o <kbd>Ctrl</kbd>+<kbd>E</kbd>) escribe la página, en Markdown: `# Un título`, `**negrita**`, `_cursiva_`, listas (`- `), tareas (`- [ ] `), citas (`> `), tablas y código ([de un vistazo](#markdown-de-un-vistazo)). **Leer** (el ojo) la muestra con sus enlaces. Lo que escribes se guarda según escribes.

No hace falta saber Markdown: la barra sobre el texto lo escribe por ti. Cada botón pone sus marcas alrededor de lo seleccionado (o deja el cursor entre ellas, para escribir), y pulsado otra vez las quita:

- **B**, **I** y **S**: negrita, cursiva y tachado (<kbd>Ctrl</kbd>+<kbd>B</kbd>, <kbd>Ctrl</kbd>+<kbd>I</kbd>).
- **H ▾**: la línea como **Título**, **Sección**, **Subsección** o **Texto normal**, cada uno dibujado a su tamaño, con el de la línea marcado (<kbd>Ctrl</kbd>+<kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, <kbd>0</kbd>).
- Las líneas como lista, lista numerada o cita.
- **Enlace ▾**: **A una página o a lo del juego** (<kbd>Ctrl</kbd>+<kbd>K</kbd>) abre las sugerencias de [enlaces](#enlaces) para elegir uno, y lo seleccionado se queda como su texto (`[[Old Tobin|el barquero]]`); **A una web** (<kbd>Ctrl</kbd>+<kbd>Mayús</kbd>+<kbd>K</kbd>) escribe `[texto](https://)` con la dirección seleccionada para escribirla. Un enlace a una web, al leer, muestra **↗** y se abre en otra pestaña.
- **Imagen** ([más abajo](#imágenes)) y **Tabla**, una tabla de dos columnas para rellenar.
- **? Markdown** (o <kbd>F1</kbd> en el texto): el resumen de abajo, en la columna de ayuda.

El **Atajos de teclado** del teclado también lista estas teclas.

### Markdown de un vistazo

<!-- markdown-summary -->

| Escribe                          | Para tener                                                        |
| -------------------------------- | ----------------------------------------------------------------- |
| `# Old Tobin`                    | el título grande de la página                                     |
| `## Secretos`, `### Deudas`      | títulos más pequeños (`[[Página#Secretos]]` llega a uno)          |
| `**negrita**`                    | **negrita**                                                       |
| `_cursiva_`                      | _cursiva_                                                         |
| `~~tachado~~`                    | ~~tachado~~                                                       |
| `` `código` ``                   | `código`, las letras tal cual                                     |
| `- una cosa`                     | una lista (`1. ` la numera)                                       |
| `- [ ] por hacer`, `- [x] hecho` | una tarea, sin marcar o marcada                                   |
| `> lo que dijo`                  | una cita                                                          |
| `---`                            | una línea de lado a lado                                          |
| `[[Old Tobin]]`                  | un enlace a una página ([Enlaces](#enlaces))                      |
| `[la wiki](https://…)`           | un enlace a una página web                                        |
| líneas `\| Nombre \| Debe \|`    | una tabla: una fila por línea, una línea de `---` bajo la primera |
| `![El molino](picture:…)`        | una imagen de tu biblioteca de imágenes ([Imágenes](#imágenes))   |

Una línea en blanco empieza otro párrafo. El HTML escrito en una página se queda en texto, y una imagen de la web muestra solo su descripción: una página muestra imágenes de tu biblioteca de imágenes, nada más.

<!-- /markdown-summary -->

### Imágenes

Una página muestra imágenes de la **biblioteca de imágenes**, las que has añadido, compartidas por todas las aplicaciones (retratos, estandartes, los iconos de Mapa): la página nombra una, no la lleva dentro, así que sigue siendo ligera y la misma imagen sirve a todas las páginas que la muestran.

- **Imagen** (el marco), en la barra sobre el texto, abre la biblioteca: elige una (**Páginas** muestra las añadidas para páginas, **Todas** todas), dale un **Pie** si quieres (lo que se dice debajo) y **Usar esta**. Su línea se escribe donde está el cursor: `![El molino desde el vado](picture:…)`, con el pie entre los corchetes.
- **Suelta o pega** una imagen sobre el texto (un fichero, o una copiada de una página web o de un editor de imágenes): se guarda en la biblioteca en el acto, para páginas, y su línea se escribe donde cayó. Para darle pie, escríbelo entre los corchetes.
- Al leer, cada imagen ocupa como mucho el ancho de la página (una pequeña, su propio tamaño), con su pie debajo. Bajo el texto que se escribe, cada imagen de la página sale en pequeño: pulsa una para encontrar su línea.
- Una imagen borrada de la biblioteca muestra un recuadro discontinuo que lo dice. **Tus imágenes…** (el selector de aplicaciones) lista en **Usada por** las páginas que muestran cada imagen ([Tus imágenes](../technical/05-backups.md#tus-imágenes)).

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
- **Sin enlazar**: páginas que escriben su título sin enlazarla. **Enlazar** (la cadena junto a cada una) convierte esas menciones en enlaces.

## Desde las demás aplicaciones

En Personajes, Mapa, Campaña y las demás, las **Notas** (o la **Nota enlazada**) de una cosa guardan la ruta de su página. Con Notas elegida en Preferencias (lo predeterminado):

- **↗** abre su página aquí, buscada entre las páginas de la campaña de esa cosa (o la que juegas) y luego las de General; una página que aún no existe se crea, empezando por un enlace de vuelta a la cosa.
- **✎**, mientras la nota está vacía, escribe una página nueva para ella, con su nombre.

## Exportar e importar

**⋯ → Exportar como ficheros .md** descarga todas las páginas como un `.zip`: una carpeta por campaña (con su nombre) y **General**, cada página un fichero `.md` en su ruta. Los enlaces entre páginas se quedan como `[[…]]`, como los leen Obsidian y SilverBullet; los enlaces al juego pasan a ser enlaces Markdown normales a las aplicaciones. Las imágenes que muestran las páginas van en una carpeta **pictures**, y cada página nombra las suyas como ficheros (`![El molino](../pictures/El molino.webp)`), como las muestra cualquier lector de Markdown.

**⋯ → Importar ficheros .md…** lee un `.zip` (o varios ficheros `.md`): lo que está en una carpeta con el nombre de una de tus campañas (o General) va allí, el resto a la campaña que juegas. Una página en la misma ruta de la misma campaña se reemplaza (tras preguntar), conservando lo que la enlaza; los enlaces a las aplicaciones escritos por una exportación vuelven a ser enlaces al juego. Las imágenes junto a las páginas (una carpeta `pictures`, o cualquier imagen que las páginas nombren por su fichero, PNG, JPEG o WebP) se guardan en la biblioteca de imágenes y las páginas las muestran desde allí; una que la biblioteca ya tiene no se añade dos veces.

Las páginas también van en tus [copias de seguridad](../technical/05-backups.md). Borrar una campaña conserva sus páginas: pasan a General, en una carpeta con su nombre.

## Las páginas de ejemplo

**⋯ → Añadir las páginas de ejemplo de The Grey Marches** añade a la campaña que juegas las páginas que traen las Marcas Grises: la portada de la campaña, Ashford, la barca, Hollow Gate, Brenna la barquera y los Clanes de Hierro ([Las Marcas Grises](../bundled/02-grey-marches.md#notas)). Abrir el mapa de ejemplo (Mapa → **Mapas → Mapas de ejemplo**) las añade por sí solo a su campaña, las que aún no tiene (una página que ya está, cambiada o no, se queda como está), y un aviso lo dice: las casillas de Ashford, la barca y Hollow Gate del mapa, la barquera y los Clanes de Hierro ya enlazan con ellas.

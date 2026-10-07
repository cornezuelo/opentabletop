# Editar

La pestaña **Editar** es un formulario sobre el fichero YAML: solo cambia lo que tocas y conserva los comentarios y el orden. Los packs incluidos son de solo lectura: haz una copia primero.

**↶ ↷** en la cabecera (o <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> fuera de las cajas de texto) deshacen y rehacen cambios en tus packs: ediciones de formularios, definiciones nuevas y borradas, ficheros y packs. Escribir en el editor YAML cuenta como un cambio por pausa; dentro del editor, <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshace el propio texto. El historial dura mientras la página está abierta.

## Cualquier definición

Nombre, descripción y, en tablas y oráculos, los **dados** (`1d6`, `2d6`, `d66`, `d%`, `1d6 + {{modifier}}`… vacío = elegir por peso) y sus **modos de tirada**: por cada modo que declara su sistema (ventaja…), si se ofrece al tirar a mano y, en **solo cuando**, la condición que lo aplica solo (`explorer: { gte: 1 }`). En tablas y oráculos además:

- **Ajustar totales** (activado por defecto): un total por debajo del rango más bajo toma la primera entrada y por encima del más alto la última, así los modificadores nunca te dejan sin resultado. Desactivado, ese total no da nada.
- **Al agotarse**: qué pasa cuando la entrada que sale ya llegó a su límite (ver abajo): **tirar otra vez**, **tomar la siguiente** disponible o **nada**.

Las descripciones (de tablas, oráculos, generadores y mazos, y de las comprobaciones, acciones y características de un sistema de viaje) admiten **Markdown básico**: una línea en blanco empieza un párrafo nuevo, `**negrita**`, `_cursiva_`, `` `código` ``, listas (`- elemento`), citas (`> …`) y enlaces a la web (`[texto](https://…)`). Nada más: el HTML y las imágenes que traiga un pack se ven como texto, porque los packs pueden venir de cualquiera. En YAML, escribe una descripción larga como bloque: `description: |-` y el texto sangrado debajo. Las descripciones de las Marcas Grises lo usan: un párrafo con para qué sirve cada una y luego **Enseña:** con lo que enseña.

## Tablas

Cada **entrada** tiene:

- un **id** (necesario para traducciones y entradas de una vez; **Dar id a las entradas** los rellena),
- un **rango** de totales (`3` o `2-5`), o un **peso** cuando la tabla no tiene dados (lo probable que es frente a las demás: [Sin dados: pesos](08-dice-and-templates.md#sin-dados-pesos)),
- el texto del **resultado**, que puede incluir dados (`{{1d6}} lobos`) y valores del contexto (`{{season}}`),
- **luego tira**: otra tabla o generador que se tira después y cuyo resultado se añade.

Añade, duplica, mueve y quita entradas. **Numerar 1–N** les da rangos consecutivos y ajusta los dados.

**⋯** en una fila abre sus condiciones, valores y límites (las filas que tienen alguno lo indican bajo su texto):

- **Solo si**: la entrada solo puede salir cuando el contexto encaja, escrito en pares `clave: valor`, p. ej. `terrain: forest`, `season: [autumn, winter]` (cualquiera de ellas), `danger: { gte: 3 }` (3 o más), `tags: landmark` (el hex tiene esa etiqueta). Vacío: siempre. Si ninguna entrada encaja, la tabla no da nada. Las claves que puede leer una tabla están en [Qué ven las tablas](../technical/04-what-tables-see.md).
- **Fija**: valores que da la entrada cuando sale, p. ej. `weather: storm, lost: true` o `count: "{{2d6}}"`. Los leen el texto del resultado, las tablas y campos de generador siguientes y el viaje (ver [Conectar tablas](07-connecting.md)).
- **Solo una vez** / **Como mucho**: cuántas veces puede salir la entrada en una sesión (**Nueva sesión** en el Oracle las reinicia).

Las cajas admiten el mismo texto que el YAML entre `{ }`; una caja que no se puede leer como pares `clave: valor` se pone en rojo y no se guarda.

## Oráculos

Una **entrada** (su id, una **etiqueta** que mostrar y sus **opciones**, cada una con su etiqueta) y, para cada opción, su propia lista de entradas. Al renombrar una opción se renombra su lista. La opción **por defecto** es la que aparece seleccionada al tirar.

## Generadores

Los **campos** se tiran en orden; cada uno sale de una tabla, un generador, unos dados o un valor fijo, y los siguientes pueden usar los anteriores. La **plantilla** escribe el resultado: haz clic en un `{{campo}}` para añadirlo.

## Mazos

**Cartas** con un id, el número de **copias**, un texto y una tabla o generador opcional; y cuándo **barajar** (cuando se acaba el mazo, solo a mano o tras cada robo).

## Lo que no editan los formularios

La condición y el contexto de un campo de generador, y las condiciones anidadas (`any`, `all`, `not`), son más cómodos en el YAML. Consulta [Referencia YAML](06-yaml.md).

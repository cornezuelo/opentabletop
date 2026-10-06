# Editar

La pestaña **Editar** es un formulario sobre el fichero YAML: solo cambia lo que tocas y conserva los comentarios y el orden. Los packs incluidos son de solo lectura: haz una copia primero.

## Cualquier definición

Nombre, descripción y, en tablas y oráculos, los **dados** (`1d6`, `2d6`, `d66`, `d%`, `1d6 + {{modifier}}`… vacío = elegir por peso) y si se puede tirar con **ventaja o desventaja**.

## Tablas

Cada **entrada** tiene:

- un **id** (necesario para traducciones y entradas de una vez; **Dar id a las entradas** los rellena),
- un **rango** de totales (`3` o `2-5`), o un **peso** cuando la tabla no tiene dados,
- el texto del **resultado**, que puede incluir dados (`{{1d6}} lobos`) y valores del contexto (`{{season}}`),
- **luego tira**: otra tabla o generador que se tira después y cuyo resultado se añade.

Añade, duplica, mueve y quita entradas. **Numerar 1–N** les da rangos consecutivos y ajusta los dados.

## Oráculos

Una **entrada** (su id, una **etiqueta** que mostrar y sus **opciones**, cada una con su etiqueta) y, para cada opción, su propia lista de entradas. Al renombrar una opción se renombra su lista. La opción **por defecto** es la que aparece seleccionada al tirar.

## Generadores

Los **campos** se tiran en orden; cada uno sale de una tabla, un generador, unos dados o un valor fijo, y los siguientes pueden usar los anteriores. La **plantilla** escribe el resultado: haz clic en un `{{campo}}` para añadirlo.

## Mazos

**Cartas** con un id, el número de **copias**, un texto y una tabla o generador opcional; y cuándo **barajar** (cuando se acaba el mazo, solo a mano o tras cada robo).

## Lo que no editan los formularios

Las condiciones (`when`), los valores que fijan las entradas (`set`), los límites de una vez y el contexto de un campo de generador se editan en el YAML: el formulario marca las entradas que los tienen. Consulta [Referencia YAML](06-yaml.md).

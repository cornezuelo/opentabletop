# Crear un sistema

Un sistema de viaje son dos definiciones en un pack, normalmente en un mismo fichero: **reglas de viaje** (`kind: travel-rules`) y **bindings** (`kind: bindings`). [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) explica cada parte de ambas, paso a paso y con ejemplos.

## Un sistema nuevo

Escribe un nombre en la casilla de abajo de la lista de sistemas y pulsa **+**. Crea un pack tuyo con las reglas Genéricas de partida y unos bindings vacíos, y abre su pestaña **YAML**. El sistema se puede jugar al momento en esta aplicación y en el Hexmapper (en el mismo navegador).

## Cambiarlo con formularios

- **Reglas**: el día (alba, anochecer, horas de marcha), las formas de viajar (km por día, qué gasta cada una al día, por qué terrenos puede ir), cómo cambia la velocidad cada terreno y cada camino o río, las provisiones que se gastan al día, cuánto frena cada clima y si el grupo puede acampar y descansar. La **i** junto a cada parte la explica.
- **Comprobaciones**: cada comprobación con cuándo ocurre (al alba, al entrar en un hex, al acampar), sus condiciones, la tabla que la resuelve y el contexto extra; después, las características del grupo. Esta pestaña escribe a la vez las reglas de viaje y los bindings, así que no tienes que mantenerlos a la par: si renombras una comprobación, su tabla va con ella.

Las condiciones y el contexto se escriben en pares `clave: valor`, como en las tablas: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }`. Elegir **nada: espérame** como tabla hace que el viaje se detenga y espere a **Continuar**.

Los formularios cambian el fichero YAML conservando tus comentarios y el orden; la pestaña **YAML** muestra el resultado y marca cualquier problema en su línea. Lo que los formularios no cubren se puede escribir allí.

Las tablas que nombren sus bindings van en el mismo pack: añádelas en la aplicación Oracle (tu pack nuevo también sale allí), o usa tablas de otros packs con su id completo (`core/weather`).

## Cambiar un sistema incluido

Los sistemas incluidos son de solo lectura. En sus pestañas **Reglas**, **Comprobaciones** o **YAML**, **Editar una copia** hace una copia de todo el pack que puedes cambiar; sustituye al incluido en este navegador. Las copias de packs de uso personal siguen siendo de uso personal.

**↶ ↷** en la cabecera (o <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> fuera de las cajas de texto) deshacen y rehacen cambios en tus sistemas, mientras la página está abierta.

## Probarlo

La pestaña **Jugar** es la forma más rápida de comprobar un sistema: monta un camino corto con los terrenos, caminos y etiquetas que importan a tus reglas, y mira el diario. Por ejemplo, para probar una comprobación con `when: { tags: landmark }`, pon la etiqueta `landmark` al último hex y viaja.

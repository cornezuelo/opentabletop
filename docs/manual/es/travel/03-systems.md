# Crear un sistema

Un sistema de viaje son dos definiciones en un pack, normalmente en un mismo fichero: **reglas de viaje** (`kind: travel-rules`) y **bindings** (`kind: bindings`); su pack puede traer además un calendario (`kind: calendar`), modelos de clima (`kind: weather`) y modos de tirada (`kind: roll-modes`). Todos los tipos están en [Tipos de definición](../technical/07-kinds.md). [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) explica cada parte de ambas, paso a paso y con ejemplos.

## Un sistema nuevo

Escribe un nombre en la casilla de abajo de la lista de sistemas y pulsa **+**. Crea un pack tuyo con las reglas Genéricas de partida y unos bindings vacíos, y abre su pestaña **YAML**. El sistema se puede jugar al momento en esta aplicación y en el Hexmapper (en el mismo navegador).

## Cambiarlo con formularios

- **Reglas**: el día (alba, anochecer, horas de marcha), las formas de viajar (km por día, qué gasta cada una al día, por qué terrenos puede ir), cómo cambia la velocidad cada terreno y cada camino o río, las provisiones que se gastan al día, cuánto frena cada clima, los **valores del día** y las **acciones**. La ayuda junto a cada parte la explica. Provisiones: **Provisiones → Al día** es lo que gastan todos cada día (las Marcas Grises: comida 1, forraje 0), y cada forma de viajar añade lo suyo en **Gasta al día** (sus caballos: `fodder: 1`, así que a caballo se gasta comida y forraje y a pie solo comida); lo que pasa si falta alguna es regla del propio sistema (las Marcas Grises: una comprobación de fin de día, fatiga +1). El texto gris en una casilla vacía es solo el valor por defecto o una pista, no un valor.
  - **Valores del día**: valores que las tablas pueden poner para el resto del día, cada uno con un nombre y lo que **bloquea** mientras se cumple (viajar, acampar, descansar o una acción). Las Marcas Grises declaran **Perdidos**, que bloquea el viaje: lo pone la tabla de perderse, y los botones de Viajar se quedan desactivados hasta el día siguiente, diciendo por qué.
  - **Acciones**: acampar, descansar (cada una se puede desactivar) y las propias del sistema (**Añadir una acción**), como fichas: un nombre y una descripción para los jugadores, **Solo si** / **Salvo si** (cuándo se puede pulsar el botón: p. ej. Buscar comida de las Marcas Grises, no con tormenta), **Una vez al día**, lo que dice el diario cuando no se aplica ninguna de sus comprobaciones, y **Qué hace**, paso a paso: **Pasa el tiempo** (minutos, dawn, nightfall o una hora como 14:00), **Comer las provisiones del día**, **Marcha de hoy ×**, **Cambios** (efectos sobre el grupo). Un paso puede tener su propia condición: la acampada de las Marcas Grises come, duerme hasta el alba y, **solo si** `short: false` (no faltó nada), quita 1 de fatiga. Sus comprobaciones (en Comprobaciones, en esta acción) se tiran primero. Todo, con el YAML: [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).
- **Comprobaciones**: cada comprobación con su **nombre** y **descripción** para los jugadores (se ven en el panel del viaje y el diario en lugar del id del evento), cuándo ocurre (al alba, al entrar en un hex, al acampar o con una acción propia del sistema), sus condiciones, lo que la resuelve (cualquier tabla, oráculo, generador o mazo, agrupados por tipo, o un modelo de clima; p. ej. el vado de las Marcas Grises se tira en un oráculo), el contexto extra, **Cambios** (sus propios efectos, p. ej. Sin comida suficiente de las Marcas Grises: `party.stats.fatigue: 1`) y **Pausar después**; después, las características del grupo. Esta pestaña escribe a la vez las reglas de viaje y los bindings, así que no tienes que mantenerlos a la par: si renombras una comprobación, su tabla va con ella.

Las condiciones y el contexto se escriben en pares `clave: valor`, como en las tablas: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }`. Elegir **nada: espérame** como tabla hace que el viaje se detenga y espere a **Continuar**; **Pausar después** la tira y también espera (mira [qué hace aparecer Continuar](02-playing.md#el-viaje)).

Los formularios cambian el fichero YAML conservando tus comentarios y el orden; la pestaña **YAML** muestra el resultado y marca cualquier problema en su línea. Lo que los formularios no cubren se puede escribir allí.

Las tablas que nombren sus bindings van en el mismo pack: añádelas en la aplicación Oracle (tu pack nuevo también sale allí), o usa tablas de otros packs con su id completo (`core/weather`).

## Cambiar un sistema incluido

Los sistemas incluidos son de solo lectura. Bajo el nombre del sistema (en todas sus pestañas), **Editar una copia** hace una copia de todo el pack que puedes cambiar; sustituye al incluido en este navegador. Las copias de packs de uso personal siguen siendo de uso personal. En tu copia editada, en el mismo sitio aparece **Volver a la versión incluida**, que descarta tus cambios y recupera el sistema incluido (pregunta antes; ↶ lo deshace). Cuando una versión nueva cambia el sistema incluido, tu copia lo avisa en el mismo sitio y te deja coger o conservar cada cambio: mira [Actualizaciones de los packs incluidos](../oracle/03-packs.md).

**↶ ↷** en la cabecera (o <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> fuera de las cajas de texto) deshacen y rehacen cambios en tus sistemas, mientras la página está abierta.

## Probarlo

La pestaña **Jugar** es la forma más rápida de comprobar un sistema: monta un camino corto con los terrenos, caminos y etiquetas que importan a tus reglas, y mira el diario. Por ejemplo, para probar una comprobación con `when: { tags: landmark }`, pon la etiqueta `landmark` al último hex y viaja.

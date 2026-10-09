# Comprobaciones

La pestaña **Comprobaciones** edita lo que se tira por el camino, las características del grupo y, con una [hoja](07-sheet.md), lo que los personajes aportan al grupo. Escribe a la vez las reglas de viaje y los bindings, así que no tienes que mantenerlos a la par: si renombras una comprobación, su tabla va con ella.

## Comprobaciones

Cada comprobación (**Añadir una comprobación**) tiene:

- un **Nombre** y una **Descripción** para los jugadores, que se ven en el panel del viaje y el diario en lugar del id del evento;
- **Cuándo** ocurre, escrito como en el YAML con sugerencias: `day-start`, `hex-enter`, `day-end`, una acción del sistema como `camp`, o varios separados por comas (los encuentros de las Marcas Grises, `hex-enter, rest`). Vacío: solo cuando la tira un paso de una acción;
- **Solo si** / **Salvo si**: sus condiciones. P. ej. perderse en las Marcas Grises, que se salta por caminos y ríos: `edges: [road, river]`;
- **Se tira en**: lo que la resuelve, cualquier tabla, oráculo, generador o mazo, agrupados por tipo, o un modelo de clima, en _Clima con inercia_. P. ej. el vado de las Marcas Grises se tira en un oráculo;
- **Contexto extra**: valores que su tabla ve solo en esta comprobación. P. ej. `timeOfDay: night` para tirar un encuentro nocturno en la tabla del día, o `danger: 3` como si el hex fuera más peligroso;
- **Cambios**: sus propios efectos. P. ej. Sin comida suficiente de las Marcas Grises: `party.stats.fatigue: 1`;
- **Pausar después**: detiene el viaje y espera a **Continuar**.

**Sin tabla**, una comprobación solo se apunta en el diario (con sus **Cambios**) y el viaje sigue; **Pausar después** es lo que detiene el viaje, tras tirarla si tiene tabla (un lugar señalado que describir: sin tabla y con **Pausar después**). Un pack escrito para un [formato de pack](../technical/02-file-formats.md) antiguo, en el que las comprobaciones sin tabla detenían el viaje por sí solas, se juega como antes, y la pestaña ofrece **Actualizar** para escribirlo en el de hoy (mira [qué hace aparecer Continuar](../travel/02-playing.md#el-viaje)).

Si los bindings aún nombran tablas para comprobaciones que las reglas ya no tienen (una comprobación quitada en el YAML), una nota las lista y **Quitarlas** las borra.

Las tablas en las que se tira una comprobación van en el mismo pack (añádelas en la aplicación Oracle, donde también sale tu pack), o vienen de otros packs con su id completo (`core/weather`).

## Escribir condiciones

Las condiciones y el contexto se escriben en pares `clave: valor`, como en las tablas: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }`, `danger: { gt: '{{party.stats.stealth}}' }`. Todos los operadores, variables y tiradas: [Condiciones](../technical/08-conditions.md); toda la sintaxis de un vistazo: [Sintaxis](../technical/09-syntax.md); todos los valores que pueden leer: [Lo que ven las tablas](../technical/04-what-tables-see.md).

## Características del grupo

Números del grupo, cada uno con un id, un **Nombre** y una **Descripción** para los jugadores y el valor en que empieza (**Empieza en**) (**Añadir una característica**; su `min` / `max` se escriben en el YAML). El panel del viaje las muestra y deja que el jugador las cambie; las tablas las leen en tiradas (`1d6 + {{survival}}`) y condiciones (`party.stats.morale: { lte: 1 }`), y los efectos las cambian (`party.stats.fatigue: 1`).

Con una **Hoja**, **De los miembros** hace una característica con los valores de los personajes mientras el grupo tenga alguno: `max: survival` (la mejor Supervivencia), `min`, `sum`, `count: true`, con `when` / `unless` para dejar fuera a algunos. La Supervivencia de las Marcas Grises: `max: survival, unless: { conditions: wounded }, none: 0`. Vacío, la guarda el grupo.

## Roles de viaje

Las tareas que el jugador da a los personajes en un viaje (el **Guía** y el **Vigía** de las Marcas Grises), cada una con nombre y descripción. Las comprobaciones y tablas leen a quien la tiene como `roles.<id>.…`.

## Provisiones que llevan los miembros

Con una hoja, nombra una provisión de las reglas y el valor de la hoja en el que la lleva cada personaje (**Llevada en**: la comida de las Marcas Grises en `rations`), y cómo se reparte lo que el viaje gaste o gane (**Reparto**: por igual, o en orden). El viaje muestra la suma.

# Comprobaciones

La pestaña **Comprobaciones** edita lo que se tira por el camino, las características del grupo y, con una [hoja](07-sheet.md), lo que los personajes aportan al grupo. Escribe a la vez las reglas de viaje y los bindings, así que no tienes que mantenerlos a la par: si renombras una comprobación, su tabla va con ella. Esta página explica cómo funciona una comprobación, luego cada parte de la pestaña, construye desde cero un tramo de tierra de lobos paso a paso y repasa los errores habituales. La ayuda junto a cada campo lo explica, con ejemplos.

## Cómo funciona una comprobación

Una comprobación es una pregunta que el viaje se hace en un momento: _al entrar en un bosque, ¿nos encuentran los lobos?_, _al acabar un día sin comida, ¿se cansa el grupo?_ Las [reglas](05-rules.md) hacen los momentos (el reloj que da una hora, una parte del día que empieza, un hex en el que se entra, el día que acaba, una acción que se hace); una comprobación dice en cuáles se pregunta, dónde, qué la responde y qué cambia.

- **Cuándo.** En cada momento por el que pasa el viaje, primero van las acciones que el sistema hace **automáticamente** en él, y luego las comprobaciones de ese momento, **una a una, en el orden de la lista**.
- **Si sale.** El **Solo si** / **Salvo si** de cada comprobación se lee justo antes de que salga, así que ve lo que vino antes en ese momento: el clima recién tirado, un valor del día, los cambios de otra comprobación. Si no se cumplen, no sale; el **Todo** del diario dice por qué (_Lobos no sale: el camino tomado es road_).
- **Qué pasa.** Primero van sus propios **Cambios**. Luego **se tira en** su tabla (u oráculo, generador, mazo, modelo de clima): la tabla ve el hex, el momento, el grupo (sus características, su hoja, sus objetos) y el **Contexto extra** de la comprobación. Su resultado va al diario, y lo que el resultado fija (valores del día, el clima) y cambia (características, la hoja y los objetos del grupo, personajes) llega al viaje. Sin tabla, la comprobación es solo una línea en el diario, con sus **Cambios**.
- **Detenerse.** Una comprobación nunca detiene el viaje salvo que lo diga: **Pausar después**, o un resultado de su tabla que pausa (`pause: true` en una entrada), detiene el viaje hasta que el jugador pulsa **Continuar**, y deja en espera el resto de su momento hasta entonces. Una espera que haya detenido sigue tras **Continuar**; una marcha que haya detenido espera a **Seguir**, para que puedas mirar antes. Una comprobación del momento de una acción (**Cuándo** `actions.camp`) deja en espera también el resto de esa acción hasta que se resuelve: un encuentro nocturno que pausa se juega al empezar la acampada, y la noche pasa tras **Continuar** (cuando nada pausa, todo ocurre de una vez).

![Un momento de un viaje, al entrar en un hex: las acciones automáticas del sistema y luego cada comprobación en el orden de la lista. Una comprobación al llegar su momento: (1) se leen su Solo si / Salvo si, y si no se cumplen no sale, con el motivo en Todo; (2) sus propios Cambios; (3) se tira en su tabla, con su Contexto extra, o sin tabla es solo una línea en el diario; (4) el resultado va al diario, con sus valores y efectos, y Pausar después o un resultado que pausa esperan a Continuar. Luego la siguiente comprobación del momento, que ve todo esto.](check-moment.svg)

Una comprobación sin **Cuándo** nunca se pregunta sola: la pregunta un paso de una acción (`roll: checks.<su evento>`), como la pesca de las Marcas Grises tras sus dos horas.

## Comprobaciones

Las comprobaciones salen como fichas plegadas, cada una diciendo en una línea cuándo se pregunta, en qué se tira y si pausa (_Encuentro nocturno_ `CAMP_ENCOUNTER_CHECK_REQUIRED`: _Acción: Acampar · Al entrar en un hex · ¿Quién va?_); pulsa una para desplegarla, o **Desplegar todo** / **Plegar todo**. **Buscar** encuentra las comprobaciones cuyo nombre, evento, descripción, momentos, tabla o condiciones tienen todas las palabras que escribas (`acampar danger`). Cada comprobación (**Añadir una comprobación**; × quita una) tiene:

- su id, en **Comprobación** (`WOLVES`, `HUNGER`): el evento por el que la conocen las reglas y los bindings. Dos comprobaciones con tablas o contextos distintos necesitan ids distintos;
- un **Nombre** y una **Descripción** para los jugadores, que se ven en el panel del viaje y el diario en lugar del id del evento;
- **Cuándo** ocurre, escrito como en el YAML con sugerencias: una hora como `06:00` (al dar esa hora: dice **A las 06:00**), una parte del día del calendario como `time.watch.middle` (al empezar: dice **Al empezar Guardias: middle**), `trip.place-enter`, `time.day-end`, una acción del sistema como `actions.camp` (al empezar: sus pasos esperan a la comprobación) o su final como `actions.forage.done` (dice **Al acabar …**: buscar comida en las Marcas Grises, tras sus tres horas), otra comprobación como `checks.WEATHER_CHECK_REQUIRED` (dice **Tras la comprobación …**: justo después de resolverse), un reloj de progreso al llenarse como `world.clocks.the-greywood-wyrm-wakes.full` (dice **Al llenarse …**; lo llene lo que lo llene, también a mano), un turno del mundo de la campaña, `world.turn` (dice **Tras un turno del mundo**), o varios, cada uno una pastilla (Intro o una coma lo añade; Retroceso en la caja vacía quita el último; las sugerencias salen agrupadas por cómo empiezan) (los encuentros de las Marcas Grises, `trip.place-enter` y `actions.rest`). Vacío: solo cuando la tira un paso de una acción;
- **Al cumplirse esto**: la comprobación se tira **una vez, al cumplirse una condición**, además de en sus momentos de arriba (los _Presagios_ de las Marcas Grises, cuando el reloj de la Sierpe llega a 4); con **Para cada miembro**, una vez por cada personaje para el que se cumpla;
- **Solo si** / **Salvo si**: sus condiciones, en filas (mira [más abajo](#condiciones-y-cambios-en-filas)). P. ej. perderse en las Marcas Grises, que se salta por caminos y ríos: `trip.connections` · **es uno de** · `road, river`;
- **Se tira en**: lo que la resuelve, cualquier tabla, oráculo, generador o mazo, agrupados por tipo, o un modelo de clima, en _Clima con inercia_. P. ej. el vado de las Marcas Grises se tira en un oráculo;
- **Cambios**: sus propios efectos, una fila cada uno. P. ej. Sin comida suficiente de las Marcas Grises: `party.stats.fatigue` · `1`;
- **Contexto extra** (cuando algo la tira): valores que su tabla ve solo en esta comprobación, una fila cada uno. P. ej. `timeOfDay` · `night` para tirar un encuentro nocturno en la tabla del día, o `danger` · `3` como si el hex fuera más peligroso;
- **Pausar después**: detiene el viaje y espera a **Continuar**.

**Las comprobaciones de un mismo momento llegan una a una, en el orden de la lista.** Una comprobación al alba después de la del clima con **Solo si** `trip.weather` · **es** · `storm` sale en un alba de tormenta, la de hoy y no la de ayer (_Un alba de tormenta_ de las Marcas Grises). Una comprobación que pausa, o que espera a saber quién tira, deja en espera el resto de su momento hasta **Continuar** (mira [qué hace aparecer Continuar](../travel/02-playing.md#el-viaje)). Cada ficha enseña su puesto (_1._, _2._…); arrastra una por su asa (⠿) sobre otra para llevarla allí, o ↑ / ↓ un puesto.

Si los bindings aún nombran tablas para comprobaciones que las reglas ya no tienen (una comprobación quitada en el YAML), una nota las lista y **Quitarlas** las borra.

Las tablas en las que se tira una comprobación van en el mismo pack (añádelas en la aplicación Oráculo, donde también sale tu pack), o vienen de otros packs con su id completo (`core/weather`).

## Condiciones y cambios en filas

**Solo si** y **Salvo si** se construyen en filas de **qué lee** · **comparación** · **valor**, como las de una acción (_Condiciones en filas_, en [Reglas → Acciones](05-rules.md#acciones), explica cómo): `place.tags` · **es** · `landmark`, `trip.connections` · **es uno de** · `road, river`, `place.danger` · **es más de** · `{{party.stats.stealth}}`. **Cambios** y **Contexto extra** son filas de un nombre y un valor: **+ Añadir una fila**, y luego elige qué cambia (sugerido entre lo que tiene el sistema: `party.stats.fatigue`, `party.values.food`, `party.items.ration`, `world.clocks.<id>`…) y su valor (`1`, `-1`, `=0`, `-{{party.stats.mouths}}`); × quita una fila. **YAML**, debajo de cada uno, muestra lo mismo en una línea de YAML (`place.danger: { gte: 3 }`, `party.stats.fatigue: 1`) para lo que las filas no pueden decir; **Filas** vuelve. Todos los operadores, variables y tiradas: [Condiciones](../technical/08-conditions.md); toda la sintaxis de un vistazo: [Sintaxis](../technical/09-syntax.md); todos los valores que pueden leer: [Lo que ven las tablas](../technical/04-what-tables-see.md).

## Características del grupo

Números del grupo, cada uno con un id, un **Nombre** y una **Descripción** para los jugadores y el valor en que empieza (**Empieza en**) (**Añadir una característica**; su `min` / `max` se escriben en el YAML). El panel del viaje las muestra y deja que el jugador las cambie; las tablas las leen en tiradas (`1d6 + {{party.stats.survival}}`) y condiciones (`party.stats.morale: { lte: 1 }`), y los efectos las cambian (`party.stats.fatigue: 1`).

Con una hoja de grupo, **De las hojas** puede hacer que una característica sea uno de sus valores, siempre: `party: morale` (la Moral, la Fatiga, los Mercenarios y el Aguante de las Marcas Grises son de la Compañía). Con una hoja de personajes, hace una característica con los valores de los personajes mientras el grupo tenga alguno: `max: survival` (la mejor Supervivencia), `min`, `sum`, `count: true`, `pick: charisma` (el que elija el jugador para tirar, el mejor por defecto), con `when` / `unless` para dejar fuera a algunos. La Supervivencia de las Marcas Grises: `max: survival, unless: { conditions: wounded }, none: 0`. Vacío, la guarda el grupo.

El **Usado en** de cada característica lista las tablas, acciones y comprobaciones que la leen o la cambian, esté escrita por su nombre completo o por el corto ([Usado en](04-overview.md#usado-en)).

## Roles de viaje

Las tareas que el jugador da a los personajes en un viaje (el **Guía** y el **Vigía** de las Marcas Grises), cada una con nombre y descripción. Las comprobaciones y tablas leen a quien la tiene como `roles.<id>.…`.

El **Usado en** de un rol lista lo que lee a quien lo tiene: al guía de las Marcas Grises lo lee la tabla _¿Nos perdemos?_, que ninguna pestaña de aquí enseña si no.

## Lo que lleva el grupo

No se declara aquí: la comida, el agua o las antorchas son valores de la hoja del grupo u objetos que llevan sus personajes, y lo que el grupo gasta de un objeto (`party.items.ration: -1`) se reparte entre ellos como diga su hoja ([Hoja → Objetos](07-sheet.md#objetos)).

## Paso a paso: tierra de lobos

Un sistema en el que los bosques y las colinas son de los lobos: al entrar en ellos de día el grupo puede dar con sus huellas y apretar el paso, cansándose; al acampar allí de noche la manada puede rondar el fuego; unas piedras viejas del camino merecen pararse a describirlas; y una noche sin comida también cansa al grupo. Parte de un sistema nuevo: empieza como copia de las Reglas genéricas, cuya única comprobación tira el clima cada mañana (su día, la marcha y la comida de cada noche: mira [Reglas](05-rules.md)).

1. **Créalo**: escribe _Tierra de Lobos_ bajo la lista de sistemas y pulsa **+**.
2. **Fatiga**: en **Características del grupo**, **Añadir una característica** y llámala _Fatiga_ (su id pasa a ser `fatiga`; cámbialo a `fatigue`, como en el resto de esta página), **Empieza en** `0`.
3. **Hambre**: **Añadir una comprobación**, con **Comprobación** `HUNGER` y el nombre _Hambre_. **Cuándo** `time.day-end`; **Solo si** `trip.below` · **es** · `party.values.food` (el **Comer** de las Reglas genéricas ocurre automáticamente al acabar el día, antes de esta comprobación, y llega al mínimo de la comida del grupo cuando no queda); **Se tira en** _— sin tabla —_; **Cambios** `party.stats.fatigue` · `1`.
4. **La tabla de los lobos**: en la aplicación Oráculo, **Nueva definición**, una tabla en tu pack _Tierra de Lobos_ con el id `wolves`, el nombre _Lobos_ y la tirada `1d6 + {{night}}`: con `1-4` _Solo el viento entre los árboles_; con `5-6` _Huellas frescas; apretáis el paso_, con **Cambios** `party.stats.fatigue: 1`; con `7-8` _La manada ronda el fuego_, marcando **Pausar** en esa entrada. De día `{{night}}` no es nada, que cuenta como `0`: la manada nunca llega.
5. **Lobos de día**: de vuelta en **Comprobaciones**, **Añadir una comprobación**, con **Comprobación** `WOLVES` y el nombre _Lobos_. **Cuándo** `trip.place-enter`; **Solo si** `place.terrain` · **es uno de** · `forest, hills`; **Salvo si** `trip.connections` · **es** · `road` (los lobos no se acercan a los caminos); **Se tira en** _Lobos_.
6. **Lobos de noche**: **Añadir una comprobación**, con **Comprobación** `WOLVES_AT_NIGHT` y el nombre _Lobos de noche_. **Cuándo** `actions.camp`; **Solo si** `place.terrain` · **es uno de** · `forest, hills`; **Se tira en** _Lobos_, la misma tabla; **Contexto extra** `night` · `2`: de noche la tabla tira `1d6 + 2`, y una noche de cada tres llega la manada.
7. **Piedras viejas**: **Añadir una comprobación**, con **Comprobación** `OLD_STONES` y el nombre _Piedras viejas_. **Cuándo** `trip.place-enter`; **Solo si** `place.tags` · **es** · `landmark`; sin tabla; marca **Pausar después**.
8. **Pruébalo**: en **Pruébalo**, haz un camino de seis hexes: `plains`, `forest`, `forest`, `hills`, `plains` con la etiqueta `landmark`, `plains`, con un `road` del hex 3 al hex 4. Empieza un viaje en verano, pon **Comida** a `1` en el panel del viaje y marcha día tras día, esperando a la mañana siguiente cada vez que la marcha se detenga.

**Lo que verás.** El primer día el grupo entra en el bosque (hex 2) a las 11:20: el diario dice _Lobos: Solo el viento entre los árboles_ o _Lobos: Huellas frescas; apretáis el paso (Fatiga +1)_. La marcha se detiene a las 14:00 en mitad del bosque, y al llegar la noche el grupo acampa allí: se tira _Lobos de noche_ con `+2` (**Todo** enseña los dados: `1d6 + 2`), y cuando llega la manada el viaje se detiene (_Lobos de noche en Hex 2 (Bosque): en pausa, sigue cuando quieras_): **Continuar**, y la noche sigue. A medianoche el grupo se come su última comida. El segundo día: el siguiente hex de bosque a las 08:40, otra vez lobos; las colinas por el camino, y sin lobos (**Todo**: _Lobos no sale: el camino tomado es road_); las piedras viejas poco después de las 13:00: _Piedras viejas en Hex 5 (Llanura): esperando_. Pulsa **Continuar** y luego **Seguir**: la marcha sigue y se detiene a las 14:00. Esa noche no hay nada que comer: _Comida no puede bajar de 0_, _No queda nada que comer._ y _Hambre: Fatiga +1_. En la llanura no se tiran lobos, ni de día ni de noche. (Las horas son las de un día de buen tiempo: la comprobación de clima que conserva la copia se tira cada mañana, y la lluvia, una tormenta o la nieve frenan la marcha.)

## Lo mismo en YAML

Lo que los pasos añaden a las Reglas genéricas y a sus bindings, como lo muestra la pestaña **YAML** (un extracto: el resto sigue como estaba), y la tabla, como la muestra el editor YAML del Oráculo:

```yaml
# travel.yaml: las reglas (kind: travel-rules)
checks:
  # … la comprobación de clima de las Reglas genéricas, primero, como venía
  - event: HUNGER # paso 3
    name: Hambre
    at: time.day-end
    when: { trip.below: party.values.food }
    effects: { party.stats.fatigue: 1 }
  - event: WOLVES # paso 5
    name: Lobos
    at: trip.place-enter
    when: { place.terrain: [forest, hills] }
    unless: { trip.connections: road }
  - event: WOLVES_AT_NIGHT # paso 6
    name: Lobos de noche
    at: actions.camp
    when: { place.terrain: [forest, hills] }
  - event: OLD_STONES # paso 7
    name: Piedras viejas
    at: trip.place-enter
    when: { place.tags: landmark }
    pause: true
# … el día, los terrenos, las formas de viajar, la comida y las acciones de las Reglas genéricas
---
# travel.yaml: los bindings (kind: bindings)
on:
  WOLVES: { resolve: table.wolves } # paso 5
  WOLVES_AT_NIGHT: { resolve: table.wolves, context: { night: 2 } } # paso 6
stats:
  fatigue: { name: Fatiga, default: 0 } # paso 2
```

```yaml
kind: table
id: wolves
name: Lobos
roll: '1d6 + {{night}}'
entries:
  - { id: wind, range: 1-4, result: Solo el viento entre los árboles }
  - id: tracks
    range: 5-6
    result: Huellas frescas; apretáis el paso
    effects: { party.stats.fatigue: 1 }
  - { id: pack, range: 7-8, result: La manada ronda el fuego, pause: true }
```

Las Marcas Grises juegan con todo esto y más (el clima primero al alba y una comprobación que lo lee, perderse según el guía, un vado tirado en un oráculo, un santuario tirado y con pausa, encuentros de día y en el campamento con una sola tabla y otro contexto, el hambre como comprobación del final del día): su [página](../packs/02-grey-marches.md) dice dónde.

## Errores habituales

- **Una comprobación que nunca sale.** Su **Cuándo** está vacío (solo la pregunta un paso de una acción), o sus condiciones nunca se cumplen: el terreno del mapa es `dense-forest` y la comprobación pide `forest`, la etiqueta del hex es `Landmark` y pide `landmark`. Elige **Todo** en el diario: cada comprobación que no salió dice por qué.
- **La misma tabla, de día y de noche.** Una comprobación con **Cuándo** `trip.place-enter, actions.camp` tiene un solo **Contexto extra**, el mismo en los dos momentos. Haz dos comprobaciones con dos ids, como los pasos 5 y 6, o deja que las entradas de la tabla distingan los momentos (`when: { trip.moment: actions.camp }`).
- **Una comprobación que lee lo que viene después.** Las comprobaciones de un momento van en el orden de la lista: una que esté por encima de la del clima ve el clima de ayer. Pon primero la que fija algo.
- **Hambre todas las noches, o nunca.** `trip.below: party.values.food` solo se ve en el momento en que la comida llegó a su mínimo (el **Comer** de las Reglas genéricas, en `time.day-end`): una comprobación de hambre en otro momento nunca lo ve.
- **Una comprobación que no detiene nada.** Sin tabla y sin **Pausar después**, una comprobación es solo una línea en el diario. Para detener el viaje, marca **Pausar después**; para detenerlo solo con algunos resultados, marca **Pausar** en esas entradas de su tabla.
- **Una marcha que no sigue tras Continuar.** **Continuar** acaba la pausa y sigue con una espera que haya detenido, pero una marcha que haya detenido espera a **Seguir** (o a que el viaje siga solo).
- **Lobos en el camino.** **Salvo si** `trip.connections` · **es** · `road` lee el camino o río que el grupo siguió para entrar en el hex: un hex de bosque al que se entra campo a través, junto a un camino, sigue teniendo lobos.
- **Un ⚠ en Se tira en.** La tabla nombrada no está en el pack del sistema ni en los packs que trae: una tabla de otro pack se nombra con su id completo (`core/weather`), y ese pack tiene que ser una de las dependencias del pack.
- **Una tabla que pide un valor.** Un valor que la tabla lee y nada da (`{{night}}` de día) cuenta como `0` en los dados; en las condiciones no es nada. Tirada a mano en el Oráculo, lo pide.

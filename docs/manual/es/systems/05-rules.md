# Reglas

La pestaña **Reglas** edita las reglas de viaje del sistema (`kind: travel-rules`): cómo va un día, a qué velocidad se mueve el grupo y por dónde, qué lleva y qué puede hacer. Esta página explica cómo avanza un viaje, luego cada parte de la pestaña, construye desde cero una caravana por el desierto paso a paso y repasa los errores habituales. La ayuda junto a cada campo lo explica, con ejemplos. El texto gris en una casilla vacía es solo el valor por defecto o una pista, no un valor. Todo, con el YAML: [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).

## Cómo avanza un viaje

Un viaje es un reloj y un lugar. Nada en él pasa por sí solo: el reloj solo avanza cuando el grupo hace algo (los pasos de una acción llevan tiempo, marchar lleva tiempo) o cuando lo dejas correr (**Esperar para seguir**, el reloj del mundo); y el grupo solo sale de su hex cuando una acción lo mueve.

- **Momentos.** Al avanzar, el reloj pasa por momentos: una hora (`06:00`), el principio de una parte del día del calendario (`time.part.morning`), un hex en el que se entra (`trip.hex-enter`), el final del día (`time.day-end`), una acción que se hace. En cada uno ocurren, una tras otra, las acciones que el sistema hace **automáticamente** en él y sus [comprobaciones](06-checks.md) de ese momento. Eso es lo que da forma a un día: no hay ningún día integrado.
- **Moverse.** Solo una acción con un paso **Moverse** (`travel.move`) mueve al grupo: la **marcha**. Recorre la ruta hex a hex mientras se cumplen su **Solo si** / **Salvo si**, y se detiene cuando dejan de cumplirse (de noche, en cuanto se gastan las horas de marcha del día), cuando la bloquea un valor del día, cuando la velocidad del clima es `0`, cuando la para una comprobación o al final del camino.
- **Cuánto se tarda en un hex.** Una forma de viajar hace sus **km por día** en las **Horas de marcha al día**: esa es su velocidad en terreno fácil (30 km en 8 horas: 3,75 km por hora). El hex en el que se entra la multiplica por la **Velocidad ×** de su terreno o, si el grupo entra siguiendo un camino o un río, por la de esa línea en su lugar; luego por la **Velocidad ×** del clima de hoy y por un paso **Cambiar la velocidad** que haya dado hoy una acción. Los **km por hex** a esa velocidad es lo que se tarda: 10 km a 3,75 km/h en un bosque a `0.5` son 5 h 20 min. Lo que falte de un hex cuando la marcha se detiene se guarda para la siguiente.
- **Todo lo demás son números que leen y cambian las acciones y tablas del sistema**: provisiones (comida, agua…), valores del día (perdidos…), las características del grupo. La app nunca los gasta ni los pone por sí sola.

![Un día de las Reglas genéricas, de medianoche a medianoche: (1) el viaje empieza a las 06:00, al empezar la mañana; (2) la marcha entra en un hex cada 2 h 40 min; (3) a las 14:00, marchadas sus 8 horas, se detiene; (4) la tarde es del jugador, para los demás botones; (5) a las 20:00 empieza la noche y un grupo que espera acampa hasta la mañana; (6) a medianoche acaba el día y el grupo come.](trip-day.svg)

El dibujo es el día de las Reglas genéricas, del que parte todo sistema nuevo: su marcha se cumple mientras no es de noche y se han marchado menos de 8 horas, su acampada duerme hasta la mañana y su **Comer** ocurre automáticamente en `time.day-end`. Cambia cualquiera de ellas y el día cambia con ella.

## El día

No hay un día ni una marcha integrados: el grupo se mueve con las acciones que tienen un paso `travel.move` (la **march**, abajo), de día, unas horas, con antorchas…, según el sistema.

- **Los viajes empiezan**: cuándo empieza un viaje nuevo en su primer día, una hora (`06:00`) o una parte del día del calendario (`time.part.morning`, sugerida: cuando empieza). Vacío: a medianoche.
- **Horas de marcha al día**: las horas en que una forma de viajar hace sus km al día, la escala de su velocidad. Cuánto puede marchar el grupo cada día lo dice la marcha (`trip.marched: { lt: '{{system.hoursPerDay}}' }` lee este número). El tiempo de las acciones (descansar, buscar comida) no cuenta como marcha.
- **km por hex**: la escala a la que se juega el sistema. Los viajes sin mapa (Travel, **Pruébalo**) la usan; un mapa con este sistema la toma, salvo que el mapa fije su propia escala.
- **Sigue por sí solo con** y **Con**: la acción que hace el viaje cuando sigue por sí solo (el reloj del mundo avanzando con un viaje en marcha, una orden de viajar), con sus parámetros: `march`, con `until: destination`, sigue marchando hasta el destino día tras día. La hace siempre que puede, y espera (con la parada) mientras no puede. Nada: el viaje solo espera.
- **Parada desde** y **Acción de la parada**: lo que hace el grupo cuando no puede marchar mientras el tiempo avanza solo (el reloj del mundo, **Esperar para seguir**, una orden de viajar mientras no se puede hacer su forma de seguir): desde ese momento (una hora, `20:00`, o una parte, `time.part.night`) hasta que acaba el día, un grupo que no está marchando hace la acción, una vez al día; acampar, por ejemplo. Si no se cumplen sus condiciones, el diario dice por qué y el tiempo pasa sin ella. Sin acción: el grupo simplemente espera.

## Formas de viajar

Cada una con su **Nombre** y su **Descripción (su ayuda)** para los jugadores (el panel del viaje enseña la de la elegida como ayuda de **Viaje**), sus **km por día** y: Su orden cuenta: **la primera es la de un viaje nuevo**; cada ficha enseña su puesto, y su asa (⠿) la arrastra sobre otra (o ↑ / ↓ un puesto).

- **Solo por**: por dónde puede ir, una condición sobre cada hex en el que entra, construida en filas (mira [Condiciones en filas](#condiciones-en-filas)). P. ej. la barca de las Marcas Grises por agua o costa, **Alguna de estas**: `hex.water` · **es** · `true` y `hex.terrain` · **es** · `coast`, o un carro solo por camino, `trip.edges` · **es** · `road`. Donde se cumple, la deja entrar incluso un terreno cerrado (o no **Transitable**).
- **Solo si**: dónde y cuándo se puede elegir, también en filas. P. ej. la barca de las Marcas Grises solo a la orilla o en el transbordador, **Alguna de estas**: `hex.water` · **es** · `true`, `hex.terrain` · **es** · `coast` y `hex.tags` · **es** · `ferry`.
- **Salvo si**: cuándo no.

Un viaje empieza con la primera forma de la lista; el jugador elige otra en el panel del viaje.

## Terrenos, agua y caminos

- **Terrenos**: cómo cambia la velocidad cada uno (**Velocidad ×**) y si se puede entrar (**Transitable**, y **Abierto cuando** / **Cerrado cuando**: condiciones sobre el hex al que se entra y el momento; una forma de viajar con **Solo por** va solo por eso, como arriba). P. ej. los picos de las Marcas Grises, abiertos solo en verano y cerrados con nieve o tormenta: `time.season` · **es** · `summer` / `trip.weather` · **es uno de** · `snow, storm`. **Velocidad × de los terrenos no listados** cubre cualquier terreno del mapa que no esté en la lista.
- **Hexes de agua**: lo mismo, para los hexes que el mapa marca como agua y no tienen regla propia en Terrenos. Una forma de viajar cuyo **Solo por** se cumple en el agua puede navegarlos igualmente.
- **Caminos y ríos**: al seguir uno de un hex al siguiente, su **Velocidad ×** sustituye a la del terreno (un camino a `1.5`: un 50 % más rápido). La sustituye, no la multiplica: un río a `1` hace que las montañas a su orilla se crucen como llanuras. Las líneas no listadas no hacen nada; las condiciones pueden distinguirlas igualmente (`trip.edges: road`).

## Provisiones

Lo que lleva el grupo, cada una con su **Nombre**, su **Descripción (su ayuda)**, su **Mín** y su **Máx**. Las provisiones las gastan las acciones, comprobaciones y tablas del propio sistema, nunca la app: las Marcas Grises comen con una acción que el sistema hace al final de cada día (1 de comida, y 1 de forraje a caballo).

**Mín** y **Máx** acotan una provisión: un cambio que pasaría de uno se queda en él, el diario lo dice y las reglas del sistema pueden reaccionar (las Marcas Grises: una comprobación de fin de día, fatiga +1, cuando la comida llegó a su mínimo): los pasos siguientes de la misma acción, y las comprobaciones de ese momento, ven `trip.below: food` (o `trip.above`).

Un viaje nuevo empieza con 6 de cada provisión, o con su **Máx** si es menor (su **Mín** si es mayor); el jugador las cambia en el panel del viaje antes de salir.

Su columna **Usado en** lista las acciones, comprobaciones y tablas que leen, gastan o suman a cada una ([Usado en](04-overview.md#usado-en)).

## Clima

Cuánto frena al grupo cada clima (**Velocidad ×**; `0`: ese día no se viaja). El clima no listado no cambia la velocidad; las condiciones pueden leerlo igualmente (`trip.weather: storm`). De dónde sale el clima del día lo decide una comprobación: una tabla, o un [modelo de clima](11-weather.md).

## Valores del día

Valores que las tablas, el clima y los pasos **Dar un valor del día** de las acciones (`set:`) pueden poner para el resto del día, cada uno con un nombre y lo que **Bloquea** mientras se cumple: viajar, una de las acciones del sistema o una forma de viajar como `modes.<id>` (la caja sugiere lo que declara el sistema: `modes.horse` deja los caballos atrás mientras se cumple: un grupo a caballo se detiene, y el diario dice que elijas otra forma de viajar).

Las Marcas Grises declaran **Perdidos**, que bloquea el viaje: lo pone la tabla de perderse, y las acciones que mueven al grupo (su marcha) se quedan desactivadas hasta el día siguiente, diciendo por qué.

**Usado en** lista quién fija cada valor y quién lo lee, ese día o el siguiente como `yesterday.<id>` ([Usado en](04-overview.md#usado-en)).

## Acciones

Lo que puede hacer el grupo: solo lo que declara el sistema (acampar, descansar, **marchar** y las suyas), todas iguales, como fichas (**Añadir una acción**; × quita una). Las fichas salen plegadas, cada una diciendo en una línea quién la hace y sus primeros pasos (_Descansar_ `rest`: _Con su botón · Pasan 2 h → Cambia: Fatiga −1_; una más larga acaba en _…y 3 más_); pulsa una para desplegarla, o **Desplegar todo** / **Plegar todo**. Su orden cuenta: es el de los botones del panel del viaje, y el orden en que el sistema hace por sí solo las de un mismo momento; cada ficha enseña su puesto, y su asa (⠿) la arrastra sobre otra (o ↑ / ↓ un puesto). Desplegada, empieza con una lectura corta: una línea de quién la hace y cómo (_Con su botón · una vez al día · eligiendo Hasta dónde_), y luego su **Solo si** y su **Salvo si** en palabras, cada uno en su línea (una condición con grupos, que las filas no pueden enseñar, se dice en corto: su YAML está en su campo); sus pasos son las tarjetas de debajo, cada una diciendo lo que hace. **Buscar** encuentra las fichas cuyo nombre, id, descripción, momentos o pasos tienen todas las palabras que escribas (`acampar fatigue`). Cada una tiene:

- un **id**, y un **Nombre** y una descripción para los jugadores;
- **Solo si** / **Salvo si**: cuándo se puede pulsar su botón, construidas en filas (mira [Condiciones en filas](#condiciones-en-filas) más abajo). P. ej. Buscar comida de las Marcas Grises, no con tormenta; `time.hour: { gte: 6, lt: 20 }` para solo de día;
- **Una vez al día**;
- **Oculta si no se puede hacer**: si no, su botón sigue, desactivado, diciendo por qué. P. ej. el rito de las Marcas Grises, solo en un santuario con luna llena;
- **Automática en**: vacío, la hace el jugador con un botón; o los momentos en que la hace el propio sistema, escritos como en el YAML con sugerencias: una hora (`06:00`: al dar esa hora), una parte del día del calendario (`time.meal.elevenses`: al empezar), `trip.hex-enter`, `time.day-end`, otra acción (`actions.camp`) o un reloj de progreso al llenarse, lo llene lo que lo llene (`world.clocks.<id>.full`, por el id que declara el sistema o, uno hecho a mano, por su nombre en minúsculas con guiones: mira [Momentos del mundo](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)), varios, cada uno una pastilla (Comer de las Marcas Grises, `time.day-end`; su _La Sierpe despierta_, `world.clocks.the-greywood-wyrm-wakes.full`). El `time` de un paso también puede llegar hasta una parte (`time: time.meal.luncheon`). Las palabras bajo la caja lo repiten. Las acciones que la siguen y sus comprobaciones (en [Comprobaciones](06-checks.md), en esta acción) van primero;
- **Parámetros**: lo que elige el jugador junto a su botón, cada uno con sus opciones (la primera es la de por defecto): `until: { choices: [destination, hex, 3] }`; sus pasos y condiciones leen la elegida como `{{params.until}}`. Un paso `do:` los da con `with:`, y también **Sigue por sí solo con**;
- **Cuando no se aplica nada**: lo que dice el diario cuando no se aplica ninguna de sus comprobaciones;
- **Qué hace**, paso a paso, cada paso una tarjeta (las flechas suben o bajan un paso).

**Marchar** es una acción como las demás: su paso `travel.move: '{{params.until}}'` mueve al grupo por la ruta, comprobando su **Solo si** / **Salvo si** por el camino, y se detiene en cuanto dejan de cumplirse (vacíos: siempre que nada más lo impida, de día y de noche). Su botón ofrece las opciones de su parámetro (hasta el destino, un hex…). Un sistema puede llamarla como quiera (`sail`, `ride`), tener varias o ninguna: entonces el grupo nunca se mueve por su ruta.

### Condiciones en filas

**Solo si**, **Salvo si**, el **Esperar algo** de un paso, el **Solo por** de una forma de viajar y el **Abierto cuando** / **Cerrado cuando** de un terreno se construyen en filas, una por cosa que comprobar: **qué lee** (sugerido por su nombre completo: `hex.terrain`, `party.stats.fatigue`, `trip.weather`…), una **comparación** y un **valor** (sugerido entre lo que declara el sistema). Por ejemplo `trip.weather` · **no es ninguno de** · `storm, snow`, o `party.stats.fatigue` · **es menos de** · `{{party.stats.endurance}}`.

- Las comparaciones: **es**, **es uno de** y **no es ninguno de** (valores separados por comas), **no es**, **es más de**, **es al menos**, **es menos de**, **es como mucho**, **existe** y **falta** (sin valor). Son los `eq`, `in`, `not`, `gt`, `gte`, `lt`, `lte` y `exists` de [Condiciones](../technical/08-conditions.md).
- Con dos filas o más, **Todas estas** (se tiene que cumplir cada fila) o **Alguna de estas** (basta con una).
- **+ Añadir una condición** añade una fila; × la quita; sin filas, no se comprueba nada.
- **YAML** muestra la misma condición como una línea de YAML (`trip.weather: { not: [storm, snow] }`), para lo que las filas no pueden decir; **Filas** vuelve. Una condición escrita con grupos dentro de grupos (un `any` cuyas ramas comprueban dos cosas, una condición entera dada la vuelta con `not:`), como la marcha de las Marcas Grises, se muestra solo como YAML, y se conserva tal cual.

### Pasos

Cada paso es una tarjeta. Plegada, su título dice en palabras lo que hace (_Pasan 3 h_, _Hacer Marchar (until: hex)_, _Cambia: Fatiga −1_: lo que cambia por su nombre, como lo dice el diario del viaje) y, a su lado, su condición (_salvo si trip.below es food_); pulsa el título para abrirla. Arrastra una tarjeta por su asa (⠿) sobre otra para llevar el paso ahí (o ↑ / ↓ de uno en uno). Abierta, **Qué hace** elige uno de los tipos de abajo, y sus campos cambian con él: un tiempo, una forma de viajar, una acción y los valores de sus parámetros, una comprobación, filas de cambios (`party.stats.fatigue` · `1`)… Cambiar el tipo conserva las condiciones del paso. Debajo, el **Solo si** / **Salvo si** del propio paso, en filas. **YAML**, arriba en la tarjeta, muestra el paso como lo escribe el pack, para lo que el formulario no cubre (un `id`, por ejemplo). Los tipos, como los escribe el YAML:

- `time: 180`: pasan tres horas (o hasta una hora, `06:00`, o una parte del día, `time.part.morning`);
- `travel.move: destination`: moverse por la ruta mientras pasa el tiempo y se cumplen las condiciones de la acción, hasta el destino (`hex`: el siguiente; `3`: tres hexes; `'{{params.until}}'`: lo que diga su parámetro); una comprobación que te necesita lo detiene por el camino, y **Seguir** sigue con él;
- `travel.speed: 0.5`: el resto del movimiento de hoy va a media velocidad;
- `effects: { party.stats.fatigue: -1 }`: cambia las características, provisiones o personajes del grupo;
- `set: { lost: true }`: pone un valor del día;
- `do: actions.forage`: otra acción, si se cumplen sus condiciones; `do: actions.march, with: { until: hex }`: con sus parámetros;
- `roll: checks.<comprobación>`: una comprobación, ya; o algo del Oráculo (`roll: table.ruins`, `generator.<id>`, `oracle.<id>`, `deck.<id>`), tirado ya sin comprobación alrededor: su resultado en el diario con su nombre, sus valores y cambios aplicados, una pausa si su entrada lo dice (_Explorar la ruina_ de las Marcas Grises, `roll: generator.ruin-delve`; _Explorar_ de Core, `roll: generator.prompt`). El **Tirar una comprobación o una tabla** de la tarjeta ofrece las dos cosas;
- `travel.advance: 1`: avanza por la ruta tantos hexes o tramos de golpe, sin que pase el tiempo: progreso por movimientos, mira _Viajes por movimientos_ en [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje);
- `travel.mode: modes.boat`: viajar de otra forma desde ahora, si se puede elegir ahora (la ruta se vuelve a planear para ella);
- `say: Los porteadores cantan`: una línea propia del sistema en el diario (`{{party.stats.morale}}` en ella lee ese valor en ese momento);
- `pause: true`: el viaje espera ahí hasta que el jugador pulse **Continuar** (`pause: El puente está caído`: diciendo por qué), y luego sigue el resto;
- `ask: params.how`: el viaje espera a que el jugador elija una opción de un **Parámetro** de la acción (`how`), un botón por opción; los pasos siguientes leen la respuesta (**solo si** `params.how: swim`), y el botón de la acción no ofrece ese parámetro;
- `wait: { today.ferry: true }, limit: '18:00'`: pasa el tiempo hasta que se cumpla la condición, como mucho hasta el límite (minutos, una hora o una parte del día).

Un paso también puede tener un `id` (`id: song, say: …`): sus traducciones lo encuentran por él. Todos los pasos, con ejemplos y un sistema entero que los usa: [Acciones y pasos](../technical/10-actions-and-steps.md).

Un paso puede tener su propia condición: la acampada de las Marcas Grises duerme hasta la mañana y, **salvo si** `trip.below: food` (la comida se acabó al final del día), quita 1 de fatiga.

## Paso a paso: una caravana por el desierto de sal

Un sistema para cruzar un desierto en camello: los camellos van más rápido que a pie pero beben, los odres aguantan tres días, un salar del camino se inunda en primavera y un oasis rellena los odres. Parte de un sistema nuevo: empieza como copia de las Reglas genéricas (el día del dibujo de arriba, las formas **A pie** y **A caballo**, la comida que se come cada noche).

1. **Créalo**: escribe _Ruta de la Sal_ bajo la lista de sistemas y pulsa **+**.
2. **Camellos**: en **Formas de viajar**, añade `camel`, con el nombre _En camello_ y **km por día** `40`. En 8 horas de marcha son 5 km por hora en terreno fácil.
3. **El terreno**: en **Terrenos**, pon `desert` a **Velocidad ×** `0.5` (la arena es lenta: un hex de 10 km le lleva a un camello 4 horas). Añade `salt-flat`, **Velocidad ×** `1`, **Transitable** marcado y **Cerrado cuando** `time.season: spring`: las lluvias de primavera lo inundan. Deja **Caminos y ríos** como están: un `road` a `1.5` sustituye al `0.5` del desierto allí donde el grupo sigue uno.
4. **Agua**: en **Provisiones**, añade `water`, con el nombre _Agua_, **Mín** `0` y **Máx** `3`: tres días en los odres, nunca más.
5. **Sedientos**: en **Valores del día**, añade `parched`, con el nombre _Sedientos_ y **Bloquea** `modes.camel`: los camellos con sed no llevan a nadie.
6. **Beber**: en **Acciones**, **Añadir una acción** `drink`, con el nombre _Beber_ y **Automática en** `time.part.morning`. Sus pasos: **Cambiar valores** con la fila `party.resources.water` · `-1`; luego un segundo paso, **Dar un valor del día** `parched: true`, con **Solo si** `trip.below` · **es** · `water` (solo si los odres ya estaban vacíos).
7. **El oasis**: **Añadir una acción** `fill`, con el nombre _Llenar los odres_ y **Solo si** `hex.terrain` · **es** · `oasis`. Sus pasos: **Pasar el tiempo** `60` y luego **Cambiar valores** `party.resources.water` · `3`.
8. **Pruébalo**: en **Pruébalo**, haz un camino de diez hexes: `desert` de punta a punta, salvo `salt-flat` en el hex 6 y `oasis` en el hex 10, con un `road` del hex 2 al hex 3. Empieza un viaje en verano, elige **En camello** y marcha día tras día; luego empieza uno en primavera.

**Lo que verás.** El viaje empieza con 3 de agua (su **Máx**: 6 serían demasiados) y, al empezar la primera mañana, el diario dice _Beber (Agua −1)_. En camello el grupo entra en el hex 2 a las 10:00 (4 horas de arena), en el hex 3 a las 11:20 (el camino), y la marcha se detiene a las 14:00, gastadas sus 8 horas, a dos tercios del hex 4. Al día siguiente sigue desde ahí: el hex 4 a las 07:20, el 5 a las 11:20, el salar a las 13:20. La cuarta mañana los odres están vacíos: _Agua no puede bajar de 0_, y se cumple _Sedientos_: **Marchar** se detiene en el acto (_Sedientos: «En camello» no puede seguir mientras dure; elige otra forma de viajar_), y no se puede elegir **En camello**, diciendo por qué. Elige **A pie** y sigue marchando: más despacio (5 h 20 min por hex de arena), pero el grupo llega al oasis a las 13:20. Allí **Llenar los odres** lleva una hora y los deja en 3; si lo pulsas otra vez, el diario dice _Agua no puede subir de 3_. En primavera no hay forma de pasar el salar inundado: al poner el destino dice _No hay ruta hasta allí_, y **Marchar** no va a ninguna parte. (Las horas son las de un día de buen tiempo: la comprobación de clima que conserva la copia se tira cada mañana, y la lluvia, una tormenta o la nieve frenan la marcha.)

## Lo mismo en YAML

Lo que los pasos añaden a las Reglas genéricas, como lo muestra la pestaña **YAML** (un extracto: el resto de las reglas sigue como estaba):

```yaml
modes:
  camel: { name: En camello, kmPerDay: 40 } # paso 2
terrains:
  desert: { multiplier: 0.5 } # paso 3
  salt-flat: { multiplier: 1, passable: { unless: { time.season: spring } } }
resources:
  water: { name: Agua, min: 0, max: 3 } # paso 4
values:
  parched: { name: Sedientos, blocks: [modes.camel] } # paso 5
actions:
  drink: # paso 6
    name: Beber
    on: time.part.morning
    do:
      - { effects: { party.resources.water: -1 } }
      - { when: { trip.below: water }, set: { parched: true } }
  fill: # paso 7
    name: Llenar los odres
    when: { hex.terrain: oasis }
    do:
      - { time: 60 }
      - { effects: { party.resources.water: 3 } }
# … el día, los terrenos, los caminos, la comida, marchar, acampar, descansar, comer y explorar de las Reglas genéricas
```

Las Marcas Grises juegan con todo esto y más (una barca solo por el agua, un carro solo por caminos, picos abiertos solo en verano, nieve profunda que deja atrás a los caballos, una marcha nocturna): su [página](../packs/02-grey-marches.md) dice dónde.

## Errores habituales

- **El grupo nunca se mueve.** Ninguna acción tiene un paso **Moverse**, o el **Solo si** de la marcha nunca se cumple (una condición de hora a la que el día del calendario nunca llega, un valor que lee y nada pone). Su botón dice qué parte no se cumple.
- **Más horas de marcha no dan un día más largo.** **Horas de marcha al día** es el tiempo que llevan los **km por día** de una forma de viajar: súbelas de 8 a 10 y el grupo anda más despacio, los mismos 30 km en 10 horas. Para avanzar más, sube los **km por día** de la forma de viajar; para recorrer algún día más de lo normal, una acción con sus propias condiciones (la **Marcha forzada** de las Marcas Grises).
- **Un terreno que no frena a nadie.** El id del terreno del mapa no está en la lista (`dunes` en el mapa, `desert` en las reglas): le toca la **Velocidad × de los terrenos no listados**, o `1`.
- **Un camino que hace fáciles las montañas.** Siguiendo un camino o un río, la **Velocidad ×** de la línea sustituye a la del terreno en vez de multiplicarla. Un río a `1` que cruza montañas a `0.33` se recorre a `1`.
- **Un terreno cerrado por el que una forma de viajar pasa igualmente.** Una forma de viajar con **Solo por** va allí donde se cumple esa condición, incluso por terrenos cerrados o no **Transitables**: la barca que navega un lago que nadie puede cruzar a pie. Añade el cierre también a su **Solo por**.
- **Ninguna ruta.** Con un terreno cerrado (el salar en primavera) y sin forma de rodearlo, no hay ruta: **Marchar** no va a ninguna parte y al poner el destino dice _No hay ruta hasta allí_. En un mapa, las rutas rodean lo cerrado cuando pueden.
- **Una provisión que nunca baja.** La app nunca gasta provisiones: lo tiene que hacer una acción o una comprobación (paso 6). Y un viaje empieza con 6 de cada una (dentro de su **Mín** y su **Máx**): ponlas en el panel del viaje.
- **Un valor del día que no hace nada.** Solo hace algo mientras se cumple: lo que **Bloquea**, o una condición que lo lee. Si se pone al acabar el día (`time.day-end`), acaba en el acto: léelo al día siguiente como `yesterday.parched`, o ponlo por la mañana, como el paso 6.
- **El grupo atascado con los camellos.** Un valor que bloquea la forma de viajar que lleva el grupo lo detiene hasta que el jugador elige otra; bloquear `travel.move` en su lugar detiene todas las formas el resto del día.
- **Un trago que nunca llegó.** Una acción **automática** en un momento ocurre cuando el reloj pasa por él: un viaje que empezó después de `time.part.morning` bebe a la mañana siguiente. Y su **Solo si** decide si ocurre siquiera.

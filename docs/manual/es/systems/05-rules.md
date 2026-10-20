# Reglas

La pestaña **Reglas** edita las reglas de viaje del sistema (`kind: travel-rules`): cómo va un día, a qué velocidad se mueve el grupo y por dónde, qué lleva y qué puede hacer. La ayuda junto a cada parte la explica, con ejemplos. El texto gris en una casilla vacía es solo el valor por defecto o una pista, no un valor. Todo, con el YAML: [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).

## El día

No hay un día ni una marcha integrados: el grupo se mueve con las acciones que tienen un paso `travel.move` (la **march**, abajo), de día, unas horas, con antorchas…, según el sistema.

- **Los viajes empiezan**: cuándo empieza un viaje nuevo en su primer día, una hora (`06:00`) o una parte del día del calendario (`time.part.morning`, sugerida: cuando empieza). Vacío: a medianoche.
- **Horas de marcha al día**: las horas en que una forma de viajar hace sus km al día, la escala de su velocidad. Cuánto puede marchar el grupo cada día lo dice la marcha (`trip.marched: { lt: '{{system.hoursPerDay}}' }` lee este número). El tiempo de las acciones (descansar, buscar comida) no cuenta como marcha.
- **km por hex**: la escala a la que se juega el sistema. Los viajes sin mapa (Travel, **Pruébalo**) la usan; un mapa con este sistema la toma, salvo que el mapa fije su propia escala.
- **Sigue por sí solo con** y **Con**: la acción que hace el viaje cuando sigue por sí solo (el reloj del mundo avanzando con un viaje en marcha, una orden de viajar), con sus parámetros: `march`, con `until: destination`, sigue marchando hasta el destino día tras día. La hace siempre que puede, y espera (con la parada) mientras no puede. Nada: el viaje solo espera.
- **Parada desde** y **Acción de la parada**: lo que hace el grupo cuando no puede marchar mientras el tiempo avanza solo (el reloj del mundo, **Esperar para seguir**, una orden de viajar mientras no se puede hacer su forma de seguir): desde ese momento (una hora, `20:00`, o una parte, `time.part.night`) hasta que acaba el día, un grupo que no está marchando hace la acción, una vez al día; acampar, por ejemplo. Si no se cumplen sus condiciones, el diario dice por qué y el tiempo pasa sin ella. Sin acción: el grupo simplemente espera.

## Formas de viajar

Cada una con su **Nombre** y su **Descripción (su ayuda)** para los jugadores (el panel del viaje enseña la de la elegida como ayuda de **Viaje**), sus **km por día** y:

- **Solo por**: por dónde puede ir, una condición sobre cada hex en el que entra. P. ej. la barca de las Marcas Grises por agua o costa, `any: [{ water: true }, { terrain: coast }]`, o un carro solo por camino, `edges: road`.
- **Solo si**: dónde y cuándo se puede elegir. P. ej. la barca de las Marcas Grises solo a la orilla o en el transbordador, `any: [{ water: true }, { terrain: coast }, { tags: ferry }]`.
- **Salvo si**: cuándo no.

## Terrenos, agua y caminos

- **Terrenos**: cómo cambia la velocidad cada uno (**Velocidad ×**) y si se puede entrar (**Transitable**, y **Abierto cuando** / **Cerrado cuando**: condiciones sobre el hex al que se entra y el momento). P. ej. los picos de las Marcas Grises, abiertos solo en verano y cerrados con nieve o tormenta: `time.season: summer` / `trip.weather: [snow, storm]`. **Velocidad × de los terrenos no listados** cubre cualquier terreno del mapa que no esté en la lista.
- **Hexes de agua**: lo mismo, para los hexes que el mapa marca como agua y no tienen regla propia en Terrenos. Una forma de viajar cuyo **Solo por** se cumple en el agua puede navegarlos igualmente.
- **Caminos y ríos**: al seguir uno de un hex al siguiente, su **Velocidad ×** sustituye a la del terreno (un camino a `1.5`: un 50 % más rápido). Las líneas no listadas no hacen nada; las condiciones pueden distinguirlas igualmente (`edges: road`).

## Provisiones

Lo que lleva el grupo, cada una con su **Nombre**, su **Descripción (su ayuda)**, su **Mín** y su **Máx**. Las provisiones las gastan las acciones, comprobaciones y tablas del propio sistema, nunca la app: las Marcas Grises comen con una acción que el sistema hace al final de cada día (1 de comida, y 1 de forraje a caballo).

**Mín** y **Máx** acotan una provisión: un cambio que pasaría de uno se queda en él, el diario lo dice y las reglas del sistema pueden reaccionar (las Marcas Grises: una comprobación de fin de día, fatiga +1, cuando la comida llegó a su mínimo).

Su columna **Usado en** lista las acciones, comprobaciones y tablas que leen, gastan o suman a cada una ([Usado en](04-overview.md#usado-en)).

## Clima

Cuánto frena al grupo cada clima (**Velocidad ×**; `0`: ese día no se viaja). El clima no listado no cambia la velocidad; las condiciones pueden leerlo igualmente (`trip.weather: storm`). De dónde sale el clima del día lo decide una comprobación: una tabla, o un [modelo de clima](11-weather.md).

## Valores del día

Valores que las tablas pueden poner para el resto del día, cada uno con un nombre y lo que **Bloquea** mientras se cumple: viajar, una de las acciones del sistema o una forma de viajar como `modes.<id>` (la caja sugiere lo que declara el sistema: `modes.horse` deja los caballos atrás mientras se cumple).

Las Marcas Grises declaran **Perdidos**, que bloquea el viaje: lo pone la tabla de perderse, y las acciones que mueven al grupo (su marcha) se quedan desactivadas hasta el día siguiente, diciendo por qué.

**Usado en** lista quién fija cada valor y quién lo lee, ese día o el siguiente como `yesterday.<id>` ([Usado en](04-overview.md#usado-en)).

## Acciones

Lo que puede hacer el grupo: solo lo que declara el sistema (acampar, descansar, **marchar** y las suyas), todas iguales, como fichas (**Añadir una acción**; × quita una). Cada una tiene:

- un **id**, y un **Nombre** y una descripción para los jugadores;
- **Solo si** / **Salvo si**: cuándo se puede pulsar su botón. P. ej. Buscar comida de las Marcas Grises, no con tormenta; `time.hour: { gte: 6, lt: 20 }` para solo de día;
- **Una vez al día**;
- **Oculta si no se puede hacer**: si no, su botón sigue, desactivado, diciendo por qué. P. ej. el rito de las Marcas Grises, solo en un santuario con luna llena;
- **Automática en**: vacío, la hace el jugador con un botón; o los momentos en que la hace el propio sistema, escritos como en el YAML con sugerencias: una hora (`06:00`: al dar esa hora), una parte del día del calendario (`time.meal.elevenses`: al empezar), `trip.hex-enter`, `time.day-end` u otra acción, varios separados por comas (Comer de las Marcas Grises, `time.day-end`). El `time` de un paso también puede llegar hasta una parte (`time: time.meal.luncheon`). Las palabras bajo la caja lo repiten. Las acciones que la siguen y sus comprobaciones (en [Comprobaciones](06-checks.md), en esta acción) van primero;
- **Parámetros**: lo que elige el jugador junto a su botón, cada uno con sus opciones (la primera es la de por defecto): `until: { choices: [destination, hex, 3] }`; sus pasos y condiciones leen la elegida como `{{params.until}}`. Un paso `do:` los da con `with:`, y también **Sigue por sí solo con**;
- **Cuando no se aplica nada**: lo que dice el diario cuando no se aplica ninguna de sus comprobaciones;
- **Qué hace**, paso a paso (las flechas suben o bajan un paso).

**Marchar** es una acción como las demás: su paso `travel.move: '{{params.until}}'` mueve al grupo por la ruta, comprobando su **Solo si** / **Salvo si** por el camino, y se detiene en cuanto dejan de cumplirse (vacíos: siempre que nada más lo impida, de día y de noche). Su botón ofrece las opciones de su parámetro (hasta el destino, un hex…). Un sistema puede llamarla como quiera (`sail`, `ride`), tener varias o ninguna: entonces el grupo nunca se mueve por su ruta.

### Pasos

Cada paso se escribe como en el YAML, con sugerencias:

- `time: 180`: pasan tres horas (o hasta una hora, `06:00`, o una parte del día, `time.part.morning`);
- `travel.move: destination`: moverse por la ruta mientras pasa el tiempo y se cumplen las condiciones de la acción, hasta el destino (`hex`: el siguiente; `3`: tres hexes; `'{{params.until}}'`: lo que diga su parámetro); una comprobación que te necesita lo detiene por el camino, y **Seguir** sigue con él;
- `travel.speed: 0.5`: el resto del movimiento de hoy va a media velocidad;
- `effects: { party.stats.fatigue: -1 }`: cambia las características, provisiones o personajes del grupo;
- `set: { lost: true }`: pone un valor del día;
- `do: actions.forage`: otra acción, si se cumplen sus condiciones; `do: actions.march, with: { until: hex }`: con sus parámetros;
- `roll: checks.<comprobación>`: una comprobación, ya;
- `travel.advance: 1`: avanza por la ruta tantos hexes o tramos de golpe, sin que pase el tiempo: progreso por movimientos, mira _Viajes por movimientos_ en [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje);
- `travel.mode: modes.boat`: viajar de otra forma desde ahora, si se puede elegir ahora (la ruta se vuelve a planear para ella);
- `say: Los porteadores cantan`: una línea propia del sistema en el diario (`{{party.stats.morale}}` en ella lee ese valor en ese momento);
- `pause: true`: el viaje espera ahí hasta que el jugador pulse **Continuar** (`pause: El puente está caído`: diciendo por qué), y luego sigue el resto;
- `ask: params.how`: el viaje espera a que el jugador elija una opción de un **Parámetro** de la acción (`how`), un botón por opción; los pasos siguientes leen la respuesta (**solo si** `params.how: swim`), y el botón de la acción no ofrece ese parámetro;
- `wait: { today.ferry: true }, limit: '18:00'`: pasa el tiempo hasta que se cumpla la condición, como mucho hasta el límite (minutos, una hora o una parte del día).

Un paso también puede tener un `id` (`id: song, say: …`): sus traducciones lo encuentran por él. Todos los pasos, con ejemplos y un sistema entero que los usa: [Acciones y pasos](../technical/10-actions-and-steps.md).

Un paso puede tener su propia condición: la acampada de las Marcas Grises duerme hasta la mañana y, **salvo si** `below: food` (la comida se acabó al final del día), quita 1 de fatiga.

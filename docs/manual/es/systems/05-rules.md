# Reglas

La pestaña **Reglas** edita las reglas de viaje del sistema (`kind: travel-rules`): cómo va un día, a qué velocidad se mueve el grupo y por dónde, qué lleva y qué puede hacer. La ayuda junto a cada parte la explica, con ejemplos. El texto gris en una casilla vacía es solo el valor por defecto o una pista, no un valor. Todo, con el YAML: [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).

## El día

No hay un día integrado: cuándo puede marchar el grupo lo dice la acción **march** (abajo), de día, unas horas, con antorchas…, según el sistema.

- **Los viajes empiezan**: cuándo empieza un viaje nuevo en su primer día, una hora (`06:00`) o una parte del día del calendario (`part.morning`, sugerida: cuando empieza). Vacío: a medianoche.
- **Horas de marcha al día**: las horas en que una forma de viajar hace sus km al día, la escala de su velocidad. Cuánto puede marchar el grupo cada día lo dice la marcha (`trip.marched: { lt: '{{system.hoursPerDay}}' }` lee este número). El tiempo de las acciones (descansar, buscar comida) no cuenta como marcha.
- **km por hex**: la escala a la que se juega el sistema. Los viajes sin mapa (Travel, **Pruébalo**) la usan; un mapa con este sistema la toma, salvo que el mapa fije su propia escala.
- **Parada desde** y **Acción de la parada**: lo que hace el grupo cuando no puede marchar mientras el tiempo avanza solo (el reloj del mundo, **Esperar a la próxima marcha**, una orden de viajar sin nada más que marchar): desde ese momento (una hora, `20:00`, o una parte, `part.night`) hasta que acaba el día, un grupo que no está marchando hace la acción, una vez al día; acampar, por ejemplo. Si no se cumplen sus condiciones, el diario dice por qué y el tiempo pasa sin ella. Sin acción: el grupo simplemente espera.
- **Día antiguo (formato de pack 2)**: solo para packs escritos para el formato de pack 2 o anteriores, su **Alba**, **Anochecer** y **Al anochecer, esperando**, que se siguen leyendo como eran (mira [Formatos de fichero](../technical/02-file-formats.md#packs)).

## Formas de viajar

Cada una con sus **km por día** y:

- **Solo por**: por dónde puede ir, una condición sobre cada hex en el que entra. P. ej. la barca de las Marcas Grises por agua o costa, `any: [{ water: true }, { terrain: coast }]`, o un carro solo por camino, `edges: road`.
- **Solo si**: dónde y cuándo se puede elegir. P. ej. la barca de las Marcas Grises solo a la orilla o en el transbordador, `any: [{ water: true }, { terrain: coast }, { tags: ferry }]`.
- **Salvo si**: cuándo no.

## Terrenos, agua y caminos

- **Terrenos**: cómo cambia la velocidad cada uno (**Velocidad ×**) y si se puede entrar (**Transitable**, y **Abierto cuando** / **Cerrado cuando**: condiciones sobre el hex al que se entra y el momento). P. ej. los picos de las Marcas Grises, abiertos solo en verano y cerrados con nieve o tormenta: `season: summer` / `weather: [snow, storm]`. **Velocidad × de los terrenos no listados** cubre cualquier terreno del mapa que no esté en la lista.
- **Hexes de agua**: lo mismo, para los hexes que el mapa marca como agua y no tienen regla propia en Terrenos. Una forma de viajar cuyo **Solo por** se cumple en el agua puede navegarlos igualmente.
- **Caminos y ríos**: al seguir uno de un hex al siguiente, su **Velocidad ×** sustituye a la del terreno (un camino a `1.5`: un 50 % más rápido). Las líneas no listadas no hacen nada; las condiciones pueden distinguirlas igualmente (`edges: road`).

## Provisiones

Lo que lleva el grupo, cada una con su **Mín** y **Máx**. Las provisiones las gastan las acciones, comprobaciones y tablas del propio sistema, nunca la app: las Marcas Grises comen con una acción que el sistema hace al final de cada día (1 de comida, y 1 de forraje a caballo).

**Mín** y **Máx** acotan una provisión: un cambio que pasaría de uno se queda en él, el diario lo dice y las reglas del sistema pueden reaccionar (las Marcas Grises: una comprobación de fin de día, fatiga +1, cuando la comida llegó a su mínimo). Los sistemas antiguos que gastaban provisiones **al día** muestran un aviso con **Convertir**, que escribe lo mismo como una acción así.

## Clima

Cuánto frena al grupo cada clima (**Velocidad ×**; `0`: ese día no se viaja). El clima no listado no cambia la velocidad; las condiciones pueden leerlo igualmente (`weather: storm`). De dónde sale el clima del día lo decide una comprobación: una tabla, o un [modelo de clima](11-weather.md).

## Valores del día

Valores que las tablas pueden poner para el resto del día, cada uno con un nombre y lo que **Bloquea** mientras se cumple: viajar, una de las acciones del sistema o una forma de viajar como `mode.<id>` (la caja sugiere lo que declara el sistema: `mode.horse` deja los caballos atrás mientras se cumple).

Las Marcas Grises declaran **Perdidos**, que bloquea el viaje: lo pone la tabla de perderse, y los botones de Viajar se quedan desactivados hasta el día siguiente, diciendo por qué.

## Acciones

Lo que puede hacer el grupo: solo lo que declara el sistema (acampar, descansar, **marchar** y las suyas), todas iguales, como fichas (**Añadir una acción**; × quita una). Cada una tiene:

- un **id**, y un **Nombre** y una descripción para los jugadores;
- **Solo si** / **Salvo si**: cuándo se puede pulsar su botón. P. ej. Buscar comida de las Marcas Grises, no con tormenta; `time.hour: { gte: 6, lt: 20 }` para solo de día;
- **Una vez al día**;
- **Oculta si no se puede hacer**: si no, su botón sigue, desactivado, diciendo por qué. P. ej. el rito de las Marcas Grises, solo en un santuario con luna llena;
- **Automática en**: vacío, la hace el jugador con un botón; o los momentos en que la hace el propio sistema, escritos como en el YAML con sugerencias: una hora (`06:00`: al dar esa hora), una parte del día del calendario (`meal.elevenses`: al empezar), `hex-enter`, `day-end` u otra acción, varios separados por comas (Comer de las Marcas Grises, `day-end`). El `time` de un paso también puede llegar hasta una parte (`time: meal.luncheon`). Las palabras bajo la caja lo repiten. Las acciones que la siguen y sus comprobaciones (en [Comprobaciones](06-checks.md), en esta acción) van primero;
- **Cuando no se aplica nada**: lo que dice el diario cuando no se aplica ninguna de sus comprobaciones;
- **Qué hace**, paso a paso (las flechas suben o bajan un paso).

**Marchar** son los botones de Viajar, no un botón propio: solo tiene **Solo si** / **Salvo si**, comprobados mientras el grupo marcha, que se detiene en cuanto dejan de cumplirse. Vacío, el grupo marcha siempre que nada más lo impida, de día y de noche (packs antiguos: de día, durante las horas de marcha del día). Su nombre y su descripción son los del primer botón de Viajar.

### Pasos

Cada paso se escribe como en el YAML, con sugerencias:

- `time: 180`: pasan tres horas (o hasta una hora, `06:00`, o una parte del día, `part.morning`);
- `speed: 0.5`: el resto de la marcha de hoy va a media velocidad;
- `effects: { party.stats.fatigue: -1 }`: cambia las características, provisiones o personajes del grupo;
- `set: { lost: true }`: pone un valor del día;
- `do: forage`: otra acción, si se cumplen sus condiciones;
- `roll: <comprobación>`: una comprobación, ya;
- `advance: 1`: avanza por la ruta tantos hexes o tramos de golpe, sin que pase el tiempo: progreso por movimientos, mira _Viajes por movimientos_ en [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).

Un paso puede tener su propia condición: la acampada de las Marcas Grises duerme hasta la mañana y, **salvo si** `below: food` (la comida se acabó al final del día), quita 1 de fatiga.

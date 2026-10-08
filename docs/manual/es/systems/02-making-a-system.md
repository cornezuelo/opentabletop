# Crear un sistema

Un sistema de viaje son dos definiciones en un pack, normalmente en un mismo fichero: **reglas de viaje** (`kind: travel-rules`) y **bindings** (`kind: bindings`); su pack puede traer además un calendario (`kind: calendar`), modelos de clima (`kind: weather`) y modos de tirada (`kind: roll-modes`). Una definición de **sistema** (`kind: system`, en `system.yaml`) nombra cuáles usa y de qué packs trae tablas; un pack puede declarar varios sistemas: ver [Sistemas](../technical/07-kinds.md#sistemas). Todos los tipos están en [Tipos de definición](../technical/07-kinds.md). [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) explica cada parte de ambas, paso a paso y con ejemplos.

## Un sistema nuevo

Escribe un nombre en la casilla de abajo de la lista de sistemas y pulsa **+**. Crea un pack tuyo con las reglas Genéricas de partida y unos bindings vacíos (en `travel.yaml`) y el sistema que los nombra (en `system.yaml`), y abre su pestaña **YAML**. El sistema se puede jugar al momento en la aplicación Travel y en el Hexmapper (en el mismo navegador): **Jugarlo en Travel →**, bajo su nombre, abre su viaje en Travel.

## Tu primer sistema, paso a paso

Un sistema pequeño para un juego en el que el grupo lleva antorchas, se puede perder en el bosque y tiene que descansar cuando está cansado. Cada paso se hace en los formularios (o lo mismo en YAML), y **Jugar** de la aplicación Travel lo prueba al momento (tenla abierta en otra pestaña: tus cambios le llegan al momento).

1. **Créalo**: escribe _Bosques Oscuros_ bajo la lista de sistemas y pulsa **+**. Empieza con las reglas Genéricas: 30 km al día a pie y 1 de comida al acabar cada día.
2. **Una provisión**: en **Reglas → Provisiones**, añade `torches` con **Mín** `0`. El panel del viaje muestra ahora las antorchas, y el jugador puede cambiarlas a mano.
3. **Gastarla**: abre la acción **eat** (la hace el propio sistema en `day-end`) y añade un paso `effects: { party.resources.torches: -1 }`. Cada día quema también una antorcha.
4. **Perderse**: en **Valores del día**, añade `lost` y, en **Bloquea**, `travel`. Una tabla que ponga `lost: true` detendrá al grupo el resto del día.
5. **Una comprobación**: en **Comprobaciones**, **Añadir una comprobación**: evento `LOST_CHECK`, **Cuándo** `day-start`, **Solo si** `terrain: forest`. En **Se tira en**, elige una tabla tuya cuyo mal resultado tenga **Fija** `lost: true` (hazla en la aplicación Oracle: _1d6_, del 1 al 2 fija `lost: true`).
6. **La fatiga**: en **Comprobaciones → Características del grupo**, añade `fatigue`, que empieza en `0` (su mínimo, `min: 0`, se escribe en YAML). Luego una comprobación **Cuándo** `day-end`, **Solo si** `below: torches`, **Cambios** `party.stats.fatigue: 1`: un día sin antorchas cansa al grupo.
7. **Descansar solo si hay cansancio**: abre **rest**: **Solo si** `party.stats.fatigue: { gte: 1 }`; pasos `time: 120` y `effects: { party.stats.fatigue: -1 }`. El botón queda desactivado mientras el grupo está fresco, y dice por qué.
8. **Pruébalo**: **Jugarlo en Travel →** y un camino de tres hexes, el del medio `forest`; viaja y lee el diario: la comprobación de perderse al alba en el bosque, las antorchas bajando cada noche, el botón de descansar activándose al cansarse.

El mismo sistema en YAML (la pestaña **YAML** lo muestra así):

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 }, forest: { multiplier: 0.5 } }
modes: { foot: { kmPerDay: 30 } }
resources:
  food: { min: 0 }
  torches: { min: 0 } # paso 2
values:
  lost: { blocks: [travel] } # paso 4
actions:
  camp: { do: [{ time: dawn }] }
  rest: # paso 7
    when: { party.stats.fatigue: { gte: 1 } }
    do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }]
  eat:
    on: day-end
    do:
      - { effects: { party.resources.food: -1 } }
      - { effects: { party.resources.torches: -1 } } # paso 3
checks:
  - { event: LOST_CHECK, at: day-start, when: { terrain: forest } } # paso 5
  - {
      event: NO_TORCHES,
      at: day-end,
      when: { below: torches },
      effects: { party.stats.fatigue: 1 },
    } # paso 6
---
kind: bindings
id: default
stats:
  fatigue: { name: Fatigue, default: 0, min: 0 } # paso 6
on:
  LOST_CHECK: { resolve: dark-lost }
---
kind: table # paso 5, hecha en la aplicación Oracle
id: dark-lost
roll: 1d6
entries:
  - { range: 1-2, result: Perdidos entre los árboles, set: { lost: true } }
  - { range: 3-6, result: El sendero sigue }
```

Las Marcas Grises hacen todo esto y mucho más; su [página](../packs/02-grey-marches.md) dice dónde está cada parte.

## Cambiarlo con formularios

- **Reglas**: el día (alba, anochecer, horas de marcha, y **Al anochecer, esperando**: la acción que hace el grupo cuando cae la noche mientras avanza el reloj del mundo, acampar por defecto; si no se cumplen sus condiciones, la noche pasa sin ella), las formas de viajar (km por día, **Solo por**: por dónde puede ir, una condición sobre cada hex en el que entra, p. ej. la barca de las Marcas Grises por agua o costa, `any: [{ water: true }, { terrain: coast }]`, o un carro solo por camino, `edges: road`; y **Solo si**: dónde y cuándo se puede elegir, p. ej. la barca de las Marcas Grises solo a la orilla o en el transbordador, `any: [{ water: true }, { terrain: coast }, { tags: ferry }]`; **Salvo si**: cuándo no), cómo cambia la velocidad cada terreno y cada camino o río y si se puede entrar en un terreno (**Transitable**, y **Abierto cuando** / **Cerrado cuando**; **Velocidad × de los terrenos no listados** cubre cualquier terreno del mapa que no esté en la lista: condiciones sobre el hex al que se entra y el momento, p. ej. los picos de las Marcas Grises, abiertos solo en verano y cerrados con nieve o tormenta, `season: summer` / `weather: [snow, storm]`; los hexes de agua tienen lo mismo), las provisiones (con su **Mín** y **Máx**), cuánto frena cada clima, los **valores del día** y las **acciones**. La ayuda junto a cada parte la explica. Las provisiones las gastan las acciones, comprobaciones y tablas del propio sistema, nunca la app: las Marcas Grises comen con una acción que el sistema hace al final de cada día (1 de comida, y 1 de forraje a caballo). **Mín** y **Máx** acotan una provisión: un cambio que pasaría de uno se queda en él, el diario lo dice y las reglas del sistema pueden reaccionar (las Marcas Grises: una comprobación de fin de día, fatiga +1, cuando la comida llegó a su mínimo). Los sistemas antiguos que gastaban provisiones **al día** muestran un aviso con **Convertir**, que escribe lo mismo como una acción así. El texto gris en una casilla vacía es solo el valor por defecto o una pista, no un valor.
  - **Valores del día**: valores que las tablas pueden poner para el resto del día, cada uno con un nombre y lo que **bloquea** mientras se cumple (viajar, una de las acciones del sistema o una forma de viajar como `mode.<id>`; la caja sugiere lo que declara el sistema: `mode.horse` deja los caballos atrás mientras se cumple). Las Marcas Grises declaran **Perdidos**, que bloquea el viaje: lo pone la tabla de perderse, y los botones de Viajar se quedan desactivados hasta el día siguiente, diciendo por qué.
  - **Acciones**: todas iguales, acampar y descansar también (**Añadir una acción**; × quita una; las flechas suben o bajan un paso), como fichas: un id, un nombre y una descripción para los jugadores, **Solo si** / **Salvo si** (cuándo se puede pulsar el botón: p. ej. Buscar comida de las Marcas Grises, no con tormenta), **Una vez al día**, **Sola en** (vacío: la hace el jugador, con un botón; o los momentos en que la hace el propio sistema, escritos como en el YAML con sugerencias: `day-start`, `hex-enter`, `day-end` u otra acción, varios separados por comas, p. ej. Comer de las Marcas Grises, `day-end`; las palabras bajo la caja lo repiten), lo que dice el diario cuando no se aplica ninguna de sus comprobaciones, y **Qué hace**, paso a paso, cada uno escrito como en el YAML con sugerencias: `time: 180` (o `dawn`, `nightfall`, `14:00`), `speed: 0.5`, `effects: { party.stats.fatigue: -1 }`, `set: { lost: true }`, `do: forage` (otra acción, si se cumplen sus condiciones) y `roll: <comprobación>` (una comprobación, ya). Un paso puede tener su propia condición: la acampada de las Marcas Grises duerme hasta el alba y, **salvo si** `below: food` (la comida se acabó al final del día), quita 1 de fatiga. Las acciones que la siguen y sus comprobaciones (en Comprobaciones, en esta acción) van primero. Todo, con el YAML: [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).
- **Comprobaciones**: cada comprobación con su **nombre** y **descripción** para los jugadores (se ven en el panel del viaje y el diario en lugar del id del evento), cuándo ocurre (**Cuándo**, escrito como en el YAML con sugerencias: `day-start`, `hex-enter`, `day-end`, una acción del sistema como `camp`, o varios separados por comas, p. ej. los encuentros de las Marcas Grises, `hex-enter, rest`; vacío: solo cuando la tira un paso), sus condiciones (**Solo si** / **Salvo si**, p. ej. perderse en las Marcas Grises, que se salta por caminos y ríos: `edges: [road, river]`), lo que la resuelve (cualquier tabla, oráculo, generador o mazo, agrupados por tipo, o un modelo de clima, en _Clima con inercia_; p. ej. el vado de las Marcas Grises se tira en un oráculo), **Contexto extra** (valores que su tabla ve solo en esta comprobación, p. ej. `timeOfDay: night` para tirar un encuentro nocturno en la tabla del día, o `danger: 3` como si el hexágono fuera más peligroso), **Cambios** (sus propios efectos, p. ej. Sin comida suficiente de las Marcas Grises: `party.stats.fatigue: 1`) y **Pausar después**. Debajo, las **Características del grupo**: cada una con un id, un **Nombre** y una **Descripción** para los jugadores y su valor inicial (**Empieza en**; **Añadir una característica**; su `min` / `max` se escriben en el YAML). El panel del viaje las muestra y deja que el jugador las cambie; las tablas las leen en tiradas (`1d6 + {{survival}}`) y condiciones (`party.stats.morale: { lte: 1 }`), y los efectos las cambian (`party.stats.fatigue: 1`). Si los bindings aún nombran tablas para comprobaciones que las reglas ya no tienen (una comprobación quitada en el YAML), una nota las lista y **Quitarlas** las borra. Esta pestaña escribe a la vez las reglas de viaje y los bindings, así que no tienes que mantenerlos a la par: si renombras una comprobación, su tabla va con ella.

Las condiciones y el contexto se escriben en pares `clave: valor`, como en las tablas: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }` (todos los operadores: [Condiciones](../technical/08-conditions.md); toda la sintaxis de un vistazo: [Sintaxis](../technical/09-syntax.md)). Elegir **nada: espérame** como tabla hace que el viaje se detenga y espere a **Continuar**; **Pausar después** la tira y también espera (mira [qué hace aparecer Continuar](../travel/02-playing.md#el-viaje)).

Los formularios cambian el fichero YAML conservando tus comentarios y el orden; la pestaña **YAML** muestra el resultado y marca cualquier problema en su línea. Lo que los formularios no cubren se puede escribir allí.

Las tablas que nombren sus bindings van en el mismo pack: añádelas en la aplicación Oracle (tu pack nuevo también sale allí), o usa tablas de otros packs con su id completo (`core/weather`).

## Cambiar un sistema incluido

Los sistemas incluidos son de solo lectura. Bajo el nombre del sistema (en todas sus pestañas), **Editar una copia** hace una copia de todo el pack que puedes cambiar; sustituye al incluido en este navegador. Las copias de packs de uso personal siguen siendo de uso personal. En tu copia editada, en el mismo sitio aparece **Volver a la versión incluida**, que descarta tus cambios y recupera el sistema incluido (pregunta antes; ↶ lo deshace). Cuando una versión nueva cambia el sistema incluido, tu copia lo avisa en el mismo sitio y te deja coger o conservar cada cambio: mira [Actualizaciones de los packs incluidos](../oracle/03-packs.md).

**↶ ↷** en la cabecera (o <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> fuera de las cajas de texto) deshacen y rehacen cambios en tus sistemas, mientras la página está abierta.

## Probarlo

La pestaña **Jugar** de la aplicación Travel (**Jugarlo en Travel →** en la página del sistema) es la forma más rápida de comprobar un sistema: monta un camino corto con los terrenos, caminos y etiquetas que importan a tus reglas, y mira el diario. Por ejemplo, para probar una comprobación con `when: { tags: landmark }`, pon la etiqueta `landmark` al último hex y viaja.

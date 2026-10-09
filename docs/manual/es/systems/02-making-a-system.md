# Crear un sistema

Un sistema de viaje son dos definiciones en un pack, normalmente en un mismo fichero: **reglas de viaje** (`kind: travel-rules`) y **bindings** (`kind: bindings`); su pack puede traer además un calendario (`kind: calendar`), modelos de clima (`kind: weather`) y modos de tirada (`kind: roll-modes`). Una definición de **sistema** (`kind: system`, en `system.yaml`) nombra cuáles usa y de qué packs trae tablas; un pack puede declarar varios sistemas: ver [Sistemas](../technical/07-kinds.md#sistemas). Todos los tipos están en [Tipos de definición](../technical/07-kinds.md). [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) explica cada parte de ambas, paso a paso y con ejemplos.

## Un sistema nuevo

Escribe un nombre en la casilla de abajo de la lista de sistemas y pulsa **+**. Crea un pack tuyo con las reglas Genéricas de partida y unos bindings vacíos (en `travel.yaml`) y el sistema que los nombra (en `system.yaml`), y abre su **Resumen**. El sistema se puede jugar al momento en la aplicación Travel y en el Hexmapper (en el mismo navegador): **Jugarlo en Travel →**, bajo su nombre, abre su viaje en Travel.

## Tu primer sistema, paso a paso

Un sistema pequeño para un juego en el que el grupo lleva antorchas, se puede perder en el bosque y tiene que descansar cuando está cansado. Cada paso se hace en los formularios (o lo mismo en YAML), y su pestaña **Pruébalo** lo juega al momento: tus cambios cuentan desde el siguiente paso.

1. **Créalo**: escribe _Bosques Oscuros_ bajo la lista de sistemas y pulsa **+**. Empieza con las reglas Genéricas: 30 km al día a pie y 1 de comida al acabar cada día.
2. **Una provisión**: en **Reglas → Provisiones**, añade `torches` con **Mín** `0`. El panel del viaje muestra ahora las antorchas, y el jugador puede cambiarlas a mano.
3. **Gastarla**: abre la acción **eat** (la hace el propio sistema en `day-end`) y añade un paso `effects: { party.resources.torches: -1 }`. Cada día quema también una antorcha.
4. **Perderse**: en **Valores del día**, añade `lost` y, en **Bloquea**, `travel`. Una tabla que ponga `lost: true` detendrá al grupo el resto del día.
5. **Una comprobación**: en **Comprobaciones**, **Añadir una comprobación**: evento `LOST_CHECK`, **Cuándo** `day-start`, **Solo si** `terrain: forest`. En **Se tira en**, elige una tabla tuya cuyo mal resultado tenga **Fija** `lost: true` (hazla en la aplicación Oracle: _1d6_, del 1 al 2 fija `lost: true`).
6. **La fatiga**: en **Comprobaciones → Características del grupo**, añade `fatigue`, que empieza en `0` (su mínimo, `min: 0`, se escribe en YAML). Luego una comprobación **Cuándo** `day-end`, **Solo si** `below: torches`, **Cambios** `party.stats.fatigue: 1`: un día sin antorchas cansa al grupo.
7. **Descansar solo si hay cansancio**: abre **rest**: **Solo si** `party.stats.fatigue: { gte: 1 }`; pasos `time: 120` y `effects: { party.stats.fatigue: -1 }`. El botón queda desactivado mientras el grupo está fresco, y dice por qué.
8. **Pruébalo**: abre la pestaña **Pruébalo** y monta un camino de tres hexes, el del medio `forest`; viaja y lee el diario: la comprobación de perderse al alba en el bosque, las antorchas bajando cada noche, el botón de descansar activándose al cansarse.

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

- **Resumen**: la definición propia del sistema (`kind: system`). Su **Nombre** y su **Descripción**, como los muestran todas las aplicaciones (en el idioma de la interfaz: el del pack, o su traducción). **Sus partes**: las **Reglas de viaje**, los **Bindings** y el **Calendario** con los que se juega, cada uno elegido entre los de este pack (por su id) y los de sus dependencias (`core/default`), con su nombre si lo tienen (_El cómputo real (royal-reckoning)_); **Abrir** va a la pestaña que los edita, **Crear** hace unas reglas de viaje nuevas (a partir de las Genéricas) o unos bindings vacíos y los nombra. Los **Modelos de clima** que pueden nombrar sus bindings (`weather: highland-skies`), cada uno con su nombre y su id. **Packs que trae**: el suyo siempre, y las dependencias que marques, cuyas tablas vienen con él (un mapa que se juega con él las muestra en su panel del Oracle; para traer otro pack, añádelo a las dependencias en `pack.yaml`). **Mapas de ejemplo**: mapas en los que jugar el sistema, guardados en su pack (`maps:`); **Abrir en el Hexmapper →** abre uno allí como lo haría su **Mapas → Mapas de ejemplo**, **Añadir un fichero de mapa…** copia en la carpeta `maps/` del pack un fichero de mapa escrito por **Guardar** en el Hexmapper, y **Quitar** lo saca del pack. **Llevarlo a otra parte**: lo que lleva el .zip del sistema y **Exportar como .zip** (mira [Llevarlo a otra parte](#llevarlo-a-otra-parte)). Un sistema de un pack antiguo (reglas de viaje sin `kind: system`) muestra **Declararlo** en su lugar: escribe `system.yaml` nombrando lo que usa hoy el sistema, y se juega igual.
- **Hoja**: lo que tiene cada personaje del grupo (`kind: sheet`, una por sistema; **Nueva hoja** hace una pequeña y la nombra en el sistema). Su **Nombre**; sus **Valores**, cada uno con un nombre, el valor en que **Empieza**, **Mín.** y **Máx.** (un número, u otro valor entre llaves, `'{{maxHealth}}'`: tan alto como el maxHealth del personaje), **Contador** (se muestra como casillas, tantas como su máximo) y **Grupo**; los **Grupos** bajo los que se muestran los valores, en orden, con sus nombres; sus **Estados**, cada uno con lo que **Bloquea** a todo el grupo mientras alguien lo tenga (`travel`, una de las acciones del sistema, `mode.horse`: la casilla los sugiere); y sus **Tipos de relación**, con los límites del número que lleva una (un vínculo de 0 a 3). Con una hoja, los viajes tienen una sección **Personajes** ([Jugar un viaje](../travel/02-playing.md#personajes)), y la pestaña **Comprobaciones** dice qué características del grupo salen de ellos y qué provisiones llevan. Sin ella, el grupo se juega como un todo.
- **Facciones**: los poderes de su mundo (`kind: factions`, una por sistema; **Nuevas facciones** hace dos sobre la tabla de turno de Core, con una hoja propia, y las nombra en el sistema): su **Nombre**, **Su hoja** (los valores, estados y relaciones que tiene cada facción), **Su turno** (lo que tira cada una en un turno del mundo), **Cada (días)** (vacío: solo a mano) y cada facción con su **Nombre**, **Color**, con qué **Empieza**, las **Regiones** y **Hexes** que tiene al empezar y su tabla de **Turno propio**. En el Hexmapper se traen a un mapa desde la vista Mundo ([Facciones](../hexmapper/12-world.md#facciones)).
- **Calendario**: el calendario que nombra el sistema (uno; **Nuevo calendario** hace uno a partir de una plantilla pequeña y lo nombra): su nombre, el año y el día del día 1, las horas de un día y de una guardia, el alba y el anochecer para el reloj del mundo; sus **meses** en orden, cada uno con sus días y su estación (cualquier nombre: `spring`, o la `wet` de tu mundo), con la longitud del año debajo; los **días de la semana**; las **lunas** con su ciclo y desfase; las **fiestas** en un mes y un día. Renombrar un mes arrastra sus fiestas, sus traducciones y el día 1. Las flechas reordenan una lista.
- **Clima**: los modelos de clima que nombra el sistema (**Nuevo modelo de clima** añade uno y lo nombra). Sus **tipos de clima**, cada uno con un nombre y lo que **fija para el día** (`snowbound: true`); luego cada **estación**: cómo **empieza** el clima, y una cuadrícula de pesos, el clima de ayer en filas y el de hoy en columnas (el verano de las Marcas Grises: desde **Despejado**, `clear 5`, `grey 1`, `storm 1`: las rachas de buen tiempo duran). **En muchos días**, debajo de cada cuadrícula, dice con qué frecuencia sale cada clima en esa estación, para comprobar que se siente bien. **Añadir una estación** para cada estación que use su calendario. **Convertir en flor hexagonal** cambia una estación por una flor de 19 casillas (**Usar pesos** la devuelve): un tipo de clima por casilla, en qué **Empieza** el primer día y qué pasa **En el borde**, con lo a menudo que sale cada tipo (el invierno de las Marcas Grises).
- **Modos de tirada**: los modos de tirada de los packs que trae el sistema (los suyos y, de solo lectura, los de una dependencia incluida como la ventaja de Core), cada uno con su nombre, cuántas **tiradas** y con qué total se **queda** (`highest`, `lowest`, `middle`) y los modos que **anula**. **Nuevos modos de tirada** los añade a su propio pack.
- **Reglas**: el día (alba, anochecer, horas de marcha, y **Al anochecer, esperando**: la acción que hace el grupo cuando cae la noche mientras avanza el reloj del mundo, acampar por defecto; si no se cumplen sus condiciones, la noche pasa sin ella), las formas de viajar (km por día, **Solo por**: por dónde puede ir, una condición sobre cada hex en el que entra, p. ej. la barca de las Marcas Grises por agua o costa, `any: [{ water: true }, { terrain: coast }]`, o un carro solo por camino, `edges: road`; y **Solo si**: dónde y cuándo se puede elegir, p. ej. la barca de las Marcas Grises solo a la orilla o en el transbordador, `any: [{ water: true }, { terrain: coast }, { tags: ferry }]`; **Salvo si**: cuándo no), cómo cambia la velocidad cada terreno y cada camino o río y si se puede entrar en un terreno (**Transitable**, y **Abierto cuando** / **Cerrado cuando**; **Velocidad × de los terrenos no listados** cubre cualquier terreno del mapa que no esté en la lista: condiciones sobre el hex al que se entra y el momento, p. ej. los picos de las Marcas Grises, abiertos solo en verano y cerrados con nieve o tormenta, `season: summer` / `weather: [snow, storm]`; los hexes de agua tienen lo mismo), las provisiones (con su **Mín** y **Máx**), cuánto frena cada clima, los **valores del día** y las **acciones**. La ayuda junto a cada parte la explica. Las provisiones las gastan las acciones, comprobaciones y tablas del propio sistema, nunca la app: las Marcas Grises comen con una acción que el sistema hace al final de cada día (1 de comida, y 1 de forraje a caballo). **Mín** y **Máx** acotan una provisión: un cambio que pasaría de uno se queda en él, el diario lo dice y las reglas del sistema pueden reaccionar (las Marcas Grises: una comprobación de fin de día, fatiga +1, cuando la comida llegó a su mínimo). Los sistemas antiguos que gastaban provisiones **al día** muestran un aviso con **Convertir**, que escribe lo mismo como una acción así. El texto gris en una casilla vacía es solo el valor por defecto o una pista, no un valor.
  - **Valores del día**: valores que las tablas pueden poner para el resto del día, cada uno con un nombre y lo que **bloquea** mientras se cumple (viajar, una de las acciones del sistema o una forma de viajar como `mode.<id>`; la caja sugiere lo que declara el sistema: `mode.horse` deja los caballos atrás mientras se cumple). Las Marcas Grises declaran **Perdidos**, que bloquea el viaje: lo pone la tabla de perderse, y los botones de Viajar se quedan desactivados hasta el día siguiente, diciendo por qué.
  - **Acciones**: todas iguales, acampar, descansar y **marchar** también (marchar son los botones de Viajar: solo **Solo si** / **Salvo si**, comprobados mientras el grupo marcha; vacío, de día durante las horas de marcha del día) (**Añadir una acción**; × quita una; las flechas suben o bajan un paso), como fichas: un id, un nombre y una descripción para los jugadores, **Solo si** / **Salvo si** (cuándo se puede pulsar el botón: p. ej. Buscar comida de las Marcas Grises, no con tormenta; `daylight: true` para solo de día), **Una vez al día**, **Oculta si no se puede hacer** (si no, su botón sigue, desactivado, diciendo por qué; p. ej. el rito de las Marcas Grises, solo en un santuario con luna llena), **Automática en** (vacío: la hace el jugador, con un botón; o los momentos en que la hace el propio sistema, escritos como en el YAML con sugerencias: `day-start`, `hex-enter`, `day-end` u otra acción, varios separados por comas, p. ej. Comer de las Marcas Grises, `day-end`; las palabras bajo la caja lo repiten), lo que dice el diario cuando no se aplica ninguna de sus comprobaciones, y **Qué hace**, paso a paso, cada uno escrito como en el YAML con sugerencias: `time: 180` (o `dawn`, `nightfall`, `14:00`), `speed: 0.5`, `effects: { party.stats.fatigue: -1 }`, `set: { lost: true }`, `do: forage` (otra acción, si se cumplen sus condiciones) `roll: <comprobación>` (una comprobación, ya) y `advance: 1` (avanza por la ruta tantos hexes o tramos de golpe, sin que pase el tiempo: progreso por movimientos, mira _Viajes por movimientos_ en [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)). Un paso puede tener su propia condición: la acampada de las Marcas Grises duerme hasta el alba y, **salvo si** `below: food` (la comida se acabó al final del día), quita 1 de fatiga. Las acciones que la siguen y sus comprobaciones (en Comprobaciones, en esta acción) van primero. Todo, con el YAML: [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).
- **Comprobaciones**: cada comprobación con su **nombre** y **descripción** para los jugadores (se ven en el panel del viaje y el diario en lugar del id del evento), cuándo ocurre (**Cuándo**, escrito como en el YAML con sugerencias: `day-start`, `hex-enter`, `day-end`, una acción del sistema como `camp`, o varios separados por comas, p. ej. los encuentros de las Marcas Grises, `hex-enter, rest`; vacío: solo cuando la tira un paso), sus condiciones (**Solo si** / **Salvo si**, p. ej. perderse en las Marcas Grises, que se salta por caminos y ríos: `edges: [road, river]`), lo que la resuelve (cualquier tabla, oráculo, generador o mazo, agrupados por tipo, o un modelo de clima, en _Clima con inercia_; p. ej. el vado de las Marcas Grises se tira en un oráculo), **Contexto extra** (valores que su tabla ve solo en esta comprobación, p. ej. `timeOfDay: night` para tirar un encuentro nocturno en la tabla del día, o `danger: 3` como si el hexágono fuera más peligroso), **Cambios** (sus propios efectos, p. ej. Sin comida suficiente de las Marcas Grises: `party.stats.fatigue: 1`) y **Pausar después**. Debajo, las **Características del grupo**: cada una con un id, un **Nombre** y una **Descripción** para los jugadores y su valor inicial (**Empieza en**; **Añadir una característica**; su `min` / `max` se escriben en el YAML). El panel del viaje las muestra y deja que el jugador las cambie; las tablas las leen en tiradas (`1d6 + {{survival}}`) y condiciones (`party.stats.morale: { lte: 1 }`), y los efectos las cambian (`party.stats.fatigue: 1`). Con una **Hoja**, **De los miembros** hace una característica con los valores de los personajes mientras el grupo tenga alguno (`max: survival`, la mejor Supervivencia; `min`, `sum`, `count: true`, con `when` / `unless` para dejar fuera a algunos: la Supervivencia de las Marcas Grises, `max: survival, unless: { conditions: wounded }, none: 0`); vacío, la guarda el grupo. **Provisiones que llevan los miembros** nombra una provisión de las reglas y el valor de la hoja en el que la lleva cada personaje (**Llevada en**: la comida de las Marcas Grises en `rations`), y cómo se **reparte** lo que el viaje gaste o gane (por igual, o en orden). **Roles de viaje** son las tareas que el jugador da a los personajes en un viaje (el **Guía** y el **Vigía** de las Marcas Grises), cada una con nombre y descripción; las comprobaciones y tablas leen a quien la tiene como `roles.<id>.…`. Si los bindings aún nombran tablas para comprobaciones que las reglas ya no tienen (una comprobación quitada en el YAML), una nota las lista y **Quitarlas** las borra. Esta pestaña escribe a la vez las reglas de viaje y los bindings, así que no tienes que mantenerlos a la par: si renombras una comprobación, su tabla va con ella.

Las condiciones y el contexto se escriben en pares `clave: valor`, como en las tablas: `tags: landmark`, `edges: [road, river]`, `danger: { gte: 3 }`, `danger: { gt: '{{party.stats.stealth}}' }` (todos los operadores, variables y tiradas: [Condiciones](../technical/08-conditions.md); toda la sintaxis de un vistazo: [Sintaxis](../technical/09-syntax.md)). **Sin tabla**, una comprobación solo se apunta en el diario (con sus **Cambios**) y el viaje sigue; **Pausar después** es lo que detiene el viaje y espera a **Continuar**, tras tirarla si tiene tabla (un lugar señalado que describir: sin tabla y con **Pausar después**). Un pack escrito para un [formato de pack](../technical/02-file-formats.md) antiguo, en el que las comprobaciones sin tabla detenían el viaje por sí solas, se juega como antes, y la pestaña ofrece **Actualizar** para escribirlo en el de hoy (mira [qué hace aparecer Continuar](../travel/02-playing.md#el-viaje)).

Los formularios cambian el fichero YAML conservando tus comentarios y el orden; la pestaña **YAML** muestra el resultado (un botón por fichero cuando las partes del sistema están en varios, p. ej. `travel.yaml` y `system.yaml`) y marca cualquier problema en su línea; un botón encima de los formularios dice cuántos problemas hay y la abre. Lo que los formularios no cubren se puede escribir allí.

Las tablas que nombren sus bindings van en el mismo pack: añádelas en la aplicación Oracle (tu pack nuevo también sale allí), o usa tablas de otros packs con su id completo (`core/weather`).

## Cambiar un sistema incluido

Los sistemas incluidos son de solo lectura. Bajo el nombre del sistema (en todas sus pestañas), **Editar una copia** hace una copia de todo el pack que puedes cambiar; sustituye al incluido en este navegador. Las copias de packs de uso personal siguen siendo de uso personal. En tu copia editada, en el mismo sitio aparece **Volver a la versión incluida**, que descarta tus cambios y recupera el sistema incluido (pregunta antes; ↶ lo deshace). Cuando una versión nueva cambia el sistema incluido, tu copia lo avisa en el mismo sitio y te deja coger o conservar cada cambio: mira [Actualizaciones de los packs incluidos](../oracle/03-packs.md).

**↶ ↷** en la cabecera (o <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> fuera de las cajas de texto) deshacen y rehacen cambios en tus sistemas, mientras la página está abierta.

## Probarlo

La pestaña **Pruébalo** del sistema es la forma más rápida de comprobarlo mientras lo haces: monta un camino corto con los terrenos, caminos y etiquetas que importan a tus reglas, viaja y mira el diario. Por ejemplo, para probar una comprobación con `when: { tags: landmark }`, pon la etiqueta `landmark` al último hex y viaja.

- Es el viaje sin mapa de la aplicación Travel (mira [Jugar un viaje](../travel/02-playing.md)): **El camino** a la izquierda, hex a hex (terreno, etiquetas, camino o río al siguiente), y el viaje a la derecha (su día, provisiones, acciones, comprobaciones y diario).
- Juega las reglas **tal como están ahora**: cambia una velocidad en **Reglas** o una comprobación en **Comprobaciones**, vuelve y el siguiente paso usa el cambio. Lo que el viaje ya tenía al empezar (la estación, las provisiones de su primer día) se queda hasta que **Nuevo viaje** lo empieza de nuevo, conservando el camino.
- Estos viajes de prueba se guardan en este navegador aparte de los de la aplicación Travel, para que probar no se mezcle con tus partidas; para jugar un viaje de verdad con el sistema, **Jugarlo en Travel →**. Elegir otro sistema en **Sistema** abre el **Pruébalo** de ese sistema.

## Llevarlo a otra parte

Tus sistemas solo viven en este navegador. Para ponerlo a salvo, llevarlo a otro navegador o dárselo a alguien, el **Resumen** del sistema acaba con **Llevarlo a otra parte**: dice lo que lleva el fichero y **Exportar como .zip** lo descarga. El .zip lleva todos los packs que necesita el sistema, cada uno en su carpeta: el suyo, los que trae, los que tienen sus partes y sus dependencias, hasta donde lleguen. El fichero de las Marcas Grises, por ejemplo, lleva las Marcas Grises y Core.

**Importar un sistema (.zip)…**, bajo la lista de sistemas, vuelve a leer ese fichero y abre el sistema que trae (el **Importar .zip** de la Oracle también lo lee):

- los packs que no tienes se añaden a los tuyos;
- los que ya están y sin cambios (un Core incluido, por ejemplo) se quedan como están;
- un pack que tienes en otra versión solo se sustituye tras preguntar: uno tuyo se sobrescribe, uno incluido queda tapado por tu copia importada (**Volver a la versión incluida** lo recupera). **↶** deshace toda la importación de una vez.

Un sistema que usa packs de uso personal lo dice junto al botón: guárdate ese fichero. La forma del fichero está en [Formatos de fichero](../technical/02-file-formats.md#packs).

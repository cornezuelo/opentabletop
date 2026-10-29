# Tipos de definición

Un pack es una carpeta de ficheros YAML (o JSON). Cada fichero tiene una o varias **definiciones**, separadas por una línea con `---`, y cada definición dice qué es con `kind:`. Esta página enumera todos los tipos: para qué sirve cada uno, quién lo lee y cómo se escribe. Todos se comprueban al cargar el pack: un error aparece en **Problemas** de la aplicación Oracle, con su fichero y su línea.

Los tipos son un **conjunto fijo**: cada uno lo lee un motor que lo conoce, y un pack no puede añadir tipos propios (uno que las aplicaciones no conocen se guarda, pero nadie lo lee). Lo que el pack elige libremente es el contenido: sus tablas, su calendario, su clima, sus modos de tirada, sus reglas de viaje y sus características, con los nombres y las reglas de su juego.

| Tipo           | Qué es                                                                                    | Quién lo lee                                                                                                  | Cuántos por pack |
| -------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------- |
| `table`        | Una lista de resultados que se eligen por dados o por peso                                | El Oracle; cualquier cosa que tira, si la nombra (abajo)                                                      | Los que quieras  |
| `oracle`       | Una tabla cuyas respuestas dependen de una pregunta (una entrada)                         | El Oracle; cualquier cosa que tira, si lo nombra (abajo)                                                      | Los que quieras  |
| `generator`    | Varias tiradas unidas en un texto                                                         | El Oracle; cualquier cosa que tira, si lo nombra (abajo)                                                      | Los que quieras  |
| `deck`         | Cartas que se roban sin devolverlas                                                       | El Oracle; cualquier cosa que tira, si lo nombra (roba una carta)                                             | Los que quieras  |
| `roll-modes`   | Formas de tirar una tabla varias veces y quedarse con un total                            | El Oracle (cada tirada)                                                                                       | Uno              |
| `travel-rules` | Cómo funciona un viaje: velocidades, terrenos, acciones, comprobaciones…                  | Jugar del Hexmapper, la aplicación Travel                                                                     | Uno por sistema  |
| `bindings`     | Qué tabla responde a cada comprobación del viaje, las características                     | Jugar del Hexmapper, la aplicación Travel                                                                     | Uno por sistema  |
| `calendar`     | Meses, estaciones, días de la semana, lunas y fiestas                                     | Los viajes, el reloj del mundo (el panel Mundo del Hexmapper, la aplicación Campaign)                         | Uno por sistema  |
| `weather`      | Clima con memoria: el de hoy sigue al de ayer, por estación                               | Los viajes (un binding con `weather:`)                                                                        | Los que quieras  |
| `land`         | Terreno con memoria: el de un hex vacío sigue a la tierra que lo rodea                    | El descubrimiento (un binding con `land:`), el **Generar** del Hexmapper                                      | Los que quieras  |
| `sheet`        | Lo que tiene cada personaje del grupo: valores, estados                                   | Los viajes (los personajes del grupo), la aplicación Systems                                                  | Uno por sistema  |
| `factions`     | Los poderes de su mundo: sus tierras y sus turnos del mundo                               | El reloj del mundo (el panel Mundo del Hexmapper, la aplicación Campaign), la aplicación Systems              | Uno por sistema  |
| `clocks`       | Los relojes de progreso con los que empieza su mundo, y qué hace cada uno al llenarse     | El reloj del mundo (el panel Mundo del Hexmapper, la aplicación Campaign), la aplicación Systems              | Uno por sistema  |
| `items`        | Lo que pueden llevar sus personajes: objetos con etiquetas, números y lugares             | Las tarjetas de los personajes (viajes, fichas, la aplicación Characters), los efectos, la aplicación Systems | Cualquiera       |
| `bestiary`     | Plantillas de personajes (criaturas, tipos de PNJ) de las que los resultados hacen copias | Los viajes (los presentes: efectos `present.<plantilla>`)                                                     | Cualquiera       |
| `system`       | Un sistema de juego: cuáles de los anteriores usa, y qué packs                            | Cada aplicación que juega con un sistema: Hexmapper, Travel, Campaign, Characters, Systems                    | Los que quieras  |

**Quién lee qué.** Las tablas, oráculos, generadores y mazos son todo cosas que se tiran, y cualquier cosa que tira puede tirar cualquiera de ellas: el Oracle a mano, una comprobación del viaje o el descubrimiento si un binding la nombra (`resolve: deck.omens` roba una carta), el paso `roll:` de una acción (`roll: table.ruins`), una entrada o carta que tira otra (`table:`), el campo de un generador, un reloj de progreso al llenarse (`resolve:`) y el turno del mundo de una facción (`turn:`). **Cuántos:** uno de los tipos que describen el sistema entero (sus modos de tirada, reglas de viaje, bindings, calendario, hoja: un sistema tiene una forma de hacer cada cosa), los que quieras del resto. Un pack con varios [sistemas](#sistemas) tiene un juego de ellos para cada uno, distinguidos por sus ids. Los modelos de clima pueden ser varios porque un sistema puede tener varios climas (la costa y las montañas, cada uno atado a su comprobación).

Las traducciones de nombres y textos van en ficheros `locales/<idioma>/` con el mismo nombre, para todos los tipos; los que no son tablas, por tipo e id (`calendar/marcher-reckoning:`): mira [Traducciones](../oracle/05-translations.md#reglas-calendarios-clima-y-modos-de-tirada). Los ejemplos de abajo van solo en el idioma base.

## Tablas

```yaml
kind: table
id: weather
name: Clima
roll: 1d6 # vacío: elegir por peso
modes: [roll-modes.advantage, roll-modes.disadvantage] # modos de tirada que se ofrecen a mano
entries:
  - { id: clear, range: 1-3, result: Despejado, set: { weather: clear } }
  - { id: storm, range: 4-6, result: Tormenta, table: table.storm-damage }
```

Las entradas tienen un `range` de totales (o un `weight`), un texto `result` y, si hace falta, `when` / `unless` (condiciones), `set` (valores que da el resultado), `table` / `generator` (tirar otra), `once` / `maxOccurrences` (límites por sesión), `effects` (cambios en los valores del grupo) y `pause` (detener el viaje cuando sale). La tabla puede tener además `clamp`, `onExhausted`, `modes`, `modeWhen` y `modeUnless`, y, como toda tabla, oráculo, generador y mazo, `tags`: palabras que la clasifican (`tags: [people, names]`), que lee el **Filtrar** del Oracle y del Hexmapper; no significan nada más, y `rules` es solo la costumbre de nuestros packs para lo que tiran sus sistemas. Todo sobre ellas: [Editar](../oracle/04-editing.md) y [YAML](../oracle/06-yaml.md).

**Qué ven otras tablas:** una tabla tirada desde otra (`table:`) da su texto como `{{result}}` y sus valores `set` al viaje y a las comprobaciones siguientes del día (mira [Qué ven las tablas](04-what-tables-see.md)).

## Oráculos

Una tabla con una **entrada** (una pregunta: la probabilidad, lo que está en juego…) y una lista de entradas por cada opción. La entrada se elige al tirar o la dan los bindings de un viaje (`context: { odds: even }`). Cada variante puede tener su propio `roll`.

```yaml
kind: oracle
id: yes-no
inputs:
  odds: { options: [unlikely, even, likely], default: even }
roll: 1d6
variants:
  unlikely: { entries: [{ id: yes, range: 1, result: 'Sí' }, { id: no, range: 2-6, result: 'No' }] }
  even: { entries: [{ id: yes, range: 1-3, result: 'Sí' }, { id: no, range: 4-6, result: 'No' }] }
  likely: { entries: [{ id: yes, range: 1-5, result: 'Sí' }, { id: no, range: 6, result: 'No' }] }
```

## Generadores

Campos que se tiran en orden (cada uno ve los anteriores), unidos por una plantilla (`template`). Un campo es una `table`, un `generator`, dados (`roll`) o un valor fijo (`value`), y puede tener `when` / `unless` (solo se tira entonces; si no, queda vacío) y su propio `context`.

```yaml
kind: generator
id: npc
fields:
  name: { table: table.npc-names }
  might: { roll: 4d6kh3 }
template: '{{name}} (fuerza {{might}})'
```

**Qué ven otras tablas:** cada campo por su nombre, dentro del generador (`{{name}}`), y desde un generador que tire este, como `{{npc.name}}`. Lo que fijan, cambian y pausan sus tablas llega al viaje (o a lo que lo tiró) como lo de una tabla: sus valores `set` (con el mismo nombre, ganan sus propios campos), sus `effects` sumados, y una `pause` en cualquiera de ellas detiene el viaje.

## Mazos

Cartas que se roban sin reponer hasta que se baraja (`reshuffle: when-empty`, `manual` o `after-draw`). Una carta puede tener copias (`count`), tirar una tabla, poner valores, tener `effects` y `pause`, como una entrada.

```yaml
kind: deck
id: omens
reshuffle: when-empty # when-empty, manual o after-draw
cards:
  - { id: crows, result: Los cuervos os siguen todo el día, count: 3 } # tres copias
  - { id: stranger, result: 'Un desconocido en el camino: {{result}}', table: generator.npc }
  - { id: cache, result: 'El escondite de un cazador', effects: { party.items.ration: 2 } }
  - { id: wyrm-sign, result: Árboles chamuscados, set: { omen: wyrm }, pause: true }
```

Cada carta necesita un `id` (lo usan las traducciones y el registro de cartas robadas). **Lo que ven las tablas:** los valores `set` de una carta, como los de una entrada; una tabla que tira una carta da su texto como `{{result}}`.

## Entradas de los oráculos

La entrada de un oráculo puede tener `label` y `labels` para sus opciones, que se muestran en lugar de los ids y se traducen en `locales/`:

```yaml
inputs:
  odds:
    label: Probabilidad
    options: [unlikely, even, likely]
    labels: { unlikely: Improbable, even: Igualada, likely: Probable }
    default: even
```

## Modos de tirada

Las formas en que un sistema tira una tabla **varias veces y se queda con un total**: ventaja, desventaja o cualquier otra (tres tiradas quedándose con la del medio…). Las aplicaciones no conocen ninguna: las declara un pack, con sus nombres, y sus tablas dicen cuáles usan. Una definición `roll-modes` por pack, con los modos que quieras. En la aplicación Systems, la pestaña **Modos de tirada** de un sistema edita los de sus packs con un formulario.

```yaml
kind: roll-modes
id: default
modes:
  advantage:
    name: Ventaja
    description: Tira dos veces y quédate con el total más alto.
    repeat: 2 # cuántas veces se hace toda la tirada
    keep: highest # highest (el más alto), lowest (el más bajo) o middle (el del medio; con un número par, el más bajo de los dos del medio)
    cancels: roll-modes.disadvantage # juntos, no se aplica ninguno: tirada normal
  disadvantage: { name: Desventaja, repeat: 2, keep: lowest }
```

Una tabla u oráculo los usa con:

- `modes: [roll-modes.advantage, roll-modes.disadvantage]`: se ofrecen al tirar a mano (la opción junto a **Tirar**).
- `modeWhen: { roll-modes.advantage: { party.stats.explorer: { gte: 1 } } }`: se usa por sí solo cuando se cumple la condición, también en un viaje. Un modo puede estar en `modeWhen` sin estar en `modes`.
- `modeUnless: { roll-modes.disadvantage: { hex.tags: lit } }`: no se usa por sí solo cuando se cumple la condición. Con `modeWhen` para el mismo modo, se aplica cuando se cumple la primera y no esta (`modeWhen: { roll-modes.disadvantage: { timeOfDay: night } }` + esta: de noche, salvo donde hay luz); sola, el modo se usa siempre menos entonces (una tabla maldita que se tira con desventaja salvo `{ blessed: true }`).

Cuando se aplican varios (uno elegido a mano más otros por sí solos), los que se anulan entre sí se caen y se usa el primero de los demás (el elegido a mano, luego el orden de `modeWhen`, luego el de `modeUnless`). Los modos se referencian como las tablas, por su tipo e id (`roll-modes.advantage`): primero los del propio pack, luego los de sus dependencias (las Marcas Grises usan el `roll-modes.advantage` de Core), o con el pack delante (`core/roll-modes.advantage`). Core declara ventaja y desventaja y las Marcas Grises añaden _Con cuidado_ (tres tiradas, la del medio). El antiguo `advantage: true` ya no hace nada y avisa.

**Qué ven las tablas:** nada: los modos no son valores; una tabla los usa con `modes`, `modeWhen` y `modeUnless`.

## Reglas de viaje

Cómo funciona un viaje: cuándo empiezan los viajes, la escala de sus velocidades (`hoursPerDay`), cómo sigue el viaje por sí solo (`travel.onward`: una acción y sus parámetros) y qué hace el grupo cuando no puede marchar (`travel.halt`), los terrenos y sus velocidades y si se puede entrar (`passable`: `false`, o `{ when, unless }` para un paso cerrado en invierno o un lago que se cruza sobre el hielo), el agua (lo mismo), los caminos y ríos, las formas de viajar (km por día, por dónde pueden ir: `through`, y cuándo se pueden elegir: `when` / `unless`), el clima que frena, sus **valores del día** (`values`: `lost` con lo que `blocks`: `travel.move`, una de sus acciones (`actions.forage`) o `modes.<id>`), las **acciones** del grupo (solo las que declara, todas iguales: marchar, acampar, descansar, buscar comida…; `when` / `unless`, `oncePerDay`, `params` (lo que se elige al hacerla, leído como `{{params.<id>}}`), `on:` para las que hace el propio sistema en un momento o tras otra acción (o varios: una lista), y sus pasos, `do`: `time`, `travel.move`, `travel.speed`, `travel.advance`, `effects`, `set`, `do` (con `with:`), `roll`) y las **comprobaciones**: qué se tira a una hora o en una parte del día del calendario (la mañana), al entrar en un hex, al final del día, con una acción (acampar, por ejemplo) o solo con el `roll:` de un paso, y cuándo (`when` / `unless`); una comprobación puede tener `effects` propios y `pause: true` (detenerse tras ella hasta **Continuar**). Un pack con reglas de viaje es un **sistema** que se juega en el Hexmapper (Jugar → Con reglas) y en la aplicación Travel. En detalle: [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) y las pestañas [Reglas](../systems/05-rules.md) y [Comprobaciones](../systems/06-checks.md) de la aplicación Systems.

Todas las claves, en un sistema pequeño (los comentarios dicen qué hace cada una):

```yaml
kind: travel-rules
id: default
travel:
  hoursPerDay: 8 # las horas en que una forma de viajar hace su kmPerDay (la escala de su velocidad)
  hexKm: 10 # km por hex (la escala)
  start: '06:00' # cuándo empieza un viaje nuevo (una hora o una parte del día; vacío: medianoche)
  onward: { do: actions.march, with: { until: destination } } # cómo sigue el viaje por sí solo
  halt: { at: '20:00', do: actions.camp } # desde entonces, un grupo que no puede marchar acampa por sí solo
modes: # formas de viajar
  foot: { name: A pie, kmPerDay: 24 }
  horse: { name: A caballo, kmPerDay: 40, unless: { trip.weather: snow } }
  boat:
    {
      kmPerDay: 50,
      through: { hex.water: true },
      when: { any: [{ hex.water: true }, { hex.tags: ferry }] },
    }
terrains:
  plains: { multiplier: 1 }
  forest: { multiplier: 0.5 }
  peaks: { multiplier: 0.25, passable: { when: { time.season: summer } } }
  lake: { multiplier: 0.5, passable: { when: { time.month: [1, 12] } } } # helado en pleno invierno
defaultTerrain: { multiplier: 1 } # velocidad × de los terrenos no listados
water: { passable: false } # hexes de agua sin regla propia
edges: { road: { multiplier: 1.5 }, river: { multiplier: 1 } } # por un camino o río
weather: { storm: { speed: 0 }, heavy-rain: { speed: 0.5 } }
values: # valores del día que ponen tablas y acciones
  lost: { name: Perdidos, blocks: [travel.move] }
  snowbound: { blocks: [modes.horse] }
  torchlit: { name: Con antorchas }
actions:
  camp:
    when: { party.values.food: { gte: 1 } } # si no, la parada pasa sin ello
    do:
      - { time: '06:00' }
      - { unless: { trip.below: party.values.food }, effects: { party.stats.fatigue: -1 } }
  rest:
    when: { time.hour: { gte: 6, lt: 20 } }
    do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }]
  march: # se mueve mientras se cumpla (de día 8 h, o con antorchas), hasta donde se elija
    params:
      until: { name: Hasta dónde, choices: [destination, hex, { id: 3, name: Tres hexes }] }
    when:
      {
        any:
          [
            { time.hour: { gte: 6, lt: 20 }, trip.marched: { lt: '{{system.hoursPerDay}}' } },
            { today.torchlit: true },
          ],
      }
    do: [{ travel.move: '{{params.until}}' }]
  night-march: # desde las 20:00, enciende las antorchas y marcha; su botón se oculta de día
    when: { time.hour: { gte: 20 } }
    hideWhenUnavailable: true
    do:
      - { set: { torchlit: true } }
      - { effects: { party.stats.fatigue: 1 } }
      - { do: actions.march, with: { until: destination } }
  forage:
    oncePerDay: true
    unless: { trip.weather: storm }
    nothing: 'no hay nada que buscar en {terrain}' # el diario cuando no se aplica ninguna comprobación
    do: [{ time: 180 }, { travel.speed: 0.5 }]
  # no es un botón; la comida es un valor de la hoja del grupo (`partySheet` en su sistema)
  eat: { on: time.day-end, do: [{ effects: { party.values.food: -1 } }] }
checks:
  - { event: WEATHER_CHECK_REQUIRED, at: '06:00' }
  - { event: NAVIGATION_CHECK_REQUIRED, name: Perderse, at: '06:00', unless: { trip.edges: road } }
  - {
      event: ENCOUNTER_CHECK_REQUIRED,
      at: [trip.hex-enter, actions.rest],
      when: { hex.danger: { gte: 2 } },
    }
  - { event: FORAGE_CHECK_REQUIRED, at: actions.forage }
  - {
      event: HUNGRY_DAY,
      at: time.day-end,
      when: { trip.below: party.values.food },
      effects: { party.stats.fatigue: 1 },
    }
  - { event: SHRINE_CHECK_REQUIRED, at: trip.hex-enter, when: { hex.tags: shrine }, pause: true }
```

Un paso hace una cosa: `time` (minutos, una hora, `'14:00'`, o una parte del día del calendario, `time.meal.luncheon`: hasta que vuelve a llegar), `travel.move` (por la ruta mientras pasa el tiempo y se cumplen el `when` / `unless` de la acción: `destination`, `hex`, un número de hexes o una variable), `travel.speed` (lo que queda de movimiento hoy), `travel.advance` (tantos hexes por la ruta de golpe, un número o una variable), `travel.mode` (otra forma de viajar, si se puede elegir), `effects`, `set`, `do` (otra acción, con `with:` sus parámetros, o un turno del mundo de la campaña, `do: world.turn`, que juega la aplicación), `roll` (una comprobación, o algo del Oráculo: `table.<id>`…), `say` (una línea en el diario), `pause` (`true` o un texto: el viaje espera a **Continuar**), `ask` (uno de los parámetros de la acción, que elige el jugador mientras la acción avanza) o `wait` (una condición, con `limit:` lo más que espera); cada paso puede tener `when` / `unless`, y un `id` por el que lo nombran sus traducciones. Todos los pasos, con ejemplos: [Acciones y pasos](10-actions-and-steps.md). Los `params` de una acción tienen cada uno sus `choices` (valores, o `{ id, name, description }`) y quizá un `default` (si no, la primera); un `with:` da una opción o una variable (`'{{params.until}}'`). El `on:` de una acción es `trip.hex-enter`, `time.day-end`, una hora (`'06:00'`: al dar esa hora) o una parte del día del calendario (`time.meal.elevenses`: al empezar), marchando, esperando o dormidos en el campamento (mira [Divisiones del día](#calendarios)), otra acción, `actions.camp`, o su final, `actions.camp.done`, una de sus comprobaciones justo después de resolverse, `checks.WEATHER_CHECK_REQUIRED`, uno de los relojes de progreso del sistema al llenarse, `world.clocks.<id>.full`, o un turno del mundo de la campaña, `world.turn` (o una lista). `travel.start` y el `at` de la parada admiten una hora o una parte (`halt: { at: time.meal.supper, do: actions.camp }`). El `at:` de una comprobación admite los mismos momentos (o una lista); sin `at`, solo la tira el `roll:` de un paso. Las comprobaciones de un momento se deciden una a una, en el orden de la lista, cada una justo antes de tirarla: su `when` / `unless` ven lo que fijaron las anteriores (el clima, valores del día, `effects`); una que pausa deja en espera el resto de su momento hasta que el jugador sigue. Los valores del día duran hasta que acaba el día (`lasts: day`, la única opción por ahora).

**Nada que el sistema no declare.** En las reglas no hay provisiones: lo que lleva el grupo son los valores de su hoja (`party.values.food`) u objetos (`party.items.ration`, los suyos y los de sus personajes juntos), con sus límites; los pasos siguientes de una acción ven lo que los anteriores les cambiaron. Sin una acción con un paso `travel.move`, el grupo nunca se mueve por su ruta (una marcha sin `when` se mueve siempre que nada más lo impida: un valor del día, el clima, el camino, de día y de noche); sin `onward`, el viaje que sigue por sí solo solo espera; sin `halt`, un grupo que no puede marchar simplemente espera; sin acciones, no hay ninguna (ni marchar, ni acampar ni descansar propios del motor); sin `values`, no hay ninguno. Lo que bloquea `travel.move` bloquea también las acciones que mueven. Un movimiento que una comprobación detiene por el camino sigue en curso: seguir (**Seguir**) lo acaba, y después los pasos que van tras él. La **parada** (`travel.halt`): desde su momento hasta que acaba el día, un grupo que no está marchando mientras el tiempo avanza solo (el reloj del mundo, una orden de viajar mientras no se puede hacer su forma de seguir, **Esperar para seguir**) hace su acción, una vez al día; si no puede (su `when` / `unless`, un valor que la bloquea), el diario lo dice y el tiempo pasa hasta que el viaje pueda seguir.

Los packs escritos para un formato de pack anterior no se leen (mira [Formatos de fichero](02-file-formats.md#packs)).

**Qué ven las tablas:** los datos del viaje (`hex.terrain`, `trip.edges`, `trip.mode`, `time.day`, `time.season`, `trip.weather`, `yesterday.<valor>`…) y el grupo (`party.stats.fatigue`, `party.values.food`, `party.items.ration.count`): la lista completa está en [Qué ven las tablas](04-what-tables-see.md).

## Bindings

La otra mitad de un sistema: qué tabla (`resolve:`) o modelo de clima (`weather:`) responde a cada comprobación, con `context` extra; las **características** del grupo (nombre, descripción, valor inicial) que leen las tablas (`{{party.stats.charisma}}`), y cuáles salen de sus personajes (`from`); **reads**, nombres para los demás valores que leen sus tablas (`icon.guards`, `fordModifier`…); y el **descubrimiento** (qué tablas deciden los hexes vacíos). En detalle: [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

```yaml
kind: bindings
id: default
stats: # los números del grupo, que se editan durante el viaje
  survival: { name: Supervivencia, description: Se suma al buscar comida., default: 1 }
  hirelings: { name: Mercenarios, default: 0, min: 0 }
  fatigue: { name: Fatiga, default: 0, min: 0 }
  # Con personajes en el grupo, sale de los suyos (la hoja del sistema): el mejor Rastreo,
  navigation: { name: Orientación, default: 0, from: { max: pathfinding } }
  # o cuántos comen, sin dejar a nadie fuera (sin personajes: 1, su valor inicial).
  mouths: { name: Bocas, default: 1, from: { count: true } }
roles: # roles de viaje que el jugador da a los personajes (se leen como roles.<id>)
  guide: { name: Guía, description: Abre el camino. }
reads: # nombres para otros valores que leen sus tablas (en el panel de tirada y el mapa)
  danger: { name: Peligro, description: Lo peligroso que es el hex. }
  icon.guards: { name: Guardias }
discover: # tablas que deciden los hexes vacíos según viaja el grupo
  terrain: { resolve: table.next-terrain } # o un modelo de tierra: { land: land.default }
  contents: { resolve: table.hex-contents }
  reveal: neighbors # o entered
on: # por evento de comprobación: qué la responde
  WEATHER_CHECK_REQUIRED: { weather: weather.sky } # un modelo de clima
  NAVIGATION_CHECK_REQUIRED: { resolve: table.getting-lost } # una tabla, oráculo, generador o mazo
  ENCOUNTER_CHECK_REQUIRED: { resolve: table.encounter, context: { timeOfDay: day } }
  FORD_CHECK_REQUIRED: { resolve: oracle.ford, context: { odds: even } } # la entrada de un oráculo
```

Una comprobación sin binding se apunta en el diario (con sus `effects`, si tiene) y solo detiene el viaje si dice `pause: true`.

**Características que salen de los personajes** (`from`, cuando el sistema tiene una [hoja](#hojas)): mientras el grupo tenga personajes, la característica sale de las suyas, y los efectos sobre ella se sobrescriben; mientras no tenga ninguno, se guarda como cualquier otra, así que el mismo sistema se juega con personajes o sin ellos. Una de:

- `max: <valor>` — la mejor de ellos; `min: <valor>` — la peor; `sum: <valor>` — la de todos juntos; `count: true` — cuántos son.
- `pick: <valor>` — la de un personaje: el que elija el jugador en el viaje (**Tira**), el mejor si no se elige a nadie. Con **Preguntar en cada tirada** marcado en el viaje, cada comprobación que se tira en una tabla espera a la elección antes de tirar (el Carisma de las Marcas Grises: quien hable).
- `party: <valor>` — no la de los personajes sino un valor de la hoja del propio grupo (`partySheet`), siempre: mira [Hojas](#hojas).
- `when` / `unless` — solo los personajes para los que se cumple esta [condición](08-conditions.md), leída con los valores de cada uno (`unless: { conditions: wounded }`, `when: { values.health: { gt: 0 } }`).
- `none` — lo que vale cuando no cuenta ningún personaje (0 si no se dice).

Sin personajes, el grupo la guarda como un todo.

**Roles de viaje** (`roles`): tareas que el jugador da a los personajes en un viaje (guiar, montar guardia, buscar comida…), cada una con un `name` y una `description` para los jugadores. Las comprobaciones, tablas y acciones leen a quien tiene una como `roles.<id>.…` (`roles.guide.values.pathfinding: { gte: 2 }`) y sus efectos le llegan (`roles.lookout.values.health: -1`); si nadie tiene el rol, lo que lo lee no se cumple y sus efectos no cambian nada.

**Qué ven las tablas:** cada característica por su nombre (`{{party.stats.charisma}}`, `when: { party.stats.morale: { lte: 0 } }`) y el `context` del binding (`timeOfDay: night`).

## Calendarios

Los meses del año (con sus días y estaciones), los días de la semana, las lunas (ciclo y fase) y las fiestas, y el año del día 1. Los viajes con ese sistema ponen fecha a su diario con él, y las tablas ven `time.month`, `time.year`, `time.weekday`, `time.moons.<luna>` (new, waxing, full, waning) y `time.holidays`. El reloj del mundo (el panel [Mundo](../hexmapper/12-world.md) del Hexmapper, la aplicación Campaign) usa el calendario del sistema de la campaña. Sin uno, se usa un calendario sencillo de días y cuatro estaciones (las reglas genéricas nombran el de Core, `core/calendar.default`, que añade sus partes del día). En la aplicación Systems, la pestaña **Calendario** de un sistema lo edita con un formulario (renombrar un mes arrastra sus fiestas y traducciones).

```yaml
kind: calendar
id: marcher-reckoning
name: El cómputo de las Marcas
startYear: 412
months:
  - { id: thaw, name: Deshielo, days: 30, season: spring }
  - { id: highsun, name: Altosol, days: 30, season: summer }
weekdays: [{ id: moonday, name: Díalunar }]
moons: [{ id: pale, name: La Luna Pálida, cycle: 28 }]
holidays: [{ id: midsummer, name: Pleno Verano, month: highsun, day: 15 }]
```

**Qué ven las tablas:** `{{time.month}}` (el id del mes), `{{time.year}}`, `{{time.weekday}}`, la fase de cada luna como `time.moons.<luna>` (`when: { time.moons.pale: full }`) y las fiestas de hoy como una lista (`when: { time.holidays: midsummer }`), además de `time.season`, que sale del mes. Ids, no nombres: las condiciones comparan ids, y el diario muestra los nombres.

**Divisiones del día** (`divisions`): las maneras en que el calendario divide el día, tantas como quiera el sistema (comidas, guardias, campanadas, rezos…), ninguna si no declara ninguna. Cada una va bajo su id y tiene o bien `parts` (cada parte con un `id`, un `from` y, si quieres, `until`, `name`, `description` y `tags`) o bien `every` (horas: partes numeradas de la misma duración desde la medianoche, 1, 2, 3…). Las partes numeradas se leen como números (`time.watch: 2`), se escriban con `every` o como `parts` que se llaman todas con números enteros (`id: '2'`): el **Dividir en partes iguales…** de la aplicación Systems las escribe así. Una parte dura hasta que empieza la siguiente de su división, en el orden del día se escriban en el orden que se escriban (la última hasta la primera, pasada la medianoche); `until` la acaba antes y deja un hueco sin ninguna parte de la división. Las etiquetas solo significan lo que las reglas de un sistema hagan con ellas. Un id no puede ser un nombre que el momento ya tiene (`day`, `hour`, `minute`, `season`, `year`, `month`, `weekday`, `moons`, `holidays`, `tags`…). El panel [Mundo](../hexmapper/12-world.md) del Hexmapper avanza el tiempo hasta la siguiente parte de cada división, o hasta una parte elegida. Los nombres se traducen por los ids (`divisions: { meal: { name: …, parts: { elevenses: { name: … } } } }`).

```yaml
kind: calendar
id: hearth-reckoning
months: [{ id: first, days: 30 }]
divisions:
  meal:
    name: Comidas
    parts:
      - { id: breakfast, name: el desayuno, from: '07:00' }
      - { id: elevenses, name: el tentempié, from: '11:00', tags: [meal] }
      - { id: supper, name: la cena, from: '21:00', tags: [meal, dark] }
  watch:
    name: Guardias
    parts: # solo de noche: la última acaba a las 07:00
      - { id: first, from: '21:00' }
      - { id: middle, from: '01:00' }
      - { id: morning, from: '04:00', until: '07:00' }
  bell: { name: Campanadas, every: 0.5 }
```

## Modelos de clima

Clima con memoria (una cadena de Markov): por estación, para cada tipo de clima, lo probable que es cada tipo mañana, así que la lluvia se instala varios días y las tormentas pasan. Cada tipo de clima tiene un nombre y los valores que da al día (`set: { fordModifier: -1 }`), como el resultado de una tabla. Un viaje usa uno cuando un binding dice `weather: <modelo>` en vez de `resolve:`; el clima de hoy pasa a ser `trip.weather` para las comprobaciones siguientes y las velocidades de las reglas de viaje. En la aplicación Systems, la pestaña **Clima** de un sistema edita sus modelos con un formulario: los tipos de clima, y por estación una cuadrícula de pesos del clima de ayer al de hoy, con la frecuencia de cada uno a lo largo de muchos días.

```yaml
kind: weather
id: sky
states:
  clear: { name: Cielo despejado }
  rain: { name: Lluvia constante, set: { fordModifier: -1 } }
seasons:
  spring:
    start: clear # o pesos: { clear: 2, rain: 1 }
    next:
      clear: { clear: 3, rain: 1 }
      rain: { rain: 2, clear: 1 }
```

Una estación puede ser en cambio una **flor hexagonal**: 19 casillas, cinco filas de 3, 4, 5, 4 y 3 tipos de clima, de arriba abajo. Cada día 2d6 mueve el clima una casilla (por defecto 2–3 al noreste, 4–5 al este, 6–7 al sureste, 8–9 al suroeste, 10–11 al oeste, 12 al noroeste; `moves` lo cambia), así que el clima deriva hacia sus vecinos; al salirse por el borde vuelve por el lado opuesto (`edge: wrap`) o se queda (`edge: stay`). Un modelo puede mezclar las dos cosas, estación a estación.

```yaml
kind: weather
id: highland-skies
states:
  clear: { name: Despejado }
  grey: { name: Cubierto }
  snow: { name: Nieve, set: { snowed-in: true } }
  storm: { name: Ventisca }
seasons:
  winter:
    flower:
      start: snow # el primer día: la casilla con él más cercana al centro (sin poner: el centro)
      rows:
        - [storm, storm, snow]
        - [storm, snow, snow, snow]
        - [snow, snow, grey, grey, grey]
        - [grey, grey, clear, clear]
        - [clear, clear, clear]
      moves: { ne: '2-3', e: '4-5', se: '6-7', sw: '8-9', w: '10-11', nw: '12' } # los de por defecto
      edge: wrap
```

El reloj del mundo de una campaña también tira su propio clima cada día con el modelo de su sistema mientras no haya un viaje en marcha ([El reloj del mundo](../hexmapper/12-world.md#avanzar-el-tiempo)).

**Qué ven las tablas:** `{{trip.weather}}`, el id del clima de hoy (`rain`), y cada valor que pone su estado, por su nombre (`{{today.fordModifier}}`, `when: { today.fordImpossible: true }`); al día siguiente, los mismos valores como `yesterday.weather`, `yesterday.fordModifier`. No hay `{{trip.weather.value}}`: el clima es su id, y sus valores son valores del día como el `set` de cualquier tabla.

Las Marcas Grises usan todos los tipos: mira [Las Marcas Grises](../packs/02-grey-marches.md#donde-esta-cada-cosa).

## Modelos de tierra

Terreno con memoria: para cada terreno, lo probable que es que un hex **junto a él** sea cada terreno, así la tierra que se decide o se genera sale coherente (los bosques siguen siendo bosques, las colinas se juntan en cordilleras, el agua en lagos) en vez de un mosaico. Son las tablas de probabilidades de los modelos de clima, puestas en el espacio en vez de en el tiempo.

```yaml
kind: land
id: default
name: La forma de la tierra
next: # para cada terreno, los pesos del terreno de un hex vecino
  forest: { forest: 6, hills: 2, plains: 2 }
  hills: { hills: 4, mountains: 2, forest: 1 }
  mountains: { mountains: 5, hills: 3 }
  plains: { plains: 5, forest: 1, hills: 1 }
  lake: { lake: 5, plains: 1 }
start: { plains: 3, forest: 2 } # sin ningún vecino conocido
weights: { from: 2 } # el hex desde el que se ve cuenta doble (sin esto: como cualquier otro)
```

- **Cómo se decide un hex:** se suman las filas de todos sus **vecinos conocidos** (pintados, o ya decididos) y se elige un terreno con esos pesos. Dos vecinos de bosque cuentan la fila del bosque dos veces; un hex entre bosque y colinas tira hacia los dos. Un terreno sin fila en el modelo no suma nada. Sin ningún vecino conocido con fila, `start`; si todos los pesos son 0, el hex se queda vacío.
- **`weights: { from: N }`**: el hex desde el que se ve (la tierra que pisa el grupo, al descubrir) cuenta `N` veces en vez de una, así un viaje hacia lo desconocido tiende a seguir su propia tierra. Sin esto, todos los vecinos cuentan igual. Al generar tierra no hay tal hex.
- Los ids son los terrenos del sistema (`hex.terrain`); un modelo que nombra un terreno que las reglas de viaje de su sistema no tienen es un aviso.
- **Dónde se usa**, una vez que su sistema lo lista (`land: [land.default]`): en el **descubrimiento**, cuando los bindings dicen `discover: { terrain: { land: land.default } }` en vez de una tabla, o cuando la tabla del terreno le **pasa la decisión** (una entrada con `set: { land: land.default }`: la tabla decide primero, y el modelo el resto, mira [Descubrir el mapa](../oracle/07-connecting.md#7-descubrir-el-mapa)); y en el **Generar** del Hexmapper, que rellena hexes vacíos con él.
- Solo decide el terreno: lo que hay en un hex sigue siendo cosa de la tabla de contenido.

Traducciones: `name` y `description` en `locales/<idioma>/`, con la clave `land/<id>`. _La tierra sencilla_ de Core es el más pequeño; _La tierra de las Marcas_ de las Marcas Grises cuenta doble la tierra de la que vienes.

## Hojas

Lo que tiene cada personaje del grupo, cuando un sistema los juega uno a uno (`sheet:` en su [sistema](#sistemas)). Los viajes tienen entonces una sección **Personajes** donde los añades, eliges quién actúa y cambias sus valores; las características del grupo pueden salir de ellos ([bindings](#bindings): `from`), y los objetos del grupo son los suyos juntos (`items.share`, abajo). PJ, compañeros, mercenarios o enemigos son todos personajes de una hoja.

```yaml
kind: sheet
id: companion
name: Compañero
values: # números que tiene cada personaje, con los límites que les da el sistema (ninguno: sin límite)
  survival: { name: Supervivencia, default: 1, min: 0, max: 5, display: pips, group: skills } # 5 puntos
  pathfinding: { name: Rastreo, default: 0, min: 0, max: 3, group: skills }
  maxHealth: { name: Salud máxima, default: 3, min: 1, max: 6, group: body }
  health: # otro valor como límite; una barra, roja por debajo de la mitad de su máximo, ámbar desde la mitad, verde desde tres cuartos
    {
      name: Salud,
      default: 3,
      min: 0,
      max: '{{self.values.maxHealth}}',
      display: bar,
      tones: { 0: danger, 50%: warning, 75%: good },
      group: body,
    }
  water: { name: Agua, default: 2, min: 0, max: 6, display: of } # 2 / 6
  dread: { name: Pavor, default: 0, min: 0, max: 6, display: boxes } # 6 casillas
  harm: # un nombre para cada valor, desde su mínimo: 0 es Ileso, 3 es Moribundo
    display: levels
    min: 0
    max: 3
    levels:
      [
        { id: unhurt, name: Ileso },
        { id: bruised, name: Magullado },
        { id: wounded, name: Herido },
        { id: dying, name: Moribundo },
      ]
  wounds: # sale de otros valores, nunca se pone: los sigue
    { name: Heridas, from: '{{self.values.maxHealth - self.values.health}}', min: 0, group: body }
groups: # las tarjetas en las que se muestran los valores, en este orden
  skills: { name: Habilidades }
  body: { name: Cuerpo }
conditions: # estados que un personaje tiene o no, y lo que el grupo no puede hacer mientras alguien lo tenga
  wounded: { name: Herido, blocks: [actions.forced-march] } # una acción del sistema
  sprained: { name: Tobillo torcido, blocks: [travel.move] } # marchar
  saddle-sore: { name: Molido de la silla, blocks: [modes.horse] } # una forma de viajar
  terrified: # se cumple por sí solo mientras el pavor esté lleno
    { name: Aterrado, when: { self.values.dread: { gte: 6 } }, blocks: [actions.night-march] }
  seasick: { name: Mareado, when: { trip.mode: boat } } # se cumple por sí solo, leyendo el mundo
relations: # tipos de relación que un personaje puede tener con cualquier cosa con referencia
  bond: { name: Vínculo, value: { min: 0, max: 3, display: pips } } # con un número, como puntos
  home: { name: Hogar }
```

- `values`: `default` (lo que tiene un personaje nuevo, 0 si falta), `min` / `max` (un número, o los otros valores de la hoja entre llaves, `'{{self.values.<id>}}'` o con [aritmética](09-syntax.md#variables), `'{{self.values.might * 2}}'`: el valor baja cuando baja ese), `from` (un valor que **sale de otros**, `'{{self.values.maxHealth - self.values.health}}'`: no se cambia a mano ni con efectos, los sigue tras cada cambio, dentro de su propio `min` / `max`; solo los valores de la hoja, sin dados, sin `default`, nunca hecho de sí mismo; un efecto sobre él no cambia nada y el diario lo dice), `display` (cómo se dibuja: `number`, lo normal; `of`, el número y su máximo; `bar`, una barra; `boxes`, casillas; `pips`, puntos redondos; `dial`, un reloj redondo; `levels`, un nombre de `levels`; todos menos `number` y `levels` necesitan un `max`, y dibujan tantas casillas, puntos o segmentos como él; `of` y `bar` pueden llevar un `of` en su lugar), `of` (frente a qué lo dibujan `of` y `bar` cuando no es su máximo, un número o valores de la hoja entre llaves, `of: '{{self.values.capacity}}'`: nunca es un límite, el valor puede pasarse, y las partes de `tones` son partes de él), `levels` (con `display: levels`: nombres en orden, cada uno un id o `{ id, name, description }`, el primero para el `min` del valor o el 0; más allá se ve el número), `tones` (un color desde un valor hacia arriba, `{ 0: danger, 2: warning, 4: good }`, o desde una parte de su máximo tal como esté, `{ 0: danger, 50%: warning, 75%: good }` (necesita un `max`), entre `good`, `warning`, `danger` y `accent`; un umbral también puede ser valores de la hoja entre llaves, `'{{self.values.capacity}}': danger`), `group` (uno de `groups`, cada uno una tarjeta). `track: true`, la forma antigua, es `display: boxes`. Cómo se muestra un valor no cambia nada de cómo juega. Mira [Hoja](../systems/07-sheet.md#cómo-se-muestran-los-valores).
- `conditions`: `blocks` dice lo que todo el grupo no puede hacer mientras alguno de sus personajes lo tenga: una acción (`actions.<id>`), `travel.move`, o una forma de viajar (`modes.<id>`). El viaje dice quién lo tiene. `when` hace que **se cumpla por sí solo** mientras se cumpla una [condición](08-conditions.md); no se pone ni se quita a mano ni con efectos (un efecto sobre él no cambia nada, y el diario lo dice): lee al personaje como `self.*` (`self.values.dread: { gte: 6 }`, `self.conditions: wounded`, `self.tags`) y, en un viaje, el mundo como lo ven las tablas (`trip.mode: boat`, `time.season: winter`, `hex.terrain`…). Se recalcula tras cada cambio (un efecto, un resultado, un cambio a mano en la ficha, un paso del viaje, un turno del mundo); uno que lee el mundo lo sigue en el viaje, y fuera de uno (la aplicación Characters) se queda como estaba la última vez. Un estado es una condición con `when`; lo que pasa una vez (una línea, un efecto) es una [acción](10-actions-and-steps.md). `leaves: true` quita una copia de una [plantilla](#bestiarios) de los presentes en cuanto tiene el estado (por sí solo o por un efecto); a los personajes del propio grupo no les hace nada.
- `items` (opcional): lo que tiene todo objeto y dónde va. `fields`: números que tiene cada objeto, como los valores (`default`, `min`, `max`, `display`, `levels`, `tones`), y `spent: true` para uno que se gasta (al llegar a su `min` se acaba uno de ese objeto: la cantidad baja y el siguiente empieza de nuevo; necesita un `min`); nunca con el nombre de una clave propia de un objeto (`name`, `tags`, `count`, `place`…). `places`: dónde pueden ir los objetos, cada uno con `tags` (lo que lee `fits`), `room` (un número, o valores de la hoja entre llaves) y `over` (como el de la hoja, para este lugar). `size`: el campo que ocupa el sitio de un lugar (× cuántos; si falta: uno por objeto). `over`: si los lugares (y `room`) admiten más de su sitio: `allow` (por defecto: el sitio solo se muestra) o `refuse` (no entra nada que no tenga sitio: se rechaza moverlo ahí, y lo que dé un efecto va al primer lugar donde quepa con sitio, luego a un contenedor con sitio, luego a un lugar que admita más; lo que siga sin sitio queda como diga `full`); si el sitio encoge después, lo que ya hay se queda. `room`: cuánto lleva un personaje en total (un número, o los valores de la hoja entre llaves, `room: '{{self.values.capacity * 2}}'`), medido con `size` sobre todos los objetos, también los de dentro de contenedores y los que no están en ningún lugar; con `over: refuse` no se admite más, y cada lugar conserva su propio `over`. `full`: qué pasa con lo que da un efecto sin sitio libre, cuando ya entró todo lo que cabía: `leave` (por defecto: se queda atrás, con una línea en el diario) o `ask` (espera en la tarjeta del personaje en ningún lugar, y el viaje espera hasta que el jugador suelte algo o lo mueva a un lugar); una tarjeta nunca añade a mano lo que no tiene sitio. Lo que gana el grupo va primero a los personajes con sitio, y a uno cuya hoja pregunte si nadie tiene. `share`: cómo se reparte entre los personajes de esta hoja lo que el grupo gasta o gana de un objeto: `even` (lo normal: se quita a quien más lleva y se da a quien menos, de uno en uno) u `order` (primero el primer personaje); el **Preguntar quién da** de un viaje deja que el jugador lo cambie cada vez. `start`: lo que lleva un personaje nuevo de esta hoja, de los catálogos del sistema (`start: { ration: 2 }`); en la hoja del propio grupo, con lo que empieza un viaje nuevo. Un valor puede **salir de los objetos**: `from: { sum: items.slots }`, `{ max: items.armour, where: … }`, `{ min: … }`, `{ count: items }` (cuántos), con `where` una condición sobre cada objeto (`item.id`, `item.tags`, `item.place`, `item.within`, el lugar de más arriba, `item.inside`, dentro de un contenedor, sus campos) y su lugar (`place.tags`). Las tablas leen los objetos de un personaje como `characters.<id>.items.<objeto>.count` (y los campos del primero, `….items.torch.uses`), `….items.tags` (todas las etiquetas) `….places.<lugar>.used` / `.room` y `….carried.used` / `.room` (todo lo que lleva, frente a `room`); los efectos los cambian, `acting.items.torch: -1`, `party.members.items.torch.uses: -1`. Mira [Objetos](../systems/08-items.md) y los [catálogos](#catalogos-de-objetos).
- `relations`: a qué puede estar unido un personaje, por referencia (`character:mara`, `poi:<id>`, `region:<nombre>`, `hex:<col,fila>`, una nota…), cada relación de uno de estos tipos, con un número si el tipo tiene límites (`value: { min, max }`, dibujado con su propio `display` y `tones`, todos menos `levels`). Un viaje las lee donde está el grupo: `hex.related` (quién está unido a este hex, su región o un lugar en él) y `hex.relations.<tipo>`; el Hexmapper las dibuja como hilos desde el grupo (**Jugar → Mostrar relaciones**).
- Las condiciones y tablas leen cada personaje como `characters.<id>.…`, al que actúa ahora como `acting.…`, y los ids del grupo como `party.members`; los efectos los cambian (`party.members.values.health: 1`, `acting.conditions.wounded: true`). Mira [Lo que ven las tablas](04-what-tables-see.md#personajes).
- Se traduce como cualquier otro tipo, con la clave `sheet/<id>`, por valor, grupo, estado y relación (`values: { health: { name: Salud } }`), y los niveles por id (`values: { harm: { levels: { unhurt: Ileso } } }`).
- **La hoja del propio grupo** (`partySheet:` en su [sistema](#sistemas)) es una hoja como esta para el grupo en sí: lo que es de todo el grupo (moral, fatiga, mercenarios…), en cada viaje, viaje quien viaje, mientras los personajes se unen y se van. Las tablas la leen como `party.values.<id>`, `party.conditions` y `party.tags`; los efectos la cambian (`party.values.morale: -1`, `party.conditions.shaken: true`), dentro de sus límites; un viaje nuevo empieza con el `default` de cada valor. Lo que lleva el grupo es un valor de ella (`party.values.food`), u objetos: `party.items.<objeto>` son los suyos y los de sus personajes juntos (`party.items.ration.count`, todo objeto de los catálogos está ahí desde 0), un efecto sobre ellos (`party.items.ration: -3`) quita primero de los suyos y luego de los personajes según el `share` de su hoja, y lo ganado va a los personajes igual (a los suyos si no tiene ninguno); los `blocks` de sus estados detienen a todo el grupo. Una característica del grupo puede ser uno de sus valores (`stats: { morale: { from: { party: morale } } }`): la característica es ese valor, toma sus límites, y los efectos sobre `party.stats.morale` cambian la hoja. El viaje enseña su ficha encima de los personajes.

## Catálogos de objetos

Lo que pueden llevar los personajes de un sistema (`items:` en su [sistema](#sistemas), una lista: tantos catálogos como quiera). En la tarjeta de un personaje, **Añadir un objeto** los ofrece por su nombre; los efectos dan un objeto de ellos cuando un personaje aún no tiene ninguno. Lo que tiene todo objeto (sus campos) y dónde va (los lugares) lo dice el `items:` de la [hoja](#hojas).

```yaml
kind: items
id: gear
name: Gear
items:
  rope: { name: Rope, description: Fifty feet of hemp., tags: [climbing] }
  torch: { name: Torch, uses: 3, tags: [light] } # un número para un campo de la hoja
  mail: { name: Mail shirt, slots: 2, armour: 2, fits: { place.tags: worn } } # solo puesta
  backpack: { name: Backpack, fits: { place.tags: back }, holds: { room: 6, tags: [pack] } }
```

- Cada objeto, con un id con el que lo nombran los efectos y las tablas (nunca `tags`, sin puntos): `name`, `description`, `tags`, un número por cada campo que declara la hoja (si falta: el `default` del campo; un campo que la hoja no declara es un aviso), `fits` (una [condición](08-conditions.md) sobre el lugar, `place.id` y `place.tags`; si falta: cualquier lugar) y `holds` (un contenedor: `room`, cuánto cabe dentro, `tags`, qué es como lugar, y `over`, `allow` o `refuse` como un lugar de la hoja; si falta: el de la hoja).
- Un personaje guarda una copia de lo que tenía un objeto al cogerlo, así que se lee igual sean cuales sean los packs cargados; un objeto escrito a mano tiene un nombre, cuántos, sus etiquetas y los valores por defecto de la hoja.
- Dos catálogos con el mismo id de objeto: gana el primero de la lista.
- Se traduce con la clave `items/<id>`, por objeto (`items: { rope: { name: Cuerda } }`).
- Cómo se juega, con un ejemplo que seguir: [Objetos](../systems/08-items.md).

## Bestiarios

Plantillas de personajes de las que los resultados de un sistema hacen copias (`bestiary:` en su [sistema](#sistemas), una lista: tantos como quiera): criaturas y tipos de PNJ (un guardia, un bandido) por igual. Un efecto `present.<plantilla>: 3` hace tres copias donde está el grupo, cada una un personaje de la hoja de la plantilla que tira sus propios números; un viaje las guarda como **los presentes**, junto al grupo, hasta que se van. Los PNJ únicos no son plantillas: son personajes del plantel.

```yaml
kind: bestiary
id: beasts
name: Beasts
sheet: sheet.beast # la hoja de cada plantilla, salvo que una diga la suya
behind: leave # las copias que el grupo deja atrás desaparecen (sin él: se quedan)
templates:
  wolf:
    name: Wolf
    tags: [beast, pack]
    values: { health: '{{1d4+1}}', bite: 1 } # cada copia tira la suya
    token: { icon: 'game:wolf-head', kind: enemy } # cómo se dibuja en un mapa
  leader:
    like: wolf # una variante: lo del lobo, y lo que cambia
    name: Pack leader
    tags: [leader]
    values: { health: '{{2d4+2}}' }
  bandit:
    sheet: sheet.companion # un tipo de PNJ sobre la hoja de los personajes
    name: Bandit
    names: table.names # cada copia con un nombre de una tabla (sin él: Bandit, Bandit 2 y así)
    items: { knife: 1, ration: '{{1d2}}' } # de los catálogos del sistema
    conditions: [outlaw]
    behind: stay # esta se queda donde se la encontró
```

- Cada plantilla, por un id con el que la nombran los efectos y las tablas (nunca `all`, `count`, `tags` ni `ids`, sin puntos): `name`, `description`, `sheet` (una [hoja](#hojas) de este pack o de una dependencia; sin ella: la del bestiario), `values` (números, o `{{…}}` que tira cada copia; sin ellos: el `default` de la hoja), los `conditions` y `tags` con los que empieza, `cards`, `items` (cuántos de cada uno, de los [catálogos](#catalogos-de-objetos) del sistema, números o tiradas; sin ellos: el `items.start` de la hoja), `names` (una tabla, oráculo o generador que se tira para el nombre de cada copia), `token` (cómo se dibuja en un mapa: `icon`, `kind`, uno de `pc`, `npc` o `enemy`, y `color`), `behind` y `like`.
- `like`: una variante de otra plantilla de este bestiario: toma la hoja, los valores, los objetos, los textos y el token de esa, y añade sus etiquetas, estados y cartas; lo que escribe ella gana. Una plantilla que es variante de sí misma se rechaza.
- `behind`: qué pasa con las copias cuando el grupo deja su sitio: `stay` (lo normal: siguen ahí, y vuelven a estar presentes si el grupo vuelve) o `leave` (desaparecen, con una línea en el diario, así que la siguiente visita tira su encuentro de nuevo). El del bestiario, salvo que una plantilla diga otra cosa.
- Una copia se hace una vez: los cambios posteriores de la plantilla no tocan las copias ya hechas. Su id es el de la plantilla (`wolf`, `wolf-2`, `wolf-3`), y su nombre el de la plantilla, numerado (_Lobo 2_), o tirado en `names`.
- Un estado de la [hoja](#hojas) con `leaves: true` quita una copia de los presentes en cuanto lo tiene: uno que se cumple por sí solo (`down` con `when: { self.values.health: { lte: 0 } }`) o uno que pone un efecto (`routed`).
- Las tablas, las condiciones y los efectos llegan a ellas como `present.*` y `characters.<id>.*`: [Lo que ven las tablas](04-what-tables-see.md#los-presentes-present), [Sintaxis](09-syntax.md#cambiar-el-grupo-effects).
- Una plantilla cuya hoja no se encuentra es un problema; los valores y estados que su hoja no declara, y los objetos que no tiene ningún catálogo del sistema, son avisos.
- Un pack que añade un mapa o una campaña trae también sus bestiarios, después de los del sistema.
- Se traduce con la clave `bestiary/<id>`, por plantilla (`templates: { wolf: { name: Lobo } }`).

## Facciones

Los poderes del mundo de un sistema (`factions:` en su [sistema](#sistemas)): cada uno, un personaje de una [hoja](#hojas) (sus valores, estados y relaciones) que tiene hexes de un mapa, y juega un turno en cada **turno del mundo**. En la vista Mundo del Hexmapper se traen a un mapa, se dibujan y se juegan ([Facciones](../hexmapper/12-world.md#facciones)).

```yaml
kind: factions
id: default
name: Los poderes del reino
sheet: sheet.faction # la kind: sheet con la que se hace cada facción (de este pack, o pack/kind.id)
turn: table.faction-turn # lo que tira cada una en su turno: una tabla, oráculo, generador o mazo
every: 7 # días del reloj del mundo entre turnos (sin poner o 0: solo a mano)
factions:
  the-crown:
    name: La Corona
    color: '#c9a227' # sus tierras en el mapa
    values: { strength: 4 } # valores iniciales (el resto: los de la hoja)
    # Dónde empieza: las regiones en cualquier mapa que las tenga; los hexes solo en este
    # mapa del pack (su ruta en él, uno de los `maps:` de su sistema).
    territory: { regions: [The Royal Vale], map: maps/realm.otd.json, hexes: ['12,4'] }
  the-rebels:
    name: Los Rebeldes
    color: '#8b1e1e'
    turn: core/table.faction-turn # una tabla de turno propia (aquí, la de Core)
```

- Una **tabla de turno** ve a la facción a la que le toca como `faction.*` (`faction.values.strength`, `faction.territory`: cuántos hexes tiene, `faction.id`) y a todas como `factions.<id>.*`, además de lo del reloj del mundo. Los **efectos** de sus entradas cambian el mundo: `faction.values.strength: 1`, `faction.conditions.at-war: true`, `factions.the-rebels.values.strength: -1` (otra facción), `faction.territory: 1` (un hex más, desde su frontera: primero tierra de nadie, luego la de un vecino) o `-1`, `world.clocks.the-siege: 1` (un [reloj de progreso](#relojes-de-progreso), por su id).
- En todo lo demás (viajes, tiradas a mano, descubrimiento), `factions.<id>.*` y `hex.faction` (el id de la facción que tiene el hex) las leen: [Lo que ven las tablas](04-what-tables-see.md). En un mapa que las tenga, los resultados de un viaje también las cambian, y hacen avanzar los relojes de progreso del reloj del mundo: `factions.fort-keld.values.reputation: 1`, `world.clocks.the-wyrm-wakes: 1` (el peaje y las luces embrujadas de las Marcas Grises).
- Se traduce con la clave `factions/<id>`, por facción (`factions: { the-crown: { name: La Corona } }`). La `core/table.faction-turn` de Core es una tabla de turno para cualquier juego (crece, aguanta, conspira o pierde terreno).

## Relojes de progreso

Los relojes de progreso con los que empieza el mundo de un sistema (`clocks:` en su [sistema](#sistemas)): segmentos que se llenan según algo avanza (una amenaza, un plan, una temporada de saqueos), cada uno con qué es de él una vez lleno. Lo que pasa cuando uno se llena es cosa de las [reglas del mundo](#las-reglas-del-mundo). Llegan con el reloj del mundo al ponerlo en marcha (el panel Mundo del Hexmapper, la aplicación Campaign) ([Relojes de progreso](../hexmapper/12-world.md#relojes-de-progreso)); los viajes, las tablas y los turnos de las facciones los llenan con efectos, y las condiciones los leen.

```yaml
kind: clocks
id: default
name: Amenazas del reino
clocks:
  the-siege: # su id: cómo lo nombran las reglas (world.clocks.the-siege)
    name: El asedio de la capital
    description: Los rebeldes se atrincheran alrededor de las murallas.
    segments: 8 # cualquier número desde 1
    filled: 2 # ya lleno al poner en marcha el reloj del mundo (sin él: nada)
    then: reset # una vez lleno: keep (por defecto), se queda lleno; reset, vuelve a empezar; remove, desaparece
  the-reprisals:
    name: Represalias
    segments: 4
```

- **Lo llenan los efectos**, allí donde van efectos: los resultados y acciones de un viaje, una tabla tirada a mano en un mapa, el turno de una facción, una reacción del mundo. `world.clocks.the-siege: 1` llena un segmento, `-2` vacía dos, `'=0'` lo fija (vacío), `'{{1d3}}'` tira. **Lo leen las condiciones** y las tablas: `world.clocks.the-siege: { gte: 8 }` (lleno), `{{world.clocks.the-siege}}` en un texto.
- Las reglas nombran un reloj declarado por **su id**, aunque el jugador lo renombre en el mapa; uno creado a mano en el mapa se nombra por su nombre en minúsculas con guiones (_The Wyrm wakes_ es `the-wyrm-wakes`).
- **Cuando se llena**, una vez, es el momento `world.clocks.<id>.full`: pasan las reacciones del mundo a él (palabras en la cronología, una tabla tirada, efectos sobre relojes y facciones), y después se queda lleno, vuelve a empezar vacío o desaparece, según diga `then`. El viaje en marcha también lo oye ([Momentos del mundo](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)).
- Se traduce con la clave `clocks/<id>`, por reloj (`clocks: { the-siege: { name: El asedio } }`). `core/clocks.threat`, de Core, es un reloj para cualquier juego: la amenaza crece y vuelve a empezar al llenarse; `core/world.threat`, de Core, la hace golpear con uno de los giros de Core.
- El formato de pack 8 escribía lo que pasa al llenarse en el propio reloj (`onFull`); desde el formato 9 es una reacción del mundo.

## Las reglas del mundo

Lo que el mundo de un sistema hace por sí solo (`world:` en su [sistema](#sistemas)), haya o no un viaje en marcha: reacciones escritas como las acciones de un viaje, cada una con los momentos en que llega, sus condiciones y sus pasos. Se juegan allí donde se mueva el mundo (el panel Mundo del Hexmapper, la aplicación Campaign, el tiempo que avanza bajo un viaje). En la aplicación Systems: su pestaña **Mundo** ([Mundo](../systems/11-world.md)). Todos los momentos y el orden en que se juegan: [Qué reacciona a qué](11-what-reacts-to-what.md).

```yaml
kind: world
id: default
name: Cómo se mueve el reino
reactions:
  the-capital-falls: # su id: cómo la trae otra reacción (world.reactions.the-capital-falls)
    name: Cae la capital
    on: world.clocks.the-siege.full # al llenarse un reloj
    do:
      - say: Cae la capital. # una línea en la cronología
      - roll: table.the-fall # una tabla, oráculo, generador o mazo: su texto a la cronología, sus efectos aplicados
      - effects: { factions.the-crown.territory: -1, world.clocks.the-reprisals: 2 }
  news:
    on: world.turn # tras cada turno del mundo
    do:
      - say: 'Noticias del reino (el asedio: {{world.clocks.the-siege}}).'
  the-crown-breaks:
    on: { when: { factions.the-crown.values.strength: { lte: 0 } } } # una vez, al pasar a cumplirse
    unless: { world.events: truce-day } # solo mientras esto no se cumpla (también `when:`)
    do:
      - effects: { factions.the-rebels.values.strength: 1 }
      - do: world.turn # un turno del mundo al momento
        when: { factions.the-rebels.conditions: at-war } # este paso, solo mientras esto se cumpla
      - do: world.reactions.news # otra reacción (con sus propias condiciones)
  the-bridge:
    on: { when: { factions.the-crown.values.strength: { lte: 0 } } }
    params: # lo que puede preguntar al jugador
      who:
        name: Who takes the bridge?
        choices: [{ id: rebels, name: The Rebels }, { id: nobody, name: Nobody }]
    do:
      - pause: The bridge stands empty. # el mundo espera a Seguir (o `pause: true`)
      - ask: params.who # el mundo espera una opción
      - when: { params.who: rebels } # los pasos siguientes leen la respuesta
        effects: { factions.the-rebels.territory: 1 }
```

- **Momentos** (`on:`, uno o una lista): `world.turn` (tras cada turno del mundo), `world.clocks.<id>.full` (un reloj que se llena, por su id declarado o por su nombre como id), o una condición `{ when, unless }` sobre lo que muestra el mundo (`world.clocks.*`, `world.events`, `factions.<id>.*`, `time.*`), que llega una vez al pasar a cumplirse y otra solo después de haber dejado de cumplirse.
- **Pasos** (`do:`, en orden, cada uno una cosa, cada uno con su propio `when` / `unless`): `say` (con `{{…}}`), `roll`, `effects` (relojes y facciones; el `territory` de una facción cambia tierra en el mapa que se está jugando), `do` (`world.reactions.<id>` o `world.turn`), `pause` (`true` o un texto: el mundo espera a **Seguir**) y `ask` (`params.<id>`, uno de los `params` de la reacción, cada uno con `name`, `description` y `choices` como los de una acción, sin `default`: el mundo espera una opción, y los pasos siguientes la leen como `params.<id>`). Los pasos de un viaje (`time`, `travel.*`, `set`, `wait`, `with`) se rechazan: el mundo no tiene grupo.
- **Esperar**: una `pause` o un `ask` detiene el mundo; la campaña guarda lo que espera y lo que quedaba (`waiting`), y nada mueve el mundo hasta que el jugador responde; luego sigue lo que quedaba, en orden (los demás pasos de la reacción, las demás reacciones del momento, el `then` de un reloj lleno, los turnos que tocaban, los días que faltaban). Un viaje que salta las pausas salta también las del mundo.
- **Orden**: tras cualquier cosa que cambie el mundo, sus momentos en el orden en que pasaron (las reacciones de cada uno en el orden declarado), luego las condiciones, mirándolas otra vez hasta que no pase a cumplirse nada nuevo; avanzar el tiempo varios días mira el comienzo de cada día. La campaña guarda qué condiciones se cumplían (una campaña que no guardó nada da por visto lo que se cumple).
- **Bucles**: las reacciones que se traen unas a otras por momentos con nombre o por `do:` (una reacción en `world.turn` que hace `world.turn`, las reacciones de dos relojes que se llenan uno a otro) se rechazan al cargar el pack; las que hacen bucle por condiciones se paran tras 10 seguidas, con una línea en la cronología.
- Se traduce con la clave `world/<id>`, por reacción, sus pasos por su `id` (`reactions: { the-capital-falls: { name: Cae la capital, do: { falls: { say: Cae la capital. } } } }`, con `id: falls` en el paso: `say` y `pause`), sus preguntas por las suyas (`params: { who: { name: ¿Quién toma el puente?, choices: { rebels: Los rebeldes } } }`).

## Sistemas

Un sistema nombra, en un solo sitio, lo que usa una partida jugada con él: sus reglas de viaje, bindings, calendario, modelos de clima y de tierra, hojas, catálogos de objetos, bestiarios, facciones, relojes de progreso y reglas del mundo, y los packs cuyas tablas, oráculos y mazos trae consigo. Una campaña se juega con un sistema, compartido por sus mapas y viajes: lo elige la campaña de un mapa del Hexmapper en **Ajustes del mapa → Campaña → Sistema** (sus viajes, el calendario de su panel Mundo y su panel Oracle usan lo que trae el sistema), y un viaje de la aplicación Travel en la página del sistema (un viaje mantiene el sistema con el que empezó); ambos los muestran por su nombre.

```yaml
kind: system
id: default
name: The Grey Marches
description: A haunted frontier, travelled on foot, on horseback or by cart.
travel: travel-rules.default # sus reglas de viaje (kind: travel-rules, id: default)
bindings: bindings.default # sus bindings
calendar: calendar.marcher-reckoning # su calendario
sheet: sheet.companion # la hoja de sus personajes
partySheet: sheet.company # la hoja del propio grupo
factions: factions.default # los poderes de su mundo
clocks: clocks.default # los relojes de progreso con los que empieza su mundo
world: world.default # lo que su mundo hace por sí solo
items: [items.gear] # lo que pueden llevar sus personajes (catálogos de objetos)
bestiary: [bestiary.marches] # las plantillas de las que sus resultados hacen copias
weather: [weather.sky] # los modelos de clima que pueden usar sus bindings
land: [land.default] # sus modelos de tierra: los del descubrimiento y Generar
packs: [core] # packs cuyas tablas trae
maps: [maps/grey-marches.otd.json] # mapas de ejemplo, ficheros de este pack
```

- Todas las partes son opcionales. Sin `travel`, el sistema no viaja (Jugar y Travel lo dicen; su mundo, su oráculo y sus facciones se siguen jugando), y cualquier sistema puede nombrar las de Core, `travel: core/travel-rules.default`, las **reglas genéricas** (con `calendar: core/calendar.default`, cuyas partes del día nombran, y `bindings: core/bindings.default` con `weather: [core/weather.default]`, que tiran su comprobación de clima); sin `bindings`, ninguna tabla responde a sus comprobaciones (solo se apuntan en el diario, y detienen el viaje solo con `pause: true`) y el grupo no tiene características; sin `calendar`, el de por defecto; sin `weather`, sus bindings no pueden nombrar un modelo de clima; sin `land`, no tiene modelo de tierra con el que descubrir o generar; sin `clocks`, su mundo empieza sin relojes de progreso (se pueden seguir creando a mano); sin `partySheet`, el grupo no tiene hoja propia; sin `sheet`, su grupo se juega como un todo; sin `bestiary`, sus resultados no hacen copias de plantillas. El propio sistema de Core, `core`, es el que juega un mapa que no elige ninguno: [las reglas genéricas](../packs/01-core.md#las-reglas-genericas).
- Cada parte es una definición de este pack, por su kind y su id (`travel: travel-rules.default`), o de un pack del que depende (`travel: core/travel-rules.slow`, con `core` en sus `dependencies`). `packs` también lista dependencias; el pack del propio sistema siempre va incluido.
- **Su id:** un sistema con `id: default` se elige por el id de su pack (`grey-marches`), cualquier otro por pack e id (`grey-marches/winter`). Un pack puede declarar varios, p. ej. la misma tierra en verano y en invierno con otras reglas de viaje.
- `name` y `description` son lo que leen los jugadores (si falta el nombre, es el del pack); se traducen en `locales/<idioma>/` con la clave `system/<id>`, como los demás tipos.
- `maps` lista **mapas de ejemplo** en los que jugar el sistema: ficheros de mapa (`.otd.json`, lo que escribe **Guardar** en el Hexmapper) guardados en este pack, por su ruta en él (normalmente una carpeta `maps/`). El Hexmapper los ofrece en **Mapas → Mapas de ejemplo**, y el **Resumen** del sistema en la aplicación Systems los añade y los quita. Los mapas de ejemplo cuyos ficheros nombran la misma campaña (`campaign` en el fichero) se abren en una sola campaña y comparten su reloj del mundo y sus facciones: los dos mapas de las Marcas Grises. Los ficheros de mapa de un pack no son definiciones: nada más los lee.
- **Los packs antiguos** que tienen reglas de viaje pero no `kind: system` siguen funcionando: son un sistema con el nombre del pack, con sus reglas de viaje, bindings y calendario, y los modelos de clima y de tierra de todos los packs. En cuanto un pack declara un sistema, solo cuenta lo que declara.
- Un sistema viaja entero: el **Resumen → Exportar como .zip** de la aplicación Systems escribe su pack con todos los packs que necesita (los de `packs`, de los que vienen sus partes y sus dependencias), e **Importar un sistema (.zip)…** lo vuelve a leer ([Llevarlo a otra parte](../systems/04-overview.md#llevarlo-a-otra-parte)).

La aplicación Systems escribe uno en cada sistema nuevo, lo edita en el **Resumen** del sistema y declara el de un pack antiguo (**Declararlo**). Las Marcas Grises declaran el suyo en `system.yaml`.

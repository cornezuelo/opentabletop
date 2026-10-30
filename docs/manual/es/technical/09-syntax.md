# Sintaxis

Todo lo que puede escribir un pack, en un solo sitio: cada pieza de sintaxis, dónde va, todas las formas que toma y un ejemplo que funciona, con un enlace a la página que la explica a fondo. Los packs son datos sin más: nada de esto ejecuta código, así que un pack de cualquiera es seguro de cargar.

En las aplicaciones esta página está a un clic: **Sintaxis**, arriba en la columna de ayuda. Pulsa allí un ejemplo en `código` y entra en la casilla de texto o el editor YAML en el que estabas, donde estaba el cursor.

## Valores: `clave: valor`

Casi todas las casillas y casi todo el YAML son pares `clave: valor`.

| Escribe                               | Significa                                                        |
| ------------------------------------- | ---------------------------------------------------------------- |
| `place.terrain: forest`               | una palabra                                                      |
| `place.danger: 3`, `today.lost: true` | un número, un sí/no                                              |
| `place.terrain: [forest, hills]`      | una lista                                                        |
| `place.danger: { gte: 3 }`            | un valor dentro de otro (aquí, una comparación)                  |
| `count: '{{2d6}}'`                    | una [variable o tirada](#variables), entre comillas (mira abajo) |

- **En la casilla de un formulario**, escribe los pares sin llaves, separados por comas: `place.terrain: forest, place.danger: { gte: 3 }`. Una casilla que no se puede leer se pone roja y no se guarda. Donde un formulario construye una condición en filas, su botón **YAML** muestra esta casilla.
- **En YAML**, lo mismo entre llaves en una línea (`when: { place.terrain: forest }`) o un par por línea sangrada.
- **Las comillas** (`'…'`) mantienen un texto como texto. El YAML da a unos pocos caracteres un significado propio, así que un texto que los tenga va entre comillas, o el YAML lee otra cosa:
  - **que empiece por `{`**: el YAML abre un valor dentro de otro, así que toda variable o tirada necesita comillas: `count: '{{2d6}}'`, no `count: {{2d6}}`; `gte: '{{system.hoursPerDay}}'`, no `gte: {{system.hoursPerDay}}`;
  - **con `: ` dentro** (dos puntos y un espacio): el YAML lo toma por una clave nueva: `result: 'Emboscada: dos lobos'`;
  - **con ` #` dentro** (un espacio y una almohadilla): el YAML toma el resto por un comentario y lo descarta: `result: 'Puerta #3'`;
  - **que empiece por `- `** (un guion y un espacio): el YAML lo toma por un elemento de una lista: `result: '- nada -'`.

  Una comilla dentro de un texto entre comillas se escribe doble: `'El perro de la guardia d''Arcy'`. Si dudas, pon comillas: nunca estorban. Los formularios las ponen por ti.

- **Los nombres con puntos** llegan dentro de un valor: `party.stats.morale`, `party.values.food`, `party.items.ration.count`, `yesterday.lost`, `time.moons.ember`, `place.icon.guards`, `token.might`, `around.lake`. Todos los nombres que puede leer una tabla: [Lo que ven las tablas](04-what-tables-see.md).
- **Nombres completos y cortos**: cada dato del mapa, del viaje y del mundo tiene un nombre completo según de dónde sale, y casi todos uno corto: `place.terrain` / `terrain`, `time.season` / `season`, `system.hoursPerDay` / `hoursPerDay`, `trip.day` / `tripDay`, `world.events` / `events`; lo que lleva hecho el viaje, solo por su nombre completo (`trip.km`, `trip.hours`, `trip.taken.camp`, `trip.spent.food`…); además `party.*`, `today.*`, `yesterday.*`, `from.*`, `around.*`. Los dos leen el mismo valor; una característica con el mismo nombre no puede tapar el completo. La lista: [Nombres completos y nombres cortos](04-what-tables-see.md#como-leer-esta-pagina).

## Ids y referencias

- **Los ids** usan minúsculas, dígitos y guiones: `getting-lost`, `npc-roles`.
- **Las referencias** a una definición dicen qué es: su `kind`, tal como lo escribe la definición, y luego su id: `table.weather`, `oracle.ford`, `generator.npc`, `deck.omens`, `roll-modes.advantage`, `sheet.companion`, `calendar.marcher-reckoning`, `weather.sky`, `travel-rules.default`, `bindings.default`, `factions.default`, `clocks.default`. La de otro pack va tras su id y una barra: `core/table.twists` (el pack tiene que estar entre sus `dependencies`). La que elige una variable mantiene su kind delante: `'table.weather-{{time.season}}'`. Una referencia sin su kind (`weather`) no se lee: el problema dice cuál se quería (`write table.weather`).
- Donde un campo tira algo (el `table:` / `generator:` de una entrada o carta, el `resolve:` de un binding, el `turn:` de una facción, el `roll:` de un paso de una acción o de una reacción del mundo), puede ser una tabla, un oráculo, un generador o un mazo: el kind dice cuál (`table: generator.npc`, `resolve: oracle.ford`).
- Los `aliases` de un pack dan otro nombre a una referencia: `aliases: { table.twist: core/table.twists }`, y luego `table: table.twist`.
- Las entradas y las cartas también tienen id, para las traducciones y las entradas de una sola vez.
- **Dentro de un sistema**, lo que nombran sus reglas se escribe por su nombre completo, `subsistema.id`, para que siempre diga qué es: un momento (`trip.place-enter`, `time.day-end`, una parte del día `time.part.morning`, un reloj del mundo al llenarse `world.clocks.<id>.full`), una acción (`actions.camp`), una comprobación (`checks.ENCOUNTER`), una forma de viajar (`modes.horse`), seguir avanzando (`travel.move`), un parámetro de la acción (`params.how`). Los valores que compara una condición siguen cortos, porque su clave ya dice qué son: `trip.connections: road`, `place.terrain: forest`.

## Dados

En el `roll` de una tabla u oráculo, en el `roll` de un campo de generador y dentro de los textos como `{{…}}`. Más: [Dados, variables y contexto](../oracle/08-dice-and-templates.md).

| Escribe                      | Tira                                          |
| ---------------------------- | --------------------------------------------- |
| `1d6`, `3d8`, `d20`          | N dados de M caras, sumados (`dM` es `1dM`)   |
| `d%`, `d100`                 | de 1 a 100                                    |
| `d66`                        | dos d6 como decenas y unidades: 11 … 66       |
| `4dF`                        | dados Fudge, de −4 a +4                       |
| `2d6+1`, `1d6+1d4`, `1d20-2` | sumas y restas                                |
| `4d6kh3`, `2d20kl1`          | quedarse con los 3 más altos, con el más bajo |
| `1d6 + {{place.danger}}`     | más un valor (si falta, cuenta como 0)        |

Sin `roll`, una tabla elige por `weight` (1 si no tiene): `{ weight: 3, result: peregrino }`.

## Rangos

El `range` de una entrada son los totales que cubre: `3`, `2-5`, `-1` (un total bajo cero), `11-16` con `d66`. Los rangos no pueden solaparse; con **Ajustar totales** (`clamp: true`, lo normal) un total por debajo del más bajo toma la primera entrada y por encima del más alto, la última.

## Variables

`{{nombre}}` es una **variable**: el valor con ese nombre. `{{2d6}}` es una **tirada**. Dentro de un texto, cada una se escribe en su sitio; un valor que es entero un `'{{…}}'` es lo que nombra (un número sigue siendo un número; una lista, una lista). Más: [Dados, variables y contexto](../oracle/08-dice-and-templates.md#variables-en-los-textos).

| Escribe           | Es                                                           |
| ----------------- | ------------------------------------------------------------ |
| `{{2d6}}`         | una tirada: `'{{2d6}} lobos'` → «7 lobos»                    |
| `{{time.season}}` | una variable: un valor del contexto                          |
| `{{npc.role}}`    | una parte de un valor                                        |
| `{{result}}`      | el texto de la tabla que una entrada tiró después (`table:`) |
| `{{roll}}`        | en las entradas de una tabla, el total de su propia tirada   |
| `{{field}}`       | un campo de un generador, en su plantilla                    |

**Aritmética.** Dentro de las llaves se pueden sumar, restar, multiplicar y dividir números, valores y dados, con paréntesis y las funciones `floor`, `ceil`, `round` (a un número entero hacia abajo, hacia arriba, el más cercano), `min`, `max` (el menor o el mayor de varios) y `abs`. Los ids pueden tener guiones (`night-march`), así que un menos entre dos nombres lleva espacios: `a - b`. Un valor que no es un número, o una división entre 0, no da nada. Aritmética, nunca lógica: para un _si_, escribe una [condición](08-conditions.md).

| Escribe                                            | Es                                             |
| -------------------------------------------------- | ---------------------------------------------- |
| `'{{self.values.might * 2 + 4}}'`                  | el doble de un valor, más 4                    |
| `'{{self.values.maxHealth - self.values.health}}'` | un valor menos otro (espacios alrededor del −) |
| `'{{floor(party.stats.mouths / 2)}}'`              | la mitad, redondeando hacia abajo              |
| `'{{max(party.stats.survival, 1)}}'`               | al menos 1                                     |
| `'-{{1d6 + place.danger}}'`                        | en un efecto: quita una tirada más un valor    |

Un valor que falta no muestra nada. Las variables sirven en resultados, plantillas y campos fijos de generador, textos de cartas, valores de `set` y `effects`, referencias, [condiciones](08-conditions.md#variables-y-tiradas) (`gte: '{{party.stats.stealth}}'`, `gte: '{{1d20}}'`: una tirada es la misma durante todo un momento), y en **Cuando no se aplica nada** de una acción (`{terrain}`, ahí con llaves simples).

## Condiciones

Cuándo se aplica algo. La misma sintaxis en todas partes: `when` (debe cumplirse) y `unless` (no debe). Referencia completa: [Condiciones](08-conditions.md).

| Escribe                                                  | Se cumple cuando                                |
| -------------------------------------------------------- | ----------------------------------------------- |
| `place.terrain: forest`                                  | es exactamente eso                              |
| `place.terrain: [forest, hills]`                         | es cualquiera de ellos                          |
| `place.tags: landmark`                                   | una lista (etiquetas, festividades) lo contiene |
| `time.season: { not: summer }`                           | es cualquier otra cosa (o falta)                |
| `place.danger: { gte: 3 }`                               | `gt`, `gte`, `lt`, `lte`: un número comparado   |
| `place.danger: { gte: 2, lte: 4 }`                       | se cumplen todas las comparaciones              |
| `trip.weather: { in: [rain, storm] }`                    | lo mismo que una lista                          |
| `place.danger: { gt: '{{party.stats.stealth}}' }`        | una variable: comparado con otro valor          |
| `party.stats.wits: { gte: '{{1d20}}' }`                  | una tirada: bajo el ingenio (una por momento)   |
| `place.region: { exists: false }`                        | falta (`true`: está)                            |
| `{ place.terrain: forest, timeOfDay: night }`            | se cumplen todos los pares                      |
| `any: [{ trip.connections: road }, { trip.mode: boat }]` | se cumple uno de ellos                          |
| `all: [{ place.tags: ford }, { place.tags: toll }]`      | todos (un nombre dos veces)                     |
| `not: { timeOfDay: night }`                              | la condición de dentro no se cumple             |

**Dónde van:**

| Dónde                                                | Claves                                                |
| ---------------------------------------------------- | ----------------------------------------------------- |
| entradas de tablas y oráculos                        | `when`, `unless`                                      |
| campos de generador                                  | `when`, `unless`                                      |
| modos de tirada que se usan por sí solos             | `modeWhen`, `modeUnless` (por id del modo)            |
| características que salen de los personajes (`from`) | `when`, `unless` (leídas con cada personaje)          |
| un paso que espera                                   | `wait` (con `limit`)                                  |
| comprobaciones de viaje                              | `when`, `unless`                                      |
| acciones, y cada uno de sus pasos                    | `when`, `unless`                                      |
| formas de viajar                                     | `when`, `unless` (elegirla), `through` (por dónde va) |
| terrenos y agua                                      | `passable: { when, unless }`                          |

## Dar valores: `set`

En una entrada de tabla o una carta: valores que da el resultado, que leen el texto del resultado, la tabla que tira después, los campos siguientes de un generador y el viaje. Cualquier nombre: `set: { weather: storm, lostModifier: -1, count: '{{2d6}}' }`.

Lo que hace con ellos un viaje ([Conectar](../oracle/07-connecting.md#4-resultados-que-entiende-el-viaje)):

- `weather: <id>`: el clima de hoy.
- Un **valor del día** que declara el sistema (`lost: true`, `lostModifier: -1`): dura el resto del día y **bloquea** lo que lista, si lista algo. `false` lo quita (`set: { refusing: false }`).
- Cualquier otro nombre dura solo esa tirada (su texto, la tabla que tira después).
- Al día siguiente, los valores de hoy se leen como `yesterday.<nombre>`.

Un paso de una acción también acepta `set`: `{ set: { lost: true } }`.

## Cambiar el grupo: `effects`

En entradas, cartas, comprobaciones y pasos de acciones. Cada clave es un valor que declara el sistema, por su ruta; cada valor dice cómo cambia:

| Escribe                                                                 | Hace                                                                                                                                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `party.values.food: -1`                                                 | quita 1                                                                                                                                                                  |
| `party.stats.morale: 2`                                                 | suma 2                                                                                                                                                                   |
| `party.stats.fatigue: '=0'`                                             | lo pone a 0                                                                                                                                                              |
| `party.values.food: '{{1d3+1}}'`                                        | suma una tirada                                                                                                                                                          |
| `party.items.ration: '-{{party.stats.mouths}}'`                         | quita tantos como dice otro valor: de los objetos del grupo, primero los suyos y luego los de sus personajes según los reparta su hoja                                   |
| `party.stats.morale: '={{party.stats.charisma}}'`                       | lo pone al valor de otro                                                                                                                                                 |
| `party.values.food: '-{{1d3}}'`                                         | quita una tirada (en un viaje, la misma durante todo el momento)                                                                                                         |
| `party.members.values.health: 1`                                        | suma 1 a todos los personajes del grupo                                                                                                                                  |
| `party.values.morale: -1`, `party.conditions.shaken: true`              | la hoja del propio grupo (su `partySheet`)                                                                                                                               |
| `characters.kael.values.health: -1`                                     | quita 1 a un personaje, por su id                                                                                                                                        |
| `acting.conditions.wounded: true`                                       | el personaje que actúa ahora recibe un estado (`false` lo quita)                                                                                                         |
| `roles.lookout.values.health: -1`                                       | quien tenga un rol de viaje                                                                                                                                              |
| `acting.items.torch: -1`, `characters.kael.items.rope: 2`               | un objeto menos (empezando por los últimos; a 0 desaparece), o más (de los [catálogos](07-kinds.md#catalogos-de-objetos) del sistema si no tiene ninguno)                |
| `party.members.items.torch.uses: -1`                                    | un campo de la primera antorcha de cada uno (nada para quien no tenga); un campo que se gasta acaba con uno al llegar a su mínimo                                        |
| `faction.territory: 1`, `faction.values.strength: -1`                   | en la tabla de turno de una facción: sus tierras, sus valores                                                                                                            |
| `world.clocks.the-siege: 1`                                             | avanza un reloj de progreso (el turno de una facción, una reacción del mundo, o el resultado de un viaje en un mapa); `'=0'` lo fija                                     |
| `present.wolf: 3`, `present.wolf: '{{wolves}}'`                         | hace copias de una [plantilla](07-kinds.md#bestiarios) donde está el grupo (los presentes), cada una con sus propias tiradas; `-1` quita la última, `'=0'` todas         |
| `present.wolf.values.health: -2`, `present.all.conditions.routed: true` | todas las copias de una plantilla aquí, o todas las copias aquí; una copia por su id: `characters.wolf-2.values.health: -2`                                              |
| `place.pois.ruins: 1`                                                   | crea un [lugar](07-kinds.md#lugares) en el hex del grupo con su plantilla: en un mapa, un punto de interés con sus etiquetas en el hex; sin mapa, una línea en el diario |

Un cambio se detiene en el `min` / `max` del valor; lo que llegó a uno ese día se ve después como `trip.below` / `trip.above` (listas de nombres completos: `trip.below: party.values.food`). Sin límites, un valor puede ir a cualquier parte, también a negativo. Los valores de los personajes se detienen en los límites de su hoja; los efectos sobre personajes no hacen nada mientras el grupo no tenga ninguno, y `acting.…` nada mientras no actúe nadie (el diario lo dice). Mira [Personajes](04-what-tables-see.md#personajes).

## Momentos

Cuándo se tira una comprobación (`at:`) o el propio sistema hace una acción (`on:`). Un momento, o varios como lista (`[trip.place-enter, actions.rest]`); las condiciones y las tablas ven cuál es como `trip.moment`.

| Momento                                                                      | Cuándo                                                                                                            |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| una hora (`'06:00'`)                                                         | al dar esa hora, marchando, esperando o dormidos en el campamento                                                 |
| una parte del día (`time.part.morning`)                                      | al empezar esa parte del calendario, igual                                                                        |
| `trip.place-enter`                                                           | al entrar en cada hex                                                                                             |
| `time.day-end`                                                               | al acabar cada día, se acampe o no (primero acciones, luego comprobaciones)                                       |
| una acción (`actions.camp`)                                                  | cuando el grupo hace esa acción, antes de sus pasos (una comprobación que espera los deja en espera)              |
| el final de una acción (`actions.forage.done`)                               | cuando acaban sus pasos                                                                                           |
| una comprobación (`checks.WEATHER_CHECK_REQUIRED`)                           | justo después de resolverse (tras **Continuar**, si pausó), antes de las siguientes comprobaciones de su momento  |
| un reloj del mundo al llenarse (`world.clocks.<id>.full`)                    | al llenarse uno de los relojes de progreso de la campaña, lo llene lo que lo llene                                |
| un turno del mundo (`world.turn`)                                            | tras un turno del mundo de la campaña, lo traiga lo que lo traiga (el tiempo, una mano, un paso `do: world.turn`) |
| una condición al cumplirse (`{ when: { party.values.morale: { lte: 0 } } }`) | una vez, al cumplirse, sea lo que sea lo que la cambió; otra solo después de dejar de cumplirse                   |

Una comprobación sin `at` solo la tira un paso (`roll:`); una acción sin `on` es un botón. Todos los momentos, quién los oye y en qué orden llegan cuando pasan varios a la vez: [Qué reacciona a qué](11-what-reacts-to-what.md).

**Las reacciones del mundo** ([Las reglas del mundo](07-kinds.md#las-reglas-del-mundo)) llegan en momentos propios: `world.turn` (tras cada turno del mundo), `world.clocks.<id>.full` (un reloj que se llena) y condiciones que pasan a cumplirse (`{ when: { world.events: market-day } }`), miradas tras cualquier cosa que cambie el mundo y al empezar cada día por el camino.

**Un momento escrito como condición** (una reacción): `on: { when: …, unless: … }` (o `at:`), solo o en una lista junto a momentos con nombre. Se mira tras cada cambio de un viaje (un paso, un efecto, un resultado, un cambio a mano), leyendo lo que ven las tablas, y llega allí mismo. Lo que ya se cumple al empezar un viaje llega en su primer paso; un viaje guardado antes de que existieran las reacciones toma lo que se cumple entonces como ya visto. Con `for: party.members` se mira para cada miembro, leído y jugado con ese miembro como `acting`. Las reacciones que se desencadenan unas a otras se paran tras 10 seguidas. Más: [Momentos escritos como condiciones](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).

## Pasos de una acción

El `do:` de una acción es una lista de pasos, en orden; cada uno hace una cosa y puede tener su propio `when` / `unless`.

| Paso                                                            | Hace                                                                    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `time: 120`                                                     | pasan 120 minutos                                                       |
| `time: '14:00'`                                                 | hasta que vuelve a dar esa hora                                         |
| `time: time.meal.luncheon`                                      | hasta que vuelve a empezar una parte del día del calendario             |
| `travel.move: destination`                                      | se mueve por la ruta mientras se cumplen sus condiciones                |
| `travel.move: '{{params.until}}'`                               | hasta donde diga su parámetro (`place`, `3`…)                           |
| `travel.speed: 0.5`                                             | el resto del movimiento de hoy, a media velocidad                       |
| `effects: { party.stats.fatigue: -1 }`                          | cambia el grupo                                                         |
| `set: { lost: true }`                                           | da un valor del día                                                     |
| `do: actions.forage`                                            | hace otra acción, si se cumplen sus condiciones                         |
| `{ do: actions.march, with: { until: place } }`                 | otra acción, con sus parámetros                                         |
| `roll: checks.ENCOUNTER_CHECK_REQUIRED`                         | tira una comprobación ya (o `roll: table.ruins`: una tabla del Oráculo) |
| `travel.advance: 1`                                             | avanza un hex por la ruta, sin que pase el tiempo                       |
| `travel.mode: modes.boat`                                       | viaja de otra forma, si se puede elegir ahora                           |
| `say: Los porteadores cantan`                                   | una línea propia del sistema en el diario                               |
| `pause: true`                                                   | el viaje espera a **Continuar** (o un texto)                            |
| `ask: params.how`                                               | el jugador elige ya el parámetro `how`                                  |
| `{ wait: { today.ferry: true }, limit: '18:00' }`               | pasa el tiempo hasta que se cumpla, como mucho el límite                |
| `{ id: song, say: … }`                                          | da nombre a un paso para sus traducciones                               |
| `{ unless: { trip.below: party.values.food }, effects: { … } }` | solo cuando se cumple su condición                                      |

Marchar es una acción con un paso `travel.move`, comprobada mientras el grupo se mueve: su `when` / `unless` (ninguno: siempre que nada más lo impida; de día 8 horas: `when: { time.hour: { gte: 6, lt: 20 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }`). Los `params` de una acción son lo que se elige al hacerla: `params: { until: { choices: [destination, place, 3] } }`, leído como `{{params.until}}`. Cómo sigue el viaje por sí solo, `travel: { onward: { do: actions.march, with: { until: destination } } }`. La parada, `travel: { halt: { at: '20:00', do: actions.camp } }`, es lo que hace un grupo que no puede marchar mientras el tiempo avanza solo. Todos los pasos, con ejemplos: [Acciones y pasos](10-actions-and-steps.md). Además de `do`, una acción tiene `name`, `description`, `params`, `when` / `unless`, `on`, `oncePerDay: true`, `hideWhenUnavailable: true` (su botón se oculta mientras no se puede hacer) y `nothing` (lo que dice el diario cuando no se aplica ninguna de sus comprobaciones). Completo: [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).

## Lo que bloquea: `blocks`

Un valor del día lista lo que no se puede hacer mientras dura: `travel.move` (no se sigue avanzando), una acción (`actions.camp`, `actions.forage`) o una forma de viajar (`modes.horse`). Cada cosa por su nombre completo: qué es y luego su id. `values: { snowbound: { blocks: [modes.horse] } }`. Un estado de un personaje en una [hoja](07-kinds.md#hojas) bloquea igual mientras algún personaje del grupo lo tenga: `conditions: { sprained: { blocks: [travel.move] } }`; el viaje dice quién.

## Los personajes del grupo: `from` y `share`

En los bindings, cuando el sistema tiene hoja: una característica que sale de los valores de los personajes, `from: { max: survival }` (también `min`, `sum`, o `count: true`, con `when` / `unless` sobre cada personaje y `none` para cuando no cuenta ninguno), solo mientras el grupo tenga personajes. En la hoja, cómo se reparte entre ellos lo que el grupo gasta o gana de un objeto, `items: { share: even }` (u `order`), y lo que lleva un personaje nuevo, `items: { start: { ration: 2 } }`. Roles de viaje: `roles: { guide: { name: Guía } }`, que se leen como `roles.guide.…`. Mira [Bindings](07-kinds.md#bindings).

## Velocidades

Las reglas de viaje multiplican velocidades: el `multiplier` de un terreno o camino (`0.5` la mitad, `1` normal, `1.5` más rápido), el `speed` de un clima (`0` no se viaja), el `kmPerDay` de una forma de viajar (o sus `minutes` por paso), los `minutes` propios de una conexión, y `defaultTerrain` para los terrenos que no están en la lista. Las horas se escriben `'06:00'` (entre comillas); las duraciones, en minutos.

## Límites y paradas

| Escribe                                       | En                               | Hace                                 |
| --------------------------------------------- | -------------------------------- | ------------------------------------ |
| `once: true`                                  | entradas                         | sale una vez por sesión              |
| `maxOccurrences: 3`                           | entradas                         | como mucho 3 veces por sesión        |
| `onExhausted: reroll / next / none`           | tablas, oráculos                 | qué hace una entrada agotada         |
| `pause: true`                                 | entradas, cartas, comprobaciones | el viaje se para hasta **Continuar** |
| `oncePerDay: true`                            | acciones                         | una vez al día                       |
| `reshuffle: when-empty / manual / after-draw` | mazos                            | cuándo vuelven las cartas            |

## Descripciones

Las descripciones aceptan Markdown básico: una línea en blanco entre párrafos, `**negrita**`, `_cursiva_`, `` `código` ``, listas (`- elemento`), citas (`> …`) y enlaces a la web (`[texto](https://…)`); nada más, HTML incluido, se muestra como texto. En YAML, una larga va como bloque: `description: |-` y el texto sangrado debajo.

Las **etiquetas** clasifican lo que se tira: `tags: [people, names]` en una tabla, oráculo, generador o mazo, las palabras que elija el pack, que el **Filtrar** del Oráculo y de Mapa muestra u oculta (`rules`, en nuestros packs, para lo que tira el propio sistema).

## Traducciones

Nunca en línea: los textos de un pack se escriben una vez en su idioma base, y las traducciones van en capas `locales/<idioma>/<fichero>`, por id. Mira [Traducciones](../oracle/05-translations.md).

Cada tipo de definición, con un ejemplo entero: [Tipos de definición](07-kinds.md).

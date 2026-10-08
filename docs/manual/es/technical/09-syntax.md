# Sintaxis

Todo lo que puede escribir un pack, en un solo sitio: cada pieza de sintaxis, dónde va, todas las formas que toma y un ejemplo que funciona, con un enlace a la página que la explica a fondo. Los packs son datos sin más: nada de esto ejecuta código, así que un pack de cualquiera es seguro de cargar.

En las aplicaciones esta página está a un clic: **Sintaxis**, arriba en la columna de ayuda. Pulsa allí un ejemplo en `código` y entra en la casilla de texto o el editor YAML en el que estabas, donde estaba el cursor.

## Valores: `clave: valor`

Casi todas las casillas y casi todo el YAML son pares `clave: valor`.

| Escribe                    | Significa                                                        |
| -------------------------- | ---------------------------------------------------------------- |
| `terrain: forest`          | una palabra                                                      |
| `danger: 3`, `lost: true`  | un número, un sí/no                                              |
| `terrain: [forest, hills]` | una lista                                                        |
| `danger: { gte: 3 }`       | un valor dentro de otro (aquí, una comparación)                  |
| `count: '{{2d6}}'`         | una [variable o tirada](#variables), entre comillas (mira abajo) |

- **En la casilla de un formulario**, escribe los pares sin llaves, separados por comas: `terrain: forest, danger: { gte: 3 }`. Una casilla que no se puede leer se pone roja y no se guarda.
- **En YAML**, lo mismo entre llaves en una línea (`when: { terrain: forest }`) o un par por línea sangrada.
- **Las comillas** (`'…'`) mantienen un texto como texto. El YAML da a unos pocos caracteres un significado propio, así que un texto que los tenga va entre comillas, o el YAML lee otra cosa:
  - **que empiece por `{`**: el YAML abre un valor dentro de otro, así que toda variable o tirada necesita comillas: `count: '{{2d6}}'`, no `count: {{2d6}}`; `gte: '{{nightfall}}'`, no `gte: {{nightfall}}`;
  - **con `: ` dentro** (dos puntos y un espacio): el YAML lo toma por una clave nueva: `result: 'Emboscada: dos lobos'`;
  - **con ` #` dentro** (un espacio y una almohadilla): el YAML toma el resto por un comentario y lo descarta: `result: 'Puerta #3'`;
  - **que empiece por `- `** (un guion y un espacio): el YAML lo toma por un elemento de una lista: `result: '- nada -'`.

  Una comilla dentro de un texto entre comillas se escribe doble: `'El perro de la guardia d''Arcy'`. Si dudas, pon comillas: nunca estorban. Los formularios las ponen por ti.

- **Los nombres con puntos** llegan dentro de un valor: `party.stats.morale`, `party.resources.food`, `yesterday.lost`, `moons.ember`, `icon.guards`, `token.might`, `around.lake`. Todos los nombres que puede leer una tabla: [Lo que ven las tablas](04-what-tables-see.md).
- **Nombres completos y cortos**: cada dato del mapa, del viaje y del mundo tiene un nombre completo según de dónde sale, y casi todos uno corto: `hex.terrain` / `terrain`, `time.season` / `season`, `system.nightfall` / `nightfall`, `trip.day` / `tripDay`, `world.events` / `events`; lo que lleva hecho el viaje, solo por su nombre completo (`trip.km`, `trip.hours`, `trip.taken.camp`, `trip.spent.food`…); además `party.*`, `today.*`, `yesterday.*`, `from.*`, `around.*`. Los dos leen el mismo valor; una característica con el mismo nombre no puede tapar el completo. La lista: [Nombres completos y nombres cortos](04-what-tables-see.md#nombres-completos-y-nombres-cortos).

## Ids y referencias

- **Los ids** usan minúsculas, dígitos y guiones: `getting-lost`, `npc-roles`.
- **Las referencias** a una definición: `weather` (el mismo pack), `core/weather` (otro pack, por su id), o una que elige una variable: `'weather-{{season}}'`.
- Las entradas y las cartas también tienen id, para las traducciones y las entradas de una sola vez.

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
| `1d6 + {{danger}}`           | más un valor (si falta, cuenta como 0)        |

Sin `roll`, una tabla elige por `weight` (1 si no tiene): `{ weight: 3, result: peregrino }`.

## Rangos

El `range` de una entrada son los totales que cubre: `3`, `2-5`, `-1` (un total bajo cero), `11-16` con `d66`. Los rangos no pueden solaparse; con **Ajustar totales** (`clamp: true`, lo normal) un total por debajo del más bajo toma la primera entrada y por encima del más alto, la última.

## Variables

`{{nombre}}` es una **variable**: el valor con ese nombre. `{{2d6}}` es una **tirada**. Dentro de un texto, cada una se escribe en su sitio; un valor que es entero un `'{{…}}'` es lo que nombra (un número sigue siendo un número; una lista, una lista). Más: [Dados, variables y contexto](../oracle/08-dice-and-templates.md#variables-en-los-textos).

| Escribe        | Es                                                           |
| -------------- | ------------------------------------------------------------ |
| `{{2d6}}`      | una tirada: `'{{2d6}} lobos'` → «7 lobos»                    |
| `{{season}}`   | una variable: un valor del contexto                          |
| `{{npc.role}}` | una parte de un valor                                        |
| `{{result}}`   | el texto de la tabla que una entrada tiró después (`table:`) |
| `{{field}}`    | un campo de un generador, en su plantilla                    |

Un valor que falta no muestra nada. Las variables sirven en resultados, plantillas y campos fijos de generador, textos de cartas, valores de `set` y `effects`, referencias, [condiciones](08-conditions.md#variables-y-tiradas) (`gte: '{{party.stats.stealth}}'`, `gte: '{{1d20}}'`: una tirada es la misma durante todo un momento), y en **Cuando no se aplica nada** de una acción (`{terrain}`, ahí con llaves simples).

## Condiciones

Cuándo se aplica algo. La misma sintaxis en todas partes: `when` (debe cumplirse) y `unless` (no debe). Referencia completa: [Condiciones](08-conditions.md).

| Escribe                                     | Se cumple cuando                                |
| ------------------------------------------- | ----------------------------------------------- |
| `terrain: forest`                           | es exactamente eso                              |
| `terrain: [forest, hills]`                  | es cualquiera de ellos                          |
| `tags: landmark`                            | una lista (etiquetas, festividades) lo contiene |
| `season: { not: summer }`                   | es cualquier otra cosa (o falta)                |
| `danger: { gte: 3 }`                        | `gt`, `gte`, `lt`, `lte`: un número comparado   |
| `danger: { gte: 2, lte: 4 }`                | se cumplen todas las comparaciones              |
| `weather: { in: [rain, storm] }`            | lo mismo que una lista                          |
| `danger: { gt: '{{party.stats.stealth}}' }` | una variable: comparado con otro valor          |
| `party.stats.wits: { gte: '{{1d20}}' }`     | una tirada: bajo el ingenio (una por momento)   |
| `region: { exists: false }`                 | falta (`true`: está)                            |
| `{ terrain: forest, timeOfDay: night }`     | se cumplen todos los pares                      |
| `any: [{ edges: road }, { mode: boat }]`    | se cumple uno de ellos                          |
| `all: [{ tags: ford }, { tags: toll }]`     | todos (un nombre dos veces)                     |
| `not: { timeOfDay: night }`                 | la condición de dentro no se cumple             |

**Dónde van:**

| Dónde                             | Claves                                                |
| --------------------------------- | ----------------------------------------------------- |
| entradas de tablas y oráculos     | `when`, `unless`                                      |
| campos de generador               | `when`, `unless`                                      |
| modos de tirada que se usan solos | `modeWhen`, `modeUnless` (por id del modo)            |
| comprobaciones de viaje           | `when`, `unless`                                      |
| acciones, y cada uno de sus pasos | `when`, `unless`                                      |
| formas de viajar                  | `when`, `unless` (elegirla), `through` (por dónde va) |
| terrenos y agua                   | `passable: { when, unless }`                          |

## Dar valores: `set`

En una entrada de tabla o una carta: valores que da el resultado, que leen el texto del resultado, la tabla que tira después, los campos siguientes de un generador y el viaje. Cualquier nombre: `set: { weather: storm, lostModifier: -1, count: '{{2d6}}' }`.

Lo que hace con ellos un viaje ([Conectar](../oracle/07-connecting.md#4-resultados-que-entiende-el-viaje)):

- `weather: <id>`: el clima de hoy.
- Un **valor del día** que declara el sistema (`lost: true`): dura el resto del día y **bloquea** lo que lista. `false` lo quita (`set: { refusing: false }`).
- Los nombres que acaban en `…Modifier` o `…Impossible`, y `weather`: también se guardan el resto del día, para las tablas siguientes.
- Al día siguiente, los valores de hoy se leen como `yesterday.<nombre>`.

Un paso de una acción también acepta `set`: `{ set: { lost: true } }`.

## Cambiar el grupo: `effects`

En entradas, cartas, comprobaciones y pasos de acciones. Cada clave es un valor que declara el sistema, por su ruta; cada valor dice cómo cambia:

| Escribe                                           | Hace                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `party.resources.food: -1`                        | quita 1                                                          |
| `party.stats.morale: 2`                           | suma 2                                                           |
| `party.stats.fatigue: '=0'`                       | lo pone a 0                                                      |
| `party.resources.food: '{{1d3+1}}'`               | suma una tirada                                                  |
| `party.resources.food: '-{{party.stats.mouths}}'` | quita tantos como dice otro valor                                |
| `party.stats.morale: '={{party.stats.charisma}}'` | lo pone al valor de otro                                         |
| `party.resources.food: '-{{1d3}}'`                | quita una tirada (en un viaje, la misma durante todo el momento) |

Un cambio se detiene en el `min` / `max` del valor; lo que llegó a uno se ve después como `below: [ids]` / `above: [ids]`. Sin límites, un valor puede ir a cualquier parte, también a negativo.

## Momentos

Cuándo se tira una comprobación (`at:`) o el propio sistema hace una acción (`on:`). Un momento, o varios como lista (`[hex-enter, rest]`); las condiciones y las tablas ven cuál es como `moment`.

| Momento                                | Cuándo                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `day-start`                            | al alba, antes de marchar                                                   |
| `hex-enter`                            | al entrar en cada hex                                                       |
| `day-end`                              | al acabar cada día, se acampe o no (primero acciones, luego comprobaciones) |
| el id de una acción (`camp`, `forage`) | cuando el grupo hace esa acción                                             |

Una comprobación sin `at` solo la tira un paso (`roll:`); una acción sin `on` es un botón.

## Pasos de una acción

El `do:` de una acción es una lista de pasos, en orden; cada uno hace una cosa y puede tener su propio `when` / `unless`.

| Paso                                             | Hace                                            |
| ------------------------------------------------ | ----------------------------------------------- |
| `time: 120`                                      | pasan 120 minutos                               |
| `time: dawn`, `time: nightfall`, `time: '14:00'` | hasta entonces                                  |
| `speed: 0.5`                                     | el resto de la marcha de hoy, a media velocidad |
| `effects: { party.stats.fatigue: -1 }`           | cambia el grupo                                 |
| `set: { lost: true }`                            | da un valor del día                             |
| `do: forage`                                     | hace otra acción, si se cumplen sus condiciones |
| `roll: ENCOUNTER_CHECK_REQUIRED`                 | tira una comprobación ya                        |
| `{ unless: { below: food }, effects: { … } }`    | solo cuando se cumple su condición              |

`march` es la marcha del sistema (los botones de Viajar): solo `when` / `unless`, comprobados mientras el grupo marcha (por defecto: `when: { time.daylight: true, trip.marched: { lt: '{{system.hoursPerDay}}' } }`). Además de `do`, una acción tiene `name`, `description`, `when` / `unless`, `on`, `oncePerDay: true`, `hideWhenUnavailable: true` (su botón se oculta mientras no se puede hacer) y `nothing` (lo que dice el diario cuando no se aplica ninguna de sus comprobaciones). Completo: [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).

## Lo que bloquea: `blocks`

Un valor del día lista lo que no se puede hacer mientras dura: `travel` (no se marcha más), el id de una acción (`camp`, `forage`) o una forma de viajar como `mode.<id>` (`mode.horse`). `values: { snowbound: { blocks: [mode.horse] } }`.

## Velocidades

Las reglas de viaje multiplican velocidades: el `multiplier` de un terreno o camino (`0.5` la mitad, `1` normal, `1.5` más rápido), el `speed` de un clima (`0` no se viaja), el `kmPerDay` de una forma de viajar, y `defaultTerrain` para los terrenos que no están en la lista. Las horas se escriben `'06:00'` (entre comillas); las duraciones, en minutos.

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

## Traducciones

Nunca en línea: los textos de un pack se escriben una vez en su idioma base, y las traducciones van en capas `locales/<idioma>/<fichero>`, por id. Mira [Traducciones](../oracle/05-translations.md).

Cada tipo de definición, con un ejemplo entero: [Tipos de definición](07-kinds.md).

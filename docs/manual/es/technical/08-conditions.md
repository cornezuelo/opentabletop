# Condiciones

Una **condición** dice cuándo se aplica algo: una entrada que solo sale en bosques, una comprobación que solo se tira fuera de los caminos, una acción disponible solo con buen tiempo, un modo de tirada que se usa solo el día después de perderse. Se escriben igual en todas partes: `when` y `unless` en las entradas de tabla, los campos de generador, las comprobaciones, las acciones y sus pasos, las formas de viajar y los terrenos (`passable`), `through` (por dónde puede ir una forma de viajar), y `modeWhen` / `modeUnless` en tablas y oráculos, y `when` / `unless` en una característica del grupo que sale de sus personajes (`from`), leída con los valores de cada personaje.

Una condición es un conjunto de pares `nombre: lo que debe ser` sobre los valores que ve la tirada (mira [Qué ven las tablas](04-what-tables-see.md)). Se deben cumplir todos los pares. En la casilla de un formulario escribes los pares sin llaves (`hex.terrain: forest, hex.danger: { gte: 3 }`); en YAML, entre llaves (`when: { hex.terrain: forest, hex.danger: { gte: 3 } }`). La mayoría de los formularios (los de Systems y el Oracle) los construyen en cambio en filas de _qué lee · comparación · valor_, que escriben estos mismos pares: mira _Condiciones en filas_ en [Reglas → Acciones](../systems/05-rules.md#acciones).

Nada de una condición se ejecuta como código: los packs de cualquiera se cargan sin peligro.

## Comparar un valor

| Escribe                     | Se cumple cuando                                           | Ejemplo                                                  |
| --------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| `nombre: valor`             | el valor es exactamente ese                                | `hex.terrain: forest`, `today.lost: true`, `time.day: 1` |
| `nombre: [a, b, c]`         | el valor es cualquiera de ellos                            | `hex.terrain: [forest, dense-forest, heath]`             |
| `nombre: { eq: valor }`     | el valor es exactamente ese (lo mismo que `nombre: valor`) | `time.season: { eq: winter }`                            |
| `nombre: { not: valor }`    | el valor es cualquier cosa menos ese (también si falta)    | `time.season: { not: summer }`                           |
| `nombre: { not: [a, b] }`   | el valor no es ninguno de ellos                            | `trip.mode: { not: [boat, cart] }`                       |
| `nombre: { in: [a, b] }`    | el valor es cualquiera de ellos (lo mismo que una lista)   | `trip.weather: { in: [rain, storm] }`                    |
| `nombre: { gt: n }`         | el valor es un número **mayor que** n                      | `party.stats.morale: { gt: 0 }`                          |
| `nombre: { gte: n }`        | un número **mayor o igual que** n                          | `hex.danger: { gte: 3 }`                                 |
| `nombre: { lt: n }`         | un número **menor que** n                                  | `party.resources.food: { lt: 1 }`                        |
| `nombre: { lte: n }`        | un número **menor o igual que** n                          | `aroundCount: { lte: 2 }`                                |
| `nombre: { exists: true }`  | el valor está (sea el que sea)                             | `hex.icon.id: { exists: true }`                          |
| `nombre: { exists: false }` | el valor falta                                             | `hex.region: { exists: false }`                          |

Varias comparaciones sobre el mismo valor se deben cumplir todas: `hex.danger: { gte: 2, lte: 4 }` es 2, 3 o 4.

- **Los números** solo se comparan con números: `hex.danger: { gte: 3 }` no se cumple donde no hay peligro, ni donde se escribió como texto.
- **Las listas** del contexto, como las `tags` de un hex o las `holidays` del día, se cumplen cuando **contienen** el valor: `hex.tags: landmark` se cumple en un hex con las etiquetas `ford, landmark`; `hex.tags: [ford, toll]`, en uno con cualquiera de las dos.
- **Los valores que faltan** no encajan, salvo con `not` y `exists: false`.
- **Los nombres con puntos** leen dentro de un valor: `party.stats.survival`, `icon.guards`, `time.moons.pale`, `yesterday.lost`.
- **Los nombres completos** dicen de dónde sale un valor, y una característica con el mismo nombre no los tapa: `hex.terrain: forest` es `terrain: forest`, `time.part: night` es `part: night`, `trip.mode: boat` es `mode: boat`. Todos, con su nombre corto: [Lo que ven las tablas](04-what-tables-see.md#como-leer-esta-pagina).

## Variables y tiradas: `{{…}}`

Un valor escrito como `'{{nombre}}'` es una **variable**: otro valor del contexto, leído al comprobar la condición, en vez de uno fijo. Escrito como `'{{dados}}'` es una **tirada**. Cualquiera de las dos va donde va un valor: tras `gte`, `lt`…, en una lista, tras `not`. En YAML, **ponlas entre comillas** (`'{{system.hoursPerDay}}'`): sin comillas, las llaves abren un valor dentro de otro (ver [Sintaxis](09-syntax.md#valores-clave-valor)).

| Escribe                                                     | Se cumple cuando                                          |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `hex.danger: { gt: '{{party.stats.stealth}}' }`             | el peligro supera el sigilo del grupo                     |
| `time.hour: { gte: '{{system.part.night}}' }`               | es cuando empieza la noche del calendario, o más tarde    |
| `party.stats.fatigue: { gte: '{{party.stats.endurance}}' }` | la fatiga ha llegado al aguante                           |
| `hex.faction: '{{rival}}'`                                  | la facción del hex es la del valor `rival`                |
| `hex.tags: '{{wanted}}'`                                    | el hex tiene alguna de las etiquetas de la lista `wanted` |
| `party.stats.wits: { gte: '{{1d20}}' }`                     | un d20 saca el ingenio del grupo o menos                  |
| `hex.danger: { gt: '{{1d6}}' }`                             | un d6 saca menos que el peligro                           |

Una variable que no está (o que no es un número, tras `gte`…) nunca se cumple. Solo un valor entero es una variable: `'the {{rival}}'` es ese texto, tal cual.

**Una tirada es la misma durante todo un momento.** Donde se vuelva a leer en el mismo momento, los mismos dados dan el mismo total, así que lo que decide no cambia al volver a mirarlo:

- En un **viaje** (comprobaciones, acciones y sus pasos, la marcha, formas de viajar, terrenos y `through`), un momento es el día, el hex y lo que está pasando: un momento como `trip.hex-enter` o `time.day-end`, o la acción que se hace (`march` para la marcha). Una acción cuyo `when` tira `'{{1d20}}'` está disponible o no todo el día en ese hex, la ruta no cambia mientras la planeas, y los efectos de la acción ven la misma tirada. Cada viaje tira las suyas.
- En una **tabla** (entradas, campos de generador, `modeWhen` / `modeUnless`), un momento es una tirada de la tabla, con lo que tire después: una entrada con `when` y otra con `unless` sobre el mismo `'{{1d20}}'` ven el mismo d20, así que sale una de las dos (una tirada por debajo). La tarjeta del resultado muestra la tirada. Una tabla con tirada propia da además a sus entradas ese total como `'{{roll}}'`: `party.stats.survival: { gte: '{{roll}}' }` es una tirada por debajo con el propio dado de la tabla (mira [Dados y variables](../oracle/08-dice-and-templates.md)).

**Las condiciones de una comprobación se leen justo antes de tirarla.** Las comprobaciones de un momento llegan una a una, en el orden en que las listan las reglas: el `when` / `unless` de cada una ve lo que fijaron las anteriores (el clima recién tirado, un valor del día, sus `effects`). Al alba, después de la del clima, `when: { trip.weather: storm }` lee la tormenta de hoy.

Todo lo que puede leer una condición está en [Qué ven las tablas](04-what-tables-see.md); los dados, en [Dados y variables](../oracle/08-dice-and-templates.md).

## Juntar condiciones

| Escribe      | Se cumple cuando                  | Ejemplo                                                                      |
| ------------ | --------------------------------- | ---------------------------------------------------------------------------- |
| varios pares | se cumplen todos                  | `{ hex.terrain: forest, timeOfDay: night }`                                  |
| `all: [ … ]` | todas las condiciones de la lista | `all: [{ hex.terrain: [forest, dense-forest] }, { hex.danger: { gte: 5 } }]` |
| `any: [ … ]` | al menos una                      | `any: [{ trip.edges: road }, { trip.edges: river }, { trip.mode: boat }]`    |
| `not: { … }` | la condición de dentro no         | `not: { timeOfDay: night }`                                                  |

`all`, `any` y `not` cuentan como un par más junto a los otros: `{ hex.tags: market, any: [{ time.weekday: marketday }, { world.events: market-day }] }` es un pueblo con mercado en cualquiera de los dos días. Se anidan: `{ all: [{ time.moons.ember: full }, { not: { hex.tags: haunted } }] }`. `all` hace falta cuando un valor aparece dos veces, porque un par solo se puede escribir una vez (`{ all: [{ hex.tags: ford }, { hex.tags: toll }] }`: un hex con las dos etiquetas).

`not` tiene dos sentidos según lo que le sigue: `time.season: { not: summer }` compara un valor; `not: { time.season: summer }`, arriba del todo, da la vuelta a una condición entera. Aquí se cumplen en los mismos casos; con más pares dentro, la segunda dice «no todos estos».

## `when` y `unless`

- `when` se debe cumplir para que se aplique; sin él, se aplica siempre.
- `unless` **no** se debe cumplir; sin él, nada lo impide.
- Con los dos, se miran los dos: `when: { hex.terrain: forest }, unless: { trip.edges: road }` es un bosque al que no se llega por camino.
- **Cuando una detiene una acción o una marcha, el viaje dice por qué**: los pares que han fallado, con lo que han leído y lo que pedían (cada rama de un `any` que falla; en un `unless`, los pares que se cumplían). En el tooltip de un botón y en el diario: _la hora es 21:00: hace falta menos de 20:00_, _A la luz de las antorchas no se cumple_, _el clima es storm_ (un `unless`). Los datos se nombran para los jugadores cuando el viaje los conoce (la hora, la marcha del día, el clima, el terreno, una característica o un valor del día por el nombre del sistema), el resto tal como están escritos.

## Dónde las verás, en las Marcas Grises

- Entradas: la Sierpe de la tabla de encuentros, `when: { all: [{ hex.terrain: [forest, dense-forest] }, { hex.danger: { gte: 5 } }] }`; la cacería, `when: { all: [{ time.moons.ember: full }, { timeOfDay: night }] }`; la patrulla del Valle, `when: { hex.region: { eq: Ashford Vale } }, unless: { timeOfDay: night }`.
- Campos de generador: la trampa de _Explorar una ruina_, `when: { danger: { lte: 2 } }`, y su ruina intacta, `unless: { untouched: { lt: 90 } }`.
- Comprobaciones: los encuentros `at: [trip.hex-enter, actions.rest]`, `when: { any: [{ trip.moment: trip.hex-enter, time.tags: { not: dark }, hex.danger: { gt: '{{party.stats.stealth}}' } }, { trip.moment: actions.rest, hex.danger: { gte: 3 } }] }`, `unless: { trip.edges: road }`; perderse, `unless: { any: [{ trip.edges: [road, river] }, { trip.mode: boat }] }`; el vado, `when: { all: [{ hex.tags: ford }, { not: { trip.mode: boat } }] }`.
- Acciones y pasos: buscar comida, `unless: { trip.weather: storm }`; la noche bien comidos de la acampada, `unless: { trip.below: food }`; comer forraje, `when: { trip.mode: horse }`; los pasos del transbordador tras su pregunta, `when: { params.fare: wait }`, y su espera a Brenna, `wait: { time.part: [afternoon, evening] }` (un paso que espera hasta que se cumpla su condición: mira [Acciones y pasos](10-actions-and-steps.md#esperar-algo-wait-y-limit)).
- Formas de viajar: la barca va `through: { any: [{ hex.water: true }, { hex.terrain: coast }] }` y se sube `when: { any: [{ hex.water: true }, { hex.terrain: coast }, { hex.tags: ferry }] }` (solo se elige a la orilla o en el transbordador; si no, sale desactivada en el panel del viaje, diciendo por qué).
- Terrenos: los picos son `passable: { when: { time.season: summer }, unless: { trip.weather: [snow, storm] } }`; los lagos, `passable: { when: { time.month: [deepwinter, wolfmoon] } }` (helados). Ven el hex al que se entra y el momento, como `through`.

Un valor del día no es una condición, pero funciona como una: mientras se cumple, **bloquea** lo que lista (`blocks: [travel.move]`, una acción, `actions.forage`, una forma de viajar, `modes.horse`). Mira [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

- Modos de tirada: perderse con desventaja al día siguiente, `modeWhen: { roll-modes.disadvantage: { yesterday.lost: true } }`; el _Con buena labia_ propio de las puertas cuando el Carisma supera a los guardias, `modeWhen: { roll-modes.charm: { party.stats.charisma: { gt: '{{icon.guards}}' } } }`.
- Variables y tiradas: acampar y descansar mientras `party.stats.fatigue: { lt: '{{party.stats.endurance}}' }`; encuentros solo donde `hex.danger: { gt: '{{party.stats.stealth}}' }`; el d6 del peaje bajo el Carisma, `party.stats.charisma: { gte: '{{1d6}}' }`; el d6 de la _Pesca_ bajo la Supervivencia con la propia tirada de la tabla, `party.stats.survival: { gte: '{{roll}}' }`; un día largo, `trip.marched: { gt: '{{system.hoursPerDay}}' }`.
- El viaje y el mundo: el santuario solo la primera vez, `trip.visits: 1`; morriña en `trip.day: [10, 20, 30]`; fuera del Bosque Gris, `from.region: The Greywood`; pescar junto al agua, `around.water: true`; día de mercado, `any: [{ time.weekday: marketday }, { world.events: market-day }]`; la Sierpe cuando `world.clocks.the-greywood-wyrm-wakes: { gte: 6 }`.
- Personajes: la Supervivencia del mejor de los que no están heridos, `from: { max: survival, unless: { conditions: wounded } }`; curar a los heridos solo mientras alguien lo esté, `party.stats.wounded: { gte: 1 }`, y solo quien actúe con `acting.values.survival: { gte: 2 }`.

Cuando una condición está mal escrita (un operador desconocido, una lista donde va un número), el pack muestra un problema en esa línea al cargar.

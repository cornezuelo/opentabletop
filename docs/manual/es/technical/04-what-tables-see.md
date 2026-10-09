# Lo que ven las tablas

Cada tirada recibe un **contexto**: valores que una tabla puede usar en sus dados (`{{danger}}`), sus textos y sus condiciones (`when: { danger: { gte: 2 } }`). Esta página es la referencia de cada valor: su nombre, qué tipo de valor es, los valores que puede tomar y de dónde salen (y dónde verlos en las aplicaciones). Al final, cuál gana cuando dos tienen el mismo nombre.

## Cómo leer esta página

Cada valor tiene un **nombre completo** que dice de dónde sale (`hex.terrain`) y casi todos también un **nombre corto** (`terrain`). Los dos leen el mismo valor: `terrain: forest` y `hex.terrain: forest` se cumplen en los mismos hexes, y `{{season}}` escribe lo mismo que `{{time.season}}`.

| Nombres completos    | De qué tratan                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `hex.*`              | [el hex](#el-hex-hex): su id, terreno, etiquetas, región, icono y sus propios valores             |
| `time.*`             | [el momento](#el-momento-time): estación, día, hora, luz del día y el calendario                  |
| `system.*`           | [el día del propio sistema](#el-dia-del-sistema-system), como números                             |
| `trip.*`             | [el viaje](#el-viaje-trip): su día, la forma de viajar, el clima, lo que ha hecho                 |
| `world.*`            | [el reloj del mundo](#el-mundo-world-y-las-facciones) (Hexmapper)                                 |
| `party.*`            | [el grupo](#el-grupo-party): sus características, provisiones y personajes                        |
| `today.*`            | [los valores del día](#los-valores-del-dia-today-yesterday), y `yesterday.*` los del día anterior |
| `from.*`, `around.*` | [el hex que se deja y los de alrededor](#alrededor-del-grupo-from-around)                         |

- **Los nombres cortos** se escriben antes, y son los que escribes en la caja **Contexto** del Oracle: `terrain: forest` ahí también rellena `hex.terrain`.
- **Los nombres completos** no se pueden tapar: una característica del grupo, un valor del día o el contexto de un binding llamado `weather` o `day` ocupa el nombre corto (ver [Qué valor gana](#que-valor-gana)), nunca el completo. Las reglas de viaje de las Marcas Grises los usan; Core y las reglas genéricas usan los cortos.

**Tipos de valor** en las tablas de abajo: un **número** (`3`, `14.5`: se suma en los dados y se compara con `gt` / `gte` / `lt` / `lte`), **sí/no** (`true` / `false`), **texto**, un **id** (un texto que declara el sistema o el mapa: `forest`, `market-day`), una **lista** (varios ids a la vez: una condición se cumple si la lista tiene el que se pide, `hex.tags: landmark`) o un **grupo** (nombres dentro: `hex.icon.guards`). Un valor que no está cuenta como **0** en los dados y **no cumple** en las condiciones (salvo con `exists: false` o `not`): mira [Condiciones](08-conditions.md).

**Dónde** dice qué aplicaciones lo dan: **Hexmapper** (un mapa: el hex seleccionado, o el del grupo en un viaje), **Travel** (un viaje sin mapa: una fila de hexes, cada uno con su terreno, sus etiquetas y los caminos hasta el siguiente), **viaje** (un viaje en cualquiera de las dos), **tiradas a mano** (el panel o la aplicación Oracle).

## El hex, `hex.*`

Del hex seleccionado, del del grupo en un viaje, o del hex del que trata una comprobación (al que se entra, en el que se hace una acción).

| Nombre completo                       | Corto     | Tipo                  | Valores, y de dónde salen                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | --------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hex.id`                              | —         | id                    | La clave del hex: columna y fila contadas desde 0 (`"4,2"`), sea cual sea el formato de coordenadas del mapa (`0503`). Está junto a las coordenadas en el panel del hex. En Travel, su lugar en el camino (`"0"`, `"1"`…).                                                                                           |
| `hex.terrain`                         | `terrain` | id                    | El id del terreno (`forest`, `dense-forest`, `lake`…), nunca su nombre, en ningún idioma. La paleta del mapa decide cuáles hay: **Editar paleta** enseña cada id, y el panel del hex el del hex. No está en un hex en blanco.                                                                                        |
| `hex.water`                           | `water`   | sí/no                 | `true` cuando el terreno está marcado como **Agua** en la paleta (en Travel: `lake`, `sea`, `deep-sea`). `false` si no.                                                                                                                                                                                              |
| `hex.tags`                            | `tags`    | lista de textos       | Las etiquetas del hex (`landmark`, `ford`, `shrine`…): lo que escribas en sus **Etiquetas** (sugiere las que ya se usan en el mapa). Lista vacía si no tiene.                                                                                                                                                        |
| `hex.region`                          | `region`  | texto                 | El **nombre** de la región tal como está escrito (`Ashford Vale`), no su id. Solo en el Hexmapper. La herramienta **Regiones** las lista.                                                                                                                                                                            |
| `hex.<valor>`                         | `<valor>` | número, sí/no o texto | Cada valor de la **región** del hex, y luego los **del propio hex** (el del hex gana con el mismo nombre): `danger`, `elevation`… Escrito como `3` es un número, `true` / `false` sí/no, lo demás texto. El panel del hex lista los suyos y, debajo, los que le vienen de su región. Solo en el Hexmapper.           |
| `hex.name`                            | `name`    | texto                 | El nombre del hex, si tiene. Solo en el Hexmapper.                                                                                                                                                                                                                                                                   |
| `hex.icon`                            | `icon`    | grupo                 | El icono del hex: `icon.id`, su id (`game:castle`; las imágenes importadas `asset:<id>`: se ve bajo la paleta de la herramienta Iconos, en sus ayudas y en el panel del hex), y cada uno de sus valores por nombre (`icon.guards`), con los tipos de arriba. No está si el hex no tiene icono. Solo en el Hexmapper. |
| `hex.faction`                         | —         | id                    | El id de la facción que tiene el hex (`iron-clans`), con facciones en el mapa. Solo en el Hexmapper.                                                                                                                                                                                                                 |
| `hex.pois`                            | —         | lista de ids          | Los ids de los lugares (PDI) del hex: a los que apuntan las relaciones de los personajes (`poi:<id>`). Solo en el Hexmapper.                                                                                                                                                                                         |
| `hex.related`, `hex.relations.<tipo>` | —         | lista de ids          | Los personajes unidos al hex, a su región o a un lugar en él, según sus relaciones (`hex.related: mara`); por tipo de relación (`hex.relations.home: mara`). Mira [Personajes](#personajes).                                                                                                                         |

Ejemplos: `when: { hex.terrain: [forest, dense-forest] }` (cualquiera de los dos), `when: { hex.tags: ford }`, `when: { hex.danger: { gte: 3 } }`, `when: { hex.icon.id: game:castle }`, `'1d6 + {{icon.guards}}'`, `when: { hex.region: Ashford Vale }`.

Los puntos de interés guardan sus valores en el mapa y en su fichero, pero las tablas no los leen: un hex puede tener varios.

**El token seleccionado** (tiradas a mano desde el panel Oracle del Hexmapper), `token.*`:

| Nombre                            | Tipo         | Valores, y de dónde salen                                                                                                                           |
| --------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token.name`                      | texto        | Su nombre.                                                                                                                                          |
| `token.kind`                      | id           | `pc`, `npc`, `enemy` o `party` (el **Tipo** de su panel).                                                                                           |
| `token.<valor>`                   | como `hex.*` | Cada valor escrito en su panel (`token.fare`).                                                                                                      |
| `token.values.<id>`, `token.<id>` | número       | Con **hoja** (Darle una hoja): cada valor de la hoja (`token.values.health`, también `token.health`); los ids, los que declara la hoja del sistema. |
| `token.conditions`, `token.tags`  | lista de ids | Los estados de su hoja que tiene ahora (`token.conditions: wounded`), y sus etiquetas.                                                              |
| `token.relations.<tipo>`          | lista        | Sus relaciones por tipo, como las de un personaje.                                                                                                  |

## El momento, `time.*`

En un viaje, y en las tiradas a mano mientras hay un viaje o el reloj del mundo en marcha.

| Nombre completo   | Corto        | Tipo         | Valores, y de dónde salen                                                                                                                                                |
| ----------------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `time.season`     | `season`     | id           | `spring`, `summer`, `autumn`, `winter`; con un calendario propio del sistema, las estaciones que nombran sus meses (Sistemas → **Calendario**).                          |
| `time.day`        | `day`        | número       | El número de día desde el inicio del calendario (1, 2…).                                                                                                                 |
| `time.daylight`   | `daylight`   | sí/no        | `true` entre el alba y el anochecer del sistema (Sistemas → **Reglas** → El día), `false` de noche (al acampar, en una marcha nocturna).                                 |
| `time.hour`       | `hour`       | número       | La hora con los minutos como fracción: `14.5` son las 14:30, `0` la medianoche, hasta `23.98…`. `time.hour: { gte: 18 }`: desde las seis de la tarde.                    |
| `time.watch`      | `watch`      | número       | La guardia del día, de 1 al número de guardias, cuando el calendario divide el día en guardias (el de por defecto: seis de cuatro horas, la 1 de medianoche a las 4:00). |
| `time.month`      | `month`      | id           | Con un calendario propio del sistema: el id del mes (Sistemas → **Calendario**: el id de cada mes).                                                                      |
| `time.monthDay`   | `monthDay`   | número       | Con un calendario propio del sistema: el día del mes, desde 1.                                                                                                           |
| `time.year`       | `year`       | número       | Con un calendario propio del sistema: el año.                                                                                                                            |
| `time.weekday`    | `weekday`    | id           | Con un calendario con días de la semana: el id del de hoy.                                                                                                               |
| `time.moons.<id>` | `moons.<id>` | id           | Con lunas en el calendario: la fase de cada luna por el id de la luna: `new`, `waxing`, `full` o `waning` (`time.moons.pale: full`).                                     |
| `time.holidays`   | `holidays`   | lista de ids | Con fiestas en el calendario: los ids de las de hoy (vacía casi todos los días).                                                                                         |

## El día del sistema, `system.*`

Números de las reglas del propio sistema (Sistemas → **Reglas**), para compararse con ellos sin escribirlos dos veces: `time.hour: { gte: '{{system.nightfall}}' }`.

| Nombre completo      | Corto         | Tipo   | Valores                                        |
| -------------------- | ------------- | ------ | ---------------------------------------------- |
| `system.dawn`        | `dawn`        | número | Su alba como hora (`6`; `6.5` para las 06:30). |
| `system.nightfall`   | `nightfall`   | número | Su anochecer como hora (`20`).                 |
| `system.hoursPerDay` | `hoursPerDay` | número | Sus horas de marcha al día (`8`).              |

## El viaje, `trip.*`

En un viaje (Jugar en el Hexmapper, Travel), para sus comprobaciones y acciones, y en las tiradas a mano durante él.

| Nombre completo                                     | Corto            | Tipo         | Valores, y de dónde salen                                                                                                                                                                                                              |
| --------------------------------------------------- | ---------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trip.day`                                          | `tripDay`        | número       | El día de este viaje: 1 el día que empezó.                                                                                                                                                                                             |
| `trip.mode`                                         | `mode`           | id           | El id de la forma de viajar (`foot`, `horse`, `boat`…): las del sistema (Sistemas → **Reglas** → Formas de viajar); el selector del viaje enseña sus nombres.                                                                          |
| `trip.weather`                                      | `weather`        | id           | El clima de hoy cuando una tabla o un modelo de clima lo ha fijado: los ids que declara el clima del sistema (Sistemas → **Reglas** → Clima, o los modelos de **Clima**). No está hasta entonces.                                      |
| `trip.edges`                                        | `edges`          | lista de ids | Los caminos, senderos o ríos del tramo: `road`, `trail`, `river` (o los que declare el sistema). Al entrar en un hex, el recién recorrido; si no, el de delante en la ruta (al alba, al acampar, en una acción). Vacía fuera de ellos. |
| `trip.marched`                                      | `marched`        | número       | Horas marchadas hoy (`2.5`).                                                                                                                                                                                                           |
| `trip.doneToday`                                    | `doneToday`      | lista de ids | Los ids de las acciones hechas hoy (`trip.doneToday: forage`): las acciones del sistema (Sistemas → **Reglas** → Acciones).                                                                                                            |
| `trip.routeLeft`                                    | `routeLeft`      | número       | Hexes que faltan hasta el destino (0 sin ruta).                                                                                                                                                                                        |
| `trip.arrived`                                      | `arrived`        | sí/no        | Si el grupo está en su destino.                                                                                                                                                                                                        |
| `trip.visits`                                       | `visits`         | número       | Veces que el grupo ha estado en este hex durante el viaje: `1` la primera vez.                                                                                                                                                         |
| `trip.moment`                                       | `moment`         | id           | Para las acciones y comprobaciones de un sistema: el momento que las trajo: `day-start`, `hex-enter`, `day-end` o el id de una acción (para una acción con `on:` o una comprobación con `at:` que nombra varios).                      |
| `trip.doing`                                        | `doing`          | id           | La acción en curso (`camp`; en `day-end`, aquella con la que acabó el día). No está si no hay ninguna.                                                                                                                                 |
| `trip.below`, `trip.above`                          | `below`, `above` | lista de ids | Las provisiones y características que un efecto intentó llevar más allá de su `min` (`trip.below: food`) o su `max` hoy. El `short` de los packs antiguos es true cuando hay algo en `below`.                                          |
| `trip.hexes`                                        | —                | número       | Hexes en los que ha entrado el viaje.                                                                                                                                                                                                  |
| `trip.km`                                           | —                | número       | Esos hexes en km, a la escala del mapa (Ajustes del mapa), si no la del sistema (`travel.hexKm`).                                                                                                                                      |
| `trip.hours`                                        | —                | número       | Horas de marcha desde que empezó el viaje.                                                                                                                                                                                             |
| `trip.checks`                                       | —                | número       | Comprobaciones que han salido durante el viaje.                                                                                                                                                                                        |
| `trip.taken.<acción>`                               | —                | número       | Veces que se ha hecho cada acción durante el viaje, por el jugador o por el propio sistema; están todas las que declara el sistema, a 0 hasta que se hacen (`trip.taken.camp: { gte: 7 }`).                                            |
| `trip.spent.<provisión>`, `trip.gained.<provisión>` | —                | número       | Cuánto han quitado y añadido a cada provisión las acciones, comprobaciones y tablas del sistema (lo que cambias a mano no cuenta); están todas las que declara el sistema, desde 0.                                                    |

La línea **Hasta ahora** del panel del viaje (ábrela para ver el resto) enseña estas cuentas tal como van.

## Alrededor del grupo, `from.*`, `around.*`

| Nombre                         | Tipo         | Valores                                                                                                                                                      |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `from.*`                       | grupo        | Al entrar en un hex, el que se deja, con los mismos nombres que `hex.*`: `from.id`, `from.terrain`, `from.tags`, `from.region`, sus valores, `from.related`. |
| `around.terrain`               | lista de ids | Todos los terrenos de los hexes vecinos del grupo (`around.terrain: lake`: junto a un lago).                                                                 |
| `around.tags`, `around.region` | lista        | Todas las etiquetas, y todos los nombres de región, entre ellos.                                                                                             |
| `around.water`                 | sí/no        | Si alguno de ellos es agua.                                                                                                                                  |

En Travel, los vecinos de un hex son el de antes y el de después en el camino.

## El grupo, `party.*`

| Nombre                         | Tipo         | Valores, y de dónde salen                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `party.stats.<característica>` | número       | Cada característica que declaran los bindings del sistema (Sistemas → **Comprobaciones** → Características del grupo), con su valor actual, como las enseña el panel del viaje. También por su propio nombre, `{{charisma}}`, salvo que un dato se llame igual (ver abajo). |
| `party.resources.<provisión>`  | número       | Cada provisión que declaran las reglas del sistema (Sistemas → **Reglas** → Provisiones), como las enseña el panel del viaje. Puede bajar de 0 salvo que el sistema le ponga `min`.                                                                                         |
| `party.mode`                   | id           | La forma de viajar, como `trip.mode`.                                                                                                                                                                                                                                       |
| `party.members`                | lista de ids | Los ids de los personajes, cuando el grupo tiene.                                                                                                                                                                                                                           |
| _cada característica_          | número       | `{{charisma}}`: la característica por su propio nombre (la forma corta).                                                                                                                                                                                                    |

También en las tiradas a mano durante un viaje.

## Los valores del día, `today.*`, `yesterday.*`

| Nombre              | Tipo                 | Valores, y de dónde salen                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `today.<valor>`     | sí/no, número, texto | Los valores del día que declara el sistema (Sistemas → **Reglas** → Valores del día: `today.lost`, que fija el `set` de una tabla, un paso `set:` de una acción o el resultado de una comprobación), y lo que fijó antes hoy una tabla: `weather` y cualquier nombre que acabe en `Modifier` o `Impossible` (`today.fordModifier`). Se borran al alba. Cada uno está también por su propio nombre: `lost`, `fordModifier`. El diario dice cuándo se fija cada uno. |
| `yesterday.<valor>` | como `today`         | Los del día anterior: `yesterday.lost` (el grupo lo acabó perdido; `false` si no), `yesterday.weather`… P. ej. reencontrar el camino con desventaja: `modeWhen: { disadvantage: { yesterday.lost: true } }`.                                                                                                                                                                                                                                                       |

## Personajes

Cuando el sistema tiene una [hoja](07-kinds.md#hojas) y el grupo tiene personajes (la sección **Personajes** del viaje). Los ids son los de los personajes (cada ficha dice cómo se lee: `characters.kael.values.health`); los valores y estados, los que declara la hoja del sistema (Sistemas → **Hoja**).

| Nombre                                                               | Tipo          | Valores                                                                                                                                                                                                            |
| -------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `party.members`                                                      | lista de ids  | Los ids de los personajes: `party.members: kael` se cumple mientras Kael viaje con el grupo.                                                                                                                       |
| `characters.<id>.values.<valor>` (también `characters.<id>.<valor>`) | número        | Un valor de un personaje, dentro de los límites que le da la hoja.                                                                                                                                                 |
| `characters.<id>.conditions`                                         | lista de ids  | Los estados que tiene ahora (`characters.kael.conditions: wounded`).                                                                                                                                               |
| `characters.<id>.tags`, `characters.<id>.name`                       | lista, texto  | Sus etiquetas y su nombre.                                                                                                                                                                                         |
| `characters.<id>.relations.<tipo>`, `characters.<id>.bonds.<tipo>`   | lista, número | Sus relaciones por tipo (`characters.mara.relations.home: region:Ashford Vale`: `region:<nombre>`, `hex:<id>`, `poi:<id>` o `character:<id>`) y el número que lleva cada una.                                      |
| `roles.<rol>.*`                                                      | grupo         | Quien tiene uno de los roles de viaje del sistema (Sistemas → **Comprobaciones** → Roles de viaje), con los mismos nombres: `roles.guide.values.pathfinding: { gte: 2 }`. Si nadie lo tiene, no hay `roles.<rol>`. |
| `acting.*`                                                           | grupo         | El personaje que actúa ahora (elegido en el viaje), con los mismos nombres: `acting.values.survival: { gte: 2 }`. Si no actúa nadie, no hay `acting`, y una condición sobre él no se cumple.                       |
| `hex.related`, `hex.relations.<tipo>`, `from.related`                | lista de ids  | Quién está unido al hex (él, su región o un lugar en él) y por qué tipo de relación; `from.related` para el hex que se deja.                                                                                       |

Los efectos llegan a ellos con los mismos nombres ([Sintaxis](09-syntax.md#cambiar-el-grupo-effects)): `party.members.values.health: -1` (todos los personajes), `characters.kael.conditions.wounded: true` (uno), `acting.values.health: 1` (el que actúa; si no actúa nadie, no cambia nada, y el diario lo dice), `roles.lookout.values.health: -1` (quien tenga un rol). Un grupo sin personajes los ignora: el mismo sistema se juega con personajes o sin ellos.

Las características del grupo que un sistema saca de sus personajes (`from` en sus bindings) y las provisiones que llevan (`carried`) se leen como cualquier otra: `party.stats.navigation`, `party.resources.food`.

## El mundo, `world.*`, y las facciones

En el Hexmapper, con el reloj del panel Mundo en marcha; también en las tiradas a mano.

| Nombre                                                   | Corto            | Tipo          | Valores, y de dónde salen                                                                                                                                                                                       |
| -------------------------------------------------------- | ---------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world.clocks.<reloj>`                                   | `clocks.<reloj>` | número        | Lo lleno de cada reloj de progreso, por su nombre en minúsculas con guiones («The Wyrm wakes» es `the-wyrm-wakes`): el panel Mundo enseña ese nombre junto a cada reloj. De 0 a sus segmentos.                  |
| `world.events`                                           | `events`         | lista de ids  | Los ids de los eventos de hoy (`market-day`; también sus nombres escritos como ids): el **Id** de cada evento en el panel Mundo.                                                                                |
| `factions.<id>.values.<valor>`                           | —                | número        | Con facciones en el mapa (las **Facciones** de la vista Mundo): los valores de cada facción, los que declara su hoja (`factions.the-vale.values.strength`). Los ids: la ficha de cada facción dice cómo se lee. |
| `factions.<id>.conditions`, `.tags`, `.relations.<tipo>` | —                | lista         | Sus estados, etiquetas y relaciones, como los de un personaje.                                                                                                                                                  |
| `factions.<id>.name`, `factions.<id>.territory`          | —                | texto, número | Su nombre, y cuántos hexes tiene.                                                                                                                                                                               |
| `faction.*`                                              | —                | grupo         | En la tabla de turno de una facción: la facción a la que le toca, con los mismos nombres.                                                                                                                       |
| `hex.faction`                                            | —                | id            | Quién tiene un hex (mira [El hex](#el-hex-hex)).                                                                                                                                                                |

## Lo que añaden los bindings

| Nombre                    | Tipo          | Valores                                                                                                                                                                                                                              |
| ------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _el contexto del binding_ | cualquiera    | Lo que añaden los bindings solo para esa comprobación (Sistemas → **Comprobaciones** → el Contexto extra de cada una): `context: { timeOfDay: night }`; para un oráculo, su entrada (`odds: even`, una de las opciones del oráculo). |
| `roll`, `result`          | número, texto | Dentro de una tabla con tirada propia: `roll` es su total, para las condiciones, textos, `set` y efectos de sus entradas (`when: { party.stats.survival: { gte: '{{roll}}' } }`, una tirada por debajo).                             |

## Descubrir el mapa

- La tabla de **terreno** ve el hex donde está el grupo (su terreno, etiquetas, valores y región), más `hex.id` (el hex que se decide), `from` (desde el que se ve: `from.id`, `from.terrain`…) y la tierra alrededor del hex que se decide: `around` cuenta los terrenos de sus vecinos conocidos (`around.lake: 2`), `aroundCount` cuántos se conocen, `common` el terreno más frecuente (en un empate gana el del hex desde el que se ve) y `commonCount` cuántos lo tienen.
- La tabla de **contenido** ve el hex al que se entra (`hex.terrain`, `hex.tags`… y `terrain` en corto).
- Las dos ven las características del grupo, `party` y los valores del día.

## Qué valor gana

Cuando dos fuentes dan el mismo nombre, gana la posterior:

1. **Comprobaciones:** características del grupo por nombre → valores del día → lo del mapa y del viaje → `party` → contexto del binding. Así una característica o un valor del día llamado `terrain` o `weather` no puede tapar el de verdad; `party.stats.terrain` sigue llegando a ella. **Los nombres completos nunca coinciden**: `hex.terrain`, `trip.weather`, `party.stats.weather` son siempre lo que dicen; solo se comparten los cortos. Nombres reservados que una característica no debería usar: los nombres cortos de las tablas de arriba, y los grupos `hex`, `time`, `system`, `trip`, `world`, `party`, `today`, `yesterday`, `from`, `around`, `characters`, `acting`, `roles`, `factions`, `faction`, `icon`, `token`, `name`; en una tabla con tirada, `roll` y `result`.
2. **Tiradas a mano** (panel Oracle): durante un viaje, el mismo orden que las comprobaciones; después el token → lo que escribes en el **Contexto** del panel de tirada. Un `token.fare` escrito cambia solo ese valor del token.
3. **Dentro de una tabla:** los valores que fija una entrada (`set`) llegan a la tabla que tira a continuación; los campos de un generador ven los anteriores, y el `context` de un campo añade valores solo para ese campo.

Algunas coincidencias, y lo que pasa:

- **Un valor de región y uno de hex** con el mismo nombre (`danger: 2` en el Bosque Gris, `danger: 5` en uno de sus hexes): allí gana el del hex, en el resto el de la región. Así hacen las Marcas Grises que el bosque sea más peligroso hacia su corazón.
- **Una característica que se llama como un dato** (una característica `weather`, o `terrain`): `{{weather}}` y `when: { weather: storm }` leen el clima del día, nunca la característica; esta sigue siendo `party.stats.weather`. Mejor no usar esos nombres (la lista de arriba).
- **Un valor de un icono o token llamado `terrain`**: se lee como `icon.terrain` / `token.terrain`, dentro de su propio nombre, así que no tapa el terreno del hex.
- **Un valor que fija una entrada con el nombre de una característica** (`set: { morale: 1 }` con una característica `morale`): el texto del resultado y las tablas que tira leen `{{morale}}` como 1, pero no cambia la característica ni se mantiene el resto del día (solo lo hacen `weather`, `…Modifier`, `…Impossible` y los valores declarados). Para cambiarla, usa `effects: { party.stats.morale: 1 }`.
- **El contexto de un binding** (`context: { timeOfDay: night }`) gana a todo para su comprobación: así la misma tabla responde a los encuentros de día y de noche.

## Tipos de valor, en detalle

- Los valores escritos en el mapa (de un hex, una región, un icono, un token) se leen como en YAML: `3`, `-1`, `2.5` son **números** (se suman en los dados y se comparan con `gt` / `gte` / `lt` / `lte`), `true` y `false` son **sí/no**, lo demás es **texto** (`Brenna`, `3 platas`).
- En los dados, un valor que falta cuenta como **0**: `1d6 + {{danger}}` funciona donde no hay peligro.
- En las condiciones, un valor que falta no cumple, salvo con `exists: false` o `not`; una comparación con un valor que no es un número nunca se cumple. Todos los operadores, con ejemplos: [Condiciones](08-conditions.md).
- Una **lista** cumple cuando tiene el valor que se pide (`hex.tags: ford`), o cualquiera de varios (`hex.tags: [ford, bridge]`).
- Los nombres con puntos leen dentro de un grupo: `token.fare`, `icon.guards`, `npc.role` (un campo de un generador).

Las Marcas Grises usan todos ellos; [Las Marcas Grises](../packs/02-grey-marches.md) dice dónde.

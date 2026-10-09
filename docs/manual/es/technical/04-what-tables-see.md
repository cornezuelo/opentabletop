# Lo que ven las tablas

Cada tirada recibe un **contexto**: valores que una tabla puede usar en sus dados (`{{danger}}`), sus textos y sus condiciones (`when: { danger: { gte: 2 } }`). Esta página lista cada valor, de dónde sale y cuál gana cuando dos tienen el mismo nombre.

## Nombres completos y nombres cortos

Cada dato que dan el mapa, el viaje y el mundo tiene un **nombre completo** que dice de dónde sale, y casi todos también un **nombre corto**:

| Nombres completos    | De qué tratan                                                                                         | Ejemplo                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `hex.*`              | el hex: su id, terreno, etiquetas, región y sus propios valores                                       | `hex.terrain`, `hex.danger`, `hex.id`    |
| `time.*`             | el momento: estación, día, hora, luz del día y el calendario                                          | `time.daylight`, `time.moons.pale`       |
| `system.*`           | el día del propio sistema, como números                                                               | `system.nightfall`                       |
| `trip.*`             | el viaje: su día, la forma de viajar, el clima, lo marchado y hecho, el momento, y lo que lleva hecho | `trip.day`, `trip.mode`, `trip.moment`   |
| `world.*`            | el reloj del mundo (Hexmapper)                                                                        | `world.clocks.the-flood`, `world.events` |
| `party.*`            | el grupo: sus características y provisiones                                                           | `party.stats.charisma`                   |
| `today.*`            | los valores del día (los que fijan las tablas y los valores propios del sistema)                      | `today.lost`, `today.fordModifier`       |
| `yesterday.*`        | los del día anterior                                                                                  | `yesterday.lost`                         |
| `from.*`, `around.*` | el hex que se deja al entrar en otro, los hexes de alrededor                                          | `from.terrain`, `around.terrain`         |

El nombre corto y el completo leen el mismo valor: `terrain: forest` y `hex.terrain: forest` se cumplen en los mismos hexes, y `{{season}}` escribe lo mismo que `{{time.season}}`. Usa el que se lea mejor:

- **Los nombres cortos** se escriben antes, y son los que escribes en la caja **Contexto** del Oracle: `terrain: forest` ahí también rellena `hex.terrain`.
- **Los nombres completos** no se pueden tapar: una característica del grupo, un valor del día o el contexto de un binding llamado `weather` o `day` ocupa el nombre corto (ver [Qué valor gana](#que-valor-gana)), nunca el completo. Además dicen de un vistazo de dónde sale un valor. Las reglas de viaje de las Marcas Grises los usan; Core y las reglas genéricas usan los cortos.

Los valores propios de un hex (`danger`, `elevation`…) son `hex.danger`, `hex.elevation`, y `danger` en corto. `hex` a secas ya no es el id del hex: ese es `hex.id`.

## Del mapa (Hexmapper)

Del hex seleccionado (o el del grupo), y en un viaje, de cada hex del que trata una comprobación:

| Nombre completo | Nombre corto | Qué es                                                                                                                            |
| --------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `hex.id`        |              | El hex (`"5,7"`: columna, fila).                                                                                                  |
| `hex.terrain`   | `terrain`    | El id del terreno (`forest`, `hills`…). No está en un hex en blanco.                                                              |
| `hex.water`     | `water`      | `true` cuando el terreno está marcado como agua (Editar paleta → Agua).                                                           |
| `hex.tags`      | `tags`       | Las etiquetas del hex, una lista: `when: { hex.tags: landmark }` se cumple si la lista la tiene.                                  |
| `hex.region`    | `region`     | El **nombre** de la región (`Ashford Vale`).                                                                                      |
| `hex.<valor>`   | _cada valor_ | Los valores de la **región** del hex, y luego los **del propio hex** (el del hex gana con la misma clave): `danger`, `elevation`… |
| `hex.icon`      | `icon`       | El icono del hex: `icon.id` (`game:castle`) y cada uno de sus valores: `{{icon.guards}}`.                                         |
| `hex.name`      | `name`       | El nombre del hex, si tiene.                                                                                                      |

Desde el panel Oracle, también el **token seleccionado**:

| Nombre  | Qué es                                                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------- |
| `token` | `token.name`, `token.kind` (`pc`, `npc`, `enemy`, `party`) y cada uno de sus valores (`{{token.fare}}`). |

Los puntos de interés guardan sus valores en el mapa y en su fichero, pero las tablas no los leen: un hex puede tener varios.

## De un viaje (Jugar en el Hexmapper, aplicación Travel)

**El momento**, `time.*`:

| Nombre completo                                            | Nombre corto                           | Qué es                                                                                                                                    |
| ---------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `time.season`                                              | `season`                               | `spring`, `summer`, `autumn`, `winter` (o las estaciones del calendario del sistema).                                                     |
| `time.day`                                                 | `day`                                  | El número de día del calendario.                                                                                                          |
| `time.daylight`                                            | `daylight`                             | `true` entre el alba y el anochecer del sistema, `false` de noche (al acampar, en una marcha nocturna).                                   |
| `time.hour`                                                | `hour`                                 | La hora como número: `14.5` son las 14:30. `time.hour: { gte: 18 }`: desde las seis de la tarde.                                          |
| `time.watch`                                               | `watch`                                | La guardia del día (1, 2…), cuando el calendario divide el día en guardias (el de por defecto: seis de cuatro horas).                     |
| `time.month`, `time.monthDay`, `time.year`, `time.weekday` | `month`, `monthDay`, `year`, `weekday` | Con un calendario propio del sistema: el id del mes, el día del mes (`monthDay: 1`: el primero de cada mes), el año, el día de la semana. |
| `time.moons`, `time.holidays`                              | `moons`, `holidays`                    | Con un calendario propio del sistema: la fase de cada luna (`time.moons.pale: full`) y las fiestas del día (una lista).                   |

**El día del propio sistema**, `system.*`, como números: `system.dawn` y `system.nightfall` (su alba y su anochecer como horas, `6`, `20`), `system.hoursPerDay` (sus horas de marcha al día). En corto: `dawn`, `nightfall`, `hoursPerDay`. Se comparan con ellos como variables: `time.hour: { gte: '{{system.nightfall}}' }`.

**El viaje**, `trip.*`:

| Nombre completo                                     | Nombre corto           | Qué es                                                                                                                                                                                                                |
| --------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trip.day`                                          | `tripDay`              | El día de este viaje: 1 el día que empezó.                                                                                                                                                                            |
| `trip.mode`                                         | `mode`                 | La forma de viajar (`foot`, `horse`, `boat`…).                                                                                                                                                                        |
| `trip.weather`                                      | `weather`              | El clima de hoy, cuando una tabla lo ha fijado.                                                                                                                                                                       |
| `trip.edges`                                        | `edges`                | Los caminos, senderos o ríos del tramo: el recién recorrido al entrar en un hex, el de delante al alba y al acampar.                                                                                                  |
| `trip.marched`                                      | `marched`              | Horas marchadas hoy.                                                                                                                                                                                                  |
| `trip.doneToday`                                    | `doneToday`            | Las acciones hechas hoy, por id (una lista): `trip.doneToday: forage`.                                                                                                                                                |
| `trip.routeLeft`, `trip.arrived`                    | `routeLeft`, `arrived` | Hexes que faltan hasta el destino, y si el grupo ya está en él.                                                                                                                                                       |
| `trip.visits`                                       | `visits`               | Veces que el grupo ha estado en este hex durante el viaje: `1` la primera vez.                                                                                                                                        |
| `trip.moment`                                       | `moment`               | Para las acciones y comprobaciones de un sistema: el momento que las trajo: `day-start`, `hex-enter`, `day-end` o el id de una acción (para una acción con `on:` o una comprobación con `at:` que nombra varios).     |
| `trip.below`, `trip.above`                          | `below`, `above`       | Los ids de los valores (provisiones, características) que un efecto intentó llevar más allá de su `min` (`trip.below: food`) o su `max` ese día. El `short` de los packs antiguos es true cuando hay algo en `below`. |
| `trip.doing`                                        | `doing`                | La acción en curso (`camp`; en `day-end`, aquella con la que acabó el día). El `camping` de los packs antiguos es true mientras dura la acción de la noche.                                                           |
| `trip.hexes`, `trip.km`                             | —                      | El viaje hasta ahora: hexes en los que ha entrado, y sus km a la escala del mapa (la del sistema, sin mapa). `trip.km: { gte: 100 }`: cuando el grupo lleva 100 km.                                                   |
| `trip.hours`                                        | —                      | Horas de marcha desde que empezó el viaje (`trip.marched` es la de hoy).                                                                                                                                              |
| `trip.taken.<acción>`                               | —                      | Veces que se ha hecho cada acción durante el viaje, por el jugador o por el propio sistema: `trip.taken.camp: { gte: 7 }`, a partir del séptimo campamento.                                                           |
| `trip.checks`                                       | —                      | Comprobaciones que han salido durante el viaje.                                                                                                                                                                       |
| `trip.spent.<provisión>`, `trip.gained.<provisión>` | —                      | Cuánto han quitado de una provisión las acciones, comprobaciones y tablas del sistema, y cuánto le han añadido (lo que cambias a mano no cuenta): `trip.spent.food: { gte: 10 }`.                                     |

**Alrededor del grupo:**

| Nombre   | Qué es                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`   | Al entrar en un hex, el que se deja: `from.id`, `from.terrain`, `from.tags`, `from.region` y sus valores.                                                                                   |
| `around` | Los hexes vecinos del grupo, juntos: `around.terrain` y `around.tags` (listas con todos los que hay entre ellos), `around.region`, `around.water`. `around.terrain: lake`: junto a un lago. |

**El grupo y sus días:**

| Nombre                    | Qué es                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `party`                   | El grupo, siempre sin ambigüedad: `party.stats.charisma`, `party.resources.food`, `party.mode`. También en las tiradas a mano durante un viaje.                                                                                                                                                                                       |
| _cada característica_     | Las características del grupo del sistema con su valor actual, por nombre: `{{charisma}}`. Atajo: un dato del mapa o del viaje con el mismo nombre gana (ver abajo).                                                                                                                                                                  |
| `today`                   | Los valores de hoy: los que fijó antes ese mismo día una tabla (`weather`, cualquier nombre que acabe en `Modifier` o `Impossible`: `today.fordModifier`) y los valores del día que declara el sistema (`today.lost`). Se borran al alba y pasan a `yesterday.*`. Cada uno está también por su propio nombre: `lost`, `fordModifier`. |
| `yesterday`               | El día anterior: los valores de ese día (`yesterday.weather`, `yesterday.fordModifier`…) y los valores del día que declara el sistema (`yesterday.lost`: el grupo acabó perdido; false si no). P. ej. reencontrar el camino con desventaja: `modeWhen: { disadvantage: { yesterday.lost: true } }`.                                   |
| _el contexto del binding_ | Lo que añaden los bindings para esa comprobación: `context: { timeOfDay: night }`; para un oráculo, su entrada (`odds: even`).                                                                                                                                                                                                        |

## Del reloj del mundo (Hexmapper)

Con el reloj del mundo en marcha: `world.clocks.<nombre>`, lo lleno de cada reloj de progreso por su nombre en minúsculas con guiones (`world.clocks.the-flood: { gte: 4 }`), y `world.events`, los eventos de hoy igual (`world.events: market-day`). En corto: `clocks`, `events`. También en las tiradas a mano.

## Descubrir el mapa

- La tabla de **terreno** ve el hex donde está el grupo (su terreno, etiquetas, valores y región), más `hex.id` (el hex que se decide), `from` (desde el que se ve: `from.id`, `from.terrain`…) y la tierra alrededor del hex que se decide: `around` cuenta los terrenos de sus vecinos conocidos (`around.lake: 2`), `aroundCount` cuántos se conocen, `common` el terreno más frecuente (en un empate gana el del hex desde el que se ve) y `commonCount` cuántos lo tienen.
- La tabla de **contenido** ve el hex al que se entra (`hex.terrain`, `hex.tags`… y `terrain` en corto).
- Las dos ven las características del grupo, `party` y los valores del día.

## Qué valor gana

Cuando dos fuentes dan el mismo nombre, gana la posterior:

1. **Comprobaciones:** características del grupo por nombre → valores del día → lo del mapa y del viaje → `party` → contexto del binding. Así una característica o un valor del día llamado `terrain` o `weather` no puede tapar el de verdad; `party.stats.terrain` sigue llegando a ella. **Los nombres completos nunca coinciden**: `hex.terrain`, `trip.weather`, `party.stats.weather` son siempre lo que dicen; solo se comparten los cortos. Nombres reservados que una característica no debería usar: los nombres cortos de las tablas de arriba, y los grupos `hex`, `time`, `system`, `trip`, `world`, `party`, `today`, `yesterday`, `from`, `around`, `icon`, `token`, `name`; en una tabla con tirada, `roll` y `result`.
2. **Tiradas a mano** (panel Oracle): durante un viaje, el mismo orden que las comprobaciones; después el token → lo que escribes en el **Contexto** del panel de tirada. Un `token.fare` escrito cambia solo ese valor del token.
3. **Dentro de una tabla:** una tabla con tirada propia da a sus entradas el total como `roll` (en sus condiciones, textos, `set` y efectos: `when: { party.stats.survival: { gte: '{{roll}}' } }`, una tirada por debajo); los valores que fija una entrada (`set`) llegan a la tabla que tira a continuación; los campos de un generador ven los anteriores, y el `context` de un campo añade valores solo para ese campo.

Algunas coincidencias, y lo que pasa:

- **Un valor de región y uno de hex** con el mismo nombre (`danger: 2` en el Bosque Gris, `danger: 5` en uno de sus hexes): allí gana el del hex, en el resto el de la región. Así hacen las Marcas Grises que el bosque sea más peligroso hacia su corazón.
- **Una característica que se llama como un dato** (una característica `weather`, o `terrain`): `{{weather}}` y `when: { weather: storm }` leen el clima del día, nunca la característica; esta sigue siendo `party.stats.weather`. Mejor no usar esos nombres (la lista de arriba).
- **Un valor de un icono o token llamado `terrain`**: se lee como `icon.terrain` / `token.terrain`, dentro de su propio nombre, así que no tapa el terreno del hex.
- **Un valor que fija una entrada con el nombre de una característica** (`set: { morale: 1 }` con una característica `morale`): el texto del resultado y las tablas que tira leen `{{morale}}` como 1, pero no cambia la característica ni se mantiene el resto del día (solo lo hacen `weather`, `…Modifier`, `…Impossible` y los valores declarados). Para cambiarla, usa `effects: { party.stats.morale: 1 }`.
- **El contexto de un binding** (`context: { timeOfDay: night }`) gana a todo para su comprobación: así la misma tabla responde a los encuentros de día y de noche.

## Tipos de valor

- Lo escrito como número (`3`, `-1`, `2.5`) es un **número**: se suma en los dados y se compara con `gt`/`gte`/`lt`/`lte`. `true` y `false` son sí/no. Lo demás es texto.
- En los dados, un valor que falta cuenta como **0**: `1d6 + {{danger}}` funciona donde no hay peligro.
- En las condiciones, un valor que falta no cumple, salvo con `exists: false` o `not`. Todos los operadores, con ejemplos: [Condiciones](08-conditions.md).
- Los nombres con puntos leen dentro de un valor: `token.fare`, `icon.guards`, `npc.role` (un campo de un generador).

Las Marcas Grises usan todos ellos; [Las Marcas Grises](../packs/02-grey-marches.md) dice dónde.

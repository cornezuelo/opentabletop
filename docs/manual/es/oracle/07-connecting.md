# Conectar tablas con mapas y viajes

No hace falta programar para crear tablas que reaccionen al mapa, ni un sistema de viaje entero que el Hexmapper juegue por ti. Todo se escribe en los ficheros YAML del pack. Esta página lo construye paso a paso; cada paso funciona por sí solo.

> **Un ejemplo completo del que copiar:** el pack incluido **Las Marcas Grises** usa todo lo de esta página, y tiene un mapa de ejemplo para jugarlo (Hexmapper: Mapas → Mapas de ejemplo). Abre sus ficheros en la aplicación Oracle, o haz una copia (**Editar una copia**) para cambiarlos. [Las Marcas Grises](../packs/02-grey-marches.md) dice dónde está cada cosa.

## 1. Una tabla que depende del terreno

Cuando tiras desde el Hexmapper (el panel de Oracle o un viaje), la tabla recibe lo que el mapa sabe del hex. `when` mantiene una entrada solo si coincide:

```yaml
kind: table
id: what-do-we-find
name: ¿Qué encontramos aquí?
roll: 1d6
entries:
  - { id: forest, range: 1-6, when: { terrain: forest }, result: 'Troncos caídos y setas' }
  - {
      id: rocks,
      range: 1-6,
      when: { terrain: [hills, mountains] },
      result: 'La boca de una cueva en la roca',
    }
  - { id: nothing, range: 1-6, result: 'Nada especial' }
```

Todas las entradas cubren del 1 al 6: gana **la primera cuya condición se cumple**, y la última, sin condición, recoge el resto. Los terrenos se escriben por su id (`forest`, `hills`, `swamp`…), como en la paleta del Hexmapper.

Lo que una tabla puede leer del mapa: `terrain`, `tags` (las etiquetas del hex), `region` (el nombre de la región), cada **campo** del hex por su clave (un hex con el campo `danger: 3` da `danger`) y `hex`. Durante un viaje, además, `season`, `weather`, `mode` (a pie, a caballo…), `day` y las estadísticas del grupo.

## 2. Etiquetas y campos

Pon etiquetas a los hexes en el Hexmapper (`haunted`, `ruins`…) y dales campos (`danger: 3`). Después:

```yaml
entries:
  - { id: ghost, range: 1-2, when: { tags: haunted }, result: 'Una figura pálida os observa' }
  - { id: ambush, range: 1-6, when: { danger: { gte: 3 } }, result: '¡Emboscada!' }
```

`tags: haunted` se cumple cuando el hex tiene esa etiqueta entre otras. `{ gte: 3 }` significa «3 o más»; también `gt`, `lt`, `lte`, `not`.

Un campo también puede cambiar los dados: `roll: '1d6 + {{danger}}'`.

## 3. Una tabla por estación

Una tabla puede apuntar a otra por su nombre, completándolo con un valor del contexto. Con una tabla de clima por estación (`weather-spring`, `weather-summer`…):

```yaml
kind: table
id: weather
name: El clima de hoy
roll: 1d2
entries:
  - { id: today, range: 1-2, table: 'weather-{{season}}' }
```

## 4. Resultados que entiende el viaje

Una entrada (o una carta de un mazo) cambia el grupo con **efectos** (`effects`): cada uno es un valor que declara el sistema, por la ruta con la que lo leen las tablas. Un número suma o resta; `'=valor'` lo fija; dentro funcionan los dados y los valores (`'{{1d3+1}}'`). Las características se quedan entre su `min` y su `max`; las provisiones nunca bajan de 0.

```yaml
- { id: berries, range: 6, result: 'Bayas: +2 de comida', effects: { party.resources.food: 2 } }
- { id: wolves, range: 5, result: Lobos, effects: { party.stats.morale: -1 } }
- { id: cordial, range: 1, result: Un cordial, effects: { party.stats.fatigue: '=0' } }
```

Otros dos valores del día cambian el viaje cuando una entrada los **fija** (`set`):

| Fija             | Efecto en el viaje                                          |
| ---------------- | ----------------------------------------------------------- |
| `weather: storm` | El clima de hoy; las reglas de viaje dicen cuánto te frena. |
| `lost: true`     | No se viaja más hoy, si el sistema declara `lost` (abajo).  |

El diario dice lo que cambió cada resultado («Buscar comida: Bayas (Comida +2)»). La forma antigua de escribir efectos (`set: { resources: { food: 2 }, stats: { morale: -1 }, fatigue: 1 }`) sigue funcionando, leída como los mismos efectos. Un efecto sobre un valor que el sistema no declara se aplica igual, pero el pack recibe un aviso.

Las tablas leen el grupo como `party.resources.food`, `party.stats.morale`: `when: { party.resources.food: { lt: 1 } }` para una entrada que solo sale cuando se ha acabado la comida.

**Valores del día.** Los valores llamados `weather`, `…Modifier` o `…Impossible`, y los que declara el sistema (`lost`), se mantienen el resto del día, para que las comprobaciones siguientes los usen; al día siguiente pasan a ser `yesterday.<nombre>`. Son valores normales con una costumbre de nombre, para las tablas que los leen:

- `…Modifier` es un número que se suma a una tirada posterior. Una entrada del clima con `set: { lostModifier: -1 }` hace más difícil `roll: '1d6 + {{lostModifier}}'` en la tabla de perderse que viene después; si aún no se ha tirado el clima, la tabla lee 0.
- `…Impossible` es un sí/no para algo que hoy no puede pasar. La tormenta de las Marcas Grises pone `fordImpossible: true`, y la primera entrada del vado, `when: { fordImpossible: true }`, dice que nadie cruza. Una acción también puede usarlo: `unless: { forageImpossible: true }` desactiva el botón (forrajear con tormenta en Kal-Arath).
- Un **valor declarado** es uno que el sistema nombra en sus reglas, con lo que **bloquea** mientras se cumple (abajo): `lost` bloquea el viaje. A diferencia de `…Impossible`, las aplicaciones lo hacen cumplir: el botón se desactiva y dice por qué.

## 5. Tu propio sistema de viaje

Un pack se convierte en un **sistema** que puedes elegir en Jugar → Reglas cuando tiene dos definiciones más: las **reglas de viaje** (a qué velocidad, qué comprobaciones y cuándo) y los **bindings** (qué tabla responde a cada comprobación). Ponlas en cualquier fichero del pack, p. ej. `travel.yaml`:

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00' }
travel: { hoursPerDay: 8 } # horas de marcha al día
terrains:
  forest: { multiplier: 0.5 } # a media velocidad
  mountains: { multiplier: 0.33 }
  sea: { passable: false }
edges:
  road: { multiplier: 1.5 } # más rápido por los caminos
modes:
  foot: { name: A pie, kmPerDay: 30 }
  horse: { name: A caballo, kmPerDay: 60 }
resources:
  food: { name: Raciones, min: 0 } # nunca por debajo de 0
weather:
  storm: { speed: 0 } # con tormenta no se viaja
values:
  lost: { name: Perdidos, blocks: [travel] } # lo pone la tabla de perderse: no se viaja más hoy
actions:
  camp: # dormir hasta el alba; una noche bien comidos (no se acabó la comida) baja la fatiga
    do:
      - { time: dawn }
      - { unless: { below: food }, effects: { party.stats.fatigue: -1 } }
  rest: { do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }] }
  forage: # una acción de este sistema: un botón Buscar comida
    name: Buscar comida
    unless: { weather: storm }
    do: [{ time: 180 }, { speed: 0.5 }]
    oncePerDay: true
  eat: # no es un botón: la hace el sistema al acabar cada día, se acampe o no
    on: day-end
    do: [{ effects: { party.resources.food: -1 } }]
checks:
  - { event: WEATHER, at: day-start }
  - { event: LOST, at: day-start, unless: { edges: [road, river] } }
  - { event: ENCOUNTER, at: hex-enter, when: { terrain: [forest, swamp] } }
  - { event: NIGHT, at: camp }
  - { event: FORAGE, at: forage, when: { terrain: [forest, plains] } }
  - { event: HUNGRY, at: day-end, when: { below: food }, effects: { party.stats.fatigue: 1 } }
---
kind: bindings
id: default
on:
  WEATHER: { resolve: weather }
  LOST: { resolve: lost-check }
  ENCOUNTER: { resolve: forest-encounters }
  NIGHT: { resolve: night-encounters }
  FORAGE: { resolve: forage }
stats:
  luck: { name: Suerte, description: 'Se suma a las tiradas de encuentro', default: 0 }
  fatigue: { name: Fatiga, default: 0, min: 0 }
```

- **terrains** fijan la velocidad en cada terreno (`multiplier`; 0.5 es la mitad) o lo cierran (`passable: false`), siempre o con una condición sobre el hex al que se entra y el momento: `passable: { unless: { season: winter } }` (un paso cerrado en invierno), `passable: { when: { month: [deepwinter, wolfmoon] } }` (un lago que solo se cruza helado; mira [Condiciones](../technical/08-conditions.md)). **water** hace lo mismo con los hexes de agua cuyo terreno no está en la lista (Editar paleta → Agua en el mapa), y una forma de viajar con `through: { water: true }` es una barca: solo navega por agua, incluso donde a pie no se puede ir. Las tablas ven `water: true` en los hexes de agua.
- **modes** pueden tener `through`, por dónde pueden ir: una [condición](../technical/08-conditions.md) sobre cada hex en el que entran, que ve el hex (todo lo que el mapa sabe de él: `terrain`, `water`, `tags`, `region`, sus campos), `edges` (los caminos o ríos de ese paso), `mode`, `weather` y los valores del día. Donde se cumple, la forma de viajar pasa, incluso por terrenos cerrados; donde no, no puede, y las rutas lo rodean. La barca de las Marcas Grises: `through: { any: [{ water: true }, { terrain: coast }] }`; un carro solo por camino: `through: { edges: road }`. El antiguo `allowedTerrains: [water, coast]` (una lista de terrenos, `water` para cualquier hex de agua) sigue funcionando.
- **modes** pueden tener `when` / `unless` (**Solo si** / **Salvo si** en la aplicación Travel): la forma de viajar solo se puede elegir cuando se cumple (la barca de las Marcas Grises: `when: { any: [{ water: true }, { terrain: coast }, { tags: ferry }] }`); si no, sale desactivada en el panel del viaje, diciendo por qué. Un valor del día también puede bloquear una (`blocks: [mode.horse]`).
- **resources** son las provisiones del grupo. Nada las gasta por sí solo: lo hacen las acciones, comprobaciones y tablas del sistema, con efectos (`party.resources.food: -1`). `min` y `max` las acotan: un cambio que pasaría de uno se queda en él, el diario lo dice («Raciones no puede bajar de 0») y los pasos siguientes de la misma acción y las comprobaciones de ese día ven el id de la provisión en `below` (o `above`). Sin `min`, una provisión puede quedar en negativo. Los packs antiguos que escribían `perDay` en una provisión, `consumes` en una forma de viajar o pasos `eat: day` siguen funcionando, leídos como una acción al final del día con `min: 0` (**Convertir**, en el editor de Travel, lo escribe así).
- **modes** y **resources** tienen un `name` (y una `description`) para los jugadores, que se ven en el panel del viaje y el diario en lugar de su id (`horse` → _A caballo_), traducidos en `locales/` como el resto. Sin él, los ids habituales de las reglas Genéricas (foot, horse, food…) toman los nombres de la aplicación y cualquier otro muestra su id.
- **values** son los valores del día que declara este sistema: un resultado pone uno (`set: { lost: true }`), se mantiene hasta que acaba el día y, mientras se cumple, **bloquea** lo que nombra: `travel` (viajar), una de las acciones del sistema por su id (`camp`, `rest`, `forage`…) o una forma de viajar (`mode.horse`). Los botones bloqueados siguen visibles, desactivados, y dicen por qué con el `name` del valor («Perdidos: no es posible el resto del día»). Al día siguiente las tablas lo leen como `yesterday.lost`. Un sistema que no declara `values` sigue teniendo el antiguo `lost` incorporado (bloquea el viaje); uno que declara `values: {}` no tiene ninguno.
- **actions** son lo que hace el grupo, todas iguales: acampar y descansar son acciones como cualquier otra (un id, pasos, condiciones). Cada una es un botón junto a Viajar. Los sistemas antiguos tenían `camp` (dormir hasta el alba) y `rest` (una hora) sin declararlas: las reglas que no las nombran las siguen teniendo, y `camp: false` deja una fuera. Cada una tiene un `name` y una `description` para los jugadores, `oncePerDay` (una vez al día) y `when` / `unless`: condiciones (como las de una tabla) sobre los datos del viaje, los valores de hoy y el grupo, que deciden si el botón se puede pulsar ahora. Con `on:` la **hace el propio sistema** y no es un botón: `on: day-start` (al alba), `hex-enter` (al entrar en cada hex), `day-end` (al acabar cada día: las condiciones ven `doing`, la acción en curso cuando acabó, p. ej. `doing: camp`) u otra acción (justo al empezar esa acción, p. ej. `on: camp`), si se cumplen su `when` / `unless`. Va antes de las comprobaciones de ese momento, así que ven lo que cambió. Lo que hace una acción es una lista de **pasos** (`do`), en orden, cada uno solo si se cumple su propio `when` / `unless`:
  - `time: 180` pasa tres horas; `time: dawn`, `time: nightfall` o `time: '14:00'`, hasta el siguiente. Cada día que acaba por el camino acaba con sus acciones y comprobaciones de `day-end`.
  - `speed: 0.5` multiplica el resto de la marcha de hoy.
  - `effects: { party.stats.fatigue: -1 }` cambia al grupo, como los efectos de una tabla. Un cambio que pasaría el `min` / `max` de un valor se queda en él; los pasos siguientes ven su id en `below` / `above` (`unless: { below: food }`).
  - `set: { lost: true }` fija valores del día que declara el sistema (`values`).
  - `do: forage` hace otra acción, si se cumplen sus condiciones (si no, no pasa nada).
  - `roll: ENCOUNTER` tira ya una comprobación (todas las de ese evento cuyo `when` / `unless` se cumplan, tengan el `at` que tengan); se resuelve al acabar la acción, así que los pasos siguientes no ven su resultado.

  En el editor de Travel cada paso se escribe igual, una casilla por paso, con sugerencias. Lo que tira una acción son las comprobaciones con `at: <su id>` (las de acampar: `at: camp`), que se tiran antes de sus pasos. `nothing` es lo que dice el diario cuando ninguna se aplica donde está el grupo (`nothing: 'no hay nada que buscar en {terrain}'`, con `{terrain}` el terreno del hex); sin él, el diario dice que allí no se tira ninguna de sus tiradas. La forma antigua (`minutes: 180, speed: 0.5, effects: …` en la acción, o un paso `eat: day`) sigue funcionando, leída como esos pasos. Las Marcas Grises lo usan todo: mira [su acampada, descanso y búsqueda de comida](../packs/02-grey-marches.md).

- **day** puede decir qué hace el grupo cuando cae la noche mientras espera con el reloj del mundo: `night: camp` (por defecto, si el sistema tiene camp), otra acción, o `false` (la noche simplemente pasa).
- **checks** dicen cuándo se tira algo: `day-start` (al alba, antes de marchar), `hex-enter` (al entrar en cada hex), `day-end` (al acabar cada día, después de las acciones `day-end` del sistema: las comprobaciones ven `below` / `above`, lo que llegó a un límite ese día, y `doing`, la acción en curso cuando acabó; en los packs antiguos `short` significa que algo llegó a su mínimo y `camping` que estaba en curso la acción de la noche) o el id de una acción del sistema (`at: camp`, `at: forage`). Sin `at`, solo la tira un paso (`roll:`). Una comprobación puede tener sus propios `effects`: sin tabla, simplemente los aplica, que es como un sistema escribe sus reglas como datos («un día sin comida suficiente: fatiga +1»). Dale a cada una un `name` (y una `description`) para los jugadores (`name: Perderse`; sus traducciones van en `locales/`, mira [Traducciones](05-translations.md#reglas-calendarios-clima-y-modos-de-tirada)), o el panel del viaje y el diario mostrarán el id de su evento. `when` / `unless` usan las mismas [condiciones](../technical/08-conditions.md) que las tablas; `edges` son los caminos o ríos del tramo: el que acabas de recorrer al entrar en un hex, el que tienes por delante al alba y al acampar. Esperar con el reloj del mundo (Hexmapper → [Reloj del mundo](../hexmapper/12-world.md#con-un-viaje-en-marcha)) también las tira (y hace las acciones con `on:`): `day-start` en cada alba, las de acampar en cada anochecer, `day-end` al acabar cada día.
- **bindings** conectan cada comprobación (por su nombre de evento, el que quieras) con una tabla del pack.
- **stats** son números del grupo que aparecen en el panel del viaje, donde los pones al empezar y los cambias mientras juegas. Las aplicaciones no se inventan ninguno: cada sistema declara los suyos, con un `name`, una `description` (la **i** del panel del viaje) y un valor inicial (`default`), y las tablas los leen por su clave: `{{charisma}}`, o siempre sin ambigüedad `party.stats.charisma`. Las Marcas Grises declaran Carisma, Supervivencia, Orientación y Moral; las reglas Genéricas no tienen ninguno. Una tabla también puede cambiar uno que nadie declaró (`effects: { party.stats.hirelings: 1 }`): funciona y aparece en el panel con su clave, pero el pack recibe un aviso, así que declara todas las características que cambian sus tablas. `min` y `max` mantienen una característica entre límites (la fatiga nunca baja de 0).
- **reads** da nombre a los demás valores que leen las tablas del sistema y que nadie más nombra: un valor del mapa (`danger`, `icon.guards`, `token.fare`), el contexto de los bindings (`timeOfDay`) o los valores del día que ponen las tablas (`fordModifier`). Con un `name` y una `description` cada uno, el panel de tirada los muestra por su nombre en vez de su clave, con lo que son en la **i**: `reads: { icon.guards: { name: Guardias, description: Cuántos guardias vigilan las puertas. } }`. Los valores que dan los mapas y los viajes (terreno, estación, fiestas…) ya tienen nombre en las aplicaciones.

Las comprobaciones sin binding esperan en el diario a que las resuelvas tú.

## 6. Un calendario propio

Los viajes cuentan los días con un calendario sencillo (cuatro estaciones de 90 días) salvo que el pack del sistema tenga uno propio: una definición `kind: calendar`, en cualquier fichero del pack.

```yaml
kind: calendar
id: reckoning
name: El cómputo de las Marcas
startYear: 412
watchHours: 4
months:
  - { id: thaw, name: Deshielo, days: 30, season: spring }
  - { id: highsun, name: Altosol, days: 30, season: summer }
  # …
weekdays: [{ id: moonday, name: Lunadía }, { id: ironday, name: Hierrodía }]
moons: [{ id: pale, name: la Luna Pálida, cycle: 28 }]
holidays: [{ id: midsummer, name: Pleno Verano, month: highsun, day: 15 }]
```

- **months** en orden, con sus días y su **season** (de aquí salen las estaciones en que puede empezar un viaje); **weekdays**, **moons** (un ciclo en días y un `offset` opcional), **holidays** (un mes y un día), el **startYear** y, si quieres, `start: { month, day }` para el primer día.
- El panel del viaje muestra la fecha («Lunadía, 1 de Deshielo, año 412»), las fases de las lunas y las fiestas del día.
- Las tablas y comprobaciones ven `month`, `year`, `weekday`, `moons.<id>` (`new`, `waxing`, `full` o `waning`) y `holidays` (una lista): `when: { moons.ember: full }`, `when: { holidays: midsummer }`.

El `calendar.yaml` de las Marcas Grises es un ejemplo completo.

### Clima con inercia

Una tabla de clima tira cada día de nuevo. Para un clima que dura —lluvia que se instala, tormentas que pasan—, un pack puede tener un **modelo de clima** (`kind: weather`) y ligar a él la comprobación del clima con `weather:` en lugar de `resolve:`:

```yaml
kind: weather
id: sky
states:
  clear: { name: Cielo despejado }
  rain: { name: Lluvia constante, set: { fordModifier: -1 } }
  storm: { name: 'Tormenta: nadie viaja', set: { fordImpossible: true } }
seasons:
  spring:
    start: clear # o pesos: { clear: 2, rain: 1 }
    next: # según el clima de hoy, cuán probable es cada tipo mañana
      clear: { clear: 3, rain: 1 }
      rain: { rain: 3, clear: 1, storm: 1 }
      storm: { rain: 1 }
---
kind: bindings
on:
  WEATHER_CHECK_REQUIRED: { weather: sky }
```

- **states**: cada tipo de clima, con su nombre y los valores que da al día (como el `set` de una tabla); su id es lo que lee el `weather` de las reglas de viaje.
- **seasons**: por estación, dónde empieza el clima y, desde cada tipo, los pesos del día siguiente. Si la estación no tiene fila para el clima de ayer, se empieza de nuevo desde `start`.
- El diario muestra el clima del día por su nombre. En **Comprobaciones** de la aplicación Travel, elige el modelo bajo _Clima con inercia_.

El `sky.yaml` de las Marcas Grises es el ejemplo completo (sus tablas de `weather.yaml` siguen tirando el clima a mano, sin memoria).

## 7. Descubrir el mapa

Los bindings también pueden decir cómo se deciden los hexes vacíos al viajar (el **Descubrir el mapa al viajar** del Hexmapper):

```yaml
kind: bindings
discover:
  terrain: { resolve: next-terrain } # el terreno de un hex vacío
  contents: { resolve: hex-contents } # qué hay en un hex, la primera vez que entras
  reveal: neighbors # o: entered (solo el hex al que entras)
on: { … }
```

- La tabla de **terreno** ve el hex que pisas: `terrain`, sus etiquetas, campos y región, más `hex` (el hex que se decide) y la tierra que lo rodea: `around.<terreno>` (cuántos de sus vecinos conocidos lo tienen), `common` (el más frecuente). Responde con `set: { terrain: hills }`; `set: { terrain: '{{common}}' }` hace crecer la tierra de alrededor, así lagos, bosques y cordilleras salen enteros en lugar de un mosaico; `when: { around.lake: { gte: 2 } }` junta el agua.
- La tabla de **contenido** ve el hex al que entras. Su texto se convierte en un punto de interés; `set: { poi: false }` significa que no hay nada que apuntar, `set: { poi: 'Un nombre' }` lo nombra de otra forma. `tags` (una o una lista) y `name` se escriben también en el hex.
- Las características del grupo y los valores del día están en el contexto de ambas, como en las comprobaciones.

El `discovery.yaml` de las Marcas Grises es un ejemplo completo: un terreno que tiende a seguir, familias de tierras, un lugar señalado que solo se encuentra una vez.

## 8. Probarlo

1. En la aplicación Oracle, tira cada tabla escribiendo valores en **Contexto** (terreno, estación…) para comprobar los resultados.
2. Sirve las dos aplicaciones desde el mismo sitio (`make serve`), abre el Hexmapper, Jugar → **Con reglas**, elige tu pack como reglas, coloca al grupo y viaja: el diario muestra cada comprobación y su resultado.
3. Los problemas de las reglas de viaje o de los bindings aparecen en la página del pack, como los de cualquier otra definición.

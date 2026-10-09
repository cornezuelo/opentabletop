# Tipos de definición

Un pack es una carpeta de ficheros YAML (o JSON). Cada fichero tiene una o varias **definiciones**, separadas por una línea con `---`, y cada definición dice qué es con `kind:`. Esta página enumera todos los tipos: para qué sirve cada uno, quién lo lee y cómo se escribe. Todos se comprueban al cargar el pack: un error aparece en **Problemas** de la aplicación Oracle, con su fichero y su línea.

Los tipos son un **conjunto fijo**: cada uno lo lee un motor que lo conoce, y un pack no puede añadir tipos propios (uno que las aplicaciones no conocen se guarda, pero nadie lo lee). Lo que el pack elige libremente es el contenido: sus tablas, su calendario, su clima, sus modos de tirada, sus reglas de viaje y sus características, con los nombres y las reglas de su juego.

| Tipo           | Qué es                                                                | Quién lo lee                                                                        | Cuántos por pack |
| -------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------- |
| `table`        | Una lista de resultados que se eligen por dados o por peso            | El Oracle; los viajes y el descubrimiento, si un binding la nombra                  | Los que quieras  |
| `oracle`       | Una tabla cuyas respuestas dependen de una pregunta (una entrada)     | El Oracle; los viajes y el descubrimiento, si un binding lo nombra                  | Los que quieras  |
| `generator`    | Varias tiradas unidas en un texto                                     | El Oracle; los viajes y el descubrimiento, si un binding lo nombra                  | Los que quieras  |
| `deck`         | Cartas que se roban sin devolverlas                                   | El Oracle; los viajes y el descubrimiento, si un binding lo nombra (roba una carta) | Los que quieras  |
| `roll-modes`   | Formas de tirar una tabla varias veces y quedarse con un total        | El Oracle (cada tirada)                                                             | Uno              |
| `travel-rules` | Cómo funciona un viaje: velocidades, terrenos, provisiones, acciones… | Jugar del Hexmapper, la aplicación Travel                                           | Uno por sistema  |
| `bindings`     | Qué tabla responde a cada comprobación del viaje, las características | Jugar del Hexmapper, la aplicación Travel                                           | Uno por sistema  |
| `calendar`     | Meses, estaciones, días de la semana, lunas y fiestas                 | Los viajes, el panel Mundo del Hexmapper                                            | Uno por sistema  |
| `weather`      | Clima con memoria: el de hoy sigue al de ayer, por estación           | Los viajes (un binding con `weather:`)                                              | Los que quieras  |
| `sheet`        | Lo que tiene cada personaje del grupo: valores, estados               | Los viajes (los personajes del grupo), la aplicación Systems                        | Uno por sistema  |
| `system`       | Un sistema de juego: cuáles de los anteriores usa, y qué packs        | Jugar y Mundo del Hexmapper, la aplicación Travel                                   | Los que quieras  |

**Quién lee qué.** Las tablas, oráculos, generadores y mazos son todo cosas que se tiran, y cualquier cosa que tira puede tirar cualquiera de ellas: el Oracle a mano, una comprobación del viaje o el descubrimiento si un binding la nombra (`resolve: omens` roba una carta). **Cuántos:** uno de los tipos que describen el sistema entero (sus modos de tirada, reglas de viaje, bindings, calendario, hoja: un sistema tiene una forma de hacer cada cosa), los que quieras del resto. Un pack con varios [sistemas](#sistemas) tiene un juego de ellos para cada uno, distinguidos por sus ids. Los modelos de clima pueden ser varios porque un sistema puede tener varios climas (la costa y las montañas, cada uno atado a su comprobación).

Las traducciones de nombres y textos van en ficheros `locales/<idioma>/` con el mismo nombre, para todos los tipos; los que no son tablas, por tipo e id (`calendar/marcher-reckoning:`): mira [Traducciones](../oracle/05-translations.md#reglas-calendarios-clima-y-modos-de-tirada). Los ejemplos de abajo van solo en el idioma base.

## Tablas

```yaml
kind: table
id: weather
name: Clima
roll: 1d6 # vacío: elegir por peso
modes: [advantage, disadvantage] # modos de tirada que se ofrecen a mano
entries:
  - { id: clear, range: 1-3, result: Despejado, set: { weather: clear } }
  - { id: storm, range: 4-6, result: Tormenta, table: storm-damage }
```

Las entradas tienen un `range` de totales (o un `weight`), un texto `result` y, si hace falta, `when` / `unless` (condiciones), `set` (valores que da el resultado), `table` / `generator` (tirar otra), `once` / `maxOccurrences` (límites por sesión), `effects` (cambios en los valores del grupo) y `pause` (detener el viaje cuando sale). La tabla puede tener además `clamp`, `onExhausted`, `modes`, `modeWhen` y `modeUnless`. Todo sobre ellas: [Editar](../oracle/04-editing.md) y [YAML](../oracle/06-yaml.md).

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
  name: { table: npc-names }
  might: { roll: 4d6kh3 }
template: '{{name}} (fuerza {{might}})'
```

**Qué ven otras tablas:** cada campo por su nombre, dentro del generador (`{{name}}`), y desde un generador que tire este, como `{{npc.name}}`.

## Mazos

Cartas que se roban sin reponer hasta que se baraja (`reshuffle: when-empty`, `manual` o `after-draw`). Una carta puede tener copias (`count`), tirar una tabla, poner valores, tener `effects` y `pause`, como una entrada.

```yaml
kind: deck
id: omens
reshuffle: when-empty # when-empty, manual o after-draw
cards:
  - { id: crows, result: Los cuervos os siguen todo el día, count: 3 } # tres copias
  - { id: stranger, result: 'Un desconocido en el camino: {{result}}', table: npc }
  - { id: cache, result: 'El escondite de un cazador', effects: { party.resources.food: 2 } }
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
    cancels: disadvantage # juntos, no se aplica ninguno: tirada normal
  disadvantage: { name: Desventaja, repeat: 2, keep: lowest }
```

Una tabla u oráculo los usa con:

- `modes: [advantage, disadvantage]`: se ofrecen al tirar a mano (la opción junto a **Tirar**).
- `modeWhen: { advantage: { explorer: { gte: 1 } } }`: se usa solo cuando se cumple la condición, también en un viaje. Un modo puede estar en `modeWhen` sin estar en `modes`.
- `modeUnless: { disadvantage: { tags: lit } }`: no se usa solo cuando se cumple la condición. Con `modeWhen` para el mismo modo, se aplica cuando se cumple la primera y no esta (`modeWhen: { disadvantage: { timeOfDay: night } }` + esta: de noche, salvo donde hay luz); sola, el modo se usa siempre menos entonces (una tabla maldita que se tira con desventaja salvo `{ blessed: true }`).

Cuando se aplican varios (uno elegido a mano más otros solos), los que se anulan entre sí se caen y se usa el primero de los demás (el elegido a mano, luego el orden de `modeWhen`, luego el de `modeUnless`). Los modos se referencian como las tablas: primero los del propio pack, luego los de sus dependencias (las Marcas Grises usan el `advantage` de Core), o por su id completo (`core/advantage`). Core declara ventaja y desventaja y las Marcas Grises añaden _Con cuidado_ (tres tiradas, la del medio). El antiguo `advantage: true` ya no hace nada y avisa.

**Qué ven las tablas:** nada: los modos no son valores; una tabla los usa con `modes`, `modeWhen` y `modeUnless`.

## Reglas de viaje

Cómo funciona un viaje: el día (alba, anochecer, horas de marcha), los terrenos y sus velocidades y si se puede entrar (`passable`: `false`, o `{ when, unless }` para un paso cerrado en invierno o un lago que se cruza sobre el hielo), el agua (lo mismo), los caminos y ríos, las formas de viajar (km por día, por dónde pueden ir: `through`, y cuándo se pueden elegir: `when` / `unless`), qué hace el grupo al anochecer si espera (`day.night`), las provisiones (con su `min` / `max`), el clima que frena, sus **valores del día** (`values`: `lost` con lo que `blocks`: `travel`, el id de una de sus acciones (camp, rest, forage…) o `mode.<id>`), las **acciones** del grupo (todas iguales: acampar, descansar, buscar comida…: `when` / `unless`, `oncePerDay`, `on:` para las que hace el propio sistema en un momento o tras otra acción (o varios: una lista), y sus pasos, `do`: `time`, `speed`, `effects`, `set`, `do`, `roll`, `advance`) y las **comprobaciones**: qué se tira al alba, al entrar en un hex, al final del día, con una acción (acampar, por ejemplo) o solo con el `roll:` de un paso, y cuándo (`when` / `unless`); una comprobación puede tener `effects` propios y `pause: true` (detenerse tras ella hasta **Continuar**). Un pack con reglas de viaje es un **sistema** que se juega en el Hexmapper (Jugar → Con reglas) y en la aplicación Travel. En detalle: [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) y los [Sistemas](../systems/02-making-a-system.md) de la aplicación Travel.

Todas las claves, en un sistema pequeño (los comentarios dicen qué hace cada una):

```yaml
kind: travel-rules
id: default
day:
  start: '06:00' # el alba: comprobaciones y acciones day-start
  nightfall: '20:00' # nadie marcha después
  night: camp # qué hace un grupo que espera al anochecer (false: nada)
travel: { hoursPerDay: 8, hexKm: 10 } # horas de marcha al día; km por hex (la escala)
modes: # formas de viajar
  foot: { name: A pie, kmPerDay: 24 }
  horse: { name: A caballo, kmPerDay: 40, unless: { weather: snow } }
  boat:
    { kmPerDay: 50, through: { water: true }, when: { any: [{ water: true }, { tags: ferry }] } }
terrains:
  plains: { multiplier: 1 }
  forest: { multiplier: 0.5 }
  peaks: { multiplier: 0.25, passable: { when: { season: summer } } }
  lake: { multiplier: 0.5, passable: { when: { month: [1, 12] } } } # helado en pleno invierno
defaultTerrain: { multiplier: 1 } # velocidad × de los terrenos no listados
water: { passable: false } # hexes de agua sin regla propia
edges: { road: { multiplier: 1.5 }, river: { multiplier: 1 } } # por un camino o río
resources: # provisiones, con sus límites
  food: { name: Raciones, min: 0 }
weather: { storm: { speed: 0 }, heavy-rain: { speed: 0.5 } }
values: # valores del día que ponen tablas y acciones
  lost: { name: Perdidos, blocks: [travel] }
  snowbound: { blocks: [mode.horse] }
  torchlit: { name: By torchlight }
actions:
  camp:
    when: { party.resources.food: { gte: 1 } } # si no, la noche pasa sin ello
    do:
      - { time: dawn }
      - { unless: { below: food }, effects: { party.stats.fatigue: -1 } }
  rest: { when: { daylight: true }, do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }] }
  march: # los botones de Viajar: cuándo se puede marchar (de día, o con antorchas)
    when:
      {
        any:
          [
            { time.daylight: true, trip.marched: { lt: '{{system.hoursPerDay}}' } },
            { today.torchlit: true },
          ],
      }
  night-march: # desde el anochecer; su botón se oculta el resto del día
    when: { time.hour: { gte: '{{system.nightfall}}' } }
    hideWhenUnavailable: true
    do: [{ set: { torchlit: true } }, { effects: { party.stats.fatigue: 1 } }]
  forage:
    oncePerDay: true
    unless: { weather: storm }
    nothing: 'no hay nada que buscar en {terrain}' # el diario cuando no se aplica ninguna comprobación
    do: [{ time: 180 }, { speed: 0.5 }]
  eat: { on: day-end, do: [{ effects: { party.resources.food: -1 } }] } # no es un botón
checks:
  - { event: WEATHER_CHECK_REQUIRED, at: day-start }
  - { event: NAVIGATION_CHECK_REQUIRED, name: Perderse, at: day-start, unless: { edges: road } }
  - { event: ENCOUNTER_CHECK_REQUIRED, at: [hex-enter, rest], when: { danger: { gte: 2 } } }
  - { event: FORAGE_CHECK_REQUIRED, at: forage }
  - { event: HUNGRY_DAY, at: day-end, when: { below: food }, effects: { party.stats.fatigue: 1 } }
  - { event: SHRINE_CHECK_REQUIRED, at: hex-enter, when: { tags: shrine }, pause: true }
```

Un paso hace una cosa: `time` (minutos, o `dawn`, `nightfall`, `'14:00'`), `speed` (lo que queda de marcha hoy), `effects`, `set`, `do` (otra acción) o `roll` (una comprobación) o `advance` (tantos hexes por la ruta de golpe, un número o una variable); cada paso puede tener `when` / `unless`. El `on:` de una acción es `day-start`, `hex-enter`, `day-end` o el id de otra acción (o una lista). El `at:` de una comprobación admite los mismos momentos (o una lista); sin `at`, solo la tira el `roll:` de un paso. Los valores del día duran hasta que acaba el día (`lasts: day`, la única opción por ahora). Los `perDay` de los packs antiguos, el `consumes` de una forma de viajar y los pasos con `eat: day` se siguen leyendo, como una acción `eat` en day-end.

**Qué ven las tablas:** los datos del viaje (`terrain`, `edges`, `mode`, `day`, `season`, `weather`, `yesterday.<value>`…) y el grupo (`party.resources.food`, `party.stats.fatigue`): la lista completa está en [Qué ven las tablas](04-what-tables-see.md).

## Bindings

La otra mitad de un sistema: qué tabla (`resolve:`) o modelo de clima (`weather:`) responde a cada comprobación, con `context` extra; las **características** del grupo (nombre, descripción, valor inicial) que leen las tablas (`{{charisma}}`), y cuáles salen de sus personajes (`from`); las provisiones que **llevan** sus personajes (`resources`); **reads**, nombres para los demás valores que leen sus tablas (`icon.guards`, `fordModifier`…); y el **descubrimiento** (qué tablas deciden los hexes vacíos). En detalle: [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

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
resources: # con personajes, la comida es la que llevan entre todos (sus raciones)
  food: { carried: rations, share: even }
reads: # nombres para otros valores que leen sus tablas (en el panel de tirada y el mapa)
  danger: { name: Peligro, description: Lo peligroso que es el hex. }
  icon.guards: { name: Guardias }
discover: # tablas que deciden los hexes vacíos según viaja el grupo
  terrain: { resolve: next-terrain }
  contents: { resolve: hex-contents }
  reveal: neighbors # o entered
on: # por evento de comprobación: qué la responde
  WEATHER_CHECK_REQUIRED: { weather: sky } # un modelo de clima
  NAVIGATION_CHECK_REQUIRED: { resolve: getting-lost } # una tabla, oráculo, generador o mazo
  ENCOUNTER_CHECK_REQUIRED: { resolve: encounter, context: { timeOfDay: day } }
  FORD_CHECK_REQUIRED: { resolve: ford, context: { odds: even } } # la entrada de un oráculo
```

Una comprobación sin binding se apunta en el diario (con sus `effects`, si tiene) y solo detiene el viaje si dice `pause: true`.

**Características que salen de los personajes** (`from`, cuando el sistema tiene una [hoja](#hojas)): mientras el grupo tenga personajes, la característica sale de las suyas, y los efectos sobre ella se sobrescriben; mientras no tenga ninguno, se guarda como cualquier otra, así que el mismo sistema se juega con personajes o sin ellos. Una de:

- `max: <valor>` — la mejor de ellos; `min: <valor>` — la peor; `sum: <valor>` — la de todos juntos; `count: true` — cuántos son.
- `when` / `unless` — solo los personajes para los que se cumple esta [condición](08-conditions.md), leída con los valores de cada uno (`unless: { conditions: wounded }`, `when: { values.health: { gt: 0 } }`).
- `none` — lo que vale cuando no cuenta ningún personaje (0 si no se dice).

**Provisiones que se llevan** (`resources`): con personajes, la provisión nombrada (un id de los `resources` de las reglas de viaje) es lo que llevan en un valor de su hoja (`carried: rations`): el viaje muestra su suma, sus límites son la suma de los suyos, y lo que el viaje gaste o gane se reparte entre ellos: `share: even` (lo normal: se quita a quien más tiene y se da a quien menos, de una en una) o `share: order` (primero el primer personaje). Sin personajes, el grupo la guarda como un todo.

**Qué ven las tablas:** cada característica por su nombre (`{{charisma}}`, `when: { party.stats.morale: { lte: 0 } }`) y el `context` del binding (`timeOfDay: night`).

## Calendarios

Los meses del año (con sus días y estaciones), los días de la semana, las lunas (ciclo y fase) y las fiestas, y el año del día 1. Los viajes con ese sistema ponen fecha a su diario con él, y las tablas ven `month`, `year`, `weekday`, `moons.<luna>` (new, waxing, full, waning) y `holidays`. El panel [Mundo](../hexmapper/12-world.md) del Hexmapper usa el calendario del sistema del mapa. Sin uno, se usa un calendario sencillo de días y cuatro estaciones. En la aplicación Systems, la pestaña **Calendario** de un sistema lo edita con un formulario (renombrar un mes arrastra sus fiestas y traducciones).

```yaml
kind: calendar
id: marcher-reckoning
name: El cómputo de las Marcas
watchHours: 4
startYear: 412
months:
  - { id: thaw, name: Deshielo, days: 30, season: spring }
  - { id: highsun, name: Altosol, days: 30, season: summer }
weekdays: [{ id: moonday, name: Díalunar }]
moons: [{ id: pale, name: La Luna Pálida, cycle: 28 }]
holidays: [{ id: midsummer, name: Pleno Verano, month: highsun, day: 15 }]
```

**Qué ven las tablas:** `{{month}}` (el id del mes), `{{year}}`, `{{weekday}}`, la fase de cada luna como `moons.<luna>` (`when: { moons.pale: full }`) y las fiestas de hoy como una lista (`when: { holidays: midsummer }`), además de `season`, que sale del mes. Ids, no nombres: las condiciones comparan ids, y el diario muestra los nombres.

## Modelos de clima

Clima con memoria (una cadena de Markov): por estación, para cada tipo de clima, lo probable que es cada tipo mañana, así que la lluvia se instala varios días y las tormentas pasan. Cada tipo de clima tiene un nombre y los valores que da al día (`set: { fordModifier: -1 }`), como el resultado de una tabla. Un viaje usa uno cuando un binding dice `weather: <modelo>` en vez de `resolve:`; el clima de hoy pasa a ser `weather` para las comprobaciones siguientes y las velocidades de las reglas de viaje. En la aplicación Systems, la pestaña **Clima** de un sistema edita sus modelos con un formulario: los tipos de clima, y por estación una cuadrícula de pesos del clima de ayer al de hoy, con la frecuencia de cada uno a lo largo de muchos días.

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

**Qué ven las tablas:** `{{weather}}`, el id del clima de hoy (`rain`), y cada valor que pone su estado, por su nombre (`{{fordModifier}}`, `when: { fordImpossible: true }`); al día siguiente, los mismos valores como `yesterday.weather`, `yesterday.fordModifier`. No hay `{{weather.value}}`: el clima es su id, y sus valores son valores del día como el `set` de cualquier tabla.

Las Marcas Grises usan todos los tipos: mira [Las Marcas Grises](../packs/02-grey-marches.md#donde-esta-cada-cosa).

## Hojas

Lo que tiene cada personaje del grupo, cuando un sistema los juega uno a uno (`sheet:` en su [sistema](#sistemas)). Los viajes tienen entonces una sección **Personajes** donde los añades, eliges quién actúa y cambias sus valores; las características y provisiones del grupo pueden salir de ellos ([bindings](#bindings): `from`, `resources`). PJ, compañeros, mercenarios o enemigos son todos personajes de una hoja.

```yaml
kind: sheet
id: companion
name: Compañero
values: # números que tiene cada personaje, con los límites que les da el sistema (ninguno: sin límite)
  survival: { name: Supervivencia, default: 1, min: 0, max: 5, group: skills }
  pathfinding: { name: Rastreo, default: 0, min: 0, max: 3, group: skills }
  maxHealth: { name: Salud máxima, default: 3, min: 1, max: 6, group: body }
  health: { name: Salud, default: 3, min: 0, max: '{{maxHealth}}', group: body } # otro valor como límite
  rations: { name: Raciones, default: 2, min: 0, max: 6 }
  dread: { name: Pavor, default: 0, min: 0, max: 6, track: true } # se muestra como 6 casillas
groups: # los encabezados bajo los que se muestran los valores, en este orden
  skills: { name: Habilidades }
  body: { name: Cuerpo }
conditions: # estados que un personaje tiene o no, y lo que el grupo no puede hacer mientras alguien lo tenga
  wounded: { name: Herido, blocks: [forced-march] } # una acción del sistema
  sprained: { name: Tobillo torcido, blocks: [travel] } # marchar
  saddle-sore: { name: Molido de la silla, blocks: [mode.horse] } # una forma de viajar
relations: # tipos de relación que un personaje puede tener con cualquier cosa con referencia
  bond: { name: Vínculo, value: { min: 0, max: 3 } } # con un número
  home: { name: Hogar }
```

- `values`: `default` (lo que tiene un personaje nuevo, 0 si falta), `min` / `max` (un número, u otro valor de la hoja como `'{{nombre}}'`), `track: true` (se muestra como casillas, tantas como su `max`, que debe ser un número), `group` (uno de `groups`).
- `conditions`: `blocks` dice lo que todo el grupo no puede hacer mientras alguno de sus personajes lo tenga: el id de una acción, `travel`, o `mode.<id>`. El viaje dice quién lo tiene.
- Las condiciones y tablas leen cada personaje como `characters.<id>.…`, al que actúa ahora como `acting.…`, y los ids del grupo como `party.members`; los efectos los cambian (`party.members.values.health: 1`, `acting.conditions.wounded: true`). Mira [Lo que ven las tablas](04-what-tables-see.md#personajes).
- Se traduce como cualquier otro tipo, con la clave `sheet/<id>`, por valor, grupo, estado y relación (`values: { health: { name: Salud } }`).

## Sistemas

Un sistema nombra, en un solo sitio, lo que usa una partida jugada con él: sus reglas de viaje, bindings, calendario y modelos de clima, y los packs cuyas tablas, oráculos y mazos trae consigo. Los mapas y los viajes eligen un sistema: un mapa del Hexmapper en **Ajustes del mapa → Mapa → Sistema** (sus viajes, el calendario de su panel Mundo y su panel Oracle usan lo que trae el sistema), un viaje de la aplicación Travel en la página del sistema; ambos los muestran por su nombre.

```yaml
kind: system
id: default
name: The Grey Marches
description: A haunted frontier, travelled on foot, on horseback or by cart.
travel: default # sus reglas de viaje (kind: travel-rules, id: default)
bindings: default # sus bindings
calendar: marcher-reckoning # su calendario
sheet: companion # la hoja de sus personajes
weather: [sky] # los modelos de clima que pueden usar sus bindings
packs: [core] # packs cuyas tablas trae
maps: [maps/grey-marches.otd.json] # mapas de ejemplo, ficheros de este pack
```

- Todas las partes son opcionales. Sin `travel`, el sistema usa las reglas **Genéricas**; sin `bindings`, ninguna tabla responde a sus comprobaciones (solo se apuntan en el diario, y detienen el viaje solo con `pause: true`) y el grupo no tiene características; sin `calendar`, el de por defecto; sin `weather`, sus bindings no pueden nombrar un modelo de clima; sin `sheet`, su grupo se juega como un todo (el sistema **Genérico** tiene una pequeña propia: salud y una herida).
- Cada parte es una definición de este pack, por su id (`travel: default`), o de un pack del que depende (`travel: core/slow`, con `core` en sus `dependencies`). `packs` también lista dependencias; el pack del propio sistema siempre va incluido.
- **Su id:** un sistema con `id: default` se elige por el id de su pack (`grey-marches`), cualquier otro por pack e id (`grey-marches/winter`). Un pack puede declarar varios, p. ej. la misma tierra en verano y en invierno con otras reglas de viaje.
- `name` y `description` son lo que leen los jugadores (si falta el nombre, es el del pack); se traducen en `locales/<idioma>/` con la clave `system/<id>`, como los demás tipos.
- `maps` lista **mapas de ejemplo** en los que jugar el sistema: ficheros de mapa (`.otd.json`, lo que escribe **Guardar** en el Hexmapper) guardados en este pack, por su ruta en él (normalmente una carpeta `maps/`). El Hexmapper los ofrece en **Mapas → Mapas de ejemplo**, y el **Resumen** del sistema en la aplicación Systems los añade y los quita. Los ficheros de mapa de un pack no son definiciones: nada más los lee.
- **Los packs antiguos** que tienen reglas de viaje pero no `kind: system` siguen funcionando: son un sistema con el nombre del pack, con sus reglas de viaje, bindings y calendario, y los modelos de clima de todos los packs. En cuanto un pack declara un sistema, solo cuenta lo que declara.
- Un sistema viaja entero: el **Resumen → Exportar como .zip** de la aplicación Systems escribe su pack con todos los packs que necesita (los de `packs`, de los que vienen sus partes y sus dependencias), e **Importar un sistema (.zip)…** lo vuelve a leer ([Llevarlo a otra parte](../systems/02-making-a-system.md#llevarlo-a-otra-parte)).

La aplicación Systems escribe uno en cada sistema nuevo, lo edita en el **Resumen** del sistema y declara el de un pack antiguo (**Declararlo**). Las Marcas Grises declaran el suyo en `system.yaml`.

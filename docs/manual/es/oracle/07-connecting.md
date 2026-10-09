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

Lo que una tabla puede leer del mapa: `terrain`, `tags` (las etiquetas del hex), `region` (el nombre de la región), cada **campo** del hex por su clave (un hex con el campo `danger: 3` da `danger`) y `hex`. Durante un viaje, además, `season`, `weather`, `mode` (a pie, a caballo…), `day` y las características del grupo. Todos los valores, y cuál gana cuando dos se llaman igual: [Lo que ven las tablas](../technical/04-what-tables-see.md).

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

Una entrada (o una carta de un mazo) cambia el grupo con **efectos** (`effects`): cada uno es un valor que declara el sistema, por la ruta con la que lo leen las tablas. Un número suma o resta; `'=valor'` lo fija; dentro funcionan una tirada o una variable (`'{{1d3+1}}'`; `'-{{party.stats.mouths}}'` quita tantos como otro valor, `'={{party.stats.endurance}}'` lo fija a él, `'-{{loss}}'` lee un valor que fija la entrada). Un valor se queda en el `min` y el `max` que declara su sistema (características y provisiones por igual); sin ellos puede ir a cualquier parte, también a negativo.

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

Un pack se convierte en un **sistema** con el que se puede jugar un mapa (Hexmapper: **Ajustes del mapa → Mapa → Sistema**) y que muestran las aplicaciones Systems y Travel cuando tiene dos definiciones más: las **reglas de viaje** (a qué velocidad, qué comprobaciones y cuándo) y los **bindings** (qué tabla responde a cada comprobación). Ponlas en cualquier fichero del pack, p. ej. `travel.yaml`; un `kind: system` puede nombrarlas, con el calendario, el clima y los packs que van con ellas (ver [Nombrar el sistema](#nombrar-el-sistema)):

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00' }
travel: { hoursPerDay: 8, hexKm: 10 } # horas de marcha al día; km por hex
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

El resto de esta sección repasa cada parte de ese ejemplo: para qué sirve, qué puede decir y unas líneas que funcionan. Para construir un sistema con los formularios, paso a paso, mira [Tu primer sistema](../systems/03-your-first-system.md) en la aplicación Systems; [Un día, paso a paso](../travel/02-playing.md#un-dia-paso-a-paso) dice en qué orden lo hace todo un viaje.

### El día y la velocidad

**day** dice cuándo se despierta el grupo (`start`, el alba) y cuándo tiene que parar (`nightfall`): nadie marcha de noche. **travel** dice cuántas horas del día son para marchar (`hoursPerDay`); las acciones también gastan horas. Su `hexKm` es la escala a la que se juega el sistema, cuántos km mide un hex (`hexKm: 30`: un hex es un día de marcha a 30 km al día): la usan los viajes sin mapa, y también un mapa con el sistema salvo que el mapa fije su propia escala (Hexmapper: Ajustes del mapa → Mapa). Sin ella, la del mapa o la del camino de Travel, 10 por defecto. El `kmPerDay` de una forma de viajar es lo que recorre en esas horas por terreno fácil, y todo lo demás lo multiplica:

- **terrains**: la velocidad en cada terreno (`multiplier`: 0.5 es la mitad, 2 el doble), por los ids de la paleta del Hexmapper. `defaultTerrain: { multiplier: 1 }` cubre los terrenos que usa el mapa y la lista no nombra.
- **edges**: caminos, senderos y ríos que sigue el grupo (`road: { multiplier: 1.5 }`). Siguiendo uno, su multiplicador sustituye al del terreno.
- **weather**: el clima de hoy (por el id que pone una tabla o un modelo de clima) frena a todos: `storm: { speed: 0 }` (nadie viaja), `heavy-rain: { speed: 0.5 }`.

Un terreno puede estar **cerrado**: `passable: false`, siempre, o con una [condición](../technical/08-conditions.md) sobre el hex al que se entra y el momento. Las rutas rodean lo cerrado.

```yaml
terrains:
  swamp: { multiplier: 0.33 }
  peaks: { multiplier: 0.25, passable: { when: { season: summer } } } # abierto solo en verano
  pass: { multiplier: 0.5, passable: { unless: { weather: [snow, storm] } } } # cerrado con nieve
  lake: { passable: { when: { month: [deepwinter, wolfmoon] } } } # se cruza sobre el hielo
water: { passable: false } # hexes de agua cuyo terreno no está en la lista
```

**water** hace lo mismo con los hexes de agua cuyo terreno no está en la lista (Editar paleta → Agua en el mapa). Las tablas ven `water: true` en los hexes de agua.

### Formas de viajar

**modes** son las formas de viajar entre las que elige el jugador en el panel del viaje, cada una con su `kmPerDay` y un `name` (y una `description`) para los jugadores: el panel y el diario muestran _A caballo_ en lugar de `horse`, traducido en `locales/` como el resto. Sin nombre, los ids habituales de las reglas Genéricas (foot, horse…) toman los nombres de la aplicación y cualquier otro muestra su id. Dos condiciones dan forma a cada una:

- `through`: **por dónde puede ir**, una [condición](../technical/08-conditions.md) sobre cada hex en el que entra. Ve el hex (`terrain`, `water`, `tags`, `region`, sus campos), `edges` (los caminos o ríos de ese paso), `mode`, `weather` y los valores del día. Donde se cumple, la forma de viajar pasa, incluso por terrenos cerrados; donde no, no puede, y las rutas lo rodean. Una barca: `through: { water: true }` (navega por el agua, donde a pie no se puede ir); la barca de las Marcas Grises también va pegada a la costa, `through: { any: [{ water: true }, { terrain: coast }] }`; un carro solo por camino: `through: { edges: road }`. El antiguo `allowedTerrains: [water, coast]` sigue funcionando.
- `when` / `unless` (**Solo si** / **Salvo si** en la aplicación Systems): **cuándo se puede elegir**, visto donde está el grupo. Si no, sale desactivada en el panel del viaje, diciendo por qué. La barca de las Marcas Grises solo se coge en la orilla o en un transbordador: `when: { any: [{ water: true }, { terrain: coast }, { tags: ferry }] }`; un caballo, no con nieve: `unless: { weather: snow }`.

Un valor del día también puede bloquear una (`blocks: [mode.horse]`, abajo): no se puede elegir, y un grupo que ya viaja así se detiene hasta que cambie.

### Provisiones

**resources** son lo que lleva el grupo: comida, agua, antorchas, forraje… Cada una sale en el panel del viaje, donde el jugador también puede cambiarla a mano. **Nada las gasta por sí solo**: lo hacen las acciones, comprobaciones y tablas del sistema, con efectos (`party.resources.food: -1`). Así dice un sistema cómo se come en su juego: una vez al día, al acampar, solo a caballo, nunca.

`min` y `max` acotan una provisión. Un cambio que pasaría de uno se queda en él, el diario lo dice («Raciones no puede bajar de 0») y lo que viene después en ese momento ve el id de la provisión en `below` (o `above`): los pasos siguientes de la misma acción y las comprobaciones `day-end` de ese día. Así se escribe «un día sin comida cansa al grupo»:

```yaml
resources:
  food: { name: Raciones, min: 0 }
  water: { name: Odres, min: 0, max: 6 } # no se pueden llevar más de 6
checks:
  - { event: HUNGRY, at: day-end, when: { below: food }, effects: { party.stats.fatigue: 1 } }
```

Sin `min`, una provisión puede quedar en negativo (una deuda, por ejemplo). Los packs antiguos que escribían `perDay` en una provisión, `consumes` en una forma de viajar o pasos `eat: day` siguen funcionando, leídos como una acción al final del día con `min: 0` (**Convertir**, en el editor de Travel, lo escribe así).

### Valores del día

**values** son los valores del día que declara este sistema, cada uno con un `name` para los jugadores y lo que **bloquea** mientras se cumple: `travel` (viajar), una de las acciones del sistema por su id (`camp`, `rest`, `forage`…) o una forma de viajar (`mode.horse`). Lo pone el resultado de una tabla (`set: { lost: true }`), un estado del clima o el paso de una acción; se mantiene hasta que acaba el día, y al día siguiente las tablas lo leen como `yesterday.lost`.

```yaml
values:
  lost: { name: Perdidos, blocks: [travel] } # lo pone la tabla de perderse
  snowbound: { name: Nieve profunda, blocks: [mode.horse] } # lo pone la nieve
  mutiny: { name: Los porteadores se niegan a marchar, blocks: [travel, forage] }
```

Los botones bloqueados siguen visibles, desactivados, y dicen por qué con el nombre del valor («Perdidos: no es posible el resto del día»). Un sistema que no declara `values` sigue teniendo el antiguo `lost` incorporado (bloquea el viaje); uno que declara `values: {}` no tiene ninguno. Los valores que no bloquean nada también sirven: las condiciones los leen (`unless: { mutiny: true }`), igual que leen los valores `…Modifier` e `…Impossible` del [apartado 4](#4-resultados-que-entiende-el-viaje).

### Acciones

**actions** son lo que hace el grupo. Acampar y descansar son acciones como cualquier otra: un id, condiciones, pasos; el panel del viaje muestra cada una como un botón junto a **Viajar**, con su `name` (y su `description` como ayuda). Las reglas que no declaran `camp` o `rest` siguen teniendo las habituales (dormir hasta el alba, descansar una hora), y `camp: false` deja una fuera.

**Marchar también es una acción**, `march`: no un botón propio, sino los botones de **Viajar**, el primero de los cuales toma su `name` y muestra su `description` como ayuda (`name: Marchar`). Su `when` / `unless` dicen cuándo puede marchar el grupo, y se comprueban mientras marcha: se para en cuanto dejan de cumplirse (el diario lo cuenta como que cae la noche, que se acabaron las horas del día o que lo dice la regla del sistema). Sin `when`, el grupo marcha de día durante las horas de marcha del día, como `when: { time.daylight: true, trip.marched: { lt: '{{system.hoursPerDay}}' } }`; un `unless` se suma a eso. No tiene pasos, y nada la hace salvo los botones de Viajar. Las Marcas Grises marchan de día o, tras una marcha nocturna, a la luz de las antorchas hasta medianoche:

```yaml
values:
  torchlit: { name: A la luz de las antorchas }
actions:
  march:
    when:
      {
        any:
          [
            { time.daylight: true, trip.marched: { lt: '{{system.hoursPerDay}}' } },
            { today.torchlit: true },
          ],
      }
  night-march:
    when: { time.hour: { gte: '{{system.nightfall}}' } }
    do: [{ set: { torchlit: true } }, { effects: { party.stats.fatigue: 1 } }]
```

Cuándo se puede pulsar el botón:

- `when` / `unless`: condiciones (como las de una tabla) sobre los datos del viaje, los valores de hoy y el grupo. Las Marcas Grises buscan comida `unless: { weather: storm }` y solo acampan `when: { party.resources.food: { gte: 1 }, party.stats.fatigue: { lt: 10 } }`. Si no se cumplen, el botón se desactiva y dice por qué.
- `daylight` en esas condiciones: `true` entre el alba y el anochecer del sistema (`day.start`, `day.nightfall`), `false` el resto de la noche. Las Marcas Grises descansan, buscan comida y fuerzan la marcha solo `when: { daylight: true }`, así no se puede saltar la noche descansando, y su marcha nocturna es solo `when: { daylight: false }`.
- `oncePerDay: true`: una vez al día.
- Un valor del día que la `blocks` (arriba).

Un botón que no se puede pulsar sigue visible, desactivado, diciendo por qué, así los botones no cambian de sitio. `hideWhenUnavailable: true` lo oculta en cambio mientras no se puede hacer: para acciones que solo tienen sentido de vez en cuando, como el rito de las Marcas Grises (en un santuario con la Luna Ascua llena), convencer a los mercenarios (solo mientras se niegan) o la marcha nocturna (solo pasado el anochecer).

**Acciones que hace el propio sistema.** Con `on:` una acción no es un botón: el sistema la hace en ese momento, si se cumplen su `when` / `unless`. Los momentos son `day-start` (al alba), `hex-enter` (al entrar en cada hex), `day-end` (al acabar cada día, se acampe o no) u otra acción por su id (justo al empezar esa acción: `on: camp`), o varios en una lista (`on: [day-start, hex-enter]`). Va antes de las comprobaciones de ese momento, así que ven lo que cambió; sus condiciones ven qué momento es como `moment`, y en `day-end` la acción en curso como `doing` (`doing: camp`).

```yaml
actions:
  eat: { on: day-end, do: [{ effects: { party.resources.food: -1 } }] }
  feed-horses: # solo yendo a caballo
    on: day-end
    when: { mode: horse }
    do: [{ effects: { party.resources.fodder: -1 } }]
```

**Lo que hace una acción** es una lista de **pasos** (`do`), en orden. Cada paso hace una cosa, y solo si se cumple su propio `when` / `unless`:

| Paso                                  | Lo que hace                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `time: 180`                           | Pasan tres horas. `time: dawn`, `time: nightfall` o `time: '14:00'`: hasta el siguiente. Cada día que acaba por el camino acaba con sus acciones y comprobaciones de `day-end`.                                                                                                                                         |
| `speed: 0.5`                          | El resto de la marcha de hoy va a media velocidad (`1.5`: más rápido).                                                                                                                                                                                                                                                  |
| `effects: { party.stats.fatigue: 1 }` | Cambia al grupo, como los efectos de una tabla. Un cambio que pasaría el `min` / `max` de un valor se queda en él, y los pasos siguientes ven su id en `below` / `above`.                                                                                                                                               |
| `set: { lost: true }`                 | Fija valores del día que declara el sistema (`values`).                                                                                                                                                                                                                                                                 |
| `do: forage`                          | Hace otra acción, si se cumplen sus condiciones (si no, no pasa nada).                                                                                                                                                                                                                                                  |
| `roll: ENCOUNTER`                     | Tira ya una comprobación: todas las de ese evento cuyo `when` / `unless` se cumplan, tengan el `at` que tengan. Se resuelve al acabar la acción, así que los pasos siguientes no ven su resultado.                                                                                                                      |
| `advance: 1`                          | Avanza al grupo tantos hexes por su ruta de golpe, sin que pase el tiempo: cada hex se entra como marchando (sus comprobaciones `hex-enter`, su visita, los totales del viaje); se detiene en el destino, en un paso que no puede tomar o en una comprobación. También una variable: `advance: '{{party.stats.rank}}'`. |

```yaml
actions:
  camp: # dormir hasta el alba; una noche bien comidos baja la fatiga
    do:
      - { time: dawn }
      - { unless: { below: food }, effects: { party.stats.fatigue: -1 } }
  forced-march:
    name: Marcha forzada
    when: { party.stats.fatigue: { lt: 2 } } # solo con el grupo descansado
    do: [{ speed: 1.5 }, { effects: { party.stats.fatigue: 1 } }]
  keep-watch: # un paso que tira y luego un paso con condición
    do: [{ roll: NIGHT_WATCH }, { unless: { party.stats.morale: { gte: 1 } }, time: 60 }]
```

Lo que **tira** una acción son las comprobaciones con `at: <su id>` (las de acampar: `at: camp`), que se tiran antes de sus pasos. `nothing` es lo que dice el diario cuando ninguna se aplica donde está el grupo (`nothing: 'no hay nada que buscar en {terrain}'`, con `{terrain}` el terreno del hex); sin él, el diario dice que allí no se tira ninguna de sus tiradas. En los formularios de la aplicación Systems cada paso se escribe igual, una casilla por paso, con sugerencias. La forma antigua (`minutes: 180, speed: 0.5, effects: …` en la acción, o un paso `eat: day`) sigue funcionando, leída como esos pasos. Las Marcas Grises lo usan todo: mira [su acampada, descanso y búsqueda de comida](../packs/02-grey-marches.md).

**Al anochecer.** `day: { night: camp }` dice qué hace el grupo cuando cae la noche mientras espera con el reloj del mundo: acampar (por defecto, si el sistema tiene camp), otra acción, o `false` (la noche simplemente pasa). Si la acción no se puede hacer (la bloquea un valor o no se cumplen su `when` / `unless`), la noche pasa sin ella y el diario dice por qué; una orden de viajar al anochecer hace lo mismo y sigue marchando al alba.

### Viajes por movimientos

Algunos juegos no marchan hora a hora: un viaje se hace de **movimientos**, cada uno acerca al grupo un tanto, y llegar puede pedir una tirada. El paso `advance` es ese avance: el grupo avanza por su ruta tantos hexes (o tramos de un camino, en la app Travel) como diga, de golpe.

- **Sin marchar**: da a la marcha una condición que nadie cumpla, y solo los movimientos hacen avanzar al grupo (`march: { when: { today.marching: true } }`, un valor que nadie fija).
- **Un movimiento**: una acción cuyos pasos pasan tiempo, gastan provisiones y avanzan (`do: [{ time: 240 }, { effects: { party.resources.food: -1 } }, { advance: 1 }]`); con una comprobación (`roll:` o `at:` su id) cuya tabla decide cómo fue.
- **Un avance que depende de algo**: `advance: '{{party.stats.rank}}'` avanza tantos tramos como una característica; un paso con `when` solo avanza con un buen resultado del día (`when: { today.made-way: true }`, que fija la tabla del movimiento).
- **Llegar con una tirada**: el último tramo es un terreno que solo es `passable` con un valor del día (`passable: { when: { reached: true } }`), que fija una acción cuya tabla tira por ello; luego el `advance: 1` de esa acción mete al grupo.

```yaml
actions:
  march: { when: { today.marching: true } } # nadie marcha: solo movimientos
  press-on:
    name: Seguir adelante
    description: 'Medio día de camino: una ración, y un tramo más cerca.'
    do:
      - { time: 360 }
      - { effects: { party.resources.food: -1 } }
      - { advance: 1 }
… # el resto de las reglas de viaje
```

El **Ir con un carretero** de las Marcas Grises lo usa en el camino.

### Comprobaciones

**checks** son lo que tira el viaje, y cuándo. Cada una tiene un `event` (el nombre que quieras: los bindings lo usan para elegir su tabla), un `name` y una `description` para los jugadores (se ven en el panel del viaje y el diario en lugar del evento; se traducen en `locales/`, mira [Traducciones](05-translations.md#reglas-calendarios-clima-y-modos-de-tirada)) y un `at`:

- `day-start`: al alba, antes de marchar (el clima, perderse);
- `hex-enter`: al entrar en cada hex (encuentros, un peaje, un hito);
- `day-end`: al acabar cada día, después de las acciones `day-end` del sistema (el hambre). Ven `below` / `above`, lo que llegó a un límite ese día, y `doing`, la acción en curso cuando acabó;
- el id de una acción: con esa acción, antes de sus pasos (`at: camp`, `at: forage`);
- varios, en una lista: las Marcas Grises tiran encuentros `at: [hex-enter, rest]`, y su condición distingue los dos con `moment` (la tabla también ve `moment`);
- ninguno: solo la tira el `roll:` de un paso.

`when` / `unless` deciden dónde y cuándo se aplica, con las mismas [condiciones](../technical/08-conditions.md) que las tablas; `edges` son los caminos o ríos del tramo (el que acabas de recorrer al entrar en un hex, el que tienes por delante al alba y al acampar).

```yaml
checks:
  - { event: LOST, name: Perderse, at: day-start, unless: { edges: [road, river] } }
  - event: ENCOUNTER
    at: [hex-enter, rest]
    when: { any: [{ moment: hex-enter, danger: { gte: 1 } }, { moment: rest, danger: { gte: 3 } }] }
  - { event: SHRINE, at: hex-enter, when: { tags: shrine }, pause: true } # espera a Continuar
  - { event: HUNGRY, at: day-end, when: { below: food }, effects: { party.stats.fatigue: 1 } }
```

Una comprobación puede tener **sus propios efectos**: sin tabla, simplemente los aplica, que es como un sistema escribe sus reglas como datos («un día sin comida suficiente: fatiga +1»). Una comprobación sin tabla ni efectos solo se apunta en el diario. `pause: true` la tira (si una tabla la resuelve) y luego detiene el viaje hasta **Continuar**, para que describas el lugar, la resuelvas tú o decidas algo: **solo `pause: true` detiene el viaje**, con tabla o sin ella (un lugar señalado que describir: `pause: true` y sin tabla). Esperar con el reloj del mundo (Hexmapper → [Reloj del mundo](../hexmapper/12-world.md#con-un-viaje-en-marcha)) también las tira (y hace las acciones con `on:`): `day-start` en cada alba, las de acampar en cada anochecer, `day-end` al acabar cada día. En los packs antiguos, `short` significa que algo llegó a su mínimo, y `camping` que estaba en curso la acción de la noche.

### Bindings, características y lecturas

Los **bindings** (`kind: bindings`) son la otra mitad del sistema:

- `on` conecta cada comprobación, por su evento, con lo que la responde: `resolve:` una tabla, oráculo, generador o mazo del pack (o de otro pack, por su id completo: `core/weather`), o `weather:` un [modelo de clima](#clima-con-inercia). `context` añade valores solo para esa comprobación, y gana a todo lo demás: la misma tabla de encuentros responde de día y de noche con `context: { timeOfDay: night }` en la comprobación de acampar, y un oráculo recibe su pregunta como `context: { odds: likely }`. **Las comprobaciones sin binding** se apuntan en el diario (con sus efectos, si tienen), y detienen el viaje hasta **Continuar** solo si dicen `pause: true`: los hitos de las Marcas Grises.
- `stats` son los números del grupo, que aparecen en el panel del viaje, donde los pones al empezar y los cambias mientras juegas. Las aplicaciones no se inventan ninguno: cada sistema declara los suyos, con un `name`, una `description` (su ayuda en el panel del viaje), un valor inicial (`default`) y, si los tiene, `min` y `max` (la fatiga nunca baja de 0). Las tablas los leen por su clave, `{{charisma}}`, o siempre sin ambigüedad `party.stats.charisma`. Las Marcas Grises declaran Carisma, Supervivencia, Orientación y Moral; las reglas Genéricas no tienen ninguno. Una tabla puede cambiar uno que nadie declaró (`effects: { party.stats.hirelings: 1 }`): funciona y aparece con su clave, pero el pack recibe un aviso, así que declara todas las características que cambian sus tablas.
- `reads` da nombre a los demás valores que leen las tablas del sistema y que nadie más nombra: un valor del mapa (`danger`, `icon.guards`, `token.fare`), el contexto de los bindings (`timeOfDay`) o los valores del día que ponen las tablas (`fordModifier`). Con un `name` y una `description` cada uno, el panel de tirada los muestra por su nombre, con lo que son en su ayuda: `reads: { icon.guards: { name: Guardias, description: Cuántos guardias vigilan las puertas. } }`. Los valores que dan los mapas y los viajes (terreno, estación, fiestas…) ya tienen nombre en las aplicaciones.

```yaml
kind: bindings
id: default
on:
  NIGHT: { resolve: encounters, context: { timeOfDay: night } }
  FORD: { resolve: ford, context: { odds: even } } # un oráculo y su pregunta
stats:
  morale:
    {
      name: Moral,
      description: Baja con el hambre y las malas noticias.,
      default: 2,
      min: -3,
      max: 3,
    }
reads:
  danger: { name: Peligro, description: Lo peligroso que es el hex. }
```

### Nombrar el sistema

Las reglas de viaje y los bindings bastan para un sistema con el nombre de su pack. Un `kind: system` lo dice en un solo sitio, con lo demás que trae: su calendario, los modelos de clima que usan sus bindings, tablas de otros packs (packs de los que depende) y mapas de ejemplo para jugarlo (`maps:`, ficheros de mapa del pack, que el Hexmapper lista en **Mapas → Mapas de ejemplo**). Un pack puede declarar varios, p. ej. una variante de invierno con sus propias reglas de viaje: En la aplicación Systems, el **Resumen** del sistema lo escribe con un formulario.

```yaml
kind: system
id: default # se elige por el id del pack
name: Dark Woods
travel: default
bindings: default
---
kind: system
id: winter # se elige como <pack>/winter
name: Dark Woods in winter
travel: winter # otro kind: travel-rules, con id: winter
bindings: default
```

Todas las claves están en [Sistemas](../technical/07-kinds.md#sistemas).

### Personajes

Un sistema puede jugar su grupo como un todo (sus características y provisiones son las del grupo) o personaje a personaje, o las dos cosas. Para los personajes, declara una **hoja** (`kind: sheet`: sus valores con límites, sus estados y lo que bloquea cada uno, los tipos de relación que tienen) y la nombra en su sistema (`sheet: companion`). Los viajes tienen entonces una sección **Personajes**: añádelos, elige quién actúa, cambia sus valores.

Luego los bindings dicen qué toma el grupo de ellos:

- **Características que salen de las suyas:** `navigation: { name: Orientación, from: { max: pathfinding } }` es el mejor Rastreo de ellos; `min` el peor, `sum` el de todos juntos, `count: true` cuántos son; `when` / `unless` dejan fuera a algunos (`count: true, unless: { conditions: wounded }`: los que no están heridos). Sin personajes la característica se guarda como siempre, así que el mismo sistema se juega de las dos formas.
- **Provisiones que llevan:** `resources: { food: { carried: rations } }`: la comida del grupo es la suma de sus raciones, y lo que el viaje come o encuentra se reparte entre ellos (por igual si no se dice otra cosa, `share: order` para empezar por el primero).

- **Roles de viaje:** `roles: { guide: { name: Guía }, lookout: { name: Vigía } }`: en un viaje el jugador da cada uno a un personaje, y las comprobaciones y tablas leen a quien lo tiene, `roles.guide.values.pathfinding: { gte: 2 }`.

Los efectos llegan a ellos: `party.members.values.health: 1` (todos los personajes), `acting.conditions.wounded: true` (el que actúa), `roles.lookout.values.health: -1` (quien tenga un rol), `characters.kael.values.health: -1` (uno). Las condiciones leen `party.members: kael`, `acting.values.survival: { gte: 2 }`, `characters.kael.conditions: wounded`.

**Las relaciones** unen a un personaje con otro, un lugar, una región o un hex (los tipos de la hoja: un vínculo, un hogar…). Allí donde va el grupo, `hex.related` dice quién está unido al hex (él, su región o un lugar en él) y `hex.relations.home` quién lo tiene por hogar: una comprobación `when: { hex.relations.home: { exists: true } }, unless: { from.relations.home: { exists: true } }` sale cuando el grupo llega a casa.

```yaml
kind: sheet
id: companion
name: Compañero
values:
  survival: { name: Supervivencia, default: 1, min: 0, max: 5 }
  health: { name: Salud, default: 3, min: 0, max: 3 }
  rations: { name: Raciones, default: 2, min: 0, max: 6 }
conditions:
  wounded: { name: Herido, blocks: [forced-march] }
```

Las Marcas Grises juegan así su Compañía: Supervivencia del mejor de los que no están heridos, Sigilo del más torpe, una ración por boca de lo que llevan, una noche bien comidos que cura a todos, un vado que tuerce el tobillo de quien guía el cruce, **Curar a los heridos** para quien actúe con Supervivencia 2 o más, un guía y un vigía, y En casa cuando el grupo llega al hogar de un compañero ([Las Marcas Grises](../packs/02-grey-marches.md)). Todas las claves están en [Hojas](../technical/07-kinds.md#hojas).

### Facciones

Los poderes del mundo del sistema son **facciones** (`kind: factions`, nombradas con `factions:` en su sistema): cada una, un personaje de una hoja (fuerza, reputación…) con tierras en un mapa. En cada turno del mundo (a mano, o cada pocos días del reloj del mundo) cada una tira una tabla de turno cuyos efectos la cambian a ella (`faction.values.strength: 1`, `faction.territory: 1`), a otra (`factions.the-vale.values.strength: -1`) o un reloj de progreso (`world.clocks.the-iron-clans-march: 1`). Cualquier tabla las lee: `factions.iron-clans.values.strength`, `hex.faction: the-vale` (la patrulla de las Marcas Grises recorre las tierras que tenga el Valle). Todas las claves: [Facciones](../technical/07-kinds.md#facciones).

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

_Una estación también puede ser una flor hexagonal: 19 casillas por las que el clima deriva con 2d6, mira [Modelos de clima](../technical/07-kinds.md#modelos-de-clima)._

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
- El diario muestra el clima del día por su nombre. En **Comprobaciones** de la aplicación Systems, elige el modelo bajo _Clima con inercia_.

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
2. En la aplicación Travel, elige tu sistema y abre **Jugar**: monta un camino corto con los terrenos y etiquetas que buscan tus comprobaciones, y viaja. El diario muestra cada comprobación y su resultado.
3. En un mapa: en el Hexmapper, Jugar → **Con reglas**, elige tu pack como reglas, coloca al grupo y viaja.
4. Los problemas de las reglas de viaje o de los bindings aparecen en la página del pack, como los de cualquier otra definición.

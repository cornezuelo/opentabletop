# Acciones y pasos

Todo lo que hace el grupo en un viaje es una **acción** de su sistema: marchar, acampar, descansar, buscar comida, cruzar un río. El motor no tiene ninguna propia. Cada acción dice **cuándo** se puede hacer (`when` / `unless`, `oncePerDay`), **quién** la hace (el jugador con un botón, o el propio sistema en un momento: `on:`) y **qué hace**: una lista de **pasos** (`do:`), en orden. Esta página reúne todos los pasos, con un ejemplo de cada uno y, al final, un sistema entero que los usa todos. El resto de una acción (sus parámetros, sus comprobaciones, el alto, cómo sigue el viaje por sí solo) está en [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje); el YAML de todo el tipo, en [Tipos de definición](07-kinds.md#reglas-de-viaje).

En la aplicación Systems cada acción es una tarjeta en **Reglas → Acciones**, y cada paso una tarjeta propia en **Qué hace**: una elección de lo que hace (_Pasar el tiempo_, _Moverse_, _Hacer otra acción_…) y los campos de ese tipo, su propio **Solo si** / **Salvo si** en filas, y **YAML** para escribirlo como aquí (`time: 180`). Mira [Reglas](../systems/05-rules.md#acciones).

El mundo tiene reacciones propias, escritas igual pero sin grupo: sus pasos son `say`, `roll`, `effects` (relojes y facciones) y `do` (otra reacción, `world.reactions.<id>`, o un turno del mundo, `world.turn`). Mira [Las reglas del mundo](07-kinds.md#las-reglas-del-mundo).

## Todos los pasos de un vistazo

| Paso                                             | Qué hace                                                                      | Pasa el tiempo  | Detiene el viaje para el jugador           |
| ------------------------------------------------ | ----------------------------------------------------------------------------- | --------------- | ------------------------------------------ |
| `time: 180`                                      | pasan tres horas (o hasta una hora del reloj, o una parte del día)            | sí              | no                                         |
| `travel.move: destination`                       | avanza por la ruta mientras se cumplen las condiciones de la acción           | sí              | una comprobación puede pararlo en camino   |
| `travel.speed: 0.5`                              | lo que queda de movimiento hoy, a media velocidad                             | no              | no                                         |
| `travel.advance: 1`                              | un hex por la ruta de golpe                                                   | no              | una comprobación puede pararlo             |
| `travel.mode: modes.boat`                        | viajar de otra forma desde ahora                                              | no              | no                                         |
| `effects: { party.stats.fatigue: 1 }`            | cambia el grupo, sus personajes, el mundo                                     | no              | no                                         |
| `set: { lost: true }`                            | da un valor del día                                                           | no              | no                                         |
| `do: actions.forage`                             | hace otra acción (con `with:`, sus parámetros)                                | como esa acción | como esa acción                            |
| `do: world.turn`                                 | trae un turno del mundo de la campaña, que juega la aplicación                | no              | no                                         |
| `roll: checks.ENCOUNTER_CHECK_REQUIRED`          | tira una comprobación ya (o `roll: table.ruins`: una tabla del Oráculo)       | no              | lo que diga la comprobación (o la entrada) |
| `say: Los porteadores cantan`                    | escribe una línea propia del sistema en el diario                             | no              | no                                         |
| `pause: El transbordador está en la otra orilla` | el viaje espera, diciéndolo, hasta **Continuar**                              | no              | **sí**                                     |
| `ask: params.how`                                | el viaje espera a que el jugador elija el valor de un parámetro               | no              | **sí**                                     |
| `wait: { today.ferry: true }`                    | pasa el tiempo hasta que se cumpla una condición, como mucho hasta su `limit` | sí              | no                                         |

Cada paso puede tener su propio `when` / `unless` (solo ocurre cuando se cumplen) y un `id` (para traducir lo que dice). Nada más va en un paso: cada uno hace exactamente una de las cosas de arriba, y si no, el pack muestra un problema en esa línea.

## El tiempo: `time`

`time: 180` deja pasar 180 minutos. `time: '14:00'` deja pasar el tiempo hasta que esa hora vuelva a dar; `time: time.part.morning` (una parte del día del calendario, `<división>.<parte>`), hasta que vuelva a empezar. Todo lo que hay por el camino ocurre a su hora: las comprobaciones y acciones de cada momento (`at: '12:00'`, `on: time.part.night`), y cada día que acaba por el camino acaba con sus acciones y comprobaciones de `time.day-end`. Lo que sale por el camino detiene el paso ahí, igual que detiene una marcha: un encuentro nocturno a las 23:00 se juega a las 23:00 y, una vez resuelto (y pulsado **Continuar**, si pausa), pasa el resto de la noche; los momentos siguientes ven lo que hizo. Acampar suele ser solo `time: time.part.morning`.

## Moverse

- `travel.move: destination` mueve al grupo por su ruta, minuto a minuto, mientras se sigan cumpliendo el `when` / `unless` de la propia acción: una marcha de día se para al caer la noche. Llega tan lejos como dice: `destination`, `hex` (el siguiente), un número de hexes (`3`) o una variable (`'{{params.until}}'`: lo que diga su parámetro). Una comprobación que necesita al jugador lo detiene por el camino; **Seguir** sigue con él, y luego con los pasos de después.
- `travel.speed: 0.5` hace que lo que queda de movimiento hoy vaya a la mitad (`1.5`: más rápido; `0`: no más movimiento hoy). Multiplica la velocidad del clima y cualquier `travel.speed` anterior del día (un clima a `0.5` y este: a un cuarto).
- `travel.advance: 2` mueve al grupo dos hexes (o tramos de un camino) por su ruta de golpe, sin que pase el tiempo: progreso por movimientos en vez de marchando. También una variable: `'{{party.stats.rank}}'`. Mira _Viajes por movimientos_ en [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).
- `travel.mode: modes.boat` cambia la forma de viajar (uno de los `modes` del sistema, o una variable: `'{{params.by}}'`), si se puede elegir ahora: se cumplen su `when` / `unless` y ningún valor del día la bloquea. Si no, no cambia nada. Con un destino, la ruta se vuelve a planear para la nueva forma (la más rápida), y el diario lo dice («Ahora viajáis así: En barca»).

## Cambiar cosas: `effects` y `set`

- `effects: { party.stats.fatigue: 1, party.values.food: -1 }` cambia el grupo como los efectos de una tabla: un número suma o resta, `'=0'` fija, `'-{{party.stats.mouths}}'` quita tantos como otro valor, `'+{{1d3}}'` una tirada. Un cambio más allá del `min` / `max` de un valor se queda ahí, y los pasos siguientes lo ven en `trip.below` / `trip.above`, por su nombre completo (`trip.below: party.values.food`). Lo que cambia un paso lo ve el siguiente: las características del grupo, los valores de su hoja y sus objetos (`party.items.ration.count`). También personajes (`party.members.values.health: 1`, `acting.conditions.wounded: false`), facciones y relojes: mira [Qué ven las tablas](04-what-tables-see.md).
- `set: { lost: true }` da un valor del día que declara el sistema (`values:`): dura hasta que acaba el día, y bloquea lo que enumera mientras se cumple.

## Otras acciones y comprobaciones: `do` y `roll`

- `do: actions.forage` hace otra acción, si se cumplen sus condiciones (si no, no pasa nada). `{ do: actions.march, with: { until: hex } }` le da los valores de sus parámetros. Así marcha una marcha forzada, con una acción que hace otra: `[{ travel.speed: 1.5 }, { do: actions.march }]`.
- `do: world.turn` trae ahora un turno del mundo de la campaña: el turno de cada facción, y luego las reacciones del mundo a él, como un turno que toca con el tiempo. No lo juega el viaje (sus reglas no conocen el mundo): lo juega la aplicación en la que se juega, y el diario dice lo que hicieron las facciones; sin una campaña cuyo sistema declare facciones, no pasa nada. No lleva `with:`, y es lo único del mundo que puede hacer un paso. Mira [Turnos del mundo](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).
- `roll: checks.ENCOUNTER_CHECK_REQUIRED` tira una comprobación ya: todas las comprobaciones con ese evento cuyas condiciones se cumplan, sea cual sea su `at`. El resto de la acción espera a que se resuelva (y a **Continuar**, si pausa), como con las comprobaciones de su propio momento: los pasos siguientes ven lo que dio (`{ when: { today.loot: true }, … }`).
- `roll: table.ruins` tira en su lugar algo del Oráculo (una tabla, `oracle.<id>`, `generator.<id>`, `deck.<id>`; la de otro pack como `core/table.twists`), sin comprobación ni binding alrededor: el resto de la acción la espera como a una comprobación, su resultado va al diario con el nombre de la tabla, sus valores `set` y sus `effects` llegan al viaje, y una entrada con `pause: true` lo detiene hasta **Continuar**. Un nombre que no es algo que tirar es un problema al cargar el pack. _Explorar la ruina_ de las Marcas Grises: `[{ time: 180 }, { roll: generator.ruin-delve }]`; su _Pescar_ tira su comprobación tras dos horas y lo dice cuando no picó nada: `[{ time: 120 }, { roll: checks.FISHING_CHECK_REQUIRED }, { when: { today.skunked: true }, say: … }]`.

## Hablar con el jugador: `say`, `pause` y `ask`

- `say: Los porteadores cantan mientras caminan.` escribe esa línea en el diario, como palabras del propio sistema. Los valores que lleve se leen en ese momento: `say: 'Al otro lado, con {{party.values.food}} de comida.'` escribe «Al otro lado, con 4 de comida.». Sirve para dar color, o para decir por qué pasó algo (`{ when: { trip.below: party.values.food }, say: No queda nada que comer. }`).
- `pause: true` detiene el viaje ahí. El panel del viaje muestra la acción esperando, con **Continuar**; hasta que se pulsa, nada hace avanzar el viaje (marchar, esperar y las demás acciones salen en gris, diciendo por qué), aunque el destino, la forma de viajar, los personajes y la hoja del grupo se pueden seguir cambiando a mano. **Continuar** sigue enseguida con el resto de pasos de la acción, y luego con lo que la pausa detuvo (una marcha durante la que una acción se hizo por el camino, mira más abajo). Con un texto en vez de `true` (`pause: El transbordador está en la otra orilla.`), la caja de espera y el diario lo dicen.
- `ask: params.how` detiene el viaje igual, pero para preguntar: la caja de espera muestra el parámetro `how` de la acción (su `name` como pregunta, su `description` como ayuda) y un botón por cada una de sus `choices` (sus nombres, sus descripciones al pasar el ratón). Elegir una es seguir: los pasos de después leen la respuesta como `params.how`, así que pueden ramificarse con sus propias condiciones (`when: { params.how: swim }`). El parámetro tiene que ser de la propia acción; su botón no lo ofrece (se pregunta mientras la acción avanza), y lo que se le diera (un `with:`, su `default`) es lo elegido si el jugador no da nada.

```yaml
params:
  how:
    name: ¿Cómo cruzáis?
    description: La corriente es fuerte tras las lluvias.
    choices:
      - { id: swim, name: A nado, description: Rápido, pero acabáis empapados. }
      - { id: ferry, name: Esperar al transbordador }
do:
  - { ask: params.how }
  - { when: { params.how: swim }, effects: { party.stats.fatigue: 1 } }
  - { when: { params.how: ferry }, wait: { today.ferry: true }, limit: '18:00' }
… # un fragmento de una acción
```

**Una pausa por el camino.** Cuando una acción que el sistema hace por sí solo pausa, pregunta o espera una tirada (una con `on: trip.hex-enter`, por ejemplo un peaje en un puente, u `on: '23:00'` en mitad de una acampada), detiene también lo que estaba en marcha: la marcha que entró en el hex queda a medias, la noche de la acampada espera. Las comprobaciones de su momento llegan cuando acaba, así que ven lo que cambió. **Continuar** (o la elección) sigue con los pasos del peaje, y luego con la marcha, hasta donde iba. Cuando dos pasos fueran a esperar a la vez (dos acciones en el mismo momento), espera el primero, y el segundo pregunta después.

## Esperar algo: `wait` y `limit`

`wait: { today.ferry: true }` deja pasar el tiempo hasta que se cumpla su condición, minuto a minuto, viviendo todo lo del camino como `time:` (las comprobaciones y acciones de cada momento, el final del día). `limit:` es obligatorio: lo más que espera, escrito como `time:` (minutos desde ahora, `'18:00'`, `time.part.night`). Si la condición ya se cumple, no pasa el tiempo; si no llega a cumplirse, la espera acaba en el límite. Los pasos de después pueden saber cuál de las dos fue preguntando la misma condición otra vez.

Qué puede hacer que se cumpla: el propio tiempo (`time.hour: { gte: 14 }`, `time.part: [afternoon, evening]`) y cualquier cosa que cambien los momentos del camino: una acción `on: '12:00'` que da un valor del día (`set: { ferry: true }`), una comprobación cuyo resultado lo da. Qué no cambia mientras se espera: los valores de la aplicación que solo cambian entre tus clics.

## La condición de un paso, y su `id`

- `when` / `unless` en un paso hacen que solo ocurra cuando se cumplen: `{ unless: { trip.below: party.values.food }, effects: { party.stats.fatigue: -1 } }` (una noche con comida). Ven lo mismo que las condiciones de la acción, más `params.<id>` (sus parámetros), `trip.below` / `trip.above` (lo que llegó a un límite durante la acción), `trip.doing` (la acción en marcha) y `trip.moment` (cuándo la hizo el sistema).
- `id` da nombre a un paso para poder traducir sus textos: en `locales/<idioma>/`, un paso se encuentra por su `id` en el `do` de su acción (`actions: { grumble: { do: { sulk: { say: … } } } }`), y solo se traducen los textos de `say` y `pause`. Mira [Traducciones](../oracle/05-translations.md#reglas-calendarios-clima-y-modos-de-tirada).

## Un ejemplo entero: cruzar un río

Un sistema diminuto cuya única acción interesante es cruzar un río: el jugador elige cómo (`ask`), espera al transbordador que llega a mediodía (`wait`, con una acción que el sistema hace a las `'12:00'` y da el valor que espera) o construye una balsa (tres horas, y luego `travel.mode`), el diario dice cómo fue (`say`, leyendo la comida que queda, un valor de la hoja del grupo) y el viaje espera al jugador antes de seguir (`pause`).

```yaml
kind: system
id: default
travel: travel-rules.river-crossing
partySheet: sheet.party
---
kind: sheet
id: party
values:
  food: { name: Comida, default: 5, min: 0 }
---
kind: travel-rules
id: river-crossing
travel:
  hoursPerDay: 8
  start: '06:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '20:00', do: actions.camp }
terrains: { plains: { multiplier: 1 } }
modes:
  foot: { name: A pie, kmPerDay: 30 }
  # Solo cuando hay balsa (un valor del día).
  raft: { name: En balsa, kmPerDay: 60, when: { today.raft: true } }
values:
  ferry: { name: Ha llegado el transbordador }
  raft: { name: Hay una balsa }
actions:
  march:
    name: Marchar
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 6, lt: 20 } }
    do: [{ travel.move: '{{params.until}}' }]
  camp:
    name: Acampar
    do: [{ time: '06:00' }]
  # El transbordador llega a mediodía: no es un botón, lo hace el sistema a esa hora.
  horn:
    on: '12:00'
    do: [{ set: { ferry: true } }]
  cross:
    name: Cruzar el río
    params:
      how:
        name: ¿Cómo cruzáis?
        choices:
          - { id: ferry, name: Esperar al transbordador }
          - { id: raft, name: Construir una balsa }
    do:
      - { ask: params.how }
      - { when: { params.how: ferry }, wait: { today.ferry: true }, limit: '18:00' }
      - { when: { params.how: raft }, time: 180 }
      - { when: { params.how: raft }, set: { raft: true } }
      - { when: { params.how: raft }, travel.mode: modes.raft }
      - { id: over, say: 'Listos para cruzar, con {{party.values.food}} de comida.' }
      - { pause: true }
```

Lo que ves en el viaje, empezando a las 08:00 con 5 de comida:

1. **Cruzar el río**: el viaje se detiene y pregunta «¿Cómo cruzáis?», con **Esperar al transbordador** y **Construir una balsa** (el diario: «Cruzar el río: ¿Cómo cruzáis? (elige para seguir)»).
2. **Esperar al transbordador**: el tiempo va hasta las 12:00, cuando la bocina da **Ha llegado el transbordador**; el diario dice «¿Cómo cruzáis? → Esperar al transbordador», luego «Listos para cruzar, con 5 de comida.», y el viaje vuelve a esperar (la pausa), con **Continuar**.
3. **Construir una balsa**, en cambio: pasan tres horas (las 11:00), la forma de viajar pasa a **En balsa** («Ahora viajáis así: En balsa»), y luego la misma línea y la misma pausa.

## Errores comunes

- **Dos cosas en un paso**: `{ time: 60, effects: { … } }` son dos pasos; escríbelos uno tras otro.
- **`wait` sin `limit`** (o `limit` sin `wait`): el pack muestra un problema; una espera siempre dice lo más que espera.
- **`ask` de algo que no es un parámetro de la acción**: decláralo antes, con sus opciones, en los `params` de la acción.
- **Un `wait` de algo que nada cambia**: un valor que solo cambia el jugador a mano, o una característica, no cambia mientras se espera; la espera llega hasta su límite.
- **`travel.mode` a una forma que no se puede elegir ahí** (una barca tierra adentro): no cambia nada. Pon en el `when` de esa forma el sitio donde se puede tomar, o da antes el valor que necesita (como la balsa de arriba).
- **Una `pause` que el jugador no ve venir**: di por qué (`pause: El puente está caído.`), o dilo con `say` justo antes.

Las Marcas Grises usan todos los pasos: **Tomar el transbordador** (el de Brenna sobre el Saltmere) pregunta cómo pagar, espera a su travesía de la tarde, dice lo que queda, pasa a la barca y hace una pausa; **Desembarcar** vuelve a cambiar la forma; las quejas de los mercenarios lo dicen en el diario. Mira [Las Marcas Grises](../packs/02-grey-marches.md).

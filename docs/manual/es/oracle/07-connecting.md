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

Una entrada puede **fijar** valores (`set`). El Travel Engine lee algunos cuando la tabla resuelve una comprobación del viaje:

| Fija                     | Efecto en el viaje                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `lost: true`             | No se viaja más hoy.                                                                                                       |
| `weather: storm`         | El clima de hoy; las reglas de viaje dicen cuánto te frena.                                                                |
| `fatigue: 1`             | Suma fatiga (en negativo, la recupera).                                                                                    |
| `resources: { food: 2 }` | Suma provisiones (en negativo, las gasta).                                                                                 |
| `stats: { morale: -1 }`  | Suma a las características del grupo (en negativo, las baja); una que el sistema no declara aparece en el panel del viaje. |

```yaml
- { id: storm, range: 6, result: 'Tormenta: hoy no se viaja', set: { weather: storm } }
- { id: lost, range: 1-2, result: 'Os habéis perdido', set: { lost: true } }
- { id: berries, range: 6, result: 'Bayas: +2 de comida', set: { resources: { food: 2 } } }
```

Las tablas leen el grupo como `party.resources.food`, `party.stats.morale`, `party.fatigue`: `when: { party.resources.food: { lt: 1 } }` para una entrada que solo sale cuando se ha acabado la comida.

Los valores llamados `weather`, `…Modifier` o `…Impossible` se mantienen además el resto del día, para que las comprobaciones siguientes los usen: una entrada del clima con `set: { lostModifier: -1 }` hace más difícil `roll: '1d6 + {{lostModifier}}'` en la tabla de perderse que viene después.

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
  foot: { kmPerDay: 30 }
  horse: { kmPerDay: 60 }
resources:
  food: { perDay: 1 }
weather:
  storm: { speed: 0 } # con tormenta no se viaja
actions:
  rest: { minutes: 120, fatigue: 1 }
  forage: { name: { en: Forage, es: Forrajear }, minutes: 180, speed: 0.5, oncePerDay: true } # una acción de este sistema: un botón Forrajear
checks:
  - { event: WEATHER, at: day-start }
  - { event: LOST, at: day-start, unless: { edges: [road, river] } }
  - { event: ENCOUNTER, at: hex-enter, when: { terrain: [forest, swamp] } }
  - { event: NIGHT, at: camp }
  - { event: FORAGE, at: forage, when: { terrain: [forest, plains] } }
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
  luck:
    {
      name: { en: Luck, es: Suerte },
      description: 'Se suma a las tiradas de encuentro',
      default: 0,
    }
```

- **terrains** fijan la velocidad en cada terreno (`multiplier`; 0.5 es la mitad) o lo cierran (`passable: false`). **water** hace lo mismo con los hexes de agua cuyo terreno no está en la lista (Editar paleta → Agua en el mapa), y una forma de viajar con `allowedTerrains: [water]` es una barca: solo navega por agua, incluso donde a pie no se puede ir. Las tablas ven `water: true` en los hexes de agua.
- **actions**: `camp` y `rest` vienen incluidas (`false` quita una; `rest` admite `minutes` y la `fatigue` que recupera). Cualquier otra clave es una **acción propia del sistema**, un botón junto a Viajar, Acampar y Descansar: `name` y `description` (en uno o varios idiomas), los `minutes` que lleva, `speed` (multiplica el resto de la marcha del día: 0.5 la reduce a la mitad), la `fatigue` que recupera y `oncePerDay` (una vez al día). Lo que tira son las comprobaciones con `at: <su id>`.
- **checks** dicen cuándo se tira algo: `day-start` (al alba, antes de marchar), `hex-enter` (al entrar en cada hex), `camp` (al acampar) o el id de una acción propia del sistema (`at: forage`). Dale a cada una un `name` (y una `description`) para los jugadores, en uno o varios idiomas — `name: { en: Getting lost, es: Perderse }` —, o el panel del viaje y el diario mostrarán el id de su evento. `when` / `unless` usan las mismas condiciones que las tablas; `edges` son los caminos o ríos del tramo: el que acabas de recorrer al entrar en un hex, el que tienes por delante al alba y al acampar.
- **bindings** conectan cada comprobación (por su nombre de evento, el que quieras) con una tabla del pack.
- **stats** son números del grupo que aparecen en el panel del viaje (p. ej. la Presencia de Kal-Arath); las tablas los leen por su clave: `roll: '2d6 + {{luck}}'`.

Las comprobaciones sin binding esperan en el diario a que las resuelvas tú.

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

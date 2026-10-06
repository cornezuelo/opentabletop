# Conectar tablas con mapas y viajes

No hace falta programar para crear tablas que reaccionen al mapa, ni un sistema de viaje entero que el Hexmapper juegue por ti. Todo se escribe en los ficheros YAML del pack. Esta página lo construye paso a paso; cada paso funciona por sí solo.

> **Un ejemplo completo del que copiar:** el pack incluido **Core**. Su `wilderness.yaml` tiene clima por estación, perderse, reacciones y encuentros que usan todo lo de esta página, y su `travel.yaml` convierte Core en un sistema de viaje que puedes jugar en el Hexmapper (Jugar → Con reglas → Core). Ábrelos en la aplicación Oracle, o haz una copia (**Editar una copia**) para cambiarlos.

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

| Fija                     | Efecto en el viaje                                          |
| ------------------------ | ----------------------------------------------------------- |
| `lost: true`             | No se viaja más hoy.                                        |
| `weather: storm`         | El clima de hoy; las reglas de viaje dicen cuánto te frena. |
| `fatigue: 1`             | Suma fatiga (en negativo, la recupera).                     |
| `resources: { food: 2 }` | Suma provisiones (en negativo, las gasta).                  |

```yaml
- { id: storm, range: 6, result: 'Tormenta: hoy no se viaja', set: { weather: storm } }
- { id: lost, range: 1-2, result: 'Os habéis perdido', set: { lost: true } }
- { id: berries, range: 6, result: 'Bayas: +2 de comida', set: { resources: { food: 2 } } }
```

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
checks:
  - { event: WEATHER, at: day-start }
  - { event: LOST, at: day-start, unless: { edges: [road, river] } }
  - { event: ENCOUNTER, at: hex-enter, when: { terrain: [forest, swamp] } }
  - { event: NIGHT, at: camp }
---
kind: bindings
id: default
on:
  WEATHER: { resolve: weather }
  LOST: { resolve: lost-check }
  ENCOUNTER: { resolve: forest-encounters }
  NIGHT: { resolve: night-encounters }
stats:
  luck:
    {
      name: { en: Luck, es: Suerte },
      description: 'Se suma a las tiradas de encuentro',
      default: 0,
    }
```

- **checks** dicen cuándo se tira algo: `day-start` (al alba, antes de marchar), `hex-enter` (al entrar en cada hex) o `camp` (al acampar). `when` / `unless` usan las mismas condiciones que las tablas; `edges` son los caminos o ríos del tramo: el que acabas de recorrer al entrar en un hex, el que tienes por delante al alba y al acampar.
- **bindings** conectan cada comprobación (por su nombre de evento, el que quieras) con una tabla del pack.
- **stats** son números del grupo que aparecen en el panel del viaje (p. ej. la Presencia de Kal-Arath); las tablas los leen por su clave: `roll: '2d6 + {{luck}}'`.

Las comprobaciones sin binding esperan en el diario a que las resuelvas tú.

## 6. Probarlo

1. En la aplicación Oracle, tira cada tabla escribiendo valores en **Contexto** (terreno, estación…) para comprobar los resultados.
2. Sirve las dos aplicaciones desde el mismo sitio (`make serve`), abre el Hexmapper, Jugar → **Con reglas**, elige tu pack como reglas, coloca al grupo y viaja: el diario muestra cada comprobación y su resultado.
3. Los problemas de las reglas de viaje o de los bindings aparecen en la página del pack, como los de cualquier otra definición.

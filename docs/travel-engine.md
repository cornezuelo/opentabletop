# Travel Engine — diseño (borrador para revisión)

`@open-tabletop/travel-engine`: motor de viaje para hexcrawl en solitario y campañas sandbox. Se encarga de **movimiento, tiempo y estado del viaje**. Consume la geografía del mapa sin duplicarla, emite eventos para que otros resuelvan encuentros, clima o navegación, y no depende de UI, de SilverBullet ni de un sistema concreto.

## 1. Arquitectura actual y qué se reutiliza

| Pieza existente                                      | Uso en el viaje                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `@open-tabletop/hex` (vecinos, distancias, líneas)   | Base del `RoutePlanner`. Se añade **A\*** genérico (`findPath(start, goal, { neighbors, cost, heuristic })`).                         |
| Claves `"col,row"`, independientes de la orientación | Posición, destino y ruta se guardan como claves. Sobreviven a un cambio de orientación.                                               |
| `Map.terrains` (id, nombre, color)                   | El viaje referencia terrenos por id. Los multiplicadores de movimiento van en las **reglas**, no en la paleta.                        |
| Metadatos del hex (`stats`, `tags`, `noteRef`)       | Los lee el adaptador `TravelWorld`. Se añaden campos opcionales `elevation`, `danger` y `region` al Hex (ver `otd.md`).               |
| Patrón comando / estado inmutable                    | El motor es `(estado, acción) → { estado, eventos }`, así que en el hexmapper se puede deshacer un paso de viaje guardando snapshots. |

**Lo que falta en el hexmapper:** caminos y ríos (`Map.paths`), la escala del mundo (`scale.hexKm`) y un token del grupo. Los caminos se hacen antes de integrar el viaje.

## 2. Modelo de dominio

**Persistente del mapa** (no lo toca el viaje): terreno, elevación, peligro, región, caminos y ríos (aristas), POIs.

**Estado de viaje** (en `Party.travel` y en la campaña):

```ts
interface TravelState {
  location: HexRef // { map, hex }
  destination?: HexRef
  route?: { strategy: string; hexes: string[]; index: number } // ruta planificada
  mode: string // 'foot' | 'horse' | … (id de las reglas)
  resources: Record<string, number> // { food: 6, water: 8 } (las definiciones están en las reglas)
  fatigue: number
  navigation: { status: 'on-course' | 'lost' | 'drifting'; heading?: string }
  activity: 'idle' | 'travelling' | 'camping' | 'resting' | 'foraging'
  progress: number // minutos acumulados dentro del hex actual hacia el siguiente
  pendingChecks: PendingCheck[] // comprobaciones que esperan resultado
  counters: Record<string, number> // horas viajadas hoy, etc.
}
// Global: campaign.time (GameTime) y weather (estado actual, del weather-engine o manual)
```

**Datos externos:** solo `noteRef` en hexes y POIs. El motor nunca los lee.

## 3. Interfaces y módulos

```
TravelEngine (fachada: aplica acciones, compone el resto)
 ├─ GameClock        @open-tabletop/time: avanzar, guardias, día/noche, estación (calendario intercambiable)
 ├─ MovementModel    minutos para cruzar A→B = hexKm / velocidad efectiva
 ├─ RoutePlanner     A* sobre TravelWorld con una RouteStrategy (coste por paso)
 ├─ ResourceTracker  consumo genérico por tiempo/actividad, avisos al agotarse
 ├─ FatigueModel     sube con horas de marcha por encima del límite, baja al descansar
 ├─ NavigationModel  ¿hace falta comprobar? y cómo aplicar el resultado (rumbo correcto, deriva, hex adyacente aleatorio, retraso)
 └─ CheckScheduler   cuándo toca cada comprobación (por hex, por guardia, por día, al acampar…)
```

**Puertos** (los implementa quien integra):

```ts
interface TravelWorld {
  // El hexmapper lo implementa sobre su modelo; una app standalone, con un selector de terreno
  hexKm: number
  cell(hex: string): {
    terrain?: string
    elevation?: number
    danger?: number
    region?: string
    tags?: string[]
  } | null
  neighbors(hex: string): string[]
  distance(a: string, b: string): number
  edges(a: string, b: string): string[] // ['road'], ['river'], [] …
}
```

**Reglas como datos** (`kind: travel-rules` en un pack). Ejemplo genérico:

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00', watchMinutes: 240 }
travel: { hoursPerDay: 8 } # más horas → fatiga
terrains:
  plains: { multiplier: 1.0 }
  forest: { multiplier: 0.7 }
  mountains: { multiplier: 0.4 }
  sea: { passable: false }
edges:
  road: { multiplier: 1.5, navigation: skip } # por carretera no te pierdes
  river: { navigation: skip } # seguir un río
modes:
  foot: { kmPerDay: 30 }
  horse: { kmPerDay: 60, consumes: { fodder: 1 } }
  boat: { kmPerDay: 80, allowedEdges: [river], allowedTerrains: [lake, sea] }
resources:
  food: { perDay: 1, unit: ración }
  water: { perDay: 1 }
weather: # efecto de cada estado de clima (los estados los define el pack o el weather-engine)
  storm: { speed: 0, navigation: -2 }
  heavy-rain: { speed: 0.5, navigation: -1 }
checks:
  - { event: WEATHER_CHECK_REQUIRED, at: day-start }
  - { event: NAVIGATION_CHECK_REQUIRED, at: day-start, unless: { edge: [road, river] } }
  - { event: ENCOUNTER_CHECK_REQUIRED, every: day }
  - { event: CAMP_ENCOUNTER_CHECK_REQUIRED, at: camp }
```

- Las condiciones (`unless`, `when`) usan `@open-tabletop/conditions`, igual que el Oracle.
- Si una regla no se puede expresar como datos, se añade un "hook" con nombre al motor. Nunca código dentro del pack.

**Acciones y eventos:**

```ts
engine.apply(state, ctx, action) → { state, events }
// action: setDestination | planRoute(strategy) | travelHex(hex?) | travelUntil('destination' | 'nightfall' | 'event')
//       | advanceTime(min) | advanceWatch | makeCamp | rest(min) | forage | setMode
//       | resolveCheck(id, outcome) | setWeather
// events: HEX_ENTERED, TRAVEL_SEGMENT_COMPLETED, ENCOUNTER_CHECK_REQUIRED, WEATHER_CHECK_REQUIRED,
//         NAVIGATION_CHECK_REQUIRED, FORAGE_CHECK_REQUIRED, CAMP_STARTED, DAY_ENDED, RESOURCE_DEPLETED
```

**Modelo de interrupciones:**

- Cuando toca una comprobación, el motor **se detiene** y deja una `PendingCheck` en el estado.
- `travelUntil` avanza hasta el destino, hasta la noche o hasta que aparece una comprobación pendiente.
- Quien integra resuelve la comprobación (con el Oracle, a mano o ignorándola) y llama a `resolveCheck(id, outcome)`. Por ejemplo, un resultado de navegación `{ result: 'lost' }` deja al grupo en el hex ese día.
- El motor nunca espera de forma asíncrona ni conoce al Oracle.

```
TravelEngine ──ENCOUNTER_CHECK_REQUIRED──► session (bindings del pack) ──► OracleEngine.generate('kal-arath/encounter-check')
      ▲                                                                                │
      └──────────────────────────── resolveCheck(id, outcome) ◄─────────────────────────┘
```

Los **bindings** (qué tabla resuelve cada evento) son datos del pack del sistema, y los aplica `session`:

```yaml
# packs/kal-arath/bindings.yaml
kind: bindings
on:
  ENCOUNTER_CHECK_REQUIRED: { generate: encounter-check, context: { pre: party.stats.pre } }
  WEATHER_CHECK_REQUIRED: { resolve: 'weather-{{season}}', apply: setWeather }
  NAVIGATION_CHECK_REQUIRED: { resolve: lost-check }
```

**Rutas:** `RouteStrategy = { id, cost(from, to, ctx): number | Infinity }`.

- **MVP:** `shortest` (pasos) y `fastest` (tiempo según terreno, modo y caminos).
- **Más adelante:** `avoid-danger`, `prefer-roads`, `safest`, `stealthiest`, combinables con pesos.

**Tiempo:** `GameTime` en minutos absolutos. El calendario por defecto tiene 24 horas, guardias de 4 horas y estaciones de N días. Los calendarios personalizados implementan la interfaz `Calendar` sin tocar el motor.

## 4. Riesgos de acoplamiento

| Riesgo                                                           | Mitigación                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| El motor lee el modelo del hexmapper directamente                | Solo a través del puerto `TravelWorld`.                                                                                |
| Duplicar terreno o POIs en el estado de viaje                    | El estado solo guarda claves de hex; los datos se consultan en el momento.                                             |
| La ruta se invalida si el mapa cambia (tamaño, terreno)          | Se revalida en cada paso; si un hex deja de ser transitable se emite `ROUTE_BLOCKED` y se replanifica.                 |
| Confundir escala de impresión (mm) con escala de mundo (km)      | Campos separados (`ext.hexmapper.print.hexMm` frente a `Map.scale.hexKm`).                                             |
| Llamar al Oracle desde el motor                                  | Eventos + `resolveCheck`; los bindings están en `session`.                                                             |
| Reglas de un sistema en el núcleo                                | Reglas como datos; los hooks son genéricos y tienen nombre.                                                            |
| Mensajes en un idioma desde el núcleo                            | Eventos con `code` + parámetros; la UI traduce.                                                                        |
| Deshacer un paso de viaje frente a deshacer una edición del mapa | Historiales separados: el modo Play guarda snapshots del estado de viaje; el editor conserva su historial de comandos. |
| Aleatoriedad dentro del motor (deriva al perderse)               | `RandomSource` inyectado.                                                                                              |

## 5. Encaje con Kal-Arath (validación del diseño)

| Regla de Kal-Arath                                          | Cómo se expresa                                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1 hex = 30 km = 1 día a pie; a caballo, el doble            | `hexKm: 30`, `foot.kmPerDay: 30`, `horse.kmPerDay: 60`.                                                         |
| Las tiradas van por día de viaje, no por hex                | `checks` con `at: day-start` y `every: day`.                                                                    |
| Tormenta: no se viaja ese día; lluvia intensa: velocidad ×½ | `weather.storm.speed: 0`, `weather.heavy-rain.speed: 0.5`.                                                      |
| Perderse con 1–2 en 1d6; no se tira por camino o río        | `NAVIGATION_CHECK_REQUIRED` con `unless: { edge: [road, river] }`; el resultado `lost` deja al grupo en el hex. |
| Forrajear reduce el movimiento a la mitad                   | `forage` aplica `speed × 0.5` ese día y emite `FORAGE_CHECK_REQUIRED`.                                          |
| Acampar consume 1 ración y hay encuentro nocturno           | `resources.food.perDay` + check `at: camp`.                                                                     |

## 6. MVP

- Paquetes `time` (GameTime + calendario por defecto) y A\* en `hex`.
- `TravelWorld` implementado por el hexmapper. Ubicación actual, destino y modo (de las reglas).
- Ruta A\* (`shortest`, `fastest`), `travelHex`, `travelUntil('destination' | 'nightfall')`, `advanceTime`, `advanceWatch`, `makeCamp`, `rest`.
- Coste de movimiento por terreno y modo (y por caminos cuando existan en el mapa).
- Fatiga simple, comida y agua simples (recursos genéricos).
- `CheckScheduler` con eventos y `pendingChecks` resolubles a mano.
- Persistencia del estado de viaje en el bundle y UI mínima sobre el mapa (token, ruta, panel con hora, clima, fatiga y recursos, y botones de acción).
- **Fuera del MVP:** clima complejo, encuentros completos, Oracle integrado, calendarios personalizados, generación de eventos, reglas específicas, combate, PNJs, gestor de campaña.

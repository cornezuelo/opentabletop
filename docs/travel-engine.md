# Travel Engine — design

`@open-tabletop/travel-engine`: a travel engine for solo hexcrawls and sandbox campaigns. It owns **movement, time and travel state**. It consumes the map's geography without duplicating it, emits events so others can resolve encounters, weather or navigation, and depends on no UI, no SilverBullet and no specific game system.

## 1. Current architecture and reuse

| Existing piece                                     | Use in travel                                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `@open-tabletop/hex` (neighbors, distances, lines) | Basis of the `RoutePlanner`. A generic **A\*** is added (`findPath(start, goal, { neighbors, cost, heuristic })`).      |
| `"col,row"` keys, orientation-independent          | Position, destination and route are stored as keys and survive an orientation change.                                   |
| `Map.terrains` (id, name, color, water)            | Travel references terrains by id. Movement multipliers live in the **rules**, not in the palette.                       |
| Hex metadata (`stats`, `tags`, `noteRef`)          | Read through the `TravelWorld` adapter. Optional `elevation`, `danger` and `region` fields are added to Hex (`otd.md`). |
| `Map.paths` with crossed hexes                     | Roads, trails and rivers as edges between consecutive hexes (already in the hexmapper).                                 |
| Command pattern / immutable state                  | The engine is `(state, action) → { state, events }`, so the hexmapper can undo a travel step by keeping snapshots.      |

**Still missing in the hexmapper:** the world scale (`scale.hexKm`) and a party token.

## 2. Domain model

**Persistent map data** (never touched by travel): terrain, elevation, danger, region, roads and rivers (edges), POIs.

**Travel state** (in `Party.travel` and the campaign):

```ts
interface TravelState {
  location: HexRef // { map, hex }
  destination?: HexRef
  route?: { strategy: string; hexes: string[]; index: number } // planned route
  mode: string // 'foot' | 'horse' | … (rules id)
  resources: Record<string, number> // { food: 6, water: 8 } (definitions live in the rules)
  fatigue: number
  navigation: { status: 'on-course' | 'lost' | 'drifting'; heading?: string }
  activity: 'idle' | 'travelling' | 'camping' | 'resting' | 'foraging'
  progress: number // minutes accumulated in the current hex towards the next
  pendingChecks: PendingCheck[] // checks waiting for a result
  counters: Record<string, number> // hours travelled today, etc.
}
// Global: campaign.time (GameTime) and weather (current state, from weather-engine or manual)
```

**External data:** only `noteRef` on hexes and POIs. The engine never reads it.

## 3. Interfaces and modules

```
TravelEngine (facade: applies actions, composes the rest)
 ├─ GameClock        @open-tabletop/time: advance, watches, day/night, season (pluggable calendar)
 ├─ MovementModel    minutes to cross A→B = hexKm / effective speed
 ├─ RoutePlanner     A* over TravelWorld with a RouteStrategy (per-step cost)
 ├─ ResourceTracker  generic consumption per time/activity, warnings when depleted
 ├─ FatigueModel     rises with marching hours beyond the limit, drops when resting
 ├─ NavigationModel  whether a check is needed and how to apply its result (on course, drift, random neighbor, delay)
 └─ CheckScheduler   when each check is due (per hex, per watch, per day, on camp…)
```

**Ports** (implemented by the integrator):

```ts
interface TravelWorld {
  // The hexmapper implements it over its model; a standalone app with a terrain picker
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

**Rules as data** (`kind: travel-rules` in a pack). Generic example:

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00', watchMinutes: 240 }
travel: { hoursPerDay: 8 } # more hours → fatigue
terrains:
  plains: { multiplier: 1.0 }
  forest: { multiplier: 0.7 }
  mountains: { multiplier: 0.4 }
  sea: { passable: false }
edges:
  road: { multiplier: 1.5, navigation: skip } # you can't get lost on a road
  river: { navigation: skip } # following a river
modes:
  foot: { kmPerDay: 30 }
  horse: { kmPerDay: 60, consumes: { fodder: 1 } }
  boat: { kmPerDay: 80, allowedEdges: [river], allowedTerrains: [lake, sea] }
resources:
  food: { perDay: 1, unit: ration }
  water: { perDay: 1 }
weather: # effect of each weather state (states defined by the pack or weather-engine)
  storm: { speed: 0, navigation: -2 }
  heavy-rain: { speed: 0.5, navigation: -1 }
checks:
  - { event: WEATHER_CHECK_REQUIRED, at: day-start }
  - { event: NAVIGATION_CHECK_REQUIRED, at: day-start, unless: { edge: [road, river] } }
  - { event: ENCOUNTER_CHECK_REQUIRED, every: day }
  - { event: CAMP_ENCOUNTER_CHECK_REQUIRED, at: camp }
```

- Conditions (`unless`, `when`) use `@open-tabletop/conditions`, like the Oracle.
- A rule that can't be expressed as data becomes a **named hook** in the engine, never code inside the pack.

**Actions and events:**

```ts
engine.apply(state, ctx, action) → { state, events }
// action: setDestination | planRoute(strategy) | travelHex(hex?) | travelUntil('destination' | 'nightfall' | 'event')
//       | advanceTime(min) | advanceWatch | makeCamp | rest(min) | forage | setMode
//       | resolveCheck(id, outcome) | setWeather
// events: HEX_ENTERED, TRAVEL_SEGMENT_COMPLETED, ENCOUNTER_CHECK_REQUIRED, WEATHER_CHECK_REQUIRED,
//         NAVIGATION_CHECK_REQUIRED, FORAGE_CHECK_REQUIRED, CAMP_STARTED, DAY_ENDED, RESOURCE_DEPLETED
```

**Interrupt model:**

- When a check is due, the engine **stops** and leaves a `PendingCheck` in the state.
- `travelUntil` advances until the destination, nightfall, or a pending check.
- The integrator resolves the check (with the Oracle, by hand, or by ignoring it) and calls `resolveCheck(id, outcome)`. E.g. a navigation outcome `{ result: 'lost' }` keeps the party in the hex for the day.
- The engine never waits asynchronously and never knows the Oracle.

```
TravelEngine ──ENCOUNTER_CHECK_REQUIRED──► session (pack bindings) ──► OracleEngine.generate('kal-arath/encounter-check')
      ▲                                                                                │
      └──────────────────────────── resolveCheck(id, outcome) ◄─────────────────────────┘
```

**Bindings** (which table resolves each event) are data in the system pack, applied by `session`:

```yaml
# packs-private/kal-arath/bindings.yaml
kind: bindings
on:
  ENCOUNTER_CHECK_REQUIRED: { generate: encounter-check, context: { pre: party.stats.pre } }
  WEATHER_CHECK_REQUIRED: { resolve: 'weather-{{season}}', apply: setWeather }
  NAVIGATION_CHECK_REQUIRED: { resolve: lost-check }
```

**Routes:** `RouteStrategy = { id, cost(from, to, ctx): number | Infinity }`.

- **MVP:** `shortest` (steps) and `fastest` (time from terrain, mode and roads).
- **Later:** `avoid-danger`, `prefer-roads`, `safest`, `stealthiest`, combinable with weights.

**Time:** `GameTime` in absolute minutes. The default calendar has 24-hour days, 4-hour watches and N-day seasons. Custom calendars implement the `Calendar` interface without touching the engine; packs declare them as data (`kind: calendar`: months, seasons, weekdays, moons, holidays), and a system's trips use its pack's calendar.

## 4. Coupling risks

| Risk                                                  | Mitigation                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| The engine reads the hexmapper model directly         | Only through the `TravelWorld` port.                                                                 |
| Duplicating terrain or POIs in travel state           | State only stores hex keys; data is queried when needed.                                             |
| The route breaks when the map changes (size, terrain) | Re-validated at every step; if a hex becomes impassable, `ROUTE_BLOCKED` is emitted and it re-plans. |
| Confusing print scale (mm) with world scale (km)      | Separate fields (`ext.hexmapper.print.hexMm` vs `Map.scale.hexKm`).                                  |
| Calling the Oracle from the engine                    | Events + `resolveCheck`; bindings live in `session`.                                                 |
| A system's rules in the core                          | Rules as data; hooks are generic and named.                                                          |
| Messages in one language from the core                | Events carry `code` + parameters; the UI translates.                                                 |
| Undoing a travel step vs. undoing a map edit          | Separate histories: Play mode keeps travel-state snapshots; the editor keeps its command history.    |
| Randomness inside the engine (drift when lost)        | Injected `RandomSource`.                                                                             |

## 5. Fit with Kal-Arath (design validation)

| Kal-Arath rule                                        | How it's expressed                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1 hex = 30 km = 1 day on foot; double on horseback    | `hexKm: 30`, `foot.kmPerDay: 30`, `horse.kmPerDay: 60`.                                                           |
| Rolls are per travel day, not per hex                 | `checks` with `at: day-start` and `every: day`.                                                                   |
| Storm: no travel that day; heavy rain: half speed     | `weather.storm.speed: 0`, `weather.heavy-rain.speed: 0.5`.                                                        |
| Lost on 1–2 on 1d6; no roll on a road or river        | `NAVIGATION_CHECK_REQUIRED` with `unless: { edge: [road, river] }`; outcome `lost` keeps the party in the hex.    |
| Foraging halves movement                              | A system's own action: `actions.forage: { minutes: 180, speed: 0.5, oncePerDay: true }` and a check `at: forage`. |
| Camping uses 1 ration and has a night encounter check | `resources.food.perDay` + a check `at: camp`.                                                                     |

## 6. MVP

- `time` (GameTime + default calendar) and A\* in `hex`.
- `TravelWorld` implemented by the hexmapper. Current location, destination and mode (from the rules).
- A\* route (`shortest`, `fastest`), `travelHex`, `travelUntil('destination' | 'nightfall')`, `advanceTime`, `advanceWatch`, `makeCamp`, `rest`.
- Movement cost from terrain and mode (and roads, which the map already has).
- Simple fatigue, simple food and water (generic resources).
- `CheckScheduler` with events and `pendingChecks` resolvable by hand.
- Travel state persisted in the bundle, and a minimal UI over the map (token, route, panel with time, weather, fatigue and resources, action buttons).
- **Not in the MVP:** complex weather, full encounters, Oracle integration, custom calendars, event generation, system-specific rules, combat, NPCs, campaign manager.

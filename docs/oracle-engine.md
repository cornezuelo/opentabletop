# Oracle Engine — diseño (borrador para revisión)

`@open-tabletop/oracle-engine`: motor genérico de **tablas, oráculos, generadores y mazos** para rol en solitario, hexcrawl, TTRPG y wargames narrativos. Recibe definiciones y contexto y devuelve resultados estructurados. No sabe qué es un hex, una nota ni un sistema de juego concreto.

## 1. Punto de partida

- **Qué hay ya:** `@open-tabletop/hex` y `@open-tabletop/note-refs` (no los usa), el patrón de comandos inmutables del hexmapper y el validador manual de `model/serialize.ts`, que se sustituirá por Zod.
- **Qué se extrae a paquetes compartidos**, porque lo necesitan también el Travel Engine y el Weather Engine:
  - `@open-tabletop/random`: `RandomSource`, PRNG con semilla.
  - `@open-tabletop/dice`: expresiones de dados con desglose.
  - `@open-tabletop/conditions`: evaluador seguro de condiciones.
- **Primer cliente real:** Kal-Arath. Su procedimiento diario (comprobación con 1d6 → tabla d66 → reacción con 2d6+PRE, con ventaja/desventaja) es el banco de pruebas del diseño.

## 2. Límites del módulo

Hace:

- Cargar, validar y compilar packs.
- Resolver tablas (por rangos y por pesos), oráculos con variantes, generadores declarativos, plantillas y mazos.
- Aplicar modificadores y condiciones del contexto.
- Controlar los resultados únicos o limitados.
- Producir un registro de cada resolución.

No hace:

- UI ni persistencia: devuelve el estado nuevo y el registro, y el llamante decide dónde guardarlos.
- Leer ficheros directamente: recibe `{ path, content }` desde un adaptador (navegador, Node, CLI).
- Reglas de un sistema concreto: viven en los packs.
- Conocer otros motores: el Travel Engine no lo llama, lo hace `session`.

## 3. Arquitectura

Composición de piezas pequeñas:

```
PackLoader ──► parsers (json, yaml)  ──► raw definitions
     │
     ▼
Validator + Compiler  ──►  Registry (definiciones compiladas, inmutables, indexadas por id con namespace)
                                │
OracleEngine (fachada fina) ────┤
  ├─ TableResolver      (rangos/pesos, condiciones, once/max, subtablas, profundidad máxima)
  ├─ OracleResolver     (variantes elegidas por entrada: likelihood…)
  ├─ GeneratorResolver  (campos en orden, variables, plantillas)
  ├─ DeckManager        (shuffle/draw/discard/reset sobre DeckState)
  ├─ TemplateRenderer   ({{campo}}, {{1d6}}, sin lógica)
  └─ DiceRoller         (@open-tabletop/dice) ◄── RandomSource (@open-tabletop/random)
```

- **Cargar, validar y compilar se hace una vez.** Resolver solo trabaja sobre el `Registry` ya compilado: rangos normalizados, referencias resueltas, ciclos detectados y expresiones de dados ya parseadas.
- **El estado no vive dentro del motor**: cada operación recibe `OracleState` y devuelve uno nuevo. `OracleSession` es un envoltorio opcional que guarda el estado por comodidad.

## 4. Modelo de definiciones

Los ficheros pueden ser YAML o JSON, con una o varias definiciones cada uno (`kind` obligatorio). Los ids son locales al pack; el registro los expone como `<pack>/<id>`.

### Tabla

```yaml
kind: table
id: weather-spring
name: Tiempo primaveral
roll: 1d6 # si se omite, la tabla es por pesos
clamp: true # tiradas modificadas fuera de rango → primera o última entrada (por defecto true)
entries:
  - range: 1 # número suelto o "a-b"
    result: Cielo despejado
    set: { lost: 1, forage: 1 } # valores estructurados que se fusionan en el resultado
  - range: 6
    result: Tormenta
    set: { travel: none, forage: impossible, lost: -2 }
```

- `result` es texto (plantilla) o un objeto. `table:` / `generator:` delegan en otra definición. `set:` añade campos.
- **Por pesos:** `weight: 3` en lugar de `range`. El método de selección es intercambiable (`selector: range | weight`).
- **Condiciones:** `when:` en una entrada la habilita o deshabilita según el contexto. Se elige solo entre las entradas habilitadas.
- **Límites:** `once: true` o `maxOccurrences: 3`. Si sale una entrada agotada se vuelve a tirar (hasta N intentos) o se elige entre las disponibles, según `onExhausted: reroll | next | none`.

### Oráculo

Un oráculo es una tabla con **variantes elegidas por una entrada del contexto**. No hay nada de Mythic en el núcleo.

```yaml
kind: oracle
id: yes-no
inputs:
  likelihood: { options: [unlikely, even, likely], default: even }
roll: d100
variants:
  likely:
    entries:
      - { range: 1-5, result: Sí excepcional, set: { answer: yes, exceptional: true } }
      - { range: 6-75, result: Sí, set: { answer: yes } }
      - { range: 76-95, result: No, set: { answer: no } }
      - { range: 96-100, result: No excepcional, set: { answer: no, exceptional: true } }
  even: { … }
  unlikely: { … }
```

La pregunta ("¿Hay guardias en la puerta?") va en el contexto y en el registro, no en la definición.

### Generador

Campos resueltos en orden. Cada campo puede usar los anteriores como contexto y como condición:

```yaml
kind: generator
id: settlement
fields:
  size: { table: settlement-size }
  faction: { table: settlement-faction }
  npc: { generator: npc } # composición
  conflict: { table: settlement-conflict, context: { size: '{{size.value}}' } }
template: '{{size}} gobernado por {{faction}}. {{npc}}'
```

### Mazo

```yaml
kind: deck
id: event-deck
cards:
  - { id: storm, result: Se avecina tormenta, count: 2 }
  - { id: ambush, table: ambushes }
reshuffle: when-empty # when-empty | manual | after-draw
```

### Dados (`@open-tabletop/dice`)

- **MVP:** `NdM`, `dM`, `d100`, `d66` (decenas y unidades), `NdF`, `+`/`-` constantes, `kh`/`kl` (quedarse con los mayores o menores: `2d6kh1`) y la variante de **ventaja/desventaja**, que repite la expresión entera y se queda con el mejor o peor total.
- `roll: "2d6 + {{pre}}"`: la plantilla se sustituye con el contexto **antes** de parsear, pero solo se aceptan números. No hay forma de inyectar nada más.
- La gramática se puede ampliar con nuevos tipos de término.
- Resultado con desglose:

```ts
{ expression: '2d6+1', terms: [{ kind: 'dice', sides: 6, rolls: [4, 5], kept: [4, 5] }, { kind: 'const', value: 1 }], total: 10 }
```

### Condiciones (`@open-tabletop/conditions`)

- **MVP** con objetos que se pueden comprobar sin evaluar código:

```yaml
when: { terrain: forest } # igualdad
when: { terrain: [forest, swamp] } # pertenencia
when: { danger: { gte: 4 }, season: { not: winter } }
when: { any: [{ weather: storm }, { lost: true }] } # all/any/not
```

- **Más adelante**, una DSL de strings (`danger >= 4 and season == "winter"`) que se compila al mismo árbol con un parser propio. Nunca `eval` ni `Function`.

## 5. Estado de ejecución

```ts
interface OracleState {
  decks: Record<string, { draw: string[]; discard: string[] }> // orden explícito: reproducible
  occurrences: Record<string, number> // '<pack>/<table>#<entryId>' → veces que ha salido
  vars: Record<string, unknown> // variables persistentes de la partida
}
```

Es serializable y va al bundle OTD (`state.oracle`). Las definiciones no cambian nunca. Para identificar una entrada de forma estable, cada una tiene un `id` implícito (su índice) o uno explícito, recomendable en packs que vayan a evolucionar.

## 6. Modelo de resultados

```ts
interface Resolution {
  source: string // 'kal-arath/encounters'
  kind: 'table' | 'oracle' | 'generator' | 'deck'
  value: Record<string, unknown> // estructurado: { creature: 'wolves', count: 6, … }
  text?: string // plantilla renderizada
  entry?: string // entrada elegida
  rolls: DiceResult[] // desglose de todas las tiradas de este nodo
  children: Resolution[] // subtablas y campos: árbol completo para la UI y la depuración
  context: Record<string, unknown> // contexto efectivo usado
}

interface ResolveOutcome {
  resolution: Resolution
  state: OracleState // estado nuevo (o el mismo, si no cambia)
  record: HistoryRecord // { at, source, input, rolls, value, text, seed? }: el llamante lo persiste
}
```

**No todo acaba siendo un string:** `value` siempre lleva datos utilizables, y `text` es una presentación opcional.

## 7. API pública

```ts
const registry = await loadPacks(files, { parsers: [json, yaml] }) // valida y compila; errores con ruta y posición
const engine = createOracleEngine({ registry, random: seeded(42), maxDepth: 16, onEvent })

engine.resolve('kal-arath/encounters', ctx, state) // tabla u oráculo
engine.generate('kal-arath/settlement', ctx, state)
engine.draw('core/event-deck', state)
engine.shuffle('core/event-deck', state) / engine.reset(id, state)
engine.list({ kind: 'table', tag: 'encounter' }) // para buscadores de la UI

validatePack(files) // sin compilar, para editores y CLI (`oracle validate ./packs/kal-arath`)
```

- `onEvent` es un callback opcional (`TABLE_RESOLVED`, `DECK_DRAWN`, `ORACLE_RESOLVED`…). No hay bus de eventos propio.
- El contexto es un objeto plano de valores (`{ terrain, weather, danger, pre }`), así que el motor nunca conoce qué es un hex.

## 8. Estructura de directorios

```
packages/oracle-engine/src/
  index.ts             # API pública
  definitions/         # tipos y esquemas Zod de las definiciones
  loader/              # PackLoader, parsers json/yaml, resolución de dependencias y alias
  compile/             # Validator + Compiler → Registry
  resolve/             # table.ts, oracle.ts, generator.ts, deck.ts, template.ts
  state.ts             # OracleState y helpers inmutables
  history.ts
packages/dice/src/        parser.ts, roll.ts, types.ts
packages/random/src/      index.ts (RandomSource, seeded, mathRandom)
packages/conditions/src/  index.ts (match(cond, ctx), validate(cond))
packs/core/               pack.yaml, oracles/yes-no.yaml, …
packs/kal-arath/          pack.yaml (en git) + tablas (locales, ignoradas)
```

## 9. Riesgos

| Riesgo                                                                | Mitigación                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| La DSL de condiciones crece hasta ser un lenguaje                     | MVP con objetos y lista cerrada de operadores; la DSL de texto compila al mismo árbol.                        |
| Plantillas con lógica (bucles, ifs)                                   | Solo sustitución de valores y dados. La lógica va en `when` o en generadores.                                 |
| Las ids de entrada cambian al editar un pack y se rompe `occurrences` | Ids de entrada explícitos opcionales; aviso del validador si un pack con estado cambia de forma incompatible. |
| Recursión infinita (A → B → A)                                        | El compilador detecta ciclos estáticos y en ejecución hay `maxDepth` para los dinámicos (condiciones).        |
| Copyright de packs de terceros                                        | El motor no incluye contenido; `packs/kal-arath` es local; `core` solo tiene contenido FOSS propio.           |
| Reproducibilidad                                                      | `RandomSource` inyectable; cada registro guarda las tiradas en crudo; mazos con orden explícito en el estado. |
| Packs grandes y lentos                                                | Se compilan una vez; resolver es O(entradas) sin reparsear.                                                   |

## 10. MVP

- `random` (mulberry32 con semilla y `Math.random`), `dice` (gramática MVP con desglose), `conditions` (matcher de objetos).
- Loader JSON + YAML, packs con `pack.yaml`, namespaces y dependencias simples.
- Validación: sintaxis, referencias inexistentes, rangos solapados o con huecos, ciclos, dependencias que faltan, mazos vacíos.
- Tablas por rangos y por pesos, subtablas, oráculos con variantes, generadores simples, plantillas, contexto y modificadores.
- `once` / `maxOccurrences`, `OracleState`, historial, resultados estructurados.
- Tests con RNG determinista para todo lo anterior.
- **Fuera del MVP:** UI compleja, editor visual, DSL de texto, CSV/Markdown, importadores, CLI, scripting, sincronización y red.

## 11. Ejemplos con la estructura de Kal-Arath

El contenido real del manual va en el pack local. Aquí los ejemplos usan textos de relleno para mostrar la forma.

**Comprobación de encuentro diaria** (1d6, con 5–6 hay encuentro; después tabla d66 y reacción con 2d6+PRE):

```yaml
kind: generator
id: encounter-check
fields:
  check: { roll: 1d6 }
  encounter:
    when: { check: { gte: 5 } }
    table: encounters
  reaction:
    when: { check: { gte: 5 } }
    table: reaction
template: '{{encounter}} — reacción: {{reaction}}'
---
kind: table
id: encounters
roll: d66
entries:
  - { range: 11, result: '{{1d6}} exploradores nómadas', set: { kind: humans } }
  - { range: 12, result: '{{3d6}} peregrinos', set: { kind: humans } }
  - { range: 13, result: '{{count}} bestias de la estepa', set: { count: '{{2d6}}', kind: beast } }
  # … hasta 66
---
kind: table
id: reaction
roll: '2d6 + {{pre}}' # PRE del grupo, desde el contexto
entries:
  - { range: 2-3, result: Matar, set: { hostile: true } }
  - { range: 4-6, result: Hostil, set: { hostile: true } }
  - { range: 7-8, result: Neutral }
  - { range: 9-10, result: Amistoso }
  - { range: 11-12, result: Servicial }
```

Uso desde la capa de integración, cuando el Travel Engine emite `ENCOUNTER_CHECK_REQUIRED`:

```ts
engine.generate('kal-arath/encounter-check', { pre: party.stats.pre, advantage: 0 }, state)
// → value: { check: 5, encounter: { kind: 'humans', … }, reaction: { hostile: true } }, text: '4 exploradores nómadas — reacción: Hostil'
```

**Clima por estación**: una tabla por estación con los modificadores en `set`, y un generador que elige la tabla según el contexto.

```yaml
kind: table
id: weather
roll: 1d6
entries: # entradas habilitadas por estación; se tira solo entre las de la estación actual
  - { range: 1, when: { season: spring }, table: weather-spring, … }
```

Mejor todavía: con `table: 'weather-{{season}}'`, la referencia dinámica se valida contra las estaciones declaradas en `inputs`. El clima con inercia (Markov) corresponde al `weather-engine`, no a una tabla.

**Perderse**: no es una tabla, sino una **regla de navegación** del Travel Engine (1–2 en 1d6, sin tirada si se va por camino o río). El Oracle solo la resolvería si el pack la declara como tabla y la capa de integración la asocia a `NAVIGATION_CHECK_REQUIRED`.

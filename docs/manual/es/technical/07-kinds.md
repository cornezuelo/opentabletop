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
| `travel-rules` | Cómo funciona un viaje: velocidades, terrenos, provisiones, acciones… | Jugar del Hexmapper, la aplicación Travel                                           | Uno              |
| `bindings`     | Qué tabla responde a cada comprobación del viaje, las características | Jugar del Hexmapper, la aplicación Travel                                           | Uno              |
| `calendar`     | Meses, estaciones, días de la semana, lunas y fiestas                 | Los viajes, el panel Mundo del Hexmapper                                            | Uno              |
| `weather`      | Clima con memoria: el de hoy sigue al de ayer, por estación           | Los viajes (un binding con `weather:`)                                              | Los que quieras  |

**Quién lee qué.** Las tablas, oráculos, generadores y mazos son todo cosas que se tiran, y cualquier cosa que tira puede tirar cualquiera de ellas: el Oracle a mano, una comprobación del viaje o el descubrimiento si un binding la nombra (`resolve: omens` roba una carta). **Cuántos:** uno de los tipos que describen el sistema entero (sus modos de tirada, reglas de viaje, bindings, calendario: un sistema tiene una forma de hacer cada cosa), los que quieras del resto. Los modelos de clima pueden ser varios porque un sistema puede tener varios climas (la costa y las montañas, cada uno atado a su comprobación).

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

## Modos de tirada

Las formas en que un sistema tira una tabla **varias veces y se queda con un total**: ventaja, desventaja o cualquier otra (tres tiradas quedándose con la del medio…). Las aplicaciones no conocen ninguna: las declara un pack, con sus nombres, y sus tablas dicen cuáles usan. Una definición `roll-modes` por pack, con los modos que quieras.

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

Cómo funciona un viaje: el día (alba, anochecer, horas de marcha), los terrenos y sus velocidades y si se puede entrar (`passable`: `false`, o `{ when, unless }` para un paso cerrado en invierno o un lago que se cruza sobre el hielo), el agua (lo mismo), los caminos y ríos, las formas de viajar (km por día, por dónde pueden ir: `through`, y cuándo se pueden elegir: `when` / `unless`), qué hace el grupo al anochecer si espera (`day.night`), las provisiones (con su `min` / `max`), el clima que frena, sus **valores del día** (`values`: `lost` con lo que `blocks`: `travel`, el id de una de sus acciones (camp, rest, forage…) o `mode.<id>`), las **acciones** del grupo (todas iguales: acampar, descansar, buscar comida…: `when` / `unless`, `oncePerDay`, `on:` para las que hace el propio sistema en un momento o tras otra acción (o varios: una lista), y sus pasos, `do`: `time`, `speed`, `effects`, `set`, `do`, `roll`) y las **comprobaciones**: qué se tira al alba, al entrar en un hex, al final del día, con una acción (acampar, por ejemplo) o solo con el `roll:` de un paso, y cuándo (`when` / `unless`); una comprobación puede tener `effects` propios y `pause: true` (detenerse tras ella hasta **Continuar**). Un pack con reglas de viaje es un **sistema** que se juega en el Hexmapper (Jugar → Con reglas) y en la aplicación Travel. En detalle: [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) y los [Sistemas](../travel/03-systems.md) de la aplicación Travel.

**Qué ven las tablas:** los datos del viaje (`terrain`, `edges`, `mode`, `day`, `season`, `weather`, `yesterday.<value>`…) y el grupo (`party.resources.food`, `party.stats.fatigue`): la lista completa está en [Qué ven las tablas](04-what-tables-see.md).

## Bindings

La otra mitad de un sistema: qué tabla (`resolve:`) o modelo de clima (`weather:`) responde a cada comprobación, con `context` extra; las **características** del grupo (nombre, descripción, valor inicial) que leen las tablas (`{{charisma}}`); **reads**, nombres para los demás valores que leen sus tablas (`icon.guards`, `fordModifier`…); y el **descubrimiento** (qué tablas deciden los hexes vacíos). En detalle: [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

**Qué ven las tablas:** cada característica por su nombre (`{{charisma}}`, `when: { party.stats.morale: { lte: 0 } }`) y el `context` del binding (`timeOfDay: night`).

## Calendarios

Los meses del año (con sus días y estaciones), los días de la semana, las lunas (ciclo y fase) y las fiestas, y el año del día 1. Los viajes con ese sistema ponen fecha a su diario con él, y las tablas ven `month`, `year`, `weekday`, `moons.<luna>` (new, waxing, full, waning) y `holidays`. El panel [Mundo](../hexmapper/12-world.md) del Hexmapper usa el calendario del sistema del mapa. Sin uno, se usa un calendario sencillo de días y cuatro estaciones.

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

Clima con memoria (una cadena de Markov): por estación, para cada tipo de clima, lo probable que es cada tipo mañana, así que la lluvia se instala varios días y las tormentas pasan. Cada tipo de clima tiene un nombre y los valores que da al día (`set: { fordModifier: -1 }`), como el resultado de una tabla. Un viaje usa uno cuando un binding dice `weather: <modelo>` en vez de `resolve:`; el clima de hoy pasa a ser `weather` para las comprobaciones siguientes y las velocidades de las reglas de viaje.

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

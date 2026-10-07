# Condiciones

Una **condición** dice cuándo se aplica algo: una entrada que solo sale en bosques, una comprobación que solo se tira fuera de los caminos, una acción disponible solo con buen tiempo, un modo de tirada que se usa solo el día después de perderse. Se escriben igual en todas partes: `when` y `unless` en las entradas de tabla, las comprobaciones, las acciones y sus pasos, y las formas de viajar, `through` (por dónde puede ir una forma de viajar), y `modeWhen` en tablas y oráculos.

Una condición es un conjunto de pares `nombre: lo que debe ser` sobre los valores que ve la tirada (mira [Qué ven las tablas](04-what-tables-see.md)). Se deben cumplir todos los pares. En la casilla de un formulario escribes los pares sin llaves (`terrain: forest, danger: { gte: 3 }`); en YAML, entre llaves (`when: { terrain: forest, danger: { gte: 3 } }`).

Nada de una condición se ejecuta como código: los packs de cualquiera se cargan sin peligro.

## Comparar un valor

| Escribe                     | Se cumple cuando                                           | Ejemplo                                   |
| --------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `nombre: valor`             | el valor es exactamente ese                                | `terrain: forest`, `lost: true`, `day: 1` |
| `nombre: [a, b, c]`         | el valor es cualquiera de ellos                            | `terrain: [forest, dense-forest, heath]`  |
| `nombre: { eq: valor }`     | el valor es exactamente ese (lo mismo que `nombre: valor`) | `season: { eq: winter }`                  |
| `nombre: { not: valor }`    | el valor es cualquier cosa menos ese (también si falta)    | `season: { not: summer }`                 |
| `nombre: { not: [a, b] }`   | el valor no es ninguno de ellos                            | `mode: { not: [boat, cart] }`             |
| `nombre: { in: [a, b] }`    | el valor es cualquiera de ellos (lo mismo que una lista)   | `weather: { in: [rain, storm] }`          |
| `nombre: { gt: n }`         | el valor es un número **mayor que** n                      | `party.stats.morale: { gt: 0 }`           |
| `nombre: { gte: n }`        | un número **mayor o igual que** n                          | `danger: { gte: 3 }`                      |
| `nombre: { lt: n }`         | un número **menor que** n                                  | `party.resources.food: { lt: 1 }`         |
| `nombre: { lte: n }`        | un número **menor o igual que** n                          | `aroundCount: { lte: 2 }`                 |
| `nombre: { exists: true }`  | el valor está (sea el que sea)                             | `icon.id: { exists: true }`               |
| `nombre: { exists: false }` | el valor falta                                             | `region: { exists: false }`               |

Varias comparaciones sobre el mismo valor se deben cumplir todas: `danger: { gte: 2, lte: 4 }` es 2, 3 o 4.

- **Los números** solo se comparan con números: `danger: { gte: 3 }` no se cumple donde no hay peligro, ni donde se escribió como texto.
- **Las listas** del contexto, como las `tags` de un hex o las `holidays` del día, se cumplen cuando **contienen** el valor: `tags: landmark` se cumple en un hex con las etiquetas `ford, landmark`; `tags: [ford, toll]`, en uno con cualquiera de las dos.
- **Los valores que faltan** no encajan, salvo con `not` y `exists: false`.
- **Los nombres con puntos** leen dentro de un valor: `party.stats.survival`, `icon.guards`, `moons.pale`, `yesterday.lost`.

## Juntar condiciones

| Escribe      | Se cumple cuando                  | Ejemplo                                                              |
| ------------ | --------------------------------- | -------------------------------------------------------------------- |
| varios pares | se cumplen todos                  | `{ terrain: forest, timeOfDay: night }`                              |
| `all: [ … ]` | todas las condiciones de la lista | `all: [{ terrain: [forest, dense-forest] }, { danger: { gte: 5 } }]` |
| `any: [ … ]` | al menos una                      | `any: [{ edges: road }, { edges: river }, { mode: boat }]`           |
| `not: { … }` | la condición de dentro no         | `not: { timeOfDay: night }`                                          |

Se anidan: `{ all: [{ moons.ember: full }, { not: { tags: haunted } }] }`. `all` hace falta cuando un valor aparece dos veces, porque un par solo se puede escribir una vez (`{ all: [{ tags: ford }, { tags: toll }] }`: un hex con las dos etiquetas).

`not` tiene dos sentidos según lo que le sigue: `season: { not: summer }` compara un valor; `not: { season: summer }`, arriba del todo, da la vuelta a una condición entera. Aquí se cumplen en los mismos casos; con más pares dentro, la segunda dice «no todos estos».

## `when` y `unless`

- `when` se debe cumplir para que se aplique; sin él, se aplica siempre.
- `unless` **no** se debe cumplir; sin él, nada lo impide.
- Con los dos, se miran los dos: `when: { terrain: forest }, unless: { edges: road }` es un bosque al que no se llega por camino.

## Dónde las verás, en las Marcas Grises

- Entradas: la Sierpe de la tabla de encuentros, `when: { all: [{ terrain: [forest, dense-forest] }, { danger: { gte: 5 } }] }`; la cacería, `when: { all: [{ moons.ember: full }, { timeOfDay: night }] }`.
- Comprobaciones: perderse, `unless: { any: [{ edges: [road, river] }, { mode: boat }] }`; el vado, `when: { all: [{ tags: ford }, { not: { mode: boat } }] }`.
- Acciones y pasos: buscar comida, `unless: { weather: storm }`; la noche bien comidos de la acampada, `when: { short: false }`.
- Formas de viajar: la barca va `through: { any: [{ water: true }, { terrain: coast }] }` y se sube `when: { any: [{ water: true }, { terrain: coast }, { tags: ferry }] }` (solo se elige a la orilla o en el transbordador; si no, sale desactivada en el panel del viaje, diciendo por qué).

Un valor del día no es una condición, pero funciona como una: mientras se cumple, **bloquea** lo que lista (`blocks: [travel]`, el id de una acción, `mode.horse`). Mira [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

- Modos de tirada: perderse con desventaja al día siguiente, `modeWhen: { disadvantage: { yesterday.lost: true } }`.

Cuando una condición está mal escrita (un operador desconocido, una lista donde va un número), el pack muestra un problema en esa línea al cargar.

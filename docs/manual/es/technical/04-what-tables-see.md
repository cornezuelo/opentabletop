# Lo que ven las tablas

Cada tirada recibe un **contexto**: valores que una tabla puede usar en sus dados (`{{danger}}`), sus textos y sus condiciones (`when: { danger: { gte: 2 } }`). Esta página lista cada valor, de dónde sale y cuál gana cuando dos tienen el mismo nombre.

## Del mapa (Hexmapper)

Del hex seleccionado (o el del grupo), y en un viaje, de cada hex del que trata una comprobación:

| Nombre       | Qué es                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `hex`        | El hex (`"5,7"`: columna, fila).                                                                                                  |
| `terrain`    | El id del terreno (`forest`, `hills`…). No está en un hex en blanco.                                                              |
| `water`      | `true` cuando el terreno está marcado como agua (Editar paleta → Agua).                                                           |
| `tags`       | Las etiquetas del hex, una lista: `when: { tags: landmark }` se cumple si la lista la tiene.                                      |
| `region`     | El **nombre** de la región (`Ashford Vale`).                                                                                      |
| _cada valor_ | Los valores de la **región** del hex, y luego los **del propio hex** (el del hex gana con la misma clave): `danger`, `elevation`… |
| `icon`       | El icono del hex: `icon.id` (`game:castle`) y cada uno de sus valores: `{{icon.guards}}`.                                         |
| `name`       | El nombre del hex, si tiene.                                                                                                      |

Desde el panel Oracle, también el **token seleccionado**:

| Nombre  | Qué es                                                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------- |
| `token` | `token.name`, `token.kind` (`pc`, `npc`, `enemy`, `party`) y cada uno de sus valores (`{{token.fare}}`). |

Los puntos de interés guardan sus valores en el mapa y en su fichero, pero las tablas no los leen: un hex puede tener varios.

## De un viaje (Jugar en el Hexmapper, aplicación Travel)

| Nombre                                          | Qué es                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `season`                                        | `spring`, `summer`, `autumn`, `winter`.                                                                                                                                                                                                                                                                                                                                                                       |
| `weather`                                       | El clima de hoy, cuando una tabla lo ha fijado.                                                                                                                                                                                                                                                                                                                                                               |
| `mode`                                          | La forma de viajar (`foot`, `horse`, `boat`…).                                                                                                                                                                                                                                                                                                                                                                |
| `day`                                           | El número de día.                                                                                                                                                                                                                                                                                                                                                                                             |
| `yesterday`                                     | El día anterior: los valores de ese día (`yesterday.weather`, `yesterday.fordModifier`…) y los valores del día que declara el sistema (`yesterday.lost`: el grupo acabó perdido; false si no). P. ej. reencontrar el camino con desventaja: `disadvantageWhen: { yesterday.lost: true }`.                                                                                                                     |
| `month`, `year`, `weekday`, `moons`, `holidays` | Con un calendario propio del sistema: el id del mes, el año, el día de la semana, la fase de cada luna (`moons.pale: full`) y las fiestas del día (una lista).                                                                                                                                                                                                                                                |
| `edges`                                         | Los caminos, senderos o ríos del tramo: el recién recorrido al entrar en un hex, el de delante al alba y al acampar.                                                                                                                                                                                                                                                                                          |
| _cada característica_                           | Las características del grupo del sistema con su valor actual, por nombre: `{{charisma}}`. Atajo: un dato del mapa o del viaje con el mismo nombre gana (ver abajo).                                                                                                                                                                                                                                          |
| `party`                                         | El grupo, siempre sin ambigüedad: `party.stats.charisma`, `party.resources.food`, `party.mode`. También en las tiradas a mano durante un viaje.                                                                                                                                                                                                                                                               |
| `below`, `above`, `doing`                       | Para las acciones y comprobaciones de un sistema: los ids de los valores (provisiones, características) que un efecto intentó llevar más allá de su `min` (`below: [food]`) o su `max` ese día, y la acción en curso (`doing: camp`; en `day-end`, aquella en la que acabó el día). En los packs antiguos `short` es true cuando hay algo en `below`, y `camping` cuando está en curso la acción de la noche. |
| _los valores del día_                           | Los que fijó antes ese mismo día una tabla: `weather`, cualquier nombre que acabe en `Modifier` o `Impossible` (`fordModifier`, `fordImpossible`) y los valores del día que declara el sistema (`lost`). Se borran al alba y pasan a `yesterday.*`.                                                                                                                                                           |
| _el contexto del binding_                       | Lo que añaden los bindings para esa comprobación: `context: { timeOfDay: night }`; para un oráculo, su entrada (`odds: even`).                                                                                                                                                                                                                                                                                |

## Descubrir el mapa

- La tabla de **terreno** ve el hex donde está el grupo (su terreno, etiquetas, valores y región), más `hex` (el hex que se decide), `from` (desde el que se ve) y la tierra alrededor del hex que se decide: `around` cuenta los terrenos de sus vecinos conocidos (`around.lake: 2`), `aroundCount` cuántos se conocen, `common` el terreno más frecuente (en un empate gana el del hex desde el que se ve) y `commonCount` cuántos lo tienen.
- La tabla de **contenido** ve el hex al que se entra.
- Las dos ven las características del grupo, `party` y los valores del día.

## Qué valor gana

Cuando dos fuentes dan el mismo nombre, gana la posterior:

1. **Comprobaciones:** características del grupo por nombre → valores del día → lo del mapa y del viaje → `party` → contexto del binding. Así una característica o un valor del día llamado `terrain` o `weather` no puede tapar el de verdad; `party.stats.terrain` sigue llegando a ella. Nombres reservados que una característica no debería usar: `hex`, `terrain`, `water`, `tags`, `region`, `name`, `icon`, `token`, `season`, `weather`, `mode`, `day`, `edges`, `party`.
2. **Tiradas a mano** (panel Oracle): durante un viaje, el mismo orden que las comprobaciones; después el token → lo que escribes en el **Contexto** del panel de tirada. Un `token.fare` escrito cambia solo ese valor del token.
3. **Dentro de una tabla:** los valores que fija una entrada (`set`) llegan a la tabla que tira a continuación; los campos de un generador ven los anteriores, y el `context` de un campo añade valores solo para ese campo.

Algunas coincidencias, y lo que pasa:

- **Un valor de región y uno de hex** con el mismo nombre (`danger: 2` en el Bosque Gris, `danger: 5` en uno de sus hexes): allí gana el del hex, en el resto el de la región. Así hacen las Marcas Grises que el bosque sea más peligroso hacia su corazón.
- **Una característica que se llama como un dato** (una característica `weather`, o `terrain`): `{{weather}}` y `when: { weather: storm }` leen el clima del día, nunca la característica; esta sigue siendo `party.stats.weather`. Mejor no usar esos nombres (la lista de arriba).
- **Un valor de un icono o token llamado `terrain`**: se lee como `icon.terrain` / `token.terrain`, dentro de su propio nombre, así que no tapa el terreno del hex.
- **Un valor que fija una entrada con el nombre de una característica** (`set: { morale: 1 }` con una característica `morale`): el texto del resultado y las tablas que tira leen `{{morale}}` como 1, pero no cambia la característica ni se mantiene el resto del día (solo lo hacen `weather`, `…Modifier`, `…Impossible` y los valores declarados). Para cambiarla, usa `effects: { party.stats.morale: 1 }`.
- **El contexto de un binding** (`context: { timeOfDay: night }`) gana a todo para su comprobación: así la misma tabla responde a los encuentros de día y de noche.

## Tipos de valor

- Lo escrito como número (`3`, `-1`, `2.5`) es un **número**: se suma en los dados y se compara con `gt`/`gte`/`lt`/`lte`. `true` y `false` son sí/no. Lo demás es texto.
- En los dados, un valor que falta cuenta como **0**: `1d6 + {{danger}}` funciona donde no hay peligro.
- En las condiciones, un valor que falta no cumple, salvo con `exists: false` o `not`. Todos los operadores, con ejemplos: [Condiciones](08-conditions.md).
- Los nombres con puntos leen dentro de un valor: `token.fare`, `icon.guards`, `npc.role` (un campo de un generador).

Las Marcas Grises usan todos ellos; [Las Marcas Grises](../packs/02-grey-marches.md) dice dónde.

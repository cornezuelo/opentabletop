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

| Nombre                    | Qué es                                                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `season`                  | `spring`, `summer`, `autumn`, `winter`.                                                                                                                                 |
| `weather`                 | El clima de hoy, cuando una tabla lo ha fijado.                                                                                                                         |
| `mode`                    | La forma de viajar (`foot`, `horse`, `boat`…).                                                                                                                          |
| `day`                     | El número de día.                                                                                                                                                       |
| `edges`                   | Los caminos, senderos o ríos del tramo: el recién recorrido al entrar en un hex, el de delante al alba y al acampar.                                                    |
| _cada característica_     | Las características del grupo del sistema con su valor actual: `{{charisma}}`.                                                                                          |
| _los valores del día_     | Los que fijó antes ese mismo día una tabla: `weather`, y cualquier nombre que acabe en `Modifier` o `Impossible` (`fordModifier`, `fordImpossible`). Se borran al alba. |
| _el contexto del binding_ | Lo que añaden los bindings para esa comprobación: `context: { timeOfDay: night }`; para un oráculo, su entrada (`odds: even`).                                          |

## Descubrir el mapa

- La tabla de **terreno** ve el hex donde está el grupo (su terreno, etiquetas, valores y región), más `hex` (el hex que se decide) y `from` (desde el que se ve).
- La tabla de **contenido** ve el hex al que se entra.
- Las dos ven las características del grupo y los valores del día.

## Qué valor gana

Cuando dos fuentes dan el mismo nombre, gana la posterior:

1. **Comprobaciones:** lo del mapa y del viaje → características del grupo → valores del día → contexto del binding.
2. **Tiradas a mano** (panel Oracle): el mapa, el token y el viaje → lo que escribes en el **Contexto** del panel de tirada. Un `token.fare` escrito cambia solo ese valor del token.
3. **Dentro de una tabla:** los valores que fija una entrada (`set`) llegan a la tabla que tira a continuación; los campos de un generador ven los anteriores, y el `context` de un campo añade valores solo para ese campo.

## Tipos de valor

- Lo escrito como número (`3`, `-1`, `2.5`) es un **número**: se suma en los dados y se compara con `gt`/`gte`/`lt`/`lte`. `true` y `false` son sí/no. Lo demás es texto.
- En los dados, un valor que falta cuenta como **0**: `1d6 + {{danger}}` funciona donde no hay peligro.
- En las condiciones, un valor que falta no cumple, salvo con `exists: false` o `not`.
- Los nombres con puntos leen dentro de un valor: `token.fare`, `icon.guards`, `npc.role` (un campo de un generador).

Las Marcas Grises usan todos ellos; [Las Marcas Grises](../packs/02-grey-marches.md) dice dónde.

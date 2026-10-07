# Dados, plantillas y contexto

Esta página reúne todo lo que se puede escribir en los dados de una tabla, en sus textos y en sus condiciones, y de dónde salen los valores. No hace falta nada más: no hay que abrir ningún JSON ni declarar una lista de variables; una tabla lee lo que contenga su contexto cuando se tira.

## Dados

Los dados van en la **tirada** de una tabla u oráculo (Dados en el formulario), en los campos de generador con **Dados** y dentro de los textos como `{{…}}`.

| Escribe                      | Significa                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `1d6`, `3d8`                 | Tira N dados de M caras y súmalos (`NdM`).                                                                                                 |
| `d20`                        | Un dado (`dM` es `1dM`).                                                                                                                   |
| `d100`, `d%`                 | Porcentual: de 1 a 100.                                                                                                                    |
| `d66`                        | Dos d6 leídos como decenas y unidades: 11, 12 … 16, 21 … 66 (36 resultados, típico de las tablas old school). Los rangos son como `11-16`. |
| `4dF`                        | Dados Fudge/Fate: cada uno da −1, 0 o +1, así que `4dF` va de −4 a +4.                                                                     |
| `2d6+1`, `1d20-2`, `1d6+1d4` | Suma o resta constantes y otros dados.                                                                                                     |
| `4d6kh3`                     | Tira 4d6 y **quédate con los 3 más altos** (`kh`).                                                                                         |
| `2d20kl1`                    | Tira 2d20 y **quédate con el más bajo** (`kl`).                                                                                            |
| `1d6 + {{danger}}`           | Suma un valor del contexto (ver abajo). Si falta cuenta como 0; si no es un número, la tirada falla con un mensaje claro.                  |

**Los modos de tirada** (ventaja, desventaja… lo que declare el sistema, ver [Tipos de definición](../technical/07-kinds.md#modos-de-tirada)) tiran la expresión entera varias veces y se quedan con el total más alto, el más bajo o el del medio. La tarjeta del resultado muestra cada dado, con los descartados tachados.

## Plantillas en los textos

Los textos (resultados, plantillas de generador, textos de carta) pueden incluir `{{…}}`:

| Escribe        | Muestra                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `{{2d6}}`      | Una tirada, ahí mismo: `'{{2d6}} lobos'` → «7 lobos».                                                                          |
| `{{season}}`   | Un valor del contexto.                                                                                                         |
| `{{npc.role}}` | Una parte de un valor (el campo de un generador guarda los valores de su tabla).                                               |
| `{{result}}`   | En una entrada con **luego tira**: el texto de la tabla que tiró, p. ej. `'Bandidos: están {{result}}'` con `table: reaction`. |
| `{{campo}}`    | En la plantilla de un generador: el valor de un campo (su texto, si vino de una tabla).                                        |

Un valor que falta no muestra nada. Las plantillas nunca ejecutan código: solo buscan valores y tiran dados.

Las referencias a tablas y generadores también pueden ser plantillas: `table: 'weather-{{season}}'` tira `weather-spring`, `weather-autumn`… según la estación.

## De dónde salen los valores del contexto

Cuando se tira una definición recibe un **contexto**: un conjunto de valores con nombre. Salen de, en este orden:

1. **Lo que escribes** en el recuadro **Contexto** del panel de tirada (la aplicación Oracle lista los valores que lee una definición, con sugerencias sacadas de sus condiciones).
2. **El Hexmapper**, cuando tiras desde su panel de Oracle o en un viaje: `hex`, `terrain`, `water`, `tags`, `name`, `region`, los campos de la región y del hex, el icono (`icon.*`) y el token seleccionado (`token.*`); durante un viaje, `season`, `weather`, `mode`, `day`, las estadísticas del grupo, los valores del día (`weather`, `…Modifier`, `…Impossible` fijados antes ese mismo día) y `edges` (el camino o río que se sigue).
3. **Los bindings** de un sistema de viaje: `context: { … }` añade valores fijos para una comprobación.
4. **Dentro de la propia tirada**:
   - La **entrada** de un oráculo es un valor con su nombre (`odds: even`).
   - Los valores que **fija** (`set`) una entrada pasan a la tabla que tira después (**luego tira**) y forman parte del resultado.
   - Los **campos** de un generador se tiran en orden y cada uno ve los anteriores; el `context: { … }` de un campo añade valores solo para ese campo.

Las condiciones (`when`) leen el mismo contexto. Consulta [Referencia YAML](06-yaml.md#condiciones) para su sintaxis.

## Todo junto

```yaml
kind: generator
id: encounter
name: Encuentro
fields:
  who: { table: wilderness-creatures } # lee terrain, season… del contexto
  mood: { table: reaction, context: { bonus: 1 } }
  count: { roll: '1d6 + {{danger}}' } # un campo del hex en el Hexmapper
template: '{{count}} × {{who}}, {{mood}}'
```

Tirado en un hex de bosque con `danger: 2`, podría dar «5 × lobos, curiosos».

# Dados, variables y contexto

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

## Sin dados: pesos

Una tabla sin dados (con **Dados** vacío, sin `roll:` en YAML) elige una entrada por **peso** en vez de por rango: cada entrada tiene un `weight` (1 si no dice nada), y su probabilidad es su peso entre la suma de todos los pesos. Los pesos son relativos: solo importa cómo se comparan entre sí.

```yaml
kind: table
id: npc-roles
entries:
  - { id: pedlar, weight: 2, result: buhonero } # 2 de 6: una vez de cada tres
  - { id: pilgrim, weight: 3, result: peregrino } # 3 de 6: la mitad de las veces
  - { id: witch, weight: 1, result: bruja } # 1 de 6
```

Usa pesos cuando ningún dado da la probabilidad que quieres, o para hacer más raros algunos resultados sin renumerar los rangos. Sin ningún peso, todas las entradas son igual de probables (las _Ruinas_ de las Marcas Grises). Las entradas que una condición (`when`) deja fuera no cuentan, así que las demás se reparten su probabilidad. Una tabla usa dados y rangos o pesos, no las dos cosas; los modos de tirada necesitan dados. En las Marcas Grises, _Oficios_ y _Verano en las Marcas_ usan pesos.

## Variables en los textos

`{{…}}` lleva una **variable** (`{{season}}`: el valor con ese nombre) o una **tirada** (`{{2d6}}`: dados). Los textos (resultados, plantillas de generador, textos de carta) pueden incluirlas:

| Escribe        | Muestra                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `{{2d6}}`      | Una tirada, ahí mismo: `'{{2d6}} lobos'` → «7 lobos».                                                                          |
| `{{season}}`   | Una variable: un valor del contexto.                                                                                           |
| `{{npc.role}}` | Una parte de un valor (el campo de un generador guarda los valores de su tabla).                                               |
| `{{result}}`   | En una entrada con **luego tira**: el texto de la tabla que tiró, p. ej. `'Bandidos: están {{result}}'` con `table: reaction`. |
| `{{campo}}`    | En la plantilla de un generador: el valor de un campo (su texto, si vino de una tabla).                                        |

Un valor que falta no muestra nada. Las variables nunca ejecutan código: solo buscan valores y tiran dados. Un valor que es entero un `'{{…}}'` (`count: '{{2d6}}'`) guarda lo que lee: un número sigue siendo un número.

Las referencias a tablas y generadores también pueden usar variables: `table: 'weather-{{season}}'` tira `weather-spring`, `weather-autumn`… según la estación.

## Variables y tiradas en las condiciones

Las condiciones comparan igual con una variable o una tirada: `when: { danger: { gt: '{{party.stats.stealth}}' } }`, o una tirada por debajo de una característica:

```yaml
kind: table
id: climb-the-wall
entries:
  - { id: up, result: Lo escalas, when: { party.stats.str: { gte: '{{1d20}}' } } }
  - { id: fall, result: Te caes, unless: { party.stats.str: { gte: '{{1d20}}' } } }
```

En una tirada de la tabla, los mismos dados son la misma tirada en todas partes, así que sale exactamente una de las dos entradas, y la tarjeta del resultado muestra el d20. Más en [Condiciones](../technical/08-conditions.md#variables-y-tiradas).

## De dónde salen los valores del contexto

Cuando se tira una definición recibe un **contexto**: un conjunto de valores con nombre. Salen de, en este orden:

1. **Lo que escribes** en el recuadro **Contexto** del panel de tirada (la aplicación Oracle lista los valores que lee una definición, con sugerencias sacadas de sus condiciones).
2. **El Hexmapper**, cuando tiras desde su panel de Oracle o en un viaje: `hex`, `terrain`, `water`, `tags`, `name`, `region`, los campos de la región y del hex, el icono (`icon.*`) y el token seleccionado (`token.*`); durante un viaje, `season`, `weather`, `mode`, `day`, las estadísticas del grupo, los valores del día (`weather`, `…Modifier`, `…Impossible` fijados antes ese mismo día) y `edges` (el camino o río que se sigue).
3. **Los bindings** de un sistema de viaje: `context: { … }` añade valores fijos para una comprobación.
4. **Dentro de la propia tirada**:
   - La **entrada** de un oráculo es un valor con su nombre (`odds: even`).
   - Los valores que **fija** (`set`) una entrada pasan a la tabla que tira después (**luego tira**) y forman parte del resultado.
   - Los **campos** de un generador se tiran en orden y cada uno ve los anteriores; el `context: { … }` de un campo añade valores solo para ese campo.

Las condiciones (`when`) leen el mismo contexto, y también las variables. Consulta [Referencia YAML](06-yaml.md#condiciones) para su sintaxis.

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

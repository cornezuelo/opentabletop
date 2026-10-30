# Tierra

La pestaña **Tierra** edita los **modelos de tierra** del sistema (`kind: land`): terreno con memoria. Para cada terreno, un modelo dice lo probable que es que un hex junto a él sea cada terreno, así la tierra que se genera o se descubre sale coherente (los bosques siguen siendo bosques, las colinas se juntan en cordilleras, el agua en lagos) en vez de un mosaico. **Nuevo modelo de tierra** crea uno, para cambiarlo, y lo lista en el sistema (`land:` en su Resumen). Esta página explica cómo decide un modelo un hex, luego la pestaña, construye un modelo pequeño paso a paso y repasa los errores habituales. El YAML: [Modelos de tierra](../technical/07-kinds.md#modelos-de-tierra).

## Cómo decide un modelo un hex

- **Sus vecinos conocidos.** Un hex vacío mira los seis hexes que lo rodean que tienen terreno (pintados, o ya decididos).
- **Sus filas, sumadas.** Para cada uno, la fila del modelo para su terreno: los pesos de lo que se vuelve un hex junto a él. Dos vecinos de bosque cuentan dos veces la fila del bosque; un hex entre bosque y colinas tira hacia los dos. Un terreno sin fila en el modelo no suma nada.
- **Una elección.** Se elige un terreno con esos pesos: pesos, no porcentajes (`forest 6`, `hills 2` son tres bosques por cada colina).
- **Donde no se conoce nada**: un hex sin ningún vecino conocido con fila en el modelo usa sus propios pesos (el primer hex de un mapa en blanco).
- **El hex desde el que se ve**: al descubrir, el hex que pisa el grupo puede contar más que los demás (**El hex desde el que se ve cuenta** `2`: la tierra de la que vienes cuenta doble).

Dónde se usa, una vez que el sistema lo lista:

- **Generar tierra** de Mapa (herramienta Terreno) rellena los hexes vacíos de un mapa, y **Generar sus hexes vacíos** de una región los de la región, creciendo hacia fuera desde la tierra que pintaste ([Terreno](../hexmapper/02-terrain.md#generar-tierra)).
- **El descubrimiento**, cuando los bindings deciden con él los hexes vacíos (`discover.terrain: { land: land.default }`), o cuando la tabla de terreno le pasa un hex (`set: { land: land.default }` en una entrada) ([Descubrir el mapa](../oracle/07-connecting.md#7-descubrir-el-mapa)).

## La pestaña

- **Nombre**: cómo se llama el modelo (_La forma de la tierra_).
- **El hex desde el que se ve cuenta**: cuántas veces cuenta al descubrir el hex que pisa el grupo (vacío: una, como cualquier otro).
- **Junto a cada terreno**: una cuadrícula. Cada fila es un terreno junto al que puede estar un hex; cada columna, lo que ese hex puede volverse; cada casilla, un peso (vacío es 0). Cada fila empieza con su color en las paletas de Mapa. **×** quita una fila; **Añadir un terreno**, con un terreno de las reglas o de la paleta, añade una (que sigue siendo él mismo, `1`, hasta que la peses).
- **Donde no se conoce nada**: los pesos de un hex sin ningún vecino conocido.
- **A lo largo de muchos hexes**: cuánto de cada terreno tiene una extensión grande que crece desde la nada, con los pesos de arriba.
- **Un trozo de esta tierra**: tierra que crece desde la nada con el modelo, con los colores de terreno de Mapa; **Otro** saca otro trozo.

## Paso a paso: una tierra de bosques y lagos

Un sistema nuevo empieza sin modelo de tierra. En un sistema propio:

1. **El modelo**: en la pestaña **Tierra**, **Nuevo modelo de tierra**. Empieza con llanuras, bosques, colinas y montañas; llámalo _Bosques y lagos_.
2. **Bosques que siguen**: en la fila **Bosque**, `forest` · `6`, `plains` · `1`.
3. **Lagos**: **Añadir un terreno** `lake`. En su fila, `lake` · `4`, `forest` · `2`; en la fila **Bosque**, `lake` · `1`.
4. **Mira**: **Un trozo de esta tierra** muestra bosques con lagos dentro, y **A lo largo de muchos hexes** cuánto hay de cada uno; **Otro** para otro trozo. Si salen demasiados lagos, baja `lake` en su propia fila.
5. **Úsalo**: en Mapa, un mapa que juegue este sistema (**Ajustes del mapa → Campaña → Sistema**); pinta un hex de bosque y, en la herramienta Terreno, **Rellenar los hexes vacíos**.

## Lo mismo en YAML

```yaml
kind: land
id: land
name: Bosques y lagos
next:
  plains: { plains: 5, forest: 2, hills: 1 }
  forest: { forest: 6, plains: 1, lake: 1 } # pasos 2 y 3
  hills: { hills: 4, mountains: 2, plains: 1 }
  mountains: { mountains: 4, hills: 2 }
  lake: { lake: 4, forest: 2 } # paso 3
start: { plains: 2, forest: 1 }
```

_La tierra sencilla_ de Core es el modelo más pequeño para cualquier mapa; _La tierra de las Marcas_ de las Marcas Grises cuenta doble la tierra de la que vienes y decide su este sin dibujar pasadas las Hollow Hills: su [página](../packs/02-grey-marches.md) dice dónde.

## Errores frecuentes

- **Un mosaico.** Una fila que no da más peso a su propio terreno (`forest: { plains: 3, forest: 1 }`) lo desperdiga. Dale a cada terreno su propia columna la que más pese en su fila.
- **Un terreno que no sale nunca.** Nada lleva a él: ninguna fila le da peso, ni **Donde no se conoce nada**. Dale un poco de peso en la fila de un vecino (`plains: { lake: 1 }`).
- **Un terreno que se come el mapa.** Solo lleva a sí mismo (`lake: { lake: 6 }`): en cuanto sale uno, se extiende. Haz que lleve también a otros (`lake: { lake: 4, marsh: 1, plains: 1 }`).
- **No aparece en Mapa.** El sistema tiene que listar el modelo (`land:` en su Resumen), y el mapa tiene que jugar ese sistema.
- **Un terreno que las reglas no conocen.** El modelo nombra un terreno que las reglas de viaje no tienen: el pack muestra un aviso; un hex tendría un terreno que nada lee. Añádelo en **Reglas → Terrenos**, o usa uno que conozcan.

# Hoja

La pestaña **Hoja** edita las dos hojas del sistema, las dos opcionales (`kind: sheet`): **la de sus personajes** (`sheet`), lo que tiene cada personaje, y **la del propio grupo** (`partySheet`), lo que es de todo el grupo (moral, fatiga, mercenarios…) en cada viaje, viaje quien viaje. Esta página explica cómo funcionan las hojas, luego cada parte de la pestaña, monta una compañía de tres desde cero paso a paso y enumera los errores habituales. La ayuda junto a cada campo lo explica, con ejemplos.

## Cómo funcionan las hojas

Una hoja es un formulario en blanco: dice lo que tiene un personaje (Supervivencia, Salud, Raciones…), con los límites que el sistema da a cada número, y los estados que puede tener un personaje (herido, cojo). Un **personaje** es ese formulario relleno: Kael, con Supervivencia 3 y Salud 2, cojo desde esta mañana. La hoja es el único sitio donde se declara todo esto: los personajes no tienen valores propios fuera de ella.

- **Sin hoja de personajes**, el grupo se juega como un todo: sus características y provisiones son números del grupo ([Comprobaciones](06-checks.md)).
- **Con ella**, la pestaña **Grupo** de un viaje tiene una sección **Personajes** donde los añades ([Jugar un viaje](../travel/02-playing.md#personajes)), y **el grupo son sus miembros**, como dice la pestaña [Comprobaciones](06-checks.md): una característica del grupo puede salir de sus valores (la mejor Supervivencia entre ellos, cuántos son), una provisión la pueden llevar ellos (la comida son las raciones de todos juntas, y lo que el viaje come se les quita a ellos, por igual o en orden), y un estado que tenga uno de ellos puede **bloquear** algo a todo el grupo (un compañero cojo: no marcha nadie).
- **Los valores no salen de sus límites.** Los efectos nunca llevan un valor más allá de su **Mín.** y su **Máx.**; un límite puede ser otro valor de la misma hoja (la Salud hasta la Dureza), y cuando ese baja, el primero baja con él. Un valor sin límites puede ir a cualquier parte, también por debajo de 0.
- **La hoja del propio grupo** es un personaje más, el grupo mismo, en cada viaje viaje quien viaje: sus valores (la moral) se quedan mientras los personajes se unen y se van. Una característica del grupo puede ser uno de sus valores (`party: morale`): la característica y el valor son el mismo número.
- **A quién llega un efecto** lo dice su nombre: `party.members.values.health: -1` (a todos), `acting.values.health: -1` (a quien actúa ahora, elegido en el viaje), `roles.guide.…` (a quien tiene un [rol de viaje](06-checks.md#roles-de-viaje)), `characters.kael.…` (a uno por su id), `party.values.morale: -1` (a la hoja del grupo). Las condiciones los leen igual (`characters.kael.conditions: lame`, `acting.values.survival: { gte: 2 }`).

![Una hoja de personajes y los personajes hechos con ella (Kael, Mara, Tobin), cada uno con sus valores y estados; el grupo hecho de ellos: la Supervivencia es la mejor de los que no están heridos, la comida es la suma de sus raciones y lo que el viaje come se reparte entre ellos, y un estado que bloquea (Cojo: travel.move) detiene a todo el grupo. Al lado, la hoja del propio grupo: la Moral, que es la característica Moral.](sheet-party.svg)

## La pestaña

Con las dos hojas, una pestaña encima del formulario elige cuál. Si el sistema tiene [facciones](08-factions.md), su hoja se edita aquí también, en una pestaña propia (_faction · las facciones_), salvo que sea una de esas dos. **Nueva hoja de personajes** y **Nueva hoja de grupo** hacen una pequeña y la nombran en el sistema (`sheet:`, `partySheet:` en su **Resumen**). Allí donde se juega una hoja (la pestaña **Grupo** del viaje, la hoja de una ficha en el Hexmapper), dice cuál es y de qué sistema, con **Editar en Sistemas ↗** para venir aquí. El YAML de una hoja: [Hojas](../technical/07-kinds.md#hojas).

- Su **Nombre** y su **Descripción** (para qué es la hoja).
- Sus **Valores**, cada uno con un id, un nombre, el valor en que **Empieza** (el de un personaje nuevo), **Mín.** y **Máx.** (un número, u otro valor entre llaves, `'{{self.values.toughness}}'`: tan alto como la Dureza del personaje; vacío: sin límite), cómo **Se muestra** (con sus **Niveles** y **Tonos**: [más abajo](#cómo-se-muestran-los-valores)) y **Grupo**.
- Los **Grupos** en los que se muestran los valores, en orden, con sus nombres: cada grupo es una tarjeta propia, tantas una al lado de otra como quepan.
- Sus **Estados**, cada uno con lo que **Bloquea** a todo el grupo mientras alguien lo tenga: `travel.move` (seguir moviéndose), una de las acciones del sistema (`actions.forced-march`), una forma de viajar (`modes.horse`) (la casilla los sugiere).
- Sus **Tipos de relación**, con los límites del número que lleva una (un vínculo de 0 a 3) y cómo **Se muestra**: a qué puede estar ligado un personaje (otro personaje, un lugar, una región), que se lee donde está el grupo (`hex.related`).

Bajo los valores, la **Vista previa** es un personaje hecho con la hoja tal como está ahora, dibujado como en todos los sitios donde se muestran personajes: cambia una columna y cambia con ella; haz clic en sus casillas, barras y puntos para probarlos (nada de lo que hagas ahí se guarda).

Los valores y estados tienen una columna **Usado en**: las características que salen de cada valor, los límites que lo leen (el `{{self.values.toughness}}` de la Salud), y las tablas, acciones y comprobaciones que lo leen o lo cambian en un personaje, en quien tiene un rol o en el grupo ([Usado en](04-overview.md#usado-en)). También los tipos de relación: dónde se leen, por quien los tiene (`characters.mara.relations.home`) o hacia un lugar (`hex.relations.home`, quién lo tiene con el hex en el que se entra).

Los valores, grupos, estados y tipos de relación tienen cada uno una **Descripción (su ayuda)**: qué es, en una o dos frases. Donde se enseñe la hoja (la ficha de un personaje, la del grupo, la de una facción), su nombre aparece subrayado y al hacer clic la columna de ayuda enseña primero esa descripción, antes de lo que añaden las aplicaciones (cómo lo leen las tablas, sus límites, lo que bloquea). Como los nombres, se escribe en el idioma actual: el del pack o su fichero de traducción. Las Marcas Grises describen cada parte de las suyas.

Lo que el grupo toma de sus personajes se dice en [Comprobaciones](06-checks.md): **De las hojas** en una característica del grupo, y **Provisiones que llevan los miembros**.

## Cómo se muestran los valores

Cada valor dice cómo se dibuja allí donde se muestra un personaje (la pestaña **Grupo** de un viaje, la hoja de una ficha, una facción en el panel del Mundo, la aplicación Personajes), en su columna **Se muestra como**. No cambia nada de cómo juega el valor: las tablas y los efectos leen y cambian el mismo número.

| Se muestra como | Se ve como                                           | Para                                                                                      |
| --------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| (vacío)         | una casilla con el número                            | cualquier cosa; valores sin máximo                                                        |
| `of`            | el número junto a su máximo: **2 / 6**               | lo que se lleva, lo que queda                                                             |
| `bar`           | una barra llena hasta su máximo, con **−** y **+**   | la salud, los puntos de golpe, una reserva que se vacía                                   |
| `boxes`         | casillas que marcar, tantas como su máximo           | estrés, experiencia, el progreso de un juramento; una casilla es un sí o no               |
| `pips`          | puntos redondos, tantos como su máximo               | puntuaciones de 1 a 5, un vínculo de 0 a 3                                                |
| `dial`          | un reloj redondo con tantos segmentos como su máximo | la fuerza de una facción, una cuenta atrás                                                |
| `levels`        | una lista de nombres entre los que elegir            | el daño (_Ileso_ … _Moribundo_), un tamaño de dado (`d4` … `d12`), cómo te ve una facción |

- **Todos menos el vacío y `levels` necesitan un Máx.**, un número u otro valor (una barra hasta la Dureza del personaje crece y mengua con ella). Hacer clic en una casilla, punto o segmento pone el valor en él; hacer clic en el último lleno lo vacía; nunca por debajo del **Mín.**
- **Los niveles** son nombres en orden, cada uno una pastilla (Intro o una coma lo añade): el primero es el **Mín.** del valor (0 si no tiene), el siguiente uno más, y así. Con Mín. `-3`, `hated, cold, wary, neutral, liked, trusted, beloved` hace −3 _Odiado_ y 3 _Querido_ (con esos nombres traducidos). Más allá del último se muestra el número. Sus nombres (y una descripción, que sale en la ayuda del valor) se traducen como el resto de la hoja, por id; un nivel sin nombre enseña su id (`d8`).
- **Los tonos** colorean el valor desde un número hacia arriba, con los colores del tema: `good` (verde), `warning` (ámbar), `danger` (rojo) y `accent` (el de siempre). `0: danger, 2: warning, 4: good` es rojo en 0 y 1, ámbar en 2 y 3, verde desde 4; `5: danger` solo se pone rojo en 5. Un umbral puede ser también **una parte del Máx.**, que sigue a un máximo que cambia: `0: danger, 50%: warning, 75%: good` es rojo por debajo de la mitad, ámbar desde la mitad, verde desde tres cuartos (con Máx. 3: rojo en 0 y 1, ámbar en 2, verde en 3; con Máx. 6: verde desde 5). Las barras, casillas, puntos, diales y números lo toman todos; una barra vacía conserva su tono en el marco.
- **Un tipo de relación** con número tiene su propio **Se muestra como** (no `levels`): un vínculo de 0 a 3 como `pips`.

Las Marcas Grises usan cada uno: las habilidades como puntos, la salud como una barra cuyo tono baja con ella, las raciones como `2 / 6`, el pavor como casillas que se ponen rojas, el temple como un dado que sube de paso de d4 a d12, un vínculo como puntos, y la fuerza de sus facciones como un dial y la reputación como niveles con nombre y tonos, de _Hostil_ a _Amigos jurados_ ([su página](../packs/02-grey-marches.md)).

## Paso a paso: una compañía de tres

Una compañía que cruza unas colinas a pie: cada compañero tiene una Supervivencia, una Dureza, una Salud que no puede pasar de ella y las raciones que lleva; el grupo se orienta tan bien como su mejor compañero que no esté herido; los pedregales de las colinas pueden herir y dejar cojo a quien va delante, y nadie marcha mientras alguien esté cojo; las noches sin comida hieren a todos y desgastan la moral de la compañía. Parte de un sistema nuevo: empieza como copia de las Reglas genéricas, sin hojas (su día, la marcha y la comida de cada noche: mira [Reglas](05-rules.md)).

1. **Créalo**: escribe _La Compañía_ bajo la lista de sistemas y pulsa **+**.
2. **La hoja de personajes**: en **Hoja**, **Nueva hoja de personajes**, y llámala _Compañero_. En **Grupos**, `skills` con el nombre _Habilidades_ y `body` con el nombre _Cuerpo_. En **Valores**, cambia su primer valor a `survival`, _Supervivencia_, **Empieza en** `1`, **Mín.** `0`, **Máx.** `5`, **Grupo** `skills`, y añade `toughness` (_Dureza_, `3`, `1`, `6`, `body`), `health` (_Salud_, `3`, `0`, **Máx.** `'{{self.values.toughness}}'`, **Se muestra como** `bar`, `body`) y `rations` (_Raciones_, `2`, `0`, `4`, sin grupo).
3. **Sus estados**: cambia su primer estado a `wounded`, _Herido_, sin bloquear nada, y añade `lame`, _Cojo_, **Bloquea** `travel.move`.
4. **La hoja del grupo**: **Nueva hoja de grupo**, con el nombre _La Compañía_; cambia su primer valor a `morale`, _Moral_, **Empieza en** `3`, **Mín.** `0`, **Máx.** `5`, **Se muestra como** `boxes`, y quita su estado.
5. **Lo que el grupo toma de ellos**: en **Comprobaciones**, en **Características del grupo**, **Añadir una característica** _Supervivencia_ (cambia su id a `survival`) con **De las hojas** `max: survival, unless: { conditions: wounded }, none: 0` (la mejor de los que no están heridos; si no queda nadie: 0), y una característica _Moral_ (id `morale`) con `party: morale`. En **Provisiones que llevan los miembros**, `food` **Llevada en** `rations`, con el **Reparto** por igual.
6. **Pedregal**: **Añadir una comprobación**, con **Comprobación** `SCREE` y el nombre _Pedregal_. **Cuándo** `trip.hex-enter`; **Solo si** las filas `hex.terrain` · **es** · `hills` y `party.stats.survival` · **es menos de** · `{{1d6}}` (un d6 por encima de la Supervivencia del grupo); sin tabla; **Cambios** las filas `acting.values.health` · `-1` y `acting.conditions.lame` · `true`.
7. **Hambre**: **Añadir una comprobación**, con **Comprobación** `HUNGER` y el nombre _Hambre_. **Cuándo** `time.day-end`; **Solo si** `trip.below` · **es** · `food`; **Cambios** las filas `party.members.values.health` · `-1` y `party.values.morale` · `-1`.
8. **Pruébalo**: en **Pruébalo**, haz un camino de seis hexes: `plains`, `hills`, `hills`, `hills`, `plains`, `plains`. En la pestaña **Grupo** del viaje, **Añadir un personaje** tres veces: _Kael_ con Supervivencia `3`, _Mara_, y _Tobin_ con Dureza `4` y Salud `4`. Pon las Raciones de Kael a `1` y las de los otros a `0`, elige a Kael en **Actúa** y marcha día tras día, esperando a la mañana siguiente cada vez que la marcha se detenga.

**Lo que verás.** Encima de los personajes, la ficha de **La Compañía** con la Moral como cinco casillas, tres llenas; la Salud de cada compañero es una barra, llena. La Supervivencia del grupo sale en gris, `3`, la de Kael; su Comida `1`, también en gris, la suma de las raciones. Marca **Herido** en Kael: la Supervivencia baja a `1` (la de Mara y Tobin), y vuelve al desmarcarlo. Baja la Dureza de Tobin a `2`: la Salud de Tobin baja a `2` con ella. En las colinas, cada hex en que se entra tira un d6 contra la Supervivencia (**Todo** lo enseña: _Pedregal no sale_ con la tirada, cuando no pasa de 3); cuando sale, el diario dice lo que le hizo a quien actúa (_Kael: Salud: 3 → 2_, _Kael: Cojo: ahora sí_), y la marcha se detiene: _Kael: Cojo: el grupo no puede viajar mientras dure_; **Marchar** sale en gris, con el Cojo de Kael como motivo. Desmarca **Cojo** en Kael y sigue marchando. La primera noche el grupo se come la última ración de Kael (Comida `0`, Raciones de Kael `0`); la segunda no hay nada que comer: _Comida no puede bajar de 0_, _No queda nada que comer._, la Salud de todos baja uno (_Todos: Salud_) y la Moral de la Compañía baja uno (quedan dos casillas).

## Lo mismo en YAML

Las dos hojas, como las enseña la pestaña **YAML**:

```yaml
# sheet.yaml
kind: sheet
id: sheet # paso 2
name: Compañero
values:
  survival: { name: Supervivencia, default: 1, min: 0, max: 5, group: skills }
  toughness: { name: Dureza, default: 3, min: 1, max: 6, group: body }
  health:
    { name: Salud, default: 3, min: 0, max: '{{self.values.toughness}}', display: bar, group: body }
  rations: { name: Raciones, default: 2, min: 0, max: 4 }
groups:
  skills: { name: Habilidades }
  body: { name: Cuerpo }
conditions: # paso 3
  wounded: { name: Herido }
  lame: { name: Cojo, blocks: [travel.move] }
---
kind: sheet
id: party # paso 4
name: La Compañía
values:
  morale: { name: Moral, default: 3, min: 0, max: 5, display: boxes }
```

Lo que añaden los demás pasos al sistema, a las Reglas genéricas y a sus bindings (un extracto: el resto queda como estaba):

```yaml
# system.yaml (kind: system), nombradas por los pasos 2 y 4
sheet: sheet.sheet
partySheet: sheet.party
---
# travel.yaml: las reglas (kind: travel-rules)
checks:
  - event: SCREE # paso 6
    name: Pedregal
    at: trip.hex-enter
    when: { hex.terrain: hills, party.stats.survival: { lt: '{{1d6}}' } }
    effects: { acting.values.health: -1, acting.conditions.lame: true }
  - event: HUNGER # paso 7
    name: Hambre
    at: time.day-end
    when: { trip.below: food }
    effects: { party.members.values.health: -1, party.values.morale: -1 }
# … el día, los terrenos, las formas de viajar, la comida y las acciones de las Reglas genéricas
---
# travel.yaml: los bindings (kind: bindings), paso 5
stats:
  survival:
    name: Supervivencia
    from: { max: survival, unless: { conditions: wounded }, none: 0 }
  morale: { name: Moral, from: { party: morale } }
resources:
  food: { carried: rations }
```

Las Marcas Grises juegan con todo esto y más (una hoja de la Compañía con moral, fatiga y mercenarios; compañeros con habilidades, salud bajo su máximo como barra, el pavor como casillas, heridas, un tobillo torcido y las rozaduras de montar; Supervivencia, Sigilo y Bocas hechas de ellos; raciones repartidas; un guía y un vigía; hogares que levantan la moral): su [página](../packs/02-grey-marches.md) dice dónde.

## Errores habituales

- **Efectos que no cambian a nadie.** `acting.…` solo llega a quien esté elegido en **Actúa**; con **Nadie**, el diario dice _No actúa nadie, así que … no cambia nada_. Elige quién actúa, o escribe `party.members.…` para todos.
- **Una característica del grupo que no puedes cambiar.** Una característica hecha de los personajes (**De las hojas**) los sigue y sale en gris: cambia sus valores. Los efectos sobre ella se sobrescriben en cuanto cambian los personajes; para bajar el ánimo del grupo, dale al grupo una hoja y escribe `party.values.morale`.
- **Comida que no sube.** Una provisión que llevan los personajes tiene la suma de sus límites: con Raciones hasta 4, tres compañeros llevan 12 como mucho. Sube el **Máx.**, o añade personajes.
- **Un estado que no bloquea nada.** **Bloquea** se escribe con el nombre completo: `travel.move`, `actions.forced-march`, `modes.horse`; un `march` o un `horse` a secas no bloquea nada. La casilla sugiere lo que tiene el sistema.
- **Un límite escrito como un nombre.** `max: toughness` no es otro valor: escribe `'{{self.values.toughness}}'`, entre comillas (los problemas del sistema lo dicen).
- **Casillas, una barra o un dial sin Máx.** Se dibujan hasta el **Máx.**, así que los problemas de la hoja lo dicen hasta que tenga uno. Con **Se muestra como** `levels`, necesita sus **Niveles**.
- **Niveles desplazados en uno.** El primer nivel es el **Mín.**: con Mín. `1`, `d4, d6, d8` hace del 1 un d4. Sin Mín., es el 0.
- **Los heridos siguen contando.** `max: survival` cuenta a todos; para dejar fuera a algunos, añade `unless: { conditions: wounded }`, y `none` para cuando no queda nadie (si no, 0).
- **Un valor que baja de cero.** Sin **Mín.**, los efectos llevan un valor por debajo de 0. Dale los límites que tenga tu juego, o ninguno cuando de verdad no tiene.
- **Personajes de otro sistema.** Un viaje toma personajes hechos con la hoja de su sistema: **Del plantel** solo enseña esos; un personaje de otra hoja se queda en el plantel.

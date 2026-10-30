# Hoja

La pestaña **Hoja** edita las dos hojas del sistema, las dos opcionales (`kind: sheet`): **la de sus personajes** (`sheet`), lo que tiene cada personaje, y **la del propio grupo** (`partySheet`), lo que es de todo el grupo (moral, fatiga, mercenarios…) en cada viaje, viaje quien viaje. Esta página explica cómo funcionan las hojas, luego cada parte de la pestaña, monta una compañía de tres desde cero paso a paso y enumera los errores habituales. La ayuda junto a cada campo lo explica, con ejemplos.

## Cómo funcionan las hojas

Una hoja es un formulario en blanco: dice lo que tiene un personaje (Supervivencia, Salud, Pavor…), con los límites que el sistema da a cada número, y los estados que puede tener un personaje (herido, cojo). Un **personaje** es ese formulario relleno: Kael, con Supervivencia 3 y Salud 2, cojo desde esta mañana. La hoja es el único sitio donde se declara todo esto: los personajes no tienen valores propios fuera de ella.

- **Sin hoja de personajes**, el grupo se juega como un todo: sus características son números del grupo ([Comprobaciones](06-checks.md)), y lo que lleva es de su propia hoja (abajo).
- **Con ella**, la pestaña **Grupo** de un viaje tiene una sección **Personajes** donde los añades ([Jugar un viaje](../travel/02-playing.md#personajes)), y **el grupo son sus miembros**, como dice la pestaña [Comprobaciones](06-checks.md): una característica del grupo puede salir de sus valores (la mejor Supervivencia entre ellos, cuántos son), los objetos del grupo son los suyos juntos (las raciones que lleva cada uno: lo que el viaje come se les quita a ellos, por igual o en orden, [abajo](#objetos)), y un estado que tenga uno de ellos puede **bloquear** algo a todo el grupo (un compañero cojo: no marcha nadie).
- **Los valores no salen de sus límites.** Los efectos nunca llevan un valor más allá de su **Mín.** y su **Máx.**; un límite puede ser otro valor de la misma hoja (la Salud hasta la Dureza), y cuando ese baja, el primero baja con él. Un valor sin límites puede ir a cualquier parte, también por debajo de 0.
- **Algunas partes se mantienen por sí solas.** Un valor puede **salir de otros** (**Sale de**: las Heridas son la Salud máxima menos la Salud; la Capacidad, el doble de Might más 4): nadie lo pone, los sigue al momento. Un estado puede **cumplirse mientras** algo sea cierto (**Se cumple mientras**: Aterrado mientras el Pavor esté lleno; Mareado mientras el grupo viaje en barco): nadie lo pone ni lo quita, viene y se va por sí solo, y bloquea lo que dice mientras se cumple. Los dos se recalculan tras cada cambio (un efecto, un resultado, un cambio a mano en la ficha, un paso del viaje, un turno del mundo), así que un estado nunca llega tarde. En la ficha de un personaje se ven, pero no se editan: la casilla del valor y la marca del estado salen en gris, el estado en cursiva. **Un estado es una condición que se cumple por sí sola; lo que pasa una vez (una línea, un efecto, una pausa) es una acción**: no escribas un estado como una acción en cada momento.
- **Los objetos** son lo que lleva un personaje, cada uno con cuántos: la hoja dice qué tiene todo objeto (sus campos) y dónde van los objetos (sus lugares), y la pestaña [Objetos](08-items.md) lista lo que se puede elegir. Abajo: [Objetos](#objetos).
- **La hoja del propio grupo** es un personaje más, el grupo mismo, en cada viaje viaje quien viaje: sus valores (la moral, la comida, el agua) y sus objetos (las reservas de un grupo sin personajes) se quedan mientras los personajes se unen y se van, y un viaje nuevo empieza con el **Empieza en** de cada valor. Una característica del grupo puede ser uno de sus valores (`party: morale`): la característica y el valor son el mismo número. Lo que lleva el grupo es una de dos: un simple valor de esta hoja (`party.values.food`), u objetos (`party.items.ration`).
- **A quién llega un efecto** lo dice su nombre: `party.members.values.health: -1` (a todos), `acting.values.health: -1` (a quien actúa ahora, elegido en el viaje), `roles.guide.…` (a quien tiene un [rol de viaje](06-checks.md#roles-de-viaje)), `characters.kael.…` (a uno por su id), `party.values.morale: -1` (a la hoja del grupo). Las condiciones los leen igual (`characters.kael.conditions: lame`, `acting.values.survival: { gte: 2 }`).

![Una hoja de personajes y los personajes hechos con ella (Kael, Mara, Tobin), cada uno con sus valores y estados; el grupo hecho de ellos: la Supervivencia es la mejor de los que no están heridos, las raciones son las de todos juntas y lo que el viaje come se reparte entre ellos, y un estado que bloquea (Cojo: travel.move) detiene a todo el grupo. Al lado, la hoja del propio grupo: la Moral, que es la característica Moral.](sheet-party.svg)

## La pestaña

Con las dos hojas, una pestaña encima del formulario elige cuál. Si el sistema tiene [facciones](09-factions.md), su hoja se edita aquí también, en una pestaña propia (_faction · las facciones_), salvo que sea una de esas dos. **Nueva hoja de personajes** y **Nueva hoja de grupo** hacen una pequeña y la nombran en el sistema (`sheet:`, `partySheet:` en su **Resumen**). Allí donde se juega una hoja (la pestaña **Grupo** del viaje, la hoja de una ficha en Mapa), dice cuál es y de qué sistema, con **Editar en Sistemas ↗** para venir aquí. El YAML de una hoja: [Hojas](../technical/07-kinds.md#hojas).

- Su **Nombre** y su **Descripción** (para qué es la hoja).
- Sus **Valores**, cada uno con un id, un nombre, el valor en que **Empieza** (el de un personaje nuevo), **Mín.** y **Máx.** (un número, u otro valor entre llaves, `'{{self.values.toughness}}'`: tan alto como la Dureza del personaje; vacío: sin límite), cómo **Se muestra** (con sus **Niveles** y **Tonos**: [más abajo](#cómo-se-muestran-los-valores)) y **Grupo**. Un valor que **Sale de** otros lleva ahí su fórmula en vez de **Empieza**: los valores de la hoja entre llaves, con `+ - * /`, paréntesis y `floor`, `ceil`, `round`, `min`, `max`, `abs` (`'{{self.values.might * 2 + 4}}'`; un menos entre nombres lleva espacios, `self.values.maxHealth - self.values.health`). Los límites admiten la misma aritmética (`'{{self.values.might * 2}}'`).
- Los **Grupos** en los que se muestran los valores, en orden, con sus nombres: cada grupo es una tarjeta propia, tantas una al lado de otra como quepan.
- Sus **Estados**, cada uno con lo que **Bloquea** a todo el grupo mientras alguien lo tenga: `travel.move` (seguir moviéndose), una de las acciones del sistema (`actions.forced-march`), una forma de viajar (`modes.horse`) (la casilla los sugiere). Con **Se cumple mientras**, una [condición](../technical/08-conditions.md) en filas, se cumple por sí solo mientras se cumpla esa: lee al personaje como `self.*` (`self.values.dread: { gte: 6 }`) y, en un viaje, el mundo como lo ven las tablas (`trip.mode: boat`, `time.season: winter`). Uno que lee el mundo lo sigue en un viaje; en la aplicación Personajes, fuera de cualquier viaje, se queda como estaba la última vez.
- Sus **Objetos**: los campos que tiene todo objeto, sus lugares y lo que los ocupa ([abajo](#objetos)).
- Sus **Tipos de relación**, con los límites del número que lleva una (un vínculo de 0 a 3) y cómo **Se muestra**: a qué puede estar ligado un personaje (otro personaje, un lugar, una región), que se lee donde está el grupo (`hex.related`).

Bajo los valores, la **Vista previa** es un personaje hecho con la hoja tal como está ahora, dibujado como en todos los sitios donde se muestran personajes: cambia una columna y cambia con ella; haz clic en sus casillas, barras y puntos para probarlos (nada de lo que hagas ahí se guarda).

Los valores y estados tienen una columna **Usado en**: las características que salen de cada valor, los límites que lo leen (el `{{self.values.toughness}}` de la Salud), y las tablas, acciones y comprobaciones que lo leen o lo cambian en un personaje, en quien tiene un rol o en el grupo ([Usado en](04-overview.md#usado-en)). También los tipos de relación: dónde se leen, por quien los tiene (`characters.mara.relations.home`) o hacia un lugar (`hex.relations.home`, quién lo tiene con el hex en el que se entra).

Los valores, grupos, estados y tipos de relación tienen cada uno una **Descripción (su ayuda)**: qué es, en una o dos frases. Donde se enseñe la hoja (la ficha de un personaje, la del grupo, la de una facción), su nombre aparece subrayado y al hacer clic la columna de ayuda enseña primero esa descripción, antes de lo que añaden las aplicaciones (cómo lo leen las tablas, sus límites, lo que bloquea). Como los nombres, se escribe en el idioma actual: el del pack o su fichero de traducción. Las Marcas Grises describen cada parte de las suyas.

Lo que el grupo toma de sus personajes se dice en [Comprobaciones](06-checks.md) (**De las hojas** en una característica del grupo) y en sus objetos ([abajo](#objetos): cómo se reparte lo que gasta).

## Cómo se muestran los valores

Cada valor dice cómo se dibuja allí donde se muestra un personaje (la pestaña **Grupo** de un viaje, la hoja de un token, una facción en el panel del Mundo, la aplicación Personajes), en su columna **Se muestra como**. No cambia nada de cómo juega el valor: las tablas y los efectos leen y cambian el mismo número.

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
- **Frente a** otro valor, cuando lo que lo mide no es su máximo: con `of` o `bar`, **Frente a** `'{{self.values.capacity}}'` dibuja una carga como **9 / 8** y una barra llena hasta arriba. Nunca es un límite (a diferencia del **Máx.**, el valor puede pasarse), y las partes de **Tonos** son partes de él: `0: good, 100%: warning, 101%: danger` es verde por debajo de la capacidad, ámbar al llegar y rojo al pasarla.
- **Un umbral de Tonos puede ser otro valor**, entre llaves: `0: good, '{{self.values.capacity}}': danger` se pone rojo desde la capacidad, siguiéndola cuando cambia.
- **Un tipo de relación** con número tiene su propio **Se muestra como** (no `levels`): un vínculo de 0 a 3 como `pips`.

Las Marcas Grises usan cada uno: las habilidades como puntos, la salud como una barra cuyo tono baja con ella, el forraje de la Compañía como `6 / 12`, la carga de un compañero frente a su capacidad (`9 / 8`, en rojo), el pavor como casillas que se ponen rojas, el temple como un dado que sube de paso de d4 a d12, un vínculo como puntos, y la fuerza de sus facciones como un dial y la reputación como niveles con nombre y tonos, de _Hostil_ a _Amigos jurados_ ([su página](../packs/02-grey-marches.md)).

## Objetos

Qué tienen los objetos en este sistema y dónde van, todo opcional (una hoja sin ello también deja a los personajes llevar objetos por nombre y cantidad). Los objetos en sí están en los catálogos de la pestaña [Objetos](08-items.md), o se escriben a mano en la tarjeta de un personaje.

- **Campos de todo objeto**: números que tiene cada objeto (huecos, peso, usos, armadura), con **Empieza en**, **Mín.**, **Máx.** y cómo **Se muestra**, igual que los valores. **Se gasta** hace que al llegar al mínimo se acabe uno (las horas de una antorcha). Las tablas los leen como `characters.<id>.items.<objeto>.<campo>`.
- **Lugares**: dónde pueden ir los objetos (manos, cuerpo, cinturón, espalda…), cada uno con **Etiquetas** por las que caben los objetos (`hand`, `worn`) y su **Sitio** (un número, o valores de la hoja: `'{{self.values.might}}'`). Cualquier cuerpo: una criatura de tres cabezas declara tres lugares con la etiqueta `head`; un personaje raro puede añadir lugares propios en su tarjeta.
- **Lo que ocupa un lugar**: el campo que dice cuánto sitio ocupa un objeto (× cuántos); vacío: uno por objeto.
- **Más de lo que cabe**: si un lugar admite más de lo que le cabe. **allow** (por defecto): su sitio solo se muestra, en rojo cuando se pasa, y una condición dice qué supone pasarse. **refuse**: no entra nada que no tenga sitio: la tarjeta no ofrece lugares llenos, se rechaza moverlo ahí y lo que dé un efecto sin sitio en ninguna parte queda como diga **Si no cabe**. Puesto en la hoja, vale para todos los lugares y para el **Sitio en total**; cada lugar puede decir otra cosa en su propia columna **Más de lo que cabe**, y un contenedor en su catálogo (pestaña **Objetos**). Si el sitio encoge después (una capacidad que baja), lo que ya hay se queda, y se ve que se pasa.
- **Sitio en total**: cuánto lleva un personaje en total, además del sitio de cada lugar: un número o los valores de la hoja entre llaves (`'{{self.values.capacity * 2}}'`), contado con **Lo que ocupa un lugar** sobre todo lo que tiene, también lo de dentro de contenedores y lo que no está en ningún lugar. La tarjeta lo muestra (**Lleva 9 / 16**); con **Más de lo que cabe** `refuse`, no entra nada pasado ese sitio. Las tablas leen `acting.carried.used` y `.room`.
- **Si no cabe**: qué pasa con lo que da un efecto sin sitio libre, cuando ya entró todo lo que cabía. **leave** (por defecto): se queda atrás, y el diario dice _no queda sitio para 2, se queda atrás_. **ask**: espera en la tarjeta del personaje, marcado, en ningún lugar, y el viaje espera hasta que el jugador suelte algo o lo mueva a un lugar. A mano, la tarjeta no añade nada que no tenga sitio.
- **Reparto**: cómo se reparte entre los personajes de esta hoja lo que el grupo gasta o gana de un objeto: **even** (por defecto: se quita a quien más lleva y se da a quien menos, de uno en uno) u **order** (el primer personaje da, o recibe, todo lo que pueda, luego el siguiente). En un viaje, **Preguntar quién da** deja que el jugador lo cambie cada vez ([Jugar](../travel/02-playing.md)).
- **Empieza con**: lo que lleva un personaje nuevo de esta hoja, de los catálogos del sistema (`ration` · `2`): un compañero que sale con dos raciones. En la hoja del propio grupo, con lo que empieza cada viaje nuevo (las reservas de un grupo sin personajes).
- **Valores que salen de los objetos**: el **Sale de** de un valor admite un mapa en vez de una fórmula: `{ sum: items.slots }` (la carga), `{ max: items.armour, where: { place.tags: worn } }` (la mejor armadura puesta), `{ count: items, where: { item.tags: light } }` (cuántas luces). `where` es una condición sobre cada objeto (`item.tags`, `item.place`, `item.inside`, sus campos) y el lugar donde está (`place.tags`).

**Los objetos del grupo** son los de su propia hoja y los de sus personajes juntos: `party.items.ration.count` lee cuántos hay en total (todo objeto de los catálogos del sistema está ahí, a `0` mientras nadie tenga ninguno), y un efecto sobre ellos (`party.items.ration: -3`) quita primero de los del propio grupo y luego de los personajes como diga el **Reparto**; lo que se gana va a los personajes igual (a la hoja del grupo cuando no tiene ninguno). Para darle algo a un personaje en concreto, nómbralo: `acting.items.ration: 1`. Lo que llega a `0` se cuenta en el diario y se ve como `trip.below: party.items.ration`.

En la tarjeta de un personaje, la sección **Objetos** los agrupa por lugar, cada uno con cuántos, sus campos dibujados como se declaran y adónde moverlo. Las Marcas Grises dan a sus compañeros cuatro lugares y una carga frente a una capacidad ([su página](../packs/02-grey-marches.md)); un ejemplo entero: [Objetos](08-items.md#paso-a-paso-el-equipo-de-un-explorador).

## Paso a paso: una compañía de tres

Una compañía que cruza unas colinas a pie: cada compañero tiene una Supervivencia, una Dureza y una Salud que no puede pasar de ella; la compañía lleva su comida entre todos; el grupo se orienta tan bien como su mejor compañero que no esté herido; los pedregales de las colinas pueden herir y dejar cojo a quien va delante, y nadie marcha mientras alguien esté cojo; las noches sin comida hieren a todos y desgastan la moral de la compañía. Parte de un sistema nuevo: empieza como copia de las Reglas genéricas, con su hoja de grupo (Moral y Comida) y sin hoja de personajes (su día, la marcha y la comida de cada noche: mira [Reglas](05-rules.md)).

1. **Créalo**: escribe _La Compañía_ bajo la lista de sistemas y pulsa **+**.
2. **La hoja de personajes**: en **Hoja**, **Nueva hoja de personajes**, y llámala _Compañero_. En **Grupos**, `skills` con el nombre _Habilidades_ y `body` con el nombre _Cuerpo_. En **Valores**, cambia su primer valor a `survival`, _Supervivencia_, **Empieza en** `1`, **Mín.** `0`, **Máx.** `5`, **Grupo** `skills`, y añade `toughness` (_Dureza_, `3`, `1`, `6`, `body`), y `health` (_Salud_, `3`, `0`, **Máx.** `'{{self.values.toughness}}'`, **Se muestra como** `bar`, `body`).
3. **Sus estados**: cambia su primer estado a `wounded`, _Herido_, sin bloquear nada, y añade `lame`, _Cojo_, **Bloquea** `travel.move`.
4. **La hoja del grupo**: la pestaña _el grupo_ es la copia de la de las Reglas genéricas: cámbiale el nombre a _La Compañía_ y deja sus valores como están: `morale` (_Moral_, **Empieza en** `3`, **Mín.** `0`, **Máx.** `5`, **Se muestra como** `boxes`) y `food` (_Comida_, `6`, **Mín.** `0`), la comida que las reglas se comen al acabar cada día.
5. **Lo que el grupo toma de ellos**: en **Comprobaciones**, en **Características del grupo**, **Añadir una característica** _Supervivencia_ (cambia su id a `survival`) con **De las hojas** `max: survival, unless: { conditions: wounded }, none: 0` (la mejor de los que no están heridos; si no queda nadie: 0), y una característica _Moral_ (id `morale`) con `party: morale`.
6. **Pedregal**: **Añadir una comprobación**, con **Comprobación** `SCREE` y el nombre _Pedregal_. **Cuándo** `trip.hex-enter`; **Solo si** las filas `hex.terrain` · **es** · `hills` y `party.stats.survival` · **es menos de** · `{{1d6}}` (un d6 por encima de la Supervivencia del grupo); sin tabla; **Cambios** las filas `acting.values.health` · `-1` y `acting.conditions.lame` · `true`.
7. **Hambre**: **Añadir una comprobación**, con **Comprobación** `HUNGER` y el nombre _Hambre_. **Cuándo** `time.day-end`; **Solo si** `trip.below` · **es** · `party.values.food`; **Cambios** las filas `party.members.values.health` · `-1` y `party.values.morale` · `-1`.
8. **Pruébalo**: en **Pruébalo**, haz un camino de seis hexes: `plains`, `hills`, `hills`, `hills`, `plains`, `plains`. En la pestaña **Grupo** del viaje, **Añadir un personaje** tres veces: _Kael_ con Supervivencia `3`, _Mara_, y _Tobin_ con Dureza `4` y Salud `4`. En la ficha de La Compañía, pon la Comida a `1`; elige a Kael en **Actúa** y marcha día tras día, esperando a la mañana siguiente cada vez que la marcha se detenga.

**Lo que verás.** Encima de los personajes, la ficha de **La Compañía** con la Moral como cinco casillas, tres llenas; la Salud de cada compañero es una barra, llena. La Supervivencia del grupo sale en gris, `3`, la de Kael; la Comida de la Compañía, `1`. Marca **Herido** en Kael: la Supervivencia baja a `1` (la de Mara y Tobin), y vuelve al desmarcarlo. Baja la Dureza de Tobin a `2`: la Salud de Tobin baja a `2` con ella. En las colinas, cada hex en que se entra tira un d6 contra la Supervivencia (**Todo** lo enseña: _Pedregal no sale_ con la tirada, cuando no pasa de 3); cuando sale, el diario dice lo que le hizo a quien actúa (_Kael: Salud: 3 → 2_, _Kael: Cojo: ahora sí_), y la marcha se detiene: _Kael: Cojo: el grupo no puede viajar mientras dure_; **Marchar** sale en gris, con el Cojo de Kael como motivo. Desmarca **Cojo** en Kael y sigue marchando. La primera noche el grupo se come su última comida (Comida `0`); la segunda no hay nada que comer: _Comida no puede bajar de 0_, _No queda nada que comer._, la Salud de todos baja uno (_Todos: Salud_) y la Moral de la Compañía baja uno (quedan dos casillas).

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
  food: { name: Comida, default: 6, min: 0 }
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
    when: { trip.below: party.values.food }
    effects: { party.members.values.health: -1, party.values.morale: -1 }
# … el día, los terrenos, las formas de viajar, la comida y las acciones de las Reglas genéricas
---
# travel.yaml: los bindings (kind: bindings), paso 5
stats:
  survival:
    name: Supervivencia
    from: { max: survival, unless: { conditions: wounded }, none: 0 }
  morale: { name: Moral, from: { party: morale } }
```

Las Marcas Grises juegan con todo esto y más (una hoja de la Compañía con moral, fatiga y mercenarios; compañeros con habilidades, salud bajo su máximo como barra, el pavor como casillas, heridas, un tobillo torcido y las rozaduras de montar; Supervivencia, Sigilo y Bocas hechas de ellos; raciones como objetos que llevan, comidas primero de las reservas de la Compañía y luego repartidas; el forraje como un valor de la Compañía; un guía y un vigía; hogares que levantan la moral): su [página](../packs/02-grey-marches.md) dice dónde.

## Errores habituales

- **Efectos que no cambian a nadie.** `acting.…` solo llega a quien esté elegido en **Actúa**; con **Nadie**, el diario dice _No actúa nadie, así que … no cambia nada_. Elige quién actúa, o escribe `party.members.…` para todos.
- **Una característica del grupo que no puedes cambiar.** Una característica hecha de los personajes (**De las hojas**) los sigue y sale en gris: cambia sus valores. Los efectos sobre ella se sobrescriben en cuanto cambian los personajes; para bajar el ánimo del grupo, dale al grupo una hoja y escribe `party.values.morale`.
- **Raciones que no van a ninguna parte.** Lo que gana el grupo en objetos va a sus personajes (según el **Reparto**), o a su propia hoja si no tiene ninguno; un objeto que no está en ningún catálogo del sistema no se le puede dar a quien no tenga ya alguno: añádelo a un catálogo ([Objetos](08-items.md)).
- **Comida que nunca se acaba.** El viaje empieza con el **Empieza en** de cada valor del grupo; sin él, empieza en 0, y sin **Mín.** puede bajar de cero: dale los límites que tenga tu juego.
- **Un estado que no bloquea nada.** **Bloquea** se escribe con el nombre completo: `travel.move`, `actions.forced-march`, `modes.horse`; un `march` o un `horse` a secas no bloquea nada. La casilla sugiere lo que tiene el sistema.
- **Un límite escrito como un nombre.** `max: toughness` no es otro valor: escribe `'{{self.values.toughness}}'`, entre comillas (los problemas del sistema lo dicen).
- **Escribir en lo que se mantiene por sí solo.** Un efecto sobre un valor que **Sale de** otros, o sobre un estado con **Se cumple mientras**, no cambia nada: el diario dice _«Kael: Heridas» se mantiene por sí solo…_. Cambia aquello de lo que sale (la Salud), o lo que lee el estado (el Pavor).
- **Un menos sin espacios.** `self.values.maxHealth-self.values.health` se lee como un solo nombre (los ids pueden tener guiones) y no da nada: escribe `self.values.maxHealth - self.values.health`.
- **Un estado escrito como una acción.** Una acción `on: trip.hex-enter` que pone _Sobrecargado_ cuando la carga es demasiada solo mira en el hex siguiente: entre hexes, y tras un cambio a mano, la hoja va desfasada. Dale al estado un **Se cumple mientras**.
- **Una carga escrita como acción.** Sumar lo que se lleva en cada hex con una acción llega tarde y se desfasa: haz de la carga un valor que **Sale de** `{ sum: items.slots }`.
- **Casillas, una barra o un dial sin Máx.** Se dibujan hasta el **Máx.** (`of` y una barra, o hasta su **Frente a**), así que los problemas de la hoja lo dicen hasta que tenga uno.
- **Una carga que se para en su capacidad.** Un **Máx.** de `'{{self.values.capacity}}'` impide que la carga muestre nunca más que ella, pero nada impide llevar más: una carga de 12 muestra 8, y un estado _mientras la carga pase de la capacidad_ nunca se cumple. Deja la carga sin máximo y muéstrala frente a la capacidad con **Frente a**; para que no quepa más, da a la hoja ese **Sitio en total** (o ese sitio a un lugar) con **Más de lo que cabe** `refuse` ([límites a lo que se lleva](08-items.md#limites-a-lo-que-se-lleva)). Con **Se muestra como** `levels`, necesita sus **Niveles**.
- **Niveles desplazados en uno.** El primer nivel es el **Mín.**: con Mín. `1`, `d4, d6, d8` hace del 1 un d4. Sin Mín., es el 0.
- **Los heridos siguen contando.** `max: survival` cuenta a todos; para dejar fuera a algunos, añade `unless: { conditions: wounded }`, y `none` para cuando no queda nadie (si no, 0).
- **Un valor que baja de cero.** Sin **Mín.**, los efectos llevan un valor por debajo de 0. Dale los límites que tenga tu juego, o ninguno cuando de verdad no tiene.
- **Personajes de otro sistema.** Un viaje toma personajes hechos con las hojas de su sistema: el **Del plantel** del grupo enseña los de la hoja de sus personajes (y, en la ficha de **El grupo**, los grupos del plantel con su hoja de grupo), y el de **Aquí** los de la hoja de sus personajes y de sus plantillas (criaturas, PNJ); un personaje de otro sistema se queda en el plantel.

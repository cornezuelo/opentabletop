# Objetos

La pestaña **Objetos** edita los **catálogos de objetos** del sistema (`kind: items`): lo que pueden llevar sus personajes, para elegirlo por su nombre en la tarjeta de un personaje. Lo que tiene todo objeto en el sistema (huecos, peso, usos…) y dónde va en un cuerpo lo dice la hoja, en su sección **Objetos** ([Hoja](07-sheet.md#objetos)). Esta página explica cómo funcionan los objetos, luego la pestaña, monta un pequeño equipo paso a paso y repasa los errores habituales.

## Cómo funcionan los objetos

Un personaje **tiene objetos**, cada uno con **cuántos** (una cantidad) y, si la hoja da campos a los objetos, un número para cada uno (los 3 usos de una antorcha, los 2 huecos de una cota de malla). Nada de ellos viene dado: qué significan sus números, qué ocupa un lugar y qué pasa al pasarse de un límite lo decide el sistema.

- **De un catálogo o a mano.** En la tarjeta de un personaje, **Añadir un objeto** sugiere los objetos de los catálogos por su nombre; cualquier otro nombre crea un objeto a mano, con los valores por defecto de la hoja. Un objeto sacado de un catálogo guarda una copia de lo que tenía allí (sus etiquetas, sus números), así que el personaje se lee igual sean cuales sean los packs cargados.
- **Campos, que declara la hoja.** Los **Campos de todo objeto** de la hoja son números como los valores, con límites (o **Escalones**, el dado propio de cada objeto) y con cómo se muestran. Un campo que **Se gasta** (los usos de una antorcha) acaba con uno de esos objetos al llegar a su mínimo: la cantidad baja y el siguiente empieza de nuevo en su número; el último desaparece. Uno que no se gasta se queda vacío (un farol sin aceite).
- **Lugares, para cualquier cuerpo.** La hoja puede declarar **lugares** (manos, cuerpo, cinturón, espalda; las tres cabezas de una bestia de tres cabezas), cada uno con **etiquetas** y **sitio**. Un objeto dice dónde **Cabe** por las etiquetas del lugar (`place.tags: worn` para una cota de malla), nunca por su nombre, así que el mismo catálogo vale para cualquier cuerpo. En la tarjeta, un objeto se mueve arrastrando su asa (⠿) a un lugar, o eligiendo el lugar; solo se ofrecen los lugares donde cabe (mantén Mayús al soltarlo para mover solo uno de un montón). Sin lugares, los objetos son una sola lista.
- **Las capacidades también son objetos.** Un talento, una maña o un nivel de una Maestría es una entrada de un catálogo con su etiqueta (`ability`), que solo cabe en un lugar de la hoja que las **Acepta** y que no **Se carga**, mostrado como cartas. Tenerla hace lo que digan los valores hechos de ella (`from: { count: items, where: { item.id: tough } }`: _Duro_ de Core suma uno a la salud máxima), y una acción puede estar disponible solo mientras se tiene (`when: { acting.items.tags: shieldwall }`). Los efectos las dan y las quitan como cualquier objeto (`acting.items.tough: 1`). Una que **se activa y se desactiva** tiene un campo propio (`active`, 0 o 1, en los campos de objeto de la hoja sin valor por defecto, así que solo lo tienen los objetos a los que se da un número), que pone un efecto (`acting.items.night-eyes.active: '=1'`) y que lee un valor hecho de ella mientras está activa (`where: { item.id: night-eyes, item.active: 1 }`): los _Ojos de la noche_ de las Marcas Grises.
- **Contenedores.** Un objeto que **Guarda** algo es también un lugar (una mochila, unas alforjas): los objetos entran en él si caben por sus etiquetas, y van con él (soltar la mochila suelta lo que lleva dentro).
- **El sitio** se cuenta con el campo que la hoja nombra en **Lo que ocupa un lugar** (huecos × cuántos), o uno por objeto. Por defecto, un lugar que se pasa de su sitio solo muestra su cuenta en rojo, y el sistema dice qué significa, con un estado (abajo). Una hoja (o un lugar, o un contenedor) cuyo **Más de lo que cabe** es `refuse` no admite nada que no tenga sitio: la tarjeta no ofrece lugares llenos y se rechaza moverlo ahí; lo que dé un efecto va al primer lugar donde quepa con sitio (luego a un contenedor con sitio, luego a un lugar que admita más). El **Sitio en total** de una hoja cuenta todo lo que lleva un personaje. Lo que siga sin sitio se queda atrás, o espera en la tarjeta al jugador, según diga **Si no cabe**. Más abajo, [Límites a lo que se lleva](#limites-a-lo-que-se-lleva).
- **Lo que hace tenerlo** se escribe con las piezas que ya tienen las hojas y las reglas: un valor que **Sale de** los objetos (`{ sum: items.slots }`: la carga; `{ max: items.armour, where: { place.tags: worn } }`: la armadura puesta), un estado que **Se cumple mientras** la carga pase de la capacidad (bloquea lo que diga), un dato del grupo que cuenta quién lleva cuerda (`from: { count: true, when: { items.tags: climbing } }`), una tabla que lo lee (`'1d6 + {{min(party.stats.roped, 1)}}'`).
- **Los efectos los dan y los quitan**, por el id del objeto: `acting.items.torch: -1` (uno menos, empezando por los últimos), `party.members.items.torch.uses: -1` (una hora de la antorcha de cada uno), `acting.items.sword-of-keld: 1` (uno más; del catálogo si el personaje no tiene ninguno). Un campo de un objeto que el personaje no tiene no cambia nada; un objeto que no está en ningún catálogo no se puede dar, y el diario lo dice.
- **Sin identificar.** Un objeto puede encontrarse sin que nadie sepa qué es (una poción, un anillo, una llave): el **Sin identificar como** de su entrada es lo que se lleva (_Un frasco tapado_), lo que enseña la tarjeta, cuenta el diario y nombra su **Usar**, con su propio nombre, descripción y etiquetas ocultos. Un efecto lo da así (`acting.items.cordial.unknown: 1`, o `party.items.cordial.unknown: 1` a quien lleve cosas en el grupo); se guarda aparte de los conocidos, y se **identifica** con un efecto (`acting.items.cordial.known: 1`: uno de ellos, desde entonces el objeto que es, juntándose con uno conocido en el mismo lugar), con su **Usar**, o a mano en la tarjeta (su botón **?**). Las tablas leen cuántos se llevan sin identificar (`acting.items.cordial.unknown`) y cuántos conocidos (`….known`); `….count` cuenta los dos, así que una acción solo para uno conocido lee `.known`. Si un efecto los quita (`acting.items.cordial: -1`), van primero los conocidos.
- **Usarlo.** El **Usar** de una entrada nombra una de las acciones del sistema (`actions.drink`): en la tarjeta de un personaje durante un viaje, el objeto tiene un botón **Usar** que la hace, actuando el personaje y con el objeto leído en sus pasos como `params.item` (su clave), así que la acción lo gasta (`acting.items[params.item]: -1`) y hace lo que haga; una acción sirve a varios objetos. Si se usa sin identificar, primero se identifica, y el diario dice qué era. En gris, dice por qué no se puede hacer la acción ahora; la acción misma no tiene botón propio.
- **Las tablas y condiciones los leen**: `characters.kael.items.torch.count` (cuántos), `acting.items.torch.uses` (los del primero), `acting.items.tags: light` (lleva algo con la etiqueta light), `acting.places.pack.used` y `.room`, `acting.carried.used` (todo, frente al **Sitio en total**). Todos: [Qué ven las tablas](../technical/04-what-tables-see.md#personajes).

## La pestaña

Un catálogo cada vez; con varios, una fila de botones elige. **Nuevo catálogo** crea uno pequeño (una cuerda y una antorcha) y lo añade al **Resumen** del sistema (`items:`, una lista). Un catálogo tiene:

- Su **Nombre** (_Equipo_, _Armas_).
- Sus **Objetos**, cada uno con un id (con el que lo nombran los efectos y las tablas), con su **Nombre**, **Descripción**, **Etiquetas**, una casilla por cada campo que la hoja da a los objetos (vacía: el valor por defecto del campo), dónde **Cabe** (una [condición](../technical/08-conditions.md) sobre el lugar: `place.tags` · **es** · `head`), lo que se lleva mientras nadie sabe qué es (**Sin identificar como** y **Sin identificar, descrito**), la acción que hace su **Usar** (una del sistema) y, si es un contenedor, qué **Guarda** (su sitio) y **Guarda como** (sus etiquetas como lugar).

Un campo puede ser un dado que sube y baja de escalón, como un valor ([Hoja](07-sheet.md)): **Escalones** `4, 6, 8` y **Se muestra como** `die` dan a cada objeto su propio dado (el desgaste de una armadura, d8, d6, d4), que baja con `acting.items.mail.wear: -1`. Dos del mismo objeto se distinguen por su **clave** (`mail`, luego `mail-2`), así que se puede leer y cambiar uno solo (`acting.items.mail-2.wear`), y una acción puede tirar una vez por cada objeto de un lugar (`each:`, [Acciones y pasos](../technical/10-actions-and-steps.md#otras-acciones-y-comprobaciones-do-y-roll); _Revisar la malla_ de las Marcas Grises).

Un campo que da un catálogo y que la hoja no declara es un aviso entre los problemas del sistema. El YAML: [Catálogos de objetos](../technical/07-kinds.md#catalogos-de-objetos).

## Paso a paso: el equipo de un explorador

Un explorador con dos manos, un cuerpo y una mochila de seis huecos; una cota de malla que solo sirve puesta; antorchas que se consumen; y una carga que, por encima de la capacidad, impide las marchas forzadas. Empieza desde un sistema con hoja de personajes (el paso a paso de la página [Hoja](07-sheet.md), o cualquiera).

1. **Lo que tiene todo objeto**: en **Hoja → Objetos**, en **Campos de todo objeto**, añade `slots` (_Huecos_, **Empieza en** `1`, **Mín.** `0`) y `uses` (_Usos_, **Mín.** `0`, **Máx.** `3`, **Se muestra como** `pips`, con **Se gasta** marcado). En **Lugares**, `hands` (etiquetas `hand`, sitio `2`), `body` (etiquetas `worn`, sitio `1`) y `pack` (etiquetas `pack`, sitio `6`). **Lo que ocupa un lugar**: `slots`.
2. **La carga**: en **Valores**, `load` que **Sale de** `{ sum: items.slots }`, y `capacity` que **Sale de** `'{{self.values.toughness * 2}}'` (o cualquier valor tuyo).
3. **Al pasarse**: en **Estados**, `encumbered`, **Se cumple mientras** `self.values.load` · **es más de** · `{{self.values.capacity}}`, **Bloquea** `actions.forced-march` (una acción de tus reglas).
4. **El catálogo**: en **Objetos**, **Nuevo catálogo**. Deja la cuerda; da a la antorcha **Usos** `3`; añade `mail` (_Cota de malla_, **Huecos** `2`, **Cabe en** `place.tags` · **es** · `worn`).
5. **Nómbralo en las reglas**: una acción `light` (en [Reglas](05-rules.md)) con un paso que **Cambia** `acting.items.torch.uses` · `-1`.
6. **Pruébalo**: en **Pruébalo**, añade un personaje, abre su tarjeta y **Añadir un objeto**: _Cuerda_, _Antorcha_ y _Cota de malla_ tres veces.

**Lo que verás.** La sección **Objetos** de la tarjeta tiene un recuadro por lugar: **Manos 2 / 2** (la cuerda y la antorcha), y **Cuerpo 6 / 1** en rojo: las cotas de malla solo caben ahí, una fila con **Cuántos** `3`. **Carga** sale en gris, `8`; con Dureza 3, **Capacidad** `6`, y _Encumbered_ aparece marcado en cursiva, por sí solo: **Marcha forzada** sale en gris con él como motivo. Pon **Cuántos** de las cotas a `1`: la carga baja a `4` y _Encumbered_ se va. Elige el personaje en **Actúa** y usa **light** tres veces: los puntos de la antorcha se vacían, y a la tercera el diario dice _Kael: Antorcha: se gasta uno_ y desaparece.

## Lo mismo en YAML

```yaml
# sheet.yaml: los objetos de la hoja (un extracto: sus otros valores y estados siguen)
kind: sheet
id: delver
values:
  toughness: { default: 3 }
  load: { name: Load, from: { sum: items.slots } } # paso 2
  capacity: { name: Capacity, from: '{{self.values.toughness * 2}}' }
conditions: # paso 3
  encumbered:
    name: Encumbered
    when: { self.values.load: { gt: '{{self.values.capacity}}' } }
items: # paso 1
  fields:
    slots: { name: Slots, default: 1, min: 0 }
    uses: { name: Uses, min: 0, max: 3, display: pips, spent: true }
  places:
    hands: { name: Hands, tags: [hand], room: 2 }
    body: { name: Body, tags: [worn], room: 1 }
    pack: { name: Pack, tags: [pack], room: 6 }
  size: slots
---
# items.yaml: paso 4
kind: items
id: gear
name: Gear
items:
  rope: { name: Rope, tags: [climbing] }
  torch: { name: Torch, uses: 3, tags: [light] }
  mail: { name: Mail shirt, slots: 2, fits: { place.tags: worn } }
```

Y el sistema nombra el catálogo (`items: [items.gear]` en su `kind: system`).

Las Marcas Grises llevan equipo en cuatro lugares del cuerpo (una cuerda que ayuda en el vado, antorchas que arden en las marchas nocturnas, una mochila, una cota de malla, la Espada de Keld de un tesoro, el cordial de las brujas hallado como _Un frasco tapado_, que se prueba o se bebe): su [página](../bundled/02-grey-marches.md). El catálogo de Core es el más pequeño: unos pocos objetos y un campo, el dado de desgaste de un escudo, y una poción extraña que cura al beberla ([Core](../bundled/01-core.md)).

## Un objeto sin identificar, usado

Una poción hallada sin identificar, que se conoce con un sorbo con cuidado o bebiéndosela. Su entrada, y la acción que hace su **Usar**:

```yaml
# items.yaml: un extracto (los demás objetos del catálogo siguen)
kind: items
id: gear
items:
  draught:
    name: Poción curativa
    description: Al beberla, 2 de salud.
    unknown: { name: Un frasco turbio, description: ¿Quién sabe qué hace? }
    use: actions.drink
---
# travel.yaml: un extracto (… su viaje, sus terrenos y sus demás acciones siguen)
kind: travel-rules
id: default
actions:
  drink: # sin botón: la hace el Usar de la poción
    name: Bebérsela
    do:
      - { effects: { acting.values.health: 2, 'acting.items[params.item]': -1 } }
  sip:
    name: Un sorbo con cuidado
    when: { party.items.draught.unknown: { gte: 1 } } # alguien lleva una sin identificar
    needs: { acting.items.draught.unknown: { gte: 1 } } # y es quien actúa
    do:
      - { time: 10 }
      - { effects: { acting.items.draught.known: 1 } }
```

Una tabla la da así (`effects: { acting.items.draught.unknown: 1 }`). En la tarjeta es _Un frasco turbio_, en cursiva; **Usar** se la bebe: el diario dice _Kael: Un frasco turbio resulta ser Poción curativa_, y luego la salud que dio. _Probar un frasco_ de las Marcas Grises hace del sorbo una tirada (una tabla cuyo resultado lo identifica).

## Límites a lo que se lleva

Los juegos limitan lo que lleva un personaje de cuatro maneras, y cada una se escribe con lo que ya tienen las hojas (números inventados: los de cada juego son suyos):

- **Un total estricto**: tanto en total, y ni una cosa más. El **Sitio en total** de la hoja (`room: '{{self.values.capacity}}'`) con **Más de lo que cabe** `refuse`: todo cuenta, también lo de dentro de los contenedores, y no entra nada pasado ese sitio.
- **Estricto por lugar**: las manos sostienen dos cosas, un cinturón una. El **Sitio** de cada lugar con **Más de lo que cabe** `refuse`.
- **Blando, con un precio**: se puede llevar de todo, pero más lento. Una carga que **Sale de** los objetos, sin **Máx.**, **Frente a** la capacidad, y un estado que **Se cumple mientras** se pase (`self.values.load: { gt: '{{self.values.capacity}}' }`) y **Bloquea** lo que cuesta.
- **Los dos**: más lento pasada una línea, parado en otra. El estado del límite blando, y un **Sitio en total** mayor (`'{{self.values.capacity * 2}}'`).

Lo que da un efecto donde algo no admite más entra hasta donde quepa (lugar tras lugar); **Si no cabe** dice qué pasa con el resto: **leave** (por defecto) lo deja atrás, y lo dice el diario (_no queda sitio para 2, se queda atrás_); **ask** lo deja en la tarjeta del personaje, marcado en ningún lugar, y el viaje espera hasta que el jugador suelte algo o lo mueva a un lugar. Una tarjeta nunca añade a mano lo que no tiene sitio. Lo que gana el grupo va primero a quien tenga sitio para ello.

El último, con todas sus piezas:

```yaml
# sheet.yaml: un extracto (la hoja de un soldado; sus otros valores siguen)
kind: sheet
id: soldier
values:
  strength: { name: Strength, default: 4 }
  # El doble de la Fuerza, más lo que lleva puesto que ayuda a cargar (un correaje).
  capacity: { name: Capacity, from: '{{self.values.strength * 2 + self.values.carry}}' }
  carry: { from: { sum: items.carry, where: { place.tags: worn } } }
  load:
    name: Load
    from: { sum: items.weight }
    of: '{{self.values.capacity}}'
    display: bar
    tones: { 0: good, 101%: warning, 200%: danger }
conditions:
  encumbered:
    name: Encumbered
    when: { self.values.load: { gt: '{{self.values.capacity}}' } }
    blocks: [actions.sprint]
items:
  fields:
    weight: { name: Weight, default: 1, min: 0 }
    carry: { name: Helps to carry, default: 0, min: 0 }
  places:
    worn: { name: Worn, tags: [worn], room: 2 }
  size: weight
  # Hasta el doble de la capacidad en total, nunca más.
  room: '{{self.values.capacity * 2}}'
  over: refuse
  # Lo que se encuentre pasado ese sitio espera a que el jugador suelte algo.
  full: ask
```

Por encima de la capacidad el soldado va _Encumbered_ (no puede esprintar) y la barra se pone ámbar; al doble, la barra está en rojo y no entra nada más: la tarjeta no añade nada más, y lo que dé una tabla espera en la tarjeta, y el viaje con ello, hasta que se suelte algo. Las tablas lo leen como `acting.carried.used` y `acting.carried.room`. Un vehículo o un animal de carga es un contenedor con su propio sitio (`holds: { room: 40, tags: [cargo] }`), o `over: allow` donde se pueda atiborrar (lo de dentro sigue contando en el total).

## Errores habituales

- **Un objeto que no va donde quieres.** Su **Cabe en** lee las etiquetas del lugar: `place.tags: worn` necesita un lugar con la etiqueta `worn`. Un lugar llamado `body` sin etiquetas solo admite objetos sin **Cabe en**.
- **Un campo que no se ve en ningún sitio.** Un objeto solo muestra los campos que tiene: dale un número en el catálogo, o dale al campo un **Empieza en** en la hoja.
- **Una antorcha que nunca se acaba.** **Se gasta** necesita un **Mín.** (se gasta al llegar a él).
- **Un lugar siempre pasado de sitio.** **Lo que ocupa un lugar** cuenta ese campo × la cantidad: un campo sin valor por defecto cuenta 0, y sin él cada objeto cuenta 1.
- **Un efecto sobre `items.torch` que no da nada.** Dar un objeto necesita un catálogo del sistema con ese id; el diario dice _ningún catálogo del sistema tiene este objeto_. Tómalo de la lista del catálogo, o nombra el catálogo en el **Resumen**.
- **Esperar que el motor impida llenar de más una mochila.** El sitio solo se muestra, salvo que la hoja (o el lugar, o el contenedor) diga **Más de lo que cabe** `refuse`; si no, di qué significa pasarse con un estado que **Se cumple mientras** (`self.places.pack.used: { gt: 6 }`) y lo que **Bloquea**.
- **Equipo que se queda atrás, o un viaje que no sigue.** Con `refuse`, lo que dé un efecto sin sitio en ningún lugar donde quepa se queda atrás o (**Si no cabe** `ask`) espera en la tarjeta, marcado, y el viaje espera con ello: suelta algo o muévelo a un lugar; o deja que un contenedor admita más (`holds: { …, over: allow }`). Un contenedor copiado de un catálogo a un personaje conserva lo que decía entonces: suéltalo y vuelve a añadirlo del catálogo.
- **Un Sitio en total que no admite nada.** Lee los valores de la hoja tal como están (`'{{self.values.capacity}}'`): una capacidad que sale de otros se calcula antes, pero una a 0 no da sitio. Sin **Lo que ocupa un lugar**, cada objeto cuenta uno.
- **Un montón que no se mueve.** Un montón entero necesita sitio para todo él: mantén Mayús al soltarlo para moverlos de uno en uno.
- **Un botón Usar que nunca sale.** Está en la tarjeta de un personaje durante un viaje, para una entrada cuyo **Usar** nombra una acción que tiene el sistema (si no, un aviso entre sus problemas); en la aplicación Personajes no hay viaje en el que hacerla.
- **Una tabla que delata qué es un objeto.** Mientras se lleva sin identificar, di en el texto del resultado qué aspecto tiene (_Un frasco tapado_), nunca qué es, y lee `.known` para lo que solo permite uno conocido.
- **`tags` como id de un objeto.** `items.tags` lee todas las etiquetas de todos los objetos: ningún objeto puede llamarse `tags`.

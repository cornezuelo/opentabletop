# Objetos

La pestaña **Objetos** edita los **catálogos de objetos** del sistema (`kind: items`): lo que pueden llevar sus personajes, para elegirlo por su nombre en la tarjeta de un personaje. Lo que tiene todo objeto en el sistema (huecos, peso, usos…) y dónde va en un cuerpo lo dice la hoja, en su sección **Objetos** ([Hoja](07-sheet.md#objetos)). Esta página explica cómo funcionan los objetos, luego la pestaña, monta un pequeño equipo paso a paso y repasa los errores habituales.

## Cómo funcionan los objetos

Un personaje **tiene objetos**, cada uno con **cuántos** (una cantidad) y, si la hoja da campos a los objetos, un número para cada uno (los 3 usos de una antorcha, los 2 huecos de una cota de malla). Nada de ellos viene dado: qué significan sus números, qué ocupa un lugar y qué pasa al pasarse de un límite lo decide el sistema.

- **De un catálogo o a mano.** En la tarjeta de un personaje, **Añadir un objeto** sugiere los objetos de los catálogos por su nombre; cualquier otro nombre crea un objeto a mano, con los valores por defecto de la hoja. Un objeto sacado de un catálogo guarda una copia de lo que tenía allí (sus etiquetas, sus números), así que el personaje se lee igual sean cuales sean los packs cargados.
- **Campos, que declara la hoja.** Los **Campos de todo objeto** de la hoja son números como los valores, con límites y con cómo se muestran. Un campo que **Se gasta** (los usos de una antorcha) acaba con uno de esos objetos al llegar a su mínimo: la cantidad baja y el siguiente empieza de nuevo en su número; el último desaparece. Uno que no se gasta se queda vacío (un farol sin aceite).
- **Lugares, para cualquier cuerpo.** La hoja puede declarar **lugares** (manos, cuerpo, cinturón, espalda; las tres cabezas de una bestia de tres cabezas), cada uno con **etiquetas** y **sitio**. Un objeto dice dónde **Cabe** por las etiquetas del lugar (`place.tags: worn` para una cota de malla), nunca por su nombre, así que el mismo catálogo vale para cualquier cuerpo. Al mover un objeto solo se ofrecen los lugares donde cabe. Sin lugares, los objetos son una sola lista.
- **Contenedores.** Un objeto que **Guarda** algo es también un lugar (una mochila, unas alforjas): los objetos entran en él si caben por sus etiquetas, y van con él (soltar la mochila suelta lo que lleva dentro).
- **El sitio** se cuenta con el campo que la hoja nombra en **Lo que ocupa un lugar** (huecos × cuántos), o uno por objeto. Un lugar que se pasa de su sitio muestra su cuenta en rojo; el motor no lo impide: el sistema dice qué significa, con un estado (abajo).
- **Lo que hace tenerlo** se escribe con las piezas que ya tienen las hojas y las reglas: un valor que **Sale de** los objetos (`{ sum: items.slots }`: la carga; `{ max: items.armour, where: { place.tags: worn } }`: la armadura puesta), un estado que **Se cumple mientras** la carga pase de la capacidad (bloquea lo que diga), un dato del grupo que cuenta quién lleva cuerda (`from: { count: true, when: { items.tags: climbing } }`), una tabla que lo lee (`'1d6 + {{min(party.stats.roped, 1)}}'`).
- **Los efectos los dan y los quitan**, por el id del objeto: `acting.items.torch: -1` (uno menos, empezando por los últimos), `party.members.items.torch.uses: -1` (una hora de la antorcha de cada uno), `acting.items.sword-of-keld: 1` (uno más; del catálogo si el personaje no tiene ninguno). Un campo de un objeto que el personaje no tiene no cambia nada; un objeto que no está en ningún catálogo no se puede dar, y el diario lo dice.
- **Las tablas y condiciones los leen**: `characters.kael.items.torch.count` (cuántos), `acting.items.torch.uses` (los del primero), `acting.items.tags: light` (lleva algo con la etiqueta light), `acting.places.pack.used` y `.room`. Todos: [Qué ven las tablas](../technical/04-what-tables-see.md#personajes).

## La pestaña

Un catálogo cada vez; con varios, una fila de botones elige. **Nuevo catálogo** crea uno pequeño (una cuerda y una antorcha) y lo añade al **Resumen** del sistema (`items:`, una lista). Un catálogo tiene:

- Su **Nombre** (_Equipo_, _Armas_).
- Sus **Objetos**, cada uno con un id (con el que lo nombran los efectos y las tablas), con su **Nombre**, **Descripción**, **Etiquetas**, una casilla por cada campo que la hoja da a los objetos (vacía: el valor por defecto del campo), dónde **Cabe** (una [condición](../technical/08-conditions.md) sobre el lugar: `place.tags` · **es** · `head`) y, si es un contenedor, qué **Guarda** (su sitio) y **Guarda como** (sus etiquetas como lugar).

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

Las Marcas Grises llevan equipo en cuatro lugares del cuerpo (una cuerda que ayuda en el vado, antorchas que arden en las marchas nocturnas, una mochila, una cota de malla, la Espada de Keld de un tesoro): su [página](../packs/02-grey-marches.md). El catálogo de Core es el más pequeño: tres objetos y ningún campo ([Core](../packs/01-core.md)).

## Errores habituales

- **Un objeto que no va donde quieres.** Su **Cabe en** lee las etiquetas del lugar: `place.tags: worn` necesita un lugar con la etiqueta `worn`. Un lugar llamado `body` sin etiquetas solo admite objetos sin **Cabe en**.
- **Un campo que no se ve en ningún sitio.** Un objeto solo muestra los campos que tiene: dale un número en el catálogo, o dale al campo un **Empieza en** en la hoja.
- **Una antorcha que nunca se acaba.** **Se gasta** necesita un **Mín.** (se gasta al llegar a él).
- **Un lugar siempre pasado de sitio.** **Lo que ocupa un lugar** cuenta ese campo × la cantidad: un campo sin valor por defecto cuenta 0, y sin él cada objeto cuenta 1.
- **Un efecto sobre `items.torch` que no da nada.** Dar un objeto necesita un catálogo del sistema con ese id; el diario dice _ningún catálogo del sistema tiene este objeto_. Tómalo de la lista del catálogo, o nombra el catálogo en el **Resumen**.
- **Esperar que el motor impida llenar de más una mochila.** El sitio se muestra, no se impone: di qué significa pasarse con un estado que **Se cumple mientras** (`self.places.pack.used: { gt: 6 }`) y lo que **Bloquea**.
- **`tags` como id de un objeto.** `items.tags` lee todas las etiquetas de todos los objetos: ningún objeto puede llamarse `tags`.

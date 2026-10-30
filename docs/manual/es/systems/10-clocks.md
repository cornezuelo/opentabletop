# Relojes

La pestaña **Relojes** edita los relojes de progreso con los que empieza el mundo del sistema (`kind: clocks`, uno por sistema): una amenaza que se acerca, un plan que va tomando forma, una temporada de saqueos. **Nuevos relojes** hace uno que vuelve a empezar al llenarse, y lo nombra en el sistema; lo que pasa cuando uno se llena es cosa del mundo: su **Al llenarse** abre la pestaña [Mundo](11-world.md). En Mapa llegan con el reloj del mundo cuando se pone en marcha ([Relojes de progreso](../map/12-world.md#relojes-de-progreso)), y el app Campaña muestra los mismos. Esta página explica cómo funcionan los relojes, luego cada parte de la pestaña, monta una fiebre que se extiende desde cero paso a paso y repasa los errores habituales. La ayuda junto a cada campo lo explica, con ejemplos. El YAML: [Relojes de progreso](../technical/07-kinds.md#relojes-de-progreso).

## Cómo funcionan los relojes

Un reloj de progreso es una esfera de **segmentos** (4, 6, 8, cualquier número desde 1) que se llenan uno a uno según algo avanza. Mientras se llena no hace nada; lo que importa es **qué pasa cuando se llena**.

- **Viven en el reloj del mundo.** El sistema dice con qué relojes **empieza** su mundo, y cuánto llenos; llegan cuando se pone en marcha el reloj del mundo (o con **Añadir los relojes del sistema**, para uno declarado después). A partir de ahí los guarda la campaña: cambiar el sistema no mueve un reloj que ya está. Sin el reloj del mundo en marcha no hay relojes: un viaje se juega, pero nada se llena.
- **Los llena cualquier cosa con efectos**, allí donde van los efectos: una comprobación de un viaje o el resultado de una tabla (`world.clocks.the-fever: 1`), un paso de una acción, una tabla tirada a mano en el mapa, la tabla de turno de una facción, otro reloj que se llena. `-1` vacía un segmento, `'=0'` lo vacía entero. Y a mano: un clic en un segmento en el panel Mundo.
- **Cuando se llena**, una vez, el mundo reacciona: las [reglas del mundo](11-world.md) del sistema en `world.clocks.the-fever.full` hacen sus pasos, en orden: palabras para la cronología (y un aviso), una tabla tirada (su resultado también en la cronología), cambios en otros relojes y en las facciones (nunca en el grupo de un viaje: el mundo no tiene grupo). Después el reloj se queda lleno (`keep`, por defecto), vuelve a empezar vacío (`reset`) o desaparece (`remove`), según su **Después**. Una reacción que llena otro reloj puede hacerlo reaccionar también, en cadena (hasta diez seguidas).
- **El viaje lo oye.** Un reloj que se llena, se llene como se llene, es un momento que oye el viaje en marcha en la campaña, si sus reglas lo nombran: una acción con **Automática en** `world.clocks.the-fever.full`, o una comprobación con ese **Cuándo**. Su diario dice primero _En el mundo: se llenó La fiebre de las marismas_, y luego lo que hace el sistema. En el mismo app se oye al momento (o al acabar el paso que lo llenó); llenado en otro app, en el siguiente paso del viaje.
- **Todo los lee.** Las condiciones y las tablas, de un viaje o de una tirada a mano, leen cuánto está lleno un reloj por su id: `world.clocks.the-closed-roads: { gte: 2 }` (dos segmentos o más), `{{world.clocks.the-fever}}` en un texto. Un viaje lee los relojes como estaban al empezar su paso: lo que el paso llena se ve desde el siguiente.

![Un reloj de cuatro segmentos, uno lleno cuando se pone en marcha el reloj del mundo, y lo que lo llena: una comprobación de un viaje, un clic en el panel Mundo, el turno de una facción, otro reloj. Cuando se llena el cuarto segmento: la reacción del mundo dice su línea en la cronología, tira su tabla y mueve otro reloj, el viaje en marcha oye world.clocks.the-fever.full y pasa su acción; después keep, reset o remove.](clock-full.svg)

## La pestaña

- Su **Nombre**: cómo se llaman estos relojes en conjunto.
- Cada reloj, por su id (cómo lo leen las reglas: `world.clocks.<id>`, aunque el jugador le cambie el nombre en el mapa), con su **Nombre**, su **Descripción (su ayuda**, en la ayuda de su id en el panel Mundo), sus **Segmentos** y por dónde **Empieza en** (segmentos ya llenos cuando se pone en marcha el reloj del mundo; vacío, ninguno).
- **Después**, qué es de él una vez lleno: `keep` (vacío), `reset` o `remove`.
- **Al llenarse**: las reacciones del mundo a que se llene, por sus nombres (un clic abre la pestaña **Mundo**), y **Añadir qué pasa al llenarse**, que crea allí una reacción nueva a él (y las reglas del mundo del sistema, si no las tiene). Sin nada: un reloj que solo se llena, y que leen las reglas.

El **Usado en** de cada reloj lista lo que lo llena y lo que lo lee: tablas, acciones, comprobaciones, otro reloj ([Usado en](04-overview.md#usado-en)).

## Paso a paso: una fiebre que se extiende

Una fiebre ronda las marismas. Los viajeros que las cruzan la llevan consigo, y cada vez que llega a las aldeas los señores pierden la paciencia: la segunda vez, cierran los caminos. La noticia de la fiebre llega al grupo esté donde esté, y un camino cerrado lo hace volver en la barrera. Empieza con un sistema nuevo: nace como copia de las reglas genéricas, sin relojes.

1. **Créalo**: escribe _Las Marismas de la Fiebre_ bajo la lista de sistemas y pulsa **+**.
2. **La fiebre**: en **Relojes**, **Nuevos relojes**. Llámalos _Males de las marismas_. Cambia el reloj `the-threat-grows` a `the-fever`, con el nombre _La fiebre de las marismas_, **Segmentos** `4`, **Empieza en** `1`; **Después** se queda en `reset`.
3. **Los caminos**: añade un reloj `the-closed-roads`, con el nombre _Se cierran los caminos_, **Segmentos** `2`, **Después** vacío (`keep`: una vez cerrados, siguen cerrados).
4. **Al llenarse**: en la tarjeta de la fiebre, **Añadir qué pasa al llenarse**: se abre la pestaña **Mundo** con una reacción `the-fever-fills` **En** `world.clocks.the-fever.full`. Llámala _La fiebre se extiende_; sus **Pasos**: **Decir** _La fiebre llega a las aldeas._, luego **Añadir un paso**, **Tirar** `core/table.twists`, luego **Añadir un paso**, **Cambiar** `world.clocks.the-closed-roads` · `1`. De vuelta en **Relojes**, lo mismo en la tarjeta de los caminos: una reacción `the-closed-roads-fills`, con el nombre _Se cierran los caminos_, cuyo único paso **Dice** _Los señores cierran los caminos._
5. **Los viajeros la llevan**: en **Comprobaciones**, **Añadir una comprobación**, con **Comprobación** `FEVER` y el nombre _Fiebre_. **Cuándo** `trip.place-enter`; **Solo si** `place.terrain` · **es** · `swamp`; sin tabla; **Cambios** `world.clocks.the-fever` · `1`.
6. **La barrera**: **Añadir una comprobación**, con **Comprobación** `BARRIER` y el nombre _Vuelta atrás en la barrera_. **Cuándo** `trip.place-enter`; **Solo si** las filas `world.clocks.the-closed-roads` · **es al menos** · `2` y `trip.edges` · **es** · `road`; sin tabla; marca **Pausar después**.
7. **La noticia**: en **Reglas → Acciones**, **Añadir una acción** `news`, con el nombre _Noticias de la fiebre_ y **Automática en** `world.clocks.the-fever.full`. Su único paso: **Decir** _Llega la noticia: la fiebre ha alcanzado las aldeas._
8. **Un mapa**: en Mapa, **Nuevo mapa**; en **Ajustes del mapa → Campaña → Sistema**, _Las Marismas de la Fiebre_. Pinta una fila de hexes: uno de `plains`, tres de `swamp` y luego tres de `plains` con un `road` a lo largo.
9. **Juégalo**: abre el panel **Mundo** (☾) y **Poner en marcha el reloj del mundo**: su pestaña **Relojes** muestra _La fiebre de las marismas_ a 1/4 y _Se cierran los caminos_ a 0/2. En **Jugar**, pon al grupo en el primer hex de llanura, marca como destino la llanura tras las marismas y viaja hasta allí.
10. **A mano**: en la pestaña **Relojes** del panel **Mundo**, haz clic en el cuarto segmento de la fiebre. Luego marca como destino la última llanura y sigue viajando.

**Lo que verás.** Cada hex de marisma en el que se entra llena un segmento de la fiebre (el diario dice _Fiebre_, y el panel Mundo muestra el reloj un segmento más lleno). Las marismas son lentas: a pie un hex lleva más de un día de marcha. Al entrar en la tercera se llena: la cronología dice _La fiebre llega a las aldeas._ y el giro que tiró la tabla de Core, la fiebre vuelve a 0/4 y los caminos pasan a 1/2; al acabar el paso, el diario del viaje dice _En el mundo: se llenó La fiebre de las marismas_ y luego _Llega la noticia: la fiebre ha alcanzado las aldeas._ El camino de más allá sigue abierto. En el paso 10, tu clic llena la fiebre a mano: la cronología vuelve a tener sus líneas, los caminos se llenan (2/2) y dicen _Los señores cierran los caminos._, y el viaje oye la fiebre al momento, otra vez _Llega la noticia…_ en su diario. Al seguir viajando, el primer hex en el que se entra por el camino detiene el viaje: _Vuelta atrás en la barrera en …: esperando_, con el nombre del hex. Vaciar un segmento de los caminos (clic en el último lleno) los vuelve a abrir.

## Lo mismo en YAML

Los relojes y lo que hace el mundo cuando se llenan, como los muestra la pestaña **YAML**:

```yaml
# clocks.yaml
kind: clocks
id: default # paso 2
name: Males de las marismas
clocks:
  the-fever:
    name: La fiebre de las marismas
    segments: 4
    filled: 1
    then: reset
  the-closed-roads: # paso 3
    name: Se cierran los caminos
    segments: 2
```

```yaml
# world.yaml (paso 4)
kind: world
id: default
reactions:
  the-fever-fills:
    name: La fiebre se extiende
    on: world.clocks.the-fever.full
    do:
      - say: La fiebre llega a las aldeas.
      - roll: core/table.twists
      - effects: { world.clocks.the-closed-roads: 1 }
  the-closed-roads-fills:
    name: Se cierran los caminos
    on: world.clocks.the-closed-roads.full
    do:
      - say: Los señores cierran los caminos.
```

Lo que los otros pasos añaden al sistema y a las reglas genéricas (un extracto: lo demás queda como estaba):

```yaml
# system.yaml (kind: system), nombrado por los pasos 2 y 4
clocks: clocks.default
world: world.default
---
# travel.yaml: las reglas (kind: travel-rules)
checks:
  - event: FEVER # paso 5
    name: Fiebre
    at: trip.place-enter
    when: { place.terrain: swamp }
    effects: { world.clocks.the-fever: 1 }
  - event: BARRIER # paso 6
    name: Vuelta atrás en la barrera
    at: trip.place-enter
    when: { world.clocks.the-closed-roads: { gte: 2 }, trip.edges: road }
    pause: true
actions:
  news: # paso 7
    name: Noticias de la fiebre
    on: world.clocks.the-fever.full
    do:
      - { id: news, say: 'Llega la noticia: la fiebre ha alcanzado las aldeas.' }
# … el día, los terrenos, las formas de viajar, la comida y las acciones de las reglas genéricas
```

Las Marcas Grises juegan con todo esto y más (la Sierpe del Bosque Gris, que llenan las luces encantadas, cuyo despertar tira lo primero que hace y despierta el pavor de cada compañero; la marcha de los Clanes de Hierro, que llenan sus turnos del mundo, que acerca el motín de Fuerte Keld y vuelve a empezar; el motín, que pierde el fuerte, desaparece y hace caer Fuerte Keld): su [página](../packs/02-grey-marches.md) dice dónde.

## Errores habituales

- **Nada se llena.** Los relojes necesitan el reloj del mundo en marcha: sin él, el `world.clocks.the-fever: 1` de un viaje no cambia nada. **Poner en marcha el reloj del mundo** en el panel Mundo (o en el app Campaña).
- **Un reloj que no llega.** Los relojes del sistema llegan cuando se pone en marcha el reloj del mundo. Uno declarado después (o quitado en el mapa) vuelve con **Añadir los relojes del sistema** en la pestaña **Relojes** del panel Mundo.
- **Cambiado Empieza en, el mundo igual.** Por dónde empieza un reloj se lee una vez, cuando llega. Una campaña que ya lo tiene conserva lo que lleva: llénalo a mano.
- **Un id cambiado.** Las reglas leen un reloj por su id: cambiar `the-fever` deja `world.clocks.the-fever` sin nombrar nada, y la acción del viaje no pasa nunca. **Usado en** lista lo que lo nombra.
- **El viaje no lo oye.** Solo el viaje en marcha en la campaña oye un reloj llenarse, y solo los momentos que nombran sus reglas: `world.clocks.<id>.full`, con el id del reloj y `.full`. Los problemas del sistema avisan de un momento que nombra un reloj que no declara (un reloj hecho a mano en el mapa se nombra por su nombre en minúsculas con guiones, así que aún puede oírse).
- **Se llena y no pasa nada.** Lo que pasa es cosa del mundo: una reacción **En** `world.clocks.<id>.full` en la pestaña **Mundo** (el **Al llenarse** del reloj las lista), y el sistema nombra sus reglas del mundo (`world:`). Una reacción cuyo **Solo si** no se cumple en ese momento no hace nada.
- **Un reloj lleno que no vuelve a llenarse.** `reset` lo vacía; con `keep`, un reloj lleno se queda lleno, y llenarlo más no lo llena más: no vuelve a llenarse. Para que pase cada vez, usa `reset`.
- **Cambios al grupo en una reacción.** El **Cambiar** de una reacción del mundo, y el de su tabla, cambian el mundo: otros relojes y las facciones. Un `party.…` ahí no cambia nada. Para el grupo, deja que el viaje lo oiga: una acción en `world.clocks.<id>.full` con **Cambiar valores**.
- **Una condición que llega un paso tarde.** Un viaje lee los relojes como estaban al empezar su paso: en el paso que cierra los caminos, la barrera aún no está; desde el siguiente, sí.
- **Comparar con el número equivocado.** `world.clocks.<id>` es cuántos segmentos están llenos, no si está lleno: `{ gte: 2 }` en un reloj de 2 segmentos es lleno. Un reloj que hace `reset` nunca lo ven lleno las condiciones, solo lo oyen llenarse.

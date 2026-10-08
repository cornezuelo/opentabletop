# El reloj del mundo

El panel **Mundo** (☾ en la barra de herramientas, bajo Jugar) lleva la fecha de la campaña de este mapa: el tiempo avanza, los eventos programados llegan en su día y los relojes de progreso se llenan. Se guarda con el mapa (y en su `.otd.json`). Sus meses, lunas y fiestas salen del calendario del sistema del mapa (`kind: calendar` en su pack, mira [Tipos de definición](../technical/07-kinds.md#calendarios)); sin uno, días y cuatro estaciones.

## Ponerlo en marcha

**Poner en marcha el reloj del mundo** lo sitúa al alba del primer día o, durante un viaje, a la hora del viaje. Nombra el tiempo con el calendario del sistema con el que se juega el mapa (**Ajustes del mapa → Mapa → Sistema**; durante un viaje, el del viaje): las Marcas Grises muestran «Pozodía, 3 de Deshielo, año 412» con sus lunas y fiestas; las reglas genéricas cuentan días y estaciones.

**Parar el reloj del mundo** lo olvida (pregunta antes).

## Avanzar el tiempo

**+1 hora**, **+1 guardia**, **Hasta el anochecer**, **Hasta el alba**, **Día siguiente** y **Próximo evento**. Lo que llega por el camino se anota en la **cronología** (y, durante un viaje, en su diario): eventos, fiestas, lunas llenas y nuevas.

## Con un viaje en marcha

El mundo y un viaje con reglas comparten **un solo tiempo**. Los viajes nuevos empiezan en la fecha del reloj en lugar de en una estación, viajar y acampar mueven el reloj, y mover el reloj hace avanzar el viaje, viviendo cada momento como si lo jugaras:

- **Con una ruta planeada**, el grupo **sigue viajando** por ella: los botones quedan bajo **Seguir viajando**, y una nota debajo dice el hex hacia el que va (la ayuda de **Seguir viajando** explica qué hace entonces el paso del tiempo). Marcha de día (como hace **Viajar** en Jugar), hace la acción del sistema para la noche al anochecer, sigue marchando al alba y, cuando llega, espera allí el resto del tiempo. **+1 hora** a las 08:00 es una hora de marcha; **Día siguiente** es lo que queda de marcha hoy, la noche y el alba.
- **Sin ruta**, el grupo **espera donde está**: los botones quedan bajo **Esperar aquí**, y la nota de debajo dice el hex donde espera. Un grupo que espera come, pero no marcha.

En los dos casos:

- Al alba se tiran las comprobaciones del día (el clima, perderse…), como al ponerse en marcha.
- Al anochecer el grupo hace **la acción del sistema para la noche**, una vez por noche: acampar, salvo que el sistema nombre otra (`day.night` en sus reglas: mira [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)). Si no puede hacerla (la bloquea un valor del día o no se cumplen sus condiciones: las Marcas Grises solo acampan con comida), la noche pasa sin ella y el diario dice por qué: «Cae la noche y «Acampar» no es posible (…): la noche pasa sin ello.» Un sistema sin ninguna simplemente deja pasar la noche.
- Cada día que acaba hace las acciones de fin de día del sistema (comer, por ejemplo) y tira sus comprobaciones de fin de día (el hambre, por ejemplo).
- Un día en que el grupo no puede marchar (una tormenta, un valor que bloquea el viaje, como estar perdidos) es un día perdido, y el diario lo dice; al día siguiente sigue la marcha.

**Mover el tiempo a otro día pregunta antes**: «El grupo seguirá viajando hacia 0808 durante 1 día(s), marchando de día; cada noche: Acampar. ¿Seguir?» (o «esperará aquí»). Si dices que no, todo queda como estaba. Al esperar, el diario empieza con «Esperar aquí hasta el día 3, 06:00» y luego lo cuenta todo.

**Se detiene antes**, y el reloj con él, cuando algo te necesita, y **un mensaje abajo dice por qué**: una comprobación que hace pausa, con tabla o sin ella («“Encuentro” te necesita»: mira el diario, pulsa **Continuar** y vuelve a avanzar el reloj), un lugar encontrado por el camino (descubrimiento), un camino cortado del todo (elige otro destino). Llegar también se avisa: «El grupo ha llegado a su destino.»

Una acampada dura hasta el alba aunque pidieras menos: **+1 hora** a las 19:30 cruza el anochecer, así que el grupo acampa y el reloj acaba al alba.

Ejemplo con las Marcas Grises: pon en marcha el reloj, coloca al grupo en Ashford (0608) y haz clic en 0808 en Jugar para planear el camino; luego pulsa **Día siguiente**: pregunta, al alba se tiran el clima y perderse, el grupo marcha por el camino, acampa al anochecer (come la comida de un día, una noche bien comidos quita 1 de fatiga, se tira el encuentro nocturno donde el peligro es 2 o más) y el reloj acaba en el alba siguiente, un día más allá. Quita la ruta (clic en el hex del propio grupo) y **Día siguiente** espera en el sitio.

## Eventos

Cosas que pasan en una fecha, esté el grupo allí o no: una fiesta, un ataque, la llegada de un barco. Escribe qué pasa, **dentro de cuántos días** y **a qué hora**, y si pasa **una vez**, **cada N días** (un mercado semanal) o **cada año**. La lista muestra lo que viene, lo más próximo primero; ✕ cancela uno.

## Relojes de progreso

Un reloj es un número de segmentos que se llenan según algo avanza: una amenaza («La Sierpe despierta: 1/6»), un proyecto, el plan de una facción. Haz clic en un segmento para llenar hasta él, o en el último lleno para vaciarlo. Cuando un reloj se llena, la cronología lo dice. Cámbiale el nombre editándolo; ✕ lo quita.

## Cronología

Lo que ha pasado en el mundo, lo más reciente primero: eventos que llegaron, fiestas, lunas, relojes que se movieron y tus propias notas (escribe una y **Añadir**).

El mapa de ejemplo de las Marcas Grises viene con el reloj en marcha: un mercado cada semana, los Clanes de Hierro marchando sobre Fort Keld, las crecidas de primavera y dos relojes: la Sierpe del Bosque Gris y la guarnición sin paga de Fort Keld.

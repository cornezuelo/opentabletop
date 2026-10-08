# El reloj del mundo

El panel **Mundo** (☾ en la barra de herramientas, bajo Jugar) lleva la fecha de la campaña de este mapa: el tiempo avanza, los eventos programados llegan en su día y los relojes de progreso se llenan. Se guarda con el mapa (y en su `.otd.json`). Sus meses, lunas y fiestas salen del calendario del sistema del mapa (`kind: calendar` en su pack, mira [Tipos de definición](../technical/07-kinds.md#calendarios)); sin uno, días y cuatro estaciones.

## Ponerlo en marcha

**Poner en marcha el reloj del mundo** lo sitúa al alba del primer día o, durante un viaje, a la hora del viaje. Nombra el tiempo con el calendario del sistema con el que se juega el mapa (Jugar → Reglas): las Marcas Grises muestran «Pozodía, 3 de Deshielo, año 412» con sus lunas y fiestas; las reglas genéricas cuentan días y estaciones.

**Parar el reloj del mundo** lo olvida (pregunta antes).

## Avanzar el tiempo

**+1 hora**, **+1 guardia**, **Hasta el anochecer**, **Hasta el alba**, **Día siguiente** y **Próximo evento**. Lo que llega por el camino se anota en la **cronología** (y, durante un viaje, en su diario): eventos, fiestas, lunas llenas y nuevas.

## Con un viaje en marcha

El mundo y un viaje con reglas comparten **un solo tiempo**. Los viajes nuevos empiezan en la fecha del reloj en lugar de en una estación, viajar y acampar mueven el reloj, y mover el reloj es **esperar donde está el grupo**: cada momento de la espera se vive como si lo jugaras. El panel lo dice: sus botones quedan bajo **Esperar aquí**, con el hex donde espera el grupo. Una ruta planeada se conserva pero no se sigue (un grupo que espera come, pero no marcha): para marchar, pulsa **Viajar** en Jugar, y el reloj sigue al viaje.

- Al alba se tiran las comprobaciones del día (el clima, perderse…), como al ponerse en marcha.
- Al anochecer el grupo hace **la acción del sistema para la noche**, una vez por noche: acampar, salvo que el sistema nombre otra (`day.night` en sus reglas: mira [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)). Un sistema sin ninguna simplemente deja pasar la noche.
- Cada día que acaba hace las acciones de fin de día del sistema (comer, por ejemplo) y tira sus comprobaciones de fin de día (el hambre, por ejemplo).

El diario empieza con «Esperar aquí hasta el día 3, 06:00» y luego lo cuenta todo. La espera **se detiene antes**, y el reloj con ella, cuando algo te necesita: una comprobación sin tabla o que hace pausa (pulsa **Continuar** y vuelve a avanzar el reloj), o una noche en la que el grupo no puede hacer su acción para la noche (lo bloquea un valor del día o no se cumplen sus condiciones): «Cae la noche y «Acampar» no es posible (…): la espera se detiene aquí.» Un mensaje avisa de que se detuvo antes.

Una acampada dura hasta el alba aunque la espera pidiera menos: **+1 hora** a las 19:30 cruza el anochecer, así que el grupo acampa y el reloj acaba al alba. Una espera de más de un día pregunta antes, diciendo qué hace el grupo cada noche (la acción del sistema para la noche, o nada). Esperar nunca mueve al grupo, aunque haya una ruta planeada o el descubrimiento esté activo: se queda donde está hasta que vuelvas a viajar.

Ejemplo con las Marcas Grises: pon en marcha el reloj, coloca al grupo en Ashford y pulsa **Día siguiente**: al alba se tiran el clima y perderse, al anochecer el grupo acampa (come la comida de un día, una noche bien comidos quita 1 de fatiga, se tira el encuentro nocturno) y el reloj acaba en el alba siguiente.

## Eventos

Cosas que pasan en una fecha, esté el grupo allí o no: una fiesta, un ataque, la llegada de un barco. Escribe qué pasa, **dentro de cuántos días** y **a qué hora**, y si pasa **una vez**, **cada N días** (un mercado semanal) o **cada año**. La lista muestra lo que viene, lo más próximo primero; ✕ cancela uno.

## Relojes de progreso

Un reloj es un número de segmentos que se llenan según algo avanza: una amenaza («La Sierpe despierta: 1/6»), un proyecto, el plan de una facción. Haz clic en un segmento para llenar hasta él, o en el último lleno para vaciarlo. Cuando un reloj se llena, la cronología lo dice. Cámbiale el nombre editándolo; ✕ lo quita.

## Cronología

Lo que ha pasado en el mundo, lo más reciente primero: eventos que llegaron, fiestas, lunas, relojes que se movieron y tus propias notas (escribe una y **Añadir**).

El mapa de ejemplo de las Marcas Grises viene con el reloj en marcha: un mercado cada semana, los Clanes de Hierro marchando sobre Fort Keld, las crecidas de primavera y dos relojes: la Sierpe del Bosque Gris y la guarnición sin paga de Fort Keld.

# El reloj del mundo

El panel **Mundo** (☾ en la barra de herramientas, bajo Jugar) lleva la fecha de la campaña de este mapa: el tiempo avanza, los eventos programados llegan en su día y los relojes de progreso se llenan. Se guarda con el mapa (y en su `.otd.json`). Sus meses, lunas y fiestas salen del calendario del sistema del mapa (`kind: calendar` en su pack, mira [Tipos de definición](../technical/07-kinds.md#calendarios)); sin uno, días y cuatro estaciones.

## Ponerlo en marcha

**Empieza el** elige su fecha en los términos del calendario: el día del mes, el mes y el año, y la hora (con el calendario por defecto, el número de día y la hora); empieza al alba del primer día salvo que lo cambies. **Poner en marcha el reloj del mundo** lo sitúa ahí o, durante un viaje, a la hora del viaje (comparten el tiempo). Una fecha que el calendario no tiene (el 31 de un mes de 30 días, o antes de su primer día) se dice bajo las casillas. Nombra el tiempo con el calendario del sistema con el que se juega el mapa (**Ajustes del mapa → Mapa → Sistema**; durante un viaje, el del viaje): las Marcas Grises muestran «Pozodía, 3 de Deshielo, año 412» con sus lunas y fiestas; las reglas genéricas cuentan días y estaciones.

**Parar el reloj del mundo** lo olvida (pregunta antes).

## Fijar la fecha

**Fijar la fecha**, bajo la fecha, lleva el reloj al día y la hora que elijas:

- **Más tarde**: es avanzar el tiempo, igual que los botones de abajo (con un viaje en marcha el grupo viaja o espera hasta entonces, y pregunta antes de que pasen días); llegan los eventos, fiestas y lunas del camino.
- **Antes**: pregunta primero, y solo sin un viaje en marcha (el tiempo de un viaje nunca retrocede). No se deshace nada de lo que pasó: la cronología lo conserva y dice «El reloj volvió atrás (desde …)»; los eventos que se repiten no vuelven.

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

Cosas que pasan en una fecha, esté el grupo allí o no: una fiesta, un ataque, la llegada de un barco. Escribe qué pasa, su **Id**, una **descripción** si quieres, cuándo (**dentro de cuántos días** y **a qué hora**, o **en una fecha** del calendario), y si pasa **una vez**, **cada N días** (un mercado semanal) o **cada año**. La lista muestra lo que viene, lo más próximo primero, con el id y la descripción de cada uno; ✕ cancela uno.

El **Id** es cómo nombran al evento las condiciones y las tablas en su día: palabras en minúscula unidas por guiones (`market-day`, `clan-raid`), uno por evento. Si lo dejas vacío, es su nombre escrito así (**Market day** → `market-day`; si está ocupado se le añade un número).

## Relojes de progreso

Un reloj es un número de segmentos que se llenan según algo avanza: una amenaza («La Sierpe despierta: 1/6»), un proyecto, el plan de una facción. Haz clic en un segmento para llenar hasta él, o en el último lleno para vaciarlo. Cuando un reloj se llena, la cronología lo dice. Cámbiale el nombre editándolo; ✕ lo quita.

**Las tablas y las reglas de un sistema leen el mundo**: cada reloj por su nombre en minúsculas con guiones («The Wyrm wakes» es `world.clocks.the-wyrm-wakes`, sus segmentos llenos; `clocks.the-wyrm-wakes` en corto) y los eventos del día por su id (`world.events: market-day`, o `events`; sus nombres escritos como id también valen), en condiciones y en tiradas, a mano o del viaje: un encuentro que solo llega cuando una amenaza está cerca (`when: { world.clocks.the-wyrm-wakes: { gte: 4 } }`), una acción solo el día de mercado. La lista completa: [Qué ven las tablas](../technical/04-what-tables-see.md).

## Cronología

Lo que ha pasado en el mundo, lo más reciente primero: eventos que llegaron, fiestas, lunas, relojes que se movieron y tus propias notas (escribe una y **Añadir**).

El mapa de ejemplo de las Marcas Grises viene con el reloj en marcha: un mercado cada semana (`market-day`: ese día, en Ashford, **Día de mercado** da provisiones), los Clanes de Hierro marchando sobre Fort Keld (`clan-march`), las crecidas de primavera (`spring-floods`) y tres relojes: la Sierpe del Bosque Gris (cuando se llena, la Sierpe recorre el Bosque Gris), la guarnición sin paga de Fort Keld y la marcha de los Clanes de Hierro (la hacen avanzar sus turnos del mundo).

## Facciones

Cuando el sistema del mapa tiene facciones (los poderes de su mundo, `kind: factions` en su pack), la vista Mundo las lista en **Facciones**; **Traer sus facciones** las pone en un mapa que aún no las tiene, cada una con sus tierras iniciales (las regiones y hexes que nombra su pack). Cada una muestra su color y cuántos hexes tiene; ábrela para ver su hoja (sus valores, estados y relaciones, como los de un personaje: cámbialos a mano cuando lo diga la historia). Sus tierras se dibujan en el mapa en su color (la capa **Facciones**).

**Turno del mundo** hace que cada facción juegue su turno ahora, en orden: cada una tira su tabla de turno, y lo que sale la cambia a ella, a otra facción, sus tierras (un hex más desde su frontera, o uno menos) o un reloj de progreso; cada resultado va a la cronología («Los Clanes de Hierro: Unos saqueadores atacan las granjas apartadas del Valle»). Con **Turnos por sí solos, cada N días** marcado, los turnos llegan según avanza el reloj, a mano o con un viaje, cada tantos días como diga el sistema.

Las tablas y condiciones las leen en todas partes: `factions.the-vale.values.strength`, `hex.faction` (quién tiene el hex: la patrulla del Valle de las Marcas Grises recorre cualquier tierra que tenga el Valle). **Quitar las facciones del mapa** las olvida (tras preguntar). El mapa de ejemplo de las Marcas Grises trae a los Clanes de Hierro, el Valle de Ashford y la guarnición de Fort Keld, y el reloj _The Iron Clans march_ que sus turnos hacen avanzar. Cómo las declara un sistema: [Facciones](../technical/07-kinds.md#facciones).

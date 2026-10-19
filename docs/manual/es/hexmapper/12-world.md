# El reloj del mundo

El panel **Mundo** (☾ en la barra de herramientas, bajo Jugar) lleva la fecha de la campaña de este mapa: el tiempo avanza, los eventos programados llegan en su día y los relojes de progreso se llenan. Un mapa pertenece a una **campaña**, el mundo en el que se juega, que guarda el reloj del mundo, su clima, las facciones y el Oráculo; un mapa nuevo tiene una campaña propia, creada con él (un mapa guardado antes de las campañas recibe una con su reloj, sus facciones y su Oráculo), y puede unirse a otra en **Ajustes del mapa → Campaña**, compartiendo su fecha con los otros mapas de ella ([Campañas](01-getting-started.md#campañas)); un viaje de la aplicación Travel también puede jugarse en ella ([La campaña](../travel/02-playing.md#la-campaña)). Se guarda con la campaña, junto al mapa, y en el `.otd.json` del mapa. Sus meses, lunas y fiestas salen del calendario del sistema del mapa (`kind: calendar` en su pack, mira [Tipos de definición](../technical/07-kinds.md#calendarios)); sin uno, días y cuatro estaciones. La aplicación [Campaign](../campaign/01-getting-started.md) muestra el mismo reloj, sin mapa, con la cronología, los mapas y los viajes de la campaña.

## Ponerlo en marcha

**Empieza el** elige su fecha en los términos del calendario: el día del mes, el mes y el año, y la hora (con el calendario por defecto, el número de día y la hora); empieza a las 06:00 del primer día salvo que lo cambies. **Poner en marcha el reloj del mundo** lo sitúa ahí o, durante un viaje, a la hora del viaje (comparten el tiempo). Una fecha que el calendario no tiene (el 31 de un mes de 30 días, o antes de su primer día) se dice bajo las casillas. Nombra el tiempo con el calendario del sistema con el que se juega el mapa (**Ajustes del mapa → Campaña → Sistema**; durante un viaje, el del viaje): las Marcas Grises muestran «Pozodía, 3 de Deshielo, año 412» con sus lunas y fiestas; el calendario sencillo de las reglas genéricas cuenta los días de sus estaciones.

**Parar el reloj del mundo** lo olvida (pregunta antes).

## Fijar la fecha

**Fijar la fecha**, bajo la fecha, lleva el reloj al día y la hora que elijas:

- **Más tarde**: es avanzar el tiempo, igual que los botones de abajo (con un viaje en marcha el grupo viaja o espera hasta entonces, y pregunta antes de que pasen días); llegan los eventos, fiestas y lunas del camino.
- **Antes**: pregunta primero, y solo sin un viaje en marcha (el tiempo de un viaje nunca retrocede). No se deshace nada de lo que pasó: la cronología lo conserva y dice «El reloj volvió atrás (desde …)»; los eventos que se repiten no vuelven.

## Avanzar el tiempo

**+1 hora**, **Día siguiente** (hasta medianoche) y **Próximo evento**, y un botón **Siguiente: …** por cada división del día que declara el calendario (**Siguiente: Guardias**, **Siguiente: Comidas**: hasta que empieza su siguiente parte); **Hasta…** elige una parte de cualquier división e **Ir** avanza el tiempo hasta que vuelve a empezar. Bajo la fecha, lo que es el momento en cada división («Parte del día: el atardecer · Guardias: 5»); un calendario sin divisiones no muestra ninguna (el calendario que se usa cuando un sistema no tiene ninguno tiene guardias de 4 horas; el calendario sencillo de las reglas genéricas añade sus partes del día). Qué son las divisiones de un calendario: [Calendarios](../technical/07-kinds.md#calendarios). Lo que llega por el camino se anota en la **cronología** (y, durante un viaje, en su diario): eventos, fiestas, lunas llenas y nuevas.

**El clima** del día aparece bajo la fecha. Con un viaje en marcha es el del viaje (su tirada de clima); sin él, el reloj del mundo tira el suyo cada día que pasa, con el modelo de clima del sistema del mapa, cada día siguiendo al anterior (el cielo de las Marcas Grises, una flor hexagonal en invierno). Las tiradas a mano lo leen como `weather`.

## Con un viaje en marcha

El mundo y un viaje con reglas comparten **un solo tiempo**. Los viajes nuevos empiezan en la fecha del reloj en lugar de en una estación, viajar y acampar mueven el reloj, y mover el reloj hace avanzar el viaje, viviendo cada momento como si lo jugaras:

- **Con una ruta planeada**, el grupo **sigue viajando** por ella: los botones quedan bajo **Seguir viajando**, y una nota debajo dice el hex hacia el que va (la ayuda de **Seguir viajando** explica qué hace entonces el paso del tiempo). Sigue como diga el sistema (`travel.onward`: su marcha hasta el destino, como hace el botón **Marchar** en Jugar), hace la **parada** del sistema cuando no puede (acampar, por ejemplo), sigue marchando cuando vuelve a poder y, cuando llega, espera allí el resto del tiempo. Con un sistema que marcha de día, **+1 hora** a las 08:00 es una hora de marcha.
- **Sin ruta**, el grupo **espera donde está**: los botones quedan bajo **Esperar aquí**, y la nota de debajo dice el hex donde espera. Un grupo que espera come, pero no marcha.

En los dos casos:

- Cada momento que nombra el sistema llega al alcanzarlo: las comprobaciones y acciones a una hora o en una parte del día (el clima y perderse cada mañana…), como al ponerse en marcha.
- Desde el momento de su **parada**, un grupo que no está marchando hace la acción de la parada del sistema, una vez al día: acampar, por ejemplo (`travel.halt` en sus reglas: mira [Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)). Si no puede hacerla (la bloquea un valor del día o no se cumplen sus condiciones: las Marcas Grises solo acampan con comida), el tiempo pasa sin ella y el diario dice por qué: «“Acampar” no es posible (…): el tiempo pasa sin ello.» Un sistema sin parada simplemente deja pasar el tiempo.
- Cada día que acaba hace las acciones de fin de día del sistema (comer, por ejemplo) y tira sus comprobaciones de fin de día (el hambre, por ejemplo).
- Un día en que el grupo no puede marchar (una tormenta, un valor que bloquea el viaje, como estar perdidos) es un día perdido, y el diario lo dice; sigue la marcha cuando vuelve a poder.

**Mover el tiempo a otro día pregunta antes**: «El grupo seguirá viajando hacia 0808 durante 1 día(s), marchando cuando el sistema lo deje; cuando no pueda marchar: Acampar. ¿Seguir?» (o «esperará aquí»). Si dices que no, todo queda como estaba. Al esperar, el diario empieza con «Esperar aquí hasta el día 3, 06:00» y luego lo cuenta todo.

**Se detiene antes**, y el reloj con él, cuando algo te necesita, y **un mensaje abajo dice por qué**: una comprobación que hace pausa, con tabla o sin ella («“Encuentro” te necesita»: mira el diario, pulsa **Continuar** y vuelve a avanzar el reloj), un lugar encontrado por el camino (descubrimiento), un camino cortado del todo (elige otro destino). Llegar también se avisa: «El grupo ha llegado a su destino.»

Una acampada dura lo que digan sus pasos aunque pidieras menos: si la parada es a las 20:00 y acampar duerme hasta las 06:00, **+1 hora** a las 19:30 llega a la parada, así que el grupo acampa y el reloj acaba a las 06:00.

Ejemplo con las Marcas Grises: pon en marcha el reloj, coloca al grupo en Ashford (0608) y haz clic en 0808 en Jugar para planear el camino; luego pulsa **Día siguiente**: pregunta, por la mañana se tiran el clima y perderse, el grupo marcha por el camino, acampa al anochecer (come la comida de un día, una noche bien comidos quita 1 de fatiga, se tira el encuentro nocturno donde el peligro es 2 o más) y el reloj acaba a la mañana siguiente, cuando acaba la acampada, un día más allá. Quita la ruta (clic en el hex del propio grupo) y **Día siguiente** espera en el sitio.

**Un viaje cada vez.** Un viaje de la aplicación Travel también puede jugarse en la campaña de este mapa, y el tiempo de la campaña es uno: jugar el viaje del mapa cuando el último en jugarse fue ese pregunta antes («Hay otro viaje en curso en esta campaña: «A Keld». ¿Pausarlo y jugar este?»), y si el reloj avanzó entretanto, el grupo espera hasta la fecha de la campaña antes de hacer lo que pediste (un mensaje lo dice).

## Eventos

Cosas que pasan en una fecha, esté el grupo allí o no: una fiesta, un ataque, la llegada de un barco. Escribe qué pasa, su **Id**, una **descripción** si quieres, cuándo (**dentro de cuántos días** y **a qué hora**, o **en una fecha** del calendario), y si pasa **una vez**, **cada N días** (un mercado semanal) o **cada año**. La lista muestra lo que viene, lo más próximo primero, con el id y la descripción de cada uno; ✕ cancela uno.

El **Id** es cómo nombran al evento las condiciones y las tablas en su día: palabras en minúscula unidas por guiones (`market-day`, `clan-raid`), uno por evento. Si lo dejas vacío, es su nombre escrito así (**Market day** → `market-day`; si está ocupado se le añade un número).

## Relojes de progreso

Un reloj es una esfera de segmentos que se llenan según algo avanza: una amenaza («La Sierpe despierta: 1/6»), un proyecto, el plan de una facción. Haz clic en un segmento para llenar hasta él, o en el último lleno para vaciarlo. Cuando un reloj se llena, la cronología lo dice. Cámbiale el nombre editándolo; ✕ lo quita. Sus **segmentos** pueden ser los que quieras: ponlos al añadirlo (junto a su nombre) o cámbialos después (junto a la cuenta). Bajo la cuenta está el nombre con el que lo leen las tablas (`the-wyrm-wakes`).

**Los relojes del propio sistema.** Un sistema puede declarar los relojes con los que empieza su mundo ([Relojes de progreso](../technical/07-kinds.md#relojes-de-progreso), la pestaña **Relojes** de la aplicación Systems): llegan con el reloj del mundo al ponerlo en marcha, ya llenos hasta donde diga el sistema. Haz clic en el nombre bajo la cuenta de un reloj declarado para ver qué es y **qué pasa cuando se llena**: una línea en la cronología y un aviso, una tabla tirada, efectos sobre las facciones y sobre otros relojes, y después se queda lleno, vuelve a empezar o desaparece. Las reglas lo leen por el id que le da el sistema, aunque lo renombres. **Añadir los relojes del sistema** recupera los que el mundo no tiene (quitados, o declarados después de poner en marcha el reloj).

**Las tablas y las reglas de un sistema leen el mundo**: cada reloj por su nombre en minúsculas con guiones («The Wyrm wakes» es `world.clocks.the-wyrm-wakes`, sus segmentos llenos; `clocks.the-wyrm-wakes` en corto), uno declarado también por su id y los eventos del día por su id (`world.events: market-day`, o `events`; sus nombres escritos como id también valen), en condiciones y en tiradas, a mano o del viaje: un encuentro que solo llega cuando una amenaza está cerca (`when: { world.clocks.the-wyrm-wakes: { gte: 4 } }`), una acción solo el día de mercado. La lista completa: [Qué ven las tablas](../technical/04-what-tables-see.md).

## Cronología

Lo que ha pasado en el mundo, lo más reciente primero: eventos que llegaron, fiestas, lunas, relojes que se movieron y tus propias notas (escribe una y **Añadir**).

El mapa de ejemplo de las Marcas Grises viene con el reloj en marcha: un mercado cada semana (`market-day`: ese día, en Ashford, **Día de mercado** da provisiones), los Clanes de Hierro marchando sobre Fort Keld (`clan-march`), las crecidas de primavera (`spring-floods`) y los tres relojes del sistema: la Sierpe del Bosque Gris (la llenan las luces embrujadas; llena, tira lo primero que hace la Sierpe y recorre el Bosque Gris), la marcha de los Clanes de Hierro (la llenan sus turnos del mundo; llena, entran en guerra con Fort Keld, acercan su motín dos segmentos y vuelven a reunirse) y la guarnición sin paga de Fort Keld (llena, se amotina: el fuerte se pierde y el reloj desaparece).

## Facciones

Una facción es uno de los poderes del mundo (un reino, un clan, un gremio): una hoja de valores y estados como la de un personaje, que guarda la campaña, y **tierra**, los hexes que tiene en cada mapa. Cuando el sistema del mapa tiene facciones (`kind: factions` en su pack), la vista Mundo las lista en **Facciones**; **Traer sus facciones** las pone en un mapa que aún no las tiene, cada una con sus tierras iniciales (las regiones y hexes que nombra su pack). Cada una muestra su color y cuántos hexes tiene; ábrela para ver lo que el sistema dice que es y su hoja (sus valores, estados y relaciones, como los de un personaje: cámbialos a mano cuando lo diga la historia). Sus tierras se dibujan en el mapa en su color (la capa **Facciones**).

**Su tierra** sale de tres sitios, y la guarda el mapa (la etiqueta **Su tierra** del panel también lo dice):

- **Dónde empieza**: las regiones que su sistema le da, en cualquier mapa que las tenga, y los hexes que le da, solo en el mapa de ejemplo en el que están (Systems → [Facciones](../systems/08-factions.md)), al traer sus facciones. Cambiarlos después en el sistema no mueve la tierra de un mapa.
- **A mano**: **Pintar su tierra**, abajo.
- **Los turnos del mundo**: la tabla de turno de una facción puede ganar terreno (`faction.territory: 1`, un hex de su frontera) o perderlo (`-1`).

Un hex tiene como mucho un dueño: cogerlo es quitárselo a quien lo tuviera. Las tablas leen quién tiene un hex como `hex.faction`, y cuánto tiene cada una como `factions.<id>.territory`.

**Su tierra, a mano.** Abre una facción y pulsa **Pintar su tierra**: mientras está activo (y abierto el panel Mundo), un clic o arrastrar en el mapa le da hexes, quitándoselos a quien los tuviera, y un clic derecho se los quita (el agua y los hexes fuera del mapa siguen sin ser de nadie). Pulsa **Dejar de pintar** al acabar. Como un turno del mundo, no se deshace con Ctrl+Z: vuelve a pintarlos. Sus valores y estados se cambian en la hoja de cada una, debajo.

**Turno del mundo** hace que cada facción juegue su turno ahora (su explicación está en **Qué hace**, a su lado, así que leerla no juega un turno), en orden: cada una tira su tabla de turno, y lo que sale la cambia a ella, a otra facción, sus tierras (un hex más desde su frontera, o uno menos) o un reloj de progreso; cada resultado va a la cronología («Los Clanes de Hierro: Unos saqueadores atacan las granjas apartadas del Valle»). Con **Turnos por sí solos, cada N días** marcado, los turnos llegan según avanza el reloj, a mano o con un viaje, cada tantos días como diga el sistema.

Las tablas y condiciones las leen en todas partes: `factions.the-vale.values.strength`, `hex.faction` (quién tiene el hex: la patrulla del Valle de las Marcas Grises recorre cualquier tierra que tenga el Valle). Los resultados de un viaje también les llegan (el peaje de las Marcas Grises hace que la guarnición os aprecie más; sus luces embrujadas despiertan el reloj de la Sierpe), y **Aplicar al viaje** en una tirada a mano hace lo mismo. **Quitar las facciones del mapa** las olvida (tras preguntar). El mapa de ejemplo de las Marcas Grises trae a los Clanes de Hierro, el Valle de Ashford y la guarnición de Fort Keld, y el reloj _The Iron Clans march_ que sus turnos hacen avanzar. Cómo las declara un sistema: [Facciones](../technical/07-kinds.md#facciones).

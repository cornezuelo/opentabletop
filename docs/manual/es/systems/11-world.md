# Mundo

La pestaña **Mundo** edita lo que el mundo del sistema hace por sí solo (`kind: world`, una por sistema): cuando se llena un reloj de progreso, tras cada turno del mundo, o cuando algo pasa a cumplirse en el mundo (la fuerza de una facción llega a 0, un día de mercado), el mundo reacciona: una línea en la cronología, una tabla tirada, relojes y facciones cambiados, otra reacción o un turno del mundo. Pasa allí donde se mueva el mundo: el panel Mundo de Mapa, el app Campaña y el tiempo que avanza bajo un viaje. **Nuevas reglas del mundo** las crea, con una reacción para renombrar, y las nombra en el sistema; el **Añadir qué pasa al llenarse** de un reloj ([Relojes](10-clocks.md)) también crea una. Esta página explica cómo reacciona el mundo, luego la pestaña, añade paso a paso un día de mercado a la fiebre que se extiende de la página Relojes y repasa los errores habituales. El YAML: [Las reglas del mundo](../technical/07-kinds.md#las-reglas-del-mundo).

## Cómo reacciona el mundo

Una **reacción** es como una acción que un viaje hace por sí solo, pero del mundo: llega en sus momentos, si se cumplen sus condiciones, y hace sus pasos en orden.

- **Sus momentos** (**En**):
  - `world.turn` — tras cada turno del mundo, cuando todas las facciones han jugado el suyo (cada pocos días, a mano, o traído por un paso de un viaje, `do: world.turn`).
  - `world.clocks.<id>.full` — al llenarse un reloj de progreso, lo llene lo que lo llene: un viaje, una tabla, el turno de una facción, otra reacción, un clic en el panel Mundo. Un reloj creado a mano se nombra por su nombre en minúsculas y con guiones.
  - **Al cumplirse esto** — una condición sobre lo que muestra el mundo: sus relojes (`world.clocks.the-siege`), los eventos de hoy (`world.events: market-day`), las facciones (`factions.the-crown.values.strength`), el momento (`time.season`). Llega **una vez**, al pasar a cumplirse, y otra solo después de haber dejado de cumplirse.
- **Sus condiciones**: **Solo si** y **Salvo si**, miradas al llegar su momento. Una reacción cuyas condiciones no se cumplen no hace nada esa vez.
- **Sus pasos**, cada uno viendo lo que cambiaron los anteriores, cada uno con su propio **Solo si**:
  - **Decir** — una línea en la cronología; `{{…}}` leen el mundo (`El asedio: {{world.clocks.the-siege}}`).
  - **Tirar** — una tabla, oráculo, generador o mazo, con lo que muestra el mundo: lo que sale va a la cronología y se aplican sus efectos.
  - **Cambiar** — relojes (`world.clocks.the-siege` · `1`, `'=0'` lo vacía) y facciones (`factions.the-crown.values.strength` · `-1`, `factions.the-rebels.territory` · `1`, tierra en el mapa que se está jugando). Nunca el grupo de un viaje: el mundo no tiene grupo (para eso, deja que el viaje oiga el momento).
  - **Traer** — otra reacción (`world.reactions.<id>`, tenga los momentos que tenga, si se cumplen sus condiciones) o un turno del mundo (`world.turn`).
  - **Pausar** — el mundo espera a que el jugador pulse **Seguir**, diciendo esto (o nada): `El puente queda vacío.`
  - **Preguntar** — el mundo espera a que el jugador elija una de las opciones de una **Pregunta**; los pasos siguientes leen la respuesta como `params.<id>` (un paso **Solo si** `params.who` es `clans`).
- **Sus preguntas** (**Preguntas**): lo que puede preguntar, cada una con un id (`who`), su pregunta (**Nombre**: _¿Quién toma el puente?_) y sus opciones (`clans`, `vale`; el nombre propio de una opción, `{ id: clans, name: Los Clanes }`, en YAML).
- **Cuándo se miran.** Tras cualquier cosa que cambie el mundo (el tiempo que avanza, un turno del mundo, un reloj que se mueve, los efectos de un viaje, un cambio a mano), los momentos que llegaron se juegan en el orden en que pasaron, las reacciones de cada uno en el orden de la pestaña; luego las condiciones, otra vez hasta que no pase a cumplirse nada nuevo. Avanzar varios días de golpe mira el comienzo de cada día por el camino, así que un día de mercado en mitad de la semana no se salta.
- **La memoria.** La campaña guarda qué condiciones se cumplían, para que cada una llegue una vez. Una campaña que nunca ha mirado (una empezada antes de que el sistema tuviera estas reglas) da por visto lo que se cumple: no llega nada de golpe.
- **Cadenas.** Una reacción puede traer otras: su cambio llena un reloj que reacciona, su turno trae `world.turn`, su condición hace cumplirse otra. Las reacciones que se traen unas a otras en un bucle que se ve en el pack (`world.turn` que trae `world.turn`, dos relojes que se llenan uno a otro) se rechazan al cargar el pack; un bucle que solo hacen los números se para tras 10 seguidas, con una línea en la cronología. Todo el orden, con los momentos del viaje: [Qué reacciona a qué](../technical/11-what-reacts-to-what.md).
- **Esperando al jugador.** Un paso **Pausar** o **Preguntar** detiene el mundo donde está: la cronología dice lo que la reacción llevaba dicho, y el panel Mundo, la aplicación Campaña y el viaje en marcha muestran lo que espera, con **Seguir** o las opciones de la pregunta. Nada más mueve el mundo hasta que se responde: ni el tiempo, ni los turnos del mundo, ni un viaje (el viaje lo muestra también, y no avanza hasta que se responde). Luego sigue el resto, en orden: los demás pasos de la reacción, las demás reacciones del momento, lo que pasa con un reloj lleno, los turnos que tocaban y los días que faltaban (un viaje que avanzó mientras tanto se alcanza). Un viaje que salta las pausas (**Saltar las pausas**) salta también las del mundo, con sus palabras en la cronología; las preguntas siguen esperando.
- **Con un viaje en marcha** las reacciones del mundo se juegan también (el mundo es uno), y lo que cambian el viaje lo lee desde su siguiente paso. Las reglas propias de un viaje siguen reaccionando en el viaje ([Reglas](05-rules.md)).

## La pestaña

- Su **Nombre**: cómo se llaman estas reglas.
- Cada **reacción**, una tarjeta plegada: su nombre, su id (cómo la trae otra reacción: `world.reactions.<id>`) y lo que hace en una línea. Desplegada: su **Nombre**, **Descripción**, **En** (sus momentos con nombre como píldoras, y **Al cumplirse esto** como filas), **Solo si**, **Salvo si**, sus **Preguntas** (una fila cada una: id, pregunta, opciones como píldoras; **YAML** para el nombre propio de una opción) y sus **Pasos**: cada uno una fila con **Qué hace**, su valor y su **Solo si**, que se mueve con ↑ ↓ y se quita con ×; **Añadir un paso** añade uno.

## Paso a paso: día de mercado en las Marismas de la Fiebre

Las Marismas de la Fiebre de la página [Relojes](10-clocks.md#paso-a-paso-una-fiebre-que-se-extiende) tienen una fiebre que se extiende y caminos que se cierran. Cada semana hay mercado en el cruce: los viajeros traen la fiebre consigo, hasta que los señores cierran los caminos; entonces las marismas quedan en cuarentena, y el mercado se para.

1. **La pestaña Mundo**: abre _Las Marismas de la Fiebre_ y su pestaña **Mundo**: tiene las dos reacciones que hizo la página Relojes (_La fiebre se extiende_, _Se cierran los caminos_).
2. **Cuarentena**: debajo, **Añadir**, con el id `quarantine` y el nombre _Cuarentena_. En **En**, quita la píldora `world.turn`, y en **Al cumplirse esto** la fila `world.clocks.the-closed-roads` · **es al menos** · `2`. Su único paso: **Decir** _Las marismas quedan en cuarentena._
3. **Día de mercado**: **Añadir**, con el id `market` y el nombre _Día de mercado_. En **En**, quita `world.turn`, y **Al cumplirse esto** `world.events` · **es** · `market-day`. **Salvo si** `world.clocks.the-closed-roads` · **es al menos** · `2`. Sus pasos: **Decir** _Día de mercado: los viajeros traen la fiebre._, luego **Añadir un paso**, **Cambiar** `world.clocks.the-fever` · `1`.
4. **El mercado**: en Mapa, en el mapa de la página Relojes, el panel **Mundo** (☾); su pestaña **Eventos**: un evento llamado _Market day_ mañana, que se repite cada 7 días (su id es `market-day`).
5. **El tiempo**: en su primera pestaña, avanza 15 días de golpe.

**Lo que verás.** Cada día de mercado, al empezar, la cronología dice _Día de mercado: los viajeros traen la fiebre._ y la fiebre llena un segmento, aunque el tiempo avanzó quince días de una vez: tres días de mercado, y el tercero la llena (_La fiebre llega a las aldeas._ y un giro, la fiebre de vuelta a 0/4, los caminos a 1/2). Haz clic en el último segmento de los caminos (2/2): la cronología dice _Los señores cierran los caminos._ y luego, una vez, _Las marismas quedan en cuarentena._ Avanza otra semana: ninguna línea de mercado, y la fiebre se queda como estaba. Vuelve a abrir los caminos (clic en el segundo segmento) y el siguiente día de mercado vuelve a traer la fiebre; ciérralos de nuevo y la cuarentena se vuelve a decir.

## Lo mismo en YAML

```yaml
# world.yaml
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
  quarantine: # paso 2
    name: Cuarentena
    on: { when: { world.clocks.the-closed-roads: { gte: 2 } } }
    do:
      - say: Las marismas quedan en cuarentena.
  market: # paso 3
    name: Día de mercado
    on: { when: { world.events: market-day } }
    unless: { world.clocks.the-closed-roads: { gte: 2 } }
    do:
      - say: 'Día de mercado: los viajeros traen la fiebre.'
      - effects: { world.clocks.the-fever: 1 }
```

El mundo de las Marcas Grises (_Cómo se mueven las Marcas_) juega con todo esto: los relojes de las amenazas que se llenan, noticias en los caminos tras cada turno del mundo, Fuerte Keld que cae en cuanto su fuerza llega a 0 (y, con los Clanes en guerra, un turno del mundo al momento), y el día de mercado en Ashford que da ánimo a un Valle debilitado: su [página](../packs/02-grey-marches.md) dice dónde.

## Errores habituales

- **No pasa nada.** Las reacciones del mundo necesitan el reloj del mundo en marcha, y que el sistema las nombre (`world:` en su kind: system; **Nuevas reglas del mundo** y **Añadir qué pasa al llenarse** lo hacen).
- **Pasó una vez, y nunca más.** Una condición llega una vez al pasar a cumplirse, y otra solo después de haber dejado de cumplirse. Para algo que pase cada vez, usa un momento con nombre (`world.turn`, un reloj que hace `reset`), o una condición que deje de cumplirse entre medias (el día de un evento se acaba).
- **No llegó en una campaña en marcha.** Lo que ya se cumple cuando una campaña mira las reglas por primera vez se da por visto. Haz que deje de cumplirse y vuelva a cumplirse, o hazlo a mano.
- **Una reacción que no hace nada al traerla.** Una reacción traída por otra (`world.reactions.<id>`) sigue teniendo sus condiciones: si su **Solo si** no se cumple, no hace nada.
- **Un bucle rechazado.** Una reacción no puede traer su propio momento, ni directamente ni a través de otras: `world.turn` que trae un turno del mundo, la reacción de un reloj que llena ese reloj. Tráela por una condición, o vacía antes el reloj (`'=0'` no llena nada).
- **El mundo no se mueve.** Te está esperando: una reacción pausó o preguntó (**El mundo espera: …**, en el panel Mundo, la aplicación Campaña y el viaje). Respóndela, y sigue el resto.
- **Preguntar sin pregunta.** Un paso **Preguntar** nombra una de las **Preguntas** de la reacción (`params.<id>`): añade antes la pregunta.
- **Cambios al grupo.** El mundo no tiene grupo: `party.…` en una reacción del mundo no cambia nada. Deja que el viaje oiga el momento: una acción **Automática en** `world.clocks.<id>.full`.
- **El id de un evento.** Las condiciones leen los eventos de hoy por su id (`world.events: market-day`), hecho a partir del nombre al programar el evento; cambiar después el nombre del evento conserva su id.

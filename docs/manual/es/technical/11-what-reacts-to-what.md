# Qué reacciona a qué

Las reglas de un sistema reaccionan a lo que pasa: una comprobación se tira al amanecer, una acción se hace al entrar el grupo en un hex, el mundo reacciona cuando se llena un reloj, un viaje se entera de un turno del mundo. Cada una de esas cosas es un **momento**, y una definición que reacciona a uno lo nombra (`at:` en una comprobación, `on:` en una acción o en una reacción del mundo). Esta página reúne todos los momentos de todas las partes del sistema, dice **quién los oye** (un viaje, el mundo, o los dos) y **en qué orden** se juega todo cuando pasan varias cosas a la vez. Cómo se escribe cada uno está en [Sintaxis](09-syntax.md#momentos), [Acciones y pasos](10-actions-and-steps.md) y [Las reglas del mundo](07-kinds.md#las-reglas-del-mundo).

## Dos sitios que reaccionan

- **El viaje** (sus reglas de viaje): sus comprobaciones (`at:`) y las acciones que hace por sí mismo (`on:`). Reacciona mientras el viaje avanza, en el modo Jugar del Hexmapper o en Travel. Conoce al grupo, el hex en el que está y los valores del día.
- **El mundo** (el `kind: world` del sistema): sus reacciones (`on:`). Reacciona cuando se mueve el reloj del mundo, se mueva donde se mueva: la aplicación Campaign, el panel Mundo del Hexmapper, y bajo un viaje en marcha (el mundo es uno). Conoce el reloj del mundo, los relojes de progreso, las facciones, los eventos de hoy y el clima del mundo; no tiene grupo.

No se llaman entre sí: cada uno oye los momentos del otro a través de la campaña (abajo, [Entre el viaje y el mundo](#entre-el-viaje-y-el-mundo)).

## Todos los momentos

| Momento                                                    | Lo oye        | Cuándo                                                                                                           |
| ---------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| una hora (`'06:00'`)                                       | viaje         | cuando suena, marchando, esperando o durmiendo en el campamento                                                  |
| una parte del día (`time.part.morning`)                    | viaje         | cuando empieza esa parte del calendario                                                                          |
| `trip.hex-enter`                                           | viaje         | al entrar en cada hex                                                                                            |
| `time.day-end`                                             | viaje         | al acabar cada día del viaje, a medianoche                                                                       |
| una acción (`actions.camp`)                                | viaje         | cuando el grupo la hace, antes de sus pasos                                                                      |
| el final de una acción (`actions.camp.done`)               | viaje         | cuando acaban sus pasos                                                                                          |
| una comprobación (`checks.WEATHER_CHECK_REQUIRED`)         | viaje         | justo después de resolverse (después de **Continuar**, si pausaba)                                               |
| un reloj del mundo que se llena (`world.clocks.<id>.full`) | mundo y viaje | cuando se llena uno de los relojes de progreso de la campaña, lo llene lo que lo llene                           |
| un turno del mundo (`world.turn`)                          | mundo y viaje | cuando todas las facciones han hecho su turno, lo traiga lo que lo traiga (los días, una mano, `do: world.turn`) |
| una condición que pasa a cumplirse (`{ when: … }`)         | mundo y viaje | una vez, cuando pasa a cumplirse, la cambie lo que la cambie; otra vez solo después de dejar de cumplirse        |

Una condición es el momento de todo lo que no tiene nombre propio: una condición o un valor de un personaje (`party.members.conditions.wounded`, con `for: party.members`), un valor que llega a su límite (`trip.below: party.values.food`), un cambio de clima (`trip.weather: storm`), el día de un evento o una festividad (`world.events: market-day`), un valor de una facción (`factions.fort-keld.values.strength: { lte: 0 }`), una estación (`time.season: winter`). Las condiciones del viaje leen lo que ven las tablas en un viaje ([Lo que ven las tablas](04-what-tables-see.md)); las del mundo, solo el mundo.

Lo que se cumple por sí solo en una hoja (una condición con su propio `when`, un valor hecho de otros) no es un momento: se pone al día antes de mirar nada más, así que cada momento lo ve al día. Después puede llegar una reacción cuando pasa a cumplirse (una condición sobre `party.members.conditions.seasick`).

## En un viaje

Un paso de un viaje (un clic: **Marchar**, **Acampar**, una acción, **Continuar**) juega todo lo que llega por el camino, minuto a minuto, en el orden en que llega:

1. **Lo que ha cambiado desde el último paso** se ve primero: el grupo tal y como está ahora (cambiado a mano, o desde otra aplicación) y lo que se cumple por sí solo en sus hojas.
2. **Los momentos del mundo** que oye el viaje y que llegaron mientras no avanzaba (un reloj llenado en la aplicación Campaign) se juegan primero, cada uno como un momento propio (mira [Entre el viaje y el mundo](#entre-el-viaje-y-el-mundo)).
3. **El paso en sí.** Según pasa el tiempo, cada momento que llega se juega en su minuto. Cuando llegan varios en el mismo minuto:
   - **Un día que acaba** va primero: el fin del día a medianoche, después empieza el nuevo día (los valores de hoy pasan a ser `yesterday.*`), y luego los momentos del primer minuto del nuevo día.
   - **Una hora y una parte del día** que coinciden llegan en el orden en que las reglas las nombran por primera vez (primero las comprobaciones, en su orden, y luego las acciones).
   - **Entrar en un hex** llega cuando el grupo entra, una vez hecho el movimiento hasta él.
4. **Cada momento** se juega en este orden:
   1. las **acciones** que hace el propio sistema en él (`on:`), en el orden en que las declaran las reglas, cada una con sus pasos; una acción que espera (al jugador, una comprobación, una tirada) retiene el resto del momento hasta que acaba;
   2. las **comprobaciones** del momento (`at:`), en el orden de las reglas, cada una decidida justo antes de tirarse, así que ve lo que pusieron las anteriores (una comprobación cuyas condiciones no se cumplen se salta);
   3. justo después de resolverse cada comprobación, su momento `checks.<evento>` (las acciones y comprobaciones que lo nombran), antes de la siguiente comprobación del momento.
5. **Hacer una acción** (con un botón, en un momento o con `do:`) juega primero su momento `actions.<id>` (las acciones y comprobaciones que lo nombran), después sus pasos en orden, y luego `actions.<id>.done`.
6. **Las reacciones** (momentos escritos como condiciones) se miran cuando todo lo demás se ha asentado: ninguna comprobación esperando, ninguna acción retenida, nada preguntado. La primera que ha pasado a cumplirse se juega en el acto, en el mismo minuto; después se vuelven a mirar, así que una reacción puede desencadenar otra. Llegan en el orden en que las declaran las reglas; una con `for: party.members` llega por cada miembro para el que se cumple, en el orden del grupo, con ese miembro como `acting`. Más de 10 seguidas se detienen, con una línea en el diario.
7. Después el paso sigue como iba (la marcha sigue marchando), hasta que acaba o algo lo detiene.

Lo que un paso le hizo al mundo (sus relojes, sus facciones, los turnos del mundo que trajo) se juega en el mundo cuando el paso ha acabado: siguiente apartado.

## En el mundo

Una acción sobre el mundo (avanzar el tiempo, un turno del mundo, marcar un reloj, cambiar una facción a mano, o lo que hizo un paso de un viaje) juega esto, en orden:

1. **Avanzar el tiempo va día a día.** Avanzar una semana de golpe se detiene en cada medianoche del camino y juega allí los puntos 2–6, así que un día de mercado en medio no se pierde.
2. **El reloj del mundo**: los eventos y festividades del día.
3. **El clima del mundo**, un día tras otro, mientras ningún viaje tenga un clima propio.
4. **Los turnos del mundo que tocaban** por el camino (cada tantos días), cada uno a su hora. Un turno del mundo es:
   1. el **turno de cada facción**, una a una en el orden de las facciones, cada una viendo lo que hicieron las anteriores; sus líneas van a la cronología;
   2. los **relojes que marcaron**, y luego (cada reloj que se llenó: punto 5);
   3. las **reacciones del mundo a `world.turn`**, en el orden en que las declaran las reglas.
5. **Cada reloj que se llenó**, en el orden en que se llenaron:
   1. las **reacciones del mundo a `world.clocks.<id>.full`**, en el orden declarado, con una línea en la cronología con lo que dijeron;
   2. después lo que pasa con el reloj (`then: keep | reset | remove`): solo vuelve a empezar cuando han acabado sus reacciones.
6. **Las condiciones** (reacciones `on: { when: … }`), cuando ha acabado la acción: se juega cada una que ha pasado a cumplirse, en el orden declarado; después se vuelven a mirar, porque lo que cambió una puede hacer que se cumpla otra, hasta que no se cumple nada nuevo.

**Dentro de una reacción**, sus pasos van en orden y cada uno ve lo que cambiaron los anteriores. Un paso que cambia relojes juega en el acto lo que traen (un reloj que se llena: sus reacciones), y lo mismo `do: world.turn` (el turno entero) y `do: world.reactions.<id>` (esa reacción, si se cumplen sus condiciones); después, el siguiente paso.

**Las cadenas** tienen un límite: reacciones que se traen unas a otras a más de 10 niveles, o condiciones que se hacen cumplir unas a otras durante más de 10 rondas, se detienen, con una línea en la cronología. Los bucles que se ven en el pack (`on: world.turn` con `do: world.turn`, dos relojes que se llenan el uno al otro) se rechazan al cargarlo.

**Esperando al jugador.** Una reacción del mundo que pausa o pregunta (`pause:`, `ask:`) detiene el mundo justo ahí. Nada más lo mueve (el tiempo, los turnos, un viaje) hasta que se responde; después todo sigue en el orden de arriba, desde donde se detuvo: los demás pasos de la reacción, las demás reacciones del momento, lo que pasa con un reloj lleno, los demás relojes, los turnos que aún tocaban y los días que faltaban por avanzar.

## Entre el viaje y el mundo

El viaje y el mundo se oyen a través de la campaña, nunca directamente:

- **Del mundo al viaje.** Cuando se llena un reloj o se juega un turno del mundo, la campaña guarda el momento para el viaje en marcha (`world.clocks.<id>.full`, `world.turn`). El viaje oye cada uno, en el orden en que pasaron, en cuanto acaba el paso que lo trajo (o, si llegó de otra parte, antes de su siguiente paso), como un momento propio: sus acciones con `on:`, y luego sus comprobaciones con `at:`. Un reloj lleno lo dice antes en el diario. Los momentos que no nombra ninguna regla del viaje se descartan. Más de 10 oídos seguidos se detienen.
- **Del viaje al mundo.** Después de cada paso, lo que hizo el paso llega al mundo en el orden en que se hizo: sus efectos en relojes (`world.clocks.<id>: 1`) y facciones (`factions.<id>.…`), cada uno jugado como arriba (un reloj que se llena, sus reacciones); cada `do: world.turn` que hizo, jugado como un turno a su hora (el diario dice lo que hizo cada facción); sus momentos destacados en la cronología; y por último el reloj del mundo siguiendo la hora del viaje (el punto 1 de [En el mundo](#en-el-mundo): días, eventos, turnos que tocan).
- **Esperando.** Mientras el mundo espera al jugador, el viaje no avanza (muestra lo que espera el mundo). Un viaje que salta las pausas (**Saltar las pausas**) salta también las del mundo; las preguntas siguen esperando.
- **Condiciones a ambos lados.** Las reacciones del viaje también leen el mundo (`world.clocks.the-siege: { gte: 3 }`) y llegan cuando el viaje vuelve a mirarlas; las condiciones del mundo no leen al grupo.

## Un ejemplo, de principio a fin

Un sistema cuyo mundo tiene un reloj _El asedio_ (4 segmentos) y facciones; su mundo reacciona al llenarse el asedio con un turno del mundo, y su viaje oye los turnos del mundo (noticias en la próxima posada):

```yaml
# world.yaml
reactions:
  siege-falls:
    on: world.clocks.the-siege.full
    do:
      - say: Cae el fuerte.
      - do: world.turn
# reglas de viaje
actions:
  news:
    on: world.turn
    do:
      - say: Unos jinetes traen noticias de la guerra.
… # fragmentos de dos definiciones
```

El grupo acampa; la noche del campamento tiene una comprobación a las `'23:00'` cuyo resultado marca `world.clocks.the-siege: 1`, y el asedio está a 3 de 4:

1. En el viaje: a las 23:00 se tira y se resuelve la comprobación (su resultado va al diario); las acciones de `checks.<evento>`, si las hay; la noche pasa hasta la mañana, con `time.day-end` a medianoche. El paso ha acabado.
2. En el mundo, lo que hizo el paso, en orden: la marca llena el asedio. Su reacción: _Cae el fuerte._ en la cronología, y luego `do: world.turn`: el turno de cada facción, una a una, y después las reacciones del mundo a `world.turn`. Después el `then` del asedio (vuelve a empezar, si así lo dice). Luego el reloj del mundo sigue al viaje hasta la mañana, día a día, y por último las condiciones del mundo.
3. De vuelta en el viaje: oye lo que el mundo le guardó, en orden: `world.clocks.the-siege.full` (el diario dice que el asedio se llenó; cualquier acción o comprobación que lo nombre), y luego `world.turn`: **news**, _Unos jinetes traen noticias de la guerra._

## Errores frecuentes

- **Esperar que una comprobación de un momento la vea una acción del mismo momento.** Las acciones de un momento van primero, y luego sus comprobaciones: una comprobación ve lo que pusieron las acciones, pero una acción no ve lo que tirarán las comprobaciones. Para actuar según el resultado de una comprobación, reacciona a `checks.<evento>`.
- **Una reacción a una condición que nunca «pasa» a cumplirse.** Llega una vez cuando pasa a cumplirse, y otra vez solo después de dejar de cumplirse. Lo que ya se cumple cuando un viaje o una campaña lo mira por primera vez se da por visto.
- **Una reacción del mundo que cambia al grupo.** El mundo no tiene grupo. Haz que el viaje oiga el momento (`on: world.clocks.<id>.full`, `on: world.turn`) y cambia al grupo allí.
- **Un viaje que no oye nada.** El viaje tiene que ser el que está en marcha en su campaña, y sus reglas tienen que nombrar el momento (`on:` o `at:`); los momentos que no nombra ninguna regla se descartan.
- **Dos momentos del mismo minuto en mal orden.** Las horas y partes del día que coinciden llegan en el orden en que las reglas las nombran por primera vez; da a una una hora posterior (`'06:01'`) o encadénalas (`on: actions.<id>.done`) cuando el orden importe.

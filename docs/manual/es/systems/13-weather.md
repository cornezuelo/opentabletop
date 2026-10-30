# Clima

La pestaña **Clima** edita los **modelos de clima** del sistema: clima con memoria, en el que el de hoy depende del de ayer. Esta página explica cómo funcionan, construye uno desde cero paso a paso y repasa los errores habituales. El YAML de cada campo: [Modelos de clima](../technical/07-kinds.md#modelos-de-clima).

## Cómo funciona el clima con memoria

Una tabla de clima que se tira cada mañana olvida el día anterior: lluvia, luego sol, luego tormenta, luego sol otra vez, según caigan los dados. El clima de verdad no salta así: la lluvia se instala varios días, una tormenta amaina en lluvia, el buen tiempo dura. Un **modelo de clima** guarda esa memoria: cada día parte del clima de ayer y avanza desde ahí.

Un modelo tiene tres partes:

- **Tipos de clima**: lo que puede hacer (despejado, lluvia, tormenta…), cada uno con un id que leen las condiciones (`trip.weather: storm`), un nombre para el diario y lo que **fija para el día** (valores que el resto del sistema puede leer, como el `set` de una tabla).
- **Estaciones**: para cada estación del calendario, cómo pasa el clima de un día al siguiente, de una de dos formas: **tablas de probabilidad** (para cada clima de ayer, cómo de probable es cada clima hoy) o una **flor hexagonal** (un tablero de 19 casillas por el que camina el clima, un paso al día).
- Nada más: el modelo no frena a nadie ni detiene nada por sí mismo. Eso le toca al resto del sistema, que lee el clima del día.

Otros tres sitios hacen que un modelo se juegue:

1. Una **comprobación** lo tira: en [Comprobaciones](06-checks.md), una comprobación cuyo **Se tira en** es el modelo, en _Clima con inercia_, normalmente al empezar la mañana. Sin esa comprobación nadie tira el modelo y los viajes no tienen clima. Las Reglas genéricas tienen una, **Clima** (`WEATHER_CHECK_REQUIRED`), que se tira en _El cielo sencillo_ de Core, así que un sistema nuevo empieza con ella: elige tu modelo en su **Se tira en**.
2. Las [Reglas](05-rules.md#clima) dicen cuánto frena al grupo cada clima (**Velocidad ×**: `0` es un día sin viajar), y sus **valores del día** qué bloquean los valores del clima (una forma de viajar, una acción).
3. Las condiciones lo leen en cualquier parte: `trip.weather: storm` en el **Salvo si** de una acción o de una comprobación, en el **Cerrado cuando** de un terreno, en una entrada de una tabla. Al día siguiente, el de ayer es `yesterday.weather`.

El sistema también tiene que nombrar el modelo (Resumen → **Modelos de clima**); **Nuevo modelo de clima** lo hace por ti. Mientras no hay un viaje en marcha, el reloj del mundo de Mapa también tira cada día el modelo del sistema del mapa ([El reloj del mundo](../map/12-world.md#avanzar-el-tiempo)).

## Tipos de clima

Una fila por tipo: su **id** (corto, lo que leen las condiciones: `rain`), su **Nombre** (lo que dice el diario: _Lluvia persistente_) y lo que **Fija para el día**, como pares `clave: valor`: `deep-snow: true`, `climbModifier: -1`. Los que las reglas declaran como **valores del día** (Reglas → Valores del día) duran hasta que acaba el día, y al día siguiente son `yesterday.deep-snow`; cualquier otro dura solo esa tirada. Un valor solo hace algo cuando algo lo lee: una condición, una tabla o los propios valores del día (uno ahí puede bloquear una forma de viajar o una acción mientras dura).

## Tablas de probabilidad

La forma habitual: para cada estación, una cuadrícula con el clima de ayer en las filas y el de hoy en las columnas. Cada fila dice cómo de probable es hoy cada clima tras un día con el clima de esa fila, en **pesos**: números que se comparan entre sí, no porcentajes.

Cómo se lee una fila: tras un día de **Lluvia**, `rain 2`, `clear 2`, `storm 1` suman 5, así que mañana vuelve a llover 2 de cada 5 veces, está despejado 2 de cada 5 y hay tormenta 1 de cada 5. Una casilla vacía es `0`: ese clima nunca viene después. Cuanto mayor es el peso de una fila para su propio clima (la diagonal), más dura ese clima.

**Empieza como** es el clima del primer día de un viaje en esa estación, y el de cualquier día que siga a un clima cuya fila está vacía.

**En muchos días**, bajo cada cuadrícula, dice con qué frecuencia sale cada clima en esa estación a la larga: si la estación se siente bien. Cambia un peso y mira cómo se mueve.

Las estaciones son las del calendario (el `season` de sus meses): un modelo necesita una por cada estación en la que se juegan viajes. **Añadir una estación** añade una por su id. Una estación que el modelo no tiene usa la primera que tiene.

## Flores hexagonales

**Convertir en flor hexagonal** convierte una estación en un tablero de 19 casillas hexagonales (**Usar pesos** la devuelve a pesos), cada casilla un clima. El clima del día es la casilla en la que está el día, y cada día 2d6 lo mueve a una casilla vecina. Así mañana siempre está al lado de hoy: el clima deriva en vez de saltar, y cómo colocas las casillas es cómo se comporta el clima.

![Una flor hexagonal: el invierno del ejemplo de abajo, con tormentas arriba, nieve en el centro y cielos despejados abajo. El día 1 está en la casilla central; 2d6 saca 7 y el día va al sureste, a Lluvia; luego un 5 lo mueve al este, a Despejado. A la derecha, hacia dónde mueve el día cada total de 2d6.](hex-flower.svg)

En el formulario, la flor se dibuja con cada casilla del color de su clima (la leyenda de al lado dice cuál es cuál): elige un clima en **Pintar con** y haz clic en las casillas para dárselo. Al lado, **Adónde va cada 2d6**:

- 2–3 al noreste, 4–5 al este, 6–7 al sureste, 8–9 al suroeste, 10–11 al oeste, 12 al noroeste (un pack puede cambiarlos con `moves` en el YAML).
- 6, 7 y 8 son los totales más comunes de 2d6, así que el clima tiende a derivar **al sureste y al suroeste: hacia abajo**. Pon abajo el clima hacia el que va la estación, y arriba el que va y viene.
- Más casillas de un clima lo hacen más común, y casillas de un clima juntas lo hacen durar (un día que se mueve dentro de una mancha de nieve sigue siendo nieve).

**Empieza en** es el clima del primer día: la casilla de ese clima más cercana al centro (vacío: la casilla central). **En el borde** dice qué pasa cuando una tirada saldría de la flor: **vuelve por el lado opuesto** (por la misma línea: la fila de arriba y la de abajo, y los lados izquierdo y derecho, son vecinos) o **se queda** donde está.

**En muchos días**, bajo la flor, dice con qué frecuencia sale cada clima, como en las tablas de probabilidad. Un modelo puede mezclar las dos formas, estación por estación.

## Paso a paso: el clima de un valle

Un modelo para un valle: veranos casi siempre buenos con rachas de lluvia y alguna tormenta rara, inviernos de nieve con ratos despejados y alguna tormenta. La lluvia frena al grupo, la nieve más, una tormenta lo para, y la nieve profunda deja atrás a los caballos. Parte de cualquier sistema: uno nuevo (empieza como copia de las Reglas genéricas, con una forma de viajar **A caballo**) o el de [Tu primer sistema](03-your-first-system.md).

1. **El modelo**: en **Clima**, pulsa **Nuevo modelo de clima**. Viene con tres climas (`clear`, `rain`, `storm`) y las mismas tablas de probabilidad en todas las estaciones, y el sistema ya lo nombra (Resumen → **Modelos de clima**, marcado). Su id es `weather`; dale el **Nombre** _Cielos del valle_, y a sus climas los tuyos (vienen en inglés): _Despejado_, _Lluvia_ y _Tormenta_.
2. **Nieve**: en **Tipos de clima**, añade `snow`, con nombre _Nieve_ y **Fija para el día** `deep-snow: true`.
3. **Verano**: en **Estación: summer**, deja **Empieza como** en _Despejado_ y rellena la cuadrícula:
   - la fila **Despejado**: `clear 5`, `rain 1` (a un día bueno le sigue otro 5 de cada 6 veces);
   - la fila **Lluvia**: `rain 2`, `clear 2`, `storm 1`;
   - la fila **Tormenta**: `clear 2`, `rain 1` (y `0` de tormenta: una tormenta nunca dura dos días).

   **En muchos días** dice ahora un 73 % despejado, un 23 % lluvia y un 5 % tormenta, más o menos.

4. **Invierno**: en **Estación: winter**, pulsa **Convertir en flor hexagonal**. Píntala como en el dibujo de arriba: tormentas en las dos primeras casillas de la fila de arriba, nieve por la izquierda y por el centro, lluvia salteada, cielos despejados por abajo y a la derecha. **Empieza en**: _Nieve_; **En el borde**: _vuelve por el lado opuesto_. **En muchos días** dice más o menos un tercio nieve, un tercio despejado, un cuarto lluvia y uno de cada nueve días tormenta. (La primavera y el otoño se quedan con las tablas de probabilidad con las que vinieron).
5. **La comprobación que lo tira**: la copia de las Reglas genéricas ya tiene una, **Clima** (`WEATHER_CHECK_REQUIRED`, **Cuándo** `time.part.morning`), que se tira en _El cielo sencillo_ de Core. En **Comprobaciones**, despliégala y, en **Se tira en**, elige _Cielos del valle_ en _Clima con inercia_. (Un sistema sin ella: **Añadir una comprobación** con **Cuándo** `time.part.morning`, el calendario de las Reglas genéricas, cuyo día empieza con la mañana; una hora como `06:00` también vale.)
6. **Lo que le hace al viaje**: en **Reglas → Clima**, la copia ya frena `rain` (**Velocidad ×** `0.75`), `storm` y `snow` (`0.5`): pon `storm` a `0`, un día sin viaje. En **Reglas → Valores del día**, añade `deep-snow`, con nombre _Nieve profunda_ y **Bloquea** `modes.horse`.
7. **Pruébalo**: en **Pruébalo**, haz un camino largo, empieza un viaje en verano y marcha día tras día; luego empieza uno en invierno.

**Lo que verás.** Cada mañana el diario dice _Clima: Despejado_ (o _Lluvia_, _Nieve_…), con lo que fija para el día, y el panel del viaje muestra el clima de hoy. En verano casi todos los días están despejados y una racha de lluvia dura unos días; con lluvia el grupo recorre tres cuartos de lo que haría con el cielo despejado. Un día de tormenta la marcha no puede empezar (_El clima impide viajar_) y el día siguiente está despejado o llueve, nunca otra tormenta. En invierno el clima se mueve una casilla al día: la nieve dura, despeja poco a poco y de vez en cuando llega una tormenta. Un día de nieve el grupo viaja a media velocidad y no se puede elegir **A caballo** (dice que es por la _Nieve profunda_); a pie el viaje sigue.

## Lo mismo en YAML

El modelo, como lo muestra la pestaña **YAML**:

```yaml
kind: weather
id: weather
name: Cielos del valle
states:
  clear: { name: Despejado }
  rain: { name: Lluvia }
  storm: { name: Tormenta }
  snow: { name: Nieve, set: { deep-snow: true } } # paso 2
seasons:
  spring:
    start: clear
    next:
      clear: { clear: 3, rain: 1 }
      rain: { rain: 2, clear: 1, storm: 1 }
      storm: { rain: 2, clear: 1 }
  summer: # paso 3
    start: clear
    next:
      clear: { clear: 5, rain: 1 }
      rain: { rain: 2, clear: 2, storm: 1 }
      storm: { clear: 2, rain: 1 }
  autumn:
    start: clear
    next:
      clear: { clear: 3, rain: 1 }
      rain: { rain: 2, clear: 1, storm: 1 }
      storm: { rain: 2, clear: 1 }
  winter: # paso 4
    flower:
      start: snow
      rows:
        - [storm, storm, snow]
        - [snow, snow, snow, rain]
        - [snow, rain, snow, rain, clear]
        - [rain, clear, rain, clear]
        - [clear, clear, clear]
```

Y lo que los pasos 5 y 6 añaden a las reglas de viaje y a los bindings (un extracto: el resto de las reglas sigue como estaba):

```yaml
# reglas de viaje
weather: { rain: { speed: 0.75 }, storm: { speed: 0 }, snow: { speed: 0.5 } } # paso 6: storm
values:
  deep-snow: { name: Nieve profunda, blocks: [modes.horse] }
checks:
  - { event: WEATHER_CHECK_REQUIRED, name: Clima, at: time.part.morning } # copiada
  # … las demás comprobaciones
# bindings
on:
  WEATHER_CHECK_REQUIRED: { weather: weather.weather } # paso 5: era core/weather.default
```

Las Marcas Grises usan un modelo como este con más climas (cielo gris, niebla), tablas de probabilidad en tres estaciones y una flor hexagonal en invierno: su [página](../packs/02-grey-marches.md) dice dónde.

## Errores habituales

- **El viaje no tiene clima.** Ninguna comprobación tira el modelo: un modelo solo se juega cuando el **Se tira en** de una comprobación lo nombra (paso 5). La pestaña Clima, por sí sola, no tira nada.
- **El clima de las Reglas genéricas en vez del tuyo.** La comprobación **Clima** copiada sigue tirando _El cielo sencillo_ de Core (despejado, nublado, lluvia, tormenta, nieve): elige tu modelo en su **Se tira en** (paso 5).
- **Un clima que no frena a nadie.** Un clima que la lista de **Reglas → Clima** no nombra mantiene la velocidad de siempre; y un valor que fija no hace nada hasta que algo lo lee (un valor del día que **Bloquea**, una condición, una tabla).
- **Una condición que nunca se cumple.** Las condiciones leen el **id** del clima, no su nombre: `trip.weather: storm`, no `trip.weather: Tormenta`.
- **Una comprobación que ve el clima de ayer.** Las comprobaciones de un mismo momento llegan una a una, en el orden de la lista, y cada una ve lo que fijaron las anteriores: una comprobación cuyo **Solo si** / **Salvo si** lee el clima (`trip.weather: rain`) solo ve el de hoy si va después de la del clima en la lista (o en un momento posterior). Antes que ella, todavía ve el de ayer.
- **Dos comprobaciones que tiran el modelo.** Cada tirada avanza el clima un día: tirado dos veces al día, cambia el doble de rápido. Una comprobación, una vez al día.
- **Todas las estaciones se juegan igual.** Las estaciones del modelo tienen que llamarse como las del calendario (`summer`, no `Summer`); una estación que el modelo no conoce usa su primera estación.
- **Un clima que nunca dura.** Su fila no tiene peso para sí mismo (la tormenta de arriba, a propósito); o su fila está vacía, y el día siguiente vuelve a empezar desde **Empieza como**.
- **Una flor atascada en una esquina.** Con **En el borde** en **se queda**, el clima se amontona donde lo empujan las tiradas más comunes: el invierno del ejemplo con **se queda** está despejado el 89 % del tiempo, porque los días se hunden hasta la fila de abajo y se quedan ahí. Deja **vuelve por el lado opuesto**, o pon abajo lo que la estación debería ser casi siempre.
- **Una flor que salta.** Con **vuelve por el lado opuesto**, los vecinos de la fila de abajo son los de la fila de arriba: un día que se cae por el fondo despejado del ejemplo aterriza en las tormentas de arriba. Así es como sus tormentas rompen una racha de buen tiempo; si una estación no debería hacerlo, pon en los bordes de arriba y de abajo climas que puedan seguirse.

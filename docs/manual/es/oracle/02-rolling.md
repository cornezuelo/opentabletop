# Tirar

Abre una definición y pulsa **Tirar** (o **Robar** en un mazo). <kbd>Espacio</kbd> o <kbd>Intro</kbd> vuelven a tirar.

**Tirar** lanza los dados sobre una mesa en el centro de la pantalla: solos mientras tira el ordenador (**Quién tira los dados** en **Preferencias**), para verlos caer, y el resultado aparece un momento después de que se paren (un clic, **Saltar**, <kbd>Espacio</kbd> o <kbd>Intro</kbd> lo muestran al instante); en tu mano para lanzarlos cuando tiras tú (abajo). Con **Los dados ruedan al tirarlos** apagado, o si tu sistema pide menos movimiento, el resultado sale al momento.

Una tabla tirada contra un número (una habilidad, una probabilidad: [Tirada contra un número](08-dice-and-templates.md#tirada-contra-un-número)) dice en la mesa de dados lo que necesita (_Necesitas 40 o menos_) y cómo fue al pararse (_Éxito_, _Fallo_); su tarjeta de resultado lo dice bajo los dados (_Contra 40: Éxito_).

Un valor que necesita una tirada y que solo tiene un viaje o un mapa (un dado cuyo tamaño es el _Dado de hallazgos_ del mapa, `1d{{map.values.finds}}`, o el desgaste de una pieza) se pide en **Contexto**, con su casilla marcada, y **Tirar** lo espera (_Para tirarla, pon: Dado de hallazgos_) en vez de fallar. Un nombre con una parte entre corchetes (`acting.items[params.piece].wear`) se da entero.

Cuando tiras tus propios dados (**Quién tira los dados**, en **Preferencias**, en algo que no sea _Tira el ordenador_), **Tirar** te pone sus dados en la mano sobre una mesa en el centro de la pantalla: arrástralos y suéltalos (o pulsa la mesa) y salen volando, rebotan y ruedan hasta pararse en lo que ha salido: los dados que se pidieron (el `1d6` de la tabla), nunca los que su fila tira dentro (un `{{1d3}}` de daño), que su tarjeta muestra después; **Ver el resultado** lo muestra (**Cerrar** también). Si tira el ordenador, o con **Los dados ruedan al tirarlos** desmarcado, el resultado sale al instante.

## El resultado

La tarjeta del resultado muestra el texto, los valores que fija la entrada (p. ej. `weather: storm`), los dados de cada tirada, dibujados: cada dado con su sólido y su cara, iluminado desde arriba, y, mientras sigue en tu mano antes de lanzarlo, lo que es escrito en el sitio de su cara (_d6_) (de d4 a d20, el d% como un d10 que marca `00`–`99`, los dados Fudge como `+`, `−` o en blanco, un d66 como sus dos d6, un d2 como una moneda; un dado sin sólido propio como el que se usa en la mesa para tirarlo: un d3 como un d6, un d5 como un d10, cualquier otro como el más pequeño con caras suficientes, así que un d7 es un d8 que pone _d7_ en la mano). Mientras ruedan, sus caras pasan solo por las que tienen, nunca un 6 en un d3, los que deja fuera un «quedarse con» atenuados y con borde discontinuo (`4d6kh3`, ventaja), las caras de un dado que explota encadenadas (`6 + 6 + 2`), lo que se suma (`+1`) y el total; las otras tiradas de un modo de tirar, pequeñas y atenuadas al lado. Lo que la fila tira dentro (un `{{1d3}}` de daño, los `{{2d6}}` de cuántos vienen) va después de la tirada de la tabla, más pequeño, bajo _en el resultado_: una tabla de `1d6` es siempre un dado, y los dados de su fila aparte. Una tirada recién hecha rueda un momento (**Los dados ruedan al tirarlos**, en **Preferencias**, lo quita; nunca se mueven si tu sistema reduce el movimiento). Después, en **Detalles**, el resultado de cada tabla por la que pasó la tirada. La entrada que salió se resalta en la lista de abajo.

## Contexto

Algunas definiciones leen valores: el terreno, la estación, un modificador… El recuadro **Contexto** lista los que necesita una definición (o cualquier tabla que tire), por su nombre (_Fiestas_, _Guardias_…), con lo que es cada uno y su clave (`{{icon.guards}}`) en su ayuda (pulsa su nombre subrayado con puntos), y los valores que aparecen en sus condiciones como sugerencias. Las aplicaciones nombran los valores que dan los mapas y los viajes; un sistema nombra sus características y los demás valores que leen sus tablas (`reads:` en sus bindings, mira [Conectar](07-connecting.md)). En blanco significa desconocido. La entrada de un oráculo (p. ej. la probabilidad) es aquí una lista.

En Mapa estos valores vienen del mapa y del viaje; consulta [Oráculo en el mapa](../map/09-oracle.md).

Con un contexto, las entradas que no pueden salir con él (su `when` / `unless` no se cumple: un encuentro nocturno de día, uno de pantano en las colinas) salen de la lista a una línea plegada bajo ella, _3 más que aquí no pueden salir_, que se abre para verlas; la entrada que salió siempre queda a la vista. Una condición que tira dados (`place.danger: { lt: '{{1d6}}' }`) puede cumplirse o no, así que su entrada se queda. Sin nada escrito, se ven todas.

## Modos de tirada (ventaja y otros)

Algunas tablas se pueden tirar de más de una forma: un **modo de tirada** tira toda la tirada varias veces y se queda con un total. Qué modos hay, cómo se llaman y qué hacen lo decide cada sistema: Core tiene **Ventaja** (dos veces, el más alto) y **Desventaja** (dos veces, el más bajo); las Marcas Grises añaden **Con cuidado** (tres veces, el del medio) para el vado. Una tabla que ofrece modos muestra una opción junto a **Tirar**; su ayuda (pulsa **Modo de tirada**) dice qué hace cada uno. La tarjeta del resultado muestra los totales que no se quedaron.

Algunas tablas además usan un modo **por sí solas** cuando se cumple una condición, tanto si las tiras a mano como si las tira un viaje. En las Marcas Grises, _¿Nos perdemos?_ se tira con ventaja con el cielo despejado y con desventaja el día después de perderse; con las dos, se anulan y es una tirada normal. Cómo declarar los modos y usarlos: [Tipos de definición](../technical/07-kinds.md#modos-de-tirada).

## Probabilidades

**Probabilidades**, junto a **Entradas**, muestra lo probable que es cada entrada **con el contexto que escribiste y el modo de tirada elegido**: la tabla se tira unos miles de veces como en juego, así que cuentan las condiciones, los rangos, los pesos y los modos (los límites como `once`, no: cada tirada empieza de cero); es una estimación, con un margen de un uno por ciento o así. Una última línea dice cuántas veces no sale ninguna entrada, si pasa. Con dados, unas barras sobre las entradas muestran lo probable que es cada total, exacto.

Cambia el contexto o el modo y las probabilidades lo siguen: en _¿Quién va?_ de las Marcas Grises, escribe `forest` en el terreno y `3` en el peligro para ver que los lobos salen más; en _Reacción_, elige **Ventaja** para ver crecer las respuestas amistosas.

## Mazos y entradas de una vez

Un mazo muestra cuántas cartas quedan y tiene **Barajar**. Una carta robada **se muestra como carta** cuando su mazo le da cara: el tarot de Core con sus ilustraciones de 1909 (boca abajo cuando sale del revés), las barajas de póker y española con su índice y su palo, las runas, el Lenormand y el dominó dibujados; una mano queda en fila, y una tirada como en la mesa (la cruz celta en cruz y una columna; pasa el puntero por una carta para leerla). El diario de un viaje las dibuja en pequeño junto a su línea. Un mazo sin caras se cuenta con su texto, como antes ([Tipos de definición](../technical/07-kinds.md#mazos)). Un generador también puede robar de un mazo, y las manos y tiradas de Core (_Mano de póker_, _Tirada de tres cartas_…) lo barajan antes: cada una empieza del mazo entero. Las entradas marcadas `once` solo pueden salir una vez. **Nueva sesión** (en el historial) olvida ambas cosas: todas las cartas vuelven al mazo y las entradas de una vez vuelven a estar disponibles. **Borrar** vacía el historial.

## Tirar en una campaña

Tus tiradas guardan sus mazos, sus resultados de una sola vez y su historial en **la campaña en la que juegas**: la que dice **Jugando** en la barra de arriba, la misma en todas las aplicaciones ([La campaña en la que juegas](../campaign/01-getting-started.md#la-campaña-en-la-que-juegas)); **Campaña**, arriba del historial, dice cuál. Haz clic en **Jugando** para elegir otra, o en **No jugar en ninguna campaña** para los propios del Oráculo, en este navegador. Abrir un mapa o un viaje en otra aplicación también la cambia, y el Oráculo la sigue. En una campaña tiras en su mundo: una carta que robas aquí ya no está en el mazo para los viajes de ese mapa, un resultado de una sola vez que salió allí no sale aquí, y el historial es el que muestra el panel del Oráculo del mapa. **Nueva sesión** y **Borrar** actúan entonces sobre los de la campaña. Cuando el mapa o un viaje la cambian en otra ventana, el Oráculo la vuelve a leer. Tu semilla sigue siendo la de este navegador en ambos casos. En una campaña, **Abrir en Campaña ↗**, debajo, la muestra en la aplicación [Campaña](../campaign/01-getting-started.md).

### Quienes trae un resultado: una escena

Un resultado cuyos efectos traen gente (`present.grey-wolf: 3`: una manada de lobos, una banda de bandidos, alguien que se cruza en el camino) muestra **Abrir una escena ↗** debajo mientras tiras en una campaña: abre la aplicación [Campaña](../campaign/01-getting-started.md) en una **escena** nueva de esa campaña con ellos, hechos con el bestiario del sistema, cada uno con sus propios valores tirados, frente al elenco de la campaña. Allí luchas con ellos, por turnos si los combates del sistema van por turnos. Sin campaña, dice que una escena necesita una. Tirados aquí, son solo palabras: no se hace nada hasta que se abre la escena.

Una escena es un momento jugado donde está el grupo, no un viaje: [Viajes y escenas](../campaign/03-trips-and-scenes.md).

## Tiradas repetibles

En **Preferencias** (el engranaje), **Semilla de las tiradas** hace las tiradas repetibles: con la misma semilla, las mismas tiradas en el mismo orden dan los mismos resultados. El historial muestra la semilla mientras está puesta.

- Escribe `marcas-grises-1`, tira unas cuantas tablas y pulsa **Nueva sesión**: al volver a tirar las mismas tablas salen los mismos resultados.
- Comparte la semilla y las tablas que tiraste, y otra persona podrá repetir tu sesión.
- Vacía la casilla para volver a tirar al azar.

La semilla y por dónde va su secuencia se guardan con el historial, así que al recargar sigues donde estabas. La línea de comandos también acepta una semilla (`--seed`, mira [Trabajar sin la interfaz](../technical/03-without-the-ui.md)).

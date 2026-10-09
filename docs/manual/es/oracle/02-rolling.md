# Tirar

Abre una definición y pulsa **Tirar** (o **Robar** en un mazo). <kbd>Espacio</kbd> o <kbd>Intro</kbd> vuelven a tirar.

## El resultado

La tarjeta del resultado muestra el texto, los valores que fija la entrada (p. ej. `weather: storm`), los dados con cada tirada (los descartados, tachados) y, en **Detalles**, el resultado de cada tabla por la que pasó la tirada. La entrada que salió se resalta en la lista de abajo.

## Contexto

Algunas definiciones leen valores: el terreno, la estación, un modificador… El recuadro **Contexto** lista los que necesita una definición (o cualquier tabla que tire), por su nombre (_Fiestas_, _Guardias_…), con lo que es cada uno y su clave (`{{icon.guards}}`) en su ayuda (pulsa su nombre subrayado con puntos), y los valores que aparecen en sus condiciones como sugerencias. Las aplicaciones nombran los valores que dan los mapas y los viajes; un sistema nombra sus características y los demás valores que leen sus tablas (`reads:` en sus bindings, mira [Conectar](07-connecting.md)). En blanco significa desconocido. La entrada de un oráculo (p. ej. la probabilidad) es aquí una lista.

En el Hexmapper estos valores vienen del mapa y del viaje; consulta [Oracle en el mapa](../hexmapper/09-oracle.md).

## Modos de tirada (ventaja y otros)

Algunas tablas se pueden tirar de más de una forma: un **modo de tirada** tira toda la tirada varias veces y se queda con un total. Qué modos hay, cómo se llaman y qué hacen lo decide cada sistema: Core tiene **Ventaja** (dos veces, el más alto) y **Desventaja** (dos veces, el más bajo); las Marcas Grises añaden **Con cuidado** (tres veces, el del medio) para el vado. Una tabla que ofrece modos muestra una opción junto a **Tirar**; su ayuda (pulsa **Modo de tirada**) dice qué hace cada uno. La tarjeta del resultado muestra los totales que no se quedaron.

Algunas tablas además usan un modo **por sí solas** cuando se cumple una condición, tanto si las tiras a mano como si las tira un viaje. En las Marcas Grises, _¿Nos perdemos?_ se tira con ventaja con el cielo despejado y con desventaja el día después de perderse; con las dos, se anulan y es una tirada normal. Cómo declarar los modos y usarlos: [Tipos de definición](../technical/07-kinds.md#modos-de-tirada).

## Probabilidades

**Probabilidades**, junto a **Entradas**, muestra lo probable que es cada entrada **con el contexto que escribiste y el modo de tirada elegido**: la tabla se tira unos miles de veces como en juego, así que cuentan las condiciones, los rangos, los pesos y los modos (los límites como `once`, no: cada tirada empieza de cero); es una estimación, con un margen de un uno por ciento o así. Una última línea dice cuántas veces no sale ninguna entrada, si pasa. Con dados, unas barras sobre las entradas muestran lo probable que es cada total, exacto.

Cambia el contexto o el modo y las probabilidades lo siguen: en _¿Quién va?_ de las Marcas Grises, escribe `forest` en el terreno y `3` en el peligro para ver que los lobos salen más; en _Reacción_, elige **Ventaja** para ver crecer las respuestas amistosas.

## Mazos y entradas de una vez

Un mazo muestra cuántas cartas quedan y tiene **Barajar**. Las entradas marcadas `once` solo pueden salir una vez. **Nueva sesión** (en el historial) olvida ambas cosas: todas las cartas vuelven al mazo y las entradas de una vez vuelven a estar disponibles. **Borrar** vacía el historial.

## Tiradas repetibles

En **Preferencias** (el engranaje), **Semilla de las tiradas** hace las tiradas repetibles: con la misma semilla, las mismas tiradas en el mismo orden dan los mismos resultados. El historial muestra la semilla mientras está puesta.

- Escribe `marcas-grises-1`, tira unas cuantas tablas y pulsa **Nueva sesión**: al volver a tirar las mismas tablas salen los mismos resultados.
- Comparte la semilla y las tablas que tiraste, y otra persona podrá repetir tu sesión.
- Vacía la casilla para volver a tirar al azar.

La semilla y por dónde va su secuencia se guardan con el historial, así que al recargar sigues donde estabas. La línea de comandos también acepta una semilla (`--seed`, mira [Trabajar sin la interfaz](../technical/03-without-the-ui.md)).

# Tirar

Abre una definición y pulsa **Tirar** (o **Robar** en un mazo). <kbd>Espacio</kbd> o <kbd>Intro</kbd> vuelven a tirar.

## El resultado

La tarjeta del resultado muestra el texto, los valores que fija la entrada (p. ej. `weather: storm`), los dados con cada tirada (los descartados, tachados) y, en **Detalles**, el resultado de cada tabla por la que pasó la tirada. La entrada que salió se resalta en la lista de abajo.

## Contexto

Algunas definiciones leen valores: el terreno, la estación, un modificador… El recuadro **Contexto** lista los que necesita una definición (o cualquier tabla que tire), por su nombre (_Fiestas_, _Guardias_…), con lo que es cada uno y su clave (`{{icon.guards}}`) en su **i**, y los valores que aparecen en sus condiciones como sugerencias. Las aplicaciones nombran los valores que dan los mapas y los viajes; un sistema nombra sus características y los demás valores que leen sus tablas (`reads:` en sus bindings, mira [Conectar](07-connecting.md)). En blanco significa desconocido. La entrada de un oráculo (p. ej. la probabilidad) es aquí una lista.

En el Hexmapper estos valores vienen del mapa y del viaje; consulta [Oracle en el mapa](../hexmapper/09-oracle.md).

## Modos de tirada (ventaja y otros)

Algunas tablas se pueden tirar de más de una forma: un **modo de tirada** tira toda la tirada varias veces y se queda con un total. Qué modos hay, cómo se llaman y qué hacen lo decide cada sistema: Core y Kal-Arath tienen **Ventaja** (dos veces, el más alto) y **Desventaja** (dos veces, el más bajo); las Marcas Grises añaden **Con cuidado** (tres veces, el del medio) para el vado. Una tabla que ofrece modos muestra una opción junto a **Tirar**; su **i** dice qué hace cada uno. La tarjeta del resultado muestra los totales que no se quedaron.

Algunas tablas además usan un modo **por sí solas** cuando se cumple una condición, tanto si las tiras a mano como si las tira un viaje. En las Marcas Grises, _¿Nos perdemos?_ se tira con ventaja con el cielo despejado y con desventaja el día después de perderse; con las dos, se anulan y es una tirada normal. El Explorador de Kal-Arath funciona igual. Cómo declarar los modos y usarlos: [Tipos de definición](../technical/07-kinds.md#modos-de-tirada).

## Mazos y entradas de una vez

Un mazo muestra cuántas cartas quedan y tiene **Barajar**. Las entradas marcadas `once` solo pueden salir una vez. **Nueva sesión** (en el historial) olvida ambas cosas: todas las cartas vuelven al mazo y las entradas de una vez vuelven a estar disponibles. **Borrar** vacía el historial.

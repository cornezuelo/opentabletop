# Tirar

Abre una definición y pulsa **Tirar** (o **Robar** en un mazo). <kbd>Espacio</kbd> o <kbd>Intro</kbd> vuelven a tirar.

## El resultado

La tarjeta del resultado muestra el texto, los valores que fija la entrada (p. ej. `weather: storm`), los dados con cada tirada (los descartados, tachados) y, en **Detalles**, el resultado de cada tabla por la que pasó la tirada. La entrada que salió se resalta en la lista de abajo.

## Contexto

Algunas definiciones leen valores: el terreno, la estación, un modificador… El recuadro **Contexto** lista los que necesita una definición (o cualquier tabla que tire), con los valores que aparecen en sus condiciones como sugerencias. En blanco significa desconocido. La entrada de un oráculo (p. ej. la probabilidad) es aquí una lista.

En el Hexmapper estos valores vienen del mapa y del viaje; consulta [Oracle en el mapa](../hexmapper/09-oracle.md).

## Ventaja y desventaja

Las tablas que su sistema tira así (indican `advantage: true`) ofrecen **Normal / Ventaja / Desventaja**: tirar dos veces y quedarse con el total más alto o el más bajo.

Algunas tablas además toman ventaja o desventaja **por sí solas** cuando se cumple una condición (`advantageWhen`, `disadvantageWhen`), tanto si las tiras a mano como si las tira un viaje. En las Marcas Grises, _¿Nos perdemos?_ se tira con ventaja con el cielo despejado (`advantageWhen: { weather: clear }`) y con desventaja el día después de perderse (`disadvantageWhen: { yesterday.lost: true }`); con las dos, se anulan y es una tirada normal. El Explorador de Kal-Arath funciona igual (`advantageWhen: { explorer: { gte: 1 } }`, con `explorer` una característica del grupo). El formulario las tiene bajo los dados como **Ventaja cuando** / **Desventaja cuando**, con las mismas condiciones de una línea que las entradas.

## Mazos y entradas de una vez

Un mazo muestra cuántas cartas quedan y tiene **Barajar**. Las entradas marcadas `once` solo pueden salir una vez. **Nueva sesión** (en el historial) olvida ambas cosas: todas las cartas vuelven al mazo y las entradas de una vez vuelven a estar disponibles. **Borrar** vacía el historial.

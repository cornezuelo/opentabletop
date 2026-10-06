# Jugar un viaje

Aquí los viajes **no tienen mapa**: describes hex a hex el camino que tienes por delante. Es rápido para un viaje que solo necesitas a grandes rasgos, o para probar un sistema mientras lo escribes. Para viajar sobre un mapa, usa el [modo Jugar](../hexmapper/08-play.md) del Hexmapper: es el mismo motor y los mismos sistemas.

## Empezar

Elige un sistema a la izquierda y abre **Jugar**. Elige la estación en la que empezar y pulsa **Empezar un viaje**. Solo se guarda un viaje a la vez (en este navegador); empezar otro con un sistema distinto pregunta antes, porque se descartan el actual y su diario.

## El camino

La lista de la izquierda es el camino. El grupo empieza en el hex 1 y se dirige al último.

- **Terreno** de cada hex: los terrenos del Hexmapper más los que nombren las reglas del sistema.
- **Etiquetas**, separadas por comas. Las tablas y las comprobaciones las leen: las Marcas Grises se detienen en los hexes `landmark`, cobran peaje en los `toll` y tienen luces nocturnas en los `haunted`.
- Debajo de cada hex, **Al siguiente hex**: si un camino, un sendero o un río lo une con el siguiente. Lo que eso hace depende del sistema (en las Marcas Grises, los caminos son más rápidos y evitan perderse y los encuentros).
- **km por hex**: la escala. Las velocidades de las reglas van en km por día.
- **Añadir un hex** alarga el camino; **×** quita uno al que el grupo aún no ha llegado. Los hexes ya recorridos salen atenuados y no se pueden cambiar.

Cambiar el camino vuelve a planear la ruta al momento.

## El viaje

El panel de la derecha es el mismo que en el Hexmapper: día, hora y estación, el clima, las horas de marcha gastadas, el modo de viaje, las provisiones, la fatiga y las características del grupo que declare el sistema (p. ej. el Carisma, la Supervivencia y la Orientación de las Marcas Grises, que se suman a las tiradas). Los botones son las acciones que declara el sistema: **Viajar** (hasta que pase algo o acabe el día), **1 hex**, **Acampar**, **Descansar**…

Las comprobaciones se tiran en sus tablas y se apuntan en el **diario**, agrupadas por día. Una comprobación sin tabla (como los lugares señalados de las Marcas Grises) te espera: resuélvela tú y pulsa **Continuar**.

El viaje se guarda en el navegador mientras juegas, y sigue ahí cuando vuelves.

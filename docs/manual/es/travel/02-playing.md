# Jugar un viaje

Aquí los viajes **no tienen mapa**: describes hex a hex el camino que tienes por delante. Es rápido para un viaje que solo necesitas a grandes rasgos, o para probar un sistema mientras lo escribes. Para viajar sobre un mapa, usa el [modo Jugar](../hexmapper/08-play.md) del Hexmapper: es el mismo motor y los mismos sistemas.

## Empezar

Elige un sistema a la izquierda y abre **Jugar**. Elige la estación en la que empezar y pulsa **Empezar un viaje**.

Puedes tener varios viajes (en este navegador), cada uno con su sistema, su camino y su diario. Arriba, **Viaje** abre otro (se abre con él la página de su sistema), **Nombre** le pone nombre al viaje abierto (los que no tienen muestran su sistema y día), **Otro viaje** empieza uno más con este sistema y estación (los demás se conservan), y **Borrar** quita el abierto. **Nuevo viaje**, bajo el sistema y la estación, vuelve a empezar el viaje abierto desde cero; pregunta antes si su diario tiene algo.

## El camino

La lista de la izquierda es el camino. El grupo empieza en el hex 1 y se dirige al último. Sus columnas tienen una cabecera con una **i** que explica cada una.

- **Terreno** de cada hex: los terrenos del Hexmapper más los que nombren las reglas del sistema.
- **Etiquetas**, separadas por comas. Las tablas y las comprobaciones las leen: las Marcas Grises se detienen en los hexes `landmark`, cobran peaje en los `toll` y tienen luces nocturnas en los `haunted`.
- Debajo de cada hex, **Al siguiente hex**: si un camino, un sendero o un río lo une con el siguiente. Lo que eso hace depende del sistema (en las Marcas Grises, los caminos son más rápidos y evitan perderse y los encuentros).
- **km por hex**: la escala. Las velocidades de las reglas van en km por día.
- **Añadir un hex** alarga el camino; **×** quita uno al que el grupo aún no ha llegado. Los hexes ya recorridos salen atenuados y no se pueden cambiar.

Cambiar el camino vuelve a planear la ruta al momento.

## El viaje

El panel de la derecha es el mismo que en el Hexmapper: día, hora y estación, el clima, las horas de marcha gastadas, el modo de viaje, las provisiones, la fatiga y las características del grupo que declare el sistema (p. ej. el Carisma, la Supervivencia y la Orientación de las Marcas Grises, que se suman a las tiradas). Los botones son las acciones que declara el sistema: **Viajar** (hasta que pase algo o acabe el día), **1 hex**, **Acampar**, **Descansar**…

Las comprobaciones se tiran en sus tablas y se apuntan en el **diario**, agrupadas por día. **Exportar** descarga todo el diario en Markdown (un título por día, con el nombre del viaje) para tu aplicación de notas o para imprimir. Una comprobación sin tabla (como los lugares señalados de las Marcas Grises) te espera: resuélvela tú y pulsa **Continuar**.

Lo que cuenta el diario, para que nada pase en silencio:

- **Resultados con lo que han cambiado**: «Buscar comida: Bayas y raíces para un día (Comida +1)», «Peaje: El guarda del puente se cobra un día de comida (Comida −1)», «Perderse: Perdidos en la niebla: hoy no avanzáis (perdidos por hoy)».
- **Acciones** con lo que han durado, y cuándo no se ha tirado nada: en las Marcas Grises, **Buscar comida** en colinas dice «Buscar comida (3 h): no hay nada que buscar en colinas: solo los bosques, campos, brezales y marismas dan comida». Las tres horas pasan igual y la marcha sigue a la mitad.
- **Provisiones** consumidas al acabar cada día («Provisiones del día: Comida −1 (quedan 4)»), cuando se acaban («Sin Comida») y los cambios de **fatiga** con su motivo («Sin comida suficiente: fatiga +1 (ahora 2)», «Una noche bien comidos: fatiga −1 (ahora 1)», «El descanso: fatiga −1 (ahora 0)»).

El viaje se guarda en el navegador mientras juegas, y sigue ahí cuando vuelves. Una [copia de seguridad](../technical/05-backups.md) lo lleva a otro ordenador.

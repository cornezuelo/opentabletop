# Jugar un viaje

Aquí los viajes **no tienen mapa**: describes hex a hex el camino que tienes por delante. Es rápido para un viaje que solo necesitas a grandes rasgos, o para probar un sistema mientras lo escribes. Para viajar sobre un mapa, usa el [modo Jugar](../hexmapper/08-play.md) del Hexmapper: es el mismo motor y los mismos sistemas.

## Empezar

Elige un sistema a la izquierda y abre **Jugar**. Elige la estación en la que empezar y pulsa **Empezar un viaje**.

Puedes tener varios viajes (en este navegador), cada uno con su sistema, su camino y su diario. Arriba, **Viaje** abre otro (se abre con él la página de su sistema), **Nombre** le pone nombre al viaje abierto (los que no tienen muestran su sistema y día), **Otro viaje** empieza uno más con este sistema y estación (los demás se conservan), y **Borrar** quita el abierto. **Nuevo viaje**, bajo el sistema y la estación, vuelve a empezar el viaje abierto desde cero; pregunta antes si su diario tiene algo. Si abres la pestaña **Jugar** de otro sistema con un viaje abierto, dice qué sistema usa ese viaje («El viaje abierto usa Las Marcas Grises.»), con **Empezar un viaje con …** para empezar uno más con este sistema (el abierto se conserva: **Viaje** vuelve a él).

## El camino

La lista de la izquierda es el camino. El grupo empieza en el hex 1 y se dirige al último. Las cabeceras de sus columnas están subrayadas con puntos: pulsa una para leer qué es.

- **Terreno** de cada hex: los terrenos del Hexmapper más los que nombren las reglas del sistema.
- **Etiquetas**, separadas por comas. Las tablas y las comprobaciones las leen: las Marcas Grises se detienen en los hexes `landmark`, cobran peaje en los `toll` y tienen luces nocturnas en los `haunted`.
- Debajo de cada hex, **Al siguiente hex**: si un camino, un sendero o un río lo une con el siguiente. Lo que eso hace depende del sistema (en las Marcas Grises, los caminos son más rápidos y evitan perderse y los encuentros).
- **km por hex**: la escala. Las velocidades de las reglas van en km por día. Un sistema que fija su propia escala (`travel.hexKm`) se juega siempre a ella: la caja la muestra y aquí no se cambia (se cambia en Systems → Reglas).
- **Añadir un hex** alarga el camino; **×** quita uno al que el grupo aún no ha llegado. Los hexes ya recorridos salen atenuados y no se pueden cambiar.

Cambiar el camino vuelve a planear la ruta al momento.

## El viaje

El panel de la derecha es el mismo que en el Hexmapper: día, hora y estación, el clima, las horas de marcha gastadas, la forma de viajar, las provisiones y las características del grupo que declare el sistema (p. ej. el Carisma, la Supervivencia y la Orientación de las Marcas Grises, que se suman a las tiradas, y su Moral, Fatiga y Mercenarios, que cambian con lo que pasa). **Viajar** (o el nombre que el sistema da a su marcha, como **Marchar** en las Marcas Grises) marcha hasta que pase algo o acabe el día, **1 hex** solo hasta el hex siguiente; los demás botones son las acciones que declara el sistema (las Marcas Grises: **Acampar**, **Descansar**, **Buscar comida**, **Marcha forzada**, y solo cuando se pueden hacer **Marcha nocturna**, **Rito de la Luna Ascua**, **Hablar con los mercenarios** e **Historias del camino**). Las acciones que hace el propio sistema (comer al acabar cada día) no son botones: simplemente ocurren, y el diario lo cuenta.

Encima del diario, **Hasta ahora** resume el viaje: hexes y km recorridos, horas de marcha; ábrelo para ver las comprobaciones que han salido, cuántas veces se ha hecho cada acción y lo gastado y obtenido de cada provisión. Las reglas y tablas del sistema también lo leen (`trip.km: { gte: 100 }`, `trip.taken.camp`, `trip.spent.food`: ver [Lo que ven las tablas](../technical/04-what-tables-see.md#el-viaje-trip)). Los viajes guardados antes de que existiera sacan del diario sus hexes y acciones; el resto cuenta desde entonces.

Las comprobaciones se tiran en sus tablas y se apuntan en el **diario**, agrupadas por día. **Exportar** descarga todo el diario en Markdown (un título por día, con el nombre del viaje) para tu aplicación de notas o para imprimir. Una comprobación sin tabla solo se apunta en el diario (con lo que cambie, si cambia algo) y el viaje sigue, salvo que diga que pausa. El viaje se detiene y muestra **Continuar** en dos casos:

- una comprobación que dice **Pausar después** (`pause: true`): se tira si una tabla la resuelve, y el viaje espera para que describas el lugar, la resuelvas tú o decidas algo (el santuario de las Marcas Grises, que se tira; sus lugares señalados, sin tabla);
- una entrada de tabla o carta con `pause: true` que sale (la Sierpe del Bosque Gris de las Marcas Grises): solo cuando sale ese resultado.

Hasta que pulses **Continuar**, nada hace avanzar el viaje: marchar, esperar y las acciones aparecen desactivadas (su ayuda dice por qué). Cambiar el destino, la forma de viajar, los personajes o las provisiones a mano sí se puede. Lo que un resultado en pausa hace al viaje (perderse, el clima) se aplica al continuar; sus efectos sobre provisiones y características, enseguida.

**Los botones que no se pueden usar ahora** siguen visibles, desactivados: al pasar el ratón por uno dice por qué. Los bloquea un valor del día que declara el sistema (**Perdidos** en las Marcas Grises: «Perdidos: no es posible el resto del día», hasta el siguiente alba; o **Los mercenarios se niegan a marchar**, hasta que los convenzas), la acción ya se hizo hoy (**Una vez al día**) o la regla del sistema para ella no se cumple aquí y ahora (**Buscar comida** de las Marcas Grises con tormenta o de noche, **Descansar** y **Marcha forzada** de noche, **Marcha forzada** con fatiga 2 o más). Un sistema puede en cambio ocultar el botón de una acción mientras no se puede hacer (**Oculta si no se puede hacer**), para acciones que solo tienen sentido de vez en cuando: el **Rito** de las Marcas Grises solo aparece en un santuario con la Luna Ascua llena, la **Marcha nocturna** solo pasado el anochecer. Acampar, descansar y las acciones propias vienen todas del sistema: uno puede no tener descanso, otro acampar de otra forma (mira [Crear un sistema](../systems/02-making-a-system.md)).

Lo que cuenta el diario, para que nada pase en silencio:

- **Resultados con lo que han cambiado**: «Buscar comida: Bayas y raíces para un día (Comida +1)», «Peaje: El guarda del puente se cobra un día de comida (Comida −1)», «Perderse: Perdidos en la niebla: hoy no avanzáis (Perdidos)».
- **Acciones** con lo que han durado, y cuándo no se ha tirado nada: en las Marcas Grises, **Buscar comida** en colinas dice «Buscar comida (3 h): no hay nada que buscar en colinas: solo los bosques, campos, brezales y marismas dan comida». Las tres horas pasan igual y la marcha sigue a la mitad.
- **Acciones que hace el propio sistema**, como comer al acabar cada día, con lo que cambiaron («Comer (Comida −1)»); un valor que llega a su mínimo o su máximo («Comida no puede bajar de 0») y los cambios de **fatiga** con su motivo («Sin comida suficiente: Fatiga +1»); lo que cambió una acción va en su propia línea («Acampáis para pasar la noche (Fatiga −1)», «Descansáis 2 h (Fatiga −1)»).

## Personajes

Cuando el sistema tiene una hoja para sus personajes (los compañeros de las Marcas Grises; la más pequeña de las reglas Genéricas, con salud y una herida), el viaje tiene una sección **Personajes** encima de las acciones. **Añadir un personaje** crea uno con los valores iniciales de la hoja; ponle nombre, y su id sigue al nombre (`Viejo Tobin` → `viejo-tobin`, como lo alcanzan las tablas y las condiciones: `characters.viejo-tobin.values.health`). Cada personaje se despliega para mostrar sus valores (agrupados como dice la hoja; un contador como casillas: haz clic en una para llenar hasta ella), sus estados (márcalos según pasan) y sus etiquetas (palabras libres, separadas por comas). ↑ lo sube en la lista, × lo quita (tras preguntar).

Cada personaje tiene también **Relaciones**: a qué está unido, según los tipos de la hoja (un vínculo con otro personaje, un hogar): elige el tipo, escribe un nombre de la lista (los demás personajes; en un mapa, sus lugares, regiones y hexes con nombre; en Travel, los hexes del camino) y **Añadir**; un tipo con número lo muestra al lado, para cambiarlo. Las comprobaciones del sistema las leen allí donde está el grupo (las Marcas Grises: llegar al hogar de un compañero sube la moral).

**Roles**, cuando el sistema declara roles de viaje, da cada tarea a un personaje hasta que la cambies: el **Guía** de las Marcas Grises (con Rastreo 2 o más, perderse se tira con ventaja) y el **Vigía** (con Sigilo 2 o más, el campamento sigue oculto donde el peligro es menor de 3).

**Actúa** dice quién hace ahora las acciones del grupo: lo que un sistema escribe para `acting` le llega a ese personaje (en las Marcas Grises, las rocas de un vado hieren y tuercen el tobillo de quien guía el cruce; **Curar a los heridos** solo funciona si quien actúa tiene Supervivencia 2 o más). Con **Nadie**, esos efectos no cambian nada y el diario lo dice: «No actúa nadie, así que «Quien actúa: Tobillo torcido» no cambia nada».

Con personajes, el grupo son sus miembros, como diga el sistema:

- **Las características que salen de las suyas** aparecen en gris y los siguen: la Supervivencia de las Marcas Grises es la mejor de los que no están heridos, el Sigilo el del más torpe, las Bocas cuántos son. Cambia los valores de los personajes, no los del grupo. Las que el sistema guarda para el grupo entero (Moral, Fatiga) se editan como antes.
- **Las provisiones que llevan** muestran su suma, en gris: la comida de las Marcas Grises son las raciones de todos. Lo que el viaje come o encuentra se les quita (o se les da) a ellos, por igual salvo que el sistema diga otra cosa; edita la parte de cada uno en su hoja.
- **Sus estados bloquean** lo que dice la hoja para todo el grupo: un compañero herido impide a las Marcas Grises la marcha forzada, un tobillo torcido marchar («Mara: Tobillo torcido: no es posible mientras dure»), estar molido de la silla montar.
- **Los efectos les llegan**: una noche bien comidos cura a todos los compañeros, las luces embrujadas llenan el pavor de todos; el diario dice a quién («Todos: Salud +1»).

Sin personajes, el mismo sistema juega el grupo como un todo, y lo que dice de los personajes no pasa. Un viaje nuevo con el mismo sistema se lleva a los mismos personajes. La sintaxis, para los sistemas: [Personajes, en Tu propio sistema de viaje](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje).

## Formas de viajar

La lista del panel tiene las formas de viajar que declara el sistema, cada una con su velocidad. Algunas no se pueden elegir en todas partes: **En barca** de las Marcas Grises solo a la orilla o en el transbordador, y solo por agua y costa; **En carro** solo por los caminos (sin camino por delante no hay ruta). Un valor del día puede dejar una atrás: la **Nieve profunda** de las Marcas Grises (la pone la nieve) bloquea **A caballo**, y un grupo que ya va montado se detiene hasta que elijas otra forma (a pie el viaje sigue). Los terrenos también pueden abrirse y cerrarse: los picos de las Marcas Grises solo en verano y no con nieve, sus lagos solo en los dos meses más fríos (se cruzan sobre el hielo); las rutas rodean lo cerrado.

## Un día, paso a paso

Qué pasa y cuándo, con las Marcas Grises de ejemplo (otros sistemas tiran otras cosas, en los mismos momentos):

1. **Alba**: se tiran las comprobaciones del inicio del día: el clima (el cielo sigue al de ayer) y, fuera de caminos y ríos, perderse. Las acciones que hace el sistema al alba van primero (los mercenarios refunfuñan si ayer pasaron hambre).
2. **Marcha**: cada hex en el que se entra tira sus comprobaciones: un encuentro donde el mapa dice que hay peligro, el peaje del Puente de Keld por camino, el vado, el santuario (que pausa), un lugar señalado (sin tabla, pero pausa).
3. **Anochecer**: nadie marcha de noche. **Acampar** (o la acción del sistema para la noche) tira las comprobaciones de la noche: un encuentro nocturno donde el peligro es 2 o más. Acampar necesita comida y fatiga por debajo del Aguante del grupo (10): si no, el botón queda desactivado y **Viajar** pasa la noche a la intemperie («Cae la noche y «Acampar» no es posible (…): la noche pasa sin ello»), sin el alivio de una noche bien comidos, y sigue marchando al alba. **Esperar al alba** deja pasar el tiempo donde está el grupo, pase lo que pase: perdidos y sin comida, el día se pierde y el grupo despierta en el siguiente.
4. **El final del día** (medianoche): las acciones del sistema de fin de día (comer: 1 de comida, 1 más por mercenario, y 1 de forraje a caballo) y sus comprobaciones (un día sin comida suficiente: fatiga +1; acabarlo sin nada de comida, hambre, donde la moral decide cómo va). Los valores de hoy terminan; las tablas de mañana los leen como `yesterday.…`.

Tus propias acciones caben entre medias: **Descansar** dos horas, **Buscar comida** (tres horas, la marcha a la mitad), una **Marcha forzada** (más rápido, más cansados), todas de día; en las Marcas Grises descansar donde el peligro es 3 o más también puede traer un encuentro. Al anochecer, en vez de acampar, una **Marcha nocturna** enciende las antorchas y el grupo puede seguir hasta medianoche (+1 de fatiga); cada hex en el que se entra a oscuras fuera del camino puede haceros perder o traer un encuentro nocturno.

## Se guarda solo

El viaje se guarda en el navegador mientras juegas, y sigue ahí cuando vuelves. Una [copia de seguridad](../technical/05-backups.md) lo lleva a otro ordenador.

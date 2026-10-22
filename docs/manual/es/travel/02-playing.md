# Jugar un viaje

Aquí los viajes **no tienen mapa**: describes hex a hex el camino que tienes por delante. Es rápido para un viaje que solo necesitas a grandes rasgos, o para probar un sistema mientras lo escribes. Para viajar sobre un mapa, usa el [modo Jugar](../hexmapper/08-play.md) del Hexmapper: es el mismo motor y los mismos sistemas.

## Empezar

Elige un sistema a la izquierda y abre **Jugar**. Elige la estación en la que empezar y pulsa **Empezar un viaje**.

Puedes tener varios viajes (en este navegador), cada uno con su sistema, su camino y su diario. Arriba, **Viaje** abre otro (se abre con él la página de su sistema), **Nombre** le pone nombre al viaje abierto (los que no tienen muestran su sistema y día), **Otro viaje** empieza uno más con este sistema y estación (los demás se conservan), y **Borrar** quita el abierto. **Nuevo viaje**, en una línea con el sistema y la estación, vuelve a empezar el viaje abierto desde cero; pregunta antes si su diario tiene algo. **Sistema**, al principio de esa línea, está subrayado con puntos: haz clic para leer qué tiran los viajes del sistema (comprobaciones en tablas, solo en el diario, o ninguna). Si abres la pestaña **Jugar** de otro sistema con un viaje abierto, dice qué sistema usa ese viaje («El viaje abierto usa Las Marcas Grises.»), con **Empezar un viaje con …** para empezar uno más con este sistema (el abierto se conserva: **Viaje** vuelve a él).

## La campaña

Cada viaje se juega en una **campaña**, el mundo en el que ocurre: su sistema, un reloj del mundo, las facciones y el Oráculo (las cartas robadas de cada mazo, los resultados que solo salen una vez). **Campaña**, encima del sistema, dice cuál, y **Abrir en Campaign ↗**, debajo, la muestra en la aplicación [Campaign](../campaign/01-getting-started.md) (su reloj del mundo, su cronología, sus facciones, sus mapas y viajes). Un viaje empieza en una campaña propia (**La suya**), con el nombre del viaje (numerado si otra campaña ya lo tiene), con el sistema del viaje, un mundo en el que no juega nadie más, como siempre tuvieron los viajes sin mapa. Elige otra, como la de un mapa del Hexmapper (aparece con el nombre del mapa), para viajar en el mundo de ese mapa:

- Los días del viaje son los de la campaña: un viaje nuevo empieza en la fecha de la campaña (cuando su reloj del mundo está en marcha, mira [El reloj del mundo](../hexmapper/12-world.md)), y marchar, esperar y acampar hacen avanzar el reloj de la campaña. Los eventos y fiestas que llegan por el camino se escriben en el diario, y también los relojes de la campaña que se llenan, cuando el sistema hace algo entonces (**En el mundo: se llenó La Sierpe despierta**: [Momentos del mundo](../oracle/07-connecting.md#5-tu-propio-sistema-de-viaje)), también los llenados en otra aplicación mientras el viaje no estaba, en su siguiente paso.
- Sus tablas y comprobaciones leen el mundo (los relojes de progreso de la campaña, los eventos de hoy, los valores de las facciones: [Lo que ven las tablas](../technical/04-what-tables-see.md)), y lo que le hacen pasa allí: un resultado que avanza un reloj (`world.clocks.the-siege: 1`) o cambia los valores de una facción. Las tierras de una facción están en un mapa, así que solo cambian cuando el viaje se juega en ese mapa.
- Sus comprobaciones tiran con el Oráculo de la campaña: una carta robada en el viaje ya no está en el mapa.

**Un viaje cada vez.** El tiempo de una campaña es uno, así que en ella solo hay un viaje en curso. Jugar un viaje en una campaña donde se jugó otro el último (el viaje del mapa en el Hexmapper, otro viaje aquí) pregunta antes: «Hay otro viaje en curso en esta campaña: «La Frontera». ¿Pausarlo y jugar este?». Decir que no lo deja todo como estaba. Si el reloj de la campaña avanzó entretanto (el otro viaje viajó un día), este grupo **espera hasta entonces** primero, y un mensaje lo dice; el otro viaje pregunta lo mismo cuando vuelve a jugarse.

Cambiar **Campaña** en un viaje en curso lo lleva a ese mundo desde su siguiente paso. Si la campaña del viaje tiene mundo propio (reloj del mundo, facciones, tiradas del Oráculo), Travel pregunta cuál se queda, como hace el Hexmapper cuando un mapa se mueve ([Campañas](../hexmapper/01-getting-started.md#campañas)): **Mantener el de la campaña** (el mundo del viaje se queda atrás) o **Traer el propio** (sustituye al de la campaña, sistema incluido, para todos sus mapas y viajes); cuando la otra campaña aún no tiene mundo, se elige entre traerlo o **Dejarlo atrás**. La campaña que deja el viaje, y la de un viaje que borras, se borra si no queda nada más en ella.

**El sistema es de la campaña.** Un viaje mantiene el sistema con el que empezó, y un viaje nuevo hace suyo el sistema de la campaña: en una campaña propia, sin preguntar; en una compartida con mapas u otros viajes, preguntando antes, porque también lo juegan ellos.

La aplicación [Campaign](../campaign/01-getting-started.md) muestra todas las campañas, con su reloj del mundo y los mapas y viajes que hay en ellas.

## El camino

La lista de la izquierda es el camino. El grupo empieza en el hex 1 y se dirige al último. Las cabeceras de sus columnas están subrayadas con puntos: pulsa una para leer qué es.

- **Terreno** de cada hex: los terrenos del Hexmapper más los que nombren las reglas del sistema.
- **Etiquetas**, separadas por comas. Las tablas y las comprobaciones las leen: las Marcas Grises se detienen en los hexes `landmark`, cobran peaje en los `toll` y tienen luces nocturnas en los `haunted`.
- Debajo de cada hex, **Al siguiente hex**: si un camino, un sendero o un río lo une con el siguiente. Lo que eso hace depende del sistema (en las Marcas Grises, los caminos son más rápidos y evitan perderse y los encuentros).
- **km por hex**: la escala. Las velocidades de las reglas van en km por día. Un sistema que fija su propia escala (`travel.hexKm`) se juega siempre a ella: la caja la muestra y aquí no se cambia (se cambia en Systems → Reglas).
- **Añadir un hex** alarga el camino; **×** quita uno al que el grupo aún no ha llegado. Los hexes ya recorridos salen atenuados y no se pueden cambiar.

Cambiar el camino vuelve a planear la ruta al momento.

## El viaje

El panel de la derecha es el mismo que en el Hexmapper. Arriba, dónde está el grupo: día, hora y estación, lo que es en cada división del día del calendario («Parte del día: el atardecer · Guardias: 5»), el clima, las horas de marcha gastadas; justo debajo, una comprobación que te espera (**Continuar**), los botones para jugar y la forma de viajar; después **Lo que acaba de pasar** y las pestañas. Los botones son las acciones que declara el sistema, primero las que mueven al grupo: su marcha (el **Marchar** de las Marcas Grises) va por la ruta hasta donde elijas a su lado (hasta el destino, un hex…, lo que ofrezca el sistema), hasta que pase algo o hasta que deje de cumplirse la regla del sistema para ella (de noche, al acabarse las horas del día…); detrás van las demás (las Marcas Grises: **Acampar**, **Descansar**, **Buscar comida**, **Marcha forzada**, y solo cuando se pueden hacer **Marcha nocturna**, **Rito de la Luna Ascua**, **Hablar con los mercenarios** e **Historias del camino**). Cuando una comprobación detiene una marcha por el camino, **Seguir** sigue con ella cuando la hayas leído (el resto del camino y después el resto de lo que hace la acción); pulsar otro botón la deja. **Esperar para seguir** deja pasar el tiempo hasta que el viaje pueda seguir como diga el sistema (su marcha, de día). Un sistema sin una acción que mueva no tiene botón de marchar. Las acciones que hace el propio sistema (comer al acabar cada día) no son botones: simplemente ocurren, y el diario lo cuenta.

**Lo que acaba de pasar.** Justo bajo los botones, un recuadro muestra las líneas del diario de tu último paso: una marcha con cada hex en el que ha entrado y cada comprobación que ha tirado, una acción y lo que ha cambiado, una comprobación tras la que has pulsado **Continuar**. Lo más reciente primero, como en el **Diario**: lo que ha detenido el viaje queda arriba, justo bajo los botones. Las tablas que tires a mano después se añaden arriba. El siguiente paso las sustituye, así que lo que acabas de hacer siempre está junto a los botones que lo hicieron; el viaje entero sigue en la pestaña **Diario**.

**Las pestañas.** Debajo, el resto del viaje se ve de pestaña en pestaña; este navegador recuerda la que elegiste, en todas las aplicaciones que enseñan un viaje. Cuando el panel es demasiado estrecho para las pestañas en fila (el panel lateral del Hexmapper, una ventana pequeña), pasan a ser un desplegable con las mismas pestañas, nunca una segunda fila:

- **Grupo** (solo si el sistema declara algo de ello): **El grupo** (su propia hoja, y las características del grupo que declare el sistema, cada una diciendo de dónde sale: p. ej. el Carisma, la Supervivencia y la Orientación de las Marcas Grises, que se suman a las tiradas), **Personajes** y las provisiones. Cada sección tiene un título sencillo; la que tiene explicación lleva el título subrayado con puntos: haz clic para leerla en la columna de ayuda. La ayuda de una característica del grupo, una provisión o un rol de viaje (haz clic en su nombre) también dice qué la lee y qué la cambia, por su nombre: el **Guía** de las Marcas Grises dice _Lo leen: ¿Nos perdemos?_; la Fatiga la leen Acampar, Descansar y las marchas forzada y nocturna, y la cambian ellas y una docena de tablas (la posada, el vado, el hambre…) (Sistemas los lista enteros: [Usado en](../systems/04-overview.md#usado-en)).
- **Diario**: el viaje entero, lo más reciente primero, agrupado por día; arriba, qué muestra ([el filtro del diario](#el-diario-todo-o-la-historia)) y **Exportar**.
- **Hasta ahora**: lo que lleva hecho el viaje.

**Hasta ahora** resume el viaje: hexes y km recorridos, horas de marcha, las comprobaciones que han salido, cuántas veces se ha hecho cada acción y lo gastado y obtenido de cada provisión. Las reglas y tablas del sistema también lo leen (`trip.km: { gte: 100 }`, `trip.taken.camp`, `trip.spent.food`: ver [Lo que ven las tablas](../technical/04-what-tables-see.md#el-viaje-trip)). Los viajes guardados antes de que existiera sacan del diario sus hexes y acciones; el resto cuenta desde entonces.

Las comprobaciones se tiran en sus tablas y se apuntan en el **diario**, agrupadas por día. **Exportar** descarga el diario en Markdown (un título por día, con el nombre del viaje y las líneas que muestra el filtro) para tu aplicación de notas o para imprimir. Una comprobación sin tabla solo se apunta en el diario (con lo que cambie, si cambia algo) y el viaje sigue, salvo que diga que pausa. El viaje se detiene y muestra **Continuar** en tres casos (una comprobación que espera dice el hex en el que ha salido, por su nombre o si no por sus coordenadas: _Lugar señalado en The Grey Stones: esperando_):

- una comprobación que dice **Pausar después** (`pause: true`): se tira si una tabla la resuelve, y el viaje espera para que describas el lugar, la resuelvas tú o decidas algo (el santuario de las Marcas Grises, que se tira; sus lugares señalados, sin tabla);
- una entrada de tabla o carta con `pause: true` que sale (la Sierpe del Bosque Gris de las Marcas Grises): solo cuando sale ese resultado;
- un paso de una acción que te espera (`pause`): la caja dice qué acción, y lo que diga el sistema si dice algo (**Tomar el transbordador** de las Marcas Grises, una vez a flote). **Continuar** sigue enseguida con el resto de la acción, y con una marcha que haya detenido por el camino.

Una acción también te puede **preguntar** algo mientras avanza (`ask`): la caja muestra su pregunta y un botón por respuesta, en vez de **Continuar** (el transbordador de las Marcas Grises: «¿Cómo le pagáis a Brenna?», **Un día de comida, ahora** o **Esperar a su travesía**). Elegir una es seguir: lo que la acción hace después depende de ello, y el diario dice qué elegiste. El botón de la acción no ofrece esa opción a su lado, porque se pregunta mientras avanza. Mira [Acciones y pasos](../technical/10-actions-and-steps.md#hablar-con-el-jugador-say-pause-y-ask).

Hasta que pulses **Continuar** (o respondas), nada hace avanzar el viaje: marchar, esperar y las acciones aparecen desactivadas (su ayuda dice por qué). Cambiar el destino, la forma de viajar, los personajes o las provisiones a mano sí se puede. Lo que un resultado en pausa hace al viaje (perderse, el clima) se aplica al continuar; sus efectos sobre provisiones y características, enseguida.

**Los botones que no se pueden usar ahora** siguen visibles, desactivados: al pasar el ratón por uno dice por qué. Los bloquea un valor del día que declara el sistema (**Perdidos** en las Marcas Grises: «Perdidos: no es posible el resto del día», hasta que acaba el día; o **Los mercenarios se niegan a marchar**, hasta que los convenzas), la acción ya se hizo hoy (**Una vez al día**) o la regla del sistema para ella no se cumple aquí y ahora (**Buscar comida** de las Marcas Grises con tormenta o de noche, **Descansar** y **Marcha forzada** de noche, **Marcha forzada** con fatiga 2 o más). Cuando es la regla, el tooltip dice qué parte de ella no se cumple y qué ha leído: _No es posible ahora: la hora es 21:00: hace falta menos de 20:00; A la luz de las antorchas no se cumple_. Una marcha (o cualquier acción que mueve al grupo) que se detiene por el camino porque su regla deja de cumplirse dice lo mismo en el diario: _«Marchar» se detiene aquí: la marcha del día (horas) es 8: hace falta menos de 8; A la luz de las antorchas no se cumple_ (cada rama de un `any`, todos los pares que han fallado; los datos que no conoce por su nombre se muestran tal como están escritos). Un sistema puede en cambio ocultar el botón de una acción mientras no se puede hacer (**Oculta si no se puede hacer**), para acciones que solo tienen sentido de vez en cuando: el **Rito** de las Marcas Grises solo aparece en un santuario con la Luna Ascua llena, la **Marcha nocturna** solo pasado el anochecer. Acampar, descansar y las acciones propias vienen todas del sistema: uno puede no tener descanso, otro acampar de otra forma (mira [Acciones](../systems/05-rules.md#acciones)).

Lo que cuenta el diario, para que nada pase en silencio:

- **Resultados con lo que han cambiado**: «Buscar comida: Bayas y raíces para un día (Comida +1)», «Peaje: El guarda del puente se cobra un día de comida (Comida −1)», «Perderse: Perdidos en la niebla: hoy no avanzáis (Perdidos)».
- **Acciones** con lo que han durado, y cuándo no se ha tirado nada: en las Marcas Grises, **Buscar comida** en colinas dice «Buscar comida (3 h): no hay nada que buscar en colinas: solo los bosques, campos, brezales y marismas dan comida». Las tres horas pasan igual y la marcha sigue a la mitad.
- **Acciones que hace el propio sistema**, como comer al acabar cada día, con lo que cambiaron («Comer (Comida −1)»); un valor que llega a su mínimo o su máximo («Comida no puede bajar de 0») y los cambios de **fatiga** con su motivo («Sin comida suficiente: Fatiga +1»); lo que cambió una acción va en su propia línea («Acampáis para pasar la noche (Fatiga −1)», «Descansáis 2 h (Fatiga −1)»).

## El diario: todo, o la historia

El diario guarda **todo** lo que pasa, también lo que pasa por detrás, y lo alto de la pestaña **Diario** elige lo que ves. Elegir no pierde nada: es solo lo que se muestra, y lo que escribe **Exportar**. Este navegador recuerda lo que eliges, en todas las aplicaciones que muestran un viaje.

**Mostrar** elige cuánto:

- **La historia**: lo que ha pasado en la partida. Resultados de las tablas, descubrimientos, llegar, lo que dice el sistema (`say:`), lo que te ha preguntado una acción, tus notas. Va bien para releer el viaje como un relato, o exportarlo a tus notas.
- **Y las reglas** (el diario de siempre): también lo que han hecho las reglas. Hexes en los que se entra, acciones, comprobaciones que te esperan, lo que han cambiado comprobaciones y acciones, valores que llegan a su mínimo o su máximo.
- **Todo**: también lo que ha pasado por detrás, en líneas grises más pequeñas:
  - cada tirada en una tabla, sus dados y la fila o carta que ha salido: _Tirada de Encuentro: Encuentros salvajes: 2d6 → 7 [3, 4] → 7; Lobos: 1d6 → 3 [3]_ (un dado que no cuenta sale tachado como `~2~`; los totales que un modo de tirada no se ha quedado van entre paréntesis);
  - la tirada del clima: _Clima: 2d6 = 7, sudeste → llovizna_ en una flor de hexes, _desde lluvia de ayer → tormenta_ con tablas de probabilidad;
  - cada comprobación que **no** ha salido, y por qué: _Emboscada no sale: el peligro del hex es 1: necesita 2 o más_. Es la línea que hay que buscar cuando una comprobación que esperabas no aparece nunca;
  - cada momento del día que nombra alguna comprobación o acción, cuando llega: _Momento: al entrar en un hex_, _Momento: tras «Acampar»_, _Momento: Guardias: media_;
  - cada valor antes y después: _Comida: 5 → 3_, _Kael: Salud: 3 → 2_, y una condición que empieza o se acaba;
  - cada ruta planeada: _Ruta hasta Ashford · hexes: 4_.

**De qué** (cuando el diario tiene líneas de más de un tipo) deja fuera tipos: el **Viaje** (hexes, acciones, las reglas), el **Oráculo** (tablas y clima), el **Mundo** (eventos, festividades y relojes llenos del reloj del mundo), los **Personajes** (lo que ha cambiado en ellos, el plantel) y tus **Notas**. **Buscar** se queda con las líneas que tienen esas palabras, sin importar mayúsculas: con **Todo**, busca el nombre de una comprobación para ver cada vez que se ha tirado, o que no ha salido y por qué.

**Lo que acaba de pasar** muestra la historia y las reglas de tu último paso, nunca lo que ha pasado por detrás: eso está en la pestaña **Diario**.

Por ejemplo, para ver dónde para un viaje el **Lugar señalado** de las Marcas Grises y dónde no: elige **Todo** y busca `Lugar señalado`. Cada hex sin la etiqueta dice por qué: _Lugar señalado no sale: las etiquetas del hex es nada, no landmark_.

## Quién tira

Cuando el sistema tiene características hechas de un solo personaje (`from: { pick: … }`: el Carisma de las Marcas Grises, quien hable), **Tira**, en la pestaña **Grupo** bajo **Actúa** (lo primero de **Personajes**), elige de quién toman el valor: **El mejor** (por defecto) o un personaje, en todas las tiradas hasta que lo cambies. Marca **Preguntar en cada tirada** para elegir cada vez: una comprobación que se tira en una tabla espera (su línea dice _¿quién tira?_) con la elección junto a **Continuar**, y se tira al pulsarlo.

## El grupo

Todo lo del grupo está en un sitio, la pestaña **Grupo**: primero **El grupo**, luego sus **Personajes**, luego sus provisiones. En un mapa, el token del grupo es solo dónde está el grupo: su hoja, sus características y sus personajes están aquí (el panel del token en Tokens lo dice, con **Abrir Jugar → Grupo**).

**De quién es la hoja.** Cada hoja (la del grupo, la de los personajes) dice cuál es y de qué sistema: _Hoja: La Compañía · Las Marcas Grises_, con **Editar en Sistemas ↗**. Lo que tiene una hoja (sus valores, estados, tipos de relación) lo decide su sistema: un personaje o el grupo tienen solo lo que declara su hoja, así que para añadir un valor, edita la hoja en la [app Sistemas](../systems/07-sheet.md) (un sistema incluido se duplica antes). Un viaje se queda con el sistema con el que empezó; en un mapa, el sistema es el de la campaña (**Ajustes del mapa → Campaña → Sistema**).

**La hoja del propio grupo.** Cuando el sistema tiene una hoja para el grupo en sí (la **Compañía** de las Marcas Grises; la **Moral** de las reglas genéricas), cada viaje la enseña como **El grupo**, encima de los personajes: lo que es de todo el grupo, viaje quien viaje. Los personajes pueden unirse e irse (caen, se contratan otros); esto se queda. Cambia sus valores y estados a mano, como los de un personaje; las comprobaciones y las acciones también los cambian (las Marcas Grises: perdida en la oscuridad, la Compañía queda **Desanimada** y no puede forzar la marcha hasta descansar). Una característica del grupo hecha de uno de sus valores (la Moral y la Fatiga de las Marcas Grises) no tiene casilla propia entre las características: se edita en esta ficha.

**Las características del grupo.** Bajo la hoja, en la misma ficha, las características del grupo que declare el sistema (lo que sus reglas y tablas leen como `party.stats.<id>`), cada una con de dónde sale:

- un número suelto (sin personajes, o una característica que el sistema guarda para todo el grupo): escríbelo;
- hecha de los valores de los personajes, en gris, con de quién es: _Rastreo de Kael, el máximo_; _Sigilo de Kael, el mínimo_; _Carisma de Brenna (Tira)_ cuando eliges quién tira; _suma de Salud: Kael, Brenna_; _cuántos son: Kael, Brenna_; _no cuenta nadie_ cuando no cuenta ningún personaje (todos heridos, por ejemplo). Cambia los valores de los personajes, no la característica;
- hecha de un valor de la hoja del grupo (la Moral): ese valor, que se edita en la hoja de arriba.

## Personajes

Cuando el sistema tiene una hoja para sus personajes (los compañeros de las Marcas Grises; la más pequeña de las reglas genéricas, con salud y una herida), la pestaña **Grupo** del viaje tiene una sección **Personajes** bajo **El grupo**. **Añadir un personaje** crea uno con los valores iniciales de la hoja; ponle nombre, y su id sigue al nombre (`Viejo Tobin` → `viejo-tobin`, como lo alcanzan las tablas y las condiciones: `characters.viejo-tobin.values.health`). Cada personaje se despliega para mostrar sus valores (agrupados como dice la hoja; un contador como casillas: haz clic en una para llenar hasta ella), sus estados (márcalos según pasan) y sus etiquetas (palabras libres, separadas por comas). ↑ lo sube en la lista, × lo quita (tras preguntar).

**El plantel.** Los personajes también pueden venir de la [aplicación Characters](../characters/01-getting-started.md), donde este navegador los guarda, de cualquier sistema. Bajo la lista, **Del plantel** muestra los personajes del plantel hechos con la hoja de este sistema: elegir uno lo trae al grupo con sus valores. Un personaje del viaje que no está en el plantel tiene **Guardar en el plantel** en su ficha, que lo guarda allí; uno que sí está tiene **Abrir en Characters ↗**, para sus notas y lo demás. En los dos casos queda **enlazado**: lo que le pase en el viaje se vuelca al plantel tras cada paso y cada cambio, y lo que cambies en la aplicación Characters llega al viaje (el diario dice «Kael: al día desde el plantel»). Un personaje viaja en un sitio a la vez: traer uno que viaja en otro sitio (otro viaje, un mapa, un token) pregunta antes, y ese sitio conserva su copia, ya sin enlazar. Quitarlo del grupo, o borrar el viaje, lo deja en el plantel, sin viajar. Un viaje nuevo con el mismo sistema conserva el grupo y sus enlaces.

Cada personaje tiene también **Relaciones**: a qué está unido, según los tipos de la hoja (un vínculo con otro personaje, un hogar): elige el tipo, escribe un nombre de la lista (los demás personajes; en un mapa, sus lugares, regiones y hexes con nombre; en Travel, los hexes del camino) y **Añadir**; un tipo con número lo muestra al lado, para cambiarlo. Las comprobaciones del sistema las leen allí donde está el grupo (las Marcas Grises: llegar al hogar de un compañero sube la moral).

**Roles**, cuando el sistema declara roles de viaje, da cada tarea a un personaje hasta que la cambies: el **Guía** de las Marcas Grises (con Rastreo 2 o más, perderse se tira con ventaja) y el **Vigía** (con Sigilo 2 o más, el campamento sigue oculto donde el peligro es menor de 3).

**Actúa**, lo primero de la sección **Personajes**, dice quién hace ahora las acciones del grupo: lo que un sistema escribe para `acting` le llega a ese personaje (en las Marcas Grises, las rocas de un vado hieren y tuercen el tobillo de quien guía el cruce; **Curar a los heridos** solo funciona si quien actúa tiene Supervivencia 2 o más). Con **Nadie**, esos efectos no cambian nada y el diario lo dice: «No actúa nadie, así que «Quien actúa: Tobillo torcido» no cambia nada».

Con personajes, el grupo son sus miembros, como diga el sistema:

- **Las características que salen de las suyas** aparecen en gris, dicen de quién son y los siguen: la Supervivencia de las Marcas Grises es la mejor de los que no están heridos, el Sigilo el del más torpe, las Bocas cuántos son. Cambia los valores de los personajes, no los del grupo. Las que el sistema guarda para el grupo entero (Moral, Fatiga) se editan como antes.
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
3. **Anochecer**: nadie marcha de noche. Dormidos en el campamento, las guardias de la noche siguen llegando: en la guardia de en medio, donde el peligro es 3 o más y nadie hace guardia, las luces encantadas llenan el Pavor de todos. **Acampar** (la parada del sistema: lo que hace el grupo cuando no puede marchar) tira las comprobaciones de la noche: un encuentro nocturno donde el peligro es 2 o más. Acampar necesita comida y fatiga por debajo del Aguante del grupo (10): si no, el botón queda desactivado y **Esperar para seguir** pasa la noche a la intemperie («“Acampar” no es posible (…): el tiempo pasa sin ello»), sin el alivio de una noche bien comidos, hasta que el grupo pueda marchar por la mañana. Deja pasar el tiempo donde está el grupo hasta que pueda volver a marchar, pase lo que pase: perdidos y sin comida, el día se pierde y el grupo despierta en el siguiente.
4. **El final del día** (medianoche): las acciones del sistema de fin de día (comer: 1 de comida, 1 más por mercenario, y 1 de forraje a caballo) y sus comprobaciones (un día sin comida suficiente: fatiga +1; acabarlo sin nada de comida, hambre, donde la moral decide cómo va). Los valores de hoy terminan; las tablas de mañana los leen como `yesterday.…`.

Tus propias acciones caben entre medias: **Descansar** dos horas, **Buscar comida** (tres horas, la marcha a la mitad), una **Marcha forzada** (más rápido, más cansados, y en marcha enseguida hasta el destino), todas de día; en las Marcas Grises descansar donde el peligro es 3 o más también puede traer un encuentro. Al anochecer, en vez de acampar, una **Marcha nocturna** enciende las antorchas y el grupo puede seguir hasta medianoche (+1 de fatiga); cada hex en el que se entra a oscuras fuera del camino puede haceros perder o traer un encuentro nocturno.

## Se guarda solo

El viaje se guarda en el navegador mientras juegas, y sigue ahí cuando vuelves. Una [copia de seguridad](../technical/05-backups.md) lo lleva a otro ordenador.

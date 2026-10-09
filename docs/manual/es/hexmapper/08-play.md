# Jugar un viaje

La herramienta **Jugar** (<kbd>P</kbd>) mueve a tu grupo por el mapa, en uno de dos modos (**Modo de juego**, cuya ayuda los resume). Al elegirla se selecciona el token del grupo (al pasar a la herramienta Tokens sigue seleccionado, y allí se cambian su icono, color y halo).

## Modo simple

Solo el token del grupo y su rastro: haz clic en un hex para colocar al grupo y en otro para que salte directamente allí: sin ruta, sin tiempo de viaje, no pasa nada por el camino. Sin tiradas. Para caminar hex a hex con tiempo, terreno y comprobaciones, usa **Con reglas**. **Mostrar rastro** dibuja por dónde ha pasado, curvado como los caminos y senderos del mapa (**Líneas rectas** lo dibuja, y la ruta prevista, de centro a centro de hex). Los dos van un poco a un lado del centro de los hexes, el rastro a la izquierda de su camino y la ruta a la derecha, para no ir nunca encima de un camino o río que siguen, ni uno sobre otro; **Borrar rastro** y **Quitar grupo** lo reinician.

## Con reglas

El Travel Engine lleva el viaje y Oracle tira las comprobaciones. La [aplicación Travel](../travel/01-getting-started.md) juega los mismos sistemas sin mapa, y la [aplicación Systems](../systems/01-getting-started.md) los edita.

1. Comprueba el **sistema**: el del mapa, que se ve aquí y se elige en **Ajustes del mapa → Mapa → Sistema**: Genéricas, o el sistema de un pack (p. ej. las Marcas Grises). Trae las reglas de viaje, las tablas que tiran, el calendario y el clima. Elige la estación en la que **empezar**. **Nuevo viaje** reinicia el tiempo, las provisiones y el diario, dejando al grupo donde está.
2. Haz clic en un hex para colocar al grupo y después en el **destino**: se dibuja la ruta.
3. **Viajar** sigue hasta llegar, que caiga la noche, se acaben las horas de marcha del día o haga falta una comprobación. **1 hex** avanza un hex. **Acampar** duerme hasta el alba; **Descansar** es una pausa corta (cada sistema declara qué acciones tiene, y cuándo se pueden hacer). Si el grupo no puede hacer la acción de la noche (las Marcas Grises solo acampan con comida y fatiga por debajo del Aguante del grupo), **Viajar** al anochecer (o con una tormenta que no deja salir) pasa la noche sin ella y sigue marchando al alba. **Esperar al alba** siempre deja pasar el tiempo donde está el grupo, viviendo la noche: para un día en que no se puede hacer nada más (perdidos, sin comida para acampar). El [reloj del mundo](12-world.md#con-un-viaje-en-marcha) también hace avanzar el viaje: con una ruta planeada, **Día siguiente** sigue por ella.

El panel muestra el día, la hora y la estación, dónde está el grupo, el clima, las horas de marcha gastadas, el modo de viaje (a pie, a caballo…), las provisiones, la fatiga y las estadísticas del grupo que declara el sistema (p. ej. la Supervivencia de las Marcas Grises), y **Hasta ahora**: lo que lleva hecho el viaje (hexes, km, horas de marcha, comprobaciones, acciones, provisiones gastadas y obtenidas; ver [Jugar un viaje](../travel/02-playing.md#el-viaje)).

**Personajes**: cuando el sistema del mapa tiene una hoja, el panel tiene una sección **Personajes**, la misma que en Travel ([Personajes](../travel/02-playing.md#personajes)): añade los personajes del grupo, elige quién actúa, cambia sus valores y estados; las características y provisiones que el sistema saca de los suyos los siguen. Se guardan en el fichero del mapa (como personajes OTD del grupo), y un mapa puede traer su compañía antes de que empiece ningún viaje: el mapa de ejemplo de las Marcas Grises trae a Kael, Mara y el viejo Tobin, que empiezan el primer viaje. Un viaje nuevo con el mismo sistema los conserva.

Un viaje sigue con el sistema con el que empezó. Si después cambia el sistema del mapa (en **Ajustes del mapa**, o deshaciendo un cambio), el panel lo dice y el viaje sigue con el suyo; **Nuevo viaje** empieza uno con el del mapa.

## Comprobaciones y diario

Los sistemas declaran sus comprobaciones (clima al alba, perderse, encuentros…) y qué tabla resuelve cada una; los resultados van al **diario**, agrupados por día. Una comprobación sin tabla solo se apunta en el diario, salvo que pause: entonces te espera para que la resuelvas y pulses **Continuar**. Una comprobación o un resultado también pueden pausar el viaje tras la tirada ([qué hace aparecer Continuar](../travel/02-playing.md#el-viaje)). Los resultados dicen lo que han cambiado (Comida +1, Moral −1…), y el diario apunta también las acciones, las provisiones consumidas y la fatiga, también cuando no pasa nada: mira [lo que cuenta el diario](../travel/02-playing.md#el-viaje). Con el [reloj del mundo](12-world.md#con-un-viaje-en-marcha) en marcha, el viaje y el mundo comparten un solo tiempo: avanzar el reloj es esperar donde está el grupo (las comprobaciones del alba, comer, acampar de noche).

Las **Marcas Grises** incluidas lo enseñan todo, en su mapa de ejemplo (**Mapas → Mapas de ejemplo**): clima por estación, perderse fuera de los caminos, encuentros por terreno, región, peligro y hora del día, un peaje en el puente, un vado que se tira en un oráculo, una barca en el lago y comprobaciones sin tabla: el viaje se detiene en las piedras erguidas (`landmark`) hasta que describas el lugar y pulses **Continuar**. Mira [Las Marcas Grises](../packs/02-grey-marches.md).

El terreno, los caminos y ríos, las etiquetas, campos y región del hex, la estación y el clima del día llegan a las reglas de viaje y a las tablas, así que un sistema puede hacer los bosques más lentos o que por los caminos no te pierdas. Lo que hace cada sistema está en su pack: consulta [Caminos, ríos, muros y fronteras](04-roads-and-rivers.md#que-hacen-los-caminos-y-rios-al-viajar).

## Mover a mano

Arrastra el token del grupo para ponerlo en otro sitio: el rastro le sigue, y durante un viaje es un salto (no pasa el tiempo).

## Descubrir el mapa

Con un sistema que sepa descubrir (las Marcas Grises saben; su mapa de ejemplo deja el este en blanco), marca **Descubrir el mapa al viajar**. Empieza con un mapa en blanco: pinta solo el hex donde empieza el grupo y haz clic en un destino cualquiera. Mientras el grupo viaja, las tablas del sistema deciden los hexes **vacíos**:

- **El terreno**, visto desde la tierra que pisas (el bosque tiende a seguir siendo bosque).
- **Qué hay**, la primera vez que entras en un hex: un punto de interés, etiquetas (un `landmark` detiene allí los viajes de las Marcas Grises), un nombre. El viaje se detiene cuando encuentras algo, para que lo juegues.

**Qué se descubre**: _los hexes alrededor del grupo_ (lo que ve: su terreno se conoce antes de pisarlos, así que rutas y velocidades son reales) o _solo el hex al que entra el grupo_. El sistema elige uno; puedes cambiarlo para tu partida.

Los hexes que pintaste nunca se cambian, así que puedes preparar parte del mapa y dejar el resto por descubrir. Los descubrimientos son parte de la partida, como el diario: <kbd>Ctrl</kbd>+<kbd>Z</kbd> no los deshace; repinta o borra a mano. En el diario solo se apunta lo que merece la pena.

Para que tu propio sistema descubra, mira [Conectar tablas con mapas y viajes](../oracle/07-connecting.md#7-descubrir-el-mapa).

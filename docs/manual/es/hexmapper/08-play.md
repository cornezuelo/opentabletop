# Jugar un viaje

La herramienta **Jugar** (<kbd>P</kbd>) mueve a tu grupo por el mapa. Al elegirla se selecciona el token del grupo (al pasar a la herramienta Tokens sigue seleccionado).

## Modo simple

Solo el token del grupo y su rastro: haz clic en un hex para colocar al grupo y en otro para que salte directamente allí: sin ruta, sin tiempo de viaje, no pasa nada por el camino. Sin tiradas. Para caminar hex a hex con tiempo, terreno y comprobaciones, usa **Con reglas**. **Mostrar rastro** dibuja por dónde ha pasado; **Borrar rastro** y **Quitar grupo** lo reinician.

## Con reglas

El Travel Engine lleva el viaje y Oracle tira las comprobaciones. La [aplicación Travel](../travel/01-getting-started.md) juega los mismos sistemas sin mapa y los edita.

1. Elige las **reglas**: Genéricas, o un sistema cuyo pack tenga reglas de viaje (p. ej. Kal-Arath), y la estación en la que **empezar**. **Nuevo viaje** reinicia el tiempo, las provisiones y el diario, dejando al grupo donde está.
2. Haz clic en un hex para colocar al grupo y después en el **destino**: se dibuja la ruta.
3. **Viajar** sigue hasta llegar, que caiga la noche, se acaben las horas de marcha del día o haga falta una comprobación. **1 hex** avanza un hex. **Acampar** termina el día; **Descansar** es una pausa corta (cada sistema declara qué acciones tiene).

El panel muestra el día, la hora y la estación, dónde está el grupo, el clima, las horas de marcha gastadas, el modo de viaje (a pie, a caballo…), las provisiones, la fatiga y las estadísticas del grupo que declara el sistema (p. ej. la Presencia de Kal-Arath).

## Comprobaciones y diario

Los sistemas declaran sus comprobaciones (clima al alba, perderse, encuentros…) y qué tabla resuelve cada una; los resultados van al **diario**, agrupados por día. Las comprobaciones sin tabla te esperan: pulsa **Continuar** cuando las hayas resuelto tú. Los resultados dicen lo que han cambiado (Comida +1, Moral −1…), y el diario apunta también las acciones, las provisiones consumidas y la fatiga, también cuando no pasa nada: mira [lo que cuenta el diario](../travel/02-playing.md#el-viaje).

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

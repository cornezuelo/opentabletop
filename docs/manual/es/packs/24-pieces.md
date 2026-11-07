# Piezas

La pestaña **Piezas** edita los **catálogos de piezas** del sistema (`kind: pieces`): formas de casillas dibujadas en texto, con las que crece un mapa según va el grupo. Un grupo está ante una puerta que nadie ha abierto, la cruza, y la pieza que sale aparece en el mapa, girada para que su entrada encaje con esa puerta. Sus otras salidas son puertas nuevas que nadie ha abierto.

Es un solo mecanismo en cualquier rejilla: un catálogo dice si está dibujado para cuadrados o para hexágonos, y un mapa coloca las piezas de su rejilla. Las piezas sirven dentro y fuera: con salidas, los muros llevan al grupo hasta ellas; una pieza sin salidas se coloca en cualquier casilla vacía a la que entre el grupo, como una loseta.

## La pestaña

Un catálogo cada vez; **Nuevo catálogo de piezas** crea uno pequeño y lo añade al **Resumen** del sistema (`pieces:`, una lista). Un catálogo tiene:

- Su **Nombre** y su **Rejilla**: **Cuadradas** o **Hexagonales**. Dos catálogos pueden usar los mismos ids en rejillas distintas, así que una tabla sirve para las dos.
- Sus **Marcas**: qué coloca cada marca de un dibujo, por id de terreno (`.` coloca `stone-floor`). Un terreno con **Suelo** en la paleta recibe sus muros de forma automática.
- Sus **Piezas**, cada una por un **Id** (con el que la nombra una tabla), con su **Nombre** y:
  - su **Dibujo**, con la pieza tal como se verá a su lado. Una marca por casilla, un espacio para nada y una letra mayúscula por cada salida, en la casilla **más allá** de la pieza, junto a exactamente una de sus casillas: eso da la dirección de la salida. En hexágonos cada fila va a media casilla de la siguiente, así que las marcas quedan a dos caracteres unas de otras;
  - sus **Salidas**, una por letra: el **Tipo** de conexión que deja en el mapa y **Entrada** si el grupo puede entrar por ella (si ninguna está marcada, por cualquiera);
  - **Una sala**: se juega como un solo lugar, un paso para entrar y una comprobación, igual que una región con **Se juega como un solo lugar** marcado;
  - **Se puede girar**: activado, se gira y se refleja para que encaje; sin activar, se coloca como está dibujada;
  - su **Contenido**, lo que se tira al entrar en lugar de lo del sistema (`table.crypt-contents`);
  - sus **Etiquetas de sus casillas** y **Valores**, leídos como `place.tags` y `place.<clave>`.

## Qué elige la siguiente pieza

**Comprobaciones → Descubrir el mapa**: **Siguiente pieza** es una tabla o un mazo cuyos resultados dicen `set: { piece: <id> }`, **Empieza con** la pieza con la que empieza un mapa vacío, **Intentos** cuántas tiradas antes de rendirse cuando lo que sale no cabe (3 si está vacío) y **Si no** la pieza que se coloca cuando ninguna ha cabido. Una pieza de una casilla siempre cabe, así que es un buen **Si no**: sin ella, el grupo se queda a su lado de la puerta y el diario lo dice. **Mantenerlo abierto** evita que el lugar se cierre por azar: una pieza que no dejaría ninguna salida por cruzar en todo el mapa no cabe, así que se vuelve a sacar (siempre, o mientras se cumple una condición: `pieces.total: { lt: 8 }`, abierto hasta que haya ocho, y después puede acabar).

La tabla ve lo mismo que `discover.terrain`, más la salida que se cruza (`exit.kind`, `exit.tags`) y lo colocado en este mapa (`pieces.total`, `pieces.<id>`): _la tercera cripta es la última_, o _la tumba tras ocho piezas_. Un mazo funciona como en todas partes: las cartas robadas siguen robadas, así que el sitio no se repite.

## Cómo se coloca una pieza

1. El grupo entra en una casilla vacía, por una salida o desde cualquier lado en un mapa sin muros.
2. El binding nombra una pieza. Se prueban todas las formas de colocarla, en orden aleatorio: cada entrada, cada giro y reflejo. Una forma cabe cuando la casilla a la que entró el grupo es de la pieza, la entrada encaja con la casilla de la que vino y todas las casillas caen dentro del mapa y sobre nada.
3. Si ninguna cabe, se tira otra vez hasta **Intentos**, y luego **Si no**. Una pieza que se saldría del mapa no cabe: el borde es roca; manteniéndolo abierto, tampoco una que no dejaría camino.
4. Sus otras salidas: una sin nada detrás se queda esperando; una que cae sobre suelo se abre ahí, una puerta entre las dos; una contra cualquier otra cosa se quita, sin decir nada, como un muro.
5. El paso termina ahí: lo de más allá era desconocido, así que ninguna ruta pasaba por ello.

Una pieza colocada se queda y es parte del mapa desde entonces: se puede editar en Editar, y <kbd>Ctrl</kbd>+<kbd>Z</kbd> no la deshace. Antes de cruzar no se ve nada: una salida solo muestra su tipo. Un sistema que quiera mirar por una puerta tiene una acción para ello.

## Jugarlo

En Mapa, en un mapa cuyo sistema tiene piezas: **Jugar**, marca **Descubrir el mapa al viajar** y elige **Por las salidas, pieza a pieza**. Se elige por mapa, así que un sistema puede descubrir su tierra casilla a casilla y colocar sus mazmorras por piezas. **Empezar a jugar** coloca al grupo en un mapa en blanco, con la primera pieza bajo sus pies. Una flecha marca cada salida que nadie ha cruzado: haz clic más allá, o camina con las flechas, y se coloca lo que haya.

Los _Deep Barrows_ de las Marcas Grises lo enseñan todo, en un mapa bajo las Barrow-halls; las _Salas y pasillos_ de Core son lo más pequeño que funciona, en cuadrados y en hexágonos. Para la sintaxis, mira [Tipos](../technical/07-kinds.md#piezas).

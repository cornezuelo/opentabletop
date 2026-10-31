# Caminos, ríos, muros, fronteras y conexiones

La herramienta **Caminos y ríos** (<kbd>R</kbd>) dibuja líneas de casilla a casilla.

## Tipos

| Tipo     | Aspecto                                    | En un viaje con reglas             |
| -------- | ------------------------------------------ | ---------------------------------- |
| Camino   | marrón continuo                            | lo que diga el sistema (ver abajo) |
| Sendero  | marrón discontinuo                         | lo que diga el sistema             |
| Río      | azul                                       | lo que diga el sistema             |
| Muro     | grueso, con piedras, también sobre el agua | nada: solo se dibuja               |
| Frontera | rojo discontinuo, también sobre el agua    | nada: solo se dibuja               |

## Qué hacen los caminos y ríos al viajar

El mapa solo dice por dónde va cada línea. Lo que significa para un viaje lo deciden las **reglas de viaje del sistema** con el que se juega el mapa (**Ajustes del mapa → Campaña → Sistema**), en su pack:

- **Velocidad**: cada tipo de línea puede tener un multiplicador de velocidad. Con las **reglas genéricas** un camino es ×1,5 y un sendero ×1,2, y seguir un río no cambia nada. Con las **Marcas Grises**, un camino es ×1,5 y un sendero ×1,2; otro sistema puede hacer que no aceleren nada.
- **Comprobaciones**: un sistema puede saltarse una comprobación mientras sigues una línea. En las **Marcas Grises** no se tira para perderse al seguir un camino o un río, ni hay encuentros al llegar por el camino; las reglas genéricas no tienen tirada de perderse.
- **Cruzar**: un paso que entra en la casilla de un río desde una casilla fuera de él **cruza** el río, salvo que allí lo cruce un camino o un sendero (un puente, un vado en el sendero) o que una [conexión](#conexiones) una las dos casillas (un vado o un puente dibujados). Lo que cuesta cruzarlo lo decide el sistema: más tiempo, una tirada, o cerrado mientras el río va crecido; entonces las rutas rodean por un puente o un vado cuando es más rápido. Con las **reglas genéricas**, vadear un río lleva una hora más; con las **Marcas Grises**, medio día y una tirada en el oráculo del vado, y no se puede un día de tormenta, así que un viaje de Ashford hacia el este va por el Puente de Keld o el vado. Las condiciones lo leen como `trip.crossing: river` ([Qué ven las tablas](../technical/04-what-tables-see.md#el-viaje-trip)). Los caminos y senderos se cruzan igual, lo que solo importa si un sistema dice qué hace cruzarlos.

Seguir una línea significa que la ruta va de casilla en casilla a lo largo de ella. Para ver o cambiar lo que hace un sistema, abre su pack en la aplicación Oráculo (`connections` y `checks` en sus reglas de viaje); [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) lo explica.

## Dibujar

- Haz clic en casillas una tras otra; las intermedias se rellenan en línea recta. Arrastrar dibuja a mano alzada.
- <kbd>Mayús</kbd>+clic coloca el punto donde haces clic dentro de la casilla (ajustado al centro, los lados o las esquinas); añade <kbd>Ctrl</kbd> para colocarlo libre.
- Vuelve a hacer clic en la última casilla, haz clic derecho o pulsa <kbd>Intro</kbd> para terminar. <kbd>Retroceso</kbd> quita el último punto y <kbd>Esc</kbd> cancela.
- **Tramos rectos** dibuja líneas rectas en lugar de curvas; **Cerrado** une el final con el principio (útil para fronteras).

Los caminos, senderos y ríos se detienen en la orilla de lagos y mares; las fronteras los cruzan.

## Editar

Sin ninguna línea en curso, los tiradores blancos son los puntos que colocaste:

- Arrastra un tirador para moverlo, incluso a otra casilla (la línea se recalcula).
- Haz clic en un tirador para seguir dibujando desde él: desde un extremo alarga la línea, desde el medio empieza un ramal.
- Clic derecho en un tirador lo centra en su casilla.

El panel de la casilla lista las líneas que cruzan la casilla seleccionada: cámbialas entre curvas y rectas o entre abiertas y cerradas, o bórralas.

## Conexiones

La herramienta **Conexiones** (<kbd>C</kbd>, **⇄**) une dos lugares con algo que no es una línea que se sigue: un puente, una puerta, un paso, un vado, o un camino entre dos casillas lejanas (un túnel, un transbordador, una senda oculta). Dos lugares lejanos unidos por una conexión pasan a ser vecinos: un viaje puede ir directamente del uno al otro en un paso, tan largo como las casillas entre sus extremos a la escala del mapa (o su propia **Longitud**), a la velocidad de su tipo y nunca a la del terreno (no cruza las tierras de en medio).

- Elige primero su **Tipo**: qué es la conexión, como lo nombra el sistema del mapa. La casilla sugiere los tipos que declara el sistema y los que ya usa el mapa; una palabra nueva también vale, y no hace nada hasta que un sistema dice qué hace.
- Haz clic en un lugar y luego en otro: la conexión los une, dibujada como una línea discontinua con un rombo en medio. <kbd>Esc</kbd> o un clic derecho descartan una que hayas empezado.
- Haz clic en una conexión para seleccionarla: su panel edita su **Tipo**, **Nombre**, **Longitud (km)** cuando une lugares lejanos (vacía: medida en la cuadrícula, el número que se ve), **Etiquetas** y valores (`clave` = `valor`), y **Borrar conexión** la quita (o <kbd>Supr</kbd>). Un clic derecho sobre una conexión también la borra. Todo se deshace con <kbd>Ctrl</kbd>+<kbd>Z</kbd>.
- El panel lista todas las conexiones del mapa; al hacer clic en una se selecciona.
- Sobre [suelo](02-terrain.md), una conexión entre dos casillas vecinas con un muro entre ellas abre el muro: una **puerta** o un arco (su tipo dice lo que cuesta y cuándo está cerrada). El muro se dibuja con un hueco donde está.
- Mientras hay un viaje en curso, la que no puede cruzar ahora sale en gris con el rombo tachado, y su panel dice qué ha hecho el viaje de ella: [Las conexiones al jugar](08-play.md).

Lo que hace un tipo de conexión en un viaje lo decide el sistema, como con los caminos: una velocidad, o saltarse una comprobación (`trip.connections: ford` en una condición lee los tipos del paso dado). Las conexiones tienen su propia capa en **Capas**, para mostrarlas, ocultarlas o bloquearlas.

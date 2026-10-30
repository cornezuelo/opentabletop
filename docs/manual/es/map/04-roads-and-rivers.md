# Caminos, ríos, muros, fronteras y conexiones

La herramienta **Caminos y ríos** (<kbd>R</kbd>) dibuja líneas de hex a hex.

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

- **Velocidad**: cada tipo de línea puede tener un multiplicador de velocidad. Con las **reglas genéricas** un camino es ×1,5 y un sendero ×1,2, y un río no cambia nada. Con las **Marcas Grises**, un camino es ×1,5 y un sendero ×1,2; otro sistema puede hacer que no aceleren nada.
- **Comprobaciones**: un sistema puede saltarse una comprobación mientras sigues una línea. En las **Marcas Grises** no se tira para perderse al seguir un camino o un río, ni hay encuentros al llegar por el camino; las reglas genéricas no tienen tirada de perderse.

Seguir una línea significa que la ruta va de hex en hex a lo largo de ella. Para ver o cambiar lo que hace un sistema, abre su pack en la aplicación Oráculo (`connections` y `checks` en sus reglas de viaje); [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) lo explica.

## Dibujar

- Haz clic en hexes uno tras otro; los intermedios se rellenan en línea recta. Arrastrar dibuja a mano alzada.
- <kbd>Mayús</kbd>+clic coloca el punto donde haces clic dentro del hex (ajustado al centro, los lados o las esquinas); añade <kbd>Ctrl</kbd> para colocarlo libre.
- Vuelve a hacer clic en el último hex, haz clic derecho o pulsa <kbd>Intro</kbd> para terminar. <kbd>Retroceso</kbd> quita el último punto y <kbd>Esc</kbd> cancela.
- **Tramos rectos** dibuja líneas rectas en lugar de curvas; **Cerrado** une el final con el principio (útil para fronteras).

Los caminos, senderos y ríos se detienen en la orilla de lagos y mares; las fronteras los cruzan.

## Editar

Sin ninguna línea en curso, los tiradores blancos son los puntos que colocaste:

- Arrastra un tirador para moverlo, incluso a otro hex (la línea se recalcula).
- Haz clic en un tirador para seguir dibujando desde él: desde un extremo alarga la línea, desde el medio empieza un ramal.
- Clic derecho en un tirador lo centra en su hex.

El panel del hex lista las líneas que cruzan el hex seleccionado: cámbialas entre curvas y rectas o entre abiertas y cerradas, o bórralas.

## Conexiones

La herramienta **Conexiones** (<kbd>C</kbd>, **⇄**) une dos lugares con algo que no es una línea que se sigue: un puente, una puerta, un paso, un vado, o un camino entre dos hexes lejanos (un túnel, un transbordador, una senda oculta). Dos lugares lejanos unidos por una conexión pasan a ser vecinos: un viaje puede ir directamente del uno al otro en un paso, tan largo como los hexes entre sus extremos a la escala del mapa (o su propia **Longitud**), a la velocidad de su tipo y nunca a la del terreno (no cruza las tierras de en medio).

- Elige primero su **Tipo**: qué es la conexión, como lo nombra el sistema del mapa. La casilla sugiere los tipos que declara el sistema y los que ya usa el mapa; una palabra nueva también vale, y no hace nada hasta que un sistema dice qué hace.
- Haz clic en un lugar y luego en otro: la conexión los une, dibujada como una línea discontinua con un rombo en medio. <kbd>Esc</kbd> o un clic derecho descartan una que hayas empezado.
- Haz clic en una conexión para seleccionarla: su panel edita su **Tipo**, **Nombre**, **Longitud (km)** cuando une lugares lejanos (vacía: medida en la cuadrícula, el número que se ve), **Etiquetas** y valores (`clave` = `valor`), y **Borrar conexión** la quita (o <kbd>Supr</kbd>). Un clic derecho sobre una conexión también la borra. Todo se deshace con <kbd>Ctrl</kbd>+<kbd>Z</kbd>.
- El panel lista todas las conexiones del mapa; al hacer clic en una se selecciona.

Lo que hace un tipo de conexión en un viaje lo decide el sistema, como con los caminos: una velocidad, o saltarse una comprobación (`trip.connections: ford` en una condición lee los tipos del paso dado). Las conexiones tienen su propia capa en **Capas**, para mostrarlas, ocultarlas o bloquearlas.

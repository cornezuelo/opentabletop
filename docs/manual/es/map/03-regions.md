# Regiones

Las regiones dan nombre a zonas del mapa: reinos, territorios, zonas peligrosas. Usa la herramienta **Regiones** (<kbd>N</kbd>).

## Crear y pintar

1. **Nueva región** crea una y la selecciona.
2. Pinta sus casillas con el pincel (el mismo **Tamaño del pincel** que el terreno). <kbd>Mayús</kbd>+arrastrar pinta un rectángulo. El clic derecho saca casillas de su región; <kbd>Ctrl</kbd>+clic coge la región de una casilla.
3. En los ajustes de la región: **Nombre**, color, **Mostrar el nombre en el mapa** con su **Estilo** (el del mapa o uno propio) y una **Nota enlazada**.

**Generar sus casillas vacías**, en sus ajustes, rellena las casillas de la región que aún no tienen terreno con el modelo de tierra del sistema, como hace **Generar tierra** de la herramienta Terreno con todo el mapa (con su semilla y su modelo): una región de casillas vacías pintada al este de una cordillera crece desde la cordillera ([Terreno](02-terrain.md#generar-tierra)).

Una casilla se pinta como mucho en una región, aunque esa región puede estar [dentro de otras](#regiones-dentro-de-regiones). El panel de la casilla también tiene una lista **Región** para cambiarla. **Borrar región**, en sus ajustes, la quita (pregunta antes si tiene casillas): sus casillas y las regiones que tiene dentro pasan a la región dentro de la que estaba, o se quedan sin región; ↶ lo deshace.

## Valores

Una región también puede tener **campos** (clave–valor, como los de una casilla). Valen para **todas las casillas de la región**: pon `danger: 2` al Bosque Gris una vez en lugar de en cada casilla. Una región [dentro de ella](#regiones-dentro-de-regiones) puede decir otra cosa para sus casillas, y el campo propio de una casilla con la misma clave gana sobre todos, así que el corazón del bosque puede decir `danger: 4` y una casilla de él `danger: 5`. El panel de una casilla muestra, bajo sus propios campos, lo que recibe de sus regiones («De su región (The Greywood): danger = 2»). Las tablas y las comprobaciones de viaje los leen como los de la casilla: `{{place.danger}}`. Mira [Lo que ven las tablas](../technical/04-what-tables-see.md).

## Regiones dentro de regiones

Una región puede estar **dentro de** otra: elígela en la lista **Dentro de** de su panel (cualquier región salvo ella misma y las que tiene dentro). El Deepwood dentro del Greywood, el corazón del Greywood dentro del Deepwood; una capilla dentro de un templo, un altar dentro de la capilla. Pinta las casillas de la de dentro como las de cualquier región: una casilla se queda con la región más interior en la que la pintas, y está en todas las de encima.

- **Sus valores vienen de fuera hacia dentro**: los de la región de fuera valen en las casillas de la de dentro, los de la de dentro ganan donde las dos fijan lo mismo, y los propios de una casilla ganan sobre todos. En las Grey Marches el Greywood dice `danger: 2`, el Deepwood de dentro `3`, su corazón `4` y una casilla del corazón `5`: cuatro valores en vez de los campos de veinticinco casillas.
- **Las condiciones sobre la de fuera se cumplen dentro**: `place.region: The Greywood` se cumple también en el Deepwood y en su corazón, y `place.region: The Deepwood` solo ahí. Las tablas leen `place.region` como la lista de todas las regiones en las que está la casilla, de la más interior hacia fuera (`[The Heart of the Greywood, The Deepwood, The Greywood]`); `{{place.region}}` las escribe separadas por comas.
- **Salas**: una región dentro de una [sala](#salas) sigue siendo esa sala, salvo que también se juegue como un solo lugar. Entonces es una sala propia dentro de la otra, con un muro entre ellas salvo que se dibuje una puerta (el nicho funerario de las Barrow-halls, dentro de la tumba del jefe).

El panel Regiones pone cada región bajo la región dentro de la que está; al pasar sobre una casilla se dicen todas de fuera hacia dentro (_Región: The Greywood › The Deepwood_), y cada región se dibuja encima de la que la contiene.

## En el mapa

Una región se dibuja como un tinte suave, un borde por el interior de su contorno (para que las regiones vecinas no se solapen) y su nombre en el centro. Las regiones son la geografía, así que se ven como en un atlas: un color liso y una línea continua. Las [facciones](12-world.md#facciones), la política, se dibujan distinto por encima (rayas de su color y una frontera discontinua), así que una casilla de una región en manos de una facción se lee como el color de la región con las rayas de la facción.

**Mientras trabajas con la herramienta Regiones**, la región que pinta se resalta con un contorno (una línea clara y gruesa con un borde oscuro, que se ve sobre cualquier terreno) y el resto del mapa se oscurece; las tierras de las facciones se atenúan, para que las regiones pasen al frente (la capa **Facciones** sigue ocultándolas). Al pasar sobre una casilla, debajo del mapa se dice qué la tiene: _Región: The Greywood · Facción: Los Clanes de Hierro_. La capa **Regiones** las oculta o bloquea todas; **Ajustes del mapa → Textos del mapa** da estilo u oculta todos los nombres de región.

**Ajustes del mapa → Regiones** fija cómo se ven todas: el **relleno** (la intensidad del tinte; 0 para ninguno), el grosor del **borde** (0 para ninguno), su opacidad y si es **discontinuo**. Una región puede verse a su manera: marca **Estilo propio** en su panel y mueve sus propios deslizadores. En las Marcas Grises, el Bosque Gris tiene un tinte más intenso y las Hollow Hills solo un borde discontinuo.

## Al jugar

Las comprobaciones de viaje y las tiradas de Oráculo ven la región de la casilla por su **nombre**, así que una tabla puede decir `when: { place.region: Las Marcas Negras }`; dentro de otras regiones, se cumple para cada una ([Regiones dentro de regiones](#regiones-dentro-de-regiones)). Consulta [Oráculo en el mapa](09-oracle.md).

## Salas

Marca **Se juega como un solo lugar (una sala)** en el panel de una región y un viaje toma toda la región como **un solo lugar**, como una sala en una mazmorra; sin marcar, cada una de sus casillas es un lugar propio, como en cualquier mapa. Lo que cambia es lo que hace un viaje allí. Imagina un salón de doce casillas con una comprobación de encuentro al entrar en un lugar:

- **Sin marcar**: cruzar el salón lleva hasta doce pasos, cada casilla en la que se entra es un lugar en el que se entra, así que la comprobación puede salir en cada casilla, y las tablas leen la casilla que pisa el grupo.
- **Marcada**: entrar es **un paso**, se entre por donde se entre, la comprobación sale **una vez**, y las tablas leen el salón: su nombre, sus valores y sus etiquetas.

Un viaje está _en_ ella, no en una de sus casillas: entrar es un paso se entre por donde se entre, sea del tamaño que sea, y la ficha del grupo queda en la casilla por la que entró. Pulsar cualquiera de sus casillas en Jugar pone rumbo a la sala. Las tablas ven la sala como el lugar: su nombre (`place.name`), sus valores (`{{place.danger}}`), todas las etiquetas de sus casillas (`place.tags: landmark`), su terreno más común y si es suelo. En el diario y el fichero es `area:<el id de la región>`.

Sobre [suelo](02-terrain.md), entre dos salas que se tocan se levanta un muro por sí solo; dibuja una [conexión](04-roads-and-rivers.md#conexiones) a través de él para una puerta (un tipo que nombra el sistema: su tiempo, si está cerrada ahora). El suelo de un pasillo que no está en ninguna sala une las salas sin muro. Una región dentro de una sala sigue siendo esa sala (nombra una parte de ella, y las tablas leen la sala), salvo que también se juegue como un solo lugar: entonces es una sala propia dentro de la otra, con un muro entre ellas salvo que se dibuje una puerta. Las Barrow-halls de las Grey Marches tienen tres salas (la escalera del túmulo, el túmulo largo, la tumba del jefe), una puerta de bronce a la tumba y una cuarta sala dentro de la tumba, el nicho funerario, tras una losa sellada.

# Regiones

Las regiones dan nombre a zonas del mapa: reinos, territorios, zonas peligrosas. Usa la herramienta **Regiones** (<kbd>N</kbd>).

## Crear y pintar

1. **Nueva región** crea una y la selecciona.
2. Pinta sus hexes con el pincel (el mismo **Tamaño del pincel** que el terreno). El clic derecho saca hexes de su región; <kbd>Ctrl</kbd>+clic coge la región de un hex.
3. En los ajustes de la región: **Nombre**, color, **Mostrar el nombre en el mapa** con su **Estilo** (el del mapa o uno propio) y una **Nota enlazada**.

**Generar sus hexes vacíos**, en sus ajustes, rellena los hexes de la región que aún no tienen terreno con el modelo de tierra del sistema, como hace **Generar tierra** de la herramienta Terreno con todo el mapa (con su semilla y su modelo): una región de hexes vacíos pintada al este de una cordillera crece desde la cordillera ([Terreno](02-terrain.md#generar-tierra)).

Un hex pertenece como mucho a una región. El panel del hex también tiene una lista **Región** para cambiarla. **Borrar región**, en sus ajustes, la quita (pregunta antes si tiene hexes, que se quedan sin región; ↶ lo deshace).

## Valores

Una región también puede tener **campos** (clave–valor, como los de un hex). Valen para **todos los hexes de la región**: pon `danger: 2` al Bosque Gris una vez en lugar de en cada hex. El campo propio de un hex con la misma clave gana, así que el corazón del bosque puede decir `danger: 3`. El panel de un hex muestra, bajo sus propios campos, lo que recibe de su región («De su región (The Greywood): danger = 2»). Las tablas y las comprobaciones de viaje los leen como los del hex: `{{hex.danger}}`. Mira [Lo que ven las tablas](../technical/04-what-tables-see.md).

## En el mapa

Una región se dibuja como un tinte suave, un borde por el interior de su contorno (para que las regiones vecinas no se solapen) y su nombre en el centro. Las regiones son la geografía, así que se ven como en un atlas: un color liso y una línea continua. Las [facciones](12-world.md#facciones), la política, se dibujan distinto por encima (rayas de su color y una frontera discontinua), así que un hex de una región en manos de una facción se lee como el color de la región con las rayas de la facción.

**Mientras trabajas con la herramienta Regiones**, la región que pinta se resalta con un contorno (una línea clara y gruesa con un borde oscuro, que se ve sobre cualquier terreno) y el resto del mapa se oscurece; las tierras de las facciones se atenúan, para que las regiones pasen al frente (la capa **Facciones** sigue ocultándolas). Al pasar sobre un hex, debajo del mapa se dice qué lo tiene: _Región: The Greywood · Facción: Los Clanes de Hierro_. La capa **Regiones** las oculta o bloquea todas; **Ajustes del mapa → Textos del mapa** da estilo u oculta todos los nombres de región.

**Ajustes del mapa → Regiones** fija cómo se ven todas: el **relleno** (la intensidad del tinte; 0 para ninguno), el grosor del **borde** (0 para ninguno), su opacidad y si es **discontinuo**. Una región puede verse a su manera: marca **Estilo propio** en su panel y mueve sus propios deslizadores. En las Marcas Grises, el Bosque Gris tiene un tinte más intenso y las Hollow Hills solo un borde discontinuo.

## Al jugar

Las comprobaciones de viaje y las tiradas de Oracle ven la región del hex por su **nombre**, así que una tabla puede decir `when: { hex.region: Las Marcas Negras }`. Consulta [Oracle en el mapa](09-oracle.md).

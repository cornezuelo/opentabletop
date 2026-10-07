# Regiones

Las regiones dan nombre a zonas del mapa: reinos, territorios, zonas peligrosas. Usa la herramienta **Regiones** (<kbd>N</kbd>).

## Crear y pintar

1. **Nueva región** crea una y la selecciona.
2. Pinta sus hexes con el pincel (el mismo **tamaño del pincel** que el terreno). El clic derecho saca hexes de su región; <kbd>Ctrl</kbd>+clic coge la región de un hex.
3. En los ajustes de la región: **nombre**, **color**, **mostrar el nombre en el mapa** con su **estilo** (el del mapa o uno propio) y una **nota enlazada**.

Un hex pertenece como mucho a una región. El panel del hex también tiene una lista **Región** para cambiarla.

## Valores

Una región también puede tener **campos** (clave–valor, como los de un hex). Valen para **todos los hexes de la región**: pon `danger: 2` al Bosque Gris una vez en lugar de en cada hex. El campo propio de un hex con la misma clave gana, así que el corazón del bosque puede decir `danger: 3`. El panel de un hex muestra, bajo sus propios campos, lo que recibe de su región («De su región (The Greywood): danger = 2»). Las tablas y las comprobaciones de viaje los leen como los del hex: `{{danger}}`. Mira [Lo que ven las tablas](../technical/04-what-tables-see.md).

## En el mapa

Una región se dibuja como un tinte suave, un borde por el interior de su contorno (para que las regiones vecinas no se solapen) y su nombre en el centro. La capa **Regiones** las oculta o bloquea todas; **Ajustes → Textos del mapa** da estilo u oculta todos los nombres de región.

**Ajustes → Regiones** fija cómo se ven todas: el **relleno** (la intensidad del tinte; 0 para ninguno), el grosor del **borde** (0 para ninguno), su opacidad y si es **discontinuo**. Una región puede verse a su manera: marca **Estilo propio** en su panel y mueve sus propios deslizadores. En las Marcas Grises, el Bosque Gris tiene un tinte más intenso y las Hollow Hills solo un borde discontinuo.

## Al jugar

Las comprobaciones de viaje y las tiradas de Oracle ven la región del hex por su **nombre**, así que una tabla puede decir `when: { region: Las Marcas Negras }`. Consulta [Oracle en el mapa](09-oracle.md).

# Estilos de mapa

Cómo se dibuja un mapa es su **estilo** (`kind: style`): el papel, el terreno, lo que se dibuja en cada terreno, las costas, caminos y ríos, suelos y muros, cómo se ve cada clase de conexión, los nombres y las regiones. Nunca cambia lo que contiene el mapa ni cómo se juega un viaje. Mapa elige uno por mapa (**Ajustes del mapa → Estilo**, mira [Estilos](../map/01-getting-started.md#estilos)); aquí, bajo **Estilos de mapa** en la columna izquierda, se ven y se cambian en formularios los estilos de todos los packs cargados, sirvan al sistema que sirvan.

## Un estilo tuyo

Un estilo incluido (el Esquemático, Pergamino, Pintado, Mazmorra clásica, Cueva y Aldea de Core) no puede cambiar. **Hacer una copia** crea un estilo tuyo a partir del que se muestra, con su nombre (_Pergamino (copia)_), en tu pack **Mis estilos de mapa** (que se crea con tu primera copia, en este navegador), y lo abre. **Quitar** elimina uno tuyo: los mapas dibujados con él se dibujan con el Esquemático hasta que vuelva (↶ lo devuelve).

Mapa hace lo mismo junto al propio mapa: **Ajustes del mapa → Estilo → Hacer una copia** copia el estilo del mapa y dibuja el mapa con la copia, y **Editar** abre este mismo formulario debajo, así que cada cambio se ve en el mapa al momento. Un mapa abierto en Mapa, en otra pestaña, también muestra los cambios hechos aquí según se hacen.

## El formulario

Su **Nombre** y su **Descripción** (lo que **Ajustes del mapa → Estilo** muestra debajo; Markdown básico), y luego cada parte del estilo como una ficha plegada, con su clave en YAML junto al título. Un campo vacío es el del estilo Esquemático, que se muestra en gris como texto de ejemplo; la **×** de un color vuelve a él.

- **Papel y rejilla** (`paper`, `grid`, `glyphs`): el color de las casillas sin nada pintado, el color y la opacidad de la rejilla, si las casillas muestran sus coordenadas y cuánto se ven los pequeños símbolos de los terrenos.
- **Terreno** (`ground`): la **Aguada** mezcla el color de cada terreno hacia el del papel (`0.6`, una aguada suave); el **Fundido** suaviza los bordes entre terrenos; los **Bordes irregulares** los sacan de los lados de las casillas (los muros los siguen: una cueva); el **Grano** pone el grano del papel sobre todo.
- **Arte** (`art`): la **Forma de dibujar** (**Tinta**, líneas sobre el color del terreno, o **Pintado**, formas iluminadas por un lado y en sombra por el otro), el color de la **Tinta** y, **Por terreno**, una fila para cada id de terreno con arte: su **Pintor** (hierba, coníferas, montañas, olas…), su **Densidad** y su **Tamaño** (1 lo de siempre) y su propio **Color**. **+ Terreno** añade uno (se sugieren los terrenos del mapa); un terreno sin fila no tiene arte.
- **Costas** (`shores`): las líneas a lo largo de una costa por el lado del agua (de 0 a 5), su color y una franja clara de **Aguas someras**.
- **Caminos y ríos** (`paths`): el **Temblor** de la mano, y el color y el grosor de ríos, caminos y sendas.
- **Suelos** (`floors`) y **Muros** (`walls`): para mapas con salas y pasillos: el color del suelo, cuánto ceden ante él los colores de los terrenos, una rejilla solo en el suelo; el color y el grosor de los muros, y lo que se dibuja **Por fuera** (rayado, una sombra, el punteado de una cueva) y hasta dónde.
- **Tejados** (`roofs`): los edificios vistos desde fuera: su tejado (**tejas**, **pizarra**, **paja**, **liso** o **ninguno**: suelos y muros siempre a la vista, como en una mazmorra), su color y la sombra que proyecta. Un edificio se abre mientras la party está dentro o hay una de sus casillas seleccionada, y solo entonces se ve lo de dentro (puertas, iconos, nombres, tokens); la capa **Tejados** de Mapa los abre todos.
- **Conexiones** (`connections`): una fila para cada clase de conexión o de camino entre mapas, por el id de la clase tal como lo nombra el sistema (`door`, `ford`, `way-in`): su **Símbolo** (una puerta, un arco, un puente, las piedras de un vado, una escalera, una escala, la boca de una cueva…), su **Línea** y su **Color**. **+ Clase** añade una (se sugieren las clases de los sistemas); una clase sin fila se dibuja como siempre.
- **Nombres** (`captions`) y **Regiones** (`regions`): cómo se dibujan los nombres de casillas, regiones y fichas, y el relleno y los bordes de las regiones. Estos se **copian en un mapa** al elegir el estilo, y luego el mapa los cambia a su gusto: un cambio aquí llega a un mapa cuando se vuelve a elegir el estilo (**Volver a tomar sus nombres y regiones** en los ajustes del mapa).

Si el estilo tiene algún problema (un valor fuera de su rango, escrito en YAML), el formulario dice cuál, y los mapas lo dibujan como el Esquemático hasta que se arregle. Cada clave, sus valores y el YAML: [Clases de definición → Estilos de mapa](../technical/07-kinds.md#estilos-de-mapa).

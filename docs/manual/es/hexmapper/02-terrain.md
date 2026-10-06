# Terreno

Pinta el territorio con la herramienta **Terreno** (<kbd>B</kbd>).

## Pintar

- **Pincel** (<kbd>B</kbd>): haz clic o arrastra para pintar el terreno elegido. El control **Tamaño del pincel** pinta varios hexes a la vez (<kbd>[</kbd> y <kbd>]</kbd> lo cambian).
- **Rellenar** (<kbd>G</kbd>): pinta toda una zona conectada del mismo terreno.
- **Borrar** (<kbd>E</kbd>), o el botón derecho en cualquier modo: quita el terreno.
- <kbd>Ctrl</kbd>+clic coge el terreno que hay bajo el cursor (cuentagotas).

## La paleta

La paleta lista los terrenos del mapa: estepa, llanura, cultivos, bosque, jungla, taiga, colinas, montañas, tierras baldías, desierto, pantano, tundra, nieve, volcánico, lago y mar. **Editar paleta** permite cambiar cada uno:

- **Color** y **nombre** (nombre vacío = el traducido por defecto).
- **Símbolo**: el pequeño dibujo de sus hexes (ver abajo).
- **Agua**: los caminos y ríos se detienen en la orilla de los terrenos de agua, y el viaje no puede cruzarlos.
- Añade tus propios terrenos o bórralos (los hexes pintados con un terreno borrado quedan vacíos).

Los ids de terreno (`forest`, `hills`…) son lo que leen las reglas de viaje y las tablas, así que una tabla puede decir `when: { terrain: forest }`.

## Símbolos del terreno

Cada terreno puede dibujar un símbolo discreto en sus hexes (un árbol, una montaña, olas…) en un tono más claro u oscuro de su color. Elígelo en **Editar paleta** con el botón junto al color: el conjunto Terreno, cualquier imagen del mapa o **Importar una imagen…** para usar una tuya. El control **Símbolos del terreno** los atenúa; a 0 se ocultan. Los hexes con icono muestran el icono en su lugar.

# Crear un sistema

Un sistema de viaje son dos definiciones en un pack, normalmente en un mismo fichero: **reglas de viaje** (`kind: travel-rules`) y **bindings** (`kind: bindings`). [Conectar tablas con mapas y viajes](../oracle/07-connecting.md) explica cada parte de ambas, paso a paso y con ejemplos.

## Un sistema nuevo

Escribe un nombre en la casilla de abajo de la lista de sistemas y pulsa **+**. Crea un pack tuyo con las reglas Genéricas de partida y unos bindings vacíos, y abre su pestaña **YAML**. Cámbialo ahí: cada cambio se comprueba mientras escribes y los problemas se marcan en su línea. El sistema se puede jugar al momento en esta aplicación y en el Hexmapper (en el mismo navegador).

Las tablas que nombren sus bindings van en el mismo pack: añádelas en la aplicación Oracle (tu pack nuevo también sale allí), o usa tablas de otros packs con su id completo (`core/weather`).

## Cambiar un sistema incluido

Los sistemas incluidos son de solo lectura. En su pestaña **YAML**, **Editar una copia** hace una copia de todo el pack que puedes cambiar; sustituye al incluido en este navegador. Las copias de packs de uso personal siguen siendo de uso personal.

## Probarlo

La pestaña **Jugar** es la forma más rápida de comprobar un sistema: monta un camino corto con los terrenos, caminos y etiquetas que importan a tus reglas, y mira el diario. Por ejemplo, para probar una comprobación con `when: { tags: landmark }`, pon la etiqueta `landmark` al último hex y viaja.

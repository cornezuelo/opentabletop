# Bestiario

La pestaña **Bestiario** edita los **bestiarios** del sistema (`kind: bestiary`): las criaturas y clases de gente que puede crear, como **plantillas**. Una plantilla es un personaje de una de las [hojas](07-sheet.md) del sistema, escrito como se escribe un personaje, cuyas tiradas se hacen de nuevo para cada copia: un _lobo gris_ con `health: 2d4` da lobos con distinta salud. Una tabla o una acción hace copias con un efecto (`present.grey-wolf: '{{1d4+2}}'`), y quedan entre los presentes del viaje. Una copia conserva con lo que se hizo, así que cambiar una plantilla solo toca a las copias hechas después.

Esta pestaña es **el único sitio donde se crean y se cambian las plantillas**: son parte del sistema, como sus hojas. La [aplicación Personajes](../characters/01-getting-started.md#el-bestiario) las muestra tal cual y hace copias de ellas en el plantel; su **Editar en Sistemas ↗** abre esta pestaña en la plantilla, desplegada, y su **Nueva plantilla ↗** abre esta pestaña.

## La pestaña

Un bestiario a la vez; con varios, una fila de botones elige. **Nuevo bestiario** crea uno pequeño (un lobo y un jefe de lobos) con la hoja de los personajes del sistema y lo añade al **Resumen** del sistema (`bestiary:`, una lista). Un bestiario tiene:

- Su **Nombre**, la **Hoja** con la que se hacen sus plantillas salvo que una nombre la suya, y qué pasa con las copias **Al dejarlas atrás**: se quedan donde se hicieron, o se van. Cuál de las dos lo dice el sistema; vacío significa que se quedan.
- Sus **Plantillas**, como tarjetas plegadas: cada una en una línea (su nombre, su id y lo que fija), que se despliega con un clic; **Desplegar todo**, **Plegar todo** y una búsqueda cuando hay muchas. **Añadir** crea una nueva. Una tarjeta desplegada tiene su **Id** (con el que la nombran efectos y tablas), su **Hoja** (vacía: la del bestiario) y el editor de la plantilla, tal como lo dispone su hoja:
  - **Se nombra** `present.<id>`: cómo hacen y leen sus copias las tablas, las acciones y los efectos (`present.wolf: 3`, `present.wolf.count: { gte: 2 }`); sus campos lo sugieren.
  - Su **Nombre** y su **Descripción**, la plantilla de la que es **Variante de** (toma sus valores y objetos, escribe encima y suma sus etiquetas y condiciones), el generador que se tira para los **Nombres** de cada copia, qué pasa con sus copias **Al dejarlas atrás**.
  - Una casilla por cada uno de los **Valores** de la hoja, por grupos: un número, o una tirada entre llaves que se hace para cada copia (`{{2d4}}`); vacía toma el valor por defecto de la hoja, en gris.
  - Sus **Condiciones** (las de la hoja, marcadas), sus **Etiquetas** (se sugieren las que ya usan los personajes y plantillas del sistema), sus **Objetos** de los catálogos del sistema con cuántos, y cómo se dibuja como **Ficha** en un mapa.

Los valores y las condiciones salen de la hoja y los objetos de los catálogos, así que no se cuela un nombre inventado. Su nombre y su descripción se escriben en el idioma de la aplicación: en la propia plantilla si es el idioma del pack, y si no, en la traducción del pack ([Traducir](../technical/01-translating.md)). El YAML: [Bestiarios](../technical/07-kinds.md#bestiarios).

## Paso a paso: lobos

1. En **Bestiario**, **Nuevo bestiario**. Conserva el lobo: despliega su tarjeta y escribe `{{2d4}}` en su **Salud**.
2. Haz el jefe: despliega **Wolf leader**; su **Variante de** ya es `wolf`; escribe `{{2d4+2}}` en su **Salud**.
3. En **Reglas** o en las tablas, un efecto `present.wolf: '{{1d4+2}}'` trae la manada.
4. **Pruébalo**: tras el efecto, la caja **Aquí** del viaje muestra los lobos, cada uno con su salud.

Los sistemas incluidos son de solo lectura: **Duplicad** uno para cambiarlo.

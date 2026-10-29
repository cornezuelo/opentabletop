# Bestiario

La pestaña **Bestiario** edita los **bestiarios** del sistema (`kind: bestiary`): las criaturas y clases de gente que puede crear, como **plantillas**. Una plantilla es un personaje de una de las [hojas](07-sheet.md) del sistema, escrito como se escribe un personaje, cuyas tiradas se hacen de nuevo para cada copia: un _lobo gris_ con `health: 2d4` da lobos con distinta salud. Una tabla o una acción hace copias con un efecto (`present.grey-wolf: '{{1d4+2}}'`), y quedan entre los presentes del viaje. Una copia conserva con lo que se hizo, así que cambiar una plantilla solo toca a las copias hechas después.

## La pestaña

Un bestiario a la vez; con varios, una fila de botones elige. **Nuevo bestiario** crea uno pequeño (un lobo y un jefe de lobos) con la hoja de los personajes del sistema y lo añade al **Resumen** del sistema (`bestiary:`, una lista). Un bestiario tiene:

- Su **Nombre**, la **Hoja** con la que se hacen sus plantillas salvo que una nombre la suya, y qué pasa con las copias **Al dejarlas atrás**: se quedan donde se hicieron, o se van. Cuál de las dos lo dice el sistema; vacío significa que se quedan.
- Sus **Plantillas**, cada una con un id (con el que la nombran efectos y tablas: `present.<id>`), con su **Nombre** y **Descripción**, su **Hoja**, la plantilla de la que es **Variante de** (toma sus valores y objetos, escribe encima y suma sus etiquetas y condiciones), los **Valores** con que empieza (un número, o una tirada entre llaves), sus **Condiciones**, sus **Objetos** de los catálogos del sistema, sus **Etiquetas**, el generador que se tira para el **Nombre** de cada copia y cómo se dibuja como **Ficha** en un mapa.

Los valores, condiciones y objetos se ofrecen desde la hoja y los catálogos, así que un nombre inventado se nota enseguida. El YAML: [Bestiarios](../technical/07-kinds.md#bestiarios).

## Paso a paso: lobos

1. En **Bestiario**, **Nuevo bestiario**. Conserva el lobo; pon sus **Valores** a `health` · `{{2d4}}`.
2. Haz el jefe: su **Variante de** `wolf-leader` ya es `wolf`; añade un valor `health` · `{{2d4+2}}`.
3. En **Reglas** o en las tablas, un efecto `present.wolf: '{{1d4+2}}'` trae la manada.
4. **Pruébalo**: tras el efecto, la caja **Aquí** del viaje muestra los lobos, cada uno con su salud.

Los sistemas incluidos son de solo lectura: edita una copia.

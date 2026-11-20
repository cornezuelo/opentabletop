# Bestiario

La pestaña **Bestiario** edita los **bestiarios** del sistema (`kind: bestiary`): las criaturas y clases de gente que puede crear, como **plantillas**. Una plantilla es un personaje de una de las [hojas](07-sheet.md) del sistema, escrito como se escribe un personaje, cuyas tiradas se hacen de nuevo para cada copia: un _lobo gris_ con `health: 2d4` da lobos con distinta salud. Una tabla o una acción hace copias con un efecto (`present.grey-wolf: '{{1d4+2}}'`), y quedan entre los presentes del viaje. Una copia conserva con lo que se hizo, así que cambiar una plantilla solo toca a las copias hechas después.

Esta pestaña es **el único sitio donde se crean y se cambian las plantillas**: son parte del sistema, como sus hojas. La [aplicación Personajes](../characters/01-getting-started.md#el-bestiario) las muestra tal cual y hace copias de ellas en el plantel; su **Editar en Packs ↗** abre esta pestaña en la plantilla, desplegada, y su **Nueva plantilla ↗** abre esta pestaña.

## La pestaña

Un bestiario a la vez; con varios, una fila de botones elige. **Nuevo bestiario** crea uno pequeño (un lobo y un jefe de lobos) con la hoja de los personajes del sistema y lo añade al **Resumen** del sistema (`bestiary:`, una lista). Un bestiario tiene:

- Su **Nombre**, la **Hoja** con la que se hacen sus plantillas salvo que una nombre la suya, y qué pasa con las copias **Al dejarlas atrás**: se quedan donde se hicieron, o se van. Cuál de las dos lo dice el sistema; vacío significa que se quedan. **Siguen al grupo**: si las copias se van con el grupo cuando se marcha (una persecución): **Nunca** (o vacío), **Siempre**, o **Mientras…** una condición, en filas, leída actuando cada copia: _mientras quiera hacer daño_, _salvo si el grupo va a caballo_, _salvo si se le echó carne_ (un estado que les da una acción, lo que cuesta darles esquinazo). Las que no lo siguen se quedan atrás.
- Sus **Plantillas**, como tarjetas plegadas: cada una en una línea (su nombre, su id y lo que fija), que se despliega con un clic; **Desplegar todo**, **Plegar todo** y una búsqueda cuando hay muchas. **Añadir** crea una nueva. Una tarjeta desplegada tiene su **Id** (con el que la nombran efectos y tablas), su **Hoja** (vacía: la del bestiario) y el editor de la plantilla, tal como lo dispone su hoja:
  - **Se nombra** `present.<id>`: cómo hacen y leen sus copias las tablas, las acciones y los efectos (`present.wolf: 3`, `present.wolf.count: { gte: 2 }`); sus campos lo sugieren.
  - Su **Nombre** y su **Descripción**, la plantilla de la que es **Variante de** (toma sus valores y objetos, escribe encima y suma sus etiquetas y condiciones), el generador que se tira para los **Nombres** de cada copia, lo que hace una copia **En su turno** en un combate por turnos (una tabla que se tira por ella, actuando como ella; vacío: **El turno de un enemigo** del sistema, en el [Resumen](04-overview.md); una variante toma el de su plantilla), qué pasa con sus copias **Al dejarlas atrás**, y si sus copias **Luchan** (abajo). Bajo el editor, si sus copias **Siguen al grupo** (vacío: lo del bestiario).
  - Una casilla por cada uno de los **Valores** de la hoja, por grupos: un número, o una tirada entre llaves que se hace para cada copia (`{{2d4}}`); vacía toma el valor por defecto de la hoja, en gris.
  - Sus **Condiciones** (las de la hoja, marcadas), sus **Etiquetas** (se sugieren las que ya usan los personajes y plantillas del sistema), sus **Objetos** de los catálogos del sistema con cuántos, y cómo se dibuja como **Ficha** en un mapa. Encima, **Su imagen**: una imagen de tu biblioteca de imágenes, la cara de sus copias en las tarjetas de un combate, en el orden de la ronda y en las listas, salvo que una copia tenga su propio retrato. No se escribe en el pack: es tuya, guardada en este navegador y en sus copias de seguridad, así que se puede elegir incluso para una plantilla de un pack incluido, sin hacer una copia.

Los valores y las condiciones salen de la hoja y los objetos de los catálogos, así que no se cuela un nombre inventado. Su nombre y su descripción se escriben en el idioma de la aplicación: en la propia plantilla si es el idioma del pack, y si no, en la traducción del pack ([Traducir](../technical/01-translating.md)). El YAML: [Bestiarios](../technical/07-kinds.md#bestiarios).

## Cosas que no luchan

Una plantilla cuyo **Lucha** es **No: es una cosa** (`fights: false`) hace cosas, no enemigos: un cofre, una trampa, un altar, alguien con quien uno se cruza en el camino y que no quiere hacer daño. Sus copias están entre los presentes como cualquier otra (su tarjeta en la pestaña **Aquí** del viaje, que leen y cambian las tablas y las acciones), pero un combate las deja fuera: no tienen turno ni están en el bando de los enemigos, y `present.fighters.count` no las cuenta, así que los combates del sistema y todo lo que diga «hay enemigos aquí» leen eso (`present.count` cuenta a todos). Dadle a una cosa una hoja propia (la **Cerradura** y la **Aguja** de un cofre, su estado _Abierto_ que la quita de los presentes cuando ya se ha terminado con ella) y acciones dirigidas a ella: un parámetro cuyas opciones son las de aquí a las que les vale (`chest: { from: present.ids, where: { 'characters[candidate].conditions': locked } }`) y pasos que cambian la elegida (`'characters[params.chest].values.lock': '=0'`). El cofre de ajuar de las Marcas Grises lo enseña entero, y el cofre cerrado de Core, lo más pequeño ([Packs incluidos](../bundled/01-core.md)).

## Paso a paso: lobos

1. En **Bestiario**, **Nuevo bestiario**. Conserva el lobo: despliega su tarjeta y escribe `{{2d4}}` en su **Salud**.
2. Haz el jefe: despliega **Wolf leader**; su **Variante de** ya es `wolf`; escribe `{{2d4+2}}` en su **Salud**.
3. En **Reglas** o en las tablas, un efecto `present.wolf: '{{1d4+2}}'` trae la manada.
4. **Pruébalo**: tras el efecto, la pestaña **Aquí** del viaje muestra los lobos, cada uno con su salud.

Los sistemas incluidos son de solo lectura: **Duplicad** uno para cambiarlo.

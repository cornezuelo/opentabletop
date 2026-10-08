# Primeros pasos

La aplicación Oracle tira y edita las tablas aleatorias de tus juegos: tablas, oráculos, generadores y mazos, agrupados en **packs**. Todo se queda en tu navegador; para tener una copia o llevarlo a otro ordenador, ver [Copias de seguridad de todo](../technical/05-backups.md).

## La pantalla

- **Cabecera**: el selector de aplicaciones (nueve puntos), **Nueva definición**, **Nuevo pack**, **Importar .zip**, el engranaje (**Preferencias**: el idioma y la aplicación de notas que comparten todas las aplicaciones, y las propias del Oracle: una semilla para repetir tiradas y qué packs muestra la lista) y **?**. Las pestañas pequeñas en los bordes de la columna central (‹ ›) pliegan las columnas laterales para ganar espacio, y las vuelven a sacar; la aplicación lo recuerda.
- **Lista de packs** (izquierda): cada pack y sus definiciones, con un buscador (por nombre, id o etiqueta). Las insignias indican de dónde viene un pack: _incluido_, _editado_ (tu copia de un pack incluido), _uso personal_. Un número rojo cuenta sus problemas. El **+** junto a uno de tus packs le añade una definición. Los packs que no uses pueden salir de la lista: desmárcalos en **Preferencias → Packs en la lista** (siguen cargados, y sus favoritos siguen fijados). La aplicación se abre en el pack del último sistema que elegiste en Travel o Systems, y elegir un pack que trae un sistema hace que esas aplicaciones se abran en él la próxima vez (este navegador lo recuerda).
- **Definición** (centro): la pestaña **Tirar** la tira y **Editar** la cambia. Encima: su id, su fichero (haz clic para abrirlo en el editor YAML) y las acciones **Duplicar**, **Copiar a…** y **Borrar**.
- **Historial** (derecha): tus últimas tiradas. Haz clic en una para volver a verla.

**Ayuda donde estás**: una etiqueta subrayada con puntos tiene una explicación, a menudo con ejemplos de qué escribir. Púlsala y la columna de ayuda (**?**, a la derecha) se abre en ella, en lugar de este manual: qué hace el campo, ejemplos que funcionan y, bajo **En el manual**, las secciones del manual que hablan de él (primero la página de Sintaxis); **← El manual** vuelve al manual. Desde un campo, <kbd>F1</kbd> muestra su ayuda. Pasar a otro campo no cambia lo que enseña la columna, así que un clic en un ejemplo de ella lo inserta en el campo en el que escribes.

**Los ejemplos entran con un clic**: después de haber estado en una casilla de texto o en el editor YAML, pulsa un ejemplo en `código` de la columna de ayuda (en la ayuda de un campo, en la página de **Sintaxis** o en cualquier parte del manual) y entra donde estaba el cursor; **Ctrl+Z** lo quita. **Sintaxis**, junto al buscador de la columna, abre la página con todo lo que puede escribir un pack. El buscador mira en las páginas de esta aplicación, en las técnicas y en las de los packs, y muestra en negrita las palabras encontradas. Los botones que solo tienen un icono dicen su nombre al pasar el ratón.

## Cuatro tipos de definición

| Tipo          | Qué hace                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **Tabla**     | Tira dados (o elige por peso) y lee la entrada.                                                 |
| **Oráculo**   | Una tabla con variantes que elige una entrada, como la probabilidad de una pregunta de sí o no. |
| **Generador** | Tira varios campos (tablas, dados, valores) y rellena una plantilla de texto.                   |
| **Mazo**      | Cartas que se roban sin reponer hasta que se baraja.                                            |

Sigue leyendo: [Tirar](02-rolling.md), [Packs](03-packs.md), [Editar](04-editing.md) , [Dados, variables y contexto](08-dice-and-templates.md) y [Conectar tablas con mapas y viajes](07-connecting.md) para crear tablas y sistemas de viaje que funcionen con el Hexmapper.

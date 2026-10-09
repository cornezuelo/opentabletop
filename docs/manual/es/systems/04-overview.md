# Resumen

La pestaña **Resumen** es la definición propia del sistema (`kind: system`, en `system.yaml`): cómo se llama, con qué se juega y qué trae. Un sistema de un pack antiguo (reglas de viaje sin `kind: system`) muestra **Declararlo** en su lugar: escribe `system.yaml` nombrando lo que usa hoy el sistema, y se juega igual.

## Nombre y descripción

Su **Nombre** y su **Descripción**, como los muestran todas las aplicaciones (en el idioma de la interfaz: el del pack, o su traducción).

## Sus partes

- **Reglas de viaje**, **Bindings** y **Calendario**: con los que se juega, cada uno elegido entre los de este pack (por su id) y los de sus dependencias (`core/default`), con su nombre si lo tienen (_El cómputo real (royal-reckoning)_). **Abrir** va a la pestaña que los edita; **Crear** hace unas reglas de viaje nuevas (a partir de las Genéricas) o unos bindings vacíos y los nombra.
- **Modelos de clima**: los que pueden nombrar sus bindings (`weather: highland-skies`), cada uno con su nombre y su id. Se editan en [Clima](10-weather.md).

## Packs que trae

El suyo siempre, y las dependencias que marques, cuyas tablas vienen con él: un mapa que se juega con él las muestra en su panel del Oracle. Para traer otro pack, añádelo a las dependencias en `pack.yaml`.

## Mapas de ejemplo

Mapas en los que jugar el sistema, guardados en su pack (`maps:`):

- **Abrir en el Hexmapper →** abre uno allí como lo haría su **Mapas → Mapas de ejemplo**.
- **Añadir un fichero de mapa…** copia en la carpeta `maps/` del pack un fichero de mapa escrito por **Guardar** en el Hexmapper.
- **Quitar** lo saca del pack.

## Llevarlo a otra parte

Tus sistemas solo viven en este navegador. Para ponerlo a salvo, llevarlo a otro navegador o dárselo a alguien, el Resumen acaba con **Llevarlo a otra parte**: dice lo que lleva el fichero y **Exportar como .zip** lo descarga. El .zip lleva todos los packs que necesita el sistema, cada uno en su carpeta: el suyo, los que trae, los que tienen sus partes y sus dependencias, hasta donde lleguen. El fichero de las Marcas Grises, por ejemplo, lleva las Marcas Grises y Core.

**Importar un sistema (.zip)…**, bajo la lista de sistemas, vuelve a leer ese fichero y abre el sistema que trae (el **Importar .zip** de la Oracle también lo lee):

- los packs que no tienes se añaden a los tuyos;
- los que ya están y sin cambios (un Core incluido, por ejemplo) se quedan como están;
- un pack que tienes en otra versión solo se sustituye tras preguntar: uno tuyo se sobrescribe, uno incluido queda tapado por tu copia importada (**Volver a la versión incluida** lo recupera). **↶** deshace toda la importación de una vez.

Un sistema que usa packs de uso personal lo dice junto al botón: guárdate ese fichero. La forma del fichero está en [Formatos de fichero](../technical/02-file-formats.md#packs).

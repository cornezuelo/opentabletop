# Packs

Un pack es una carpeta de ficheros YAML con un `pack.yaml` (id, nombre, versión, idioma base, licencia). Las definiciones se refieren unas a otras por id: `weather` dentro del mismo pack, `kal-arath/weather` desde otro.

## De dónde vienen los packs

- **Incluidos**: vienen con la aplicación y no se pueden cambiar. **Editar una copia** copia uno a tus packs; la copia lo sustituye (las referencias desde otros packs siguen funcionando) y **Volver al incluido** la borra. Las copias de packs de uso personal siguen siendo de uso personal: no las compartas.
- **Tuyos**: creados con **Nuevo pack** o importados, guardados en este navegador.

## Crear un pack

**Nuevo pack** pide un nombre, una carpeta o id (minúsculas, dígitos y guiones) y el idioma base en el que están escritas las tablas. Después añade definiciones con **Nueva definición** (o el **+** junto al pack): elige el tipo, el nombre y el fichero. Las definiciones pueden estar en cualquier fichero del pack; agrúpalas como prefieras.

La página del pack muestra su manifiesto, sus **problemas** (haz clic en uno para ir a la línea), sus definiciones, las definiciones de otros motores (reglas de viaje, bindings), sus ficheros (añadir, renombrar, borrar) y sus traducciones.

## Copias de seguridad y compartir

**Exportar .zip** descarga el pack como carpeta; **Importar .zip** añade uno. Tus packs solo viven en este navegador: expórtalos para no perderlos.

El Hexmapper ve tus packs cuando las dos aplicaciones se sirven desde el mismo sitio (p. ej. `…/oracle/` y `…/hexmapper/`).

## Copiar definiciones

**Duplicar** copia una definición dentro de su pack; **Copiar a…** la copia, con sus traducciones, a uno de tus packs (las referencias locales pasan a `pack/id`, así que siguen apuntando a las mismas tablas). Útil para partir de una tabla incluida.

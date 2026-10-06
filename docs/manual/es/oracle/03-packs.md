# Packs

Un pack es una carpeta de ficheros YAML con un `pack.yaml` (id, nombre, versión, idioma base, licencia). Las definiciones se refieren unas a otras por id: `weather` dentro del mismo pack, `kal-arath/weather` desde otro.

## De dónde vienen los packs

- **Incluidos**: vienen con la aplicación y no se pueden cambiar. **Editar una copia** copia uno a tus packs; la copia lo sustituye (las referencias desde otros packs siguen funcionando) y **Volver al incluido** la borra. Las copias de packs de uso personal siguen siendo de uso personal: no las compartas.
- **Tuyos**: creados con **Nuevo pack** o importados, guardados en este navegador.

## Packs de uso personal

Algunos juegos solo permiten sus tablas para **uso personal** (Kal-Arath, por ejemplo). Sus packs nunca van al proyecto público: viven en una carpeta aparte, `packs-private/`, que es su propio repositorio git privado. Cuando las aplicaciones se compilan en un ordenador que tiene esa carpeta, sus packs se incluyen solo para ese ordenador y llevan la insignia _uso personal_.

- No los compartas, no los exportes en .zip para otros y no publiques una build que los contenga.
- Una copia editada de un pack de uso personal sigue siendo de uso personal.
- Si un juego permite compartir lo dice su licencia; cada pack la indica en `pack.yaml` (`license`, `attribution`). En caso de duda, trátalo como de uso personal.

## Otras definiciones: reglas de viaje y bindings

Además de tablas, oráculos, generadores y mazos, un pack puede tener definiciones para **otros motores**. Hoy son dos, y juntas convierten un pack en un **sistema de viaje** que pueden jugar el modo Jugar del Hexmapper (**Con reglas**) y la [aplicación Travel](../travel/01-getting-started.md):

| Definición          | `kind`         | Qué dice                                                                                                                                                                   |
| ------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reglas de viaje** | `travel-rules` | Cómo funciona un viaje: la duración del día, la velocidad en cada terreno y camino, las formas de viajar, las provisiones, el clima y **qué comprobaciones** hay y cuándo. |
| **Bindings**        | `bindings`     | Cómo se **resuelven** esas comprobaciones: qué tabla tira cada una, las características del grupo que usan las tablas y cómo se descubre el mapa.                          |

**Por qué dos.** Las reglas son del Travel Engine y las tablas de Oracle, y los motores no se conocen entre sí: los bindings son el puente. Por eso cada una es opcional por separado: unas reglas sin bindings hacen un sistema en el que todas las comprobaciones te esperan (**Continuar**); las reglas genéricas no tienen ninguna comprobación.

**Por qué en un mismo fichero.** Solo por comodidad: se escriben y se cambian juntas. Un fichero YAML puede tener varias definiciones separadas por una línea con `---`, así que Kal-Arath tiene las dos en `rules.yaml` y Core en `travel.yaml`:

```yaml
kind: travel-rules
id: default
day: { start: '07:00', nightfall: '19:00' }
# …terrenos, modos, comprobaciones…
---
kind: bindings
id: default
on:
  WEATHER_CHECK_REQUIRED: { resolve: weather }
```

Igual de bien podrían ir en ficheros separados. Un pack tiene como mucho un sistema de viaje, así que las dos usan el id `default`.

**Cómo añadirlas.**

- En la aplicación Travel: **Nuevo sistema** crea un pack con las dos; sus pestañas **Reglas** y **Comprobaciones** las editan con formularios.
- En la aplicación Oracle: **Nueva definición → Para viajar** las añade a uno de tus packs. La página del pack las lista en **Otras definiciones**; ábrelas en el editor YAML, donde sus problemas se comprueban como los de cualquier otra definición.

Lo que llevan dentro se explica paso a paso en [Conectar tablas con mapas y viajes](07-connecting.md#5-tu-propio-sistema-de-viaje).

## Crear un pack

**Nuevo pack** pide un nombre, una carpeta o id (minúsculas, dígitos y guiones) y el idioma base en el que están escritas las tablas. Después añade definiciones con **Nueva definición** (o el **+** junto al pack): elige el tipo, el nombre y el fichero. Las definiciones pueden estar en cualquier fichero del pack; agrúpalas como prefieras.

La página del pack muestra su manifiesto, sus **problemas** (haz clic en uno para ir a la línea), sus definiciones, las definiciones de otros motores (reglas de viaje, bindings), sus ficheros (añadir, renombrar, borrar) y sus traducciones.

## Copias de seguridad y compartir

**Exportar .zip** descarga el pack como carpeta; **Importar .zip** añade uno. Tus packs solo viven en este navegador: expórtalos para no perderlos.

El Hexmapper ve tus packs cuando las dos aplicaciones se sirven desde el mismo sitio (p. ej. `…/oracle/` y `…/hexmapper/`).

## Copiar definiciones

**Duplicar** copia una definición dentro de su pack; **Copiar a…** la copia, con sus traducciones, a uno de tus packs (las referencias locales pasan a `pack/id`, así que siguen apuntando a las mismas tablas). Útil para partir de una tabla incluida.

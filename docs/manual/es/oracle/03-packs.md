# Packs

Un pack es una carpeta de ficheros YAML con un `pack.yaml` (id, nombre, versión, idioma base, licencia). Las definiciones se refieren unas a otras por id: `weather` dentro del mismo pack, `kal-arath/weather` desde otro. Todos los tipos de definición que puede tener un pack (tablas, oráculos, generadores, mazos, modos de tirada, reglas de viaje, bindings, calendarios, modelos de clima) están en [Tipos de definición](../technical/07-kinds.md).

## De dónde vienen los packs

- **Incluidos**: vienen con la aplicación y no se pueden cambiar. **Editar una copia** copia uno a tus packs; la copia lo sustituye (las referencias desde otros packs siguen funcionando) y **Volver al incluido** la borra. Las copias de packs de uso personal siguen siendo de uso personal: no las compartas.
- **Tuyos**: creados con **Nuevo pack** o importados, guardados en este navegador.

Cuando una versión nueva de OpenTabletop cambia un pack incluido del que tienes una copia, tu copia no cambia sola: aparece marcada como **actualización** en la lista, y su página (en la aplicación Oracle, y bajo el nombre del sistema en la aplicación Systems) enumera los ficheros que el pack incluido ha cambiado, añadido o quitado desde que hiciste la copia, diciendo en cada uno si tú también lo tocaste. En cada fichero, **Coger el incluido** trae la versión nueva (la tuya de ese fichero se sustituye) y **Quedarme el mío** deja la tuya y deja de avisar; **Ver la versión incluida** la enseña antes. **Coger las actualizaciones que no has tocado** trae de una vez todos los ficheros cambiados que tu copia dejó como estaban, así que no se pierde nada tuyo. **Dejar mi copia como está** las ignora todas. Todo se deshace con ↶. Las copias hechas antes de que esto existiera muestran los ficheros que son distintos de la versión incluida, porque no se puede saber si los cambiaste tú o una actualización; elige una vez y a partir de entonces solo se muestran las actualizaciones de verdad.

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

**Por qué en un mismo fichero.** Solo por comodidad: se escriben y se cambian juntas. Un fichero YAML puede tener varias definiciones separadas por una línea con `---`, así que las Marcas Grises tienen las dos en `travel.yaml`:

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

- En la aplicación Systems: **Nuevo sistema** crea un pack con las dos; sus pestañas **Reglas** y **Comprobaciones** las editan con formularios.
- En la aplicación Oracle: **Nueva definición → Reglas del sistema** añade una de ellas (modos de tirada, reglas de viaje, bindings, un calendario o un modelo de clima) a uno de tus packs, como un ejemplo válido para cambiar en el editor YAML ([Tipos de definición](../technical/07-kinds.md) explica cada una). La página del pack las lista en **Otras definiciones**; ábrelas en el editor YAML, donde sus problemas se comprueban como los de cualquier otra definición.

Lo que llevan dentro se explica paso a paso en [Conectar tablas con mapas y viajes](07-connecting.md#5-tu-propio-sistema-de-viaje).

## Crear un pack

**Nuevo pack** pide un nombre, una carpeta o id (minúsculas, dígitos y guiones) y el idioma base en el que están escritas las tablas. Después añade definiciones con **Nueva definición** (o el **+** junto al pack): elige el tipo, su id y nombre, y el fichero en que va (**En el fichero**: uno que ya existe o uno nuevo). Las definiciones pueden estar en cualquier fichero del pack; agrúpalas como prefieras.

La página del pack muestra su manifiesto, sus **problemas** (haz clic en uno para ir a la línea), sus definiciones, las definiciones de otros motores (reglas de viaje, bindings), sus ficheros (añadir, renombrar, borrar) y sus traducciones. Bajo su nombre, **Exportar .zip** y **Borrar pack**, que quita el pack y todos sus ficheros de este navegador (pregunta antes; expórtalo primero si puedes quererlo de vuelta).

## Copias de seguridad y compartir

**Exportar .zip** descarga el pack como carpeta; **Importar .zip** añade uno. Tus packs solo viven en este navegador: expórtalos para no perderlos.

El Hexmapper ve tus packs cuando las dos aplicaciones se sirven desde el mismo sitio (p. ej. `…/oracle/` y `…/hexmapper/`).

## Copiar definiciones

**Duplicar** copia una definición dentro de su pack; **Copiar a…** la copia, con sus traducciones, a uno de tus packs (las referencias locales pasan a `pack/id`, así que siguen apuntando a las mismas tablas). Útil para partir de una tabla incluida.

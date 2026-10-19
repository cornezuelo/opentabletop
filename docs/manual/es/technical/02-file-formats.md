# Formatos de fichero

Todo lo que guarda OpenTabletop es texto que se puede leer y editar: YAML para los packs, JSON para los mapas.

## Packs

Un pack es una carpeta:

```
my-pack/
  pack.yaml              # id, nombre, versión, idioma base, licencia
  tables.yaml            # cualquier número de ficheros YAML o JSON con definiciones
  travel.yaml
  maps/
    frontier.otd.json    # mapas de ejemplo que lista un sistema (maps:), no definiciones
  locales/
    es/tables.yaml       # traducciones, con la misma estructura que los ficheros que traducen
```

`pack.yaml`:

```yaml
id: my-pack # minúsculas, dígitos y guiones
name: Mi pack # o { en: My pack, es: Mi pack }
version: 0.1.0
format: 4 # el formato de pack para el que está escrito (abajo)
locale: es # el idioma base
license: CC-BY-4.0 # consulta «Packs» para el contenido de uso personal
attribution: 'Basado en … de …'
dependencies: { core: ^0.1.0 } # packs cuyas tablas usa el tuyo
```

**`format`** dice para qué **formato de pack** se escribió el pack: qué significa su sintaxis. Cuando una versión nueva de OpenTabletop hace que el mismo YAML signifique otra cosa, el formato sube. Por ahora, mientras los formatos sigan cambiando, **un pack escrito para un formato anterior no se lee**: las aplicaciones lo dicen donde listan packs y sistemas (**Sin leer: escritos para un formato de pack anterior**, con **Descargar .zip** para guardarlo y **Borrar**), y hay que llevarlo al de hoy (la tabla de abajo dice qué cambió). Una copia tuya de un pack incluido que esté en un formato anterior no tapa al incluido: mientras tanto se usa ese. Los packs nuevos (**Nuevo pack** en el Oracle, **Nuevo sistema** en Systems) se escriben para el de hoy; sin `format`, un pack se lee como de hoy. Un pack escrito para un formato más nuevo del que lee tu versión recibe un aviso: actualiza OpenTabletop. Los formatos hasta ahora:

| Formato | Qué cambió                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | El primero.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2       | Una comprobación que ninguna tabla resuelve solo detiene el viaje con `pause: true`. En el formato 1, una sin tabla ni efectos lo detenía siempre.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3       | Las reglas de viaje **no tienen un día integrado**: ni `day:` (alba, anochecer, la acción de la noche), ni el momento `day-start`, ni los datos `daylight`, `dawn` o `nightfall`, ni los pasos `time: dawn` / `nightfall`, ni acampada, descanso o marcha que el sistema no declare, ni `lost` integrado. Un sistema dice cuándo empiezan los viajes (`travel.start`), qué hace el grupo cuando no puede marchar (`travel.halt`), cuándo puede marchar (`actions.march`) y nombra sus momentos con horas (`'06:00'`) o partes del día del calendario ([Tipos: Reglas de viaje](07-kinds.md#reglas-de-viaje)). |
| 4 (hoy) | **Marchar es una acción como las demás**: una acción mueve al grupo con un paso `travel.move` (`march: { do: [{ travel.move: destination }] }`; en el formato 3, `actions.march` solo decía cuándo valía la marcha integrada, con `when` / `unless`), las acciones tienen parámetros (`params`, y `do:` con `with:`), y el viaje sigue por sí solo con `travel.onward` (`onward: { do: march, with: { until: destination } }`). Los pasos `speed` y `advance` son `travel.speed` y `travel.advance`. ([Tipos: Reglas de viaje](07-kinds.md#reglas-de-viaje))                                                  |

Un fichero contiene una definición, varias separadas por `---`, o una lista. Cada definición tiene un `kind`: `table`, `oracle`, `generator`, `deck`, `roll-modes` y, para los viajes, `travel-rules`, `bindings`, `calendar` y `weather` (cada uno, con un ejemplo entero: [Tipos de definición](07-kinds.md); toda la sintaxis: [Sintaxis](09-syntax.md)). Sus campos se explican también en [Referencia YAML](../oracle/06-yaml.md), [Dados, variables y contexto](../oracle/08-dice-and-templates.md) y [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

Las reglas exactas (qué campos, qué valores) están definidas en el código, en `packages/oracle-engine/src/definitions/schema.ts` y `packages/travel-engine/src/rules.ts`; las aplicaciones comprueban cada fichero contra ellas al cargarlo e indican los problemas con su línea.

Un **.zip de packs** (el **Exportar .zip** de la Oracle para un pack, el **Exportar como .zip** de la aplicación Systems para un sistema y todos los packs que necesita) tiene cada pack en su carpeta en la raíz (`grey-marches/pack.yaml`, `core/pack.yaml`…), primero el pack propio del sistema. Al importarlo se lee cada carpeta con un `pack.yaml`, a cualquier profundidad, cada fichero va a la carpeta de pack más cercana por encima, y solo los ficheros `.yaml`, `.yml` y `.json`; cada pack toma el nombre del `id` de su manifiesto, se llame como se llame su carpeta. Así que una carpeta de pack que comprimas a mano también se importa.

## Mapas: OpenTabletop Data (`.otd.json`)

El Hexmapper guarda los mapas como **paquetes OTD**, un formato JSON pensado para compartirse entre herramientas:

```json
{
  "otd": "0.2.0",
  "campaign": { "id": "…", "type": "campaign", "name": "…", "time": 4320 },
  "maps": [{ "id": "…", "type": "map", "grid": { … }, "terrains": [ … ],
             "hexes": { "3,4": { "terrain": "forest", "tags": ["ruins"], "region": "…" } },
             "paths": [ … ], "ext": { "hexmapper": { … } } }],
  "pois": [ … ], "parties": [ … ], "characters": [ … ], "log": [ … ], "state": { … }
}
```

- `campaign` es la campaña a la que pertenece el mapa (su id, nombre y `noteRef`, su sistema, la hora del reloj del mundo): el reloj del mundo, su clima, las facciones y el Oráculo de abajo son de la campaña, así que el fichero se basta solo. Un fichero guardado antes de las campañas no la tiene: el mapa se abre con una campaña propia, hecha con lo que trae el fichero.
- Los hexes van indexados por `"columna,fila"`.
- Los PDI, el grupo y los tokens (como personajes con `location`) son entidades propias; el diario de un viaje está en `log`.
- Los personajes del grupo (cuando su sistema tiene una [hoja](07-kinds.md#hojas)) también son personajes, listados por id en los `members` del grupo, con `kind: pc`, sus valores como `stats`, sus etiquetas, y lo que solo lee el motor de personajes (su hoja, estados, relaciones) en `ext.character`. Un mapa puede traer así su compañía antes de que empiece ningún viaje: el mapa de ejemplo de las Marcas Grises tiene a Kael, Mara y el viejo Tobin.
- Las facciones de la campaña son facciones OTD (sus valores como `stats`, su hoja en `ext.character`, los hexes que tienen en este mapa en `ext.hexmapper.territory`), y `state.factions` dice de qué sistema vinieron y cuándo fue el último turno del mundo.
- `state.oracle` es el estado del Oráculo de la campaña (mazos, resultados de una sola vez, valores fijados); el Hexmapper guarda su historial de tiradas a mano en `ext.hexmapper.oracleHistory`.
- `ext.<herramienta>` guarda los datos propios de cada herramienta (el Hexmapper guarda iconos, rótulos, estilos y su configuración de impresión en `ext.hexmapper`, y el `system` del mapa y los `packs` que añade a los del sistema; el `ext.hexmapper.system` del grupo es el sistema con el que empezó su viaje). Las herramientas conservan intacto lo que no entienden al guardar.

**Ficheros de personajes.** El **Exportar** de la aplicación Characters escribe el mismo formato solo con `characters` (cada uno con su `noteRef`), y su **Importar…** lee los personajes de cualquier fichero así, también de un mapa:

```json
{
  "otd": "0.2.0",
  "characters": [
    {
      "id": "viejo-tobin",
      "type": "character",
      "name": "Viejo Tobin",
      "kind": "pc",
      "noteRef": "Personajes/Viejo Tobin",
      "stats": { "health": 4 },
      "ext": { "character": { "sheet": "mi-juego/companion" } }
    }
  ]
}
```

La descripción completa está en `docs/otd.md`, y el esquema en `packages/schema` (también puede generar un JSON Schema).

## En el navegador

Tus packs viven en el almacenamiento local del navegador con la clave `opentabletop.userPacks` (una lista JSON de packs con sus ficheros), y el plantel de la aplicación Characters con `opentabletop.characters`; los mapas viven en su biblioteca IndexedDB. Exporta los packs en .zip y guarda los mapas en fichero para conservarlos.

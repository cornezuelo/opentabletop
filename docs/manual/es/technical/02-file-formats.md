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
format: 2 # el formato de pack para el que está escrito (abajo)
locale: es # el idioma base
license: CC-BY-4.0 # consulta «Packs» para el contenido de uso personal
attribution: 'Basado en … de …'
dependencies: { core: ^0.1.0 } # packs cuyas tablas usa el tuyo
```

**`format`** dice para qué **formato de pack** se escribió el pack: qué significa su sintaxis. Cuando una versión nueva de OpenTabletop hace que el mismo YAML signifique otra cosa, el formato sube, y un pack escrito para uno anterior conserva su significado antiguo: las aplicaciones lo leen como se quiso decir. Los packs nuevos (**Nuevo pack** en el Oracle, **Nuevo sistema** en Systems) se escriben para el de hoy; sin `format`, un pack es de formato 1. Un pack escrito para un formato más nuevo del que lee tu versión recibe un aviso: actualiza OpenTabletop. Los formatos hasta ahora:

| Formato | Qué cambió                                                                                                                                                                                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | El primero.                                                                                                                                                                                                                                                                                                                                            |
| 2 (hoy) | Una comprobación que ninguna tabla resuelve solo detiene el viaje con `pause: true`. En el formato 1, una sin tabla ni efectos lo detenía siempre, así que las aplicaciones las leen como `pause: true`; la pestaña **Comprobaciones** de Systems muestra un pack de formato 1 con **Actualizar**, que escribe ese `pause: true` y `format: 2` por ti. |

Un fichero contiene una definición, varias separadas por `---`, o una lista. Cada definición tiene un `kind`: `table`, `oracle`, `generator`, `deck`, `roll-modes` y, para los viajes, `travel-rules`, `bindings`, `calendar` y `weather` (cada uno, con un ejemplo entero: [Tipos de definición](07-kinds.md); toda la sintaxis: [Sintaxis](09-syntax.md)). Sus campos se explican también en [Referencia YAML](../oracle/06-yaml.md), [Dados, variables y contexto](../oracle/08-dice-and-templates.md) y [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

Las reglas exactas (qué campos, qué valores) están definidas en el código, en `packages/oracle-engine/src/definitions/schema.ts` y `packages/travel-engine/src/rules.ts`; las aplicaciones comprueban cada fichero contra ellas al cargarlo e indican los problemas con su línea.

Un **.zip de packs** (el **Exportar .zip** de la Oracle para un pack, el **Exportar como .zip** de la aplicación Systems para un sistema y todos los packs que necesita) tiene cada pack en su carpeta en la raíz (`grey-marches/pack.yaml`, `core/pack.yaml`…), primero el pack propio del sistema. Al importarlo se lee cada carpeta con un `pack.yaml`, a cualquier profundidad, cada fichero va a la carpeta de pack más cercana por encima, y solo los ficheros `.yaml`, `.yml` y `.json`; cada pack toma el nombre del `id` de su manifiesto, se llame como se llame su carpeta. Así que una carpeta de pack que comprimas a mano también se importa.

## Mapas: OpenTabletop Data (`.otd.json`)

El Hexmapper guarda los mapas como **paquetes OTD**, un formato JSON pensado para compartirse entre herramientas:

```json
{
  "otd": "0.2.0",
  "maps": [{ "id": "…", "type": "map", "grid": { … }, "terrains": [ … ],
             "hexes": { "3,4": { "terrain": "forest", "tags": ["ruins"], "region": "…" } },
             "paths": [ … ], "ext": { "hexmapper": { … } } }],
  "pois": [ … ], "parties": [ … ], "characters": [ … ], "log": [ … ], "state": { … }
}
```

- Los hexes van indexados por `"columna,fila"`.
- Los PDI, el grupo y los tokens (como personajes con `location`) son entidades propias; el diario de un viaje está en `log`.
- Los personajes del grupo (cuando su sistema tiene una [hoja](07-kinds.md#hojas)) también son personajes, listados por id en los `members` del grupo, con `kind: pc`, sus valores como `stats`, sus etiquetas, y lo que solo lee el motor de personajes (su hoja, estados, relaciones) en `ext.character`. Un mapa puede traer así su compañía antes de que empiece ningún viaje: el mapa de ejemplo de las Marcas Grises tiene a Kael, Mara y el viejo Tobin.
- Sus facciones son facciones OTD (sus valores como `stats`, su hoja en `ext.character`, los hexes que tienen en `ext.hexmapper.territory`), y `state.factions` dice de qué sistema vinieron y cuándo fue el último turno del mundo.
- `state.oracle` es el estado de Oracle en ese mapa (mazos, resultados de una sola vez, valores fijados); el Hexmapper guarda su historial de tiradas a mano en `ext.hexmapper.oracleHistory`.
- `ext.<herramienta>` guarda los datos propios de cada herramienta (el Hexmapper guarda iconos, rótulos, estilos y su configuración de impresión en `ext.hexmapper`, y el `system` del mapa y los `packs` que añade a los del sistema; el `ext.hexmapper.system` del grupo es el sistema con el que empezó su viaje). Las herramientas conservan intacto lo que no entienden al guardar.

La descripción completa está en `docs/otd.md`, y el esquema en `packages/schema` (también puede generar un JSON Schema).

## En el navegador

Tus packs viven en el almacenamiento local del navegador con la clave `opentabletop.userPacks` (una lista JSON de packs con sus ficheros); los mapas viven en su biblioteca IndexedDB. Exporta los packs en .zip y guarda los mapas en fichero para conservarlos.

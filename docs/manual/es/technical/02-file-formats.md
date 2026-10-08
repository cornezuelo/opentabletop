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
locale: es # el idioma base
license: CC-BY-4.0 # consulta «Packs» para el contenido de uso personal
attribution: 'Basado en … de …'
dependencies: { core: ^0.1.0 } # packs cuyas tablas usa el tuyo
```

Un fichero contiene una definición, varias separadas por `---`, o una lista. Cada definición tiene un `kind`: `table`, `oracle`, `generator`, `deck`, `roll-modes` y, para los viajes, `travel-rules`, `bindings`, `calendar` y `weather` (cada uno, con un ejemplo entero: [Tipos de definición](07-kinds.md); toda la sintaxis: [Sintaxis](09-syntax.md)). Sus campos se explican también en [Referencia YAML](../oracle/06-yaml.md), [Dados, plantillas y contexto](../oracle/08-dice-and-templates.md) y [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

Las reglas exactas (qué campos, qué valores) están definidas en el código, en `packages/oracle-engine/src/definitions/schema.ts` y `packages/travel-engine/src/rules.ts`; las aplicaciones comprueban cada fichero contra ellas al cargarlo e indican los problemas con su línea.

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
- `state.oracle` es el estado de Oracle en ese mapa (mazos, resultados de una sola vez, valores fijados); el Hexmapper guarda su historial de tiradas a mano en `ext.hexmapper.oracleHistory`.
- `ext.<herramienta>` guarda los datos propios de cada herramienta (el Hexmapper guarda iconos, rótulos, estilos y su configuración de impresión en `ext.hexmapper`, y el `system` del mapa y los `packs` que añade a los del sistema; el `ext.hexmapper.system` del grupo es el sistema con el que empezó su viaje). Las herramientas conservan intacto lo que no entienden al guardar.

La descripción completa está en `docs/otd.md`, y el esquema en `packages/schema` (también puede generar un JSON Schema).

## En el navegador

Tus packs viven en el almacenamiento local del navegador con la clave `opentabletop.userPacks` (una lista JSON de packs con sus ficheros); los mapas viven en su biblioteca IndexedDB. Exporta los packs en .zip y guarda los mapas en fichero para conservarlos.

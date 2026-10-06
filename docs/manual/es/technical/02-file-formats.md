# Formatos de fichero

Todo lo que guarda OpenTabletop es texto que se puede leer y editar: YAML para los packs, JSON para los mapas.

## Packs

Un pack es una carpeta:

```
my-pack/
  pack.yaml              # id, nombre, versión, idioma base, licencia
  tables.yaml            # cualquier número de ficheros YAML o JSON con definiciones
  travel.yaml
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

Un fichero contiene una definición, varias separadas por `---`, o una lista. Cada definición tiene un `kind`: `table`, `oracle`, `generator`, `deck` y, para los viajes del Hexmapper, `travel-rules` y `bindings`. Sus campos están en [Referencia YAML](../oracle/06-yaml.md), [Dados, plantillas y contexto](../oracle/08-dice-and-templates.md) y [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

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
- `ext.<herramienta>` guarda los datos propios de cada herramienta (el Hexmapper guarda iconos, rótulos, estilos y su configuración de impresión en `ext.hexmapper`). Las herramientas conservan intacto lo que no entienden al guardar.

La descripción completa está en `docs/otd.md`, y el esquema en `packages/schema` (también puede generar un JSON Schema).

## En el navegador

Tus packs viven en el almacenamiento local del navegador con la clave `opentabletop.userPacks` (una lista JSON de packs con sus ficheros); los mapas viven en su biblioteca IndexedDB. Exporta los packs en .zip y guarda los mapas en fichero para conservarlos.

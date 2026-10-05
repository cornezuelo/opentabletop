# OpenTabletop Data (OTD) — borrador v0.1

Esquema común para intercambiar datos entre las herramientas del ecosistema (hexmapper, Oracle Engine, Travel Engine…) y con herramientas de terceros.

Estado: **borrador para revisión**. Nada está publicado todavía, así que se puede cambiar sin migraciones.

## Objetivos

- Que cada herramienta pueda leer los datos de las demás sin conocer su implementación.
- Ser **agnóstico del sistema de juego**: lo específico va en packs y en `ext`.
- Ser **publicable como JSON Schema**, para validar desde otros lenguajes o herramientas (un plug de SilverBullet, un script…).
- **No duplicar lore**: OTD guarda estado mecánico y referencias, y el texto largo vive en la app de notas.

## Implementación

`@open-tabletop/schema` define cada entidad con **Zod 4**. De ahí salen los tipos TS (`z.infer`), la validación al cargar con errores legibles y el JSON Schema publicado (`z.toJSONSchema`). Cada formato tiene una versión semver y migraciones.

## Dos familias de datos

| Familia                   | Qué es                                                       | Dónde vive                                    | Quién lo escribe            |
| ------------------------- | ------------------------------------------------------------ | --------------------------------------------- | --------------------------- |
| **Definiciones de packs** | Tablas, generadores, oráculos, mazos, reglas de viaje, clima | `packs/<id>/` (YAML/JSON, fuente de verdad)   | Autores de packs y usuarios |
| **Datos de campaña**      | Mapa, POIs, grupo, relojes, estado de motores, journal       | Bundle `.otd.json` (+ autoguardado de la app) | Las apps durante la partida |

Las definiciones son estáticas, y el estado de ejecución (cartas robadas, resultados únicos ya salidos, posición del grupo) va en los datos de campaña. Así, guardar una partida no toca los packs.

## Convenciones comunes

### Identificadores y referencias

- `id`: string `[a-z0-9-]`, único dentro de su ámbito. Las entidades de campaña usan ids aleatorios de 12 caracteres y las definiciones de packs, ids legibles (`wilderness-encounter`).
- **Ids con namespace** para definiciones: `<pack>/<id>`, por ejemplo `kal-arath/reaction`. Dentro de un pack, una referencia sin `/` se resuelve primero en el propio pack y después en sus dependencias o alias.
- **Referencias entre entidades**: string `tipo:id`, por ejemplo `"faction:k3j9x0a1b2c4"` o `"poi:…"`. Nunca se anidan objetos.
- **Coordenadas de hex**: `"col,row"` (offset), siempre relativas a un mapa: `{ map: "<mapId>", hex: "14,22" }`.

### Base de entidad

```ts
interface Entity {
  id: string
  type: string // 'map' | 'poi' | 'party' | ...
  name?: string
  tags?: string[]
  noteRef?: string // ruta en la app de notas (SilverBullet, Obsidian…): el lore vive allí
  refs?: string[] // relaciones genéricas 'tipo:id'
  ext?: Record<string, unknown> // datos propios por namespace: ext.hexmapper, ext['kal-arath']…
}
```

**`ext` es el mecanismo de extensión.** Una herramienta solo lee los namespaces que conoce y conserva intactos los demás al guardar.

### Tiempo

```ts
type GameTime = number // minutos desde el inicio de la campaña (entero ≥ 0)
```

Al guardar un número absoluto, los **calendarios personalizados** solo son una forma de presentarlo: la campaña declara su calendario (`calendar`) y `@open-tabletop/time` lo convierte en "Día 43, 09:00, otoño". Cambiar de calendario no corrompe datos.

## Entidades de campaña

| Entidad         | Campos principales                                                                                                                                          | Notas                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Campaign**    | `system?` (pack id), `packs` (ids + versiones), `calendar`, `time: GameTime`                                                                                | Contenedor y reloj global.                                                                                                                                   |
| **Map**         | `grid` (orientación, ancho, alto, formato de coords), `scale.hexKm`, `terrains` (id, nombre, color, bioma?, tags), `hexes: Record<"col,row", Hex>`, `paths` | `ext.hexmapper`: tamaño de render, impresión (`hexMm`, papel), iconos, capas, etiquetas de texto.                                                            |
| **Hex**         | `terrain?`, `name?`, `elevation?`, `danger?`, `region?`, `stats?: {key, value}[]`, `notes?` (Markdown corto), `noteRef?`, `tags?`                           | Valor dentro de `Map.hexes`, no entidad con id propio. Sin datos vacíos (`normalizeHex`).                                                                    |
| **Path**        | `kind` (`road`, `river`, `trail`, … extensible), `hexes: "col,row"[]`                                                                                       | Caminos y ríos son **aristas entre hexes**: el Travel Engine pregunta "¿hay camino entre A y B?". El estilo visual va a `ext.hexmapper`.                     |
| **POI**         | `location: { map, hex }`, `kind?`, `discovered?`                                                                                                            | Antes vivía dentro del hex; pasa a ser entidad para que otros motores lo referencien.                                                                        |
| **Party**       | `location: { map, hex }`, `members?: 'character:id'[]`, `travel` (modo, ruta, destino, recursos, fatiga… ver `travel-engine.md`)                            | El grupo que viaja. Puede haber varios.                                                                                                                      |
| **Character**   | `stats?`, `noteRef?`                                                                                                                                        | Fino a propósito: estado mecánico y enlace a la nota. Las fichas completas van en `ext.<sistema>` o en la app de notas.                                      |
| **Faction**     | `stats?`, `clocks?: 'clock:id'[]`, `noteRef?`                                                                                                               | Igual de fino que Character.                                                                                                                                 |
| **Clock**       | `segments`, `filled`, `kind?` (progreso, amenaza…)                                                                                                          | Relojes al estilo Blades.                                                                                                                                    |
| **LogEntry**    | `time: GameTime`, `at: string` (fecha real ISO), `source` (`oracle`, `travel`, `user`…), `code`, `data`, `refs`                                             | El "Event" persistido: journal o historial de partida. Los motores emiten eventos en tiempo de ejecución y `session` decide cuáles se guardan como LogEntry. |
| **EngineState** | `oracle` (mazos, ocurrencias, variables), `weather` (estado actual por región)                                                                              | Estado de ejecución de los motores, serializable. Cada motor define el suyo.                                                                                 |

## Definiciones de packs

Las define cada motor y su formato está en el documento de ese motor. Todas comparten la cabecera:

```yaml
kind: table | generator | oracle | deck | travel-rules | weather-model
id: wilderness-encounter
name: Wilderness Encounter # o { es: …, en: … } en metadatos
description: …
tags: [encounter, wilderness]
```

Y el manifiesto del pack:

```yaml
# packs/kal-arath/pack.yaml
id: kal-arath
name: Kal-Arath
version: 1.0.0
locale: es
license: '© autores de Kal-Arath; uso personal'
dependencies: { core: ^1.0.0 }
aliases: { reaction: kal-arath/reaction }
```

## Bundle de fichero

```jsonc
{
  "otd": "0.1.0",
  "campaign": { … } | null,
  "maps": [ … ], "pois": [ … ], "parties": [ … ],
  "characters": [ … ], "factions": [ … ], "clocks": [ … ],
  "log": [ … ],
  "state": { "oracle": { … }, "weather": { … } }
}
```

- **Un bundle puede contener solo una parte.** El hexmapper guarda `<mapId>.otd.json` con el mapa, sus POIs y, si se está jugando, el grupo y el estado. Una campaña completa es el mismo formato con más cosas dentro.
- Los packs **no** van dentro del bundle, solo referenciados (`campaign.packs`). Los packs propios del usuario se distribuyen aparte.

## Decisiones abiertas

1. **Notas Markdown en el hex** (`Hex.notes`): ¿las mantenemos como "notas rápidas del máster" o las quitamos para que todo el texto viva en la app de notas? Propuesta: mantenerlas cortas y opcionales, y recomendar `noteRef` para el lore.
2. **Extensión del fichero:** pasar de `.hexmap.json` a `.otd.json`, conservando la importación del formato actual.
3. **Varios idiomas en packs:** ¿un pack por idioma (`kal-arath` con `locale: es`) o textos `{ es, en }` dentro de cada entrada? Propuesta: un pack por idioma, más simple para autores; los metadatos sí pueden ser `{ es, en }`.

# OpenTabletop Data (OTD) — draft v0.1

Common schema for exchanging data between the ecosystem's tools (hexmapper, Oracle Engine, Travel Engine…) and with third-party tools.

Status: **draft, reviewed**. Nothing is published yet, so it can still change without migrations.

## Goals

- Every tool can read the others' data without knowing their implementation.
- **Game-system agnostic**: system-specific data goes into packs and `ext`.
- **Publishable as JSON Schema**, so other languages and tools (a SilverBullet plug, a script…) can validate it.
- **No duplicated lore**: OTD stores mechanical state and references; long-form text lives in the notes app.

## Implementation

`@open-tabletop/schema` defines every entity with **Zod 4**. That yields the TS types (`z.infer`), load-time validation with readable errors, and the published JSON Schema (`z.toJSONSchema`). Every format has a semver version and migrations.

## Two families of data

| Family               | What                                                      | Where                                      | Written by             |
| -------------------- | --------------------------------------------------------- | ------------------------------------------ | ---------------------- |
| **Pack definitions** | Tables, generators, oracles, decks, travel rules, weather | `packs/<id>/` (YAML/JSON, source of truth) | Pack authors and users |
| **Campaign data**    | Map, POIs, party, clocks, engine state, journal           | `.otd.json` bundle (+ the app's autosave)  | The apps during play   |

Definitions are static; runtime state (drawn cards, once-only results already used, party position) goes into campaign data. Saving a session never touches packs.

## Common conventions

### Ids and references

- `id`: `[a-z0-9-]` string, unique within its scope. Campaign entities use random 12-character ids; pack definitions use readable ids (`wilderness-encounter`).
- **Namespaced ids** for definitions: `<pack>/<id>`, e.g. `kal-arath/reaction`. Inside a pack, a reference without `/` resolves in the pack first, then in its dependencies or aliases.
- **References between entities**: `type:id` strings, e.g. `"faction:k3j9x0a1b2c4"` or `"poi:…"`. Objects are never nested.
- **Hex coordinates**: `"col,row"` (offset), always relative to a map: `{ map: "<mapId>", hex: "14,22" }`.

### Entity base

```ts
interface Entity {
  id: string
  type: string // 'map' | 'poi' | 'party' | ...
  name?: string
  tags?: string[]
  noteRef?: string // path in the notes app (SilverBullet, Obsidian…): the lore lives there
  refs?: string[] // generic 'type:id' relations
  ext?: Record<string, unknown> // per-namespace data: ext.hexmapper, ext['kal-arath']…
}
```

**`ext` is the extension mechanism.** A tool only reads the namespaces it knows and preserves the rest untouched when saving.

### Time

```ts
type GameTime = number // minutes since the campaign start (integer ≥ 0)
```

Because an absolute number is stored, **custom calendars** are just a way of presenting it: the campaign declares its `calendar` and `@open-tabletop/time` turns the number into "Day 43, 09:00, autumn". Changing calendars never corrupts data.

## Campaign entities

| Entity          | Main fields                                                                                                                                                         | Notes                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Campaign**    | `system?` (pack id), `packs` (ids + versions), `calendar`, `time: GameTime`                                                                                         | Container and global clock.                                                                                                                                                         |
| **Map**         | `grid` (orientation, width, height, coordinate format), `scale.hexKm`, `terrains` (id, name, color, water?, biome?, tags), `hexes: Record<"col,row", Hex>`, `paths` | `ext.hexmapper`: render size, printing (`hexMm`, paper), icons, layers, text labels, assets.                                                                                        |
| **Hex**         | `terrain?`, `name?`, `elevation?`, `danger?`, `region?`, `stats?: {key, value}[]`, `notes?`, `noteRef?`, `tags?`                                                    | A value inside `Map.hexes`, not an entity with its own id. No empty values (`normalizeHex`). `notes` are **short, optional GM notes** (Markdown); lore goes behind `noteRef`.       |
| **Path**        | `kind` (`road`, `river`, `trail`, … extensible), `hexes: "col,row"[]`, `nodes?`, `offsets?`, `straight?`                                                            | Roads and rivers are **edges between hexes**: the Travel Engine asks "is there a road between A and B?". `nodes`/`offsets` shape the drawing; visual style goes to `ext.hexmapper`. |
| **POI**         | `location: { map, hex }`, `kind?`, `discovered?`, `noteRef?`                                                                                                        | Used to live inside the hex; becomes an entity so other engines can reference it.                                                                                                   |
| **Party**       | `location: { map, hex }`, `members?: 'character:id'[]`, `travel` (mode, route, destination, resources, fatigue… see `travel-engine.md`)                             | The traveling group. There can be several.                                                                                                                                          |
| **Character**   | `kind?` (pc, npc, enemy…), `location?: { map, hex }` (e.g. a token), `stats?`, `noteRef?`                                                                           | Deliberately thin: mechanical state and a link to the note. Full sheets go in `ext.<system>` or the notes app.                                                                      |
| **Faction**     | `stats?`, `clocks?: 'clock:id'[]`, `noteRef?`                                                                                                                       | As thin as Character.                                                                                                                                                               |
| **Clock**       | `segments`, `filled`, `kind?` (progress, threat…)                                                                                                                   | Blades-style clocks.                                                                                                                                                                |
| **LogEntry**    | `time: GameTime`, `at: string` (real ISO date), `source` (`oracle`, `travel`, `user`…), `code`, `data`, `refs`                                                      | The persisted "Event": session journal / history. Engines emit runtime events and `session` decides which become LogEntries.                                                        |
| **EngineState** | `oracle` (decks, occurrences, variables), `weather` (current state per region)                                                                                      | Serializable engine runtime state. Each engine defines its own.                                                                                                                     |

## Pack definitions

Each engine defines its own formats (see the engine docs). All share this header:

```yaml
kind: table | generator | oracle | deck | travel-rules | weather-model | bindings
id: wilderness-encounter
name: Wilderness Encounter
description: …
tags: [encounter, wilderness]
```

And the pack manifest:

```yaml
# packs/kal-arath/pack.yaml
id: kal-arath
name: Kal-Arath
version: 1.0.0
locale: es # the one required base locale
license: '© Castle Grief; personal use'
dependencies: { core: ^1.0.0 }
aliases: { reaction: kal-arath/reaction }
```

**Localization:** a pack has exactly one base locale. Translations are optional overlays (`locales/<lang>/…`, see `oracle-engine.md`); any string without a translation falls back to the base locale.

## File bundle

```jsonc
{
  "otd": "0.2.0",
  "campaign": { … } | null,
  "maps": [ … ], "pois": [ … ], "parties": [ … ],
  "characters": [ … ], "factions": [ … ], "clocks": [ … ],
  "log": [ … ],
  "state": { "oracle": { … }, "weather": { … } }
}
```

- **Extension: `.otd.json`.** It says "this is the common format", which is honest once a file carries more than a map (POIs, party, travel state, journal) and other tools read it; a dedicated extension can also be associated with the app later (OS, Tauri). The hexmapper saves and opens only `.otd.json` (the pre-alpha `.hexmap.json` format was dropped).
- **A bundle may contain just part of a campaign.** The hexmapper saves `<mapId>.otd.json` with the map, its POIs and, during play, the party and state. A full campaign is the same format with more inside.
- Packs are **not** embedded in the bundle, only referenced (`campaign.packs`). User packs are distributed separately.

## Resolved decisions

1. **Hex notes** stay as short, optional GM notes; lore belongs behind `noteRef`.
2. **File extension** `.otd.json`, adopted with the OTD migration.
3. **Pack languages:** one required base locale per pack; optional per-locale translation overlays with per-string fallback to the base.

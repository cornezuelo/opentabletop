# File formats

Everything OpenTabletop saves is text you can read and edit: YAML for packs, JSON for maps.

## Packs

A pack is a folder:

```
my-pack/
  pack.yaml              # id, name, version, base language, license
  tables.yaml            # any number of YAML or JSON files with definitions
  travel.yaml
  locales/
    es/tables.yaml       # translations, mirroring the files they translate
```

`pack.yaml`:

```yaml
id: my-pack # lowercase letters, digits and dashes
name: My pack # or { en: My pack, es: Mi pack }
version: 0.1.0
locale: en # the base language
license: CC-BY-4.0 # see "Packs" for personal-use content
attribution: 'Based on … by …'
dependencies: { core: ^0.1.0 } # packs whose tables yours uses
```

A file holds one definition, several separated by `---`, or a list. Each definition has a `kind`: `table`, `oracle`, `generator`, `deck`, and for the Hexmapper's trips `travel-rules` and `bindings`. Their fields are in [YAML reference](../oracle/06-yaml.md), [Dice, templates and context](../oracle/08-dice-and-templates.md) and [Connecting tables to maps and trips](../oracle/07-connecting.md).

The exact rules (which fields, which values) are defined in code, in `packages/oracle-engine/src/definitions/schema.ts` and `packages/travel-engine/src/rules.ts`; the apps check every file against them when it loads and report problems with their line.

## Maps: OpenTabletop Data (`.otd.json`)

Hexmapper saves maps as **OTD bundles**, a JSON format meant to be shared between tools:

```json
{
  "otd": "0.2.0",
  "maps": [{ "id": "…", "type": "map", "grid": { … }, "terrains": [ … ],
             "hexes": { "3,4": { "terrain": "forest", "tags": ["ruins"], "region": "…" } },
             "paths": [ … ], "ext": { "hexmapper": { … } } }],
  "pois": [ … ], "parties": [ … ], "characters": [ … ], "log": [ … ], "state": { … }
}
```

- Hexes are keyed by `"column,row"`.
- POIs, the party and tokens (as characters with a `location`) are entities of their own; a trip's journal is in `log`.
- `state.oracle` is the Oracle's state on that map (decks, once-only results, values set); the Hexmapper keeps its hand-roll history in `ext.hexmapper.oracleHistory`.
- `ext.<tool>` holds each tool's own data (Hexmapper keeps icons, labels, styles and its print settings in `ext.hexmapper`). Tools keep what they don't understand untouched when they save.

The full description is in `docs/otd.md`, and the schema in `packages/schema` (it can also produce a JSON Schema).

## In the browser

Your packs live in the browser's local storage under `opentabletop.userPacks` (one JSON list of packs with their files); maps live in its IndexedDB library. Export packs as .zip and save maps as files to keep them.

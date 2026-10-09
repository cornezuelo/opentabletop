# File formats

Everything OpenTabletop saves is text you can read and edit: YAML for packs, JSON for maps.

## Packs

A pack is a folder:

```
my-pack/
  pack.yaml              # id, name, version, base language, license
  tables.yaml            # any number of YAML or JSON files with definitions
  travel.yaml
  maps/
    frontier.otd.json    # example maps a system lists (maps:), not definitions
  locales/
    es/tables.yaml       # translations, mirroring the files they translate
```

`pack.yaml`:

```yaml
id: my-pack # lowercase letters, digits and dashes
name: My pack # or { en: My pack, es: Mi pack }
version: 0.1.0
format: 2 # the pack format it is written for (below)
locale: en # the base language
license: CC-BY-4.0 # see "Packs" for personal-use content
attribution: 'Based on … by …'
dependencies: { core: ^0.1.0 } # packs whose tables yours uses
```

**`format`** says which **pack format** the pack was written for: what its syntax means. When a new version of OpenTabletop makes the same YAML mean something else, the format goes up, and a pack written for an older one keeps its old meaning: the apps read it as it was meant. New packs (the Oracle's **New pack**, the Systems app's **New system**) are written for today's; without `format`, a pack is format 1. A pack written for a newer format than your version reads gets a warning: update OpenTabletop. The formats so far:

| Format    | What changed                                                                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1         | The first one.                                                                                                                                                                                                                                                                                                           |
| 2 (today) | A check that no table resolves stops the trip only with `pause: true`. In format 1, one with neither a table nor effects always stopped it, so the apps read those as `pause: true`; the Systems app's **Checks** tab shows a pack of format 1 with **Update**, which writes that `pause: true` and `format: 2` for you. |

A file holds one definition, several separated by `---`, or a list. Each definition has a `kind`: `table`, `oracle`, `generator`, `deck`, `roll-modes`, and for trips `travel-rules`, `bindings`, `calendar` and `weather` (each one, with a whole example: [Kinds of definition](07-kinds.md); every piece of syntax: [Syntax](09-syntax.md)). Their fields are also explained in [YAML reference](../oracle/06-yaml.md), [Dice, variables and context](../oracle/08-dice-and-templates.md) and [Connecting tables to maps and trips](../oracle/07-connecting.md).

The exact rules (which fields, which values) are defined in code, in `packages/oracle-engine/src/definitions/schema.ts` and `packages/travel-engine/src/rules.ts`; the apps check every file against them when it loads and report problems with their line.

A **.zip of packs** (the Oracle's **Export .zip** for one pack, the Systems app's **Export as .zip** for a system and every pack it needs) has each pack in its own folder at the top (`grey-marches/pack.yaml`, `core/pack.yaml`…), the system's own pack first. Importing one reads every folder with a `pack.yaml`, however deep, each file going to the closest pack folder above it, and only `.yaml`, `.yml` and `.json` files; each pack is named by its manifest `id`, whatever its folder is called. So a pack folder you zipped by hand imports too.

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
- The party's characters (when its system has a [sheet](07-kinds.md#sheets)) are characters too, listed by id in the party's `members`, with `kind: pc`, their values as `stats`, their tags, and what only the character engine reads (their sheet, conditions, relations) in `ext.character`. A map can bring its company that way before any trip starts: the Grey Marches' example map has Kael, Mara and Old Tobin.
- `state.oracle` is the Oracle's state on that map (decks, once-only results, values set); the Hexmapper keeps its hand-roll history in `ext.hexmapper.oracleHistory`.
- `ext.<tool>` holds each tool's own data (Hexmapper keeps icons, labels, styles and its print settings in `ext.hexmapper`, and the map's `system` and the `packs` it adds to the system's; the party's `ext.hexmapper.system` is the one its trip started with). Tools keep what they don't understand untouched when they save.

The full description is in `docs/otd.md`, and the schema in `packages/schema` (it can also produce a JSON Schema).

## In the browser

Your packs live in the browser's local storage under `opentabletop.userPacks` (one JSON list of packs with their files); maps live in its IndexedDB library. Export packs as .zip and save maps as files to keep them.

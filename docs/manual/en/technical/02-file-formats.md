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
format: 5 # the pack format it is written for (below)
locale: en # the base language
license: CC-BY-4.0 # see "Packs" for personal-use content
attribution: 'Based on … by …'
dependencies: { core: ^0.1.0 } # packs whose tables yours uses
```

**`format`** says which **pack format** the pack was written for: what its syntax means. When a new version of OpenTabletop makes the same YAML mean something else, the format goes up. For now, while the formats keep changing, **a pack written for an older format isn't read**: the apps say so where they list packs and systems (**Not read: written for an older pack format**, with **Download .zip** to keep it and **Delete**), and it has to be brought to today's (the table below says what changed). A copy of yours of a bundled pack that's in an older format doesn't hide the bundled one: that one is used meanwhile. New packs (the Oracle's **New pack**, the Systems app's **New system**) are written for today's; without `format`, a pack is read as today's. A pack written for a newer format than your version reads gets a warning: update OpenTabletop. The formats so far:

| Format    | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | The first one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2         | A check that no table resolves stops the trip only with `pause: true`. In format 1, one with neither a table nor effects always stopped it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 3         | Travel rules have **no built-in day**: no `day:` (dawn, nightfall, the night's action), no `day-start` moment, no `daylight`, `dawn` or `nightfall` facts, no `time: dawn` / `nightfall` steps, no camp, rest or march the system doesn't declare and no built-in `lost`. A system says when trips start (`travel.start`), what the party does when it can't march (`travel.halt`), when it can march (`actions.march`) and names its moments by clocks (`'06:00'`) or parts of the calendar's day ([Kinds: Travel rules](07-kinds.md#travel-rules)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4         | **Marching is an action like the rest**: an action moves the party with a `travel.move` step (`march: { do: [{ travel.move: destination }] }`; in format 3, `actions.march` only said when the built-in march held, with `when` / `unless`), actions take parameters (`params`, and `do:` with `with:`), and the trip goes on by itself with `travel.onward` (`onward: { do: march, with: { until: destination } }`). The steps `speed` and `advance` are `travel.speed` and `travel.advance`. ([Kinds: Travel rules](07-kinds.md#travel-rules))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 5 (today) | **Every reference names what it is**: a moment, a block, an action or a check is written by its full name, `subsystem.id` (`at: trip.hex-enter`, `on: time.day-end`, a part of the day `time.part.morning`, an action `actions.camp`; `blocks: [travel.move, actions.forage, modes.horse]`; `do: actions.march`, `halt: { do: actions.camp }`, `roll: checks.ENCOUNTER`, `ask: params.how`, `travel.mode: modes.boat`; `time:` and `limit:` take `time.<division>.<part>`; a sheet's bound that is another of its values, `max: '{{self.values.maxHealth}}'`). In format 4 they were bare ids (`at: hex-enter`, `do: march`, `blocks: [travel, mode.horse]`, `time: part.morning`, `max: '{{maxHealth}}'`). The values compared in conditions stay short (`trip.edges: road`), and `moment` is seen by the full name too (`trip.moment: actions.rest`). **References to a pack's definitions** say their kind too, the pack first when it's another's: `table: table.ruins`, `resolve: oracle.ford`, `generator: generator.npc`, `modes: [roll-modes.advantage]`, `cancels: roll-modes.disadvantage`, `travel: travel-rules.default`, `sheet: sheet.companion`, `weather: [weather.sky]`, `turn: core/table.faction-turn`, `aliases: { table.twist: core/table.twists }` (in format 4, `table: ruins`, `travel: travel-rules.default`, `core/faction-turn`). ([Syntax: Moments](09-syntax.md#moments), [Ids and references](09-syntax.md#ids-and-references)) |

A file holds one definition, several separated by `---`, or a list. Each definition has a `kind`: `table`, `oracle`, `generator`, `deck`, `roll-modes`, and for trips `travel-rules`, `bindings`, `calendar` and `weather` (each one, with a whole example: [Kinds of definition](07-kinds.md); every piece of syntax: [Syntax](09-syntax.md)). Their fields are also explained in [YAML reference](../oracle/06-yaml.md), [Dice, variables and context](../oracle/08-dice-and-templates.md) and [Connecting tables to maps and trips](../oracle/07-connecting.md).

The exact rules (which fields, which values) are defined in code, in `packages/oracle-engine/src/definitions/schema.ts` and `packages/travel-engine/src/rules.ts`; the apps check every file against them when it loads and report problems with their line.

A **.zip of packs** (the Oracle's **Export .zip** for one pack, the Systems app's **Export as .zip** for a system and every pack it needs) has each pack in its own folder at the top (`grey-marches/pack.yaml`, `core/pack.yaml`…), the system's own pack first. Importing one reads every folder with a `pack.yaml`, however deep, each file going to the closest pack folder above it, and only `.yaml`, `.yml` and `.json` files; each pack is named by its manifest `id`, whatever its folder is called. So a pack folder you zipped by hand imports too.

## Maps: OpenTabletop Data (`.otd.json`)

Hexmapper saves maps as **OTD bundles**, a JSON format meant to be shared between tools:

```json
{
  "otd": "0.2.0",
  "campaign": { "id": "…", "type": "campaign", "name": "…", "system": "…", "time": 4320 },
  "maps": [{ "id": "…", "type": "map", "grid": { … }, "terrains": [ … ],
             "hexes": { "3,4": { "terrain": "forest", "tags": ["ruins"], "region": "…" } },
             "paths": [ … ], "ext": { "hexmapper": { … } } }],
  "pois": [ … ], "parties": [ … ], "characters": [ … ], "log": [ … ], "state": { … }
}
```

- `campaign` is the campaign the map belongs to (its id, name and `noteRef`, its `system`, the world clock's time, and in `ext.hexmapper.packs` the packs it adds to its system's): the world clock, its weather, the factions and the Oracle below are the campaign's, so the file stands on its own. A file saved before campaigns has none: the map opens with a campaign of its own, made from what the file brings. When this browser already has the file's campaign, opening it asks whether to join it, replace it or keep the file's apart ([Campaigns](../hexmapper/01-getting-started.md#campaigns)); a system's example maps whose files name one campaign join it without asking, so they share one world (the Grey Marches' two maps).
- Hexes are keyed by `"column,row"`.
- POIs, the party and tokens (as characters with a `location`) are entities of their own; a trip's journal is in `log`.
- The party's characters (when its system has a [sheet](07-kinds.md#sheets)) are characters too, listed by id in the party's `members`, with `kind: pc`, their values as `stats`, their tags, and what only the character engine reads (their sheet, conditions, relations) in `ext.character`. A map can bring its company that way before any trip starts: the Grey Marches' example map has Kael, Mara and Old Tobin.
- The campaign's factions are OTD factions (their values as `stats`, their sheet in `ext.character`, the hexes they hold on this map in `ext.hexmapper.territory`), and `state.factions` says which system they came from and when the last world turn was.
- `state.oracle` is the campaign's Oracle state (decks, once-only results, values set); the Hexmapper keeps its hand-roll history in `ext.hexmapper.oracleHistory`.
- `ext.<tool>` holds each tool's own data (Hexmapper keeps icons, labels, styles and its print settings in `ext.hexmapper`; files written before the system was the campaign's have the map's `system` and the `packs` it added there, read as its campaign's; the party's `ext.hexmapper.system` is the one its trip started with). Tools keep what they don't understand untouched when they save.

**Characters files.** The Characters app's **Export** writes the same format with only `characters` (each with its `noteRef`), and its **Import…** reads the characters of any such file, a map's included:

```json
{
  "otd": "0.2.0",
  "characters": [
    {
      "id": "old-tobin",
      "type": "character",
      "name": "Old Tobin",
      "kind": "pc",
      "noteRef": "People/Old Tobin",
      "stats": { "health": 4 },
      "ext": { "character": { "sheet": "my-game/companion" } }
    }
  ]
}
```

The full description is in `docs/otd.md`, and the schema in `packages/schema` (it can also produce a JSON Schema).

## In the browser

Your packs live in the browser's local storage under `opentabletop.userPacks` (one JSON list of packs with their files), the Characters app's roster under `opentabletop.characters`, and Travel's trips under `opentabletop.travel.trips` (version 9: each names the campaign it plays in, `campaign`; trips saved before have one of their own, with the trip's id); maps and campaigns live in its IndexedDB library (a campaign, version 3, keeps its `system` and the `packs` it adds, its world clock, its weather, the factions' sheets, the Oracle and which trip played in it last, `playing`; a map, version 25, names its campaign and keeps no system of its own: one saved before hands its system and packs to its campaign when it opens, if the campaign has none). Export packs as .zip and save maps as files to keep them.

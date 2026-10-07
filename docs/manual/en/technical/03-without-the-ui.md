# Working without the interface

The apps are one way to edit; the files are the source of truth. Some things are quicker by hand.

## Editing packs as files

1. **Export .zip** a pack from the Oracle app and unzip it — or start from an empty folder with a `pack.yaml`.
2. Edit its YAML with any text editor. YAML-aware editors help with indentation.
3. **Import .zip** it back (zip the folder), and the app checks it and lists its problems with their line.

Writing many similar entries is often faster in YAML than in the forms; comments (`# …`) are kept when the forms edit the file later.

## Packs bundled with a build

If you build the apps yourself (`make site`), every folder in `packs/` is bundled as a read-only pack, and so is every folder in `packs-private/` on that computer (personal-use content; never publish that build). Running `make test` loads every open pack in `packs/` and rolls every definition in every language, so a broken table is caught before you play.

## The command line

`opentabletop` checks and rolls packs from a terminal, without opening an app — handy while writing a pack in a text editor, or in scripts. In this repository, `make cli ARGS="…"` builds and runs it (it needs Node.js):

```sh
make cli ARGS="validate"                          # every pack in packs/ and packs-private/
make cli ARGS="validate --packs ~/my-packs"       # a folder of your own
make cli ARGS="list --kind oracle"                # what can be rolled
make cli ARGS="roll grey-marches/encounter terrain=forest danger=2 --times 3"
make cli ARGS="roll core/yes-no likelihood=likely --seed my-game --locale es --json"
```

- **validate** prints every problem (the same the apps show) and ends with a summary; it fails (exit code 1) when there are errors, so it fits in scripts and checks before a commit.
- **list** prints every table, oracle, generator and deck: its id, kind and name (`--kind`, `--pack` to narrow it).
- **roll** rolls one by id (`pack/id`, or just the id when it's unique); a deck draws a card. `key=value` pairs are the context tables read (numbers and `true`/`false` are read as such; dotted names nest: `party.stats.morale=2`). `--seed` gives the same results every time, `--times` rolls again keeping once-only entries and drawn cards, `--locale` picks the language, `--json` prints the whole result.

The built script, `apps/cli/dist/opentabletop.mjs`, runs anywhere Node.js does: `node opentabletop.mjs roll …`.

## Maps by hand

An `.otd.json` map can be edited with a text editor — renaming hexes in bulk, moving data between maps, or writing a script that generates a map. Keep the structure valid: the Hexmapper rejects files that don't match the schema and says why. Other tools can read the same files and add their own `ext.<tool>` data.

## Useful commands

From the project folder: `make` lists everything. The main ones: `make dev` (Hexmapper with live reload), `make dev-oracle`, `make dev-manual`, `make serve` (every app on one site), `make verify` (formatting, types and tests).

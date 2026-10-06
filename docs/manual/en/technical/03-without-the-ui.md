# Working without the interface

The apps are one way to edit; the files are the source of truth. Some things are quicker by hand.

## Editing packs as files

1. **Export .zip** a pack from the Oracle app and unzip it — or start from an empty folder with a `pack.yaml`.
2. Edit its YAML with any text editor. YAML-aware editors help with indentation.
3. **Import .zip** it back (zip the folder), and the app checks it and lists its problems with their line.

Writing many similar entries is often faster in YAML than in the forms; comments (`# …`) are kept when the forms edit the file later.

## Packs bundled with a build

If you build the apps yourself (`make site`), every folder in `packs/` is bundled as a read-only pack, and so is every folder in `packs-private/` on that computer (personal-use content; never publish that build). Running `make test` loads every open pack in `packs/` and rolls every definition in every language, so a broken table is caught before you play.

## Maps by hand

An `.otd.json` map can be edited with a text editor — renaming hexes in bulk, moving data between maps, or writing a script that generates a map. Keep the structure valid: the Hexmapper rejects files that don't match the schema and says why. Other tools can read the same files and add their own `ext.<tool>` data.

## Useful commands

From the project folder: `make` lists everything. The main ones: `make dev` (Hexmapper with live reload), `make dev-oracle`, `make dev-manual`, `make serve` (every app on one site), `make verify` (formatting, types and tests).

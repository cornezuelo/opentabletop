# Packs

A pack is a folder of YAML files with a `pack.yaml` (id, name, version, base language, license). Definitions refer to each other by id: `weather` inside the same pack, `kal-arath/weather` from another.

## Where packs come from

- **Bundled**: they come with the app and can't be changed. **Edit a copy** copies one into your packs; the copy replaces it (references from other packs keep working) and **Revert to bundled** deletes it. Copies of personal-use packs stay personal use: don't share them.
- **Yours**: made with **New pack** or imported, stored in this browser.

## Making a pack

**New pack** asks for a name, a folder/id (lowercase letters, digits and dashes) and the base language the tables are written in. Then add definitions with **New definition** (or the **+** next to the pack): pick the kind, the name and the file. Definitions can live in any file of the pack; group them as you like.

The pack page shows its manifest, its **problems** (click one to jump to the line), its definitions, other engines' definitions (travel rules, bindings), its files (add, rename, delete) and its translations.

## Backups and sharing

**Export .zip** downloads the pack as a folder; **Import .zip** adds one. Your packs live only in this browser: export them to keep them safe.

The Hexmapper sees your packs when both apps are served from the same site (e.g. `…/oracle/` and `…/hexmapper/`).

## Copying definitions

**Duplicate** copies a definition inside its pack; **Copy to…** copies it, with its translations, into one of your packs (local references become `pack/id`, so they keep pointing at the same tables). Handy to start from a bundled table.

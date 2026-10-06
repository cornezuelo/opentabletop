# Packs

A pack is a folder of YAML files with a `pack.yaml` (id, name, version, base language, license). Definitions refer to each other by id: `weather` inside the same pack, `kal-arath/weather` from another.

## Where packs come from

- **Bundled**: they come with the app and can't be changed. **Edit a copy** copies one into your packs; the copy replaces it (references from other packs keep working) and **Revert to bundled** deletes it. Copies of personal-use packs stay personal use: don't share them.
- **Yours**: made with **New pack** or imported, stored in this browser.

## Personal-use packs

Some games only allow their tables for **personal use** (Kal-Arath, for one). Their packs never go in the public project: they live in a separate folder, `packs-private/`, which is its own private git repository. When the apps are built on a computer that has that folder, its packs are bundled for that computer only and show a _personal use_ badge.

- Don't share them, export them as .zip for others, or publish a build that contains them.
- An edited copy of a personal-use pack is still personal use.
- Whether a game allows sharing is in its license; each pack records it in `pack.yaml` (`license`, `attribution`). When in doubt, treat it as personal use.

## Other definitions: travel rules and bindings

Besides tables, oracles, generators and decks, a pack can hold definitions for **other engines**. Today these are the **travel rules** and the **bindings** that turn a pack into a system for the Hexmapper's Play mode. The pack page lists them under **Other definitions**; open them in the YAML editor (problems are checked like any other definition). Create them with **New definition → For travel**.

A pack holds at most one travel system: both use the id `default` and usually sit in the same file (Kal-Arath keeps them in `rules.yaml`). What goes in them is explained in [Connecting tables to maps and trips](07-connecting.md#5-your-own-travel-system).

## Making a pack

**New pack** asks for a name, a folder/id (lowercase letters, digits and dashes) and the base language the tables are written in. Then add definitions with **New definition** (or the **+** next to the pack): pick the kind, the name and the file. Definitions can live in any file of the pack; group them as you like.

The pack page shows its manifest, its **problems** (click one to jump to the line), its definitions, other engines' definitions (travel rules, bindings), its files (add, rename, delete) and its translations.

## Backups and sharing

**Export .zip** downloads the pack as a folder; **Import .zip** adds one. Your packs live only in this browser: export them to keep them safe.

The Hexmapper sees your packs when both apps are served from the same site (e.g. `…/oracle/` and `…/hexmapper/`).

## Copying definitions

**Duplicate** copies a definition inside its pack; **Copy to…** copies it, with its translations, into one of your packs (local references become `pack/id`, so they keep pointing at the same tables). Handy to start from a bundled table.

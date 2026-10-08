# Packs

A pack is a folder of YAML files with a `pack.yaml` (id, name, version, base language, license). Definitions refer to each other by id: `weather` inside the same pack, `kal-arath/weather` from another. Every kind of definition a pack can hold (tables, oracles, generators, decks, roll modes, travel rules, bindings, calendars, weather models) is in [Kinds of definition](../technical/07-kinds.md).

## Where packs come from

- **Bundled**: they come with the app and can't be changed. **Edit a copy** copies one into your packs; the copy replaces it (references from other packs keep working) and **Revert to bundled** deletes it. Copies of personal-use packs stay personal use: don't share them.
- **Yours**: made with **New pack** or imported, stored in this browser.

When a new version of OpenTabletop changes a bundled pack you have a copy of, your copy doesn't change by itself: it is marked **update** in the list, and its page (in the Oracle app, and under the system's name in the Systems app) lists the files the bundled pack changed, added or removed since you made the copy, saying for each one whether you touched it too. For each file, **Take bundled** brings in the new version (yours of that file is replaced) and **Keep mine** leaves yours and stops telling you about it; **See the bundled version** shows it first. **Take the updates you haven't touched** brings in, at once, every changed file your copy left as it was, so nothing of yours is lost. **Keep my copy as it is** ignores them all. All of it can be undone with ↶. Copies made before this existed list the files that differ from the bundled version, since whether you or an update changed them can't be told; choose once, and from then on only real updates are shown.

## Personal-use packs

Some games only allow their tables for **personal use** (Kal-Arath, for one). Their packs never go in the public project: they live in a separate folder, `packs-private/`, which is its own private git repository. When the apps are built on a computer that has that folder, its packs are bundled for that computer only and show a _personal use_ badge.

- Don't share them, export them as .zip for others, or publish a build that contains them.
- An edited copy of a personal-use pack is still personal use.
- Whether a game allows sharing is in its license; each pack records it in `pack.yaml` (`license`, `attribution`). When in doubt, treat it as personal use.

## Other definitions: travel rules and bindings

Besides tables, oracles, generators and decks, a pack can hold definitions for **other engines**. Today these are two, and together they turn a pack into a **travel system** that the Hexmapper's Play mode (**With rules**) and the [Travel app](../travel/01-getting-started.md) can play:

| Definition       | `kind`         | What it says                                                                                                                                          |
| ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Travel rules** | `travel-rules` | How a trip works: the length of the day, speed on each terrain and road, ways of travelling, supplies, weather, and **which checks** happen and when. |
| **Bindings**     | `bindings`     | How those checks are **resolved**: which table rolls each one, the party stats the tables use, and how the map is discovered.                         |

**Why two.** The rules belong to the Travel Engine and the tables to the Oracle, and engines don't know each other: the bindings are the bridge. That's also why each is optional on its own: rules without bindings make a system whose checks all wait for you (**Continue**); the generic rules have no checks at all.

**Why in one file.** Only for convenience: they are written and changed together. A YAML file can hold several definitions separated by a line with `---`, so the Grey Marches keep both in `travel.yaml`:

```yaml
kind: travel-rules
id: default
day: { start: '07:00', nightfall: '19:00' }
# …terrains, modes, checks…
---
kind: bindings
id: default
on:
  WEATHER_CHECK_REQUIRED: { resolve: weather }
```

They could live in separate files just as well. A pack holds at most one travel system, so both use the id `default`.

**How to add them.**

- In the Systems app: **New system** creates a pack with both; its **Rules** and **Checks** tabs edit them with forms.
- In the Oracle app: **New definition → Rules of the system** adds one of them (roll modes, travel rules, bindings, a calendar or a weather model) to one of your packs, as a valid example to change in the YAML editor ([Kinds of definition](../technical/07-kinds.md) explains each). The pack page lists them under **Other definitions**; open them in the YAML editor, where problems are checked like in any other definition.

What goes inside is explained step by step in [Connecting tables to maps and trips](07-connecting.md#5-your-own-travel-system).

## Making a pack

**New pack** asks for a name, a folder/id (lowercase letters, digits and dashes) and the base language the tables are written in. Then add definitions with **New definition** (or the **+** next to the pack): pick the kind, its id and name, and the file it goes **In** (an existing one or a new one). Definitions can live in any file of the pack; group them as you like.

The pack page shows its manifest, its **problems** (click one to jump to the line), its definitions, other engines' definitions (travel rules, bindings), its files (add, rename, delete) and its translations. Under its name, **Export .zip** and **Delete pack**, which removes the pack and all its files from this browser (it asks first; export it before if you may want it back).

## Backups and sharing

**Export .zip** downloads the pack as a folder; **Import .zip** adds one. Your packs live only in this browser: export them to keep them safe.

The Hexmapper sees your packs when both apps are served from the same site (e.g. `…/oracle/` and `…/hexmapper/`).

## Copying definitions

**Duplicate** copies a definition inside its pack; **Copy to…** copies it, with its translations, into one of your packs (local references become `pack/id`, so they keep pointing at the same tables). Handy to start from a bundled table.

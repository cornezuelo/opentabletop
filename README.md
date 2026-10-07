# OpenTabletop

Free, open-source tools for **solo RPGs, hexcrawls and sandbox campaigns**: draw a hex map, travel across it day by day, roll on oracles and tables, keep the campaign's calendar and journal. Everything runs in the browser, offline, with no account and no server.

It is **game-system agnostic**: the apps know no game's rules. A game comes as a **pack** of data (YAML files: tables, oracles, travel rules, a calendar, weather, roll modes…), validated on load, and the apps play whatever its packs declare. Two packs come bundled: **Core** (generic oracles for any game) and **the Grey Marches**, a small frontier setting with an example map that uses every feature, to play and to learn from.

> Pre-alpha: everything works, but formats may still change (with migrations) until the first release, `0.1`.

## The apps

| App           | What it does                                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hexmapper** | Draw hex maps (terrain, roads and rivers, regions, icons, tokens, notes), print or export them, and **play** on them: trips with rules, discovery of blank hexes, the world clock. |
| **Oracle**    | Browse, roll and **edit** every table, oracle, generator and deck of your packs, with forms or a YAML editor with live problems; create and share packs.                           |
| **Travel**    | Play trips without a map, and edit travel systems (rules, checks and the tables that answer them).                                                                                 |
| **Manual**    | The user manual of every app, in English and Spanish, with search. Each app also opens it in a side panel.                                                                         |
| **CLI**       | `opentabletop validate`, `list` and `roll` packs from the command line.                                                                                                            |

The apps are installable (PWA) and work offline. They share your packs and can save **one backup file** of everything they keep in the browser (maps, packs, trips, histories, preferences) to move your games to another computer.

## Getting started

You need a recent [Node.js](https://nodejs.org) (22 or newer) and `make`.

```sh
git clone https://github.com/cornezuelo/opentabletop.git
cd opentabletop
make install   # dependencies
make serve     # build every app and serve them at http://localhost:8080/
```

Then open `http://localhost:8080/hexmapper/`, `/oracle/`, `/travel/` or `/manual/`. To try everything at once, in the Hexmapper choose **Maps → Example maps → The Grey Marches** and press **Play**.

`make` lists every command. The usual ones:

| Command                                        | What it does                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `make dev` / `make dev-oracle`…                | One app with live reload (`make dev-all` for every app).           |
| `make serve`                                   | Build the whole site and serve it (the apps share packs this way). |
| `make cli ARGS="roll core/yes-no odds=likely"` | Run the command line.                                              |
| `make verify`                                  | What CI runs: lint, types and tests.                               |

## Packs

A pack is a folder with a `pack.yaml` (id, version, base language, license) and YAML definitions. Every kind of definition is described in the manual's [Kinds of definition](docs/manual/en/technical/07-kinds.md); the [Grey Marches](packs/grey-marches/) are a worked example of all of them, with comments.

- **Open packs** (`packs/`): our own content and games whose license allows redistribution, with their attribution. Bundled in every build.
- **Personal-use packs**: games whose license only allows personal use (Kal-Arath, for one) never go in this repo. They live in a separate private checkout at `packs-private/`, bundled only on the machine that has it and only in local builds (`make serve` → `dist-local/`); `make site` builds the public `dist/` without them.
- **Your packs**: made or imported in the Oracle app, kept in your browser and exportable as `.zip`.

## How it's built

TypeScript, Svelte 5 and PixiJS (the map), in npm workspaces. The rules engines are plain, headless TypeScript packages — no UI, no browser, no randomness of their own (it's injected, so rolls can be seeded and replayed) — and they talk to each other through events, never directly:

```
packages/   hex, random, dice, conditions, time        building blocks
            oracle-engine, travel-engine,               engines (pure: state + action → state + events)
            world-engine, weather-engine
            session                                     ties the engines together for a trip
            schema, storage, note-refs                  saved data, browser storage, links to notes apps
            ui-kit, pack-ui, oracle-ui, travel-ui,      shared Svelte pieces
            manual-ui
apps/       hexmapper, oracle, travel, manual, cli
packs/      core, grey-marches
docs/       design notes, the manual (docs/manual/<language>/<app>/), the backlog
```

Lore stays in your notes app: maps and journals link to SilverBullet or Obsidian pages instead of copying them.

- Design: [`docs/otd.md`](docs/otd.md) (the saved-data format), [`docs/oracle-engine.md`](docs/oracle-engine.md), [`docs/travel-engine.md`](docs/travel-engine.md).
- What's done and what's next: [`docs/BACKLOG.md`](docs/BACKLOG.md).
- Conventions for contributors (and AI assistants): [`CLAUDE.md`](CLAUDE.md).

## License

The code and the open packs are [MIT](LICENSE). Bundled third-party assets (icons, fonts) keep their own licenses: see [CREDITS.md](CREDITS.md). Packs record their license and attribution in their `pack.yaml`.

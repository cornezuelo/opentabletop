# Changelog

What changes in each release of OpenTabletop, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/) for the whole repository (see [docs/RELEASING.md](docs/RELEASING.md)). Work not yet released goes under **Unreleased**.

## [Unreleased]

The first alpha, `0.1.0`, is being prepared: everything below is what it will bring.

### Apps

- **Hexmapper**: hex maps (terrain, roads, rivers, walls and borders, regions, icons, texts, tokens, notes), printing and PNG / real-scale PDF export, a map library in the browser; **Play** on the map with any travel system (routes, checks resolved by the Oracle, discovery of blank hexes, a journal); the **Oracle** panel and the **World clock** (calendars, events, holidays and moons, progress clocks).
- **Oracle**: browse, roll and edit tables, oracles, generators and decks with forms or a YAML editor with live problems; packs (new, import and export, translations, updates of bundled packs).
- **Travel**: trips without a map; travel systems edited with forms (the day, ways of travelling, terrains, supplies, values of the day, actions as steps, checks and their tables) or YAML.
- **Manual**: the user manual of every app, English and Spanish, with search; each app opens it in its help column, with the explanation of the field you're on above it.
- **Command line**: `opentabletop validate`, `list` and `roll`.

### Packs

- **Core**: generic oracles and inspiration for any game, and the Generic travel rules.
- **The Grey Marches**: a frontier setting with an example map that uses every feature. Camp and rest only with food left and fatigue under 10; hunger is rolled when a day ends without food.

### Fixes

- Moving the world clock on with a trip and a route planned travels along the route (marching by day, nights, waiting on arrival) instead of waiting in place; a day passing asks first, and a message at the bottom says why the trip stopped early, or that it arrived.
- A night when the party can't take its night action (camp) passes without it, said in the journal, instead of leaving the trip stuck at nightfall.
- The trail and planned route follow the drawn shape of the roads, trails and rivers they walk.
- The party's trail and planned route are drawn beside the roads and rivers they follow, not on top of them.
- Waiting with the world clock never moves the party, even with a route planned and discovery on.

### Formats

- Maps as OTD bundles (`.otd.json`, format v13), Travel trips v3, packs as YAML folders; every older format is migrated when read.
- Translations can translate a generator field's fixed text (`fields:` in `locales/`).

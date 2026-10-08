# Changelog

What changes in each release of OpenTabletop, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/) for the whole repository (see [docs/RELEASING.md](docs/RELEASING.md)). Work not yet released goes under **Unreleased**.

## [Unreleased]

### Apps

- The Hexmapper's top bar looks like the other apps': its icons in the same muted tone, and Preferences (the gear) next to Help.
- The site's front page no longer lists the bundled packs: the apps show them.

## [0.2.0] - 2026-10-08

### Apps

- **Preferences** in every app, under a gear in the header: the language and your notes app (until now only in the Hexmapper's settings), shared by every app; in the Oracle, a **seed** for repeatable rolls (the same seed, the same results; **New session** starts it over) and **which packs the list shows**. The Hexmapper's **Settings** are now **Map settings**, with a map icon.
- The **help column**: a field's help is part of the column (its **✕** closes the column) and lists the manual's sections about it under **In the manual**; **Syntax** opens the page with everything a pack can write; a click on an example in code puts it into the last text box or YAML editor used, at the cursor; the search looks in the technical and packs pages too and shows the words found in bold (also in the Manual app).
- The site's **front page**: an OpenTabletop logo (also the site's icon and in the app list), the packs it comes with, and a footer with the source code on GitHub, where to report a problem, the licence and the version with what's new.

### Fixes

- The manual's links to a section of the same page (like _templates_ in **Syntax**) went to the first page instead.

## [0.1.1] - 2026-10-08

### Apps

- The apps open in your browser's language when we have it (Spanish for `es-*`), until you choose one; the site's front page has flags to choose it, shared with every app.

### Fixes

- The "new version" question comes back after a reload: closing it without answering no longer counts as **Later**, and **Later** only silences that version, so a newer build asks again.

## [0.1.0] - 2026-10-08

The first alpha: the four apps, the open packs and the manual, published as a static site.

### Apps

- **Hexmapper**: hex maps (terrain, roads, rivers, walls and borders, regions, icons, texts, tokens, notes), printing and PNG / real-scale PDF export, a map library in the browser; **Play** on the map with any travel system (routes, checks resolved by the Oracle, discovery of blank hexes, a journal); the **Oracle** panel and the **World clock** (calendars, events, holidays and moons, progress clocks).
- **Oracle**: browse, roll and edit tables, oracles, generators and decks with forms or a YAML editor with live problems; packs (new, import and export, translations, updates of bundled packs).
- **Travel**: trips without a map; travel systems edited with forms (the day, ways of travelling, terrains, supplies, values of the day, actions as steps, checks and their tables) or YAML.
- **Manual**: the user manual of every app, English and Spanish, with search; each app opens it in its help column, which shows the explanation of the field you're on instead, formatted, with working examples.
- **Command line**: `opentabletop validate`, `list` and `roll`.
- Side columns fold away with a tab on their edge in every app, as in the Hexmapper.
- The manual's technical section has a **Syntax** page: every piece of syntax a pack can write (values, ids, dice, ranges, templates, conditions, `set`, `effects`, moments, steps, `blocks`, limits), with examples and links.

### Packs

- **Core**: generic oracles and inspiration for any game, and the Generic travel rules.
- **The Grey Marches**: a frontier setting with an example map that uses every feature. Camp and rest only with food left and fatigue under 10; hunger is rolled when a day ends without food.

### Fixes

- Moving the world clock on with a trip and a route planned travels along the route (marching by day, nights, waiting on arrival) instead of waiting in place; a day passing asks first, and a message at the bottom says why the trip stopped early, or that it arrived.
- A night when the party can't take its night action (camp) passes without it, said in the journal, instead of leaving the trip stuck at nightfall.
- The trip panel has **Wait until dawn**, and travelling in a storm that can't be camped out passes to the next day: a party lost or stormbound with no food is never stuck.
- The trail and planned route follow the drawn shape of the roads, trails and rivers they walk.
- The party's trail and planned route are drawn beside the roads and rivers they follow, not on top of them.
- Waiting with the world clock never moves the party, even with a route planned and discovery on.

### Formats

- Maps as OTD bundles (`.otd.json`, format v13), Travel trips v3, packs as YAML folders; every older format is migrated when read.
- Translations can translate a generator field's fixed text (`fields:` in `locales/`).

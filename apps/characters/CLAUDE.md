# Characters

The roster of characters. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** the characters this browser keeps, of any system (the roster): make them with a system's characters' sheet, edit them, link their notes, see where each plays, duplicate, delete, import and export them as OTD. Sheets are edited in the Systems app; trips (Travel, Map's Play) take roster characters and keep them in step. Design: [`docs/characters-app.md`](../../docs/characters-app.md).

## Architecture

```
src/
  lib/
    actions.ts        # create, duplicate, delete, import, export (on character-ui's roster store)
    bestiary.ts       # a system's templates, copies in the roster, the link to edit one in Systems (templates are edited there only)
    groups.ts         # the left column's lists: by system, then by sheet; search and filter by tag
    packs.svelte.ts   # PackLibrary (shared with the other apps), the systems with a characters' sheet, a sheet's system (sheetOf)
    nav.svelte.ts     # #/character/<id>, #/new, #/bestiary[/<bestiary>/<template>]
    i18n/             # typed en/es dictionaries
  components/         # Sidebar (tabs Characters and Bestiary), NewCharacter, CharacterView, BestiaryView (a template, read-only: make copies, Edit in Systems ↗)
```

- The roster's rules (keep, take, sync, leave, ids, OTD) are plain functions in `session` (`roster.ts`); the store in this browser is `character-ui`'s `roster` (`opentabletop.characters`, versioned; backups join it by character, the newer kept).
- A character plays in one place at a time (`playing`: a map's trip, a Travel trip or a token).

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md) (item 11).

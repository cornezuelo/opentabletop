# Notes

OpenTabletop's own notes app. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** pages of lore in Markdown, kept in this browser by campaign (and General), linked to each other and into the games; the page a `noteRef` of another app opens (note-refs' **OpenTabletop Notes** provider). Mechanics stay in the other apps. Design: [`docs/notes-and-journal.md`](../../docs/notes-and-journal.md) §3 and §9.

## Architecture

```
src/
  lib/
    notes.svelte.ts   # the pages and the games' things as kept, read again on changes; new, rename, move, delete, link mentions, open a noteRef, the Log's lines, export and import
    nav.svelte.ts     # #/page/<id>, #/ref/<path>?in=<campaign>&from=<thing>
    packs.svelte.ts   # PackLibrary, only to name the campaigns' factions as their systems do
    editing.svelte.ts # read or edit, kept from page to page
    welcome.ts        # the page written in General the first time Notes has no pages (welcome/<lang>.md, with the manual's summary of Markdown)
    i18n/             # typed en/es dictionaries (notes-ui's texts through `ui`)
  components/         # Sidebar (New page, ⋯, search, NoteTree), PageView (path, campaign, Read/Edit, NoteView or NoteEditor, NoteLinks)
```

- What pages are and how links resolve is `@open-tabletop/notes` (headless); what shows them is `@open-tabletop/notes-ui`, embeddable in other apps; the packs' example pages (`examplePages`, `addMissingExamples`) are notes-ui's, so Map adds them to an example map's campaign.

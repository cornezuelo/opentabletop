# Manual

The OpenTabletop user manual as an app: every app's pages, a page tree and search. Read the root `CLAUDE.md` first.

- **Content** lives in `docs/manual/<locale>/<app>/<NN-slug>.md` (English is the base; Spanish pages translate them, missing ones fall back to English). The first `# heading` is the page title; `## headings` are sections (search results and links point at them). Link pages with relative Markdown links to the real file names (`07-tokens.md`, `../oracle/02-rolling.md#decks`), so they work in any Markdown viewer too; a test checks every link.
- **Code** is in `@open-tabletop/manual-ui`: page parsing and search, the full view (`Manual`) used here, and `HelpPanel`, the reduced manual each app shows in its own UI.
- Every new app adds its pages under `docs/manual/<locale>/<app>/` and a help button with `HelpPanel`.
- Views are in the URL hash: `#/<app>/<page>[/<section>]`, so apps can deep-link here.

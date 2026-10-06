# Oracle

Standalone app of the Oracle Engine: **browse and roll** every table, oracle, generator and deck of the loaded packs, and **create and edit packs**. Read the root `CLAUDE.md` and `docs/oracle-engine.md` first.

**Responsibility:** packs (YAML files) and rolling them. Resolution, validation and translations are the engine's job (`@open-tabletop/oracle-engine`); this app only reads and writes files and shows results.

## Architecture

```
src/
  lib/
    packs/      # bundled packs, the app's PackLibrary, new-pack helpers, zip import/export, templates
    i18n/       # typed en/es dictionaries on top of ui-kit's createI18n
    oracle.ts   # the app's OracleUi (roller, history, pack texts) from @open-tabletop/oracle-ui
    nav.svelte.ts  # view state mirrored in the URL hash (#/def/<pack>/<id>[/edit], #/pack/<folder>, #/file/<folder>/<path>)
  components/   # Sidebar, DefinitionView (Roll / Edit tabs, duplicate / copy to / delete),
                # PackView, FileEditor (CodeMirror), NewPackDialog, NewDefinitionDialog
    edit/       # form editors: DefinitionEditor (common texts, language) → EntriesEditor (tables,
                # oracle variants), OracleEditor, GeneratorEditor, DeckEditor; RefPicker, TextField
```

Shared packages: `@open-tabletop/pack-ui` (pack library with the editing operations, YAML Document helpers, CodeMirror YAML editor) and `@open-tabletop/oracle-ui` (roll panel, result card, history, roller, context variables detection). `lib/packs/workspace.svelte.ts` is the app's `PackLibrary`.

Principles:

- **Files are the source of truth.** Forms edit YAML through the `yaml` Document API (`pack-ui`'s `yaml.ts`), so comments, key order and formatting of the rest of the file survive. Anything a form can't edit (a generator field's condition and context, nested `any`/`all`/`not`…) is edited in the YAML editor.
- **Live validation:** every change recompiles the packs; engine diagnostics are mapped to lines (`locate`) and shown in the editor gutter and in the pack's problem list.
- **Bundled packs are read-only.** "Edit a copy" copies the pack into the user's packs with the same folder, which overrides the bundled one (references from other packs keep working); "Revert to bundled" deletes the copy. Copies of personal-use packs stay personal use.
- **User packs live in the browser** (`localStorage`, key `opentabletop.userPacks`, shared by OpenTabletop apps served from the same origin). Export a pack as `.zip` (its folder at the top, ready for `packs/`) to back it up or share it.
- **Context variables** a definition reads (roll and reference templates, condition keys) are detected by following its references (`oracle-ui`'s `variables.ts`), so the roll panel asks for them; values seen in conditions are offered as suggestions.

## Done

- Pack list and history can be folded (header buttons; remembered in this browser).
- Favorites (☆ next to a definition's name): pinned on top of the list, also in the Hexmapper's Oracle panel (shared `opentabletop.favorites`).
- New definition dialog also adds travel rules and bindings (one travel system per pack).
- Sidebar with search, packs (bundled / edited / personal-use badges, error count) and their definitions.
- Roll tab: oracle inputs, detected context variables, advantage/disadvantage, deck draw/shuffle with cards left, result card with dice breakdown and nested results, entries preview with the chosen one highlighted, Space/Enter to roll again, results in the UI language.
- History (last 100, persisted) and "New session" (resets once-only entries and decks).
- Entry conditions, `set` values, once/at-most (⋯ on a row, one line of flow YAML) and clamp / when-exhausted per table.
- Form editors for every kind, with translations per language (overlay files): tables (dice, entries with range or weight, delegate to a table/generator, add/duplicate/move/remove, number 1–N, give entries ids), oracles (the input, its options: rename/add/move/remove, default, one entry list per option), generators (fields from a table, generator, dice or fixed value; rename/move/remove; template with {{field}} chips) and decks (cards with copies, reshuffle mode).
- Definitions: "New definition" dialog (pack, kind, name → id, file; also from the + on each user pack), duplicate, "copy to" one of your packs (with translations; local references become `pack/id`), delete (with translations).
- Pack view: manifest summary, problems (click → line), definitions, other engines' definitions, files (add/rename/delete), translations (add language), new definition from templates, export .zip, delete / revert.
- YAML editor (CodeMirror 6, MIT) with diagnostics in the gutter.
- New pack dialog, import .zip.

## Pending

- Undo/redo across form edits (the YAML editor has its own).
- Roll statistics (distribution of a table) and coverage view.

# Oracle

Standalone app of the Oracle Engine: **browse and roll** every table, oracle, generator and deck of the loaded packs, and **create and edit packs**. Read the root `CLAUDE.md` and `docs/oracle-engine.md` first.

**Responsibility:** packs (YAML files) and rolling them. Resolution, validation and translations are the engine's job (`@open-tabletop/oracle-engine`); this app only reads and writes files and shows results.

## Architecture

```
src/
  lib/
    packs/      # workspace (bundled + user packs, overrides), YAML edits, zip import/export, templates
    roll/       # roller (Oracle state, history), context variables detection
    i18n/       # typed en/es dictionaries on top of ui-kit's createI18n
    nav.svelte.ts  # view state mirrored in the URL hash (#/def/<pack>/<id>[/edit], #/pack/<folder>, #/file/<folder>/<path>)
  components/   # Sidebar, DefinitionView (Roll / Edit tabs), RollPanel, ResultCard, TableEditor,
                # PackView, FileEditor (CodeMirror), History, NewPackDialog
```

Principles:

- **Files are the source of truth.** Forms edit YAML through the `yaml` Document API (`lib/packs/yaml.ts`), so comments, key order and formatting of the rest of the file survive. Anything a form can't edit (conditions, `set`, generators…) is edited in the YAML editor.
- **Live validation:** every change recompiles the packs; engine diagnostics are mapped to lines (`locate`) and shown in the editor gutter and in the pack's problem list.
- **Bundled packs are read-only.** "Edit a copy" copies the pack into the user's packs with the same folder, which overrides the bundled one (references from other packs keep working); "Revert to bundled" deletes the copy. Copies of personal-use packs stay personal use.
- **User packs live in the browser** (`localStorage`, key `opentabletop.userPacks`, shared by OpenTabletop apps served from the same origin). Export a pack as `.zip` (its folder at the top, ready for `packs/`) to back it up or share it.
- **Context variables** a definition reads (roll and reference templates, condition keys) are detected by following its references (`lib/roll/variables.ts`), so the roll panel asks for them; values seen in conditions are offered as suggestions.

## Done

- Sidebar with search, packs (bundled / edited / personal-use badges, error count) and their definitions.
- Roll tab: oracle inputs, detected context variables, advantage/disadvantage, deck draw/shuffle with cards left, result card with dice breakdown and nested results, entries preview with the chosen one highlighted, Space/Enter to roll again, results in the UI language.
- History (last 100, persisted) and "New session" (resets once-only entries and decks).
- Table form editor: name, description, dice, entries (id, range or weight, result, delegate to a table/generator with suggestions), add/move/remove, number 1–N, translations per language (overlay files, needs entry ids; "Give entries ids").
- Pack view: manifest summary, problems (click → line), definitions, other engines' definitions, files (add/rename/delete), translations (add language), new definition from templates, export .zip, delete / revert.
- YAML editor (CodeMirror 6, MIT) with diagnostics in the gutter.
- New pack dialog, import .zip.

## Pending

- Form editors for generators, oracles and decks.
- Edit `when` conditions and `set` values in the table form.
- Undo/redo across form edits (the YAML editor has its own).
- Roll statistics (distribution of a table) and coverage view.
- Extract the roll panel as `oracle-ui` for the hexmapper.

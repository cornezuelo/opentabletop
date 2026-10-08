# Systems

Makes and edits game systems. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** systems (`kind: system` and the parts it names: travel rules, bindings; later calendars, weather models and roll modes). It edits; it doesn't play: trips without a map are the Travel app's, trips on a map the Hexmapper's. The system page links to Travel to try it.

## Architecture

```
src/
  lib/
    packs.svelte.ts   # PackLibrary (bundled + user packs, shared with the other apps) and the systems
    newSystem.ts      # a new user pack with the generic rules, empty bindings and its system.yaml
    terrains.ts       # terrain and edge names (the Hexmapper palette, suggested in the rules)
    systemDoc.svelte.ts # forms ↔ YAML: edits to the rules (@travel-rules) or bindings (@bindings) of a file
    nav.svelte.ts     # #/system/<id>/<rules|checks|yaml>
    i18n/             # typed en/es dictionaries
  components/         # Sidebar (systems, new system), SystemView (tabs), YamlTab, ReadOnly (edit a copy / revert);
                      # forms/: RulesForm (+ values of the day), ActionsForm (actions as steps),
                      # ChecksForm (checks + bindings + stats), RecordRows
```

- The Checks tab keeps rules and bindings in step: renaming a check renames its binding; removing it removes its binding.
- Bundled systems are read-only: **Edit a copy** (PackLibrary `editCopy`) makes an editable copy.
- Text files stay the source of truth: forms write YAML keeping comments.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md) (After the alpha → System engine → the Systems app's steps).

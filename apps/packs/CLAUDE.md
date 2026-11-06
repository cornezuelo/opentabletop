# Packs

Makes and edits packs and the game systems they hold. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** systems (`kind: system` and the parts it names: travel rules, bindings; later calendars, weather models and roll modes), and map styles (`kind: style`, any pack's), on the way to editing every kind of every pack (backlog: _One app edits packs_). It edits; it doesn't play: trips without a map are the Travel app's, trips on a map Map's. Its **Try it** tab plays a test trip without a map (travel-ui's `TripRoom`) with the rules as they are, kept apart from Travel's trips; the system page links to Travel to play it.

## Architecture

```
src/
  lib/
    packs.svelte.ts   # PackLibrary (bundled + user packs, shared with the other apps) and the systems
    newSystem.ts      # a new user pack (a copy of Core's Generic rules and its calendar, empty bindings, system.yaml); where a system's parts are;
                      # its choices, new parts (createPart), declaring an implicit system
    terrains.ts       # terrain and edge names (Map palette, suggested in the rules)
    maps.ts           # a system's example maps (`maps:`, OTD bundles in its pack): read, added, named
    systemDoc.svelte.ts # forms ↔ YAML: edits to the rules (@travel-rules), bindings (@bindings) or system (@system)
    nav.svelte.ts     # #/system/<id>/<overview|rules|checks|sheet|items|bestiary|factions|clocks|world|calendar|weather|land|modes|try|yaml>[/<item>] (a template, unfolded); #/style/<pack>/<id> (a map style); #/pack/<folder>[/images]; #/def/<folder>/<kind>/<id>[/yaml|used]; #/file/<folder>/<path>
    partDoc.svelte.ts # pack-ui's definitionDoc on this app's library (one definition edited in forms), and the rows' document interfaces
    bestiary.ts       # the Bestiary tab: a part's bestiary as the system read it, a template shown and written (texts in the language edited)
    tabs.ts           # a system's tabs, each once and in order (systemTabs)
    trial.svelte.ts   # the Try it tab's trips (travel-ui TripStore, `opentabletop.packs.trips`)
    steps.ts          # a step's kind, changing it, a new kind's value, the step in words (StepCard's title)
    usage.ts          # where a system's names are used (session's index of uses): Used by, Find a name; each place's name and link and the list are oracle-ui's (`shownPlace`, `UsesList`), shared with the Oracle's Rolled by
    i18n/             # typed en/es dictionaries
  components/         # Sidebar (Systems | Packs, a search; the tree from lib/tree.ts), PackHolds (a pack's cards, in pack-ui's PackPage), NewSystemDialog, DefinitionPage (a definition's Form, YAML, Rolled by), SystemView (tabs), StyleView (a map style: pack-ui's StyleForm, Make a copy, Remove), Overview (the kind: system form), YamlTab (the parts' files), TryTab (a test trip), ReadOnly (pack-ui's PackNotice worded for a system: edit a copy / revert);
                      # forms/: RulesForm (+ values of the day), ActionsForm (actions, conditions as rows), StepCard (a step as a card),
                      # ChecksForm (checks + bindings + stats, stats from the characters, carried supplies), RecordRows;
                      # parts/: the sheet, item catalogues, factions, clocks, world rules (WorldForm, WorldSteps), calendar, weather, land and roll modes forms (PartsTab);
                      # uses/: UsedBy (a row's count), UsesList (the places), FindName (on the Overview)
```

- The Checks tab keeps rules and bindings in step: renaming a check renames its binding; removing it removes its binding.
- Templates of bestiaries are edited here only (folded cards, character-ui's `TemplateEditor`); the Characters app shows them and links here.
- Bundled systems are read-only: **Duplicate** (`duplicateSystem`, on any system) makes an independent pack of the user's with everything the original's has, its example maps rewritten to play it; the original never changes. Copies edited in place (older versions, the Oracle's **Edit a copy**) still show **Revert to bundled** and their updates.
- Text files stay the source of truth: forms write YAML keeping comments.
- Map styles are listed from every pack, whatever system they serve; a bundled one is never edited: **Make a copy** (pack-ui's `copyStyle`) makes a new style in the user's pack `my-styles`. Map's **Map settings → Style** uses the same form beside the map.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md) (After the alpha → System engine → the Packs app's steps).

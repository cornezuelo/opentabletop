# Travel

Plays trips and edits travel systems. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** travel systems (packs with `travel-rules` and `bindings`). Trips here have no map: the way is a line of hexes the user describes (terrain, tags, roads/rivers to the next one). Trips on a map are the Hexmapper's Play mode; both use `session` (`startTrip`, `stepTrip`) and the `travel-ui` components.

## Architecture

```
src/
  lib/
    way.ts            # an abstract way → TravelWorld (hexes "0", "1"…; edges join each to the next)
    trip.svelte.ts    # the trip being played (system, season, way, session), saved in localStorage
    packs.svelte.ts   # PackLibrary (bundled + user packs, shared with the other apps) and the systems
    newSystem.ts      # a new user pack with the generic rules and empty bindings; the rules' file
    terrains.ts       # terrain and edge choices (Hexmapper palette + the system's own)
    systemDoc.svelte.ts # forms ↔ YAML: edits to the rules (@travel-rules) or bindings (@bindings) of a file
    flow.ts           # conditions/context as one line of flow YAML
    nav.svelte.ts     # #/system/<id>/<play|rules|checks|yaml>
    i18n/             # typed en/es dictionaries
  components/         # Sidebar (systems, new system), SystemView (tabs), PlayTab, WayEditor, YamlTab;
                      # forms/: RulesForm, ChecksForm (checks + bindings + stats), RecordRows
```

- Only one trip is kept (`opentabletop.travel.trip`); starting one with another system asks first.
- Editing the way re-plans the route to the last hex. Hexes already walked can't change.
- The Checks tab keeps rules and bindings in step: renaming a check renames its binding; removing it removes its binding.
- Bundled systems are read-only: **Edit a copy** (PackLibrary `editCopy`) makes an editable copy.

## Roadmap

- [x] First version: systems list, play an abstract trip, YAML editor with live diagnostics, new system, edit a copy, manual pages.
- [x] Forms for travel rules (day, modes, terrains, edges, resources, weather, actions) and, in one Checks tab, checks with their bindings (table picker, context) and stats. They write the YAML through pack-ui helpers, keeping comments.
- [ ] Several saved trips; export a trip's journal.

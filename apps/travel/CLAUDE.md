# Travel

Plays trips and edits travel systems. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** travel systems (packs with `travel-rules` and `bindings`). Trips here have no map: the way is a line of hexes the user describes (terrain, tags, roads/rivers to the next one). Trips on a map are the Hexmapper's Play mode; both use `session` (`startTrip`, `stepTrip`) and the `travel-ui` components.

## Architecture

```
src/
  lib/
    way.ts            # an abstract way → TravelWorld (hexes "0", "1"…; edges join each to the next)
    trip.svelte.ts    # saved trips (system, season, way, session, name) and the open one, in localStorage
    packs.svelte.ts   # PackLibrary (bundled + user packs, shared with the other apps) and the systems
    newSystem.ts      # a new user pack with the generic rules and empty bindings; the rules' file
    terrains.ts       # terrain and edge choices (Hexmapper palette + the system's own)
    systemDoc.svelte.ts # forms ↔ YAML: edits to the rules (@travel-rules) or bindings (@bindings) of a file
    nav.svelte.ts     # #/system/<id>/<play|rules|checks|yaml>
    i18n/             # typed en/es dictionaries
  components/         # Sidebar (systems, new system), SystemView (tabs), PlayTab, WayEditor, YamlTab;
                      # forms/: RulesForm (+ values of the day), ActionsForm (actions as steps),
                      # ChecksForm (checks + bindings + stats), RecordRows
```

- Several trips are kept (`opentabletop.travel.trips`, version 3; the single `opentabletop.travel.trip` of before is migrated); one is open. Restarting the open trip asks first if its journal has something.
- Editing the way re-plans the route to the last hex. Hexes already walked can't change.
- The Checks tab keeps rules and bindings in step: renaming a check renames its binding; removing it removes its binding.
- Bundled systems are read-only: **Edit a copy** (PackLibrary `editCopy`) makes an editable copy.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md#travel).

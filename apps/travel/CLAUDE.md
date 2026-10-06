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
    nav.svelte.ts     # #/system/<id>/<play|yaml>
    i18n/             # typed en/es dictionaries
  components/         # Sidebar (systems, new system), SystemView (tabs), PlayTab, WayEditor, YamlTab
```

- Only one trip is kept (`opentabletop.travel.trip`); starting one with another system asks first.
- Editing the way re-plans the route to the last hex. Hexes already walked can't change.
- Bundled systems are read-only: **Edit a copy** (PackLibrary `editCopy`) makes an editable copy.

## Roadmap

- [x] First version: systems list, play an abstract trip, YAML editor with live diagnostics, new system, edit a copy, manual pages.
- [ ] Forms for travel rules (terrains, edges, modes, resources, weather, actions, checks) and bindings (check → table picker, context, stats), reading and writing the YAML like the Oracle app's table editor.
- [ ] Several saved trips; export a trip's journal.

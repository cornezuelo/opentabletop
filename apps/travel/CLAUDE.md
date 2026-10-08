# Travel

Plays trips without a map. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** trips with any system, without a map: the way is a line of hexes the user describes (terrain, tags, roads/rivers to the next one). Trips on a map are the Hexmapper's Play mode; both use `session` (`startTrip`, `stepTrip`) and the `travel-ui` components. Systems are made and edited in the Systems app (each system page links there).

## Architecture

```
src/
  lib/
    way.ts            # an abstract way → TravelWorld (hexes "0", "1"…; edges join each to the next)
    trip.svelte.ts    # saved trips (system, season, way, session, name) and the open one, in localStorage
    packs.svelte.ts   # PackLibrary (bundled + user packs, shared with the other apps) and the systems
    terrains.ts       # terrain and edge choices (Hexmapper palette + the system's own)
    nav.svelte.ts     # #/system/<id>/play
    i18n/             # typed en/es dictionaries
  components/         # Sidebar (systems), SystemView (a trip, link to Systems), PlayTab, WayEditor
```

- Several trips are kept (`opentabletop.travel.trips`, version 3; the single `opentabletop.travel.trip` of before is migrated); one is open. Restarting the open trip asks first if its journal has something.
- Editing the way re-plans the route to the last hex. Hexes already walked can't change.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md#travel) (abstract journeys: After the alpha → System engine).

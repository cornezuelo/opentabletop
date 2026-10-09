# Travel

Plays trips without a map. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** trips with any system, without a map: the way is a line of hexes the user describes (terrain, tags, roads/rivers to the next one). Trips on a map are the Hexmapper's Play mode; both use `session` (`startTrip`, `stepTrip`) and the `travel-ui` components. Systems are made and edited in the Systems app (each system page links there).

## Architecture

```
src/
  lib/
    trip.svelte.ts    # its TripStore (travel-ui): saved trips and the open one, in localStorage
    packs.svelte.ts   # PackLibrary (bundled + user packs, shared with the other apps) and the systems
    nav.svelte.ts     # #/system/<id>/play
    i18n/             # typed en/es dictionaries
  components/         # Sidebar (systems), SystemView (travel-ui's TripRoom, link to Systems)
```

The trip without a map (the way, `wayWorld`, `TripStore`, `WayEditor`, `TripRoom`) lives in `travel-ui`, shared with the Systems app's **Try it** tab.

- Several trips are kept (`opentabletop.travel.trips`, version 5, migrated on reading in `travel-ui`'s `trips.svelte.ts`; the single `opentabletop.travel.trip` of before is migrated); one is open. Each release's saved trips with a trip going on are kept in `src/lib/old-trips/` (`make old-maps`) and `old-trips.test.ts` opens and plays them. Restarting the open trip asks first if its journal has something.
- Editing the way re-plans the route to the last hex. Hexes already walked can't change.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md#travel) (abstract journeys: After the alpha → System engine).

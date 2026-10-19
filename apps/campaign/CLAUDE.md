# Campaign

The campaigns of this browser. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** what is going on in each campaign (the world its maps and trips share): make one (a name and a system), name it, link its notes, play its world clock (date, moving time on, events, progress clocks, the world's weather), its factions (their sheets, their land on a map of the campaign as a minimap, world turns on that map), its timeline, the maps and trips in it with links to open them, delete it when nothing is in it. Maps join a campaign in the Hexmapper, trips in Travel; the system is edited in Systems. Design: [`docs/campaigns.md`](../../docs/campaigns.md).

## Architecture

```
src/
  lib/
    campaign.svelte.ts  # the campaigns kept (list), the open one (CampaignKeeper), its maps, the map its land plays on, its world's controls and factions
    packs.svelte.ts     # PackLibrary (shared with the other apps) and the systems
    nav.svelte.ts       # #/campaign/<id>[/<tab>], #/campaign/<id>/factions/<faction>, #/new
    i18n/               # typed en/es dictionaries
  components/           # Sidebar (the campaigns), NewCampaign, CampaignView (tabs), Factions, LandMap (the minimap), Places
```

- The campaign's model and what acts on it are `@open-tabletop/campaign`'s; the world clock's UI is `@open-tabletop/campaign-ui`'s (`WorldClock`, `WorldTimeline`, the Hexmapper's World panel too), driven here by `WorldControls` without a trip, on the map chosen in **Factions** (where turns change land; written back to the map library, which the Hexmapper hears).
- Campaigns live in IndexedDB (`@open-tabletop/storage`), announced on `opentabletop.campaigns`: a change here reaches the other apps at once, and theirs reach this one.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md) (item 11, phase (c) 4) and [`docs/campaigns.md`](../../docs/campaigns.md) §10.

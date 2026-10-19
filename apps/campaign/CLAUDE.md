# Campaign

The campaigns of this browser. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** what is going on in each campaign (the world its maps and trips share): make one (a name and a system), name it, link its notes, play its world clock without a map (date, moving time on, events, progress clocks, the world's weather), its timeline, the maps and trips in it with links to open them, delete it when nothing is in it. Maps join a campaign in the Hexmapper, trips in Travel; the system is edited in Systems. Design: [`docs/campaigns.md`](../../docs/campaigns.md).

## Architecture

```
src/
  lib/
    campaign.svelte.ts  # the campaigns kept (list), the open one (CampaignKeeper) and its world's controls
    packs.svelte.ts     # PackLibrary (shared with the other apps) and the systems
    nav.svelte.ts       # #/campaign/<id>[/<tab>], #/new
    i18n/               # typed en/es dictionaries
  components/           # Sidebar (the campaigns), NewCampaign, CampaignView (tabs), Places
```

- The campaign's model and what acts on it are `@open-tabletop/campaign`'s; the world clock's UI is `@open-tabletop/campaign-ui`'s (`WorldClock`, `WorldTimeline`, the Hexmapper's World panel too), driven here by `WorldControls` without a map or a trip.
- Campaigns live in IndexedDB (`@open-tabletop/storage`), announced on `opentabletop.campaigns`: a change here reaches the other apps at once, and theirs reach this one.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md) (item 11, phase (c) 4) and [`docs/campaigns.md`](../../docs/campaigns.md) §10.

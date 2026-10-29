# Campaign

The campaigns of this browser. It is one app of the OpenTabletop ecosystem: read the root `CLAUDE.md` first.

**Responsibility:** what is going on in each campaign (the world its maps and trips share): make one (a name, a system, the day it starts, its clock and factions), name it, link its notes, play its world clock (date, moving time on, events, progress clocks, the world's weather), its factions (their sheets, their land on a map of the campaign as a minimap, world turns on that map), its timeline, the maps and trips in it with links to open them, delete it when nothing is in it. Maps join a campaign in the Hexmapper, trips in Travel; the system is edited in Systems. Design: [`docs/campaigns.md`](../../docs/campaigns.md).

## Architecture

```
src/
  lib/
    campaign.svelte.ts  # the campaigns kept (list), the open one (CampaignKeeper), its maps, the map its land plays on, its world's controls and factions
    packs.svelte.ts     # PackLibrary (shared with the other apps) and the systems
    nav.svelte.ts       # #/campaign/<id>[/<tab>] (overview|world|maps|trips|characters|factions|timeline; `places` read as maps), #/campaign/<id>/factions/<faction>, #/new
    i18n/               # typed en/es dictionaries
  components/           # Sidebar (the campaigns, each with its system and date), NewCampaign (also the first-run Start your campaign), CampaignView (header with ⋯, tabs),
                        # Overview, PlaceList (Maps or Trips: cards, new/bring links), Cast (Characters), Factions, LandMap (the minimap)
```

- The campaign's model and what acts on it are `@open-tabletop/campaign`'s; the world clock's UI is `@open-tabletop/campaign-ui`'s (`WorldClock`, `WorldTimeline`, the Hexmapper's World panel too), driven here by `WorldControls` without a trip, on the map chosen in **Factions** (where turns change land; written back to the map library, which the Hexmapper hears).
- **Campaign is the landing**: the site's root redirects here (`scripts/build-site.mjs`); opened without a campaign it opens the one being played (`opentabletop.campaign.current`, ui-kit's `readCurrentCampaign` / `rememberCampaign`), else the newest, else **Start your campaign**.
- New maps and trips, and bringing existing ones, are done by the Hexmapper and Travel: Campaign links to them with `inCampaignUrl` (`#/in-campaign/<campaign>[/<id>]`), and they move the map or trip as their own settings do (asking what stays).
- Campaigns live in IndexedDB (`@open-tabletop/storage`), announced on `opentabletop.campaigns`: a change here reaches the other apps at once, and theirs reach this one.

## Roadmap

In [`docs/BACKLOG.md`](../../docs/BACKLOG.md) (item 11, phase (c) 4) and [`docs/campaigns.md`](../../docs/campaigns.md) §10.

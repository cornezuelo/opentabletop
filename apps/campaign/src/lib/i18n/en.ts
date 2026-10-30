import { campaignTexts } from '@open-tabletop/campaign-ui'
import { vocabulary } from '@open-tabletop/ui-kit'

// Source of truth for UI strings (English is the default locale). `es.ts` mirrors this shape.
export const en = {
  app: {
    title: 'Campaign',
    tagline: 'What is going on in your world.',
  },
  nav: {
    loading: 'Reading your campaigns…',
    showSidebar: 'Show the campaigns list',
    hideSidebar: 'Hide the campaigns list (more room)',
    showHelp: 'Show the help',
    hideHelp: 'Hide the help (more room)',
    help: 'Help and manual',
    campaigns: 'Campaigns',
    search: 'Search…',
    newCampaign: 'New campaign',
    empty: 'No campaigns yet.',
    noMatch: 'No campaign matches.',
    untitled: vocabulary.en.campaign.untitled,
    makeSystems: 'Make or edit systems →',
  },
  new: {
    title: 'New campaign',
    name: 'Name',
    namePlaceholder: 'The long winter',
    system: vocabulary.en.terms.system,
    systemHelp:
      'The game system its maps and trips are played with: its calendar names the days, and its progress clocks, weather and factions are the campaign’s. A map or trip that joins the campaign plays with it.',
    firstTitle: 'Start your campaign',
    firstIntro:
      'A campaign is the world your maps and trips share: its date and calendar, the events and progress clocks to come, what happened, its factions and the Oracle’s decks. Give it a name and the game system it’s played with; maps, trips and characters come into it later.',
    clock: 'Start the world clock',
    clockHelp:
      'The campaign’s date, shared by its maps and trips: it moves on as they travel, or by hand. Unticked, it can be started later in **World**.\n• The day it starts is a day of the system’s calendar',
    start: 'It starts on',
    factions: 'Bring its factions ({count})',
    factionsHelp:
      'The powers the system declares (`kind: factions`): their sheets come now, and the land each starts with comes with each map that joins the campaign. Unticked, they can be brought later in **Factions**.',
    without: 'Just rolling, or keeping characters? Open',
    create: 'Create',
  },
  campaign: {
    name: 'Name',
    nameHelp:
      'What you call it; it names the campaign in every app (the Hexmapper’s **Map settings → Campaign**, Travel’s trip room, the Oracle).',
    system: vocabulary.en.terms.system,
    systemHelp:
      'The game system its maps and trips are played with: its calendar, its progress clocks, its weather and factions. It is chosen in a map’s settings (or when a trip in it starts), since it is theirs too.',
    noSystem: 'The default one (Core’s)',
    editSystem: 'Edit the system in Systems →',
    notes: 'Notes',
    notesHelp:
      'Its page in your notes app (a path such as `Campaigns/The long winter`); **↗** opens it. The notes app is chosen in **Preferences**. Its story and lore live there: a campaign keeps only what the rules play with.',
    playing: 'A trip is going on in it: “{name}” ({app}).',
    playingHelp:
      'One trip goes on in a campaign at a time, since its time is the campaign’s. Moving time on here, that trip waits until the new date when it next steps.',
    open: 'Open',
    more: 'More',
    delete: 'Delete',
    confirmDelete:
      'Delete the campaign “{name}”? Its world clock, timeline, factions and Oracle state are forgotten. Nothing is in it.',
    cantDelete:
      'In this campaign: {list}. Move them to another campaign (or delete them) first: see **Maps** and **Trips**.',
    deleted: 'Campaign “{name}” deleted.',
    missing: 'This campaign isn’t kept in this browser.',
    noRewindTrip:
      'The clock can’t go back while a trip is going on in the campaign: a trip’s time never goes back.',
  },
  whatItDoes: campaignTexts.en.whatItDoes,
  factions: {
    intro:
      'The powers of this world: each one’s sheet, kept by the campaign, and the land it holds on each of its maps. Open one to see and change its sheet.',
    help: campaignTexts.en.factions.help,
    landOn: 'Their land on',
    landOnHelp:
      'The map of the campaign whose land you see here, and where world turns win and lose ground: **World turn** below, and the turns that come by themselves as the world clock moves on in **World**. Each map keeps its own land; the sheets are the campaign’s, the same on every map.\nBy default, the map of the trip going on, else the first. Painting land by hand is done on the map, in the Hexmapper (**Paint in the Hexmapper ↗**, then **World → Factions**).\nIf that map is open in the Hexmapper, it takes the new land at once.',
    paintIn: 'Paint in the Hexmapper ↗',
    minimap: 'The factions’ land on {map}',
    bringLand: 'Give them their starting land here',
    bringLandHelp:
      'No faction holds land on this map yet (it joined the campaign after they came): each gets the land its system says it starts with here, every hex of its starting regions by name (and its starting hexes, if this is the map they’re for). Their sheets don’t change.',
    noMaps:
      'No map is in this campaign: world turns change the factions’ sheets and the progress clocks, but no land. Add a map from the Hexmapper (**Map settings → Campaign**).',
    none: 'The campaign’s system has factions, not yet in this campaign: bring them in, each holding the land the system says it starts with on the map chosen.',
    noneNoMaps:
      'The campaign’s system has factions, not yet in this campaign: bring them in. With no map in the campaign yet, only their sheets come; a map that joins gets their land here.',
    bring: campaignTexts.en.factions.bring,
    noSystem: 'The campaign’s system declares no factions.',
    missing:
      'These factions came from “{system}”, a system not loaded in this browser: their sheets are kept, but can’t be shown or take turns until it is.',
    remove: 'Take the factions out of the campaign',
    confirmRemove:
      'Take the factions out of this campaign? Their sheets are forgotten, and their land on every map of it.',
  },
  tabs: {
    label: 'The campaign',
    overview: 'Overview',
    world: 'World',
    maps: 'Maps',
    trips: 'Trips',
    characters: 'Characters',
    factions: campaignTexts.en.factions.title,
    timeline: 'Timeline',
  },
  timeline: {
    none: 'The world clock isn’t running yet: start it in **World**.',
  },
  places: {
    mapsIntro:
      'The maps of the Hexmapper (its library in this browser) in this campaign: their trips and tokens play in its world. **Open ↗** opens one there.',
    tripsIntro:
      'Travel’s trips (without a map) in this campaign: their time is the campaign’s. A map’s trip plays on its map, under **Maps**.',
    new: {
      maps: 'New map in this campaign ↗',
      trips: 'New trip in this campaign ↗',
    },
    add: {
      maps: 'Add an existing map…',
      trips: 'Add an existing trip…',
    },
    addTitle: {
      maps: 'The other maps of this browser',
      trips: 'The other trips of this browser',
    },
    addHelp: {
      maps: 'A map is in one campaign at a time. **Bring it** opens it in the Hexmapper and moves it here, as its **Map settings → Campaign** does: if its campaign has a world of its own (a clock, factions), you’re asked which one stays. The campaign it leaves is deleted if nothing else is in it.',
      trips:
        'A trip is in one campaign at a time. **Bring it** opens it in Travel and moves it here, as its trip room’s **Campaign** does: if its campaign has a world of its own, you’re asked which one stays. Its time becomes this campaign’s when it next steps.',
    },
    none: {
      maps: 'No map is in this campaign yet.',
      trips: 'No trip is in this campaign yet.',
    },
    ownCampaign: 'a campaign of its own',
    bring: 'Bring it ↗',
    untitledMap: 'Untitled map',
    untitledTrip: 'Untitled trip',
    open: 'Open ↗',
    continue: 'Continue ↗',
    going: 'going on',
    goingHelp: 'The trip going on in the campaign now (one at a time).',
  },
  cast: {
    intro:
      'The characters of your roster (the Characters app) playing in this campaign: in its trips’ parties, among those present, on its maps’ tokens, or in it without a trip (a quick game: **In a campaign** on its page in Characters; a new trip of the campaign offers its party). Each is in one place at a time.',
    none: 'No character of the roster plays in this campaign yet.',
    onTrip: 'in “{place}”',
    onToken: 'a token on “{place}”',
    noTrip: 'without a trip',
    roster: 'Open the roster ↗',
  },
  overview: {
    today: 'Today',
    going: 'Going on',
    goingHelp:
      'The trip going on in the campaign: one at a time, since its time is the campaign’s. **Continue ↗** opens it where it’s played.',
    nothingGoing: 'No trip is going on.',
    next: 'Coming next',
    clocks: 'Progress clocks',
    latest: 'Lately',
    maps: 'Maps: {count}',
    trips: 'Trips: {count}',
    cast: 'Characters: {count}',
    factions: 'Factions: {count}',
  },
  storage: {
    full: 'The browser’s storage is full: packs and campaigns may not be saved.',
  },
}

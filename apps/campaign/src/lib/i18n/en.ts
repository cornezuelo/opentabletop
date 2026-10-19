import { campaignTexts } from '@open-tabletop/campaign-ui'
import { vocabulary } from '@open-tabletop/ui-kit'

// Source of truth for UI strings (English is the default locale). `es.ts` mirrors this shape.
export const en = {
  app: {
    title: 'Campaign',
    tagline: 'What is going on in your world.',
  },
  nav: {
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
    untitled: 'Untitled campaign',
    makeSystems: 'Make or edit systems →',
  },
  welcome: {
    title: 'Campaign',
    body: 'A campaign is the world your maps and trips share: one date and calendar, the events and progress clocks to come, what happened (its timeline), the factions and the Oracle’s decks. Every map of the Hexmapper and every trip of Travel is in one; a new map or trip starts a campaign of its own, and joins another from its settings.\n\nChoose a campaign on the left, or make one with **New campaign** and add maps and trips to it.',
  },
  new: {
    title: 'New campaign',
    name: 'Name',
    namePlaceholder: 'The long winter',
    system: vocabulary.en.terms.system,
    systemHelp:
      'The game system its maps and trips are played with: its calendar names the days, and its progress clocks, weather and factions are the campaign’s. A map or trip that joins the campaign plays with it.',
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
    delete: 'Delete',
    confirmDelete:
      'Delete the campaign “{name}”? Its world clock, timeline, factions and Oracle state are forgotten. Nothing is in it.',
    cantDelete:
      'Maps or trips are in this campaign: move them to another one (or delete them) first.',
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
    territory: campaignTexts.en.factions.territory,
    territoryOne: campaignTexts.en.factions.territoryOne,
    turn: campaignTexts.en.factions.turn,
    turnHelp: campaignTexts.en.factions.turnHelp,
    auto: campaignTexts.en.factions.auto,
    autoHelp: campaignTexts.en.factions.autoHelp,
    remove: 'Take the factions out of the campaign',
    confirmRemove:
      'Take the factions out of this campaign? Their sheets are forgotten, and their land on every map of it.',
  },
  tabs: {
    label: 'The campaign',
    world: 'World',
    factions: campaignTexts.en.factions.title,
    timeline: 'Timeline',
    places: 'Maps and trips',
  },
  world: {
    help: 'The campaign’s clock: today’s date, events you schedule (a festival, an attack, a deadline), progress clocks and the world’s weather. It is the same clock in every map and trip of the campaign: moving it here moves it there.',
  },
  timeline: {
    none: 'The world clock isn’t running yet: start it in **World**.',
  },
  places: {
    maps: 'Maps',
    mapsHelp:
      'The maps of the Hexmapper (its library in this browser) that are in this campaign. A map joins another campaign in its **Map settings → Campaign**.',
    trips: 'Trips',
    tripsHelp:
      'Travel’s trips (without a map) in this campaign. A trip joins another campaign in its trip room (**Campaign**). A map’s trip plays on its map.',
    noMaps: 'No maps.',
    noTrips: 'No trips.',
    untitledMap: 'Untitled map',
    untitledTrip: 'Untitled trip',
    open: 'Open ↗',
    going: 'going on',
    goingHelp: 'The trip going on in the campaign now (one at a time).',
    howTo:
      'To add a map, open it in the Hexmapper and choose this campaign in **Map settings → Campaign**; to add a trip, choose it in Travel’s trip room.',
    newMap: 'Open the Hexmapper ↗',
    newTrip: 'Open Travel ↗',
  },
  storage: {
    full: 'The browser’s storage is full: packs and campaigns may not be saved.',
  },
}

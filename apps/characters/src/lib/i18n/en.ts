// Source of truth for UI strings (English is the default locale). `es.ts` mirrors this shape.
import { vocabulary } from '@open-tabletop/ui-kit'
export const en = {
  app: {
    title: 'Characters',
    tagline: 'Your characters, of any system.',
  },
  nav: {
    showSidebar: 'Show the lists',
    hideSidebar: 'Hide the lists (more room)',
    showHelp: 'Show the help',
    hideHelp: 'Hide the help (more room)',
    help: 'Help and manual',
    characters: 'Characters',
    search: 'Search…',
    newCharacter: 'New character',
    import: 'Import…',
    importTip: 'Adds the characters of an .otd.json file: one exported here, or a map’s party.',
    otherSheets: 'Other sheets',
    empty: 'No characters yet.',
    noMatch: 'No character matches.',
    makeSystems: 'Make or edit systems →',
    bestiary: 'Bestiary',
    lists: 'Characters or templates',
    newTemplate: 'New template ↗',
    noTemplates: 'No system has a bestiary.',
    tags: 'Filter by tag',
    clearTags: 'Show all, whatever their tags',
    campaign: 'Campaign',
    campaignHelp:
      'Which characters the list shows, by where they play:\n• the campaign you’re playing (**Playing** at the top, the default) — those in its trips and on its maps’ tokens\n• **All campaigns** — the whole roster\n• **No campaign** — those playing nowhere',
    allCampaigns: 'All campaigns',
    noCampaign: 'No campaign',
    noneInCampaign: 'No character plays in it: choose “All campaigns” to see the whole roster.',
  },
  welcome: {
    title: 'Characters',
    body: 'Your roster: the characters this browser keeps, of any system. Make one with **New character**, or keep one from a trip (**Keep in the roster** on its card in Travel or the Hexmapper). A character of the roster can travel on any map or trip played with its system, one at a time, and what happens to it there comes back here. Each one is made with its system’s characters’ sheet, edited in the Systems app.',
  },
  bestiary: {
    title: 'Bestiary',
    help: 'The creatures and kinds of people a system can make, as **templates**: each a character of a sheet whose rolls (`{{2d4}}`) are made again for every copy. **Make a character** puts one in the roster, named by the template’s generator if it has one (a recurring NPC); **Make copies** puts several (a fight at the table). Tables and effects make them in a trip (`present.<id>: 3`). Templates are shown here as they are, and edited in the Systems app (**Edit in Systems ↗**): what you change there affects only the copies made afterwards.',
    inRoster: 'In the roster',
    inRosterHelp:
      'Characters made from this template, kept in the roster like any other: each with its own rolls (its values rolled again for each), its tags and what it carries, and remembering the template it came from (**Made from**).\n• **Make a character** — one, named by the template’s **Names from** if it has one (Hrolf, a bandit who comes back), and opened to edit\n• **Make copies** — that many at once (four wolves for tonight’s fight), named the same way or numbered (_Grey wolf 1_, _2_…)\nHow many are in the roster shows below, with **Delete them all** to clear them away when the encounter is over.',
    makeOne: 'Make a character',
    or: 'or',
    makeMany: 'Make copies',
    copies: '{count} made from it in the roster.',
    clear: 'Delete them all',
    confirmClear: 'Delete the {count} characters made from “{name}” from the roster?',
    confirmClearPlaying:
      'Delete the {count} characters made from “{name}” from the roster? {playing} of them play somewhere: their trips or tokens keep their own copy, no longer linked.',
    cleared: 'Deleted {count} × {name} from the roster.',
    count: 'How many',
    made: 'Made {count} × {name}.',
    cantMake: 'These copies can’t be made: the template has no sheet.',
    edit: 'Edit in Systems ↗',
    editHelp:
      'Templates are part of their system, like its sheets, so they are edited in the Systems app, at its **Bestiary** tab: this link opens it at this template. Copies already made don’t change with it: each is a character of the roster, edited here like any other.\n• A bundled system is read-only there: **Edit a copy** first',
    none: 'No system has a bestiary yet. Make one in the Systems app (its **Bestiary** tab): **New template ↗** takes you there.',
    intro:
      'The creatures and kinds of people your systems can make, as **templates**: each a character of a sheet whose rolls (`{{2d4}}`) are made again for every copy. Pick one in **Bestiary** on the left, by system and sheet; search it, or filter it by its tags. From a template you make copies in the roster, and tables and effects make them in a trip (`present.<id>: 3`).',
    notFound:
      'This template isn’t in any loaded bestiary: its pack may have been removed, or the template deleted.',
    noSheet: 'Its sheet isn’t found, so it can’t be shown.',
  },
  new: {
    title: 'New character',
    system: 'System',
    systemHelp:
      'The system whose characters’ sheet it’s made with: it decides its values, tracks and conditions, and the trips it can join (those played with a system that has the same sheet). Only systems with a characters’ sheet are listed.',
    name: 'Name',
    namePlaceholder: 'Old Tobin',
    sheet: 'Sheet',
    sheetHelp:
      'What to make: a character, with the sheet of its system’s characters, or a **party**, with its party sheet (what belongs to the whole party: morale, provisions…). A party has **members**, characters of the roster you choose after making it; taken on a trip, they go with it.',
    aParty: 'a party',
    create: 'Create',
    noSystems: 'No system has a characters’ sheet yet: make one in Systems (its **Sheet** tab).',
  },
  character: {
    sheet: 'Sheet',
    sheetHelp:
      'The sheet it’s made with (`pack/id`): its values, tracks, conditions and kinds of relation. A sheet belongs to its system, and is edited in the Systems app.',
    editSheet: 'Edit the sheet in Systems →',
    madeFrom: 'Made from',
    madeFromHelp:
      'The template of a bestiary it was copied from: its numbers were rolled when it was made, and it’s a character like any other from then on. Changing the template later doesn’t change it.',
    openTemplate: 'Open in the Bestiary',
    missingSheet:
      'Its sheet ({sheet}) isn’t loaded: its values are shown as they are, and can’t be changed until its pack is back.',
    id: 'Id',
    idHelp:
      'How rules and tables reach it once it travels: `characters.{id}.values.health`, and relations to it: `character:{id}`. It comes from the name it was made with, and doesn’t change.',
    notes: 'Notes',
    notesHelp:
      'Its page in your notes app (its path): its story, its looks, what it knows. ↗ opens it; the app is chosen in Preferences (⚙).',
    notesPlaceholder: 'People/{name}',
    where: 'Where it plays',
    whereHelp:
      'A character travels in one place at a time: a map’s trip in the Hexmapper, a trip in Travel, or a token on a map. What happens to it there is written back here after every step; what you change here, the trip finds when it next opens. The campaign that place is in shows beside it, with a link to it in the Campaign app.',
    nowhere:
      'Only in the roster. To take it on a trip, choose it under **From the roster** in the trip’s **Party** tab: with the party, or in **Here** among those present (a creature, an NPC met on the way); or give it to a token on a map (its **Sheet**).',
    playsIn: '{place}, in {app}',
    playsAsToken: 'a token on {place}, in {app}',
    inCampaign: 'in the campaign {campaign}',
    untitledCampaign: 'an untitled campaign',
    openCampaign: vocabulary.en.campaign.open,
    open: 'Open',
    duplicate: 'Duplicate',
    duplicateTip: 'A copy with its values, in the roster only.',
    copyName: '{name} (copy)',
    export: 'Export',
    exportTip: 'Downloads it as an .otd.json file, to keep or give someone.',
    exportAll: 'Export all',
    delete: 'Delete',
    confirmDelete: 'Delete {name} from the roster?',
    confirmDeletePlaying:
      'Delete {name} from the roster? It plays in {place}: that trip keeps its copy, no longer linked to the roster.',
    deleted: '{name} deleted.',
    notFound: 'This character isn’t in the roster (deleted, or in another browser).',
  },
  party: {
    members: 'Members',
    membersHelp:
      'The roster characters in this party, in order. Taken on a trip (the trip’s **Party** tab, **From the roster** under **The party**), they go with it, and its sheet is the trip’s party. A character is in one party at a time.\nWhile the party plays somewhere, that trip keeps the list: its linked characters are its members.',
    none: 'No members yet.',
    nowhere:
      'Only in the roster. To take it on a trip, choose it under **From the roster** on **The party**’s card, in the trip’s **Party** tab: its members come with it.',
    add: 'Add a member',
    remove: 'Take out of the party',
    playingNote: 'It plays in {place}: its members are that trip’s characters, changed there.',
    moveConfirm: '{name} is in {party}. Move them to this party?',
    inParty: 'Party',
    inPartyHelp:
      'The party this character is in: taken on a trip with it. A character is in one party at a time.',
    duplicateTip:
      'A copy with its values and items, in the roster only, without members (a character is in one party at a time).',
    split: 'Split the party',
    splitTip: 'Some members go their own way, as a new party.',
    splitTitle: 'Split {name}',
    splitHelp:
      'Tick who goes. The new party starts as any new party of its sheet (its starting values, nothing else), and this one keeps everything: nothing is made out of nothing. Say what each side has of each value and item; **=** gives the new one the same as this one, **½** half each.',
    newName: 'Name of the new party',
    newNameValue: '{name} (2)',
    who: 'Who goes',
    value: 'Value',
    stays: 'Stays',
    goes: 'Goes',
    same: 'The same as this one',
    half: 'Half each',
    items: 'Items',
    itemGoes: 'How many go',
    cancel: 'Cancel',
    doSplit: 'Split',
    splitDone: '{name} goes its own way.',
  },
  imported: {
    some: 'Imported: {names}.',
    none: 'That file has no characters made with a sheet.',
    broken: 'That file can’t be read as OTD (.otd.json).',
  },
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

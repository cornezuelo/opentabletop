// Source of truth for UI strings (English is the default locale). `es.ts` mirrors this shape.
export const en = {
  app: {
    title: 'Characters',
    tagline: 'Your characters, of any system.',
  },
  nav: {
    showSidebar: 'Show the characters list',
    hideSidebar: 'Hide the characters list (more room)',
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
  },
  welcome: {
    title: 'Characters',
    body: 'Your roster: the characters this browser keeps, of any system. Make one with **New character**, or keep one from a trip (**Keep in the roster** on its card in Travel or the Hexmapper). A character of the roster can travel on any map or trip played with its system, one at a time, and what happens to it there comes back here. Each one is made with its system’s characters’ sheet, edited in the Systems app.',
  },
  new: {
    title: 'New character',
    system: 'System',
    systemHelp:
      'The system whose characters’ sheet it’s made with: it decides its values, tracks and conditions, and the trips it can join (those played with a system that has the same sheet). Only systems with a characters’ sheet are listed.',
    name: 'Name',
    namePlaceholder: 'Old Tobin',
    create: 'Create',
    noSystems: 'No system has a characters’ sheet yet: make one in Systems (its **Sheet** tab).',
  },
  character: {
    sheet: 'Sheet',
    sheetHelp:
      'The sheet it’s made with (`pack/id`): its values, tracks, conditions and kinds of relation. A sheet belongs to its system, and is edited in the Systems app.',
    editSheet: 'Edit the sheet in Systems →',
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
      'A character travels in one place at a time: a map’s trip in the Hexmapper, a trip in Travel, or a token on a map. What happens to it there is written back here after every step; what you change here, the trip finds when it next opens.',
    nowhere:
      'Only in the roster. To take it on a trip, open the trip’s **Party** tab and choose it under **From the roster**.',
    playsIn: '{place}, in {app}',
    playsAsToken: 'a token on {place}, in {app}',
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
  imported: {
    some: 'Imported: {names}.',
    none: 'That file has no characters made with a sheet.',
    broken: 'That file can’t be read as OTD (.otd.json).',
  },
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

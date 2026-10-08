import { vocabulary } from '@open-tabletop/ui-kit'
// Source of truth for UI strings (English is the default locale). `es.ts` mirrors this shape.
export const en = {
  app: {
    title: 'Travel',
    tagline: 'Play trips without a map.',
  },
  nav: {
    showSidebar: 'Show the systems list',
    hideSidebar: 'Hide the systems list (more room)',
    showHelp: 'Show the help',
    hideHelp: 'Hide the help (more room)',
    systems: 'Systems',
    generic: vocabulary.en.terms.genericSystem,
    help: 'Help and manual',
    builtIn: 'built in',
    editInSystems: 'Edit in Systems →',
    makeSystems: 'Make or edit systems →',
  },
  origin: {
    bundled: 'bundled',
    edited: 'edited',
    personal: 'personal use',
    user: 'yours',
  },
  welcome: {
    title: 'Travel',
    body: 'Pick a system on the left to play a trip with it. Trips here have no map: you describe the way hex by hex, and the system decides how fast you go over each terrain and road, what you carry, and which checks are rolled on the way. Systems are made and edited in the Systems app; to travel on a map, use the Hexmapper (Play mode) with the same systems.',
  },
  trips: {
    title: 'Trip',
    help: 'Your trips are kept in this browser, each with its system, its way and its journal. Pick one to go on with it.',
    name: 'Name',
    unnamed: '{system}, day {day}',
    new: 'Another trip',
    delete: 'Delete',
    deleteConfirm: 'Delete the trip “{trip}” and its journal?',
  },
  play: {
    current: 'The open trip uses {system}.',
    switch: 'Start a trip with {system}',
    switchConfirm: 'Start this trip again with {system}? Its journal is discarded.',
    way: 'The way',
    wayHelp:
      'A trip without a map: list the hexes ahead, each with its terrain and tags and whether a road or river joins it to the next. The party heads for the last one.\n• `plains`, then `forest` with tags `haunted`, then `hills` by `road`\nAdd more hexes at the end to keep going.',
    hexKm: 'km per hex',
    hex: 'Hex {n}',
    here: 'here',
    terrain: vocabulary.en.terms.terrain,
    tags: vocabulary.en.terms.tags,
    tagsPlaceholder: 'landmark, haunted…',
    edges: 'To the next hex',
    numberHelp:
      "The hexes in order: the party starts at 1 and heads for the last one. Hexes already passed can't be changed; add more at the end to keep going.",
    terrainHelp:
      "How fast the hex is crossed (the system's speed for that terrain, and whether it can be crossed at all) and what tables see as terrain:\n• `forest` — half speed in most systems; `terrain: forest` in a condition\n• `lake` — water: only a boat, unless frozen",
    tagsHelp:
      'Words that mark the hex, separated by commas, for the checks and tables that look for them:\n• `landmark` — `tags: landmark` in a condition\n• `shrine, haunted`\nThe suggestions are the tags the loaded packs use; what each one does depends on the system (see its page in the manual).',
    edgesHelp:
      'Whether a road, trail or river joins this hex to the next one. What that does depends on the system:\n• roads are often faster (`road` × `1.5`)\n• a system may skip some checks on them (**Skip if** `edges: road`)',
    addHex: 'Add a hex',
    remove: 'Remove',
    destinationHint: 'Add hexes to the way to set off.',
    arrivedHint: 'Add more hexes to keep going.',
  },
  terrains: vocabulary.en.terrains,
  edgeKinds: vocabulary.en.pathKinds,
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

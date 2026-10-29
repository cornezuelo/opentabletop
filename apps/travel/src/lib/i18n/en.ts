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
    help: 'Help and manual',
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
  inCampaign: { missing: 'The trip {id} isn’t in this browser.' },
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

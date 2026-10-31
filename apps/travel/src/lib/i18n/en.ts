// Source of truth for UI strings (English is the default locale). `es.ts` mirrors this shape.
import { vocabulary } from '@open-tabletop/ui-kit'

export const en = {
  app: {
    title: vocabulary.en.apps.travel,
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
    title: vocabulary.en.apps.travel,
    body: 'Pick a system on the left to play a trip with it. Trips here have no map: you describe the way cell by cell, and the system decides how fast you go over each terrain and road, what you carry, and which checks are rolled on the way. Systems are made and edited in the Systems app; to travel on a map, use Map (Play mode) with the same systems.',
  },
  inCampaign: { missing: 'The trip {id} isn’t in this browser.' },
  storage: { full: 'Browser storage is full: export your packs to keep them safe.' },
} as const

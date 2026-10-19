import { TRAVEL_TRIPS_KEY, TripStore } from '@open-tabletop/travel-ui'
import { getLocale } from './i18n'
import { library, systems } from './packs.svelte'

/** Every trip of this browser, and which one is open. */
export const trip = new TripStore({
  key: TRAVEL_TRIPS_KEY,
  // Before several trips: the only one.
  oldKey: 'opentabletop.travel.trip',
  systems: () => systems.list,
  oracle: () => library.engine,
  locale: getLocale,
  // Its trips take characters from the roster (the Characters app) and keep them in step.
  rosterApp: 'travel',
  // …and play in campaigns: their world clock, factions and Oracle, one trip at a time.
  campaignApp: 'travel',
})

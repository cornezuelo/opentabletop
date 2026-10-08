import { TripStore } from '@open-tabletop/travel-ui'
import { getLocale } from './i18n'
import { library, systems } from './packs.svelte'

/** Every trip of this browser, and which one is open. */
export const trip = new TripStore({
  key: 'opentabletop.travel.trips',
  // Before several trips: the only one.
  oldKey: 'opentabletop.travel.trip',
  systems: () => systems.list,
  oracle: () => library.engine,
  locale: getLocale,
})

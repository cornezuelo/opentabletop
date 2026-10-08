import { TripStore } from '@open-tabletop/travel-ui'
import { getLocale } from './i18n'
import { library, systems } from './packs.svelte'

/**
 * Trips to try systems while making them (the Try it tab), kept apart from the Travel
 * app's: they play each system's rules as they are at every step.
 */
export const trial = new TripStore({
  key: 'opentabletop.systems.trips',
  systems: () => systems.list,
  oracle: () => library.engine,
  locale: getLocale,
})

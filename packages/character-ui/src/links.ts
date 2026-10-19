import type { RosterPlace } from '@open-tabletop/session'
import { appUrl, type AppId } from '@open-tabletop/ui-kit'

/** A roster character in the Characters app (the trip panel's **Open in Characters**). */
export const characterUrl = (id: string): string =>
  `${appUrl('characters')}#/character/${encodeURIComponent(id)}`

/** Where a roster character plays: the Hexmapper's map, or Travel's trip. */
export function placeUrl(place: RosterPlace): string | undefined {
  if (place.app === 'hexmapper') return `${appUrl('hexmapper')}#/${encodeURIComponent(place.id)}`
  if (place.app === 'travel') return `${appUrl('travel')}#/trip/${encodeURIComponent(place.id)}`
  return undefined
}

/** The app a place is in, by its id, when it's one of ours. */
export const placeApp = (place: RosterPlace): AppId | undefined =>
  place.app === 'hexmapper' || place.app === 'travel' ? place.app : undefined

import { withMapSheet, type SessionState, type TravelSystem } from '@open-tabletop/session'
import type { Campaign, CampaignTrip } from './types'

/**
 * One trip at a time in a campaign, so its world has one time: the trip that played last
 * is `playing`, and another one that would play asks to take its place (the host asks).
 */

const same = (a: CampaignTrip, b: CampaignTrip) => a.app === b.app && a.id === b.id

/** The other trip that played in the campaign last, if it isn't `trip`. */
export function otherTrip(campaign: Campaign, trip: CampaignTrip): CampaignTrip | undefined {
  const playing = campaign.playing
  return playing && !same(playing, trip) ? playing : undefined
}

/** The campaign with `trip` as the one going on (unchanged if it already is, by that name). */
export function playTrip(campaign: Campaign, trip: CampaignTrip): Campaign {
  const playing = campaign.playing
  if (playing && same(playing, trip) && playing.name === trip.name) return campaign
  return { ...campaign, playing: trip }
}

/** The campaign without `trip` going on (it was deleted, or left the campaign). */
export function leaveTrip(campaign: Campaign, trip: Pick<CampaignTrip, 'app' | 'id'>): Campaign {
  const playing = campaign.playing
  if (!playing || playing.app !== trip.app || playing.id !== trip.id) return campaign
  const rest = { ...campaign }
  delete rest.playing
  // What the world had waiting for it is nobody's now.
  delete rest.moments
  return rest
}

/**
 * A trip on a map of the campaign, with that map's own sheet (its system's `mapSheet`): the
 * one the campaign keeps for it, else a new one for that map; and its places' sheets.
 */
export function tripOnMap(
  campaign: Campaign,
  session: SessionState,
  system: TravelSystem,
  map: string,
): SessionState {
  return withMapSheet(session, system, map, campaign.mapSheets?.[map], campaign.placeSheets?.[map])
}

/**
 * The campaign keeping a trip's map sheet and its places' sheets as the trip left them
 * (unchanged without them).
 */
export function keepMapSheet(
  campaign: Campaign,
  trip: Pick<SessionState, 'map' | 'placeSheets'>,
): Campaign {
  let out = campaign
  const sheet = trip.map
  if (sheet && out.mapSheets?.[sheet.id] !== sheet)
    out = { ...out, mapSheets: { ...out.mapSheets, [sheet.id]: sheet } }
  const places = trip.placeSheets
  if (places && out.placeSheets?.[places.map] !== places.sheets)
    out = { ...out, placeSheets: { ...out.placeSheets, [places.map]: places.sheets } }
  return out
}

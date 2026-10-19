import { allLibraryMaps } from '@open-tabletop/storage'
import { readTrips } from './trips.svelte'

/** Where Travel keeps its trips (every app reads them there to know who's in a campaign). */
export const TRAVEL_TRIPS_KEY = 'opentabletop.travel.trips'

/** A map or a trip in a campaign: the app it's played in, its id there and its name. */
export interface CampaignPlace {
  app: 'hexmapper' | 'travel'
  id: string
  name: string
}

/** The campaign a stored map names, without reading the whole map. */
function campaignOfMap(json: string): { campaign: string; name: string } | null {
  try {
    const meta = (
      JSON.parse(json) as { meta?: { id?: unknown; name?: unknown; campaign?: unknown } }
    ).meta
    // A map saved before campaigns is in one of its own, with its id.
    const campaign = typeof meta?.campaign === 'string' ? meta.campaign : meta?.id
    if (typeof campaign !== 'string') return null
    return { campaign, name: typeof meta?.name === 'string' ? meta.name : '' }
  } catch {
    return null
  }
}

/**
 * The maps of the library and Travel's trips that are in a campaign (a campaign doesn't
 * list them: each names its own). Whatever can't be read counts as in none.
 */
export async function campaignPlaces(campaign: string): Promise<CampaignPlace[]> {
  const places: CampaignPlace[] = []
  for (const entry of await allLibraryMaps().catch(() => [])) {
    const map = campaignOfMap(entry.json)
    if (map?.campaign === campaign) places.push({ app: 'hexmapper', id: entry.id, name: map.name })
  }
  let stored: string | null = null
  try {
    stored = localStorage.getItem(TRAVEL_TRIPS_KEY)
  } catch {
    // No trips to read.
  }
  if (stored)
    for (const trip of readTrips(TRAVEL_TRIPS_KEY, undefined, { getItem: () => stored }).trips)
      if (trip.campaign === campaign) places.push({ app: 'travel', id: trip.id, name: trip.name })
  return places
}

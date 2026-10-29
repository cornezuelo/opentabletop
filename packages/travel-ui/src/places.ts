import { allLibraryMaps, getCampaign, getLibraryMap } from '@open-tabletop/storage'
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

/** A map of the library or a trip of Travel, with the campaign it's in. */
export interface PlaceInCampaign extends CampaignPlace {
  campaign: string
}

/**
 * Every map of the library and trip of Travel, each with the campaign it's in (a campaign
 * doesn't list them: each names its own). Whatever can't be read is left out.
 */
export async function allPlaces(): Promise<PlaceInCampaign[]> {
  const places: PlaceInCampaign[] = []
  for (const entry of await allLibraryMaps().catch(() => [])) {
    const map = campaignOfMap(entry.json)
    if (map) places.push({ app: 'hexmapper', id: entry.id, name: map.name, campaign: map.campaign })
  }
  let stored: string | null = null
  try {
    stored = localStorage.getItem(TRAVEL_TRIPS_KEY)
  } catch {
    // No trips to read.
  }
  if (stored)
    for (const trip of readTrips(TRAVEL_TRIPS_KEY, undefined, { getItem: () => stored }).trips)
      places.push({ app: 'travel', id: trip.id, name: trip.name, campaign: trip.campaign })
  return places
}

/** The maps of the library and Travel's trips that are in a campaign. */
export async function campaignPlaces(campaign: string): Promise<CampaignPlace[]> {
  return (await allPlaces())
    .filter((p) => p.campaign === campaign)
    .map(({ app, id, name }) => ({ app, id, name }))
}

/**
 * The campaign a map of the library or a Travel trip is in, with its name (empty if it has
 * none), to say where something plays; none if it can't be read.
 */
export async function placeCampaign(place: {
  app: string
  id: string
}): Promise<{ id: string; name: string } | undefined> {
  let id: string | undefined
  if (place.app === 'hexmapper') {
    const entry = await getLibraryMap(place.id).catch(() => null)
    id = entry ? campaignOfMap(entry.json)?.campaign : undefined
  } else if (place.app === 'travel') {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(TRAVEL_TRIPS_KEY)
    } catch {
      // No trips to read.
    }
    if (stored)
      id = readTrips(TRAVEL_TRIPS_KEY, undefined, { getItem: () => stored }).trips.find(
        (trip) => trip.id === place.id,
      )?.campaign
  }
  if (!id) return undefined
  const campaign = await getCampaign(id).catch(() => null)
  return { id, name: campaign?.name ?? '' }
}

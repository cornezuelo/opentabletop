import { roster } from '@open-tabletop/character-ui'
import { leavePlaces } from '@open-tabletop/session'
import {
  allLibraryMaps,
  deleteLibraryMap,
  getCampaign,
  getLibraryMap,
} from '@open-tabletop/storage'
import { readTrips } from './trips.svelte'

/** Where Travel keeps its trips (every app reads them there to know who's in a campaign). */
export const TRAVEL_TRIPS_KEY = 'opentabletop.travel.trips'

/** Where Campaign keeps its scenes (fights without a trip, docs/conflicts.md): trips too. */
export const SCENES_KEY = 'opentabletop.campaign.scenes'

/** The trips kept under a key (none if they can't be read). */
function storedTrips(key: string) {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(key)
  } catch {
    // No trips to read.
  }
  return stored ? readTrips(key, undefined, { getItem: () => stored }).trips : []
}

/** A map, a trip or a scene in a campaign: the app it's played in, its id there and its name. */
export interface CampaignPlace {
  app: 'map' | 'travel' | 'scene'
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

/** A map of the library, a trip of Travel or a scene of Campaign, with the campaign it's in. */
export interface PlaceInCampaign extends CampaignPlace {
  campaign: string
}

/**
 * Every map of the library, trip of Travel and scene of Campaign, each with the campaign it's in (a campaign
 * doesn't list them: each names its own). Whatever can't be read is left out.
 */
export async function allPlaces(): Promise<PlaceInCampaign[]> {
  const places: PlaceInCampaign[] = []
  for (const entry of await allLibraryMaps().catch(() => [])) {
    const map = campaignOfMap(entry.json)
    if (map) places.push({ app: 'map', id: entry.id, name: map.name, campaign: map.campaign })
  }
  for (const trip of storedTrips(TRAVEL_TRIPS_KEY))
    places.push({ app: 'travel', id: trip.id, name: trip.name, campaign: trip.campaign })
  // Scenes: only those that played (a blank one left in the store is nobody's).
  for (const scene of storedTrips(SCENES_KEY))
    if (scene.session)
      places.push({ app: 'scene', id: scene.id, name: scene.name, campaign: scene.campaign })
  return places
}

/** The maps of the library, Travel's trips and Campaign's scenes that are in a campaign. */
export async function campaignPlaces(campaign: string): Promise<CampaignPlace[]> {
  return (await allPlaces())
    .filter((p) => p.campaign === campaign)
    .map(({ app, id, name }) => ({ app, id, name }))
}

/**
 * The campaign a map of the library, a Travel trip or a scene is in, with its name (empty if it has
 * none), to say where something plays; none if it can't be read.
 */
export async function placeCampaign(place: {
  app: string
  id: string
}): Promise<{ id: string; name: string } | undefined> {
  let id: string | undefined
  if (place.app === 'campaign') id = place.id
  else if (place.app === 'map') {
    const entry = await getLibraryMap(place.id).catch(() => null)
    id = entry ? campaignOfMap(entry.json)?.campaign : undefined
  } else if (place.app === 'travel' || place.app === 'scene')
    id = storedTrips(place.app === 'travel' ? TRAVEL_TRIPS_KEY : SCENES_KEY).find(
      (trip) => trip.id === place.id,
    )?.campaign
  if (!id) return undefined
  const campaign = await getCampaign(id).catch(() => null)
  return { id, name: campaign?.name ?? '' }
}

/** Leaves these trips out of those kept under a key (as Travel and Campaign keep them). */
function dropTrips(key: string, ids: Set<string>): void {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null') as {
      current?: string
      trips?: { id?: unknown }[]
    } | null
    if (!raw || !Array.isArray(raw.trips)) return
    const trips = raw.trips.filter((t) => !ids.has(String(t.id)))
    if (trips.length === raw.trips.length) return
    const current = trips.some((t) => t.id === raw.current) ? raw.current : trips.at(-1)?.id
    localStorage.setItem(key, JSON.stringify({ ...raw, current, trips }))
  } catch {
    // Not kept: nothing to drop.
  }
}

/**
 * Deletes everything in a campaign (its maps of the library, Travel's trips and Campaign's
 * scenes in it); the roster's characters that played in them, or in the campaign without a
 * trip, stay in the roster, playing nowhere. The campaign itself is the caller's to delete,
 * and a host keeping trips open (Campaign's scenes) forgets those of its own. What was
 * deleted is returned.
 */
export async function deleteAllIn(campaign: string): Promise<CampaignPlace[]> {
  const places = await campaignPlaces(campaign)
  for (const place of places) if (place.app === 'map') await deleteLibraryMap(place.id)
  const ids = (app: CampaignPlace['app']) =>
    new Set(places.filter((p) => p.app === app).map((p) => p.id))
  dropTrips(TRAVEL_TRIPS_KEY, ids('travel'))
  dropTrips(SCENES_KEY, ids('scene'))
  roster.set(leavePlaces(roster.roster, [...places, { app: 'campaign', id: campaign }]))
  return places
}

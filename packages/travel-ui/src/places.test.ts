import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCampaign, serializeCampaign } from '@open-tabletop/campaign'
import type { LibraryEntry } from '@open-tabletop/storage'

/**
 * Where a campaign plays in Map or Travel when the bar's **Playing ▾** chooses it: its trip
 * going on, if that app plays it, else its newest map or trip there.
 */

// The map library and the campaigns, in memory here (IndexedDB in a browser).
const maps: LibraryEntry[] = []
const campaigns = new Map<string, LibraryEntry>()
vi.mock('@open-tabletop/storage', async (original) => ({
  ...(await original<typeof import('@open-tabletop/storage')>()),
  allLibraryMaps: async () => maps,
  getCampaign: async (id: string) => campaigns.get(id) ?? null,
}))

const { placeToPlay, TRAVEL_TRIPS_KEY } = await import('./places')

const map = (id: string, campaign: string, modified: string): LibraryEntry => ({
  id,
  name: id,
  modified,
  json: JSON.stringify({ meta: { id, name: id, campaign } }),
})
const trip = (id: string, campaign: string) => ({
  id,
  name: id,
  campaign,
  system: 'core',
  season: 'spring',
  cellKm: 10,
  way: [{ terrain: 'plains', tags: [], connections: [] }],
  startDay: 1,
  session: null,
})
const keep = (id: string, playing?: { app: string; id: string; name: string }) =>
  campaigns.set(id, {
    id,
    name: id,
    modified: '',
    json: serializeCampaign({ ...createCampaign(id, id), ...(playing && { playing }) }),
  })

describe('where a campaign plays', () => {
  beforeEach(() => {
    maps.length = 0
    campaigns.clear()
    localStorage.clear()
  })

  it('opens its trip going on, else its newest map or trip, else none', async () => {
    maps.push(
      map('old', 'a', '2026-01-01'),
      map('new', 'a', '2026-02-01'),
      map('b1', 'b', '2026-03-01'),
    )
    localStorage.setItem(
      TRAVEL_TRIPS_KEY,
      JSON.stringify({
        version: 1,
        current: 't1',
        trips: [trip('t1', 'a'), trip('t2', 'a'), trip('t3', 'b')],
      }),
    )
    keep('a')
    // Nothing going on: the map changed last, the trip made last.
    expect(await placeToPlay('a', 'map')).toBe('new')
    expect(await placeToPlay('a', 'travel')).toBe('t2')
    // A trip going on on its older map: that map; Travel still its newest trip.
    keep('a', { app: 'map', id: 'old', name: 'old' })
    expect(await placeToPlay('a', 'map')).toBe('old')
    expect(await placeToPlay('a', 'travel')).toBe('t2')
    keep('a', { app: 'travel', id: 't1', name: 't1' })
    expect(await placeToPlay('a', 'travel')).toBe('t1')
    // A campaign with nothing there.
    expect(await placeToPlay('c', 'map')).toBeUndefined()
    expect(await placeToPlay('c', 'travel')).toBeUndefined()
  })
})

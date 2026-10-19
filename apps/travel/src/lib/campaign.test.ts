import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryChange, LibraryEntry } from '@open-tabletop/storage'

/**
 * Travel's trips in campaigns: a trip joins a map's campaign, its days are the campaign's
 * world clock (events coming due go to its journal), its checks roll on the campaign's
 * Oracle, and one trip goes on at a time (the map's trip that played last is paused, and the
 * party waits until the campaign's clock).
 */

// Where campaigns and maps are kept: in memory here (IndexedDB in a browser).
const kept = new Map<string, LibraryEntry>()
const maps: LibraryEntry[] = []
let hear: ((change: LibraryChange) => void) | undefined
vi.mock('@open-tabletop/storage', async (original) => ({
  ...(await original<typeof import('@open-tabletop/storage')>()),
  getCampaign: async (id: string) => kept.get(id) ?? null,
  deleteCampaign: async (id: string) => void kept.delete(id),
  allLibraryMaps: async () => maps,
  putCampaign: async (entry: LibraryEntry) => void kept.set(entry.id, entry),
  listCampaigns: async () =>
    [...kept.values()].map(({ id, name, modified }) => ({ id, name, modified })),
  onCampaignChange: (listener: (change: LibraryChange) => void) => {
    hear = listener
    return () => {}
  },
}))

async function openTravel() {
  vi.resetModules()
  const campaign = await import('@open-tabletop/campaign')
  const world = await import('@open-tabletop/world-engine')
  const { dialog, toasts } = await import('@open-tabletop/ui-kit')
  const { trip } = await import('./trip.svelte')
  const { systems } = await import('./packs.svelte')
  return { campaign, world, dialog, toasts, trip, systems }
}

/** Waits for the campaign store's reads and writes to settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('trips in campaigns', () => {
  beforeEach(() => {
    localStorage.clear()
    kept.clear()
    maps.length = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
  })

  it('plays in a map’s campaign: its clock, its Oracle, one trip at a time', async () => {
    const { campaign: c, world: w, dialog, toasts, trip, systems } = await openTravel()
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!

    // A map's campaign, its world clock at 08:00 of day 10, a fair at noon, its trip last.
    const calendar = (await import('@open-tabletop/session')).calendarOf(greyMarches)
    const start = calendar.at(10, '08:00')
    const fair = calendar.at(10, '12:00')
    const clock = w.createWorld({ calendar })
    const state = clock.apply(w.initialWorld(start), {
      type: 'schedule',
      event: { name: 'The Keld fair', at: fair },
    }).state
    const frontier = {
      ...c.createCampaign('m1', 'The Frontier'),
      world: state,
      playing: { app: 'hexmapper', id: 'm1', name: 'The Frontier' },
    }
    kept.set('m1', {
      id: 'm1',
      name: 'The Frontier',
      modified: frontier.modified,
      json: c.serializeCampaign(frontier),
    })
    const map = { meta: { id: 'm1', name: 'The Frontier', campaign: 'm1' } }
    maps.push({ id: 'm1', name: 'The Frontier', modified: '', json: JSON.stringify(map) })

    // A new trip in it starts at the campaign's time, and lists it among those to join.
    // The campaign is the map's too, and plays Core's system: playing the Grey Marches in it
    // asks first, since the system is the campaign's.
    const creating = trip.create(greyMarches.id, 'spring', 'm1')
    await settle()
    expect(dialog.current?.message).toMatch(/“The Frontier”/)
    dialog.current!.resolve('ok')
    await creating
    await settle()
    expect(c.deserializeCampaign(kept.get('m1')!.json).system).toBe(greyMarches.id)
    expect(trip.saved.campaign).toBe('m1')
    expect(trip.campaign?.name).toBe('The Frontier')
    expect(trip.saved.session!.travel.time).toBe(start)
    expect((await trip.campaigns()).map((x) => x.name)).toContain('The Frontier')
    for (let i = 0; i < 4; i++) trip.addHex({ terrain: 'plains', tags: [], edges: ['road'] })
    await settle()

    // The map's trip played there last: playing this one asks to pause it.
    const stepping = trip.step({ type: 'wait', until: fair + 60 })
    await settle()
    expect(dialog.current?.message).toMatch(/“The Frontier”/)
    dialog.current!.resolve('ok')
    await stepping
    await settle()

    // The world followed the trip: the fair came due on the way, in the journal.
    const after = c.deserializeCampaign(kept.get('m1')!.json)
    expect(after.playing).toMatchObject({ app: 'travel', id: trip.saved.id })
    expect(after.world!.time).toBe(trip.saved.session!.travel.time)
    expect(after.world!.time).toBeGreaterThanOrEqual(fair + 60)
    expect(trip.saved.session!.journal.some((e) => e.code === 'WORLD_EVENT')).toBe(true)
    // Its checks roll on the campaign's Oracle, kept with it.
    expect(after.oracle).toBeDefined()

    // The map played on meanwhile (the Hexmapper wrote the campaign): a day later, its trip.
    const moved = {
      ...after,
      world: clock.apply(after.world!, { type: 'advance', minutes: 1440 }).state,
      playing: { app: 'hexmapper', id: 'm1', name: 'The Frontier' },
    }
    kept.set('m1', { ...kept.get('m1')!, json: c.serializeCampaign(moved) })
    hear?.({ type: 'put', id: 'm1', modified: moved.modified })
    await settle()
    expect(trip.campaign?.playing?.app).toBe('hexmapper')

    // Going on asks again, and the party waits until the campaign's clock first.
    const shown = toasts.length
    const going = trip.step({ type: 'wait', until: moved.world.time + 30 })
    await settle()
    dialog.current!.resolve('ok')
    await going
    await settle()
    expect(trip.saved.session!.travel.time).toBeGreaterThanOrEqual(moved.world.time + 30)
    expect(
      toasts
        .slice(shown)
        .map((x) => x.message)
        .join(' '),
    ).toMatch(/waited until then/)

    // Saying no leaves the other trip going on and this one where it was.
    kept.set('m1', {
      ...kept.get('m1')!,
      json: c.serializeCampaign({
        ...c.deserializeCampaign(kept.get('m1')!.json),
        playing: { app: 'hexmapper', id: 'm1', name: 'The Frontier' },
      }),
    })
    hear?.({ type: 'put', id: 'm1', modified: 'later' })
    await settle()
    const time = trip.saved.session!.travel.time
    const refused = trip.step({ type: 'wait', until: time + 60 })
    await settle()
    dialog.current!.resolve('cancel')
    await refused
    expect(trip.saved.session!.travel.time).toBe(time)

    // Back to a campaign of its own: its world is the map's campaign's, so it asks whether
    // it comes along; left behind, the map's campaign keeps it, without this trip going on.
    const leaving = trip.joinCampaign(trip.saved.id)
    await settle()
    expect(dialog.current?.message).toMatch(/has no world yet/)
    dialog.current!.resolve('theirs')
    expect(await leaving).toBe(true)
    await settle()
    expect(trip.saved.campaign).toBe(trip.saved.id)
    expect(trip.campaign?.id).toBe(trip.saved.id)
    expect(trip.campaign?.world).toBeUndefined()
    expect(c.deserializeCampaign(kept.get('m1')!.json).playing?.app).toBe('hexmapper')
  })

  it('joining another campaign brings its world along, or leaves it behind', async () => {
    const { campaign: c, dialog, trip, systems } = await openTravel()
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!
    const world = { time: 600, events: [], clocks: [], timeline: [], nextId: 1 }
    const other = { ...c.createCampaign('m2', 'The South'), world: { ...world, time: 9000 } }
    kept.set('m2', { id: 'm2', name: 'The South', modified: '', json: c.serializeCampaign(other) })
    // A trip in a campaign of its own, with a world clock.
    await trip.create(greyMarches.id, 'spring')
    await settle()
    const own = trip.saved.id
    expect(trip.campaign?.system).toBe(greyMarches.id)
    const mine = { ...trip.campaign!, world }
    kept.set(own, { id: own, name: '', modified: '', json: c.serializeCampaign(mine) })
    hear?.({ type: 'put', id: own, modified: 'later' })
    await settle()
    expect(trip.campaign?.world?.time).toBe(600)

    // Both have a world: cancelling stays where it was.
    let joining = trip.joinCampaign('m2')
    await settle()
    expect(dialog.current?.message).toMatch(/“The South” has a world of its own/)
    dialog.current!.resolve('cancel')
    expect(await joining).toBe(false)
    expect(trip.saved.campaign).toBe(own)

    // Bringing its own: The South's world is the trip's, system included; the campaign it
    // left is gone, since nothing else was in it.
    joining = trip.joinCampaign('m2')
    await settle()
    dialog.current!.resolve('mine')
    expect(await joining).toBe(true)
    await settle()
    const south = c.deserializeCampaign(kept.get('m2')!.json)
    expect(south).toMatchObject({ name: 'The South', system: greyMarches.id })
    expect(south.world?.time).toBe(600)
    expect(kept.has(own)).toBe(false)
    expect(trip.campaign?.id).toBe('m2')
  })
})

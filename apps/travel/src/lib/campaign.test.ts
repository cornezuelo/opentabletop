import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryChange, LibraryEntry } from '@open-tabletop/storage'

/**
 * Travel's trips in campaigns: a trip joins a map's campaign, its days are the campaign's
 * world clock (events coming due go to its journal), its checks roll on the campaign's
 * Oracle, and one trip goes on at a time (the map's trip that played last is paused, and the
 * party waits until the campaign's clock).
 */

// Where campaigns are kept: in memory here (IndexedDB in a browser).
const kept = new Map<string, LibraryEntry>()
let hear: ((change: LibraryChange) => void) | undefined
vi.mock('@open-tabletop/storage', async (original) => ({
  ...(await original<typeof import('@open-tabletop/storage')>()),
  getCampaign: async (id: string) => kept.get(id) ?? null,
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

    // A new trip in it starts at the campaign's time, and lists it among those to join.
    await trip.create(greyMarches.id, 'spring', 'm1')
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

    // Back to a campaign of its own: the map's no longer has it going on.
    await trip.joinCampaign(trip.saved.id)
    expect(trip.saved.campaign).toBe(trip.saved.id)
    expect(trip.campaign?.id).toBe(trip.saved.id)
  })
})

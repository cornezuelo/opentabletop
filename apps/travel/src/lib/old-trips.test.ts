import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Saved trips written by each release (`old-trips.gen.test.ts`, `make old-maps`): a Grey
 * Marches trip paused on a check, another camped, and one with the Generic rules. Trips
 * stored by any older version must keep opening in Travel and going on.
 */
const STORED = Object.entries(
  import.meta.glob<string>('./old-trips/*.json', { query: '?raw', import: 'default', eager: true }),
).map(([path, json]) => ({ name: path.split('/').pop()!, json }))

const KEY = 'opentabletop.travel.trips'

/** Travel as it opens in a browser that has these trips stored. */
async function openTravel(json: string) {
  localStorage.setItem(KEY, json)
  vi.resetModules()
  // Svelte and the stores loaded afresh with them, as on a page load.
  const { render } = await import('svelte/server')
  const { toasts } = await import('@open-tabletop/ui-kit')
  const { TripRoom } = await import('@open-tabletop/travel-ui')
  const { trip } = await import('./trip.svelte')
  const { systems } = await import('./packs.svelte')
  // What the system's page shows (SystemView, without the app around it).
  const text = () =>
    render(TripRoom, {
      props: {
        trip,
        system: trip.system,
        systems: systems.list,
        locale: 'en',
        tags: [],
        onsystem: () => {},
      },
    }).body.replace(/<[^>]+>/g, ' ')
  return { trip, text, toasts }
}

type Travel = Awaited<ReturnType<typeof openTravel>>

/** Resolves what waits, then the way grows by a hex and the party marches on. */
function playOn({ trip, text }: Travel) {
  const session = () => trip.saved.session!
  // The open trip's panel: its moment, and Continue on a check waiting to be resolved.
  expect(text()).toMatch(/Day \d+ · \d\d:\d\d/)
  if (session().travel.pendingChecks.length) expect(text()).toMatch(/Continue/)
  for (const c of session().travel.pendingChecks) trip.step({ type: 'resolveCheck', id: c.id })
  expect(session().travel.pendingChecks).toEqual([])
  trip.addHex()
  const start = session().travel.time
  for (let i = 0; i < 4 && !session().travel.pendingChecks.length; i++) {
    const before = session().travel.time
    trip.step({ type: 'travel', until: 'hex' })
    if (session().travel.time === before) trip.step({ type: 'wait', until: before + 18 * 60 })
  }
  expect(session().travel.time).toBeGreaterThan(start)
  expect(
    session().journal.some((e) => e.code === 'HEX_ENTERED' && (e.data?.time as number) > start),
  ).toBe(true)
  expect(text()).toMatch(/Day \d+ · \d\d:\d\d/)
}

describe('old saved trips', () => {
  beforeEach(() => void vi.spyOn(Math, 'random').mockReturnValue(0.42))

  it('there are some of every release', () => {
    const tags = STORED.map((s) => s.name.match(/^(v\d+\.\d+\.\d+)\.json$/)?.[1])
    expect(tags).toEqual(expect.arrayContaining(['v0.1.0', 'v0.4.0', 'v0.5.0']))
  })

  for (const { name, json } of STORED)
    it(name, { timeout: 60_000 }, async () => {
      const travel = await openTravel(json)
      const played = travel.trip.trips.filter((t) => t.session)
      expect(played.map((t) => t.name)).toEqual(['Pending', 'Camped', 'Generic'])
      expect(played[0].session!.travel.pendingChecks).not.toEqual([])
      for (const { id } of played) {
        travel.trip.open(id)
        playOn(travel)
      }
    })

  it('a trip whose system changed under it goes on', async () => {
    const travel = await openTravel(STORED.sort((a, b) => a.name.localeCompare(b.name)).pop()!.json)
    travel.trip.open(travel.trip.trips.find((t) => t.name === 'Pending')!.id)
    // What the stored trip names and the system no longer declares: a check waiting to be
    // resolved and a value of the party.
    travel.trip.edit((s) => ({
      ...s,
      stats: { ...s.stats, gone: 3 },
      travel: {
        ...s.travel,
        pendingChecks: s.travel.pendingChecks.map((c) => ({ ...c, event: 'GONE_CHECK_REQUIRED' })),
      },
    }))
    const shown = travel.toasts.length
    playOn(travel)
    expect(travel.toasts.length).toBe(shown)
  })
})

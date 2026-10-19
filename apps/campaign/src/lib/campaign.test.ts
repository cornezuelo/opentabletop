import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryChange, LibraryEntry } from '@open-tabletop/storage'

/**
 * The Campaign app: a campaign made here with the Grey Marches' system, its world clock
 * played without a map (the system's clocks, an event coming due, the world's own weather),
 * the clock not going back while a trip plays in it elsewhere, and a campaign deleted only
 * when nothing is in it.
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

async function openApp() {
  vi.resetModules()
  const c = await import('@open-tabletop/campaign')
  const { dialog, toasts } = await import('@open-tabletop/ui-kit')
  const app = await import('./campaign.svelte')
  const { systems } = await import('./packs.svelte')
  const { calendarOf } = await import('@open-tabletop/session')
  return { c, dialog, toasts, app, systems, calendarOf }
}

/** Waits for the campaign store's reads and writes to settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('the Campaign app', () => {
  beforeEach(() => {
    localStorage.clear()
    kept.clear()
    maps.length = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
  })

  it('plays a campaign’s world clock without a map', async () => {
    const { c, dialog, toasts, app, systems, calendarOf } = await openApp()
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!
    const calendar = calendarOf(greyMarches)

    // A new campaign, with its name and system, kept and listed.
    const id = await app.newCampaign('  The long winter ', greyMarches.id)
    expect(c.deserializeCampaign(kept.get(id)!.json)).toMatchObject({
      name: 'The long winter',
      system: greyMarches.id,
    })
    expect(app.campaigns.list.map((x) => x.name)).toEqual(['The long winter'])

    await app.open.open(id)
    expect(app.open.found).toBe(true)
    expect(app.open.system.id).toBe(greyMarches.id)

    // Its clock starts with the clocks the system declares.
    app.open.controls.start(calendar.at(1, '06:00'))
    await settle()
    const started = app.open.campaign!.world!
    expect(started.clocks.length).toBeGreaterThan(0)
    expect(started.clocks.every((k) => k.ref)).toBe(true)
    expect(app.open.missing()).toBe(0)

    // An event scheduled for tomorrow comes due on the way, in the timeline; the world's own
    // weather is rolled for the new day.
    const fair = calendar.at(2, '12:00')
    app.open.controls.act({ type: 'schedule', event: { name: 'The salt fair', at: fair } })
    await app.open.controls.advance({ until: 'next-event' })
    await settle()
    const after = c.deserializeCampaign(kept.get(id)!.json)
    expect(after.world!.time).toBe(fair)
    expect(after.world!.timeline.some((e) => e.text === 'The salt fair')).toBe(true)
    expect(after.worldWeather?.day).toBe(2)
    expect(app.open.weather()?.name).toBeTruthy()

    // A trip plays in it elsewhere (Travel wrote it): the clock doesn't go back.
    const playing = { ...after, playing: { app: 'travel', id: 't1', name: 'To the coast' } }
    kept.set(id, { ...kept.get(id)!, json: c.serializeCampaign(playing) })
    hear?.({ type: 'put', id, modified: playing.modified })
    await settle()
    expect(app.open.campaign!.playing?.name).toBe('To the coast')
    await app.open.controls.setDate(calendar.at(1, '06:00'))
    expect(app.open.campaign!.world!.time).toBe(fair)
    expect(toasts.at(-1)?.message).toMatch(/can’t go back/)
    // …and its weather is the trip's then: none shown here.
    expect(app.open.weather()).toBeUndefined()

    // A map in it: the campaign can't be deleted until it leaves.
    const map = { meta: { id: 'm1', name: 'The coast', campaign: id } }
    maps.push({ id: 'm1', name: 'The coast', modified: '', json: JSON.stringify(map) })
    expect(await app.removeCampaign(app.open.campaign!)).toBe(false)
    expect(kept.has(id)).toBe(true)
    maps.length = 0
    const removing = app.removeCampaign(app.open.campaign!)
    await settle()
    expect(dialog.current?.message).toMatch(/“The long winter”/)
    dialog.current!.resolve('ok')
    expect(await removing).toBe(true)
    expect(kept.has(id)).toBe(false)
    expect(app.campaigns.list).toEqual([])
  })

  it('says when a campaign isn’t kept here', async () => {
    const { app } = await openApp()
    await app.open.open('nowhere')
    expect(app.open.found).toBe(false)
    expect(app.open.campaign).toBeUndefined()
  })
})

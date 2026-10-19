import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryChange, LibraryEntry } from '@open-tabletop/storage'

/**
 * The Campaign app: a campaign made here with the Grey Marches' system, its world clock
 * played without a map (the system's clocks, an event coming due, the world's own weather),
 * the clock not going back while a trip plays in it elsewhere, and a campaign deleted only
 * when nothing is in it; its factions brought in, their land on a map of the library (the
 * Grey Marches' example map), world turns by hand and by themselves changing it there.
 */

// Where campaigns and maps are kept: in memory here (IndexedDB in a browser).
const kept = new Map<string, LibraryEntry>()
const maps: LibraryEntry[] = []
const putMaps: LibraryEntry[] = []
let hear: ((change: LibraryChange) => void) | undefined
vi.mock('@open-tabletop/storage', async (original) => ({
  ...(await original<typeof import('@open-tabletop/storage')>()),
  getCampaign: async (id: string) => kept.get(id) ?? null,
  deleteCampaign: async (id: string) => void kept.delete(id),
  allLibraryMaps: async () => maps,
  putLibraryMap: async (entry: LibraryEntry) => {
    putMaps.push(entry)
    const at = maps.findIndex((m) => m.id === entry.id)
    if (at >= 0) maps[at] = entry
    else maps.push(entry)
  },
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
    putMaps.length = 0
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

  it('brings in the factions, and plays their land on a map of the campaign', async () => {
    const { c, dialog, app, systems, calendarOf } = await openApp()
    const { createMap, deserializeMap, serializeMap } = await import('@open-tabletop/map')
    const greyMarches = systems.list.find((s) => s.id.startsWith('grey-marches'))!
    const calendar = calendarOf(greyMarches)
    const id = await app.newCampaign('The Marches at war', greyMarches.id)

    // The Grey Marches' example map (its id is the bundle's), in the campaign: its Hills and
    // Vale by name, and Fort Keld's hex.
    const example = (): ReturnType<typeof createMap> => {
      const map = createMap('The Grey Marches')
      map.meta = { ...map.meta, id: 'greymarches1', campaign: id }
      map.grid = { ...map.grid, width: 20, height: 12 }
      map.regions = [
        { id: 'hollowhills', name: 'The Hollow Hills', color: '#000' },
        { id: 'ashfordvale', name: 'Ashford Vale', color: '#000' },
      ]
      for (let col = 1; col <= 4; col++) map.hexes[`${col},2`] = { region: 'hollowhills' }
      for (let col = 8; col <= 11; col++) map.hexes[`${col},6`] = { region: 'ashfordvale' }
      return map
    }
    const keep = (map: ReturnType<typeof createMap>) =>
      maps.push({ id: map.meta.id, name: map.meta.name, modified: '', json: serializeMap(map) })
    keep(example())
    await app.open.open(id)
    expect(app.open.maps.map((m) => m.meta.id)).toEqual(['greymarches1'])
    expect(app.open.landMap?.meta.id).toBe('greymarches1')

    // Brought in: their sheets in the campaign, their starting land on the map (written back).
    app.open.bringFactions()
    await settle()
    const own = c.deserializeCampaign(kept.get(id)!.json).factions!
    expect(own.factions.map((f) => f.id)).toEqual(['iron-clans', 'the-vale', 'fort-keld'])
    const land = () => deserializeMap(maps.find((m) => m.id === 'greymarches1')!.json).territories!
    expect(land()['iron-clans']).toHaveLength(4)
    expect(land()['the-vale']).toHaveLength(4)
    expect(land()['fort-keld']).toEqual(['15,9'])

    // A world turn by hand: in the timeline, and the land changes on the map. The Vale (3
    // strength) gathers; the Clans (4) reach out.
    app.open.controls.start(calendar.at(1, '06:00'))
    const writes = putMaps.length
    app.open.worldTurn()
    await settle()
    const turned = c.deserializeCampaign(kept.get(id)!.json)
    expect(turned.world!.timeline.some((e) => /The Iron Clans/.test(e.text ?? ''))).toBe(true)
    expect(turned.factions!.lastTurn).toBe(calendar.at(1, '06:00'))
    expect(putMaps.length).toBeGreaterThan(writes)
    expect(land()).toEqual(app.open.landMap!.territories)

    // Turns by themselves: a week later, another turn came, on the map.
    const before = JSON.stringify(land())
    await app.open.controls.advance({ minutes: 7 * calendar.minutesPerDay })
    await settle()
    const week = c.deserializeCampaign(kept.get(id)!.json)
    expect(week.factions!.lastTurn).toBeGreaterThan(turned.factions!.lastTurn)
    expect(JSON.stringify(land())).not.toBe(before)
    // Untick it: time moves on with no turn.
    app.open.setFactions({ ...week.factions!, auto: false })
    await app.open.controls.advance({ minutes: 14 * calendar.minutesPerDay })
    await settle()
    expect(c.deserializeCampaign(kept.get(id)!.json).factions!.lastTurn).toBe(
      week.factions!.lastTurn,
    )

    // A second map joins, with no land of theirs: given here, by region (no Fort Keld: its
    // hex is for the example map only). It's the one chosen now.
    const second = example()
    second.meta = { ...second.meta, id: 'secondmap1', name: 'A second map' }
    keep(second)
    await app.open.open('elsewhere')
    await app.open.open(id)
    expect(app.open.maps.map((m) => m.meta.id)).toEqual(['secondmap1', 'greymarches1'])
    app.open.chooseLandMap('secondmap1')
    expect(app.open.landMap?.meta.id).toBe('secondmap1')
    app.open.bringLand(app.open.landMap!)
    await settle()
    const there = deserializeMap(maps.find((m) => m.id === 'secondmap1')!.json).territories!
    expect(Object.keys(there).sort()).toEqual(['iron-clans', 'the-vale'])
    // The sheets didn't change.
    expect(c.deserializeCampaign(kept.get(id)!.json).factions!.factions).toEqual(
      app.open.campaign!.factions!.factions,
    )

    // Taken out: their sheets, and their land on every map.
    const removing = app.open.removeFactions()
    await settle()
    dialog.current!.resolve('ok')
    expect(await removing).toBe(true)
    await settle()
    expect(c.deserializeCampaign(kept.get(id)!.json).factions).toBeUndefined()
    for (const m of maps) expect(deserializeMap(m.json).territories).toBeUndefined()
  })
})

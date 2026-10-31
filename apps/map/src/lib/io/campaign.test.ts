import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryEntry } from '@open-tabletop/storage'

/**
 * The open map's campaign (Map settings → Campaign): moving the map to another campaign,
 * asking what stays; the system as the campaign's, asking when others are in it; and a
 * file whose campaign this browser has already (join it, replace it or keep it apart).
 */

// Where maps and campaigns are kept: in memory here (IndexedDB in a browser).
const maps = new Map<string, LibraryEntry>()
const kept = new Map<string, LibraryEntry>()
let picked: string | null = null
const list = (store: Map<string, LibraryEntry>) => async () =>
  [...store.values()].map(({ id, name, modified }) => ({ id, name, modified }))
vi.mock('@open-tabletop/storage', async (original) => ({
  ...(await original<typeof import('@open-tabletop/storage')>()),
  getLibraryMap: async (id: string) => maps.get(id) ?? null,
  putLibraryMap: async (entry: LibraryEntry) => void maps.set(entry.id, entry),
  deleteLibraryMap: async (id: string) => void maps.delete(id),
  allLibraryMaps: async () => [...maps.values()],
  listLibrary: list(maps),
  getCampaign: async (id: string) => kept.get(id) ?? null,
  putCampaign: async (entry: LibraryEntry) => void kept.set(entry.id, entry),
  deleteCampaign: async (id: string) => void kept.delete(id),
  listCampaigns: list(kept),
  allCampaigns: async () => [...kept.values()],
}))
vi.mock('./file', () => ({ downloadMap: () => {}, pickMapFile: async () => picked }))

async function openMapApp() {
  vi.resetModules()
  const c = await import('@open-tabletop/campaign')
  const { dialog, toasts } = await import('@open-tabletop/ui-kit')
  const actions = await import('./actions.svelte')
  const { exampleMaps } = await import('./examples')
  const { editor } = await import('../store/editor.svelte')
  const { startWorld } = await import('../play/world.svelte')
  const { bringFactions } = await import('../play/factions')
  const example = exampleMaps().find((m) => m.id === 'greymarches1')!
  return { c, dialog, toasts, actions, example, editor, startWorld, bringFactions }
}

/** Waits for the reads and writes to settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Answers the question asked now, and returns its message. */
async function answer(
  dialog: { current: { message: string; resolve: (v: string) => void } | null },
  value: string,
) {
  await settle()
  const message = dialog.current?.message ?? ''
  dialog.current?.resolve(value)
  return message
}

describe('a map’s campaign', () => {
  beforeEach(() => {
    maps.clear()
    kept.clear()
    localStorage.clear()
  })

  it('moves to another campaign, asking what stays; the one it leaves goes if empty', async () => {
    const { c, dialog, toasts, actions, example, editor, startWorld, bringFactions } =
      await openMapApp()
    // Another campaign with a world clock and a map of its own.
    const world = { time: 9000, events: [], clocks: [], timeline: [], nextId: 1 }
    const south = { ...c.createCampaign('south', 'The South'), world }
    kept.set('south', {
      id: 'south',
      name: 'The South',
      modified: '',
      json: c.serializeCampaign(south),
    })
    const southMap = { meta: { id: 'southmap', name: 'South map', campaign: 'south' } }
    maps.set('southmap', {
      id: 'southmap',
      name: 'South map',
      modified: '',
      json: JSON.stringify(southMap),
    })

    // The example, in a campaign of its own, playing the Grey Marches, with a world clock
    // and its factions' land.
    await actions.openExampleMap(example)
    expect(editor.setup).toMatchObject({ id: 'grey-marches', system: 'grey-marches' })
    expect(await actions.keptCampaigns()).toEqual(
      expect.arrayContaining([{ id: 'south', name: 'The South' }]),
    )
    startWorld()
    bringFactions()
    expect(Object.keys(editor.map.territories ?? {}).length).toBeGreaterThan(0)

    // Both have a world: cancelled, nothing changes.
    let moving = actions.moveToCampaign('south')
    expect(await answer(dialog, 'cancel')).toMatch(/“The South” has a world of its own/)
    expect(await moving).toBe(false)
    expect(editor.setup.id).toBe('grey-marches')

    // Keeping the campaign's: its clock and system (Core's) are the map's now; the land of
    // factions the campaign doesn't have isn't kept; the campaign left behind is gone.
    const shown = toasts.length
    moving = actions.moveToCampaign('south')
    await answer(dialog, 'theirs')
    expect(await moving).toBe(true)
    expect(editor.map.meta.campaign).toBe('south')
    expect(editor.campaign.world?.time).toBe(9000)
    expect(editor.setup.system).toBeUndefined()
    expect(editor.map.territories).toBeUndefined()
    expect(
      toasts
        .slice(shown)
        .map((x) => x.message)
        .join(' '),
    ).toMatch(/the campaign’s system/)
    expect(kept.has('grey-marches')).toBe(false)
    expect(JSON.parse(maps.get('greymarches1')!.json).meta.campaign).toBe('south')

    // The system is the campaign's: South map is in it too, so changing it asks.
    let choosing = actions.chooseSystem('grey-marches')
    expect(await answer(dialog, 'cancel')).toMatch(/“South map”/)
    expect(await choosing).toBe(false)
    expect(editor.setup.system).toBeUndefined()
    choosing = actions.chooseSystem('grey-marches')
    await answer(dialog, 'ok')
    expect(await choosing).toBe(true)
    expect(editor.setup.system).toBe('grey-marches')

    // Back to a campaign of its own, bringing the world along: The South keeps its own (and
    // South map stays in it).
    moving = actions.moveToCampaign('grey-marches')
    expect(await answer(dialog, 'mine')).toMatch(/has no world yet/)
    expect(await moving).toBe(true)
    expect(editor.setup).toMatchObject({ id: 'grey-marches', system: 'grey-marches' })
    expect(editor.campaign.world?.time).toBe(9000)
    expect(kept.has('south')).toBe(true)
    expect(c.deserializeCampaign(kept.get('grey-marches')!.json).world?.time).toBe(9000)
  })

  it('an example whose campaign isn’t here asks to join one like it; names are never shared', async () => {
    const { c, dialog, toasts, actions, editor } = await openMapApp()
    const { exampleMaps } = await import('./examples')
    const hills = exampleMaps().find((m) => m.id === 'hollowhills1')!
    // The user's own Grey Marches campaign (a map started before the examples shared one),
    // with a map in it; and another campaign of the default system, which isn't offered.
    const mine = { ...c.createCampaign('mine', 'The Grey Marches'), system: 'grey-marches' }
    const other = c.createCampaign('other', 'Elsewhere')
    for (const camp of [mine, other])
      kept.set(camp.id, {
        id: camp.id,
        name: camp.name,
        modified: camp.modified,
        json: c.serializeCampaign(camp),
      })
    const myMap = { meta: { id: 'mymap', name: 'My Marches', campaign: 'mine' } }
    maps.set('mymap', {
      id: 'mymap',
      name: 'My Marches',
      modified: '',
      json: JSON.stringify(myMap),
    })

    // Cancelled: nothing opens.
    const before = editor.map.meta.id
    let opening = actions.openExampleMap(hills)
    expect(await answer(dialog, 'cancel')).toMatch(/“The Grey Marches”, which this browser/)
    await opening
    expect(editor.map.meta.id).toBe(before)

    // Joining the user's: the Hollow Hills play in it, and say so (with My Marches).
    opening = actions.openExampleMap(hills)
    await answer(dialog, 'mine')
    await opening
    expect(editor.map.meta.campaign).toBe('mine')
    expect(editor.campaign.id).toBe('mine')
    expect(toasts.at(-1)?.message).toMatch(/campaign “The Grey Marches”, with “My Marches”/)

    // Started apart instead: the example's campaign, numbered so the two can be told apart.
    await actions.removeLibraryMap('hollowhills1')
    opening = actions.openExampleMap(hills)
    await answer(dialog, 'own')
    await opening
    expect(editor.campaign).toMatchObject({ id: 'grey-marches', name: 'The Grey Marches (2)' })
    expect(toasts.at(-1)?.message).toMatch(/“The Grey Marches \(2\)”, with no other maps/)
  })

  it('a file whose campaign is here: join it, replace it, or keep it apart', async () => {
    const { c, dialog, actions, example, editor, startWorld } = await openMapApp()
    await actions.openExampleMap(example)
    // The campaign kept here went on (a world clock), the file's didn't.
    startWorld(1440)
    const here = { ...editor.campaign, modified: '2026-10-19T12:00:00.000Z' }
    kept.set(here.id, {
      id: here.id,
      name: here.name,
      modified: here.modified,
      json: c.serializeCampaign(here),
    })
    picked = example.json
    const fileTime = (await import('./otd')).parseMapFile(example.json).campaign.world?.time
    expect(fileTime).not.toBe(1440)

    // Joining: the map opens in the campaign kept here.
    // (The map is in the library already, changed since: replaced first, then its campaign.)
    let opening = actions.openMapFile()
    expect(await answer(dialog, 'replace')).toMatch(/already in this browser/)
    expect(await answer(dialog, 'join')).toMatch(/already has the campaign of this map/)
    expect(await opening).toBe('greymarches1')
    expect(editor.campaign.world?.time).toBe(1440)

    // Keeping it apart: a campaign of its own, with the file's world and system.
    opening = actions.openMapFile()
    await answer(dialog, 'replace')
    await answer(dialog, 'apart')
    await opening
    expect(editor.map.meta.campaign).not.toBe('grey-marches')
    expect(editor.setup).toMatchObject({ system: 'grey-marches' })
    expect(editor.campaign.world?.time).toBe(fileTime)
    expect(kept.has(editor.map.meta.campaign)).toBe(true)

    // Replacing it: the campaign is the file's.
    opening = actions.openMapFile()
    await answer(dialog, 'replace')
    expect(await answer(dialog, 'replace')).toMatch(/campaign of this map/)
    await opening
    expect(editor.map.meta.campaign).toBe('grey-marches')
    expect(editor.campaign.world?.time).toBe(fileTime)
    expect(c.deserializeCampaign(kept.get('grey-marches')!.json).world?.time).toBe(fileTime)
  })

  it('the Grey Marches’ two example maps play one campaign: clock and factions shared, land per map', async () => {
    const { c, actions, example, editor } = await openMapApp()
    const { exampleMaps } = await import('./examples')
    const { advanceWorld, worldTurnNow } = await import('../play/world.svelte')
    const hills = exampleMaps().find((m) => m.id === 'hollowhills1')!
    expect(hills).toMatchObject({ pack: 'grey-marches', path: 'maps/hollow-hills.otd.json' })

    // Saved as the app saves what changes (its autosave isn't running here).
    const { serializeMap } = await import('@open-tabletop/map')
    const keep = () => {
      const { map, campaign } = editor
      kept.set(campaign.id, {
        id: campaign.id,
        name: campaign.name,
        modified: campaign.modified,
        json: c.serializeCampaign(campaign),
      })
      maps.set(map.meta.id, {
        id: map.meta.id,
        name: map.meta.name,
        modified: map.meta.modified,
        json: serializeMap(map),
      })
    }
    // The Marches' map, in the example campaign; an hour of the world clock goes by.
    await actions.openExampleMap(example)
    expect(editor.campaign).toMatchObject({ id: 'grey-marches', name: 'The Grey Marches' })
    const marchesLand = [...editor.map.territories!['iron-clans']]
    const start = editor.campaign.world!.time
    await advanceWorld({ minutes: 60 })
    keep()

    // The Hollow Hills join it without asking: the same clock, at its own scale, the Clans
    // holding the Hills there too and their watch-cairn outside them; nobody else.
    await actions.openExampleMap(hills)
    await settle()
    expect(editor.map.meta.campaign).toBe('grey-marches')
    expect(editor.campaign.world!.time).toBe(start + 60)
    expect(editor.map.scale.cellKm).toBe(3)
    expect(editor.map.hexes['8,4']).toMatchObject({ name: 'The Moot-stone', tags: ['landmark'] })
    const clans = editor.map.territories!['iron-clans']
    expect(clans).toEqual(expect.arrayContaining(['3,6', '4,6', '8,4']))
    expect(editor.map.territories!['the-vale'] ?? []).toEqual([])
    expect(editor.map.hexes['4,6']?.region).toBeUndefined()

    // A world turn played here: in the campaign's timeline, its land changes on this map only.
    const lines = editor.campaign.world!.timeline.length
    worldTurnNow()
    const turned = editor.campaign.world!.timeline.length
    expect(turned).toBeGreaterThan(lines)
    const values = editor.campaign.factions!.factions.map((f) => f.values)
    keep()
    await actions.openLibraryMap('greymarches1')
    expect(editor.map.meta.campaign).toBe('grey-marches')
    expect(editor.campaign.world!.timeline.length).toBe(turned)
    expect(editor.campaign.factions!.factions.map((f) => f.values)).toEqual(values)
    expect(editor.map.territories!['iron-clans']).toEqual(marchesLand)
  })

  it('opens a map of the campaign being played, and the bar follows the map opened', async () => {
    const { serializeMap, createMap } = await import('@open-tabletop/map')
    const put = (id: string, campaign: string, modified: string) => {
      const map = createMap()
      map.meta = { ...map.meta, id, name: id, campaign, modified }
      maps.set(id, { id, name: id, modified, json: serializeMap(map) })
    }
    // Newest first, as the library lists them.
    put('south1', 'south', '2026-01-03T00:00:00.000Z')
    put('north2', 'north', '2026-01-02T00:00:00.000Z')
    put('north1', 'north', '2026-01-01T00:00:00.000Z')
    // The last map open was the South's, but the North is being played (chosen in Campaign).
    localStorage.setItem('opentabletop.map.currentMap', 'south1')
    localStorage.setItem('opentabletop.campaign.current', 'north')
    const { actions, editor } = await openMapApp()
    const { playing, playIn } = await import('@open-tabletop/ui-kit')
    // The page's listeners (saving when it's hidden), not looked at here.
    const listen = { addEventListener: () => {}, removeEventListener: () => {} }
    vi.stubGlobal('document', { ...listen, visibilityState: 'visible' })
    if (typeof window === 'undefined') vi.stubGlobal('window', listen)
    vi.stubGlobal('location', { hash: '' })
    await actions.startPersistence()
    vi.unstubAllGlobals()
    expect(editor.map.meta.id).toBe('north2')
    expect(actions.library.loaded).toBe(true)
    // Opening the South's map (the bar's effect does this in the app) plays in the South.
    await actions.openLibraryMap('south1')
    playIn(editor.setup.id)
    expect(playing.id).toBe('south')
    expect(localStorage.getItem('opentabletop.campaign.current')).toBe('south')
  })
})

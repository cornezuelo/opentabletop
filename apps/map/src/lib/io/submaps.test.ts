import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cellDistance, parseKey } from '@open-tabletop/hex'
import type { LibraryEntry } from '@open-tabletop/storage'

/**
 * Sub-maps in Map: the example's Barrow-halls kept beside the Hollow Hills, its way in on
 * the hills' hex, and a trip that goes down into it and back up, the same trip.
 */

// Where maps and campaigns are kept: in memory here (IndexedDB in a browser).
const maps = new Map<string, LibraryEntry>()
const kept = new Map<string, LibraryEntry>()
const list = (store: Map<string, LibraryEntry>) => async () =>
  [...store.values()].map(({ id, name, modified, parent }) => ({
    id,
    name,
    modified,
    ...(parent && { parent }),
  }))
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

/** Waits for the reads and writes to settle. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('sub-maps', () => {
  beforeEach(() => {
    maps.clear()
    kept.clear()
    localStorage.clear()
  })

  it('the trip goes down into the Barrow-halls and back up, the same trip', async () => {
    vi.resetModules()
    const actions = await import('./actions.svelte')
    const { exampleMaps } = await import('./examples')
    const { editor } = await import('../store/editor.svelte')
    const { loadLinks, subMapsAt, newSubMap } = await import('./submaps')
    const play = await import('../play/play')
    const { deserializeMap, placeOn, partyToken } = await import('@open-tabletop/map')
    const hills = exampleMaps().find((m) => m.id === 'hollowhills1')!

    // Opening the example keeps its sub-map beside it, under it, in the same campaign.
    await actions.openExampleMap(hills)
    await settle()
    expect(maps.get('barrowhalls1')).toMatchObject({ parent: 'hollowhills1' })
    await loadLinks()
    expect(subMapsAt('10,8').map((m) => m.meta.id)).toEqual(['barrowhalls1'])
    expect(subMapsAt('10,8')[0].meta.campaign).toBe(editor.map.meta.campaign)

    // A trip from the Barrow-halls' hex (the party put there by hand), by a party that
    // doesn't get lost.
    editor.tool = 'play'
    play.setMode('rules')
    play.partyMoved('10,8')
    expect(play.sessionOf(editor.map.play!)?.travel.location).toBe('10,8')
    play.editSession((s) => ({ ...s, stats: { ...s.stats, navigation: 6 } }))
    const trip = play.sessionOf(editor.map.play!)!
    const journal = trip.journal.length
    /** Marches on (resolving what comes up) until `done`. */
    const marchUntil = async (done: () => boolean) => {
      for (let i = 0; i < 20 && !done(); i++) {
        for (const c of play.sessionOf(editor.map.play!)?.travel.pendingChecks ?? [])
          play.resolvePending(c.id)
        play.step({ type: 'action', id: 'march', with: { until: 'place' } })
        await settle()
      }
    }
    /** Marches on until the map `id` is the one open. */
    const marchTo = (id: string) => marchUntil(() => editor.map.meta.id === id)

    // Go in: the way's other end is the destination, and the march takes it.
    play.step({ type: 'setDestination', place: placeOn('barrowhalls1', '0,3') })
    await marchTo('barrowhalls1')
    expect(editor.map.meta.id).toBe('barrowhalls1')
    const below = play.sessionOf(editor.map.play!)!
    expect(below.travel.location).toBe('area:barrowstair1')
    expect(below.journal.length).toBeGreaterThan(journal)
    expect(partyToken(editor.map)?.hex).toBe('0,3')
    expect(editor.campaign.playing).toMatchObject({ app: 'map', id: 'barrowhalls1' })
    // The hills keep where the party left from, and say where the trip went.
    const left = deserializeMap(maps.get('hollowhills1')!.json)
    expect(left.play?.away).toBe('barrowhalls1')
    expect(left.play?.rules?.session).toBeNull()
    expect(partyToken(left)?.hex).toBe('10,8')
    // The bar says where the halls hang.
    await loadLinks()
    expect(editor.linked.ancestors).toEqual([{ id: 'hollowhills1', name: 'The Hollow Hills' }])

    // The halls are squares with rooms: clicking a cell of the chief's tomb heads for the
    // tomb, and the march goes square to square along the corridor, then room to room, the
    // party's token on the cell it came in by.
    expect(editor.map.grid.kind).toBe('square')
    expect(play.sessionOf(editor.map.play!)?.travel.location).toBe('area:barrowstair1')
    const trail = editor.map.play!.trail.length
    play.clickHex('8,4')
    await marchUntil(() => play.sessionOf(editor.map.play!)?.travel.location === 'area:chieftomb1')
    expect(play.sessionOf(editor.map.play!)?.travel.location).toBe('area:chieftomb1')
    const walked = editor.map.play!.trail.slice(trail - 1).map(parseKey)
    expect(walked.map((c) => `${c.col},${c.row}`)).toEqual([
      '0,3',
      '1,3',
      '2,3',
      '3,3',
      '4,3',
      '7,3',
    ])
    expect(partyToken(editor.map)?.hex).toBe('7,3')
    for (let i = 1; i < walked.length - 1; i++)
      expect(cellDistance(walked[i - 1], walked[i], editor.map.grid)).toBe(1)

    // And back out, the same trip, to the hex it went down from.
    play.step({ type: 'setDestination', place: placeOn('hollowhills1', '10,8') })
    await marchTo('hollowhills1')
    expect(editor.map.meta.id).toBe('hollowhills1')
    const back = play.sessionOf(editor.map.play!)!
    expect(back.travel.location).toBe('10,8')
    expect(editor.map.play?.away).toBeUndefined()
    expect(back.journal.length).toBeGreaterThan(below.journal.length)

    // A new sub-map under another hex: kept, in the campaign, its way in on the hex.
    const made = await newSubMap('4,6', 'The cairn’s cellar', 'way-in')
    expect(maps.get(made.meta.id)).toMatchObject({ parent: 'hollowhills1' })
    expect(made.meta.parent).toMatchObject({ map: 'hollowhills1', place: '4,6', kind: 'way-in' })
    expect(made.grid.kind).toBe('square')
    expect(subMapsAt('4,6').map((m) => m.meta.id)).toEqual([made.meta.id])
  })
})

import type { HexMap } from '@open-tabletop/map'
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

  it(
    'the Deep Barrows lay themselves under the trip, down to the last tomb',
    { timeout: 30_000 },
    async () => {
      vi.resetModules()
      const actions = await import('./actions.svelte')
      const { exampleMaps } = await import('./examples')
      const { editor } = await import('../store/editor.svelte')
      const { loadLinks, waysAt } = await import('./submaps')
      const play = await import('../play/play')
      const { mapWorld } = await import('@open-tabletop/map')
      await actions.openExampleMap(exampleMaps().find((m) => m.id === 'hollowhills1')!)
      await settle()
      await loadLinks()
      expect(maps.get('deepbarrows1')).toMatchObject({ parent: 'barrowhalls1' })

      editor.tool = 'play'
      play.setMode('rules')
      play.partyMoved('10,8')
      const session = () => play.sessionOf(editor.map.play!)!
      /** Goes to a place, resolving what comes up on the way. */
      const go = async (to: string) => {
        play.step({ type: 'setDestination', place: to })
        await settle()
        for (let i = 0; i < 12; i++) {
          if (session().travel.location === to || !session().travel.route) break
          for (const c of session().travel.pendingChecks) play.resolvePending(c.id)
          // A barred door on the way: forced first (its noise may bring the dead).
          const last = session().journal.at(-1)
          if (last?.code === 'ROUTE_BLOCKED' || last?.code === 'TRAVEL_STOPPED')
            play.step({ type: 'action', id: 'force-door' })
          play.step({ type: 'action', id: 'march', with: { until: 'place' } })
          await settle()
        }
      }
      await go(waysAt('10,8')[0].there)
      await settle()
      expect(editor.map.meta.id).toBe('barrowhalls1')
      await loadLinks()
      // Past the slab of the grave-niche, a stair goes on down.
      play.partyMoved('8,3')
      await go(waysAt('8,3').find((w) => w.map === 'deepbarrows1')!.there)
      await settle()
      expect(editor.map.meta.id).toBe('deepbarrows1')
      // The map was empty: the foot of the stair is there as the party arrives, a room.
      expect(editor.map.pieces?.map((p) => p.id)).toEqual(['stair-foot'])
      expect(editor.map.regions.map((r) => r.name)).toEqual(['The foot of the stair'])
      expect(mapWorld(editor.map).place(session().travel.location)?.danger).toBe(1)

      // Through whatever way on is open, until the table ends it.
      for (let i = 0; i < 40 && !editor.map.pieces!.some((p) => p.id === 'tomb'); i++) {
        const waiting = editor.map.connections
          .filter((c) => c.kind === 'door')
          .flatMap((c) => c.between.filter((cell) => !editor.map.hexes[cell]?.terrain))
        if (!waiting.length) break
        await go(waiting[i % waiting.length])
      }
      const laid = editor.map.pieces!.map((p) => p.id)
      expect(laid).toContain('tomb')
      expect(laid.length).toBeGreaterThanOrEqual(9)
      // The deck was drawn from, and the journal told it.
      expect(Object.keys(session().oracle.decks)).toContain('grey-marches/deep-barrows')
      expect(session().journal.filter((e) => e.code === 'PIECE_LAID').length).toBe(laid.length)
      // Saved and read again, a played map keeps what was laid.
      const { deserializeMap, serializeMap } = await import('@open-tabletop/map')
      expect(deserializeMap(serializeMap(editor.map)).pieces).toEqual(editor.map.pieces)
    },
  )

  it('a map you have hangs from a cell, in this campaign, with its own sub-map', async () => {
    vi.resetModules()
    const { editor } = await import('../store/editor.svelte')
    const { hangMap, mapsToHang } = await import('./submaps')
    const { createMap, deserializeMap, serializeMap } = await import('@open-tabletop/map')

    // A map of its own, with a sub-map under it, kept beside the one open.
    const keep = (map: HexMap, parent?: string) =>
      maps.set(map.meta.id, {
        id: map.meta.id,
        name: map.meta.name,
        modified: map.meta.modified,
        json: serializeMap(map),
        ...(parent && { parent }),
      })
    const other = createMap('The Vale')
    keep(other)
    const below = createMap('The Cellar')
    below.meta = {
      ...below.meta,
      campaign: other.meta.campaign,
      parent: { map: other.meta.id, ways: [{ place: '2,2', entrance: '1,1' }] },
    }
    keep(below, other.meta.id)
    const top = createMap('The Marches')
    keep(top)
    editor.load(top)
    await settle()
    expect((await mapsToHang()).map((m) => m.name)).toContain('The Vale')

    expect(await hangMap(other.meta.id, '3,3')).toBe(true)
    await settle()
    const hung = deserializeMap(maps.get(other.meta.id)!.json)
    expect(hung.meta.parent).toMatchObject({ map: top.meta.id, ways: [{ place: '3,3' }] })
    expect(hung.meta.campaign).toBe(editor.map.meta.campaign)
    expect(deserializeMap(maps.get(below.meta.id)!.json).meta.campaign).toBe(hung.meta.campaign)
    // Hanging from nothing no more, and never one above the map itself.
    expect((await mapsToHang()).map((m) => m.name)).not.toContain('The Vale')
  })

  it(
    'the trip goes down into the Barrow-halls and back up, the same trip',
    { timeout: 30_000 },
    async () => {
      vi.resetModules()
      const actions = await import('./actions.svelte')
      const { exampleMaps } = await import('./examples')
      const { editor } = await import('../store/editor.svelte')
      const { loadLinks, subMapsAt, newSubMap, waysAt, addWayInto } = await import('./submaps')
      const play = await import('../play/play')
      const { deserializeMap, placeOn, partyToken } = await import('@open-tabletop/map')
      const hills = exampleMaps().find((m) => m.id === 'hollowhills1')!

      // Opening the example keeps its sub-map beside it, under it, in the same campaign.
      const links = actions.library.links
      await actions.openExampleMap(hills)
      await settle()
      expect(maps.get('barrowhalls1')).toMatchObject({ parent: 'hollowhills1' })
      // Kept after the map opened: the app is told to read its ways again.
      expect(actions.library.links).toBeGreaterThan(links)
      const modified = editor.map.meta.modified
      await loadLinks()
      // Reading the ways is no change: opening a map doesn't make it the player's.
      expect(editor.map.meta.modified).toBe(modified)
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

      // Go in: the way's other end (the stair, a room) is the destination, and the march takes it.
      const [way] = waysAt('10,8')
      expect(way).toMatchObject({ dir: 'in', map: 'barrowhalls1' })
      expect(way.there).toBe(placeOn('barrowhalls1', 'area:barrowstair1'))
      play.step({ type: 'setDestination', place: way.there })
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
      expect(editor.linked.ancestors).toEqual([
        { id: 'greymarches1', name: 'The Grey Marches' },
        { id: 'hollowhills1', name: 'The Hollow Hills' },
      ])

      // The halls are squares with rooms: clicking a cell of the chief's tomb heads for the
      // tomb, and the march goes square to square along the corridor, then room to room, the
      // party's token on the cell it came in by, and at last on the cell clicked.
      expect(editor.map.grid.kind).toBe('square')
      expect(play.sessionOf(editor.map.play!)?.travel.location).toBe('area:barrowstair1')
      const trail = editor.map.play!.trail.length
      play.clickHex('8,4')
      await marchUntil(
        () => play.sessionOf(editor.map.play!)?.travel.location === 'area:chieftomb1',
      )
      expect(play.sessionOf(editor.map.play!)?.travel.location).toBe('area:chieftomb1')
      const walked = editor.map.play!.trail.slice(trail - 1).map(parseKey)
      expect(walked.map((c) => `${c.col},${c.row}`)).toEqual([
        '0,3',
        '1,3',
        '2,3',
        '3,3',
        '4,3',
        '7,3',
        '8,4',
      ])
      expect(partyToken(editor.map)?.hex).toBe('8,4')
      for (let i = 1; i < walked.length - 2; i++)
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
      expect(made.meta.parent).toMatchObject({
        map: 'hollowhills1',
        ways: [{ place: '4,6', kind: 'way-in' }],
      })
      expect(made.grid.kind).toBe('square')
      expect(subMapsAt('4,6').map((m) => m.meta.id)).toEqual([made.meta.id])
      // Another way into it, from another cell: one more mouth, its entrance the first's.
      await addWayInto(made.meta.id, '6,8')
      expect(subMapsAt('6,8').map((m) => m.meta.id)).toEqual([made.meta.id])
      expect(deserializeMap(maps.get(made.meta.id)!.json).meta.parent?.ways).toEqual([
        { place: '4,6', entrance: made.meta.parent!.ways[0].entrance, kind: 'way-in' },
        { place: '6,8', entrance: made.meta.parent!.ways[0].entrance, kind: 'way-in' },
      ])
    },
  )

  it('the trip crosses the old clan mine, in at its mouth and out at Hollow Gate', async () => {
    vi.resetModules()
    const actions = await import('./actions.svelte')
    const { exampleMaps } = await import('./examples')
    const { editor } = await import('../store/editor.svelte')
    const { loadLinks, waysAt } = await import('./submaps')
    const play = await import('../play/play')
    const { partyToken } = await import('@open-tabletop/map')
    await actions.openExampleMap(exampleMaps().find((m) => m.id === 'hollowhills1')!)
    await settle()
    await loadLinks()
    // The mine's three mouths on the hills, each a way in.
    for (const cell of ['11,7', '12,9', '12,11'])
      expect(waysAt(cell).map((w) => w.map)).toContain('oldmine1')

    editor.tool = 'play'
    play.setMode('rules')
    play.partyMoved('11,7')
    play.editSession((s) => ({ ...s, stats: { ...s.stats, navigation: 6 } }))
    // A click on Hollow Gate: the route goes through the mine.
    play.step({ type: 'setDestination', place: '12,11' })
    expect(play.sessionOf(editor.map.play!)?.travel.route?.[1]).toBe('@oldmine1/0,3')
    const visited = new Set<string>()
    for (let i = 0; i < 40; i++) {
      for (const c of play.sessionOf(editor.map.play!)?.travel.pendingChecks ?? [])
        play.resolvePending(c.id)
      play.step({ type: 'action', id: 'march', with: { until: 'place' } })
      await settle()
      visited.add(editor.map.meta.id)
      const at = play.sessionOf(editor.map.play!)?.travel.location
      if (editor.map.meta.id === 'hollowhills1' && at === '12,11') break
    }
    // It went on in the mine (the same trip, heading on) and came out at Hollow Gate.
    expect(visited).toContain('oldmine1')
    expect(editor.map.meta.id).toBe('hollowhills1')
    expect(play.sessionOf(editor.map.play!)?.travel.location).toBe('12,11')
    expect(partyToken(editor.map)?.hex).toBe('12,11')
  })

  it('a sub-map opened alone has its system, and its way out names the map above', async () => {
    vi.resetModules()
    const actions = await import('./actions.svelte')
    const { exampleMaps } = await import('./examples')
    const { loadLinks, waysAt } = await import('./submaps')
    const { mapSystemId } = await import('../play/systems')
    await actions.openExampleMap(exampleMaps().find((m) => m.id === 'barrowhalls1')!)
    await settle()
    await loadLinks()
    expect(mapSystemId()).toBe('grey-marches')
    expect(waysAt('0,3')[0]).toMatchObject({ name: 'The Hollow Hills', cell: '1109' })
    expect(maps.has('greymarches1')).toBe(true)
  })

  it('the tree of maps shows the whole tree from any of its maps, and each way’s two ends', async () => {
    vi.resetModules()
    const actions = await import('./actions.svelte')
    const { exampleMaps } = await import('./examples')
    const { mapsTree, openMapAt } = await import('./submaps')
    const { editor } = await import('../store/editor.svelte')
    await actions.openExampleMap(exampleMaps().find((m) => m.id === 'barrowhalls1')!)
    await settle()

    const tree = await mapsTree()
    expect(tree[0]).toMatchObject({ id: 'greymarches1', depth: 0, ways: [] })
    const hills = tree.find((n) => n.id === 'hollowhills1')!
    const halls = tree.find((n) => n.id === 'barrowhalls1')!
    expect(hills.depth).toBe(1)
    expect(halls.depth).toBe(2)
    expect(tree.indexOf(halls)).toBeGreaterThan(tree.indexOf(hills))
    expect(hills.ways.length).toBeGreaterThan(1)
    expect(halls.ways[0]).toMatchObject({
      above: { map: 'hollowhills1', cell: '10,8' },
      below: { map: 'barrowhalls1', cell: '0,3' },
    })
    expect(halls.ways[0].above!.label).toContain('1109')

    // A click on a way's end above opens that map, with that cell selected.
    await openMapAt('hollowhills1', '10,8')
    expect(editor.map.meta.id).toBe('hollowhills1')
    expect(editor.selected).toBe('10,8')
    // The same tree from there, and names as they are now, though the open map isn't saved yet.
    editor.map.meta.name = 'The Hills'
    const again = await mapsTree()
    // 'The Hills' sorts where 'The Hollow Hills' did: the same order, whichever map is open.
    expect(again.map((n) => n.id)).toEqual(tree.map((n) => n.id))
    expect(again.find((n) => n.id === 'hollowhills1')!.name).toBe('The Hills')
  })

  it('a map whose map above is not kept keeps its ways in the tree, one end missing', async () => {
    vi.resetModules()
    const actions = await import('./actions.svelte')
    const { exampleMaps } = await import('./examples')
    const { mapsTree } = await import('./submaps')
    await actions.openExampleMap(exampleMaps().find((m) => m.id === 'barrowhalls1')!)
    await settle()
    maps.delete('hollowhills1')
    const [top] = await mapsTree()
    expect(top).toMatchObject({ id: 'barrowhalls1', depth: 0 })
    expect(top.ways[0].above).toBeUndefined()
    expect(top.ways[0].below.cell).toBe('0,3')
  })

  it('the trip goes down the Barrow-halls’ stair and back out by it', async () => {
    vi.resetModules()
    const actions = await import('./actions.svelte')
    const { exampleMaps } = await import('./examples')
    const { editor } = await import('../store/editor.svelte')
    const { loadLinks, waysAt } = await import('./submaps')
    const play = await import('../play/play')
    await actions.openExampleMap(exampleMaps().find((m) => m.id === 'hollowhills1')!)
    await settle()
    await loadLinks()
    editor.tool = 'play'
    play.setMode('rules')
    play.partyMoved('10,8')
    const trip = () => play.sessionOf(editor.map.play!)!
    const march = async (done: () => boolean) => {
      for (let i = 0; i < 20 && !done(); i++) {
        for (const c of trip().travel.pendingChecks) play.resolvePending(c.id)
        play.step({ type: 'action', id: 'march', with: { until: 'place' } })
        await settle()
      }
    }
    play.step({ type: 'setDestination', place: waysAt('10,8')[0]!.there })
    await march(() => editor.map.meta.id === 'barrowhalls1')
    expect(editor.map.meta.id).toBe('barrowhalls1')
    await loadLinks()

    // The stair is a room: the party stands in it, and the way out is offered from it.
    expect(trip().travel.location).toBe('area:barrowstair1')
    const [out] = waysAt('0,3')
    expect(out).toMatchObject({ dir: 'out', map: 'hollowhills1' })
    expect(play.partyAt('0,3')).toBe(true)
    expect(play.partyAt('1,3')).toBe(false)

    play.step({ type: 'setDestination', place: out!.there })
    await march(() => editor.map.meta.id === 'hollowhills1')
    expect(editor.map.meta.id).toBe('hollowhills1')
    expect(trip().travel.location).toBe('10,8')

    // Down again and back to the hills by hand: the trip is below, a new one starts here.
    await loadLinks()
    play.step({ type: 'setDestination', place: waysAt('10,8')[0]!.there })
    await march(() => editor.map.meta.id === 'barrowhalls1')
    await actions.openLibraryMap('hollowhills1')
    await settle()
    expect(editor.map.play?.away).toBe('barrowhalls1')
    expect(await play.restartRules('grey-marches', 'spring')).toBe(true)
    expect(editor.map.play?.away).toBeUndefined()
    play.clickHex('9,8')
    expect(trip().travel.destination).toBe('9,8')
  })

  it('the Hollow Hills are the Marches up close: in at Fort Keld, on to the watch-cairn', async () => {
    vi.resetModules()
    const actions = await import('./actions.svelte')
    const { exampleMaps } = await import('./examples')
    const { editor } = await import('../store/editor.svelte')
    const { loadLinks, waysAt } = await import('./submaps')
    const play = await import('../play/play')
    const { placeOn, partyToken } = await import('@open-tabletop/map')
    await actions.openExampleMap(exampleMaps().find((m) => m.id === 'greymarches1')!)
    await settle()
    // Its sub-maps came with it, the Hills' own below them, all in its campaign.
    expect(maps.get('hollowhills1')).toMatchObject({ parent: 'greymarches1' })
    expect(maps.get('barrowhalls1')).toMatchObject({ parent: 'hollowhills1' })
    await loadLinks()
    // Fort Keld and Hollow Gate lead in; a way of no kind takes no time of its own.
    expect(waysAt('15,9').map((w) => [w.map, w.kind])).toEqual([['hollowhills1', undefined]])
    expect(waysAt('17,14').map((w) => w.map)).toEqual(['hollowhills1'])

    editor.tool = 'play'
    play.setMode('rules')
    play.partyMoved('15,9')
    play.editSession((s) => ({ ...s, stats: { ...s.stats, navigation: 6 } }))
    play.step({ type: 'setDestination', place: placeOn('hollowhills1', '4,6') })
    expect(play.sessionOf(editor.map.play!)?.travel.route?.[1]).toBe('@hollowhills1/0,6')
    for (let i = 0; i < 40; i++) {
      for (const c of play.sessionOf(editor.map.play!)?.travel.pendingChecks ?? [])
        play.resolvePending(c.id)
      play.step({ type: 'action', id: 'march', with: { until: 'place' } })
      await settle()
      const at = play.sessionOf(editor.map.play!)?.travel.location
      if (editor.map.meta.id === 'hollowhills1' && at === '4,6') break
    }
    // The same trip went on in the Hills, from the way out of Fort Keld.
    expect(editor.map.meta.id).toBe('hollowhills1')
    expect(editor.map.meta.campaign).toBe('grey-marches')
    expect(play.sessionOf(editor.map.play!)?.travel.location).toBe('4,6')
    expect(partyToken(editor.map)?.hex).toBe('4,6')
  })

  it("the examples' own terrains are called what the system names them, in each language", async () => {
    vi.resetModules()
    const actions = await import('./actions.svelte')
    const { exampleMaps } = await import('./examples')
    const { editor } = await import('../store/editor.svelte')
    const { setLocale } = await import('../i18n/index.svelte')
    const { terrainName } = await import('../terrainName')
    await actions.openExampleMap(exampleMaps().find((m) => m.id === 'hollowhills1')!)
    await settle()
    await actions.openLibraryMap('oldmine1')
    await settle()
    expect(editor.map.meta.id).toBe('oldmine1')
    // The map's palette names none of them: the system does, or the app for the usual ones.
    expect(editor.map.terrains.every((x) => !x.name)).toBe(true)
    const names = () => editor.map.terrains.map(terrainName)
    expect(names()).toEqual(['Mine gallery', 'Rubble', 'Black water'])
    // The language is set on the page too: a bare one is enough here.
    vi.stubGlobal('document', { documentElement: {} })
    setLocale('es')
    expect(names()).toEqual(['Galería de mina', 'Escombros', 'Agua negra'])
    setLocale('en')
    vi.unstubAllGlobals()
    // A name written in the map's palette still wins.
    expect(terrainName({ ...editor.map.terrains[0], name: 'Old drift' })).toBe('Old drift')
  })
})

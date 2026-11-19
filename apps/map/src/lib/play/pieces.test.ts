import { describe, expect, it } from 'vitest'
import {
  createMap,
  mapWorld,
  placeOfCell,
  withPieces,
  type HexKey,
  type HexMap,
} from '@open-tabletop/map'
import { createOracleEngine } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import {
  newMapSheet,
  partyOf,
  startTrip,
  stepTrip,
  type TravelSystem,
} from '@open-tabletop/session'
import { tripOnMap } from '@open-tabletop/campaign'
import * as play from './play'
import { editor } from '../store/editor.svelte'
import { library } from './packs'
import { getSystem } from './systems'

/** Marches one step through a door of the map, writing what was laid as Map does. */
function through(
  system: TravelSystem,
  session: ReturnType<typeof startTrip>['session'],
  to: string,
  seed: number,
) {
  const options = {
    system,
    world: mapWorld(editor.map),
    oracle: createOracleEngine({ registry: library.registry, random: seeded(seed) }),
    random: seeded(seed),
    locale: 'en',
    discover: 'pieces' as const,
    // As Map plays it: a piece laid is read at once, as the map will keep it.
    withLaid: (laid: Parameters<typeof withPieces>[1]) => mapWorld(withPieces(editor.map, laid)),
  }
  const planned = stepTrip(options, session, { type: 'setDestination', place: to })
  const marched = stepTrip(options, planned.state, {
    type: 'action',
    id: 'march',
    with: { until: 'destination' },
  })
  editor.applyDiscovery({ ...planned.discovered, ...marched.discovered })
  editor.applyLaid([...planned.laid, ...marched.laid])
  return marched
}

const start = (map: HexMap) => {
  map.grid = { ...map.grid, width: 30, height: 30 }
  map.hexes['15,15' as HexKey] = { terrain: 'stone-floor' }
  map.connections = [{ id: 'door', between: ['15,15', '15,14'], kind: 'door' }]
  editor.load(map)
}

describe('pieces', () => {
  it('a piece laid keeps the view: it says which cells, never "everything changed"', () => {
    start(createMap('', { template: 'dungeon', cells: 'square' }))
    const system = getSystem('core')
    const { session } = startTrip({ system, location: '15,15', season: 'summer' })
    const changes: string[] = []
    const cells: string[] = []
    const stop = editor.onChange((change) => {
      changes.push(change.kind)
      if (change.kind === 'laid') cells.push(...change.cells)
    })
    through(system, session, '15,14', 3)
    stop()
    // `all` fits the whole map in the view, zooming out on every room laid.
    expect(changes).not.toContain('all')
    expect(changes).toContain('laid')
    expect(cells).toContain('15,14')
  })

  it('entering reads the piece just laid: a check sees its tags and floor', () => {
    start(createMap('', { template: 'dungeon', cells: 'square' }))
    const core = getSystem('core')
    const system: TravelSystem = {
      ...core,
      rules: {
        ...core.rules,
        checks: [
          {
            event: 'NEW_ROOM',
            at: ['trip.place-enter'],
            when: { 'place.floor': true },
          } as never,
        ],
      },
    }
    const { session } = startTrip({ system, location: '15,15', season: 'summer' })
    const done = through(system, session, '15,14', 3)
    expect(
      done.state.travel.pendingChecks.some((c) => c.event === 'NEW_ROOM') ||
        done.entries.some((e) => JSON.stringify(e).includes('NEW_ROOM')),
    ).toBe(true)
  })

  for (const cells of ['square', 'hex'] as const)
    it(`a map of ${cells} grows through its doors, on the Generic rules`, () => {
      start(createMap('', { template: 'dungeon', cells }))
      const system = getSystem('core')
      let { session } = startTrip({ system, location: '15,15', season: 'summer' })
      // A door to nowhere: a way through the wall onto an empty cell.
      expect(mapWorld(editor.map).neighbors('15,15')).toContain('15,14')
      const done = through(system, session, '15,14', 3)
      session = done.state
      expect(done.laid).toHaveLength(1)
      // On the piece's room, standing on the cell stepped into.
      expect(session.travel.location).toBe(placeOfCell(editor.map, '15,14'))
      expect(session.travel.at ?? session.travel.location).toBe('15,14')
      expect(editor.map.hexes['15,14' as HexKey]?.terrain).toBe('stone-floor')
      expect(done.entries.some((e) => e.code === 'PIECE_LAID')).toBe(true)
      expect(editor.map.pieces).toHaveLength(1)
      // Its other exits wait: new doors, each leading on, so the place can go on growing.
      for (let i = 0; i < 12; i++) {
        const world = mapWorld(editor.map)
        const open = editor.map.connections.find(
          ({ between: [a, b] }) =>
            !editor.map.hexes[b]?.terrain &&
            world.neighbors(session.travel.location).includes(b) &&
            a,
        )
        if (!open) break
        session = through(system, session, open.between[1], 100 + i).state
      }
      expect(editor.map.pieces!.length).toBeGreaterThan(1)
    })
})

describe('a barred door in the Deep Barrows', () => {
  it('holds until forced, and the noise of it may bring the dead', () => {
    const map = createMap('', { template: 'dungeon', cells: 'square' })
    map.grid = { ...map.grid, width: 30, height: 30 }
    map.hexes['15,15' as HexKey] = { terrain: 'barrow-floor' }
    map.hexes['15,14' as HexKey] = { terrain: 'barrow-floor' }
    // As the Marches' barred passage lays it: a door with its state.
    map.connections = [
      {
        id: 'bar',
        between: ['15,15', '15,14'],
        kind: 'door',
        name: 'A barred door',
        fields: [{ key: 'state', value: 'barred' }],
      },
    ]
    editor.load(map)
    const system = getSystem('grey-marches')
    let { session } = startTrip({ system, location: '15,15', season: 'summer' })
    const run = (action: Parameters<typeof stepTrip>[2], seed: number) =>
      stepTrip(
        {
          system,
          world: mapWorld(editor.map),
          oracle: createOracleEngine({ registry: library.registry, random: seeded(seed) }),
          random: seeded(seed),
          locale: 'en',
          // Laid piece by piece: what nobody has opened is rock, so the door is the only way.
          discover: 'pieces' as const,
        },
        session,
        action,
      )
    const march = { type: 'action', id: 'march', with: { until: 'destination' } } as const
    // Shut: the route goes up to the door, and the march stops at it.
    session = run({ type: 'setDestination', place: '15,14' }, 1).state
    let done = run(march, 1)
    expect(done.state.travel.location).toBe('15,15')
    expect(done.entries.some((e) => e.code === 'ROUTE_BLOCKED')).toBe(true)
    session = done.state
    // Force the door: the noise of it rolled, sometimes bringing one of the dead.
    let heard = false
    let silent = false
    for (let seed = 1; seed < 40; seed++) {
      // The one barred door at hand: that one, chosen by its id without asking.
      const forced = run({ type: 'action', id: 'force-door' }, seed)
      expect(forced.state.travel.waiting).toBeUndefined()
      expect(forced.state.travel.connections?.bar).toMatchObject({ state: 'forced' })
      const text = JSON.stringify(forced.entries)
      expect(text).toContain('door-noise')
      const dead = (forced.state.present ?? []).some((p) =>
        JSON.stringify(p).includes('barrow-dead'),
      )
      if (dead) heard = true
      else silent = true
      if (seed === 1) done = forced
    }
    expect(heard && silent).toBe(true)
    // Forced, the door is open for the rest of the trip.
    session = done.state
    expect(
      run({ type: 'action', id: 'march', with: { until: 'destination' } }, 3).state.travel.location,
    ).toBe('15,14')
  })
})

describe("each map's own sheet, in the Deep Barrows", () => {
  it('forcing a door stirs the dead of that map, kept by the campaign for it alone', () => {
    const map = createMap('', { template: 'dungeon', cells: 'square' })
    map.grid = { ...map.grid, width: 30, height: 30 }
    map.hexes['15,15' as HexKey] = { terrain: 'barrow-floor' }
    map.hexes['15,14' as HexKey] = { terrain: 'barrow-floor' }
    map.connections = [
      {
        id: 'bar',
        between: ['15,15', '15,14'],
        kind: 'door',
        fields: [{ key: 'state', value: 'barred' }],
      },
    ]
    editor.load(map)
    editor.setCampaignSetup({ system: 'grey-marches' })
    const system = getSystem('grey-marches')
    const id = editor.map.meta.id
    // The dead here are already restless (1): one more door and they stir.
    const restless = { ...newMapSheet(partyOf(system), id)!, values: { unrest: 1 } }
    editor.takeWorld({ campaign: { ...editor.campaign, mapSheets: { [id]: restless } } })
    editor.mode = 'play'
    editor.tool = 'play'
    play.setMode('rules')
    play.clickHex('15,15' as HexKey)
    const trip = () => play.sessionOf(editor.map.play!)!
    expect(trip().map).toMatchObject({ id, values: { unrest: 1 } })
    play.step({ type: 'action', id: 'force-door' })
    play.step({ type: 'resume', choice: 'bar' })
    // Stirring now: the noise is always heard, and one of the dead comes.
    expect(trip().map?.values.unrest).toBe(2)
    expect(trip().map?.conditions).toHaveProperty('stirring')
    expect(JSON.stringify(trip().present)).toContain('barrow-dead')
    // The campaign keeps it for this map; a new trip here finds it, another map starts afresh.
    expect(editor.campaign.mapSheets?.[id]?.values.unrest).toBe(2)
    const fresh = startTrip({ system, location: '15,15' }).session
    expect(tripOnMap(editor.campaign, fresh, system, id).map?.values.unrest).toBe(2)
    const other = tripOnMap(editor.campaign, fresh, system, 'elsewhere').map!
    expect(other.id).toBe('elsewhere')
    expect([0, 1]).toContain(other.values.unrest)
  })
})

describe('a place kept open', () => {
  it('never closes by chance: a dead end at the last way on is drawn again', () => {
    start(createMap('', { template: 'dungeon', cells: 'square' }))
    const core = getSystem('core')
    // Only dead ends come up: with the place kept open, the last way on can't take one.
    const closing = (keepOpen: boolean): TravelSystem => ({
      ...core,
      bindings: {
        ...core.bindings!,
        discover: {
          ...core.bindings!.discover!,
          piece: {
            resolve: 'core/next-piece',
            tries: 3,
            otherwise: 'passage',
            ...(keepOpen && { keepOpen: true }),
          },
        },
      },
    })
    const laidThrough = (system: TravelSystem) => {
      start(createMap('', { template: 'dungeon', cells: 'square' }))
      const { session } = startTrip({ system, location: '15,15', season: 'summer' })
      return through(system, session, '15,14', 3).laid
    }
    // `next-piece` gives dead ends only once 6 are laid: here, a table of dead ends alone.
    library.addPack({
      root: 'ends',
      origin: 'user',
      files: [
        {
          path: 'pack.yaml',
          content: 'id: ends\nname: Ends\nversion: 0.1.0\nlocale: en\nformat: 15\n',
        },
        {
          path: 'ends.yaml',
          content:
            'kind: table\nid: only-ends\nentries:\n  - { id: end, result: An end, set: { piece: dead-end } }\n',
        },
      ],
    })
    const ends = (keepOpen: boolean) => {
      const system = closing(keepOpen)
      system.bindings!.discover!.piece!.resolve = 'ends/only-ends'
      return laidThrough(system)
    }
    expect(ends(false).map((p) => p.id)).toEqual(['dead-end'])
    // Kept open, the three dead ends don't fit: what's laid when nothing did comes instead.
    expect(ends(true).map((p) => p.id)).toEqual(['passage'])
  })
})

describe('a piece read as it is laid, in the Deep Barrows', () => {
  /** The Grey Marches with one piece alone to lay, on a floor with a door to nowhere. */
  const laying = (piece: string) => {
    const map = createMap('', { template: 'dungeon', cells: 'square' })
    map.grid = { ...map.grid, width: 30, height: 30 }
    map.terrains = [
      ...map.terrains,
      { id: 'barrow-floor', name: 'Floor', color: '#555555', floor: true },
    ]
    map.hexes['15,15' as HexKey] = { terrain: 'barrow-floor' }
    map.connections = [{ id: 'door', between: ['15,15', '15,14'], kind: 'door' }]
    editor.load(map)
    const marches = getSystem('grey-marches')
    const system: TravelSystem = {
      ...marches,
      bindings: {
        ...marches.bindings!,
        discover: { ...marches.bindings!.discover!, piece: { tries: 0, otherwise: piece } },
      },
    }
    return { system, session: startTrip({ system, location: '15,15', season: 'summer' }).session }
  }
  /** Through the door into the piece it lays, and what the checks on entering said. */
  const enter = (seed: number) => {
    const { system, session } = laying('crypt')
    const done = through(system, session, '15,14', seed)
    const crack = editor.map.connections.find((c) => c.kind === 'hidden-path')!
    const beyond = crack.between.find((cell) => !editor.map.hexes[cell]?.terrain)!
    const found = done.state.travel.connections?.[crack.id]?.state === 'found'
    // Nothing else came up on the way in (an encounter waits for the player first).
    const quiet = !done.state.travel.pendingChecks.length && !done.state.present?.length
    return { system, done, crack, beyond, found, quiet }
  }
  const seeds = Array.from({ length: 16 }, (_, i) => i + 1)

  it('a crypt is a room with its danger on the step that lays it, and its crack is looked for', () => {
    let rolled = 0
    for (const seed of seeds) {
      const { done, crack, quiet } = enter(seed)
      expect(editor.map.pieces?.map((p) => p.id)).toEqual(['crypt'])
      expect(crack).toMatchObject({ name: 'A crack behind the bones' })
      // The room the map keeps is the one the step read: its place, its danger.
      const room = editor.map.regions.find((r) => r.onePlace)!
      expect(mapWorld(editor.map).place(`area:${room.id}`)).toMatchObject({ danger: 2 })
      // The check on entering saw the exit just laid: never skipped for want of it.
      expect(
        done.entries.some(
          (e) => e.code === 'CHECK_SKIPPED' && e.data?.check === 'HIDDEN_PATH_CHECK_REQUIRED',
        ),
      ).toBe(false)
      if (!quiet) continue
      const told = JSON.stringify(done.entries)
      expect(told).toContain('grey-marches/hidden-path')
      // Told in a crypt's words (the rows for under the ground), not the hills'.
      expect(told).toMatch(/"entry":"(nothing|found)-below"/)
      rolled++
    }
    expect(rolled).toBeGreaterThan(4)
  })

  it('found, the crack is crossed and lays what is behind it; the trip keeps it by its id', () => {
    const { system, done, beyond } = seeds.map(enter).find((e) => e.quiet && e.found)!
    // `enter` plays every seed on the editor's map: this one again, last.
    const again = enter(seeds.find((seed) => enter(seed).quiet && enter(seed).found)!)
    expect(again.beyond).toBe(beyond)
    const crossed = through(system, again.done.state, beyond, 101)
    expect(done.state.travel.connections).toEqual(again.done.state.travel.connections)
    expect(crossed.laid).toHaveLength(1)
    expect(editor.map.hexes[beyond as HexKey]?.terrain).toBe('barrow-floor')
  })

  it('not found, the crack is no way on; coming by again looks for it again', () => {
    const seed = seeds.find((s) => enter(s).quiet && !enter(s).found)!
    const { system, done, beyond } = enter(seed)
    const held = through(system, done.state, beyond, seed)
    expect(held.laid).toHaveLength(0)
    expect(held.state.travel.location).not.toBe(beyond)
    expect(editor.map.hexes[beyond as HexKey]?.terrain).toBeUndefined()
    // Out by the door and in again: the check comes up once more.
    let state = held.state
    for (let i = 0; i < 4 && state.travel.location !== '15,15'; i++)
      state = through(system, state, '15,15', seed + i).state
    expect(state.travel.location).toBe('15,15')
    const room = editor.map.regions.find((r) => r.onePlace)!
    const back = through(system, state, `area:${room.id}`, seed + 7)
    expect(JSON.stringify(back.entries)).toContain('grey-marches/hidden-path')
  })
})

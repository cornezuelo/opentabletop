import { describe, expect, it } from 'vitest'
import { createMap, mapWorld, type HexKey, type HexMap } from '@open-tabletop/map'
import { createOracleEngine } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { startTrip, stepTrip, type TravelSystem } from '@open-tabletop/session'
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
      expect(session.travel.location).toBe('15,14')
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
      const forced = run({ type: 'action', id: 'force-door' }, seed)
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

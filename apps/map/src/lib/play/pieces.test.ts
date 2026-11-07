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

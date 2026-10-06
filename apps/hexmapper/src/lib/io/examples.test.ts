import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { validateBundle } from '@open-tabletop/schema'
import { startTrip, stepTrip, travelSystems } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { mapWorld } from '../play/world'
import { EXAMPLE_MAPS } from './examples'
import { parseMapFile } from './otd'

const packFiles = import.meta.glob('../../../../../packs/grey-marches/**/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('example maps', () => {
  it('are valid OTD bundles that open', () => {
    expect(EXAMPLE_MAPS.map((m) => m.id)).toContain('greymarches1')
    for (const example of EXAMPLE_MAPS) {
      expect(validateBundle(JSON.parse(example.json)).errors).toEqual([])
      expect(parseMapFile(example.json).meta.id).toBe(example.id)
    }
    // Nothing is dropped on the way in (ids the editor accepts).
    const map = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    expect(map.tokens.map((t) => t.kind).sort()).toEqual(['enemy', 'npc', 'party'])
    expect(map.regions.map((r) => r.name)).toEqual([
      'Ashford Vale',
      'The Greywood',
      'The Hollow Hills',
    ])
    expect(Object.values(map.hexes).filter((h) => h.region).length).toBe(224)
    // It opens ready to play with its own system and discovery on, the party in Ashford.
    expect(map.play).toMatchObject({
      mode: 'rules',
      discover: { on: true },
      rules: { system: 'grey-marches', session: null },
    })
  })

  it('the Grey Marches play on their map: the road to Fort Keld pays the toll', () => {
    const map = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const options = {
      system,
      world: mapWorld(map),
      oracle: createOracleEngine({ registry, random: seeded('example-map') }),
      locale: 'en',
    }
    let { session } = startTrip({ system, location: '5,7', season: 'summer' })
    session = stepTrip(options, session, { type: 'setDestination', hex: '15,9' }).state
    expect(session.travel.route).toContain('8,8')
    const events: string[] = []
    for (let i = 0; i < 12 && session.travel.location !== '15,9'; i++) {
      for (const id of session.travel.pendingChecks.map((c) => c.id))
        session = stepTrip(options, session, { type: 'resolveCheck', id }).state
      const step = stepTrip(options, session, { type: 'travel' })
      events.push(...step.entries.flatMap((e) => (e.data?.event ? [String(e.data.event)] : [])))
      session = step.state
      if (session.travel.location !== '15,9' && !session.travel.pendingChecks.length)
        session = stepTrip(options, session, { type: 'camp' }).state
    }
    expect(session.travel.location).toBe('15,9')
    expect(events).toContain('TOLL_CHECK_REQUIRED')
  })

  it('the Grey Marches: only the boat crosses the Saltmere', () => {
    const map = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const options = {
      system,
      world: mapWorld(map),
      oracle: createOracleEngine({ registry, random: seeded('boat') }),
    }
    const { session } = startTrip({ system, location: '9,10' })
    const onFoot = stepTrip(options, session, { type: 'setDestination', hex: '12,11' }).state
    expect(onFoot.travel.route).toBeUndefined()
    const boat = stepTrip(options, session, { type: 'setMode', mode: 'boat' }).state
    const sailing = stepTrip(options, boat, { type: 'setDestination', hex: '12,11' }).state
    expect(sailing.travel.route?.at(-1)).toBe('12,11')
  })

  it('values: a region gives danger to its hexes, a hex can override it, icons add theirs', () => {
    const map = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    const world = mapWorld(map)
    expect(world.cell('10,7')).toMatchObject({ region: 'The Greywood', danger: 2 })
    expect(world.cell('14,3')).toMatchObject({ region: 'The Greywood', danger: 4 })
    expect(world.cell('5,7')).toMatchObject({
      name: 'Ashford',
      region: 'Ashford Vale',
      icon: { id: 'game:village', guards: 0 },
    })
    expect(world.cell('5,7')).not.toHaveProperty('danger')
    expect(map.tokens.find((t) => t.name === 'Brenna')?.fields).toEqual([
      { key: 'fare', value: '2' },
    ])
  })
})

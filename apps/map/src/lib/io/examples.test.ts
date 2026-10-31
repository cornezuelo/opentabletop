import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded, sequence } from '@open-tabletop/random'
import { validateBundle } from '@open-tabletop/schema'
import {
  calendarOf,
  startTrip,
  stepTrip,
  travelSystems,
  tripAvailability,
  tripChanges,
  tripContext,
  tripFacts,
  moveTrip,
  type SessionState,
  shownAt,
} from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { createTravelEngine } from '@open-tabletop/travel-engine'
import { mapWorld, placeOfCell, placeOn } from '@open-tabletop/map'
import { exampleMaps, exampleState, forgetExample, rememberExample } from './examples'
import { parseMapFile } from './otd'

/** The maps the bundled systems bring (`maps:` in their `kind: system`). */
const EXAMPLE_MAPS = exampleMaps()

const packFiles = import.meta.glob('../../../../../packs/grey-marches/**/*.{yaml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('example maps', () => {
  it('tell when the example changed since your map of it started (a newer app)', () => {
    const example = EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!
    // A map started before this was kept: nothing can be said.
    expect(exampleState(example)).toBe('unknown')
    rememberExample(example.id, example)
    expect(exampleState(example)).toBe('same')
    // The app brings a newer example.
    const newer = { ...example, json: example.json.replace('The Grey Stones', 'The Grey Menhirs') }
    expect(exampleState(newer)).toBe('newer')
    // Removed from the library: forgotten.
    forgetExample(example.id)
    expect(exampleState(newer)).toBe('unknown')
  })

  it('are valid OTD bundles that open', () => {
    expect(EXAMPLE_MAPS.map((m) => m.id)).toContain('greymarches1')
    // The Grey Marches' system lists it (`maps:`), a file of their pack.
    expect(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')).toMatchObject({
      pack: 'grey-marches',
      path: 'maps/grey-marches.otd.json',
      system: { id: 'grey-marches' },
    })
    for (const example of EXAMPLE_MAPS) {
      expect(validateBundle(JSON.parse(example.json)).errors).toEqual([])
      expect(parseMapFile(example.json).map.meta.id).toBe(example.id)
    }
    // Nothing is dropped on the way in (ids the editor accepts).
    const { map, campaign } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    expect(map.tokens.map((t) => t.kind).sort()).toEqual(['enemy', 'npc', 'party'])
    expect(map.regions.map((r) => r.name)).toEqual([
      'Ashford Vale',
      'The Greywood',
      'The Hollow Hills',
    ])
    expect(Object.values(map.hexes).filter((h) => h.region).length).toBe(224)
    // The world clock is running: events to come and progress clocks.
    expect(campaign.world?.events.map((e) => e.name)).toContain('The Iron Clans march on Fort Keld')
    expect(campaign.world?.clocks.map((c) => `${c.name} ${c.filled}/${c.segments}`)).toEqual([
      'The Greywood Wyrm wakes 1/6',
      'Fort Keld’s unpaid garrison mutinies 3/8',
      'The Iron Clans march 1/6',
    ])
    // Region styles: the map's, and two regions with their own.
    expect(map.regions.map((r) => r.style)).toEqual([
      undefined,
      { fill: 0.22 },
      { fill: 0, dashed: true, border: 0.07 },
    ])
    // It opens ready to play with its own system and discovery on, the party in Ashford.
    expect(map.play).toMatchObject({
      mode: 'rules',
      discover: { on: true },
      rules: { system: 'grey-marches', session: null },
    })
  })

  it('the Grey Marches play on their map: the road to Fort Keld pays the toll', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
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
    session = stepTrip(options, session, { type: 'setDestination', place: '15,9' }).state
    expect(session.travel.route).toContain('8,8')
    const events: string[] = []
    for (let i = 0; i < 12 && session.travel.location !== '15,9'; i++) {
      for (const id of session.travel.pendingChecks.map((c) => c.id))
        session = stepTrip(options, session, { type: 'resolveCheck', id }).state
      const step = stepTrip(options, session, { type: 'travel' })
      events.push(...step.entries.flatMap((e) => (e.data?.event ? [String(e.data.event)] : [])))
      session = step.state
      if (session.travel.location !== '15,9' && !session.travel.pendingChecks.length)
        session = stepTrip(options, session, { type: 'action', id: 'camp' }).state
    }
    expect(session.travel.location).toBe('15,9')
    expect(events).toContain('TOLL_CHECK_REQUIRED')
  })

  it('the Grey Marches discover their unmapped east with the lie of the Marches', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const model = system.land?.['grey-marches/default']
    expect(model?.weights).toEqual({ from: 2 })
    const options = {
      system,
      world: mapWorld(map),
      oracle: createOracleEngine({ registry, random: seeded('the-east') }),
      random: seeded('the-east-land'),
      locale: 'en',
      discover: 'neighbors' as const,
    }
    // On the Hollow Hills' eastern edge, where nobody has drawn the map.
    expect(map.hexes['18,9']).toMatchObject({ terrain: 'hills' })
    expect(map.hexes['19,9']?.terrain).toBeUndefined()
    const { session } = startTrip({ system, location: '18,9', season: 'summer' })
    const planned = stepTrip(options, session, { type: 'setDestination', place: '19,9' })
    // Seen from the Hills, the land ahead hands over to the model: every hex east of the
    // edge gets one of its terrains, from the land around it.
    const east = Object.entries(planned.discovered).filter(([hex]) => hex.startsWith('19,'))
    expect(east.length).toBeGreaterThan(0)
    for (const [hex, found] of east) expect(Object.keys(model!.next), hex).toContain(found.terrain)
    // The same seeds discover the same land.
    const again = stepTrip(
      {
        ...options,
        oracle: createOracleEngine({ registry, random: seeded('the-east') }),
        random: seeded('the-east-land'),
      },
      startTrip({ system, location: '18,9', season: 'summer' }).session,
      { type: 'setDestination', place: '19,9' },
    )
    expect(again.discovered).toEqual(planned.discovered)
  })

  it('the Hollow Hills play at their own scale: the trail fords the Stonewater', () => {
    const { map, campaign } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'hollowhills1')!.json)
    // The same campaign as the Marches' map, its clock and factions; drawn at 3 km a hex.
    expect(campaign).toMatchObject({ id: 'grey-marches', name: 'The Grey Marches' })
    expect(campaign.world?.clocks.map((c) => c.name)).toContain('The Iron Clans march')
    expect(map.regions.map((r) => r.name)).toEqual(['The Greywood', 'The Hollow Hills'])
    expect(map.territories?.['iron-clans']).toEqual(expect.arrayContaining(['3,6', '4,6']))
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const world = mapWorld(map, system.rules.travel.cellKm)
    expect(world.km('', '')).toBe(3)
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry, random: seeded('hollow-hills') }),
      locale: 'en',
    }
    // From the way out of Fort Keld to the Barrow-halls, by the watch-cairn and the ford.
    let { session } = startTrip({ system, location: '0,6', season: 'summer' })
    session = stepTrip(options, session, { type: 'setDestination', place: '10,8' }).state
    expect(session.travel.route).toEqual(expect.arrayContaining(['4,6', '6,8']))
    const events: string[] = []
    for (let i = 0; i < 20 && session.travel.location !== '10,8'; i++) {
      for (const id of session.travel.pendingChecks.map((c) => c.id))
        session = stepTrip(options, session, { type: 'resolveCheck', id }).state
      const step = stepTrip(options, session, { type: 'travel' })
      events.push(...step.entries.flatMap((e) => (e.data?.event ? [String(e.data.event)] : [])))
      session = step.state
      if (session.travel.location !== '10,8' && !session.travel.pendingChecks.length)
        session = stepTrip(options, session, { type: 'action', id: 'camp' }).state
    }
    expect(session.travel.location).toBe('10,8')
    expect(events).toEqual(
      expect.arrayContaining(['LANDMARK_CHECK_REQUIRED', 'FORD_CHECK_REQUIRED']),
    )
    // 3 km a hex: more hexes a day than on the Marches' map (10 km).
    const marches = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json).map
    expect(mapWorld(marches, system.rules.travel.cellKm).km('', '')).toBe(10)
  })

  it('the Hollow Hills: Stonewater Ford takes an hour more, and a storm day shuts it', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'hollowhills1')!.json)
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const world = mapWorld(map, system.rules.travel.cellKm)
    // Drawn on the trail's step into the ford hex: the trail and the ford, by name.
    expect(world.connections('5,7', '6,8')).toEqual(['trail', 'ford'])
    expect(world.connectionOf!('6,8', '5,7')).toMatchObject({
      kind: 'ford',
      name: 'Stonewater Ford',
    })
    const engine = createTravelEngine({ world, rules: system.rules, calendar: system.calendar })
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    // The step along the trail, and an hour more for the ford.
    const unforded = createTravelEngine({
      world: mapWorld({ ...map, connections: [] }, system.rules.travel.cellKm),
      rules: system.rules,
      calendar: system.calendar,
    })
    const usual = unforded.stepMinutes(session.travel, '5,7', '6,8')
    expect(usual).toBeGreaterThan(0)
    expect(engine.stepMinutes(session.travel, '5,7', '6,8')).toBe(usual + 60)
    // A storm day (the weather's `fordImpossible`): it can't be crossed; the route goes round.
    const storm = { ...session.travel, today: { fordImpossible: true } }
    expect(engine.stepMinutes(storm, '5,7', '6,8')).toBe(Infinity)
    const around = engine.plan(storm, '6,8')!
    expect(around[1]).not.toBe('6,8')
    expect(around.at(-1)).toBe('6,8')
    // Crossing it rolls the ford, read from the step's connection.
    const planned = engine.apply(session.travel, { type: 'setDestination', place: '6,8' }).state
    const ready = { ...planned, momentsDue: undefined }
    const { events } = engine.apply(ready, {
      type: 'action',
      id: 'march',
      with: { until: 'place' },
    })
    const ford = events.find(
      (e) => e.type === 'CHECK_REQUIRED' && e.check.event === 'FORD_CHECK_REQUIRED',
    )
    expect(ford && ford.type === 'CHECK_REQUIRED' && ford.check.context.connection).toMatchObject({
      kind: 'ford',
    })
  })

  it('the Hollow Hills: the Barrow-road can’t be taken until a check finds it', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'hollowhills1')!.json)
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const world = mapWorld(map, system.rules.travel.cellKm)
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry, random: seeded('barrow-road') }),
      locale: 'en',
    }
    const engine = createTravelEngine({ world, rules: system.rules, calendar: system.calendar })
    // Drawn between far hexes, hidden on the map: the place's connections say so.
    expect(world.far?.('10,8', '12,11')).toBe(true)
    let { session } = startTrip({ system, location: '10,7', season: 'summer' })
    // A party that knows the hills: 1d6 + 4 finds it at once.
    session.stats.survival = 4
    const hidden = engine.plan({ ...session.travel, location: '10,8' }, '12,11')!
    expect(hidden.length).toBeGreaterThan(2)
    // Coming into the Barrow-halls, the party looks for it until it's found.
    session = stepTrip(options, session, { type: 'setDestination', place: '10,8' }).state
    for (let i = 0; i < 6 && session.travel.location !== '10,8'; i++) {
      for (const id of session.travel.pendingChecks.map((c) => c.id))
        session = stepTrip(options, session, { type: 'resolveCheck', id }).state
      session = stepTrip(options, session, { type: 'travel' }).state
    }
    expect(session.travel.location).toBe('10,8')
    for (let i = 0; i < 4 && session.travel.pendingChecks.length; i++)
      for (const id of session.travel.pendingChecks.map((c) => c.id))
        session = stepTrip(options, session, { type: 'resolveCheck', id }).state
    const codes = session.journal.map((e) => `${e.code} ${e.data?.event ?? ''}`)
    expect(codes).toContain('ORACLE_RESULT HIDDEN_PATH_CHECK_REQUIRED')
    expect(session.travel.connections).toEqual({ barrowroad01: { state: 'found' } })
    expect(session.journal.find((e) => e.code === 'CONNECTION_CHANGED')?.data).toMatchObject({
      id: 'barrowroad01',
      name: 'The Barrow-road',
      value: 'found',
    })
    // Found: the route takes it, one step to Hollow Gate, and the check no longer comes up.
    expect(engine.plan(session.travel, '12,11')).toEqual(['10,8', '12,11'])
    expect(
      tripFacts(options, session).place as { connections: Record<string, unknown> },
    ).toMatchObject({ connections: { 'hidden-path': { state: 'found' } } })
  })

  it('the Barrow-halls: the trip goes down from the Hollow Hills, on, and back up', () => {
    const open = (id: string) => parseMapFile(EXAMPLE_MAPS.find((m) => m.id === id)!.json).map
    const hills = open('hollowhills1')
    const halls = open('barrowhalls1')
    expect(halls.meta.parent).toEqual({
      map: 'hollowhills1',
      place: '10,8',
      entrance: '0,3',
      kind: 'way-in',
    })
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const km = system.rules.travel.cellKm
    const oracle = createOracleEngine({ registry, random: seeded('barrow-halls') })
    const above = {
      system,
      world: mapWorld(hills, km, { children: [halls] }),
      oracle,
      locale: 'en',
    }
    const below = { system, world: mapWorld(halls, km, { parent: hills }), oracle, locale: 'en' }
    /** Steps until the party stands at `place`, resolving whatever checks come up. */
    const reach = (options: typeof above, session: SessionState, place: string) => {
      session = stepTrip(options, session, { type: 'setDestination', place }).state
      for (let i = 0; i < 12 && session.travel.location !== place; i++) {
        for (const id of session.travel.pendingChecks.map((c) => c.id))
          session = stepTrip(options, session, { type: 'resolveCheck', id }).state
        session = stepTrip(options, session, {
          type: 'action',
          id: 'march',
          with: { until: 'place' },
        }).state
      }
      for (let i = 0; i < 4 && session.travel.pendingChecks.length; i++)
        for (const id of session.travel.pendingChecks.map((c) => c.id))
          session = stepTrip(options, session, { type: 'resolveCheck', id }).state
      return session
    }
    let { session } = startTrip({ system, location: '10,8', season: 'summer' })
    // A party that knows the hills: it doesn't get lost on the way.
    session.stats.navigation = 6
    const start = session.travel.time
    // Down the way: a step of its kind, ten minutes more, onto the halls' entrance.
    const way = placeOn('barrowhalls1', '0,3')
    session = reach(above, session, way)
    expect(session.travel.location).toBe(way)
    expect(session.travel.time - start).toBeGreaterThanOrEqual(10)
    // The trip goes on in the halls: the same trip, its places now theirs.
    const visitsAbove = session.travel.visits?.['10,8']
    session = moveTrip(session, 'hollowhills1', 'barrowhalls1')
    expect(session.travel.location).toBe('0,3')
    expect(session.travel.visits?.['@hollowhills1/10,8']).toBe(visitsAbove)
    expect(session.travel.route).toBeUndefined()
    // On to the chief's tomb (a room, a landmark: the trip pauses there), through the long
    // barrow (a room too, one step however big) and the bronze door between them (a minute more).
    const tomb = placeOfCell(halls, '8,3')
    expect(tomb).toBe('area:chieftomb1')
    expect(below.world.connections('area:longbarrow1', tomb)).toEqual(['door'])
    expect(below.world.place(tomb)).toMatchObject({
      name: "The chief's tomb",
      tags: ['landmark'],
      danger: 4,
      floor: true,
    })
    session = reach(below, session, tomb)
    expect(session.travel.location).toBe(tomb)
    const entered = session.journal.flatMap((e) =>
      e.code === 'PLACE_ENTERED' ? [String(e.data?.place)] : [],
    )
    expect(entered).toEqual(['0,3', '1,3', '2,3', '3,3', 'area:longbarrow1', tomb])
    // Coming down the way is the halls' first place entered (it was `@barrowhalls1/0,3`).
    expect(entered[0]).toBe('0,3')
    // And back up the way out, to the hex it came down from.
    session = reach(below, session, placeOn('hollowhills1', '10,8'))
    session = moveTrip(session, 'barrowhalls1', 'hollowhills1')
    expect(session.travel.location).toBe('10,8')
    expect(session.journal.some((e) => e.data?.place === '@barrowhalls1/area:chieftomb1')).toBe(
      true,
    )
  })

  it('the Grey Marches: the trip pauses at the shrine until Continue', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
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
      oracle: createOracleEngine({ registry, random: seeded('shrine') }),
      locale: 'en',
    }
    // From the trail next to the shrine, heading for it.
    let { session } = startTrip({ system, location: '9,3', season: 'summer' })
    session = stepTrip(options, session, { type: 'setDestination', place: '10,3' }).state
    for (let i = 0; i < 4 && session.travel.location !== '10,3'; i++) {
      for (const id of session.travel.pendingChecks.map((c) => c.id))
        session = stepTrip(options, session, { type: 'resolveCheck', id }).state
      session = stepTrip(options, session, { type: 'travel' }).state
    }
    expect(session.travel.location).toBe('10,3')
    const codes = session.journal.map((e) => `${e.code} ${e.data?.event ?? ''}`)
    expect(codes).toContain('ORACLE_RESULT SHRINE_CHECK_REQUIRED')
    expect(codes).toContain('CHECK_PAUSED SHRINE_CHECK_REQUIRED')
    const paused = session.travel.pendingChecks.find((c) => c.event === 'SHRINE_CHECK_REQUIRED')!
    expect(paused.rolled).toBeDefined()
    const going = stepTrip(options, session, { type: 'resolveCheck', id: paused.id }).state
    expect(going.travel.pendingChecks.some((c) => c.id === paused.id)).toBe(false)
  })

  it('the Grey Marches: camp is an action of steps, being lost a value they declare', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const world = mapWorld(map)
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry, random: seeded('camp') }),
      locale: 'en',
    }
    // A fed night in camp: the day's food is eaten once and fatigue goes down.
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    session.stats.fatigue = 2
    const camped = stepTrip(options, session, { type: 'action', id: 'camp' })
    expect(camped.state.stats.fatigue).toBe(1)
    // The Company's stores: six rations, one eaten (no companions on this trip).
    expect(camped.state.party?.items).toEqual([expect.objectContaining({ id: 'ration', count: 5 })])
    expect(camped.entries.find((e) => e.data?.action === 'camp')?.data?.effects).toEqual({
      'party.stats.fatigue': -1,
    })
    // Lost blocks travel for the rest of the day; a storm, foraging.
    const lost = { ...session, travel: { ...session.travel, today: { lost: true } } }
    expect(tripAvailability({ system, world }, lost).travel).toEqual({ value: 'lost' })
    const storm = { ...session, travel: { ...session.travel, weather: 'storm' } }
    expect(tripAvailability({ system, world }, storm).forage).toMatchObject({ condition: 'unless' })
    const unavailable = tripAvailability({ system, world }, session)
    // Each by its rule (and the pairs that stopped it), and nothing else.
    expect(Object.values(unavailable).every((u) => !!u && 'failed' in u)).toBe(true)
    expect(unavailable).toMatchObject({
      'mode.boat': { condition: 'when' }, // Ashford is inland
      'forced-march': { condition: 'when' }, // fatigue 2
      'night-march': { condition: 'when' }, // by day
      rite: { condition: 'when' }, // no shrine here
      grumble: { condition: 'when' }, // nobody went hungry
      parley: { condition: 'when' }, // nobody refuses
      tale: { condition: 'when' }, // not 50 km yet
      fish: { condition: 'when' }, // no water around Ashford
      carter: { condition: 'when' }, // no road ahead without a route
      market: { condition: 'when' }, // a market town, but not on market day
      tend: { condition: 'when' }, // nobody is wounded
      ferry: { condition: 'when' }, // no ferry here
      ashore: { condition: 'when' }, // not on a boat
      delve: { condition: 'when' }, // no ruin here
      'stormy-dawn': { condition: 'when' }, // no storm
      'out-of-the-wood': { condition: 'when' }, // not leaving the Greywood
      'drive-off': { condition: 'when' }, // nobody here to drive off
      'buy-off': { condition: 'when' }, // no outlaws here
    })
    expect(Object.keys(unavailable)).toHaveLength(18)
  })

  it('the Grey Marches: delving a ruin rolls a generator from a step, no check around it', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    // A ruin, as discovery tags the ones it finds.
    map.hexes['5,7'] = { ...map.hexes['5,7'], tags: [...(map.hexes['5,7']?.tags ?? []), 'ruins'] }
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
      oracle: createOracleEngine({ registry, random: seeded('delve') }),
      locale: 'es',
    }
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    expect(tripAvailability({ system, world: options.world }, session).delve).toBeUndefined()
    const { state } = stepTrip(options, session, { type: 'action', id: 'delve' })
    const result = state.journal.find((e) => e.code === 'ORACLE_RESULT')!
    // In the journal by the generator's name, in the UI's language.
    expect(result.data).toMatchObject({
      event: 'generator.ruin-delve',
      named: 'Explorar una ruina',
      table: 'grey-marches/ruin-delve',
    })
    expect(result.text).toMatch(/^Las ruinas de /)
    // What its tables pause reaches the trip, as a table's does: a guardian that stops the
    // trip (the Ember Hunt) leaves it waiting for Continue.
    const value = result.data?.value as { pause?: boolean } | undefined
    expect(state.travel.pendingChecks.length > 0).toBe(!!value?.pause)
    expect(state.travel.time - session.travel.time).toBe(180)
  })

  it('the Grey Marches: foraging is an action of their own, once a day', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
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
      oracle: createOracleEngine({ registry, random: seeded('forage') }),
      locale: 'en',
    }
    // Ashford is farmland: foraging there is rolled on the Foraging table.
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    const foraged = stepTrip(options, session, { type: 'action', id: 'forage' })
    // As players read it (the journal's detail has the roll's dice and the food before and after).
    const told = foraged.entries.filter((e) => shownAt(e, { level: 'mechanics' }))
    expect(told.map((e) => e.code)).toEqual(['ACTION_TAKEN', 'ORACLE_RESULT'])
    expect(told[1].data).toMatchObject({
      event: 'FORAGE_CHECK_REQUIRED',
      table: 'grey-marches/forage',
    })
    expect(foraged.state.travel.speedToday).toBe(0.5)
    const again = stepTrip(options, foraged.state, { type: 'action', id: 'forage' })
    expect(again.entries).toEqual([])
  })

  it('the Grey Marches: by night the party camps, or marches on in the dark', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
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
      oracle: createOracleEngine({ registry, random: seeded('night') }),
      locale: 'en',
    }
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    const nightfall = calendarOf(system).at(session.travel.day, '20:00')
    const night = { ...session, travel: { ...session.travel, time: nightfall } }
    // By day the night march isn't there (hidden, unavailable); at nightfall, resting,
    // foraging and the forced march are off (daylight), and the night march is on.
    expect(
      tripAvailability({ system, world: options.world }, session)['night-march'],
    ).toMatchObject({
      condition: 'when',
    })
    const dark = tripAvailability({ system, world: options.world }, night)
    expect(dark.rest).toMatchObject({ condition: 'when' })
    expect(dark.forage).toMatchObject({ condition: 'when' })
    expect(dark['forced-march']).toMatchObject({ condition: 'when' })
    expect(dark['night-march']).toBeUndefined()
    expect(system.rules.actions?.['night-march']).toMatchObject({ hideWhenUnavailable: true })
    // At nightfall a travel order goes nowhere; after a night march it goes on, up to
    // four hours more (never past midnight), at +1 fatigue.
    const planned = stepTrip(options, night, { type: 'setDestination', place: '9,7' }).state
    expect(stepTrip(options, planned, { type: 'travel' }).state.travel.time).toBe(nightfall)
    const marching = stepTrip(options, planned, { type: 'action', id: 'night-march' }).state
    expect(marching.stats.fatigue).toBe(session.stats.fatigue + 1)
    const { state } = stepTrip(options, marching, { type: 'travel', until: 'destination' })
    expect(state.travel.time).toBeGreaterThan(nightfall)
    expect(state.travel.time).toBeLessThanOrEqual(
      calendarOf(system).at(session.travel.day + 1, '00:00'),
    )
    // In the dark, getting lost is easier: 1–3 on the same table as at dawn.
    const lost = createOracleEngine({ registry, random: sequence([0.4]) }).resolve(
      'grey-marches/getting-lost',
      { ...tripContext(night, {}), time: { tags: ['dark'] } },
    )
    expect(lost.resolution.text).toBe('Lost in the dark: you stop until dawn, shaken')
  })

  it('the Grey Marches: the party’s values drive hunger and the inn', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    const oracle = createOracleEngine({ registry, random: seeded('hunger') })
    const options = { system, world: mapWorld(map), oracle, locale: 'en' }
    // A night in Ashford with no food (no camping without it) and no morale: the day ends
    // hungry, and someone deserts.
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    session.party!.items = []
    session.stats.morale = 0
    const camped = stepTrip(options, session, {
      type: 'wait',
      until: session.travel.time + 24 * 60,
    })
    expect(camped.entries.some((e) => e.code === 'HALT_WITHOUT')).toBe(true)
    const hunger = camped.entries.find((e) => e.data?.event === 'HUNGER_CHECK_REQUIRED')
    expect(hunger?.text).toMatch(/^In the night, /)
    expect(camped.state.stats).toMatchObject({ morale: -1, hirelings: 0 }) // hirelings never below 0 (min: 0)

    // The inn reads the party: a feast needs food; without a trip, nobody is asked.
    const fed = {
      ...session,
      stats: { ...session.stats, morale: 3 },
      party: {
        ...session.party!,
        items: [{ key: 'ration', id: 'ration', from: 'grey-marches/gear', count: 4, fields: {} }],
      },
    }
    const feast = oracle.resolve('grey-marches/inn', tripContext(fed, {}, { spend: 'feast' }))
    expect(feast.resolution.entry).toBe('feast')
    expect(tripChanges(feast.resolution.value)).toEqual([
      ['party.items.ration', -2],
      ['party.stats.morale', 2],
      ['party.stats.fatigue', -1],
    ])
    expect(oracle.resolve('grey-marches/inn', { spend: 'feast' }).resolution.entry).toBe('short')
    expect(oracle.resolve('grey-marches/inn', { spend: 'round' }).resolution.entry).toBe('quiet')
  })

  it('the Grey Marches have their own calendar, and checks see it', () => {
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const system = travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!
    expect(system.calendar).toBeDefined()
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    const parts = system.calendar!.describe(session.travel.time)
    expect(parts).toMatchObject({ year: 412, month: { id: 'highsun', day: 1 }, season: 'summer' })
    // Midsummer is the 15th of Highsun.
    const midsummer = system.calendar!.describe(session.travel.time + 14 * 24 * 60)
    expect(midsummer.holidays.map((h) => h.id)).toEqual(['midsummer'])
    // The first check of the day (the weather at dawn) sees the date.
    const engine = createTravelEngine({
      world: mapWorld(parseMapFile(EXAMPLE_MAPS[0].json).map),
      rules: system.rules,
      calendar: system.calendar,
    })
    const planned = engine.apply(session.travel, { type: 'setDestination', place: '7,7' }).state
    const { events } = engine.apply(planned, { type: 'travel' })
    const check = events.find((e) => e.type === 'CHECK_REQUIRED')
    expect(check?.type === 'CHECK_REQUIRED' && check.check.context).toMatchObject({
      month: 'highsun',
      year: 412,
      weekday: expect.any(String),
      moons: { pale: expect.any(String), ember: expect.any(String) },
      holidays: [],
    })
  })

  it('the Grey Marches: the weather check follows yesterday’s weather (sky.yaml)', () => {
    const { registry } = loadPacks(
      Object.entries(packFiles).map(([path, content]) => ({
        path: path.slice(path.indexOf('grey-marches/')),
        content,
      })),
    )
    const { systems, problems } = travelSystems(registry)
    expect(problems).toEqual([])
    const system = systems.find((s) => s.id === 'grey-marches')!
    expect(Object.keys(system.weather ?? {})).toEqual(['grey-marches/sky'])
    const options = {
      system,
      world: mapWorld(parseMapFile(EXAMPLE_MAPS[0].json).map),
      oracle: createOracleEngine({ registry, random: seeded('sky') }),
      locale: 'en',
      // The weather model's rolls too (without it, Math.random: a different run each time).
      random: seeded('sky-model'),
    }
    let { session } = startTrip({ system, location: '5,7', season: 'winter' })
    const days: string[] = []
    /** What happened since the last day's weather: its dawn comes as the party wakes. */
    let woke: { data?: Record<string, unknown> }[] = []
    for (let day = 0; day < 3; day++) {
      // Far away (Fort Keld): every day starts with its weather check, and a march.
      session = stepTrip(options, session, { type: 'setDestination', place: '15,9' }).state
      const step = stepTrip(options, session, { type: 'travel' })
      const weather = [...woke, ...step.entries].find(
        (e) => e.data?.event === 'WEATHER_CHECK_REQUIRED',
      )
      expect(weather?.data).toMatchObject({ weather: 'grey-marches/sky' })
      days.push(String(step.state.travel.weather))
      const camped = stepTrip(options, step.state, { type: 'action', id: 'camp' })
      session = camped.state
      woke = camped.entries
    }
    // Winter weather from the model's states.
    for (const w of days) expect(['clear', 'grey', 'snow', 'storm']).toContain(w)
    // Winter is a hex flower: the trip knows which of its cells the day is on.
    expect(session.weatherAt).toMatch(/^-?\d,-?\d$/)
  })

  it('the Grey Marches: only the boat crosses the Saltmere', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
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
    const onFoot = stepTrip(options, session, { type: 'setDestination', place: '12,11' }).state
    expect(onFoot.travel.route).toBeUndefined()
    // The boat is only boarded at the water's edge or the ferry (a condition of the mode).
    const inland = startTrip({ system, location: '5,7' }).session
    expect(tripAvailability(options, inland)['mode.boat']).toMatchObject({ condition: 'when' })
    expect(tripAvailability(options, session)['mode.boat']).toBeUndefined()
    const boat = stepTrip(options, session, { type: 'setMode', mode: 'boat' }).state
    expect(boat.travel.mode).toBe('boat')
    const sailing = stepTrip(options, boat, { type: 'setDestination', place: '12,11' }).state
    expect(sailing.travel.route?.at(-1)).toBe('12,11')
  })

  it('values: a region gives danger to its hexes, a hex can override it, icons add theirs', () => {
    const { map } = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    const world = mapWorld(map)
    expect(world.place('10,7')).toMatchObject({ region: 'The Greywood', danger: 2 })
    expect(world.place('14,3')).toMatchObject({ region: 'The Greywood', danger: 5 })
    // Danger grows towards the heart: edge 2, dense forest 3, around the middle 4.
    expect([world.place('12,1')?.danger, world.place('13,2')?.danger]).toEqual([3, 4])
    expect(world.place('5,7')).toMatchObject({
      name: 'Ashford',
      region: 'Ashford Vale',
      icon: { id: 'game:village', guards: 0 },
    })
    expect(world.place('5,7')).not.toHaveProperty('danger')
    expect(map.tokens.find((t) => t.name === 'Brenna')?.fields).toEqual([
      { key: 'fare', value: '2' },
    ])
  })
})

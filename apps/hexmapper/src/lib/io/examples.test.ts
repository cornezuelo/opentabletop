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
} from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { createTravelEngine } from '@open-tabletop/travel-engine'
import { mapWorld } from '../play/world'
import { exampleMaps } from './examples'
import { parseMapFile } from './otd'

/** The maps the bundled systems bring (`maps:` in their `kind: system`). */
const EXAMPLE_MAPS = exampleMaps()

const packFiles = import.meta.glob('../../../../../packs/grey-marches/**/*.{yaml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

describe('example maps', () => {
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
    // The world clock is running: events to come and progress clocks.
    expect(map.world?.events.map((e) => e.name)).toContain('The Iron Clans march on Fort Keld')
    expect(map.world?.clocks.map((c) => `${c.name} ${c.filled}/${c.segments}`)).toEqual([
      'The Greywood Wyrm wakes 1/6',
      'Fort Keld’s unpaid garrison mutinies 3/8',
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

  it('the Grey Marches: the trip pauses at the shrine until Continue', () => {
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
      oracle: createOracleEngine({ registry, random: seeded('shrine') }),
      locale: 'en',
    }
    // From the trail next to the shrine, heading for it.
    let { session } = startTrip({ system, location: '9,3', season: 'summer' })
    session = stepTrip(options, session, { type: 'setDestination', hex: '10,3' }).state
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
    const map = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
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
    const camped = stepTrip(options, session, { type: 'camp' })
    expect(camped.state.stats.fatigue).toBe(1)
    expect(camped.state.travel.resources.food).toBe(5)
    expect(camped.entries.find((e) => e.data?.action === 'camp')?.data?.effects).toEqual({
      'party.stats.fatigue': -1,
    })
    // Lost blocks travel for the rest of the day; a storm, foraging.
    const lost = { ...session, travel: { ...session.travel, today: { lost: true } } }
    expect(tripAvailability({ system, world }, lost).travel).toEqual({ value: 'lost' })
    const storm = { ...session, travel: { ...session.travel, weather: 'storm' } }
    expect(tripAvailability({ system, world }, storm).forage).toEqual({ condition: 'unless' })
    expect(tripAvailability({ system, world }, session)).toEqual({
      'mode.boat': { condition: 'when' }, // Ashford is inland
      'forced-march': { condition: 'when' }, // fatigue 2
      'night-march': { condition: 'when' }, // by day
      rite: { condition: 'when' }, // no shrine here
      grumble: { condition: 'when' }, // nobody went hungry
      parley: { condition: 'when' }, // nobody refuses
    })
  })

  it('the Grey Marches: foraging is an action of their own, once a day', () => {
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
      oracle: createOracleEngine({ registry, random: seeded('forage') }),
      locale: 'en',
    }
    // Ashford is farmland: foraging there is rolled on the Foraging table.
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    const foraged = stepTrip(options, session, { type: 'action', id: 'forage' })
    expect(foraged.entries.map((e) => e.code)).toEqual(['ACTION_TAKEN', 'ORACLE_RESULT'])
    expect(foraged.entries[1].data).toMatchObject({
      event: 'FORAGE_CHECK_REQUIRED',
      table: 'grey-marches/forage',
    })
    expect(foraged.state.travel.speedToday).toBe(0.5)
    const again = stepTrip(options, foraged.state, { type: 'action', id: 'forage' })
    expect(again.entries).toEqual([])
  })

  it('the Grey Marches: by night the party camps, or marches on in the dark', () => {
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
      oracle: createOracleEngine({ registry, random: seeded('night') }),
      locale: 'en',
    }
    const { session } = startTrip({ system, location: '5,7', season: 'summer' })
    const nightfall = calendarOf(system).at(session.travel.day, '20:00')
    const night = { ...session, travel: { ...session.travel, time: nightfall } }
    // By day the night march isn't there (hidden, unavailable); at nightfall, resting,
    // foraging and the forced march are off (daylight), and the night march is on.
    expect(tripAvailability({ system, world: options.world }, session)['night-march']).toEqual({
      condition: 'when',
    })
    const dark = tripAvailability({ system, world: options.world }, night)
    expect(dark.rest).toEqual({ condition: 'when' })
    expect(dark.forage).toEqual({ condition: 'when' })
    expect(dark['forced-march']).toEqual({ condition: 'when' })
    expect(dark['night-march']).toBeUndefined()
    expect(system.rules.actions?.['night-march']).toMatchObject({ hideWhenUnavailable: true })
    // At nightfall a travel order goes nowhere; after a night march it goes on, up to
    // four hours more (never past midnight), at +1 fatigue.
    const planned = stepTrip(options, night, { type: 'setDestination', hex: '9,7' }).state
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
      { ...tripContext(night, {}), daylight: false },
    )
    expect(lost.resolution.text).toBe('Lost in the dark: you stop until dawn')
  })

  it('the Grey Marches: the party’s values drive hunger and the inn', () => {
    const map = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
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
    session.travel.resources.food = 0
    session.stats.morale = 0
    const camped = stepTrip(options, session, {
      type: 'wait',
      until: session.travel.time + 24 * 60,
    })
    expect(camped.entries.some((e) => e.code === 'NIGHT_WITHOUT')).toBe(true)
    const hunger = camped.entries.find((e) => e.data?.event === 'HUNGER_CHECK_REQUIRED')
    expect(hunger?.text).toMatch(/^In the night, /)
    expect(camped.state.stats).toMatchObject({ morale: -1, hirelings: 0 }) // hirelings never below 0 (min: 0)

    // The inn reads the party: a feast needs food; without a trip, nobody is asked.
    const fed = { ...session, stats: { ...session.stats, morale: 3 } }
    fed.travel.resources.food = 4
    const feast = oracle.resolve('grey-marches/inn', tripContext(fed, {}, { spend: 'feast' }))
    expect(feast.resolution.entry).toBe('feast')
    expect(tripChanges(feast.resolution.value)).toEqual([
      ['party.resources.food', -2],
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
      world: mapWorld(parseMapFile(EXAMPLE_MAPS[0].json)),
      rules: system.rules,
      calendar: system.calendar,
    })
    const planned = engine.apply(session.travel, { type: 'setDestination', hex: '7,7' }).state
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
      world: mapWorld(parseMapFile(EXAMPLE_MAPS[0].json)),
      oracle: createOracleEngine({ registry, random: seeded('sky') }),
      locale: 'en',
    }
    let { session } = startTrip({ system, location: '5,7', season: 'winter' })
    const days: string[] = []
    for (let day = 0; day < 3; day++) {
      // Far away (Fort Keld): every day starts with a march, and its weather check.
      session = stepTrip(options, session, { type: 'setDestination', hex: '15,9' }).state
      const step = stepTrip(options, session, { type: 'travel' })
      const weather = step.entries.find((e) => e.data?.event === 'WEATHER_CHECK_REQUIRED')
      expect(weather?.data).toMatchObject({ weather: 'grey-marches/sky' })
      days.push(String(step.state.travel.weather))
      session = stepTrip(options, step.state, { type: 'camp' }).state
    }
    // Winter weather from the model's states.
    for (const w of days) expect(['clear', 'grey', 'snow', 'storm']).toContain(w)
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
    // The boat is only boarded at the water's edge or the ferry (a condition of the mode).
    const inland = startTrip({ system, location: '5,7' }).session
    expect(tripAvailability(options, inland)['mode.boat']).toEqual({ condition: 'when' })
    expect(tripAvailability(options, session)['mode.boat']).toBeUndefined()
    const boat = stepTrip(options, session, { type: 'setMode', mode: 'boat' }).state
    expect(boat.travel.mode).toBe('boat')
    const sailing = stepTrip(options, boat, { type: 'setDestination', hex: '12,11' }).state
    expect(sailing.travel.route?.at(-1)).toBe('12,11')
  })

  it('values: a region gives danger to its hexes, a hex can override it, icons add theirs', () => {
    const map = parseMapFile(EXAMPLE_MAPS.find((m) => m.id === 'greymarches1')!.json)
    const world = mapWorld(map)
    expect(world.cell('10,7')).toMatchObject({ region: 'The Greywood', danger: 2 })
    expect(world.cell('14,3')).toMatchObject({ region: 'The Greywood', danger: 5 })
    // Danger grows towards the heart: edge 2, dense forest 3, around the middle 4.
    expect([world.cell('12,1')?.danger, world.cell('13,2')?.danger]).toEqual([3, 4])
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

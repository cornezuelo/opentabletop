import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import {
  calendarOf,
  startTrip,
  stepTrip,
  systemName,
  tripFacts,
  travelSystems,
  type SessionState,
} from '@open-tabletop/session'
import { calendarFacts, type TravelWorld } from '@open-tabletop/travel-engine'
import { seeded } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from './bundled'
import { engineFiles } from './workspace'

describe('bundled open packs', () => {
  const { registry, diagnostics } = loadPacks(engineFiles(bundledPacks.filter((p) => !p.personal)))

  it('load without problems', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
  })

  it('roll every definition, also translated', () => {
    const engine = createOracleEngine({ registry, random: seeded('open-packs') })
    for (const def of engine.list()) {
      const outcome =
        def.kind === 'deck'
          ? engine.draw(def.id, undefined, {}, { locale: 'es' })
          : engine.resolve(def.id, {}, undefined, { locale: 'es' })
      expect(outcome.resolution.text, def.id).toBeTruthy()
    }
  })

  /** A row of hexes "0"…"n-1" with what each one holds; roads join them when asked. */
  function row(cells: Record<string, unknown>[], road = false): TravelWorld {
    const n = cells.length
    return {
      hexKm: 10,
      cell: (hex) => (cells[Number(hex)] as ReturnType<TravelWorld['cell']>) ?? null,
      neighbors: (hex) =>
        [Number(hex) - 1, Number(hex) + 1].filter((i) => i >= 0 && i < n).map(String),
      distance: (x, y) => Math.abs(Number(x) - Number(y)),
      edges: () => (road ? ['road'] : []),
    }
  }

  const marches = () => travelSystems(registry).systems.find((s) => s.id === 'grey-marches')!

  it('the Grey Marches declare their system: its parts, its packs and its name in Spanish', () => {
    const system = marches()
    expect(system).toMatchObject({
      pack: 'grey-marches',
      packs: ['grey-marches', 'core'],
      sources: {
        rules: { pack: 'grey-marches', id: 'default' },
        bindings: { pack: 'grey-marches', id: 'default' },
      },
    })
    expect(Object.keys(system.weather ?? {})).toEqual(['grey-marches/sky'])
    expect(system.calendar?.def.id).toBe('marcher-reckoning')
    expect(systemName(system, 'es')).toBe('Las Marcas Grises')
    expect(systemName(system, 'en')).toBe('The Grey Marches')
  })

  it('the Grey Marches: a toll by road costs food, and a landmark waits for you', () => {
    const { problems } = travelSystems(registry)
    expect(problems.map(formatDiagnostic)).toEqual([])
    const system = marches()
    const world = row(
      [
        { terrain: 'plains', tags: [] },
        { terrain: 'plains', tags: ['toll'] },
        { terrain: 'plains', tags: ['landmark'] },
      ],
      true,
    )
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry, random: seeded('marches-trip') }),
      locale: 'en',
    }
    let { session } = startTrip({ system, location: '0', season: 'summer' })
    session = stepTrip(options, session, { type: 'setDestination', hex: '2' }).state
    const { state, entries } = stepTrip(options, session, { type: 'travel' })
    const toll = entries.find((e) => e.data?.event === 'TOLL_CHECK_REQUIRED')
    expect(toll?.code).toBe('ORACLE_RESULT')
    expect(state.travel.pendingChecks.map((c) => c.event)).toEqual(['LANDMARK_CHECK_REQUIRED'])
    // A roll-under against Charisma (one d6 for both entries): with none, the toll is paid.
    expect(toll?.data?.value).toMatchObject({ effects: { 'party.resources.food': -1 } })
    expect(state.travel.resources.food).toBe(5)
  })

  it('the Grey Marches: the toll is a d6 under Charisma, one d6 for both entries', () => {
    const engine = createOracleEngine({ registry, random: seeded('toll') })
    const toll = (charisma: number) =>
      engine.resolve('grey-marches/toll', { party: { stats: { charisma } } }).resolution
    for (let i = 0; i < 10; i++) {
      expect(toll(0).entry).toBe('pay')
      expect(toll(6).entry).toBe('wave')
    }
    const rolls = Array.from({ length: 30 }, () => toll(3))
    // Always exactly one entry, the d6 shown on the card, and both outcomes over time.
    for (const r of rolls) {
      expect(r.rolls).toHaveLength(1)
      expect(r.entry).toBe(r.rolls[0].total <= 3 ? 'wave' : 'pay')
    }
    expect(new Set(rolls.map((r) => r.entry))).toEqual(new Set(['pay', 'wave']))
  })

  it('the Grey Marches: peaks open in summer but not in snow, lakes freeze in deep winter', () => {
    const system = marches()
    const route = (
      cells: Record<string, unknown>[],
      season: string,
      weather?: string,
    ): string[] | undefined => {
      const options = {
        system,
        world: row(cells),
        oracle: createOracleEngine({ registry, random: seeded('passes') }),
        locale: 'en',
      }
      let { session } = startTrip({ system, location: '0', season })
      if (weather) session = { ...session, travel: { ...session.travel, weather } }
      return stepTrip(options, session, { type: 'setDestination', hex: '2' }).state.travel.route
    }
    const peaks = [{ terrain: 'plains' }, { terrain: 'peaks' }, { terrain: 'plains' }]
    expect(route(peaks, 'summer')).toEqual(['0', '1', '2'])
    expect(route(peaks, 'summer', 'snow')).toBeUndefined()
    expect(route(peaks, 'spring')).toBeUndefined()
    const lake = [{ terrain: 'plains' }, { terrain: 'lake', water: true }, { terrain: 'plains' }]
    expect(route(lake, 'winter')).toEqual(['0', '1', '2'])
    expect(route(lake, 'autumn')).toBeUndefined()
  })

  it('the Grey Marches: unless keeps the Vale patrol off the night, and an old ruin untold', () => {
    const engine = createOracleEngine({ registry, random: seeded('unless') })
    const met = (timeOfDay: string) =>
      Array.from(
        { length: 40 },
        () =>
          engine.resolve('grey-marches/encounter', { region: 'Ashford Vale', timeOfDay, danger: 0 })
            .resolution.entry,
      )
    expect(met('day')).toContain('patrol')
    expect(met('night')).not.toContain('patrol')
    for (let i = 0; i < 20; i++) {
      const { value, text } = engine.resolve('grey-marches/ruin-delve', {}).resolution
      expect(!!text?.includes('No one has set foot here')).toBe((value.untouched as number) >= 90)
    }
    const es = createOracleEngine({ registry, random: seeded('ruin'), locale: 'es' })
    for (let i = 0; i < 20; i++) {
      const { value, text } = es.resolve('grey-marches/ruin-delve', {}).resolution
      expect(text).toContain(`peligro ${value.danger as number} de 6`)
      expect(!!text?.includes('Nadie ha puesto un pie')).toBe((value.untouched as number) >= 90)
      expect(text).not.toMatch(/No one|A trap/)
    }
  })

  it('the Grey Marches: encounters come entering a hex and resting somewhere dangerous', () => {
    const system = marches()
    const rested = (danger: number) => {
      const options = {
        system,
        world: row([{ terrain: 'forest', danger }]),
        oracle: createOracleEngine({ registry, random: seeded('rest') }),
        locale: 'en',
      }
      const { session } = startTrip({ system, location: '0', season: 'summer' })
      return stepTrip(options, session, { type: 'action', id: 'rest' }).entries.some(
        (e) => e.data?.event === 'ENCOUNTER_CHECK_REQUIRED',
      )
    }
    expect(rested(3)).toBe(true)
    expect(rested(1)).toBe(false)
  })

  describe('the Grey Marches show off their conditions', () => {
    const system = marches()
    const play = (cells: Record<string, unknown>[], road = false, seed = 'show') => ({
      system,
      world: row(cells, road),
      oracle: createOracleEngine({ registry, random: seeded(seed) }),
      locale: 'en',
    })
    const took = (entries: { code: string; data?: Record<string, unknown> }[], id: string) =>
      entries.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === id)

    it('deep snow (set by the weather) leaves the horses behind', () => {
      const sky = registry.extras.get('grey-marches')!.find((e) => e.id === 'sky')!
      expect((sky.data as { states: Record<string, { set?: object }> }).states.snow.set).toEqual({
        snowbound: true,
      })
      const options = play([{ terrain: 'plains' }, { terrain: 'plains' }])
      let { session } = startTrip({ system, location: '0', season: 'winter' })
      session = stepTrip(options, session, { type: 'setMode', mode: 'horse' }).state
      session = stepTrip(options, session, { type: 'setDestination', hex: '1' }).state
      session = { ...session, travel: { ...session.travel, today: { snowbound: true } } }
      const mounted = stepTrip(options, session, { type: 'travel' })
      expect(mounted.state.travel.location).toBe('0')
      session = stepTrip(options, mounted.state, { type: 'setMode', mode: 'foot' }).state
      expect(session.travel.mode).toBe('foot')
    })

    it('a cart only goes by road', () => {
      const plains = [{ terrain: 'plains' }, { terrain: 'plains' }]
      for (const road of [true, false]) {
        const options = play(plains, road)
        let { session } = startTrip({ system, location: '0', season: 'summer' })
        session = stepTrip(options, session, { type: 'setMode', mode: 'cart' }).state
        const route = stepTrip(options, session, { type: 'setDestination', hex: '1' }).state.travel
          .route
        expect(!!route, `road: ${road}`).toBe(road)
      }
    })

    it('a forced march goes faster and tires, only while fresh', () => {
      const options = play([{ terrain: 'plains' }])
      const fresh = startTrip({ system, location: '0', season: 'summer' }).session
      const { state, entries } = stepTrip(options, fresh, { type: 'action', id: 'forced-march' })
      expect(took(entries, 'forced-march')).toBe(true)
      expect(state.stats.fatigue).toBe(1)
      expect(state.travel.speedToday).toBe(1.5)
      const tired = { ...fresh, stats: { ...fresh.stats, fatigue: 2 } }
      expect(
        took(
          stepTrip(options, tired, { type: 'action', id: 'forced-march' }).entries,
          'forced-march',
        ),
      ).toBe(false)
    })

    it('the rite of the Ember Moon: at a shrine, only under the full moon', () => {
      const calendar = calendarOf(system)
      const days = Array.from({ length: 120 }, (_, i) => i + 1)
      const phase = (day: number) =>
        (
          calendarFacts(calendar.describe(calendar.at(day, '06:00'))).moons as Record<
            string,
            string
          >
        ).ember
      const full = days.find((d) => phase(d) === 'full')!
      const other = days.find((d) => phase(d) !== 'full')!
      const rite = (day: number, tags: string[]) => {
        const options = play([{ terrain: 'plains', tags }])
        const { session } = startTrip({
          system,
          location: '0',
          time: calendar.at(day, '06:00'),
          stats: { morale: 1, fatigue: 3 },
        })
        return stepTrip(options, session, { type: 'action', id: 'rite' })
      }
      const done = rite(full, ['shrine'])
      expect(took(done.entries, 'rite')).toBe(true)
      expect(done.state.stats).toMatchObject({ morale: 3, fatigue: 0 })
      expect(took(rite(other, ['shrine']).entries, 'rite')).toBe(false)
      expect(took(rite(full, []).entries, 'rite')).toBe(false)
    })

    it('hirelings refuse to march after a hungry day, and a d6 under morale talks them round', () => {
      const options = play([{ terrain: 'plains' }, { terrain: 'plains' }])
      const start = (morale: number, seed?: string) => {
        const { session } = startTrip({
          system,
          location: '0',
          season: 'summer',
          stats: { hirelings: 2, morale },
          seed,
        })
        // No food: the day ends hungry; the next dawn they grumble.
        const hungry = {
          ...session,
          travel: { ...session.travel, resources: { food: 0, fodder: 6 } },
        }
        return stepTrip(options, hungry, { type: 'wait', until: session.travel.time + 1440 + 60 })
          .state
      }
      const refusing = start(6)
      expect(refusing.travel.today?.refusing).toBe(true)
      const blocked = stepTrip(
        options,
        stepTrip(options, refusing, { type: 'setDestination', hex: '1' }).state,
        {
          type: 'travel',
        },
      )
      expect(blocked.state.travel.location).toBe('0')
      const talked = stepTrip(options, refusing, { type: 'action', id: 'parley' }).state
      expect(talked.travel.today?.refusing).toBe(false)
      // Morale 6: any d6 is at or under it. Morale 0: none is.
      expect(talked.stats.hirelings).toBe(2)
      // (Morale set to 0 after the hungry night, whose own table may cost a hireling.)
      const sulking = start(1)
      const low = stepTrip(
        options,
        { ...sulking, stats: { ...sulking.stats, morale: 0 } },
        { type: 'action', id: 'parley' },
      ).state
      expect(low.stats.hirelings).toBe(1)
      // Morale 3: each trip rolls its own d6; the same talk again is the same roll.
      const kept = (seed: string) =>
        stepTrip(options, start(3, seed), { type: 'action', id: 'parley' }).state.stats.hirelings
      const outcomes = Array.from({ length: 12 }, (_, i) => kept(`talk-${i}`))
      expect(new Set(outcomes)).toEqual(new Set([1, 2]))
      expect(outcomes.map((_, i) => kept(`talk-${i}`))).toEqual(outcomes)
    })

    it('tales of the road: once a trip, after 50 km, from nightfall', () => {
      const options = play(
        Array.from({ length: 8 }, () => ({ terrain: 'plains' })),
        true,
        'tale',
      )
      const calendar = calendarOf(system)
      let { session } = startTrip({ system, location: '0', season: 'summer', stats: { morale: 2 } })
      const nightfall = () => calendar.at(session.travel.day, '20:00')
      const tale = () => stepTrip(options, session, { type: 'action', id: 'tale' })
      // The first day's march, by road: 30 km by nightfall, not far enough yet.
      session = stepTrip(options, session, { type: 'setDestination', hex: '7' }).state
      session = stepTrip(options, session, { type: 'travel', by: nightfall() }).state
      expect(session.travel.totals?.hexes).toBe(3)
      expect(took(tale().entries, 'tale')).toBe(false)
      // Two more days along the road: past 50 km, it can be told once, by night only.
      session = stepTrip(options, session, {
        type: 'travel',
        by: calendar.at(session.travel.day + 2, '20:00'),
      }).state
      expect(session.travel.totals!.hexes * 10).toBeGreaterThanOrEqual(50)
      const told = tale()
      expect(took(told.entries, 'tale')).toBe(true)
      expect(told.state.stats.morale).toBe(session.stats.morale + 1)
      expect(told.state.travel.totals?.taken.tale).toBe(1)
      expect(
        took(stepTrip(options, told.state, { type: 'action', id: 'tale' }).entries, 'tale'),
      ).toBe(false)
    })

    it('a restless watch with low morale', () => {
      const options = play([{ terrain: 'plains' }], false, 'watch')
      const camp = (morale: number) => {
        const { session } = startTrip({
          system,
          location: '0',
          season: 'summer',
          stats: { morale, fatigue: 2 },
        })
        return stepTrip(options, session, { type: 'action', id: 'camp' }).state.stats.fatigue
      }
      expect(camp(3)).toBe(1)
      expect(camp(1)).toBe(2)
    })
  })

  describe('the Grey Marches use it all', () => {
    const system = marches()
    type Entry = { code: string; data?: Record<string, unknown>; text?: string }
    const play = (cells: Record<string, unknown>[], road = false, seed = 'all') => ({
      system,
      world: row(cells, road),
      oracle: createOracleEngine({ registry, random: seeded(seed) }),
      locale: 'en',
    })
    const took = (entries: Entry[], id: string) =>
      entries.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === id)
    const checked = (entries: Entry[], event: string) =>
      entries.filter((e) => e.data?.event === event).length
    const plains = (n: number) => Array.from({ length: n }, () => ({ terrain: 'plains' }))

    it('camp and rest while fatigue is under the party’s Endurance (a variable)', () => {
      const options = play(plains(1))
      const rest = (fatigue: number, endurance: number) =>
        took(
          stepTrip(
            options,
            startTrip({ system, location: '0', season: 'summer', stats: { fatigue, endurance } })
              .session,
            { type: 'action', id: 'rest' },
          ).entries,
          'rest',
        )
      expect(rest(10, 12)).toBe(true)
      expect(rest(10, 10)).toBe(false)
      expect(rest(9, 10)).toBe(true)
      expect(system.bindings?.stats?.endurance?.default).toBe(10)
    })

    it('each hireling eats a ration too (an amount that is a variable)', () => {
      const options = play(plains(1))
      const eaten = (hirelings: number) => {
        const { session } = startTrip({
          system,
          location: '0',
          season: 'summer',
          stats: { hirelings },
        })
        const until = calendarOf(system).at(session.travel.day + 1, '01:00')
        return 6 - stepTrip(options, session, { type: 'wait', until }).state.travel.resources.food
      }
      expect(eaten(0)).toBe(1)
      expect(eaten(2)).toBe(3)
    })

    it('a stealthy party crosses the safer hexes unseen (danger against Stealth)', () => {
      const met = (danger: number, stealth: number) => {
        const options = play([{ terrain: 'plains' }, { terrain: 'plains', danger }])
        let { session } = startTrip({
          system,
          location: '0',
          season: 'summer',
          stats: { stealth, navigation: 20 },
        })
        session = stepTrip(options, session, { type: 'setDestination', hex: '1' }).state
        return checked(
          stepTrip(options, session, { type: 'travel' }).entries,
          'ENCOUNTER_CHECK_REQUIRED',
        )
      }
      expect(met(1, 0)).toBe(1)
      expect(met(1, 1)).toBe(0)
      expect(met(2, 1)).toBe(1)
    })

    it('fishing next to water: a d6 under Survival, the roll in the text', () => {
      expect(
        took(
          stepTrip(
            play(plains(2)),
            startTrip({ system, location: '0', season: 'summer' }).session,
            {
              type: 'action',
              id: 'fish',
            },
          ).entries,
          'fish',
        ),
      ).toBe(false)
      const caught = new Set<number>()
      for (let i = 0; i < 24; i++) {
        const options = play(
          [{ terrain: 'plains' }, { terrain: 'lake', water: true }],
          false,
          `fish-${i}`,
        )
        const { session } = startTrip({
          system,
          location: '0',
          season: 'summer',
          stats: { survival: 2 },
        })
        const { state, entries } = stepTrip(options, session, { type: 'action', id: 'fish' })
        expect(took(entries, 'fish')).toBe(true)
        const result = entries.find((e) => e.data?.event === 'FISHING_CHECK_REQUIRED')!
        const roll = Number(/^A (\d)/.exec(result.text ?? '')?.[1])
        const gained = state.travel.resources.food - 6
        // At or under Survival (2): two days; 3: one; over: nothing.
        expect(gained).toBe(roll <= 2 ? 2 : roll <= 3 ? 1 : 0)
        caught.add(gained)
      }
      expect(caught).toEqual(new Set([0, 1, 2]))
    })

    it('market day: in a market town on Marketday, or on the world clock’s market day', () => {
      const calendar = calendarOf(system)
      const weekday = (day: number) =>
        calendarFacts(calendar.describe(calendar.at(day, '06:00'))).weekday
      const market = Array.from({ length: 7 }, (_, i) => i + 1).find(
        (d) => weekday(d) === 'marketday',
      )!
      const other = market + 1
      const trade = (day: number, tags: string[], facts?: Record<string, unknown>) => {
        const options = { ...play([{ terrain: 'farmland', tags }]), facts }
        const { session } = startTrip({ system, location: '0', time: calendar.at(day, '08:00') })
        return stepTrip(options, session, { type: 'action', id: 'market' })
      }
      const traded = trade(market, ['market'])
      expect(took(traded.entries, 'market')).toBe(true)
      expect(traded.state.travel.resources).toMatchObject({ food: 9, fodder: 8 })
      expect(took(trade(market, []).entries, 'market')).toBe(false)
      expect(took(trade(other, ['market']).entries, 'market')).toBe(false)
      const fair = { events: ['market-day-in-ashford'] }
      expect(took(trade(other, ['market'], fair).entries, 'market')).toBe(true)
    })

    it('a long day: marching past the day’s hours tires the party as it ends', () => {
      const options = play(plains(12), false, 'long')
      const calendar = calendarOf(system)
      const day = (nightMarch: boolean) => {
        let { session } = startTrip({ system, location: '0', season: 'summer' })
        const first = session.travel.day
        const entries: Entry[] = []
        const step = (action: Parameters<typeof stepTrip>[2]) => {
          const out = stepTrip(options, session, action)
          entries.push(...out.entries)
          session = out.state
        }
        step({ type: 'setDestination', hex: '11' })
        step({ type: 'travel', by: calendar.at(session.travel.day, '20:00') })
        if (nightMarch) {
          step({ type: 'action', id: 'night-march' })
          step({ type: 'travel', until: 'destination' })
        }
        step({ type: 'wait', until: calendar.at(first + 1, '05:00') })
        return checked(entries, 'LONG_DAY')
      }
      expect(day(false)).toBe(0)
      expect(day(true)).toBe(1)
    })

    it('homesick on the tenth day of a trip (`trip.day`)', () => {
      const options = play(plains(1))
      const { session } = startTrip({ system, location: '0', season: 'summer' })
      let state: SessionState = {
        ...session,
        travel: { ...session.travel, resources: { food: 99, fodder: 99 } },
      }
      const calendar = calendarOf(system)
      const days: number[] = []
      // Each dawn of the trip's days 2 to 11.
      for (let d = 2; d <= 11; d++) {
        const out = stepTrip(options, state, {
          type: 'wait',
          until: calendar.at(session.travel.day + d - 1, '07:00'),
        })
        if (checked(out.entries, 'HOMESICK')) days.push(d)
        state = out.state
      }
      expect(days).toEqual([10])
    })

    it('the shrine only the first time, and going in circles the third', () => {
      const options = play([{ terrain: 'plains' }, { terrain: 'plains', tags: ['shrine'] }], true)
      let { session } = startTrip({ system, location: '0', season: 'summer' })
      // On horseback, so the four moves fit in a day.
      session = stepTrip(options, session, { type: 'setMode', mode: 'horse' }).state
      const shrines: number[] = []
      const circles: number[] = []
      for (let move = 1; move <= 4; move++) {
        session = stepTrip(options, session, {
          type: 'setDestination',
          hex: move % 2 ? '1' : '0',
        }).state
        const out = stepTrip(options, session, { type: 'travel' })
        session = out.state
        for (const check of session.travel.pendingChecks)
          session = stepTrip(options, session, { type: 'resolveCheck', id: check.id }).state
        if (checked(out.entries, 'SHRINE_CHECK_REQUIRED')) shrines.push(move)
        if (checked(out.entries, 'IN_CIRCLES')) circles.push(move)
      }
      // The start is the first visit to 0: back there the second time on move 2, the third on 4.
      expect(shrines).toEqual([1])
      expect(circles).toEqual([4])
    })

    it('leaving the Greywood raises morale (`from.region`)', () => {
      const leave = (cells: Record<string, unknown>[]) => {
        const options = play(cells, true)
        let { session } = startTrip({ system, location: '0', season: 'summer' })
        session = stepTrip(options, session, { type: 'setDestination', hex: '1' }).state
        return checked(stepTrip(options, session, { type: 'travel' }).entries, 'OUT_OF_THE_WOOD')
      }
      const wood = { terrain: 'forest', region: 'The Greywood' }
      expect(leave([wood, { terrain: 'plains' }])).toBe(1)
      expect(leave([{ terrain: 'plains' }, wood])).toBe(0)
      expect(leave([wood, wood])).toBe(0)
    })

    it('the gates: Talking your way in when Charisma beats the guards (a roll mode with a variable)', () => {
      const engine = createOracleEngine({ registry, random: seeded('gates') })
      const mode = (context: Record<string, unknown>) =>
        engine.resolve('grey-marches/gates', context).resolution.mode
      expect(mode({ party: { stats: { charisma: 3 } }, icon: { guards: 2 } })).toBe(
        'grey-marches/charm',
      )
      expect(mode({ party: { stats: { charisma: 2 } }, icon: { guards: 2 } })).toBeUndefined()
      expect(mode({ icon: { guards: 2 } })).toBeUndefined()
    })

    it('someone on the road wants what fits who they are; a ruin’s guardian is as dangerous as it', () => {
      const engine = createOracleEngine({ registry, random: seeded('npcs') })
      const own: Record<string, string> = {
        pilgrim: 'is bound for the wayside shrine in the Greywood',
        deserter: 'is running from Fort Keld and begs you not to tell',
        witch: 'gathers herbs and will brew a cordial for a song',
      }
      const seen = new Set<string>()
      for (let i = 0; i < 200; i++) {
        const { value } = engine.resolve('grey-marches/npc').resolution
        const role = (value.role as { id: string }).id
        const want = (value.want as { text: string }).text
        seen.add(role)
        for (const [who, text] of Object.entries(own)) if (want === text) expect(role).toBe(who)
        if (role === 'deserter') expect(want).not.toBe('wants an escort to Fort Keld')
      }
      expect(seen.size).toBe(5)
      for (let i = 0; i < 20; i++) {
        const ruin = engine.resolve('grey-marches/ruin-delve').resolution
        const guardian = ruin.children.find((c) => c.source === 'grey-marches/encounter')!
        expect(guardian.context.danger).toBe(ruin.value.danger)
        expect(guardian.context.timeOfDay).toBe('night')
      }
    })

    it('foraging in the dawn watch is rolled with advantage (the calendar’s watches)', () => {
      const calendar = calendarOf(system)
      const engine = createOracleEngine({ registry, random: seeded('dawn') })
      const mode = (hour: string) => {
        const { session } = startTrip({ system, location: '0', time: calendar.at(100, hour) })
        const context = tripFacts(play([{ terrain: 'plains' }]), session)
        return engine.resolve('grey-marches/forage', context).resolution.mode
      }
      expect(mode('06:00')).toBe('core/advantage')
      expect(mode('07:59')).toBe('core/advantage')
      expect(mode('09:00')).toBeUndefined()
    })

    it('a carter takes the party two hexes along the road in two hours (an advance step)', () => {
      const options = play(plains(5), true)
      let { session } = startTrip({ system, location: '0', season: 'summer' })
      session = stepTrip(options, session, { type: 'setDestination', hex: '4' }).state
      const { state, entries } = stepTrip(options, session, { type: 'action', id: 'carter' })
      expect(took(entries, 'carter')).toBe(true)
      expect(state.travel.location).toBe('2')
      expect(state.travel.time).toBe(session.travel.time + 120)
      expect(state.travel.totals?.hexes).toBe(2)
      expect(
        took(stepTrip(options, state, { type: 'action', id: 'carter' }).entries, 'carter'),
      ).toBe(false)
      // Off the road there's no carter.
      const wild = play(plains(5))
      let off = startTrip({ system, location: '0', season: 'summer' }).session
      off = stepTrip(wild, off, { type: 'setDestination', hex: '4' }).state
      expect(took(stepTrip(wild, off, { type: 'action', id: 'carter' }).entries, 'carter')).toBe(
        false,
      )
    })

    it('the Wyrm roams the Greywood once the world clock says it wakes', () => {
      const met = (filled: number) =>
        Array.from({ length: 60 }, (_, i) =>
          createOracleEngine({ registry, random: seeded(`wyrm-${i}`) }).resolve(
            'grey-marches/encounter',
            {
              terrain: 'forest',
              danger: 3,
              world: { clocks: { 'the-greywood-wyrm-wakes': filled } },
            },
          ),
        ).some((o) => o.resolution.entry === 'wyrm')
      expect(met(5)).toBe(false)
      expect(met(6)).toBe(true)
    })
  })

  it('the Grey Marches: an oracle resolves the ford, with its input from the bindings', () => {
    const system = marches()
    const world = row([{ terrain: 'plains' }, { terrain: 'plains', tags: ['ford'] }])
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry, random: seeded('ford') }),
      locale: 'en',
    }
    let { session } = startTrip({ system, location: '0', season: 'summer' })
    session = stepTrip(options, session, { type: 'setDestination', hex: '1' }).state
    const { entries } = stepTrip(options, session, { type: 'travel' })
    const ford = entries.find((e) => e.data?.event === 'FORD_CHECK_REQUIRED')
    expect(ford?.data?.value).toMatchObject({ odds: 'even' })
  })

  it('the Grey Marches: foraging for food says when there is nothing to find, and how much was found', () => {
    const system = marches()
    const world = row([{ terrain: 'hills' }, { terrain: 'forest' }])
    for (const locale of ['en', 'es']) {
      const options = {
        system,
        world,
        oracle: createOracleEngine({ registry, random: seeded(`forage-${locale}`) }),
        locale,
      }
      // On the hills the check doesn't apply: the action says it rolled nothing.
      const { session } = startTrip({ system, location: '0', season: 'summer' })
      const hills = stepTrip(options, session, { type: 'action', id: 'forage' }).entries
      expect(hills.map((e) => [e.code, e.data?.checks])).toEqual([['ACTION_TAKEN', 0]])
      // In the forest it rolls, and the food in the text is the food gained.
      for (let i = 0; i < 20; i++) {
        const { session } = startTrip({ system, location: '1', season: 'summer' })
        session.stats.survival = 6
        const { state, entries } = stepTrip(options, session, { type: 'action', id: 'forage' })
        const result = entries.find((e) => e.code === 'ORACLE_RESULT')!
        const gained = state.travel.resources.food - session.travel.resources.food
        expect(gained).toBeGreaterThanOrEqual(2)
        expect(result.text).toContain(String(gained))
      }
    }
  })

  it('the Grey Marches: getting lost is easier under clear skies (not in forests) and harder the day after', () => {
    const engine = createOracleEngine({ registry, random: seeded('lost') })
    const twice = (context: Record<string, unknown>) =>
      !!engine.resolve('grey-marches/getting-lost', context).resolution.rolls[0].discarded
    expect(twice({ weather: 'grey' })).toBe(false)
    expect(twice({ weather: 'clear' })).toBe(true)
    expect(twice({ weather: 'clear', terrain: 'dense-forest' })).toBe(false)
    expect(twice({ yesterday: { lost: true } })).toBe(true)
    expect(twice({ weather: 'clear', yesterday: { lost: true } })).toBe(false)
  })

  it('the Grey Marches: roll modes from Core and of their own', () => {
    const engine = createOracleEngine({ registry, random: seeded('modes') })
    const reaction = registry.definitions.get('grey-marches/reaction')
    expect(reaction?.kind === 'table' && reaction.modes).toEqual([
      'core/advantage',
      'core/disadvantage',
    ])
    // Crossing carefully: three rolls, the middle one kept.
    const ford = engine.resolve('grey-marches/ford', { odds: 'high' }, undefined, {
      mode: 'grey-marches/careful',
    }).resolution
    expect(ford.mode).toBe('grey-marches/careful')
    const totals = [ford.rolls[0].total, ...ford.rolls[0].discarded!.map((d) => d.total)].sort(
      (a, b) => a - b,
    )
    expect(totals[1]).toBe(ford.rolls[0].total)
  })

  it('the Grey Marches: rules, stats, calendar, weather and roll modes translated in locales/', () => {
    const system = marches()
    const es = (text: unknown) => (text as Record<string, string> | undefined)?.es
    expect(
      es(system.rules.actions?.forage && (system.rules.actions.forage as { name?: unknown }).name),
    ).toBe('Buscar comida')
    expect(es(system.rules.checks?.find((c) => c.event === 'FORAGE_CHECK_REQUIRED')?.name)).toBe(
      'Buscar comida',
    )
    expect(es(system.bindings?.stats?.survival?.name)).toBe('Supervivencia')
    expect(es(system.rules.modes.horse.name)).toBe('A caballo')
    expect(es(system.rules.resources?.fodder?.name)).toBe('Forraje')
    expect(es(system.calendar?.def.months[0].name)).toBe('Deshielo')
    expect(es(system.weather?.['grey-marches/sky']?.states.clear.name)).toBe('Cielo despejado')
    expect(es(registry.rollModes.get('grey-marches/careful')?.name)).toBe('Con cuidado')
  })

  it('the Grey Marches: fatigue is their own rule, written as day-end checks with effects', () => {
    const system = marches()
    const world = row([{ terrain: 'plains' }, { terrain: 'plains' }])
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry, random: seeded('fatigue') }),
      locale: 'en',
    }
    const { session } = startTrip({ system, location: '0', season: 'summer' })
    expect(session.stats.fatigue).toBe(0)
    // A night with no food: no camping (camp needs food), the night passes in the open; the
    // day ended short, fatigue +1, and hunger is rolled.
    const hungry = { ...session, travel: { ...session.travel, resources: { food: 0, fodder: 0 } } }
    const night = stepTrip(options, hungry, {
      type: 'wait',
      until: session.travel.time + 24 * 60,
    })
    expect(night.entries).toContainEqual(
      expect.objectContaining({
        code: 'CHECK_EFFECTS',
        data: expect.objectContaining({ event: 'HUNGRY_DAY' }),
      }),
    )
    expect(night.entries.some((e) => e.code === 'NIGHT_WITHOUT')).toBe(true)
    expect(
      night.entries.some(
        (e) => e.code === 'ORACLE_RESULT' && e.data?.event === 'HUNGER_CHECK_REQUIRED',
      ),
    ).toBe(true)
    expect(night.state.stats.fatigue).toBeGreaterThanOrEqual(1)
    // A fed night eases it, never below 0.
    const fed = {
      ...night.state,
      travel: { ...night.state.travel, resources: { food: 5, fodder: 0 } },
    }
    const tired = night.state.stats.fatigue
    const rested = stepTrip(options, fed, { type: 'camp' }).state
    expect(rested.stats.fatigue).toBe(tired - 1)
    const fresh = stepTrip(options, { ...session }, { type: 'camp' }).state
    expect(fresh.stats.fatigue).toBe(0)
  })

  describe('the Grey Marches camp and rest only with food left and fatigue under 10', () => {
    const system = marches()
    const options = {
      system,
      world: row(Array.from({ length: 30 }, () => ({ terrain: 'plains' }))),
      oracle: createOracleEngine({ registry, random: seeded('camp-rest') }),
      locale: 'en',
      // The weather too: every run the same.
      random: seeded('camp-rest-weather'),
    }
    const trip = (food: number, fatigue: number): SessionState => {
      const { session } = startTrip({ system, location: '0', season: 'summer' })
      return {
        ...session,
        stats: { ...session.stats, fatigue },
        travel: { ...session.travel, resources: { food, fodder: 0 } },
      }
    }
    const took = (entries: { code: string; data?: Record<string, unknown> }[], id: string) =>
      entries.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === id)

    it('rests with food and fatigue under 10: two hours, fatigue −1', () => {
      const before = trip(3, 4)
      const { state, entries } = stepTrip(options, before, { type: 'action', id: 'rest' })
      expect(took(entries, 'rest')).toBe(true)
      expect(state.travel.time).toBe(before.travel.time + 120)
      expect(state.stats.fatigue).toBe(3)
    })

    for (const [food, fatigue, why] of [
      [0, 4, 'hungry'],
      [3, 10, 'exhausted'],
      [0, 12, 'both'],
    ] as const)
      it(`can’t rest or camp ${why} (food ${food}, fatigue ${fatigue}): nothing happens`, () => {
        const before = trip(food, fatigue)
        for (const id of ['rest', 'camp']) {
          const { state, entries } = stepTrip(options, before, { type: 'action', id })
          expect(took(entries, id)).toBe(false)
          expect(state.travel.time).toBe(before.travel.time)
          expect(state.stats.fatigue).toBe(fatigue)
        }
      })

    it('at nightfall, fed, the party camps; hungry or exhausted, the night passes without it', () => {
      const night = (food: number, fatigue: number) => {
        const before = trip(food, fatigue)
        const nightfall = before.travel.time + 14 * 60
        return stepTrip(options, before, { type: 'wait', until: nightfall + 60 })
      }
      const fed = night(3, 4)
      expect(took(fed.entries, 'camp')).toBe(true)
      expect(fed.entries.some((e) => e.code === 'NIGHT_WITHOUT')).toBe(false)
      for (const [food, fatigue] of [
        [0, 4],
        [3, 10],
      ]) {
        const out = night(food, fatigue)
        expect(took(out.entries, 'camp')).toBe(false)
        expect(out.entries).toContainEqual(
          expect.objectContaining({
            code: 'NIGHT_WITHOUT',
            data: expect.objectContaining({ action: 'camp', because: { condition: 'when' } }),
          }),
        )
        // No fed night's relief: fatigue never goes down.
        expect(out.state.stats.fatigue).toBeGreaterThanOrEqual(fatigue)
      }
    })

    it('lost and hungry, waiting until dawn gets the party out of a day it can do nothing in', () => {
      const stuck = {
        ...trip(0, 4),
        dayVars: { lost: true },
      }
      const dawn = calendarOf(system).at(stuck.travel.day + 1, system.rules.day.start)
      const { state, entries } = stepTrip(options, stuck, { type: 'wait', until: dawn })
      expect(state.travel.time).toBeGreaterThanOrEqual(dawn)
      expect(entries.some((e) => e.code === 'NIGHT_WITHOUT')).toBe(true)
      expect(state.dayVars?.lost).toBeUndefined()
    })

    it('travelling on hungry passes the night in the open and marches at dawn', () => {
      let state = trip(0, 2)
      state = stepTrip(options, state, { type: 'setDestination', hex: '29' }).state
      // March the first day until night falls (the party can't camp).
      const day = state.travel.day
      for (let i = 0; i < 10 && state.travel.day === day; i++) {
        const out = stepTrip(options, state, { type: 'travel' })
        state = out.state
        for (const c of state.travel.pendingChecks)
          state = stepTrip(options, state, { type: 'resolveCheck', id: c.id }).state
      }
      expect(state.travel.day).toBeGreaterThan(day)
      expect(state.journal.some((e) => e.code === 'NIGHT_WITHOUT')).toBe(true)
      // On the way again the next day (unless the hungry hirelings refuse: a value).
      const where = state.travel.location
      const next = stepTrip(options, state, { type: 'travel', until: 'hex' })
      const refused = next.state.journal.some(
        (e) => e.code === 'TRAVEL_STOPPED' && e.data?.reason === 'value',
      )
      expect(next.state.travel.location !== where || refused).toBe(true)
      expect(
        state.journal.some((e) => e.code === 'ACTION_TAKEN' && e.data?.action === 'camp'),
      ).toBe(false)
    })
  })

  it('the Grey Marches eat by themselves as each day ends: food, and fodder on horseback', () => {
    const system = marches()
    const world = row([{ terrain: 'plains' }, { terrain: 'plains' }])
    const options = {
      system,
      world,
      oracle: createOracleEngine({ registry, random: seeded('eat') }),
      locale: 'en',
    }
    const { session } = startTrip({ system, location: '0', season: 'summer' })
    const riding = {
      ...session,
      travel: { ...session.travel, mode: 'horse', resources: { food: 2, fodder: 0 } },
    }
    // Waiting a whole day out, without camping: the day still ends with the eat action.
    const day = stepTrip(options, riding, { type: 'advanceTime', minutes: 24 * 60 })
    expect(day.state.travel.resources).toEqual({ food: 1, fodder: 0 })
    expect(day.entries).toContainEqual(
      expect.objectContaining({
        code: 'ACTION_TAKEN',
        data: expect.objectContaining({ action: 'eat', on: 'day-end' }),
      }),
    )
    // No fodder left: it stops at its minimum (0), and the journal says so.
    expect(day.entries).toContainEqual(
      expect.objectContaining({
        code: 'LIMIT_REACHED',
        data: expect.objectContaining({ path: 'party.resources.fodder', limit: 'min' }),
      }),
    )
    // The eat action isn't a button.
    expect(system.rules.actions?.eat).toMatchObject({ on: 'day-end' })
  })

  it('the Grey Marches discover a map whose terrains their rules know', () => {
    const system = marches()
    expect(system.bindings?.discover?.reveal).toBe('neighbors')
    const cells = Array.from({ length: 12 }, (_, i) =>
      i === 0 ? { terrain: 'forest', tags: [] } : { tags: [] },
    )
    const found: Record<string, { terrain?: string }> = {}
    let { session } = startTrip({ system, location: '0', season: 'summer' })
    const options = {
      system,
      world: row(cells),
      oracle: createOracleEngine({ registry, random: seeded('marches-discovery') }),
      locale: 'es',
      discover: 'neighbors' as const,
    }
    for (const action of [
      { type: 'setDestination', hex: '11' },
      { type: 'travel' },
      { type: 'camp' },
      { type: 'travel' },
      { type: 'camp' },
      { type: 'travel' },
    ] as const) {
      const step = stepTrip(options, session, action)
      session = step.state
      Object.assign(found, step.discovered)
    }
    const terrains = Object.values(found).flatMap((d) => (d.terrain ? [d.terrain] : []))
    expect(terrains.length).toBeGreaterThan(0)
    const known = [...Object.keys(system.rules.terrains), 'lake', 'sea', 'deep-sea']
    for (const terrain of terrains) expect(known).toContain(terrain)
  })
})

import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { startTrip, stepTrip, travelSystems } from '@open-tabletop/session'
import {
  createTravelEngine,
  initialTravelState,
  type TravelWorld,
} from '@open-tabletop/travel-engine'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from './bundled'
import { engineFiles } from './workspace'

/**
 * Personal-use packs (packs-private/, a private checkout): they're only here on machines
 * that have it, so these tests skip elsewhere. They play the rules, not the content.
 */
const personal = bundledPacks.filter((p) => p.personal)
const kal = personal.some((p) => p.root === 'kal-arath')

describe.skipIf(!kal)('Kal-Arath (personal use)', () => {
  const { registry, diagnostics } = loadPacks(engineFiles(bundledPacks))
  const system = () => travelSystems(registry).systems.find((s) => s.id === 'kal-arath')!
  const plains: TravelWorld = {
    hexKm: 30,
    cell: (hex) => (['0', '1', '2'].includes(hex) ? { terrain: 'grassland' } : null),
    neighbors: (hex) =>
      [String(Number(hex) - 1), String(Number(hex) + 1)].filter((h) => +h >= 0 && +h < 3),
    distance: (a, b) => Math.abs(Number(a) - Number(b)),
    edges: () => [],
  }
  const options = (seed: string) => ({
    system: system(),
    world: plains,
    oracle: createOracleEngine({ registry, random: seeded(seed) }),
    locale: 'es',
  })

  it('has no fatigue: it is not one of its rules', () => {
    expect(system().bindings?.stats?.fatigue).toBeUndefined()
    const { session } = startTrip({ system: system(), location: '0', season: 'spring' })
    const night = stepTrip(
      options('nofatigue'),
      { ...session, travel: { ...session.travel, resources: { food: 0 } } },
      { type: 'camp' },
    ).state
    expect(night.stats.fatigue).toBeUndefined()
  })

  it('loads without problems', () => {
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    expect(travelSystems(registry).problems.map(formatDiagnostic)).toEqual([])
  })

  it('forages: halves the day, once a day, and what is found adds to the food', () => {
    let gainedSomething = false
    for (let i = 0; i < 20; i++) {
      const { session } = startTrip({ system: system(), location: '0', season: 'spring' })
      session.dayVars = {}
      const { state, entries } = stepTrip(options(`forage-${i}`), session, {
        type: 'action',
        id: 'forage',
      })
      expect(entries.some((e) => e.data?.event === 'FORAGE_CHECK_REQUIRED')).toBe(true)
      expect(state.travel.speedToday).toBe(0.5)
      const gained = state.travel.resources.food - session.travel.resources.food
      expect([0, 1, 3, 5]).toContain(gained)
      gainedSomething ||= gained > 0
    }
    expect(gainedSomething).toBe(true)
  })

  it('rolls foraging and getting lost with advantage for an explorer, finding the way with disadvantage', () => {
    const engine = createOracleEngine({ registry, random: seeded('explorer') })
    const twice = (id: string, context: Record<string, unknown>) =>
      !!engine.resolve(id, context).resolution.rolls[0]?.discarded
    expect(twice('kal-arath/forage', {})).toBe(false)
    expect(twice('kal-arath/forage', { explorer: 1 })).toBe(true)
    expect(twice('kal-arath/lost-check', { yesterday: { lost: true } })).toBe(true)
    expect(twice('kal-arath/lost-check', { explorer: 1, yesterday: { lost: true } })).toBe(false)
    // An explorer finds points of interest on 4–6.
    const found = (explorer: number) =>
      Array.from(
        { length: 200 },
        () => engine.resolve('kal-arath/poi-check', { explorer }).resolution.value.found === true,
      ).filter(Boolean).length
    expect(found(1)).toBeGreaterThan(found(0))
  })

  it('stops travel in a spring storm but only halves it in an autumn one', () => {
    const travel = createTravelEngine({ world: plains, rules: system().rules })
    const minutes = (weather: string) =>
      travel.stepMinutes(
        { ...initialTravelState({ location: '0', mode: 'foot' }), weather },
        '0',
        '1',
      )
    expect(minutes('storm')).toBe(Infinity)
    expect(minutes('autumn-storm')).toBe(minutes('clear') * 2)
  })
})

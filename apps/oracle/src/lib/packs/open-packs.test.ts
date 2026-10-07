import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { startTrip, stepTrip, travelSystems } from '@open-tabletop/session'
import type { TravelWorld } from '@open-tabletop/travel-engine'
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

  it('the Grey Marches: getting lost is easier under clear skies and harder the day after', () => {
    const engine = createOracleEngine({ registry, random: seeded('lost') })
    const twice = (context: Record<string, unknown>) =>
      !!engine.resolve('grey-marches/getting-lost', context).resolution.rolls[0].discarded
    expect(twice({ weather: 'grey' })).toBe(false)
    expect(twice({ weather: 'clear' })).toBe(true)
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

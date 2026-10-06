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

  it('the Core travel system loads, rolls its checks and waits on the unbound one', () => {
    const { systems, problems } = travelSystems(registry)
    expect(problems.map(formatDiagnostic)).toEqual([])
    const core = systems.find((s) => s.id === 'core')!
    // Two forest hexes joined by a road (no getting lost, no encounters on it); the
    // second one is a landmark.
    const world: TravelWorld = {
      hexKm: 10,
      cell: (hex) => ({ terrain: 'forest', tags: hex === 'b' ? ['landmark'] : [], danger: 1 }),
      neighbors: (hex) => (hex === 'a' ? ['b'] : ['a']),
      distance: (x, y) => (x === y ? 0 : 1),
      edges: () => ['road'],
    }
    const options = {
      system: core,
      world,
      oracle: createOracleEngine({ registry, random: seeded('core-trip') }),
      locale: 'en',
    }
    let { session } = startTrip({ system: core, location: 'a', season: 'winter' })
    session = stepTrip(options, session, { type: 'setDestination', hex: 'b' }).state
    const { state, entries } = stepTrip(options, session, { type: 'travel' })
    const codes = entries.map((e) => e.code)
    expect(codes).toContain('ORACLE_RESULT')
    expect(entries.find((e) => e.code === 'CHECK_PENDING')?.data?.event).toBe(
      'LANDMARK_CHECK_REQUIRED',
    )
    expect(state.travel.pendingChecks.map((c) => c.event)).toEqual(['LANDMARK_CHECK_REQUIRED'])
  })
})

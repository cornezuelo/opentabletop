import { createOracleEngine, formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
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
})

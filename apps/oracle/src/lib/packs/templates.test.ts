import { formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { travelSystems } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import { SYSTEM_KINDS, SYSTEM_TEMPLATES, TEMPLATES } from './templates'

describe('new definition templates', () => {
  it('are valid as soon as they are created, every kind', () => {
    const docs = [
      ...Object.values(TEMPLATES).map((make, i) => make(`def-${i}`)),
      ...SYSTEM_KINDS.map((kind) => SYSTEM_TEMPLATES[kind]('default')),
    ]
    const { registry, diagnostics } = loadPacks([
      { path: 'new/pack.yaml', content: 'id: new\nversion: 0.1.0\nlocale: en\n' },
      { path: 'new/all.yaml', content: docs.map((d) => stringify(d)).join('---\n') },
    ])
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    const { systems, problems } = travelSystems(registry)
    expect(problems.map(formatDiagnostic)).toEqual([])
    const system = systems.find((s) => s.id === 'new')
    expect(system?.calendar).toBeDefined()
    expect(Object.keys(system?.weather ?? {})).toEqual(['new/default'])
  })
})

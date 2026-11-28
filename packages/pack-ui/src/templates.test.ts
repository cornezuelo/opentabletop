import { formatDiagnostic, loadPacks } from '@open-tabletop/oracle-engine'
import { travelSystems } from '@open-tabletop/session'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import { LAND_STARTS, SYSTEM_KINDS, SYSTEM_TEMPLATES } from './systemTemplates'
import { TEMPLATES } from './templates'

describe('new definition templates', () => {
  it('are valid as soon as they are created, every kind', () => {
    const docs = [
      ...Object.values(TEMPLATES).map((make, i) => make(`def-${i}`)),
      ...SYSTEM_KINDS.map((kind) => SYSTEM_TEMPLATES[kind]('default')),
      LAND_STARTS.caves('caves'),
      LAND_STARTS.town('town'),
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

  it('write their sample texts in the pack’s base language, English when the UI has no dictionary for it', () => {
    const docs = [
      ...Object.values(TEMPLATES).map((make, i) => make(`def-${i}`, 'es')),
      ...SYSTEM_KINDS.map((kind) => SYSTEM_TEMPLATES[kind]('default', 'es')),
      LAND_STARTS.caves('caves', 'es'),
    ]
    const { diagnostics } = loadPacks([
      { path: 'nuevo/pack.yaml', content: 'id: nuevo\nversion: 0.1.0\nlocale: es\n' },
      { path: 'nuevo/all.yaml', content: docs.map((d) => stringify(d)).join('---\n') },
    ])
    expect(diagnostics.map(formatDiagnostic)).toEqual([])
    expect(TEMPLATES.table('t', 'es').entries).toContainEqual(
      expect.objectContaining({ result: 'Primer resultado' }),
    )
    expect(TEMPLATES.deck('d', 'es').cards).toContainEqual(
      expect.objectContaining({ result: 'Primera carta' }),
    )
    const calendar = SYSTEM_TEMPLATES.calendar('c', 'es') as {
      name: string
      weekdays: { id: string; name: string }[]
    }
    expect(calendar.name).toBe('El cómputo')
    expect(calendar.weekdays[6]).toEqual({ id: 'seventh', name: 'séptimo' })
    expect(SYSTEM_TEMPLATES.items('g', 'fr').name).toBe('Gear')
    expect(SYSTEM_TEMPLATES.items('g').name).toBe('Gear')
  })
})

import { describe, expect, it } from 'vitest'
import { bundleJsonSchema, isBundle, OTD_VERSION, validateBundle } from './index'

const sample = {
  otd: OTD_VERSION,
  maps: [
    {
      id: 'map000000001',
      type: 'map',
      name: 'Kal-Arath',
      grid: { orientation: 'flat', width: 10, height: 8, coordFormat: 'CCRR' },
      scale: { hexKm: 30 },
      terrains: [{ id: 'steppe', color: '#c9b977' }],
      hexes: {
        '1,2': {
          terrain: 'steppe',
          noteRef: 'Kal-Arath/Hexes/0203',
          stats: [{ key: 'danger', value: '2' }],
        },
      },
      paths: [{ id: 'road00000001', kind: 'road', hexes: ['1,2', '2,2'] }],
      ext: { hexmapper: { hexSize: 40 }, somebodyElse: { keep: true } },
    },
  ],
  pois: [
    {
      id: 'poi000000001',
      type: 'poi',
      name: 'Altar',
      location: { map: 'map000000001', hex: '1,2' },
    },
  ],
  unknownTopLevel: 42,
}

describe('OTD bundle', () => {
  it('validates, fills defaults and preserves unknown data', () => {
    const { bundle, errors } = validateBundle(sample)
    expect(errors).toEqual([])
    expect(bundle!.parties).toEqual([])
    expect(bundle!.state).toEqual({})
    expect(bundle!.maps[0].ext).toEqual({
      hexmapper: { hexSize: 40 },
      somebodyElse: { keep: true },
    })
    expect((bundle as Record<string, unknown>).unknownTopLevel).toBe(42)
  })

  it('reports readable errors', () => {
    const broken = structuredClone(sample) as Record<string, unknown>
    ;(broken.maps as Record<string, unknown>[])[0].hexes = { 'x,y': {} }
    const { errors } = validateBundle(broken)
    expect(errors.join('\n')).toContain('maps.0.hexes.x,y')
    expect(validateBundle({ maps: [] }).errors[0]).toMatch(/^otd:/)
  })

  it('rejects newer major versions', () => {
    expect(validateBundle({ ...sample, otd: '9.0.0' }).errors[0]).toContain('newer')
  })

  it('detects bundles and exports a JSON Schema', () => {
    expect(isBundle(sample)).toBe(true)
    expect(isBundle({ version: 1 })).toBe(false)
    const schema = bundleJsonSchema() as { properties: Record<string, unknown> }
    expect(Object.keys(schema.properties)).toContain('maps')
  })
})

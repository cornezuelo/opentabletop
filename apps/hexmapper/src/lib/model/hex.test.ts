import { describe, expect, it } from 'vitest'
import { hasMetadata, isEmptyHex, normalizeHex, sameHex } from './hex'

describe('normalizeHex', () => {
  it('strips empty values and trims text', () => {
    expect(
      normalizeHex({
        terrain: 'forest',
        name: '  Torre  ',
        notes: '   ',
        pois: [
          { id: 'a', name: ' Ruina ', description: '' },
          { id: 'b', name: '', description: ' ' },
        ],
        tags: ['ruina', ' ruina', '', 'peligro'],
        fields: [
          { key: ' Peligro ', value: '3' },
          { key: '', value: '' },
        ],
      }),
    ).toEqual({
      terrain: 'forest',
      name: 'Torre',
      pois: [{ id: 'a', name: 'Ruina' }],
      tags: ['ruina', 'peligro'],
      fields: [{ key: 'Peligro', value: '3' }],
    })
  })

  it('keeps notes formatting except trailing whitespace', () => {
    expect(normalizeHex({ notes: '  - uno\n  - dos\n\n' }).notes).toBe('  - uno\n  - dos')
  })

  it('detects empty, equal and metadata-bearing hexes', () => {
    expect(isEmptyHex({ name: ' ', tags: [] })).toBe(true)
    expect(sameHex({ tags: ['a'], name: 'x' }, { name: 'x ', tags: ['a', 'a'] })).toBe(true)
    expect(hasMetadata({ terrain: 'lake' })).toBe(false)
    expect(hasMetadata({ terrain: 'lake', tags: ['x'] })).toBe(true)
  })
})

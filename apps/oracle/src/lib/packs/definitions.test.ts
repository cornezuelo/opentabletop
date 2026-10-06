import { describe, expect, it } from 'vitest'
import { qualifyRefs, slugify } from './definitions'

describe('definition helpers', () => {
  it('turns names into ids', () => {
    expect(slugify('Encuentros nocturnos!')).toBe('encuentros-nocturnos')
    expect(slugify('  ')).toBe('new')
  })

  it('makes local references absolute, leaving qualified ones alone', () => {
    expect(
      qualifyRefs(
        {
          id: 'x',
          entries: [{ table: 'weather-{{season}}' }, { generator: 'core/prompt' }],
          fields: { npc: { table: 'npc-role' } },
          cards: [{ id: 'a', generator: 'camp' }],
        },
        'kal-arath',
      ),
    ).toEqual({
      id: 'x',
      entries: [{ table: 'kal-arath/weather-{{season}}' }, { generator: 'core/prompt' }],
      fields: { npc: { table: 'kal-arath/npc-role' } },
      cards: [{ id: 'a', generator: 'kal-arath/camp' }],
    })
  })
})

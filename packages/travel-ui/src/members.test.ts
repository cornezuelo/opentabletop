import { describe, expect, it } from 'vitest'
import { freshMember } from './members'

describe('a new member', () => {
  it('starts with a name of its own, numbered past the first', () => {
    expect(freshMember('Character', [])).toEqual({ id: 'character', name: 'Character' })
    expect(freshMember('Personaje', [{ id: 'personaje' }, { id: 'kael' }])).toEqual({
      id: 'personaje-2',
      name: 'Personaje 2',
    })
  })
})

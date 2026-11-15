import { describe, expect, it } from 'vitest'
import { initialsOf } from './texts'

describe('initialsOf', () => {
  it('the first letter, a copy’s number kept', () => {
    expect(initialsOf('Kael')).toBe('K')
    expect(initialsOf('bandit 2')).toBe('B2')
    expect(initialsOf('Óengus')).toBe('Ó')
    expect(initialsOf('  “The Wyrm”')).toBe('T')
    expect(initialsOf('7')).toBe('7')
    expect(initialsOf('')).toBe('?')
  })
})

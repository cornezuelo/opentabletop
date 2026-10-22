import { describe, expect, it } from 'vitest'
import { matches } from './search'

describe('searching cards', () => {
  it('finds every word in any of the texts, without case or accents', () => {
    expect(matches('night camp', ['Night encounter', 'actions.camp'])).toBe(true)
    expect(matches('DIA', ['Fin del día'])).toBe(true)
    expect(matches('night storm', ['Night encounter', 'actions.camp'])).toBe(false)
  })

  it('reads conditions and steps written as data', () => {
    expect(matches('trip.below', [{ when: { 'trip.below': 'food' } }])).toBe(true)
  })

  it('an empty search finds everything', () => {
    expect(matches('  ', [])).toBe(true)
  })
})

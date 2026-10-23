import { describe, expect, it } from 'vitest'
import { nextTagMode, passesFilter } from './definitionFilter.svelte'

describe('the definition filter', () => {
  const table = { kind: 'table', tags: ['people', 'rules'] }
  const deck = { kind: 'deck', tags: ['omens'] }

  it('shows everything when nothing is chosen', () => {
    expect(passesFilter(table, { kinds: [], tags: {} })).toBe(true)
  })

  it('shows any of the kinds chosen', () => {
    const filter = { kinds: ['table', 'oracle'], tags: {} }
    expect(passesFilter(table, filter)).toBe(true)
    expect(passesFilter(deck, filter)).toBe(false)
  })

  it('needs every tag shown only and none of the hidden ones', () => {
    expect(passesFilter(table, { kinds: [], tags: { people: 'only' } })).toBe(true)
    expect(passesFilter(deck, { kinds: [], tags: { people: 'only' } })).toBe(false)
    expect(passesFilter(table, { kinds: [], tags: { people: 'only', omens: 'only' } })).toBe(false)
    expect(passesFilter(table, { kinds: [], tags: { rules: 'not' } })).toBe(false)
    expect(passesFilter(deck, { kinds: [], tags: { rules: 'not' } })).toBe(true)
  })

  it('cycles a tag: only, then not, then off', () => {
    expect(nextTagMode(undefined)).toBe('only')
    expect(nextTagMode('only')).toBe('not')
    expect(nextTagMode('not')).toBeUndefined()
  })
})

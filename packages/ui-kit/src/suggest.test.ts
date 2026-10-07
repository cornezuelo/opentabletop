import { describe, expect, it } from 'vitest'
import { applyChoice, choicesFor, typingAt, typingInList } from './suggest'

const suggestions = {
  terrain: ['forest', 'hills', 'dense-forest'],
  tags: ['landmark', 'haunted'],
  'party.resources.food': [],
  danger: ['1', '2', '3'],
}
const at = (text: string) => typingAt(text, text.length)

describe('suggestions while typing key: value pairs', () => {
  it('tells keys from values, also inside lists and comparisons', () => {
    expect(at('ter')).toMatchObject({ kind: 'key', prefix: 'ter' })
    expect(at('terrain: fo')).toMatchObject({ kind: 'value', key: 'terrain', prefix: 'fo' })
    expect(at('terrain: forest, ta')).toMatchObject({ kind: 'key', prefix: 'ta' })
    expect(at('terrain: [forest, hi')).toMatchObject({
      kind: 'value',
      key: 'terrain',
      prefix: 'hi',
    })
    expect(at('danger: { gte: ')).toMatchObject({ kind: 'value', key: 'danger', prefix: '' })
    expect(at('party.res')).toMatchObject({ kind: 'key', prefix: 'party.res' })
    expect(at('{ tags: ha')).toMatchObject({ kind: 'value', key: 'tags' })
    // Inside all / any / not, conditions again.
    expect(at('all: [{ terrain: forest }, { ta')).toEqual(
      expect.objectContaining({ kind: 'key', prefix: 'ta' }),
    )
    expect(at('all: [{ terrain: forest }, { ta').parent).toBeUndefined()
    expect(at('not: { mode: bo')).toMatchObject({ kind: 'value', key: 'mode' })
  })

  it('offers what fits, starting with the prefix first', () => {
    expect(choicesFor(at('terrain: fo'), suggestions)).toEqual(['forest', 'dense-forest'])
    expect(choicesFor(at('p'), suggestions)).toEqual(['party.resources.food'])
    expect(choicesFor(at('terrain: forest'), suggestions)).toEqual(['dense-forest'])
  })

  it('suggests whole keys inside a map listed as parent.*', () => {
    const steps = { effects: [], 'effects.*': ['party.stats.fatigue', 'party.resources.food'] }
    expect(choicesFor(at('effects: { party.s'), steps)).toEqual(['party.stats.fatigue'])
    expect(choicesFor(at('eff'), steps)).toEqual(['effects'])
  })

  it('suggests keys inside a nested map: dotted parts, or comparisons', () => {
    const nested = { 'resources.food': [], 'resources.water': [], danger: [] }
    expect(choicesFor(at('resources: { f'), nested)).toEqual(['food'])
    expect(choicesFor(at('danger: { g'), nested)).toEqual(['gt', 'gte'])
  })

  it('suggests the values of a comma-separated list', () => {
    const typing = typingInList('lake, se', 8)
    expect(choicesFor(typing, { '': ['lake', 'sea', 'deep-sea'] })).toEqual(['sea', 'deep-sea'])
    expect(applyChoice('lake, se', typing, 'sea').text).toBe('lake, sea')
  })

  it('puts the choice in place, keys with their colon', () => {
    const typing = at('terrain: forest, ta')
    expect(applyChoice('terrain: forest, ta', typing, 'tags')).toEqual({
      text: 'terrain: forest, tags: ',
      cursor: 23,
    })
    const mid = typingAt('terrain: fo, tags: x', 11)
    expect(applyChoice('terrain: fo, tags: x', mid, 'forest').text).toBe('terrain: forest, tags: x')
  })
})

import { loadPacks } from '@open-tabletop/oracle-engine'
import { resolvePath } from '@open-tabletop/variables'
import { describe, expect, it } from 'vitest'
import { contextVariables, mergeContext, parseContext, valueAt } from './variables'

const files = [
  { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nlocale: en\n' },
  {
    path: 'p/t.yaml',
    content: `kind: table
id: weather
roll: 1d6
entries:
  - { range: 1-6, table: 'table.weather-{{season}}', set: { mood: grim } }
---
kind: table
id: reaction
roll: 2d6 + {{pre}}
entries:
  - { range: 2-7, result: Hostile }
  - { range: 8-12, result: Friendly, when: { terrain: { in: [forest, hills] } } }
---
kind: generator
id: encounter
fields:
  who: { table: table.reaction }
  count: { roll: 1d6 }
  fare: { value: '{{token.fare}}', when: { token: { exists: true } } }
  extra: { value: '{{1d4}}' }
template: '{{count}} {{who.text}}'
---
kind: table
id: climb
roll: 1d20
against: { lte: '{{strength + 2}}' }
entries:
  - { when: { against.success: true }, result: Up }
  - { result: Down }
---
kind: table
id: finds
roll: '1d{{max(map.values.finds, 2)}}'
entries:
  - { range: 1-5, result: Nothing }
  - { range: 6, result: A landmark }
`,
  },
]

describe('context variables', () => {
  const { registry } = loadPacks(files)
  it('asks for what a roll is rolled against reads, never for how it went', () => {
    expect(contextVariables(registry, 'p/climb')).toEqual([
      { name: 'strength', suggestions: [], needed: true },
    ])
  })

  it("needs the values a die's size reads, even worked out", () => {
    expect(contextVariables(registry, 'p/finds')).toEqual([
      { name: 'map.values.finds', suggestions: [], needed: true },
    ])
  })

  it('finds template and condition variables, following references', () => {
    expect(contextVariables(registry, 'p/weather')).toEqual([{ name: 'season', suggestions: [] }])
    expect(contextVariables(registry, 'p/encounter')).toEqual([
      // Read by its roll (2d6 + {{pre}}): needed to roll it.
      { name: 'pre', suggestions: [], needed: true },
      { name: 'terrain', suggestions: ['forest', 'hills'] },
      { name: 'token.fare', suggestions: [] },
    ])
  })

  it('a name with a part in brackets, typed whole, gives that part a stand-in', () => {
    const typed = parseContext({ 'acting.items[params.piece].wear': '6' })
    expect(resolvePath(typed, 'acting.items[params.piece].wear')).toBe(6)
    // The part typed too: it names the whole's.
    const both = parseContext({ 'acting.items[params.piece].wear': '8', 'params.piece': 'mail' })
    expect(both).toEqual({ params: { piece: 'mail' }, acting: { items: { mail: { wear: 8 } } } })
  })

  it('parses typed values', () => {
    expect(parseContext({ pre: '2', night: 'true', terrain: 'forest', empty: ' ' })).toEqual({
      pre: 2,
      night: true,
      terrain: 'forest',
    })
  })

  it('typed dotted names nest and merge with the host values', () => {
    const typed = parseContext({ 'token.fare': '3', danger: '2' })
    expect(typed).toEqual({ token: { fare: 3 }, danger: 2 })
    const host = { token: { name: 'Brenna', fare: 1 }, terrain: 'heath' }
    expect(mergeContext(host, typed)).toEqual({
      token: { name: 'Brenna', fare: 3 },
      terrain: 'heath',
      danger: 2,
    })
    expect(valueAt(host, 'token.name')).toBe('Brenna')
  })
})

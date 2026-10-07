import { loadPacks } from '@open-tabletop/oracle-engine'
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
  - { range: 1-6, table: 'weather-{{season}}', set: { mood: grim } }
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
  who: { table: reaction }
  count: { roll: 1d6 }
  fare: { value: '{{token.fare}}', when: { token: { exists: true } } }
  extra: { value: '{{1d4}}' }
template: '{{count}} {{who.text}}'
`,
  },
]

describe('context variables', () => {
  const { registry } = loadPacks(files)
  it('finds template and condition variables, following references', () => {
    expect(contextVariables(registry, 'p/weather')).toEqual([{ name: 'season', suggestions: [] }])
    expect(contextVariables(registry, 'p/encounter')).toEqual([
      { name: 'pre', suggestions: [] },
      { name: 'terrain', suggestions: ['forest', 'hills'] },
      { name: 'token.fare', suggestions: [] },
    ])
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

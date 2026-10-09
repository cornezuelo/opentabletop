import { loadPacks } from '@open-tabletop/oracle-engine'
import { describe, expect, it } from 'vitest'
import { entryOdds, rollOdds } from './odds'

const { registry } = loadPacks([
  { path: 'p/pack.yaml', content: 'id: p\nversion: 0.1.0\nlocale: en\n' },
  {
    path: 'p/t.yaml',
    content: `kind: roll-modes
id: default
modes:
  best: { repeat: 2, keep: highest }
---
kind: table
id: reaction
roll: 2d6 + {{pre}}
modes: [best]
entries:
  - { id: hostile, range: 2-6, result: Hostile }
  - { id: wary, range: 7, result: Wary }
  - { id: friendly, range: 8-12, result: Friendly, when: { terrain: forest } }
---
kind: table
id: weighted
entries:
  - { id: common, weight: 3, result: Common }
  - { id: rare, weight: 1, result: Rare }
`,
  },
])

describe('odds', () => {
  it('of each total, exactly, with the context’s values and a roll mode', () => {
    const plain = rollOdds('2d6 + {{pre}}', {})!
    expect(plain.get(7)).toBeCloseTo(6 / 36)
    const shifted = rollOdds('2d6 + {{pre}}', { pre: 2 })!
    expect(shifted.get(9)).toBeCloseTo(6 / 36)
    const best = rollOdds('1d6', {}, { repeat: 2, keep: 'highest' })!
    expect(best.get(6)).toBeCloseTo(11 / 36)
  })

  it('of each entry, as the engine rolls it: conditions, clamping and modes count', () => {
    // Out of a forest, 8–12 has no entry: clamped to the highest that applies (wary).
    const town = entryOdds(registry, 'p/reaction', {})
    expect(town.entries.get('hostile')).toBeCloseTo(15 / 36, 1)
    expect(town.entries.get('wary')).toBeCloseTo(21 / 36, 1)
    expect(town.entries.has('friendly')).toBe(false)
    const forest = entryOdds(registry, 'p/reaction', { terrain: 'forest' })
    expect(forest.entries.get('friendly')).toBeCloseTo(15 / 36, 1)
    const best = entryOdds(registry, 'p/reaction', { terrain: 'forest' }, 'p/best')
    expect(best.entries.get('friendly')!).toBeGreaterThan(forest.entries.get('friendly')!)
    expect(town.nothing).toBe(0)
  })

  it('of weighted entries, by their weights', () => {
    const odds = entryOdds(registry, 'p/weighted', {})
    expect(odds.entries.get('common')).toBeCloseTo(0.75, 1)
    expect(odds.entries.get('rare')).toBeCloseTo(0.25, 1)
  })
})
